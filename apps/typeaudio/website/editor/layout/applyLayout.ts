import type { Dimension } from "./types.ts";
import { DIMENSIONS } from "./constants.ts";
import type { Sizes } from "./types.ts";
export function apply(sizes: Sizes) {
  for (const key of Object.keys(DIMENSIONS) as Dimension[]) {
    const value = sizes[key],
      variable = DIMENSIONS[key].variable;
    if (value === undefined)
      document.documentElement.style.removeProperty(variable);
    else document.documentElement.style.setProperty(variable, `${value}px`);
  }
}
