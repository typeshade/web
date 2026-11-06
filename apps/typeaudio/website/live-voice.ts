import { DEFAULT } from "./sound/defaultPatch.ts";
const defaultWave = new Float32Array(DEFAULT.wave);
import { liveBlock } from "./live-kernel.shade.ts?audio-cpu";

/** No host-value conversions or new output arrays in the audio callback. */
export class LiveVoice {
  private state = new Float32Array(5);
  private clock = new Uint32Array(2);
  private params = new Float32Array(16);
  private wave = defaultWave;
  private seed = 1;
  readonly samples = new Float32Array(128);
  constructor(
    hzA: number,
    hzB: number,
    shapeA: number,
    shapeB: number,
    phase: number,
    blend: number,
    cutoff: number,
    resonance: number,
    filtered: number,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    gate: number,
  ) {
    this.clock[1] = this.seed;
    this.state[0] = phase;
    this.state[1] = phase;
    this.configure(
      hzA,
      hzB,
      shapeA,
      shapeB,
      blend,
      cutoff,
      resonance,
      filtered,
      attack,
      decay,
      sustain,
      release,
      gate,
      0,
    );
  }
  configure(
    hzA: number,
    hzB: number,
    shapeA: number,
    shapeB: number,
    blend: number,
    cutoff: number,
    resonance: number,
    filterBlend: number,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    gate: number,
    repeat: number,
    fmRatio = 2,
    fmIndex = 0,
    wave = defaultWave,
    seed = 1,
  ): void {
    const p = this.params;
    // Round arguments before division, matching TypeShade's f32 host contract.
    p[0] = Math.fround(hzA) / 48000;
    p[1] = Math.fround(hzB) / 48000;
    p[2] = shapeA;
    p[3] = shapeB;
    p[4] = blend;
    p[5] = filterBlend;
    p[6] = attack;
    p[7] = decay;
    p[8] = sustain;
    p[9] = release;
    p[10] = gate;
    p[11] = repeat;
    p[12] = cutoff;
    p[13] = resonance;
    p[14] = fmIndex;
    p[15] = p[0]! * fmRatio;
    this.wave = wave;
    if (seed !== this.seed) {
      this.seed = seed;
      this.clock[1] = seed;
    }
  }
  retrigger(): void {
    this.clock[0] = 0;
    this.clock[1] = this.seed;
  }
  block(frames: number): Float32Array {
    liveBlock(
      this.samples,
      this.state,
      this.clock,
      this.params,
      frames,
      this.wave,
    );
    return this.samples;
  }
}
