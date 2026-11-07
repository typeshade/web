import type { Patch } from "./types.ts";
import { hasFunctionSources } from "../functions/hasFunctionSources.ts";
import { hasCompositionSources } from "../functions/hasCompositionSources.ts";
export function patchFileVersion(patch: Patch): 1 | 2 | 3 {
  return hasCompositionSources(patch) ? 3 : hasFunctionSources(patch) ? 2 : 1;
}
