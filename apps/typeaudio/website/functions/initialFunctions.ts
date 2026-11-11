import source from "./function-sound.json";
import { validateFunctionDocument } from "typeaudio/function-graph";
import { DEFAULT } from "../sound/defaultPatch.ts";
import type { Patch } from "../sound/types.ts";

export function functionPatch(raw: unknown = source): Patch {
  const functions = validateFunctionDocument(raw);
  return {
    ...DEFAULT,
    graph: null,
    functions,
    layers: [],
    duration: 2,
    volume: 0.65,
    functionLayout: Object.fromEntries(
      functions.nodes.map((node, i) => [node.id, { x: 40 + i * 280, y: 80 }]),
    ),
  };
}
