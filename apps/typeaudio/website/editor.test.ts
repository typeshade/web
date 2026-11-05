import { describe, it, expect } from "vitest";
import { reducer, updatePatch, type EditorState } from "./editor/model.ts";
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
        edit: (d) => ({ ...d, patchName: String(i) }),
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
