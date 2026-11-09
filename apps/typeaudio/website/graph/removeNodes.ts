import type { SoundGraph } from "typeaudio/graph";

export function removeNodes(graph: SoundGraph, selected: string[]): SoundGraph {
  const removed = new Set(
    graph.nodes
      .filter((n) => selected.includes(n.id) && n.kind !== "output")
      .map((n) => n.id),
  );
  return {
    ...graph,
    nodes: graph.nodes
      .filter((n) => !removed.has(n.id))
      .map((n) => ({
        ...n,
        inputs: Object.fromEntries(
          Object.entries(n.inputs).filter(([, from]) => !removed.has(from)),
        ),
      })),
  };
}
