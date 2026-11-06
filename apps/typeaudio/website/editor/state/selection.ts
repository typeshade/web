import type { Document } from "./documentTypes.ts";
import type { SelectionMode } from "./documentTypes.ts";
import { selectionIds } from "./documentProjection.ts";
import { projectDocument } from "./documentProjection.ts";
export function selectDocument(
  doc: Document,
  id: string,
  mode?: SelectionMode,
): Document {
  let ids = selectionIds(doc);
  if (mode === "toggle")
    ids = ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id];
  else if (mode === "range" && doc.selected) {
    const a = doc.scene.cues.findIndex((c) => c.id === doc.selected),
      b = doc.scene.cues.findIndex((c) => c.id === id);
    ids =
      a >= 0 && b >= 0
        ? doc.scene.cues
            .slice(Math.min(a, b), Math.max(a, b) + 1)
            .map((c) => c.id)
        : [id];
  } else if (mode !== "preserve" || !ids.includes(id)) ids = id ? [id] : [];
  return projectDocument({
    ...doc,
    selected: ids.includes(id) ? id : ids.at(-1) || "",
    selection: ids,
  });
}
