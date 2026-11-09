import { FunctionGraphDsp } from "typeaudio/function-graph/runtime";
import type { Patch } from "../sound/types.ts";
import { functionProgram } from "./preparedPrograms.ts";

/** Adapts the prepared engine voice to the studio's source transport and output gain. */
export class FunctionPatchDsp {
  readonly dsp: FunctionGraphDsp;
  private gain: number;
  private targetGain: number;
  private fade = 0;
  oneShot = true;
  repeat = false;
  dry = false;
  frames = 0;
  invalidSamples = 0;
  constructor(p: Patch, previous?: FunctionPatchDsp) {
    if (!p.functions) throw new Error("Missing function source.");
    this.dsp = new FunctionGraphDsp(functionProgram(p.functions), {
      previous: previous?.dsp,
    });
    this.gain = this.targetGain = p.volume;
    if (previous) this.fade = previous.fade;
  }
  update(p: Patch, _repeat = false, _dry = false) {
    for (const parameter of p.functions!.parameters)
      this.dsp.setParameter(parameter.id, parameter.value);
    this.targetGain = p.volume;
  }
  retrigger() {
    this.dsp.reset();
    this.fade = 0;
  }
  process(out: Float32Array, frames = out.length, dryOut?: Float32Array) {
    if (!this.dsp.process(out, frames)) {
      this.invalidSamples += frames;
      throw new Error(
        `Function ${this.dsp.faultNode}: ${String(this.dsp.fault)}`,
      );
    }
    for (let i = 0; i < frames; i++) {
      this.gain += (this.targetGain - this.gain) * 0.001735;
      this.fade = Math.min(1, this.fade + 1 / 240);
      out[i] = Math.max(-1, Math.min(1, out[i]! * this.gain)) * this.fade;
      if (dryOut) dryOut[i] = out[i]!;
    }
    this.frames += frames;
  }
}
