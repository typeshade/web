import type { NodeKind } from "typeaudio/graph";
import type { GraphNode } from "typeaudio/graph";
import { DEFINITIONS } from "typeaudio/graph";
export function createNode(
  kind: NodeKind,
  id: string = crypto.randomUUID(),
  x = 80,
  y = 80,
): GraphNode {
  return {
    id,
    kind,
    name: DEFINITIONS[kind].label,
    x,
    y,
    values: DEFINITIONS[kind].controls.map((c) => c.value),
    inputs: {},
    code: kind === "code" ? "out = input;" : "",
    bypass: false,
  };
}
