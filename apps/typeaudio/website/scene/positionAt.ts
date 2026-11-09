import type { PositionPoint } from "./types.ts";

export function positionAt(points: PositionPoint[], time: number) {
  let a = points[0],
    b = a;
  for (let i = 1; i < points.length; i++) {
    b = points[i];
    if (time <= b.time) break;
    a = b;
  }
  const mix =
    a === b ? 0 : Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)));
  return {
    x: a.x + (b.x - a.x) * mix,
    y: a.y + (b.y - a.y) * mix,
    z: a.z + (b.z - a.z) * mix,
  };
}
