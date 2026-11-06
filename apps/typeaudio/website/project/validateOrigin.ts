import type { ProjectOrigin } from "../scene/types.ts";

export function validateOrigin(value: unknown): ProjectOrigin {
  if (!value || typeof value !== "object") throw new Error("Invalid project origin.");
  const p = value as ProjectOrigin;
  for (const [key, limit] of [["id", 100], ["revision", 100], ["author", 100], ["notes", 2000]] as const)
    if (typeof p[key] !== "string" || p[key].length > limit) throw new Error(`Invalid project ${key}.`);
  return { id: p.id, revision: p.revision, author: p.author, notes: p.notes };
}
