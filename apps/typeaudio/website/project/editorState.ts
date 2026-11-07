import type { Patch } from "../sound/types.ts";
import { validatePatch } from "../sound/validatePatch.ts";

export interface CodeDraft {
  base: string;
  text: string;
}
export type CodeDrafts = Record<string, CodeDraft>;
export interface ProjectEditorState {
  source: { name: string; patch: Patch };
  drafts: CodeDrafts;
  selected: string;
  selection: string[];
}

/** Drafts may be incomplete or invalid code. Saving never compiles or applies them. */
export function validateDrafts(raw: unknown): CodeDrafts {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid code drafts.");
  const entries = Object.entries(raw);
  if (entries.length > 256 || JSON.stringify(raw).length > 2_000_000)
    throw new Error("Code drafts exceed the project storage limit.");
  return Object.fromEntries(
    entries.map(([key, value]) => {
      const parts = JSON.parse(key),
        draft = value as CodeDraft;
      if (
        !Array.isArray(parts) ||
        parts.length !== 2 ||
        parts.some((p) => typeof p !== "string") ||
        key.length > 500 ||
        !draft ||
        typeof draft.base !== "string" ||
        typeof draft.text !== "string" ||
        draft.base.length > 32768 ||
        draft.text.length > 32768
      )
        throw new Error("Invalid code draft entry.");
      return [key, { base: draft.base, text: draft.text }];
    }),
  );
}

export function validateEditorState(raw: unknown): ProjectEditorState {
  if (!raw || typeof raw !== "object")
    throw new Error("Missing editable project state.");
  const e = raw as ProjectEditorState;
  if (
    !e.source ||
    typeof e.source.name !== "string" ||
    typeof e.selected !== "string" ||
    !Array.isArray(e.selection) ||
    e.selection.length > 24 ||
    e.selection.some((id) => typeof id !== "string")
  )
    throw new Error("Invalid editable project state.");
  return {
    source: {
      name: e.source.name.slice(0, 100),
      patch: validatePatch(e.source.patch),
    },
    drafts: validateDrafts(e.drafts),
    selected: e.selected,
    selection: e.selection,
  };
}
