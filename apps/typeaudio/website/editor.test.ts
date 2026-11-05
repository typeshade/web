import { describe, it, expect } from "vitest";
import {
  reducer,
  updatePatch,
  updateScene,
  projectDocument,
  type EditorState,
} from "./editor/model.ts";
import { emptyScene } from "./video-model.ts";
import { DEFAULT } from "./designer.ts";
const initial = (): EditorState => ({
  scene: {
    ...emptyScene(),
    cues: [
      {
        id: "a",
        name: "Impact",
        time: 1,
        gain: 0.7,
        muted: false,
        patch: { ...DEFAULT },
      },
    ],
  },
  source: { patch: { ...DEFAULT }, name: "Source" },
  patch: { ...DEFAULT },
  patchName: "Source",
  selected: "",
  workspace: "picture",
  tool: "select",
  past: [],
  future: [],
});
describe("shared editor document", () => {
  it("edits the selected layer across workspaces and undoes/redoes the complete change", () => {
    let s = reducer(initial(), { type: "select", id: "a" });
    expect(s.patchName).toBe("Impact");
    s = reducer(s, { type: "workspace", workspace: "sound" });
    s = reducer(s, {
      type: "edit",
      edit: (d) => updatePatch(d, { ...d.patch, frequency: 440 }, "New impact"),
    });
    expect(s.scene.cues[0]!.patch.frequency).toBe(440);
    expect(s.scene.cues[0]!.name).toBe("New impact");
    s = reducer(s, { type: "undo" });
    expect(s.patch.frequency).toBe(DEFAULT.frequency);
    expect(s.scene.cues[0]!.name).toBe("Impact");
    s = reducer(s, { type: "redo" });
    expect(s.patch.frequency).toBe(440);
    expect(s.scene.cues[0]!.patch.frequency).toBe(440);
  });
  it("keeps source edits independent when no layer is selected and clears redo after a new edit", () => {
    const s = reducer(initial(), {
      type: "edit",
      edit: (d) => updatePatch(d, { ...d.patch, frequency: 440 }),
    });
    expect(s.scene.cues[0]!.patch.frequency).toBe(DEFAULT.frequency);
    const undone = reducer(s, { type: "undo" });
    expect(undone.future).toHaveLength(1);
    expect(
      reducer(undone, {
        type: "edit",
        edit: (d) => updatePatch(d, { ...d.patch, frequency: 880 }),
      }).future,
    ).toHaveLength(0);
  });
  it("limits undo history and resets it when opening another project", () => {
    let s = initial();
    for (let i = 0; i < 40; i++)
      s = reducer(s, {
        type: "edit",
        edit: (d) => updatePatch(d, {}, String(i)),
      });
    expect(s.past).toHaveLength(30);
    s = reducer(s, { type: "open", scene: initial().scene });
    expect(s.past).toHaveLength(0);
    expect(s.patchName).toBe("Impact");
    expect(s.selected).toBe("a");
  });
  it("rejects malformed projects without changing the current document", () => {
    const s = initial();
    expect(() =>
      reducer(s, { type: "open", scene: { ...s.scene, end: 70 } }),
    ).toThrow();
    expect(s.scene.end).toBe(10);
  });
});

describe("state rollback regressions", () => {
  it("keeps standalone Tone when selecting, editing and deselecting clips", () => {
    let s = reducer(initial(), {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 9000, blend: 0.83 }),
    });
    s = reducer(s, { type: "select", id: "a" });
    s = reducer(s, {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 700, blend: 0.12 }),
    });
    s = reducer(s, { type: "select", id: "" });
    expect(s.patch.cutoff).toBe(9000);
    expect(s.patch.blend).toBe(0.83);
    s = reducer(s, { type: "select", id: "a" });
    expect(s.patch.cutoff).toBe(700);
    expect(s.patch.blend).toBe(0.12);
  });
  it("composes queued parameter and scene field edits without restoring older values", () => {
    let s = reducer(initial(), { type: "select", id: "a" });
    // Callbacks created before a render commit must describe only the intended change.
    s = reducer(s, {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: 440 }),
    });
    s = reducer(s, {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 8500, blend: 0.77 }),
    });
    s = reducer(s, {
      type: "edit",
      edit: (d) =>
        updateScene(d, (scene) => ({
          ...scene,
          cues: scene.cues.map((c) => (c.id === "a" ? { ...c, time: 2 } : c)),
        })),
    });
    s = reducer(s, {
      type: "edit",
      edit: (d) => updateScene(d, (scene) => ({ ...scene, effects: 0.3 })),
    });
    expect(s.patch.frequency).toBe(440);
    expect(s.patch.cutoff).toBe(8500);
    expect(s.patch.blend).toBe(0.77);
    expect(s.scene.cues[0]!.patch).toEqual(s.patch);
    expect(s.scene.cues[0]!.time).toBe(2);
    expect(s.scene.effects).toBe(0.3);
  });
  it("does not consume undo or erase redo for an unchanged value", () => {
    let s = reducer(initial(), {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 8000 }),
    });
    s = reducer(s, { type: "undo" });
    const before = s;
    s = reducer(s, {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: d.patch.cutoff }),
    });
    expect(s).toBe(before);
    expect(s.future).toHaveLength(1);
  });
  it("keeps Tone and selection when media is replaced, and restores source Tone after undo", () => {
    let s = reducer(initial(), {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 9500, blend: 0.9 }),
    });
    s = reducer(s, {
      type: "media",
      media: { kind: "file", name: "scene.webm" },
    });
    expect(s.selected).toBe("");
    expect(s.patch.cutoff).toBe(9500);
    s = reducer(s, { type: "select", id: "a" });
    s = reducer(s, {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 500 }),
    });
    s = reducer(s, { type: "undo" });
    expect(s.scene.cues[0]!.patch.cutoff).toBe(DEFAULT.cutoff);
    s = reducer(s, { type: "select", id: "" });
    expect(s.patch.cutoff).toBe(9500);
    expect(s.patch.blend).toBe(0.9);
  });
});

