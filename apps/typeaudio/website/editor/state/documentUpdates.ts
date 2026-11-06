import { validatePatch } from "../../sound/validatePatch.ts";
import { type Patch } from "../../sound/types.ts";
import { validateScene, type Scene } from "../../video-model.ts";
import type { Document } from "./documentTypes.ts";
import { projectDocument } from "./documentProjection.ts";
export function updateScene(
  doc: Document,
  edit: (scene: Scene) => Scene,
): Document {
  return projectDocument({ ...doc, scene: validateScene(edit(doc.scene)) });
}

export function updatePatch(
  doc: Document,
  changes: Partial<Patch>,
  name?: string,
): Document {
  const current = projectDocument(doc),
    patch = validatePatch({ ...current.patch, ...changes }),
    nextName = name ?? current.patchName;
  return current.selected &&
    !current.scene.cues.find((c) => c.id === current.selected)?.audio
    ? projectDocument({
        ...current,
        scene: {
          ...current.scene,
          cues: current.scene.cues.map((c) =>
            c.id === current.selected ? { ...c, patch, name: nextName } : c,
          ),
        },
      })
    : projectDocument({ ...current, source: { patch, name: nextName } });
}
