import type { Document } from "./documentTypes.ts";
export function selectionIds(doc: Document): string[] {
  if (!doc.selected) return [];
  const valid = new Set(doc.scene.cues.map((c) => c.id));
  if (!doc.selection?.includes(doc.selected) && valid.has(doc.selected))
    return [doc.selected];
  return [...new Set(doc.selection || [doc.selected])].filter((id) =>
    valid.has(id),
  );
}

/** patch/patchName are the selected sound projection, never a second source of truth. */
export function projectDocument(doc: Document): Document {
  const ids = selectionIds(doc);
  const cue = doc.scene.cues.find(
    (c) => c.id === (ids.includes(doc.selected) ? doc.selected : ids.at(-1)),
  );
  return {
    ...doc,
    selected: cue?.id || "",
    selection: ids,
    patch: cue && !cue.audio ? cue.patch : doc.source.patch,
    patchName: cue && !cue.audio ? cue.name : doc.source.name,
  };
}
