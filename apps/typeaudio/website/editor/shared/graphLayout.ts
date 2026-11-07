import type { GraphNode, SoundGraph } from "typeaudio/graph";
import { orderedNodes } from "typeaudio/graph";
import { WIDTH, nodeHeight } from "./graphGeometry.ts";

/** Lay out a DAG left to right, including disconnected nodes, without changing signal order. */
export function arrangeGraph(graph: SoundGraph): SoundGraph {
  const depths = new Map<string, number>();
  for (const node of orderedNodes(graph))
    depths.set(
      node.id,
      Math.max(
        -1,
        ...Object.values(node.inputs).map((id) => depths.get(id) ?? 0),
      ) + 1,
    );
  const columns = new Map<number, GraphNode[]>();
  for (const node of graph.nodes) {
    const depth = depths.get(node.id)!;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  }
  const positions = new Map<string, { x: number; y: number }>();
  for (const [depth, nodes] of columns) {
    let y = 40;
    for (const node of nodes) {
      positions.set(node.id, { x: 40 + depth * (WIDTH + 80), y });
      y += nodeHeight(node) + 45;
    }
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({ ...n, ...positions.get(n.id)! })),
  };
}
