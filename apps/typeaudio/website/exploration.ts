import { DEFAULT } from "./sound/defaultPatch.ts";
import { validatePatch } from "./sound/validatePatch.ts";
import { type Patch } from "./sound/types.ts";
const discrete = new Set([
  "shapeA",
  "shapeB",
  "voices",
  "transpose",
  "lfoTarget",
  "lfoShape",
  "seed",
]);
/** Interpolate frequencies perceptually; keep switches and enum values valid. */
export function morphPatch(a: Patch, b: Patch, amount: number): Patch {
  const t = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
  const result = { ...a };
  for (const key of Object.keys(DEFAULT) as (keyof Patch)[]) {
    if (
      [
        "graph",
        "functions",
        "functionLayout",
        "functionComposition",
        "wave",
        "curves",
        "layers",
      ].includes(key)
    )
      continue;
    const x = a[key],
      y = b[key];
    const value =
      typeof x === "boolean" || discrete.has(key)
        ? t < 0.5
          ? x
          : y
        : ["frequency", "cutoff", "lfoRate"].includes(key)
          ? Number(x) * (Number(y) / Number(x)) ** t
          : Number(x) + (Number(y) - Number(x)) * t;
    (result as unknown as Record<string, unknown>)[key] = value;
  }
  result.wave = a.wave.map((v, i) => v + (b.wave[i]! - v) * t);
  result.curves = structuredClone(t < 0.5 ? a.curves : b.curves);
  result.layers = structuredClone(t < 0.5 ? a.layers : b.layers);
  result.graph = structuredClone(t < 0.5 ? a.graph : b.graph);
  result.functionComposition =
    (t < 0.5 ? a.functionComposition : b.functionComposition) ?? null;
  result.functions = structuredClone(
    (t < 0.5 ? a.functions : b.functions) ?? null,
  );
  result.functionLayout = structuredClone(
    (t < 0.5 ? a.functionLayout : b.functionLayout) ?? {},
  );
  // Roundoff at an endpoint must not cross strict import boundaries.
  return t === 0 ? { ...a } : t === 1 ? { ...b } : validatePatch(result);
}
export function tonePosition(
  x: number,
  y: number,
): Pick<Patch, "cutoff" | "blend"> {
  return {
    cutoff: 80 * 200 ** Math.max(0, Math.min(1, x)),
    blend: 1 - Math.max(0, Math.min(1, y)),
  };
}
