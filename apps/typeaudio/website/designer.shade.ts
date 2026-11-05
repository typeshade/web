"use typeshade";
import { Sine, Saw } from "../src/units/oscillator.shade.ts";
import { Lowpass } from "../src/units/biquad.shade.ts";

/** Website oscillator selection, composed from the engine's phase accumulators. */
export class DesignerOscillator {
  sine: Sine = new Sine();
  saw: Saw = new Saw();
  shape: u32 = 0;
  constructor(hz: f32, shape: u32, phase: f32) {
    this.sine.hz(hz, 48000.);
    this.saw.hz(hz, 48000.);
    this.sine.phase = phase;
    this.saw.phase = phase;
    this.shape = shape;
  }
  tick(): f32 {
    const phase = this.saw.phase;
    const sine = this.sine.tick();
    const saw = this.saw.tick();
    if (this.shape == 0) { return sine; }
    if (this.shape == 1) { return saw; }
    if (this.shape == 2) { return select(-1., 1., phase < 0.5); }
    return 1. - 4. * abs(phase - 0.5);
  }
}

/** Two oscillators, a lowpass and ADSR. This is a website patch, not a new engine API. */
export class DesignerVoice {
  a: DesignerOscillator;
  b: DesignerOscillator;
  filter: Lowpass = new Lowpass();
  blend: f32;
  filtered: u32;
  age: u32 = 0;
  attack: f32;
  decay: f32;
  sustain: f32;
  release: f32;
  gate: f32;
  constructor(hzA: f32, hzB: f32, shapeA: u32, shapeB: u32, phase: f32,
    blend: f32, cutoff: f32, resonance: f32, filtered: u32,
    attack: f32, decay: f32, sustain: f32, release: f32, gate: f32) {
    this.a = new DesignerOscillator(hzA, shapeA, phase);
    this.b = new DesignerOscillator(hzB, shapeB, phase);
    this.filter.set(cutoff, resonance, 48000.);
    this.blend = blend; this.filtered = filtered;
    this.attack = attack; this.decay = decay; this.sustain = sustain;
    this.release = release; this.gate = gate;
  }
  held(time: f32): f32 {
    if (time < this.attack) { return time / this.attack; }
    if (time < this.attack + this.decay) {
      return 1. - (1. - this.sustain) * (time - this.attack) / this.decay;
    }
    return this.sustain;
  }
  tick(): f32 {
    const time = f32(this.age) / 48000.;
    this.age++;
    const a = this.a.tick();
    const b = this.b.tick();
    const mixed = a * (1. - this.blend) + b * this.blend;
    const filtered = this.filter.tick(mixed);
    let env: f32 = this.held(time);
    if (time >= this.gate) {
      env = this.held(this.gate) * max(0., 1. - (time - this.gate) / this.release);
    }
    return select(mixed, filtered, this.filtered == 1) * env;
  }
}
export function designerSynth(out: array<f32>, voices: array<DesignerVoice>, block: u32) {
  for (let v: u32 = 0; v < voices.length; v++) {
    // Keep the recurrent state local to this invocation. Storage-bank state is
    // loaded and committed once per batch, rather than through every tick.
    let voice = voices[v];
    for (let n: u32 = 0; n < block; n++) {
      out[v * block + n] = voice.tick();
    }
    voices[v] = voice;
  }
}

/** Gather and finish directly into the resident output tape. The arithmetic order
 * matches mixdown → gain → optional drive → gain; no intermediate bus readback. */
export function designerMix(out: array<f32>, lanes: array<f32>, voices: u32,
  block: u32, offset: u32, average: f32, distortion: u32, amount: f32) {
  for (let n: u32 = 0; n < block; n++) {
    let sum: f32 = 0.;
    for (let v: u32 = 0; v < voices; v++) { sum += lanes[v * block + n]; }
    let value: f32 = sum * average;
    if (distortion == 1) { value = tanh(value * amount); }
    out[offset + n] = value * 0.7;
  }
}
