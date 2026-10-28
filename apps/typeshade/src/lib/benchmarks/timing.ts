/** Calibration is bounded. Each timed pass contains this many independent dispatches. */
export const MAX_DISPATCHES = 256;
export const TARGET_NS = 2_000_000;
export function nextBatch(count: number, elapsedNs: number | null): number {
  if (count >= MAX_DISPATCHES || (elapsedNs !== null && elapsedNs >= TARGET_NS)) return count;
  return Math.min(MAX_DISPATCHES, count * 4);
}
export function validDeviceSamples(samples: readonly (number | null)[]): number[] | null {
  return samples.length &&
    samples.every((x): x is number => x !== null && x > 0 && Number.isFinite(x))
    ? ([...samples] as number[])
    : null;
}
