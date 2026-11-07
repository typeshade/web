import { graphKey } from "typeaudio/graph";
import type { Patch } from "../sound/types.ts";
import { functionSourceKey } from "./sourceKey.ts";

export function patchSourceKey(p: Patch) {
  return p.functions
    ? functionSourceKey(p.functions)
    : p.graph
      ? graphKey(p.graph)
      : "legacy";
}
