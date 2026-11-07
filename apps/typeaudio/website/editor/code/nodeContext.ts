import { DEFINITIONS, type GraphNode, type SoundGraph } from "typeaudio/graph";
import { NODE_BINDINGS } from "./nodeBindings.ts";

/** Describe the actual graph bindings; never infer connections from display names. */
export function nodeContext(graph: SoundGraph, node: GraphNode) {
  const inputs = Object.keys(DEFINITIONS[node.kind].inputs).map((port) => ({
    port,
    source: graph.nodes.find((n) => n.id === node.inputs[port]),
  }));
  const targets = graph.nodes.flatMap((target) =>
    Object.entries(target.inputs)
      .filter(([, id]) => id === node.id)
      .map(([port]) => ({ node: target, port })),
  );
  const source = inputs.find((input) => input.port === "input")?.source;
  const bindings: Record<string, string> = {
    ...NODE_BINDINGS,
    input: source
      ? `Audio from ${source.name} → ${node.name}.input.`
      : "Unconnected input: the engine supplies silence (0).",
    out: targets.length
      ? `Output from ${node.name} → ${targets.map((t) => `${t.node.name}.${t.port}`).join(", ")}.`
      : "This node's output has no downstream connection.",
  };
  for (let i = 0; i < 4; i++)
    bindings[`p${i}`] = graph.parameters[i]
      ? `${graph.parameters[i]!.name} · shared graph parameter p${i}.`
      : `Unassigned graph parameter p${i}: the engine supplies 0.`;
  return { inputs, targets, source, bindings };
}
