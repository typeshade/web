import type { Dimension } from "./types.ts";
import { KEY } from "./constants.ts";
import { DIMENSIONS } from "./constants.ts";
import type { Sizes } from "./types.ts";
export function load(): Sizes {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (data?.version !== 1) return {};
    const sizes: Sizes = {};
    for (const key of Object.keys(DIMENSIONS) as Dimension[]) {
      const v = data.sizes?.[key],
        d = DIMENSIONS[key];
      if (typeof v === "number" && Number.isFinite(v))
        sizes[key] = Math.max(d.min, Math.min(d.max, v));
    }
    return sizes;
  } catch {
    return {};
  }
}
