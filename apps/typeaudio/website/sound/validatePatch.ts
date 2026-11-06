import type { Patch } from "./types.ts";
import { DEFAULT } from "./defaultPatch.ts";
import { LIMITS } from "./limits.ts";
import { validateGraph } from "../graph/validateGraph.ts";
import { WAVE_SIZE } from "./constants.ts";
import { CURVE_LIMITS } from "./limits.ts";
import { MAX_SOUND_LAYERS } from "./constants.ts";
/** Strict validation for stored/imported patches and worker requests. */
export function validatePatch(value: unknown, nested = false): Patch {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("A patch must be an object.");
  const data = value as Record<string, unknown>;
  const result = { ...DEFAULT };
  for (const key of Object.keys(DEFAULT) as (keyof Patch)[]) {
    if (["graph", "wave", "curves", "layers"].includes(key)) continue;
    const v =
      data[key] === undefined &&
      [
        "baseMuted",
        "fmRatio",
        "fmIndex",
        "seed",
        "lfoRate",
        "lfoDepth",
        "lfoTarget",
        "lfoShape",
        "lfoSync",
        "tempo",
      ].includes(key)
        ? DEFAULT[key]
        : data[key];
    if (typeof DEFAULT[key] === "boolean") {
      if (typeof v !== "boolean") throw new Error(`${key} must be on or off.`);
    } else {
      const [low, high] = LIMITS[key]!;
      if (typeof v !== "number" || !Number.isFinite(v) || v < low || v > high)
        throw new Error(`${key} must be between ${low} and ${high}.`);
      if (
        [
          "shapeA",
          "shapeB",
          "voices",
          "transpose",
          "lfoTarget",
          "lfoShape",
          "seed",
        ].includes(key) &&
        !Number.isInteger(v)
      )
        throw new Error(`${key} must be a whole number.`);
    }
    (result as unknown as Record<string, unknown>)[key] = v;
  }
  if (nested && result.baseMuted)
    throw new Error("Nested layer patches cannot mute the base source.");
  result.graph = data.graph == null ? null : validateGraph(data.graph);
  const wave = data.wave ?? DEFAULT.wave;
  if (
    !Array.isArray(wave) ||
    wave.length !== WAVE_SIZE ||
    wave.some(
      (v) => typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 1,
    )
  )
    throw new Error("A custom wave needs 64 values between -1 and 1.");
  result.wave = wave.slice();
  const curves = data.curves ?? DEFAULT.curves;
  if (!curves || typeof curves !== "object" || Array.isArray(curves))
    throw new Error("Invalid automation curves.");
  result.curves = { pitch: [], cutoff: [], gain: [] };
  for (const key of ["pitch", "cutoff", "gain"] as const) {
    const points = (curves as Record<string, unknown>)[key] ?? [];
    const [low, high] = CURVE_LIMITS[key];
    if (!Array.isArray(points) || points.length > 16 || points.length === 1)
      throw new Error("A curve needs 2–16 points, or no points to bypass it.");
    result.curves[key] = points.map((p, i) => {
      if (
        !p ||
        typeof p.time !== "number" ||
        !Number.isFinite(p.time) ||
        p.time < 0 ||
        p.time > 1 ||
        (i > 0 && p.time <= points[i - 1].time) ||
        typeof p.value !== "number" ||
        !Number.isFinite(p.value) ||
        p.value < low ||
        p.value > high
      )
        throw new Error(`Invalid ${key} curve point.`);
      return { time: p.time, value: p.value };
    });
    if (points.length && (points[0].time !== 0 || points.at(-1).time !== 1))
      throw new Error("Curves must start at 0 and end at 1.");
  }
  const layers = data.layers ?? [];
  if (
    !Array.isArray(layers) ||
    layers.length >= MAX_SOUND_LAYERS ||
    (nested && layers.length)
  )
    throw new Error("A sound supports four layers without nested layers.");
  const ids = new Set<string>();
  result.layers = layers.map((layer) => {
    if (
      !layer ||
      typeof layer.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(layer.id) ||
      ids.has(layer.id) ||
      layer.id === "base" ||
      typeof layer.name !== "string" ||
      layer.name.length > 40 ||
      typeof layer.offset !== "number" ||
      !Number.isFinite(layer.offset) ||
      layer.offset < 0 ||
      layer.offset > 5 ||
      typeof layer.muted !== "boolean"
    )
      throw new Error("Invalid sound layer.");
    ids.add(layer.id);
    return {
      id: layer.id,
      name: layer.name,
      offset: layer.offset,
      muted: layer.muted,
      patch: validatePatch(layer.patch, true),
    };
  });
  return result;
}
