import { LIMITS } from "./limits.ts";
import type { Patch } from "./types.ts";

/** Procedural clips include short contacts and long sustained sources. Legacy voice limits stay bounded. */
export function parameterLimits(
  patch: Pick<Patch, "graph" | "functions">,
  key: string,
): [number, number] {
  return key === "duration" && (patch.graph || patch.functions)
    ? [0.02, 30]
    : LIMITS[key];
}
