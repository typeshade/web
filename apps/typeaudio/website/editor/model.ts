import { DEFAULT, validatePatch, type Patch } from "../designer.ts";
import { emptyScene, validateScene, type Scene } from "../video-model.ts";
export type Workspace = "sound" | "picture";
export type Tool = "select" | "hand";
export interface Document {
  scene: Scene;
  patch: Patch;
  patchName: string;
  selected: string;
}
export interface EditorState extends Document {
  past: Document[];
  future: Document[];
  workspace: Workspace;
  tool: Tool;
}
export const SCENE_KEY = "typeaudio.video.scene.v1";
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
  const cue = scene.cues[0];
  return {
    scene,
    patch: { ...(cue?.patch || source.patch) },
    patchName: cue?.name || source.name,
    selected: cue?.id || "",
  };
}
export type Action =
  | { type: "edit"; edit: (doc: Document) => Document; record?: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "select"; id: string }
  | { type: "workspace"; workspace: Workspace }
  | { type: "tool"; tool: Tool }
  | { type: "open"; scene: Scene };
function snapshotDocument(s: Document): Document {
  return {
    scene: s.scene,
    patch: s.patch,
    patchName: s.patchName,
    selected: s.selected,
  };
}
export function reducer(s: EditorState, a: Action): EditorState {
  if (a.type === "workspace") return { ...s, workspace: a.workspace };
  if (a.type === "tool") return { ...s, tool: a.tool };
  if (a.type === "select") {
    const c = s.scene.cues.find((c) => c.id === a.id);
    return {
      ...s,
      selected: a.id,
      ...(c ? { patch: { ...c.patch }, patchName: c.name } : {}),
    };
  }
  if (a.type === "open") {
    const scene = validateScene(a.scene),
      cue = scene.cues[0];
    return {
      ...s,
      scene,
      selected: cue?.id || "",
      ...(cue ? { patch: { ...cue.patch }, patchName: cue.name } : {}),
      past: [],
      future: [],
    };
  }
  if (a.type === "undo") {
    const prev = s.past.at(-1);
    return prev
      ? {
          ...s,
          ...prev,
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
          ...next,
          past: [...s.past, snapshotDocument(s)].slice(-30),
          future: s.future.slice(1),
        }
      : s;
  }
  const next = a.edit(snapshotDocument(s));
  return {
    ...s,
    ...next,
    past:
      a.record === false ? s.past : [...s.past, snapshotDocument(s)].slice(-30),
    future: [],
  };
}
export function updatePatch(
  doc: Document,
  patch: Patch,
  name = doc.patchName,
): Document {
  patch = validatePatch(patch);
  return {
    ...doc,
    patch,
    patchName: name,
    scene: {
      ...doc.scene,
      cues: doc.scene.cues.map((c) =>
        c.id === doc.selected ? { ...c, patch: { ...patch }, name } : c,
      ),
    },
  };
}
export function download(data: Blob, name: string): void {
  const url = URL.createObjectURL(data),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
