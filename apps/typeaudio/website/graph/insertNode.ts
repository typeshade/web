import { DEFINITIONS } from "typeaudio/graph";
import { createNode } from "./createNode.ts";
import { connectNodes } from "./connectNodes.ts";
import { validateGraph } from "typeaudio/graph";
import type { NodeKind, SoundGraph } from "typeaudio/graph";

export interface NodeAttachment {
  from?: string;
  to?: { node: string; port: string };
}

export function insertionError(
  graph: SoundGraph,
  kind: NodeKind,
  attachment: NodeAttachment = {},
): string | undefined {
  if (kind === "output") return "The graph already has its Output.";
  if (graph.nodes.length >= 16) return "The graph supports 16 nodes.";
  if (
    kind === "code" &&
    graph.nodes.filter((n) => n.kind === "code").length >= 2
  )
    return "The graph supports two Code nodes.";
  const def = DEFINITIONS[kind];
  if (attachment.from) {
    const from = graph.nodes.find((n) => n.id === attachment.from);
    if (
      !from ||
      !Object.values(def.inputs).includes(DEFINITIONS[from.kind].output)
    )
      return "No compatible input.";
  }
  if (attachment.to) {
    const to = graph.nodes.find((n) => n.id === attachment.to!.node);
    if (!to || DEFINITIONS[to.kind].inputs[attachment.to.port] !== def.output)
      return "No compatible output.";
  }
}

export function insertNode(
  graph: SoundGraph,
  kind: NodeKind,
  point: { x: number; y: number },
  attachment: NodeAttachment = {},
) {
  const error = insertionError(graph, kind, attachment);
  if (error) throw new Error(error);
  const node = createNode(
    kind,
    undefined,
    Math.max(-10000, Math.min(10000, point.x)),
    Math.max(-10000, Math.min(10000, point.y)),
  );
  if (attachment.from) {
    const from = graph.nodes.find((n) => n.id === attachment.from)!;
    const port = Object.entries(DEFINITIONS[kind].inputs).find(
      ([, type]) => type === DEFINITIONS[from.kind].output,
    )![0];
    node.inputs[port] = from.id;
  }
  let next = { ...graph, nodes: [...graph.nodes, node] };
  if (attachment.to)
    next = connectNodes(next, node.id, attachment.to.node, attachment.to.port);
  return { graph: validateGraph(next), id: node.id };
}
