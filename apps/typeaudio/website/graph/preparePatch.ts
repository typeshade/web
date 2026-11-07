import { graphKey } from "typeaudio/graph";
import type { PreparedProgram } from "../functions/types.ts";
import { prepareFunctions } from "../functions/compilationClient.ts";
import { functionSourceKey } from "../functions/sourceKey.ts";
import type { Patch } from "../sound/types.ts";
import { prepareGraph } from "./compilationClient.ts";
export async function patchPrograms(p: Patch): Promise<PreparedProgram[]> {
  const graphs = [p, ...p.layers.map((l) => l.patch)].flatMap((p) =>
    p.graph ? [p.graph] : [],
  );
  const functions = [p, ...p.layers.map((l) => l.patch)].flatMap((p) =>
    p.functions ? [p.functions] : [],
  );
  return Promise.all([
    ...[...new Map(graphs.map((g) => [graphKey(g), g])).values()].map(
      prepareGraph,
    ),
    ...[
      ...new Map(functions.map((g) => [functionSourceKey(g), g])).values(),
    ].map(prepareFunctions),
  ]);
}
