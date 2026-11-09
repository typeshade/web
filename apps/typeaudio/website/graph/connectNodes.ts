import type { SoundGraph } from "typeaudio/graph";
import { validateGraph } from "typeaudio/graph";

export interface GraphConnection {
  from: string;
  to: string;
  port: string;
}

export function connectNodes(
  graph: SoundGraph,
  from: string | undefined,
  to: string,
  port: string,
): SoundGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.id !== to) return node;
      const inputs = { ...node.inputs };
      if (from) inputs[port] = from;
      else delete inputs[port];
      return { ...node, inputs };
    }),
  };
}

export function connectionError(
  graph: SoundGraph,
  connection: GraphConnection,
): string | undefined {
  if (!graph.nodes.some((n) => n.id === connection.to))
    return "The target node is no longer available.";
  try {
    validateGraph(
      connectNodes(graph, connection.from, connection.to, connection.port),
    );
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
