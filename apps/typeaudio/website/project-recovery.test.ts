import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { decodeProject } from "./project/decodeProject.ts";
import { encodeProject } from "./project/encodeProject.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { initialGraph } from "./graph/recipes.ts";
import { validateScene } from "./video-model.ts";
import { validateDrafts } from "./project/editorState.ts";
import {
  ProjectHistory,
  PROJECT_HISTORY_KEY,
} from "./editor/projects/ProjectHistory.ts";
import { reducer } from "./editor/state/documentReducer.ts";
import { projectDocument } from "./editor/state/documentProjection.ts";
import type { EditorState } from "./editor/state/documentTypes.ts";

// A picture project with one procedural (node network) sound, placed in the example's room.
const example = decodeProject(
  JSON.parse(
    readFileSync(
      new URL("./public/projects/unseen-force-wall-hit.json", import.meta.url),
      "utf8",
    ),
  ),
).scene;
const scene = validateScene({
  ...example,
  cues: [
    {
      id: "impact",
      name: "Impact",
      time: example.start + 1,
      gain: 0.8,
      muted: false,
      patch: { ...DEFAULT, graph: initialGraph(), duration: 2, volume: 0.65 },
      space: example.cues[0].space,
    },
  ],
});
const key = JSON.stringify([
  JSON.stringify([`cue:${scene.cues[0].id}`, "base"]),
  "impact",
]);
const editor = {
  source: { name: "Independent source", patch: DEFAULT },
  selected: scene.cues[0].id,
  selection: [scene.cues[0].id],
  drafts: { [key]: { base: "out = input;", text: "out = incomplete(" } },
};
afterEach(() => vi.unstubAllGlobals());

describe("project recovery", () => {
  it("round-trips invalid drafts separately from executable code, source and selection", () => {
    const encoded = encodeProject(scene, [], editor);
    expect(encoded.version).toBe(2);
    const reopened = decodeProject(JSON.parse(JSON.stringify(encoded)));
    expect(reopened.scene).toEqual(scene);
    expect(reopened.editor).toEqual(editor);
    expect(
      reopened.scene.cues[0].patch.graph!.nodes.find(
        (n) => n.id === "impact",
      )!.code,
    ).not.toContain("incomplete");
    expect(() => decodeProject({ ...encoded, editor: undefined })).toThrow();
    expect(() => validateDrafts({ invalid: { base: "", text: "" } })).toThrow();
    expect(() =>
      validateDrafts({ [key]: { base: "", text: "x".repeat(32769) } }),
    ).toThrow();
  });
  it("keeps draft typing out of applied-sound Undo and isolates an opened document", () => {
    const state: EditorState = {
      ...projectDocument({
        scene,
        source: editor.source,
        selected: editor.selected,
      }),
      workspace: "picture",
      tool: "select",
      past: [],
      future: [],
      drafts: {},
    };
    const typed = reducer(state, {
      type: "drafts",
      update: () => editor.drafts,
    });
    expect(typed.past).toEqual([]);
    const changed = reducer(typed, {
      type: "edit",
      edit: (d) => ({ ...d, scene: { ...d.scene, name: "Changed" } }),
    });
    const undone = reducer(changed, { type: "undo" });
    expect(undone.scene.name).toBe(scene.name);
    expect(undone.drafts).toEqual(editor.drafts);
    const opened = reducer(undone, { type: "open", scene });
    expect(opened.drafts).toEqual({});
    expect(opened.documentEpoch).toBe(1);
    const restored = reducer(opened, { type: "open", scene, editor });
    expect(restored.drafts).toEqual(editor.drafts);
    expect(restored.source).toEqual(editor.source);
    expect(restored.documentEpoch).toBe(2);
  });
  it("retains prior copies, deduplicates identical snapshots and fails without deleting recovery data", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
    };
    vi.stubGlobal("localStorage", storage);
    const history = new ProjectHistory(),
      content = encodeProject(scene, [], editor);
    const first = history.save(content);
    expect(history.save(content).id).toBe(first.id);
    expect(history.list()).toHaveLength(1);
    expect(decodeProject(history.read(first.id)).editor?.drafts).toEqual(
      editor.drafts,
    );
    const before = data.get(PROJECT_HISTORY_KEY);
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(() =>
      history.save(encodeProject({ ...scene, name: "Second" }, [], editor)),
    ).toThrow(/not been replaced/);
    expect(data.get(PROJECT_HISTORY_KEY)).toBe(before);
    data.set(PROJECT_HISTORY_KEY, "corrupt");
    expect(() => history.save(content)).toThrow();
    expect(history.usesAudio("anything")).toBe(true);
  });
});
