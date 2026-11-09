import type { Patch } from "../types.ts";
import { SAMPLE_RATE } from "../constants.ts";
/** Four damped combs followed by two allpasses: a small mono Schroeder room. */
export function reverbPcm(
  input: Float32Array,
  p: Patch,
  sr = SAMPLE_RATE,
): Float32Array {
  const out = new Float32Array(input.length + 2 * sr);
  const lengths = [0.0297, 0.0371, 0.0411, 0.0437].map((t) =>
    Math.round(t * sr * (0.6 + p.room)),
  );
  const lines = lengths.map((n) => new Float32Array(n));
  const damp = new Float32Array(4);
  const allpasses = [0.005, 0.0017].map(
    (t) => new Float32Array(Math.round(t * sr)),
  );
  for (let i = 0; i < out.length; i++) {
    const dry = input[i] ?? 0;
    let wet = 0;
    lines.forEach((line, j) => {
      const tap = line[i % line.length]!;
      damp[j] = tap * 0.65 + damp[j]! * 0.35;
      line[i % line.length] = dry + damp[j]! * (0.55 + p.room * 0.35);
      wet += tap * 0.25;
    });
    for (const line of allpasses) {
      const tap = line[i % line.length]!;
      const next = tap - wet * 0.5;
      line[i % line.length] = wet + tap * 0.5;
      wet = next;
    }
    out[i] = dry * (1 - p.reverbMix) + wet * p.reverbMix;
  }
  return out;
}
