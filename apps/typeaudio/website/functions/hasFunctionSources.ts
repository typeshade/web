import type { Patch } from "../sound/types.ts";
export function hasFunctionSources(patch: Patch): boolean {
  return (
    !!patch.functions ||
    patch.layers.some((layer) => hasFunctionSources(layer.patch))
  );
}
