import type { SoundGraph } from "typeaudio/graph";
import { validateGraph } from "typeaudio/graph";

export function duplicationError(
  graph: SoundGraph,
  selected: string[],
): string | undefined {
  const nodes = graph.nodes.filter(
    (n) => selected.includes(n.id) && n.kind !== "output",
  );
  if (!nodes.length) return "Select a node other than Output.";
  if (graph.nodes.length + nodes.length > 16)
    return "The graph supports 16 nodes.";
  if ([...graph.nodes, ...nodes].filter((n) => n.kind === "code").length > 2)
    return "The graph supports two Code nodes.";
}

/** Copy internal wires to the new group while retaining inputs from outside it. */
export function duplicateNodes(graph: SoundGraph, selected: string[]) {
  const nodes = graph.nodes.filter(
    (n) => selected.includes(n.id) && n.kind !== "output",
  );
  const ids = new Map(nodes.map((n) => [n.id, crypto.randomUUID()]));
  const dx = Math.min(40, ...nodes.map((n) => 10000 - n.x));
  const dy = Math.min(100, ...nodes.map((n) => 10000 - n.y));
  const copies = nodes.map((n) => ({
    ...n,
    id: ids.get(n.id)!,
    name: n.name.slice(0, 35) + " copy",
    x: n.x + dx,
    y: n.y + dy,
    values: [...n.values],
    inputs: Object.fromEntries(
      Object.entries(n.inputs).map(([port, from]) => [
        port,
        ids.get(from) ?? from,
      ]),
    ),
  }));
  return {
    graph: validateGraph({ ...graph, nodes: [...graph.nodes, ...copies] }),
    ids: copies.map((n) => n.id),
  };
}
