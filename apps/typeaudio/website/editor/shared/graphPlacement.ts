import type { GraphNode, NodeKind } from "typeaudio/graph";
import { WIDTH, nodeHeight, type Point } from "./graphGeometry.ts";

/** Place a new node near the requested point without moving existing nodes. */
export function graphPlacement(
  nodes: GraphNode[],
  kind: NodeKind,
  point: Point,
): Point {
  const height = nodeHeight({ kind }),
    gap = 24;
  const bounded = ({ x, y }: Point) => ({
    x: Math.max(-10000, Math.min(10000, x)),
    y: Math.max(-10000, Math.min(10000, y)),
  });
  const free = (p: Point) =>
    nodes.every(
      (n) =>
        p.x + WIDTH + gap <= n.x ||
        p.x >= n.x + WIDTH + gap ||
        p.y + height + gap <= n.y ||
        p.y >= n.y + nodeHeight(n) + gap,
    );
  const origin = bounded(point);
  if (free(origin)) return origin;
  for (let radius = 1; radius <= nodes.length + 1; radius++) {
    for (const [dx, dy] of [
      [0, radius],
      [radius, 0],
      [0, -radius],
      [-radius, 0],
    ]) {
      const candidate = bounded({
        x: origin.x + dx! * (WIDTH + gap),
        y: origin.y + dy! * (height + gap),
      });
      if (free(candidate)) return candidate;
    }
  }
  return origin;
}
