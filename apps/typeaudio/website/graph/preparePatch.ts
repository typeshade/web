import { graphKey } from "./graphIdentity.ts";
import type { GraphProgram } from "./program.ts";
import type { Patch } from "../sound/types.ts";
import { prepareGraph } from "./compilationClient.ts";
export async function patchPrograms(p: Patch): Promise<GraphProgram[]> {
  const graphs = [p, ...p.layers.map((l) => l.patch)].flatMap((p) =>
    p.graph ? [p.graph] : [],
  );
  return Promise.all(
    [...new Map(graphs.map((g) => [graphKey(g), g])).values()].map(
      prepareGraph,
    ),
  );
}
