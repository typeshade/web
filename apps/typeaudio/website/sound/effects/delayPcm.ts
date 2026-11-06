import type { Patch } from "../types.ts";
import { SAMPLE_RATE } from "../constants.ts";
/** Feedback delay on rendered PCM. The returned tail is bounded to two seconds. */
export function delayPcm(
  input: Float32Array,
  p: Patch,
  sr = SAMPLE_RATE,
): Float32Array {
  const out = new Float32Array(input.length + 2 * sr);
  const line = new Float32Array(Math.max(1, Math.round(p.delayTime * sr)));
  for (let i = 0; i < out.length; i++) {
    const dry = input[i] ?? 0,
      tap = line[i % line.length]!;
    line[i % line.length] = dry + tap * p.feedback;
    out[i] = dry * (1 - p.delayMix) + tap * p.delayMix;
  }
  return out;
}