it("treats a legacy source with a different property order as the same document", () => {
  const base = initial();
  base.source = { name: "Source", patch: { ...DEFAULT } };
  const before = {
    ...base,
    future: [
      {
        scene: base.scene,
        patch: base.patch,
        patchName: base.patchName,
        selected: "",
        source: base.source,
      },
    ],
  };
  expect(
    reducer(before, { type: "edit", edit: (d) => updatePatch(d, {}) }),
  ).toBe(before);
});
describe("document restoration", () => {
  it("restores an explicitly deselected source instead of selecting the first clip", async () => {
    const { vi } = await import("vitest");
    const { initialDocument, DOCUMENT_KEY } = await import("./editor/model.ts");
    const doc = initial();
    doc.source = {
      name: "Keep Tone",
      patch: { ...DEFAULT, cutoff: 8700, blend: 0.86 },
    };
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === DOCUMENT_KEY
          ? JSON.stringify({
              version: 1,
              scene: doc.scene,
              source: doc.source,
              selected: "",
            })
          : null,
    });
    try {
      const restored = initialDocument();
      expect(restored.selected).toBe("");
      expect(restored.patch.cutoff).toBe(8700);
      expect(restored.patch.blend).toBe(0.86);
      expect(restored.patchName).toBe("Keep Tone");
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("migrates legacy independent source Tone without replacing it with a selected clip", async () => {
    const { vi } = await import("vitest");
    const { initialDocument, SCENE_KEY } = await import("./editor/model.ts");
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === SCENE_KEY
          ? JSON.stringify(initial().scene)
          : key === "typeaudio.editor.source.v1"
            ? JSON.stringify({
                name: "Legacy Tone",
                patch: { ...DEFAULT, cutoff: 9100, blend: 0.9 },
              })
            : null,
    });
    try {
      const restored = initialDocument();
      expect(restored.source.patch.cutoff).toBe(9100);
      expect(restored.source.patch.blend).toBe(0.9);
      expect(projectDocument({ ...restored, selected: "" }).patch.cutoff).toBe(
        9100,
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("continuous control history", () => {
  it("keeps an entire parameter gesture as one undoable edit", () => {
    let state = reducer(initial(), { type: "begin" });
    for (let frequency = 300; frequency < 400; frequency++)
      state = reducer(state, {
        type: "edit",
        edit: (d) => updatePatch(d, { frequency }),
      });
    expect(state.past).toHaveLength(0);
    state = reducer(state, { type: "commit" });
    expect(state.past).toHaveLength(1);
    expect(state.checkpoint).toBeUndefined();
    state = reducer(state, { type: "undo" });
    expect(state.patch.frequency).toBe(DEFAULT.frequency);
    state = reducer(state, { type: "redo" });
    expect(state.patch.frequency).toBe(399);
  });
  it("restores values and redo after cancellation or a gesture with no net change", () => {
    let state = reducer(initial(), {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: 440 }),
    });
    state = reducer(state, { type: "undo" });
    state = reducer(state, { type: "begin" });
    state = reducer(state, {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: 880, cutoff: 9000 }),
    });
    state = reducer(state, { type: "cancel" });
    expect(state.patch).toEqual(DEFAULT);
    expect(state.future).toHaveLength(1);
    state = reducer(state, { type: "begin" });
    state = reducer(state, {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: 330 }),
    });
    state = reducer(state, {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: DEFAULT.frequency }),
    });
    state = reducer(state, { type: "commit" });
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(1);
  });
  it("commits source edits before selection changes without mixing source and clip Tone", () => {
    let state = reducer(initial(), { type: "begin" });
    state = reducer(state, {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 9000 }),
    });
    state = reducer(state, { type: "select", id: "a" });
    expect(state.source.patch.cutoff).toBe(9000);
    expect(state.patch.cutoff).toBe(DEFAULT.cutoff);
    expect(state.checkpoint).toBeUndefined();
    expect(state.past).toHaveLength(1);
    state = reducer(state, { type: "begin" });
    state = reducer(state, {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: 660 }),
    });
    state = reducer(state, { type: "workspace", workspace: "sound" });
    expect(state.past).toHaveLength(2);
    expect(state.scene.cues[0]!.patch.frequency).toBe(660);
    expect(state.source.patch.frequency).toBe(DEFAULT.frequency);
    state = reducer(state, { type: "undo" });
    expect(state.patch.frequency).toBe(DEFAULT.frequency);
    expect(state.source.patch.cutoff).toBe(9000);
  });
  it("undo cancels the active gesture before undoing earlier edits", () => {
    let state = reducer(initial(), {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: 440 }),
    });
    state = reducer(state, { type: "begin" });
    state = reducer(state, {
      type: "edit",
      edit: (d) => updatePatch(d, { frequency: 880 }),
    });
    state = reducer(state, { type: "undo" });
    expect(state.patch.frequency).toBe(440);
    expect(state.past).toHaveLength(1);
    state = reducer(state, { type: "undo" });
    expect(state.patch.frequency).toBe(DEFAULT.frequency);
  });
});
