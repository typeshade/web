import { type Patch, type CurvePoint } from "./designer.ts";

export function curveAt(
  points: CurvePoint[],
  time: number,
  fallback: number,
): number {
  if (!points.length) return fallback;
  if (time <= 0) return points[0]!.value;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!;
    if (time <= b.time)
      return (
        a.value + ((b.value - a.value) * (time - a.time)) / (b.time - a.time)
      );
  }
  return points[points.length - 1]!.value;
}
/** Features whose stateful CPU implementation is shared with the audio worklet. */
export function needsLiveRenderer(p: Patch): boolean {
  return (
    p.baseMuted ||
    p.layers.length > 0 ||
    p.shapeA >= 4 ||
    p.shapeB >= 4 ||
    p.fmIndex > 0 ||
    p.lfoDepth > 0 ||
    Object.values(p.curves).some((c) => c.length > 0)
  );
}
export function sourceLength(p: Patch): number {
  return p.duration + p.release + (p.delay ? 2 : 0) + (p.reverb ? 2 : 0);
}
export function soundLength(p: Patch): number {
  return Math.max(
    sourceLength(p),
    ...p.layers.map((l) => l.offset + sourceLength(l.patch)),
  );
}
