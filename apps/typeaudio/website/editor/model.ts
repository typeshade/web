import { DEFAULT, validatePatch, type Patch } from "../designer.ts";
import { emptyScene, validateScene, type Scene } from "../video-model.ts";
export type Workspace = "sound" | "picture";
export type Tool = "select" | "hand";
export interface Document {
  scene: Scene;
  patch: Patch;
  patchName: string;
  selected: string;
  source: { patch: Patch; name: string };
}
export interface EditorState extends Document {
  checkpoint?: Document;
  past: Document[];
  future: Document[];
  workspace: Workspace;
  tool: Tool;
}
export const SCENE_KEY = "typeaudio.video.scene.v1";
export const DOCUMENT_KEY = "typeaudio.editor.document.v1";
export const PATCH_KEY = "typeaudio.designer.saved.v1";
export function initialDocument(): Document {
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
      scene = nextScene;
      source = nextSource;
      selected = scene.cues.some((c) => c.id === saved.selected)
        ? saved.selected
        : "";
    }
  } catch {}
  return projectDocument({
    scene,
    source,
    selected,
    patch: source.patch,
    patchName: source.name,
  });
}
export type Action =
  | { type: "begin" }
  | { type: "commit" }
  | { type: "cancel" }
  | { type: "edit"; edit: (doc: Document) => Document; record?: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "select"; id: string }
  | { type: "workspace"; workspace: Workspace }
  | { type: "tool"; tool: Tool }
  | { type: "open"; scene: Scene }
  | { type: "media"; media: Scene["media"] };
function snapshotDocument(s: Document): Document {
  return {
    scene: s.scene,
    patch: s.patch,
    patchName: s.patchName,
    selected: s.selected,
    source: s.source,
  };
}
function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>,
    keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && sameData(left[key], right[key]),
    )
  );
}
export function reducer(s: EditorState, a: Action): EditorState {
  if (a.type === "begin")
    return s.checkpoint ? s : { ...s, checkpoint: snapshotDocument(s) };
  if (a.type === "commit") return settle(s);
  if (a.type === "cancel") return cancel(s);
  if (s.checkpoint) {
    if (a.type === "undo" || a.type === "redo") return cancel(s);
    if (a.type !== "edit" && a.type !== "tool") s = settle(s);
  }
  if (a.type === "workspace") return { ...s, workspace: a.workspace };
  if (a.type === "tool") return { ...s, tool: a.tool };
  if (a.type === "select")
    return { ...s, ...projectDocument({ ...s, selected: a.id }) };
  if (a.type === "media")
    return {
      ...s,
      ...updateScene(s, (scene) => ({ ...scene, media: a.media })),
      past: [],
      future: [],
    };
  if (a.type === "open") {
    const scene = validateScene(a.scene);
    return {
      ...s,
      ...projectDocument({ ...s, scene, selected: scene.cues[0]?.id || "" }),
      past: [],
      future: [],
    };
  }
  if (a.type === "undo") {
    const prev = s.past.at(-1);
    return prev
      ? {
          ...s,
          ...projectDocument(prev),
          past: s.past.slice(0, -1),
          future: [snapshotDocument(s), ...s.future].slice(0, 30),
        }
      : s;
  }
  if (a.type === "redo") {
    const next = s.future[0];
    return next
      ? {
          ...s,
          ...projectDocument(next),
          past: [...s.past, snapshotDocument(s)].slice(-30),
          future: s.future.slice(1),
        }
      : s;
  }
  const next = projectDocument(a.edit(snapshotDocument(s)));
  if (sameData(snapshotDocument(s), next)) return s;
  return {
    ...s,
    ...next,
    past:
      a.record === false || s.checkpoint
        ? s.past
        : [...s.past, snapshotDocument(s)].slice(-30),
    future: s.checkpoint ? s.future : [],
  };
}
function settle(s: EditorState): EditorState {
  if (!s.checkpoint) return s;
  const { checkpoint, ...rest } = s;
  return sameData(snapshotDocument(s), checkpoint)
    ? rest
    : { ...rest, past: [...s.past, checkpoint].slice(-30), future: [] };
}
function cancel(s: EditorState): EditorState {
  if (!s.checkpoint) return s;
  const { checkpoint, ...rest } = s;
  return { ...rest, ...projectDocument(checkpoint) };
}
/** patch/patchName are the selected sound projection, never a second source of truth. */
export function projectDocument(doc: Document): Document {
  const cue = doc.scene.cues.find((c) => c.id === doc.selected);
  return {
    ...doc,
    selected: cue?.id || "",
    patch: cue?.patch || doc.source.patch,
    patchName: cue?.name || doc.source.name,
  };
}
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
  return current.selected
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
export function download(data: Blob, name: string): void {
  const url = URL.createObjectURL(data),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
