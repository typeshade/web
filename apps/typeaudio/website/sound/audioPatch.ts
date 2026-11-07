import type { Patch } from "./types.ts";

/** Canvas positions belong to authoring state, not playback or render identity. */
export function audioPatch(patch: Patch): Patch {
  const { functionLayout: _layout, ...source } = patch;
  return {
    ...source,
    layers: source.layers.map((layer) => ({
      ...layer,
      patch: audioPatch(layer.patch),
    })),
  };
}
