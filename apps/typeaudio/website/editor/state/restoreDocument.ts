import { DEFAULT } from "../../sound/defaultPatch.ts";
import { validatePatch } from "../../sound/validatePatch.ts";
import { emptyScene, validateScene } from "../../video-model.ts";
import type { Document } from "./documentTypes.ts";
import { SCENE_KEY } from "./storageKeys.ts";
import { DOCUMENT_KEY } from "./storageKeys.ts";
import { projectDocument } from "./documentProjection.ts";
import { validateDrafts, type CodeDrafts } from "../../project/editorState.ts";
export function initialDocument(): Document & { drafts: CodeDrafts } {
  let drafts: CodeDrafts = {};
  let scene = emptyScene();
  try {
    const raw = localStorage.getItem(SCENE_KEY);
    if (raw) scene = validateScene(JSON.parse(raw));
  } catch {}
  let source = { name: "Warm lead", patch: { ...DEFAULT } };
  try {
    const raw = localStorage.getItem("typeaudio.editor.source.v1");
    if (raw) {
      const p = JSON.parse(raw);
      source = {
        name: String(p.name).slice(0, 40),
        patch: validatePatch(p.patch),
      };
    }
  } catch {}
  // Prefer one atomic document; retain legacy scene/source migration.
  let selected = scene.cues[0]?.id || "";
  let selection: string[] | undefined;
  try {
    const raw = localStorage.getItem(DOCUMENT_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.version !== 1) throw new Error("Unsupported document");
      const nextScene = validateScene(saved.scene);
      const nextSource = {
        patch: validatePatch(saved.source.patch),
        name: String(saved.source.name).slice(0, 40),
      };
      const nextDrafts = validateDrafts(saved.drafts);
      selection = Array.isArray(saved.selection)
        ? saved.selection.filter((id: unknown) => typeof id === "string")
        : undefined;
      scene = nextScene;
      source = nextSource;
      drafts = nextDrafts;
      selected = scene.cues.some((c) => c.id === saved.selected)
        ? saved.selected
        : "";
    }
  } catch {}
  return {
    ...projectDocument({
      scene,
      source,
      selected,
      selection,
      patch: source.patch,
      patchName: source.name,
    }),
    drafts,
  };
}
