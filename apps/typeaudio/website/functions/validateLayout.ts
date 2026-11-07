import type { FunctionLayout } from "./types.ts";

export function validateFunctionLayout(raw: unknown): FunctionLayout {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid function node positions.");
  const entries = Object.entries(raw);
  if (entries.length > 64) throw new Error("Too many function node positions.");
  return Object.fromEntries(
    entries.map(([id, p]) => {
      if (
        !/^[A-Za-z_][\w-]{0,63}$/.test(id) ||
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        Math.abs(p.x) > 20000 ||
        Math.abs(p.y) > 20000
      )
        throw new Error("Invalid function node position.");
      return [id, { x: p.x, y: p.y }];
    }),
  );
}
