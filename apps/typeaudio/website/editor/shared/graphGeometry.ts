import { DEFINITIONS } from "typeaudio/graph";
import type { GraphNode } from "typeaudio/graph";
export const WIDTH = 190;
export const GRID = 20;
export interface Point {
  x: number;
  y: number;
}
export interface GraphView extends Point {
  scale: number;
}
export const nodeHeight = (node: Pick<GraphNode, "kind">) =>
  77 + Math.max(1, Object.keys(DEFINITIONS[node.kind].inputs).length) * 25;
export const outputPoint = (node: GraphNode): Point => ({
  x: node.x + WIDTH,
  y: node.y + 50,
});
export const inputPoint = (node: GraphNode, port: string): Point => ({
  x: node.x,
  y:
    node.y + 50 + Object.keys(DEFINITIONS[node.kind].inputs).indexOf(port) * 25,
});
export function graphBounds(nodes: GraphNode[]) {
  const x = Math.min(...nodes.map((n) => n.x)),
    y = Math.min(...nodes.map((n) => n.y));
  return {
    x,
    y,
    width: Math.max(...nodes.map((n) => n.x + WIDTH)) - x,
    height: Math.max(...nodes.map((n) => n.y + nodeHeight(n))) - y,
  };
}
export function moveNodes(
  nodes: GraphNode[],
  ids: string[],
  dx: number,
  dy: number,
  snap = false,
) {
  const selected = nodes.filter((n) => ids.includes(n.id));
  if (!selected.length) return nodes;
  const anchor = selected[0]!;
  if (snap) {
    dx = Math.round((anchor.x + dx) / GRID) * GRID - anchor.x;
    dy = Math.round((anchor.y + dy) / GRID) * GRID - anchor.y;
  }
  dx = Math.max(
    ...selected.map((n) => -10000 - n.x),
    Math.min(dx, ...selected.map((n) => 10000 - n.x)),
  );
  dy = Math.max(
    ...selected.map((n) => -10000 - n.y),
    Math.min(dy, ...selected.map((n) => 10000 - n.y)),
  );
  return nodes.map((n) =>
    ids.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n,
  );
}
export const curve = (x: number, y: number, a: number, b: number) =>
  `M${x} ${y} C${x + Math.max(55, Math.abs(a - x) * 0.45)} ${y},${a - Math.max(55, Math.abs(a - x) * 0.45)} ${b},${a} ${b}`;
