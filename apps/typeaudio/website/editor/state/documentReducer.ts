import { validateScene } from "../../video-model.ts";
import type { Document } from "./documentTypes.ts";
import type { EditorState } from "./documentTypes.ts";
import type { Action } from "./documentTypes.ts";
import { selectionIds } from "./documentProjection.ts";
import { selectDocument } from "./selection.ts";
import { projectDocument } from "./documentProjection.ts";
import { updateScene } from "./documentUpdates.ts";
function snapshotDocument(s: Document): Document {
  return {
    scene: s.scene,
    patch: s.patch,
    patchName: s.patchName,
    selected: s.selected,
    selection: selectionIds(s),
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
  // Text history belongs to Monaco; document Undo must preserve in-progress drafts.
  if (a.type === "drafts" || a.type === "reconcileDrafts") {
    const drafts = a.update(s.drafts ?? {});
    return drafts === s.drafts ? s : { ...s, drafts };
  }
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
  if (a.type === "select") return { ...s, ...selectDocument(s, a.id, a.mode) };
  if (a.type === "selectMany")
    return {
      ...s,
      ...projectDocument({
        ...s,
        selected: a.ids.at(-1) || "",
        selection: a.ids,
      }),
    };
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
      ...projectDocument({
        ...s,
        scene,
        source: a.editor?.source ?? s.source,
        selection: a.editor?.selection,
        selected: a.editor?.selected ?? scene.cues[0]?.id ?? "",
      }),
      drafts: a.editor?.drafts ?? {},
      documentEpoch: (s.documentEpoch ?? 0) + 1,
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
