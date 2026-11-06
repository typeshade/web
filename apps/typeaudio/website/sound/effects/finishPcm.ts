import type { Patch } from "../types.ts";
import { SAMPLE_RATE } from "../constants.ts";
import { delayPcm } from "./delayPcm.ts";
import { reverbPcm } from "./reverbPcm.ts";
/** Make the comparison and export the same length, with a short final tail fade. */
export function finishPcm(
  raw: Float32Array,
  p: Patch,
  sr = SAMPLE_RATE,
): { dry: Float32Array; wet: Float32Array } {
  let processed = raw.slice();
  if (p.delay) processed = delayPcm(processed, p, sr);
  if (p.reverb) processed = reverbPcm(processed, p, sr);
  const dry = new Float32Array(processed.length);
  dry.set(raw);
  const edge = Math.min(Math.round(sr * 0.03), processed.length);
  for (let i = 0; i < processed.length; i++) {
    dry[i]! *= p.volume;
    processed[i]! *= p.volume;
    if (i >= processed.length - edge)
      processed[i]! *= (processed.length - 1 - i) / edge;
  }
  return { dry, wet: processed };
}
