export interface CodeDraft {
  base: string;
  text: string;
}

// '$' cannot occur in a validated graph node ID.
export const GENERATED_DOCUMENT = "$generated";

/** Follow applied edits only while clean. A dirty draft survives Undo and imports. */
export function resolveCodeDraft(
  draft: CodeDraft | undefined,
  applied: string,
) {
  if (!draft || draft.text === draft.base || draft.text === applied)
    return { base: applied, text: applied, conflict: false };
  return { ...draft, conflict: draft.base !== applied };
}

export function codeDocumentKey(owner: string, node: string) {
  return JSON.stringify([owner, node]);
}
