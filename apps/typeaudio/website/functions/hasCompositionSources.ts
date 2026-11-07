import type { Patch } from "../sound/types.ts";
export function hasCompositionSources(patch: Patch): boolean {
  return (
    !!patch.functionComposition ||
    patch.layers.some((layer) => hasCompositionSources(layer.patch))
  );
}
