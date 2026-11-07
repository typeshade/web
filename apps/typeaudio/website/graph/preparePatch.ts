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
  const programs = await Promise.all([
    ...[...new Map(graphs.map((g) => [graphKey(g), g])).values()].map(
      prepareGraph,
    ),
    ...[
      ...new Map(functions.map((g) => [functionSourceKey(g), g])).values(),
    ].map((graph) => prepareFunctions(graph)),
  ]);
  const registrations = new Set(
    programs.flatMap((p) =>
      "schema" in p ? p.artifacts.map((a) => a.key) : [],
    ),
  );
  if (registrations.size > 64)
    throw new Error(
      "This sound needs more than 64 prepared functions. Reduce unique definitions across its layers.",
    );
  return programs;
}
