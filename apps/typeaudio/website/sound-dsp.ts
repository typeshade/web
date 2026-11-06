import { SAMPLE_RATE, validatePatch, type Patch } from "./designer.ts";
import { LiveDsp } from "./live-dsp.ts";
import { soundLength, sourceLength } from "./sound-design.ts";
import { GraphDsp } from "./graph/dsp.ts";
import { graphKey } from "./graph/model.ts";

interface Layer {
  id: string;
  dsp: LiveDsp | GraphDsp;
  signature: string;
  previous?: LiveDsp | GraphDsp;
  transition: number;
  old: Float32Array;
  offset: number;
  length: number;
  muted: boolean;
  gain: number;
  wet: Float32Array;
  dry: Float32Array;
}
/** Layer allocation and patch validation happen on control messages, never in process(). */
export class SoundDsp {
  private layers: Layer[] = [];
  private position = 0;
  private length = 0;
  repeat = true;
  dry = false;
  oneShot = false;
  frames = 0;
  revision = 0;
  get invalidSamples() {
    let count = 0;
    for (const layer of this.layers)
      if (layer.dsp instanceof GraphDsp) count += layer.dsp.invalidSamples;
    return count;
  }
  constructor(p: Patch) {
    this.configure(validatePatch(p));
  }
  private configure(p: Patch) {
    this.length = Math.ceil(soundLength(p) * SAMPLE_RATE);
    const sources = [
      { id: "base", offset: 0, muted: p.baseMuted, patch: p },
      ...p.layers,
    ];
    const structure = sources
      .map((s) => `${s.id}:${Math.round(s.offset * SAMPLE_RATE)}`)
      .join("|");
    const previous = this.layers.map((l) => `${l.id}:${l.offset}`).join("|");
    this.layers = sources.map((s) => {
      const existing = this.layers.find((l) => l.id === s.id);
      const signature = s.patch.graph ? graphKey(s.patch.graph) : "legacy";
      if (existing) {
        if (existing.signature !== signature) {
          const previous = existing.dsp;
          existing.dsp = s.patch.graph
            ? new GraphDsp(
                s.patch,
                previous instanceof GraphDsp ? previous : undefined,
              )
            : new LiveDsp(s.patch);
          existing.signature = signature;
          existing.previous = previous;
          existing.transition = 480;
        } else existing.dsp.update(s.patch, false, this.dry);
        existing.offset = Math.round(s.offset * SAMPLE_RATE);
        existing.muted = s.muted;
        existing.length = Math.ceil(sourceLength(s.patch) * SAMPLE_RATE);
        return existing;
      }
      return {
        id: s.id,
        dsp: s.patch.graph ? new GraphDsp(s.patch) : new LiveDsp(s.patch),
        signature,
        transition: 0,
        old: new Float32Array(128),
        offset: Math.round(s.offset * SAMPLE_RATE),
        length: Math.ceil(sourceLength(s.patch) * SAMPLE_RATE),
        muted: s.muted,
        gain: s.muted ? 0 : 1,
        wet: new Float32Array(128),
        dry: new Float32Array(128),
      };
    });
    if (structure !== previous) this.retrigger();
  }
  update(p: Patch, repeat = this.repeat, dry = this.dry) {
    this.repeat = repeat;
    this.dry = dry;
    this.configure(validatePatch(p));
    this.revision++;
  }
  retrigger() {
    this.position = 0;
    for (const l of this.layers) l.dsp.retrigger();
  }
  process(out: Float32Array, frames = out.length, dryOut?: Float32Array) {
    for (let offset = 0; offset < frames; ) {
      if (this.repeat && !this.oneShot && this.position >= this.length)
        this.retrigger();
      const count = Math.min(
        128,
        frames - offset,
        this.repeat && !this.oneShot ? this.length - this.position : 128,
      );
      out.fill(0, offset, offset + count);
      dryOut?.fill(0, offset, offset + count);
      for (const layer of this.layers) {
        const skip = Math.max(0, Math.min(count, layer.offset - this.position));
        const available = Math.max(
          0,
          Math.min(
            count - skip,
            layer.offset + layer.length - this.position - skip,
          ),
        );
        if (!available) continue;
        layer.dsp.oneShot = true;
        layer.dsp.repeat = false;
        layer.dsp.dry = this.dry;
        layer.dsp.process(layer.wet, available, dryOut ? layer.dry : undefined);
        if (layer.previous && layer.transition > 0) {
          layer.previous.process(layer.old, available);
          for (let n = 0; n < available; n++) {
            const mix = Math.max(0, layer.transition-- / 480);
            layer.wet[n] = layer.old[n]! * mix + layer.wet[n]! * (1 - mix);
            if (dryOut) layer.dry[n] = layer.wet[n]!;
          }
          if (layer.transition <= 0) layer.previous = undefined;
        }
        for (let n = skip; n < skip + available; n++) {
          layer.gain += ((layer.muted ? 0 : 1) - layer.gain) * 0.001735;
          const fade = Math.max(
            0,
            Math.min(
              1,
              (layer.offset + layer.length - 1 - this.position - n) /
                (SAMPLE_RATE * 0.03),
            ),
          );
          out[offset + n]! += layer.wet[n - skip]! * layer.gain * fade;
          if (dryOut)
            dryOut[offset + n]! += layer.dry[n - skip]! * layer.gain * fade;
        }
      }
      this.position += count;
      this.frames += count;
      offset += count;
    }
  }
}

/** The same synchronous DSP as live playback, with one finite note per layer. */
export function renderSound(p: Patch): {
  dry: Float32Array;
  wet: Float32Array;
  invalidSamples: number;
} {
  const frames = Math.ceil(soundLength(p) * SAMPLE_RATE),
    dsp = new SoundDsp(p);
  dsp.oneShot = true;
  dsp.repeat = false;
  const dry = new Float32Array(frames),
    wet = new Float32Array(frames);
  dsp.process(wet, frames, dry);
  return { dry, wet, invalidSamples: dsp.invalidSamples };
}
