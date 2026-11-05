import { describe, it, expect } from "vitest";
import { DEFAULT, SAMPLE_RATE } from "./designer.ts";
import {
  cueRange,
  cueWindow,
  cueEnvelope,
  fadeAt,
  fadePoints,
  emptyScene,
  mixScene,
  validateScene,
  type Cue,
} from "./video-model.ts";
import { trimClip, splitClip, moveDelta } from "./editor/clip-edit.ts";
import {
  reducer,
  selectionIds,
  updateScene,
  type EditorState,
} from "./editor/model.ts";
const cue = (extra: Partial<Cue> = {}): Cue => ({
  id: "a",
  name: "A",
  time: 1,
  gain: 1,
  muted: false,
  patch: { ...DEFAULT },
  ...extra,
});
describe("non-destructive timeline editing", () => {
  it("trims and seeks within the original source and round trips old/new projects", () => {
    const c = trimClip(trimClip(cue(), "out", 4, 5), "in", 2, 5);
    expect(c.time).toBe(2);
    expect(cueRange(c, 5)).toEqual({ start: 1, end: 3, duration: 2 });
    expect(cueWindow(c, 5, 2.5, 3.5)).toEqual({
      at: 2.5,
      offset: 1.5,
      duration: 1,
    });
    const extended = trimClip(c, "in", 0, 5);
    expect(extended.time).toBe(1);
    expect(extended.sourceIn).toBe(0);
    expect(cueRange(trimClip(c, "out", 9, 5), 5).end).toBe(5);
    const s = { ...emptyScene(), cues: [c] };
    expect(validateScene(JSON.parse(JSON.stringify(s)))).toEqual(s);
    const old = { ...emptyScene(), cues: [cue()] };
    expect(validateScene(old)).toEqual(old);
    for (const bad of [
      { sourceIn: NaN },
      { sourceOut: -1 },
      { sourceIn: 1, sourceOut: 1 },
      { fadeIn: Infinity },
      { fadeAnchor: [2, 1] },
      { fadeAnchor: [0, 1, 2] },
    ])
      expect(() =>
        validateScene({ ...old, cues: [{ ...cue(), ...bad }] }),
      ).toThrow();
  });
  it("preserves exact PCM through repeated splits inside fades, including fractional timeline times", () => {
    const pcm = Float32Array.from(
      { length: SAMPLE_RATE * 2 },
      (_, i) => Math.sin(i * 0.017) * 0.3,
    );
    const original = cue({
      time: 0.123456,
      sourceIn: 0.200013,
      sourceOut: 1.800017,
      fadeIn: 1.3,
      fadeOut: 1.2,
    });
    const scene = {
      ...emptyScene(),
      start: 0.05,
      end: 2.1,
      effects: 0.8,
      cues: [original],
    };
    const before = mixScene(scene, new Map([["a", pcm]]), SAMPLE_RATE).pcm;
    const pair = splitClip(original, 0.55, 2, "b")!;
    const next = splitClip(pair[1], 1.15, 2, "c")!;
    const pieces = [pair[0], ...next];
    const after = mixScene(
      { ...scene, cues: pieces },
      new Map(pieces.map((c) => [c.id, pcm])),
      SAMPLE_RATE,
    ).pcm;
    expect(after).toEqual(before);
    expect(splitClip(original, original.time + 0.005, 2, "x")).toBeUndefined();
    expect(splitClip(cue({ time: 3599.9 }), 3600.1, 2, "x")).toBeUndefined();
  });
  it("uses the same linear fade breakpoints when seeking and when ramps overlap", () => {
    const c = cue({ sourceIn: 0.2, sourceOut: 1.8, fadeIn: 1.4, fadeOut: 1.3 }),
      env = cueEnvelope(c, 2);
    const points = fadePoints(env, 0.37, 1.72);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!,
        b = points[i + 1]!;
      for (const t of [0.1, 0.5, 0.9])
        expect(a.value + (b.value - a.value) * t).toBeCloseTo(
          fadeAt(env, a.time + (b.time - a.time) * t),
          12,
        );
    }
    const pcm = Float32Array.from({ length: 20 }, () => 1),
      scene = { ...emptyScene(), start: 1.5, end: 2.2, effects: 1, cues: [c] };
    const mixed = mixScene(scene, new Map([["a", pcm]]), 10).pcm;
    for (let i = 0; i < mixed.length; i++)
      expect(mixed[i]).toBeCloseTo(fadeAt(env, 0.7 + i / 10), 6);
    expect(cueWindow({ ...c, muted: true }, 2, 0, 5)).toBeUndefined();
  });
  it("retains trim metadata if a sound becomes shorter and bounds group movement without changing spacing", () => {
    const c = cue({ sourceIn: 2, sourceOut: 3 });
    expect(cueRange(c, 1).duration).toBe(0);
    expect(c.sourceIn).toBe(2);
    expect(cueRange(c, 5).duration).toBe(1);
    const cues = [cue({ time: 0.5 }), cue({ id: "b", time: 3599 })];
    expect(moveDelta(cues, -2)).toBe(-0.5);
    expect(moveDelta(cues, 3)).toBe(1);
    expect(trimClip(cue({ time: 3599.9 }), "in", 3601, 5).time).toBe(3600);
  });
});
it("toggles/range-selects without changing source Tone and restores group edits in one Undo", () => {
  let s: EditorState = {
    scene: {
      ...emptyScene(),
      cues: ["a", "b", "c"].map((id, i) => cue({ id, time: i })),
    },
    source: { name: "Source", patch: { ...DEFAULT, cutoff: 9000 } },
    patch: DEFAULT,
    patchName: "Source",
    selected: "",
    workspace: "picture",
    tool: "select",
    past: [],
    future: [],
  };
  s = reducer(s, { type: "select", id: "a" });
  s = reducer(s, { type: "select", id: "c", mode: "range" });
  expect(selectionIds(s)).toEqual(["a", "b", "c"]);
  s = reducer(s, { type: "select", id: "b", mode: "toggle" });
  expect(selectionIds(s)).toEqual(["a", "c"]);
  const ids = selectionIds(s);
  s = reducer(s, {
    type: "edit",
    edit: (d) =>
      updateScene(d, (scene) => ({
        ...scene,
        cues: scene.cues.filter((c) => !ids.includes(c.id)),
      })),
  });
  expect(selectionIds(s)).toEqual([]);
  expect(s.patch.cutoff).toBe(9000);
  s = reducer(s, { type: "undo" });
  expect(selectionIds(s)).toEqual(["a", "c"]);
  expect(s.scene.cues).toHaveLength(3);
  s = reducer(s, { type: "select", id: "a", mode: "preserve" });
  expect(selectionIds(s)).toEqual(["a", "c"]);
  s = reducer(s, { type: "select", id: "a" });
  expect(selectionIds(s)).toEqual(["a"]);
  s = reducer(s, { type: "select", id: "" });
  expect(s.patch.cutoff).toBe(9000);
});
