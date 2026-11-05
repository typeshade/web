"use typeshade";

/** Website live kernel. Parameters and persistent state are owned by LiveDsp.
 * Lowpass uses the same RBJ design and f32 operations as TypeAudio Lowpass.
 * The build adapter rejects allocations and interpreter fallbacks in generated code. */
export function liveBlock(
  out: array<f32>,
  state: array<f32>,
  clock: array<u32>,
  p: array<f32>,
  frames: u32,
): void {
  const w: f32 = (6.283185307179586 * p[12]) / 48000;
  const cw: f32 = cos(w);
  const alpha: f32 = sin(w) / (2 * p[13]);
  const a0: f32 = 1 + alpha;
  const b1: f32 = (1 - cw) / a0;
  const b0: f32 = b1 * 0.5;
  const b2: f32 = b1 * 0.5;
  const a1: f32 = (-2 * cw) / a0;
  const a2: f32 = (1 - alpha) / a0;
  // Keep sample state in scalar locals. Calling nested host-face tick()/held()
  // per sample creates inout/state copies in the pinned CPU compiler.
  let phaseA: f32 = state[0];
  let phaseB: f32 = state[1];
  const incA: f32 = p[0];
  const incB: f32 = p[1];
  const shapeA: u32 = u32(p[2]);
  const shapeB: u32 = u32(p[3]);
  const blend: f32 = p[4];
  const filterBlend: f32 = p[5];
  let z1: f32 = state[2];
  let z2: f32 = state[3];
  const attack: f32 = p[6];
  const decay: f32 = p[7];
  const sustain: f32 = p[8];
  const release: f32 = p[9];
  const gate: f32 = p[10];
  const repeat: u32 = u32(p[11]);
  let age: u32 = clock[0];
  // The release starts from the envelope's value at the gate.
  let heldGate: f32 = sustain;
  if (gate < attack) {
    heldGate = gate / attack;
  } else if (gate < attack + decay) {
    heldGate = 1 - ((1 - sustain) * (gate - attack)) / decay;
  }
  for (let i: u32 = 0; i < frames; i++) {
    if (repeat == 1 && f32(age) >= (gate + release) * 48000) {
      age = 0;
    }
    const time: f32 = f32(age) / 48000;
    age++;
    let a: f32 = phaseA * 2 - 1;
    if (shapeA == 0) {
      a = sin(phaseA * 6.283185307179586);
    } else if (shapeA == 2) {
      a = select(-1, 1, phaseA < 0.5);
    } else if (shapeA == 3) {
      a = 1 - 4 * abs(phaseA - 0.5);
    }
    let b: f32 = phaseB * 2 - 1;
    if (shapeB == 0) {
      b = sin(phaseB * 6.283185307179586);
    } else if (shapeB == 2) {
      b = select(-1, 1, phaseB < 0.5);
    } else if (shapeB == 3) {
      b = 1 - 4 * abs(phaseB - 0.5);
    }
    phaseA = fract(phaseA + incA);
    phaseB = fract(phaseB + incB);
    const mixed: f32 = a * (1 - blend) + b * blend;
    const filtered: f32 = b0 * mixed + z1;
    z1 = b1 * mixed - a1 * filtered + z2;
    z2 = b2 * mixed - a2 * filtered;
    let env: f32 = sustain;
    if (time < attack) {
      env = time / attack;
    } else if (time < attack + decay) {
      env = 1 - ((1 - sustain) * (time - attack)) / decay;
    }
    if (repeat == 1 && time >= gate) {
      env = heldGate * max(0, 1 - (time - gate) / release);
    }
    out[i] = (mixed * (1 - filterBlend) + filtered * filterBlend) * env;
  }
  clock[0] = age;
  state[0] = phaseA;
  state[1] = phaseB;
  state[2] = z1;
  state[3] = z2;
}
