import { describe, expect, it } from "vitest";
import { DEFAULT } from "./sound/defaultPatch.ts";
import {
  cueWindow,
  emptyScene,
  mixScene,
  validateScene,
  youtubeId,
  type Cue,
} from "./video-model.ts";
const cue = (extra: Partial<Cue> = {}): Cue => ({
  id: "cue-1",
  name: "Impact",
  time: 2,
  gain: 1,
  muted: false,
  patch: { ...DEFAULT },
  ...extra,
});
describe("video scene files", () => {
  it("round trips independent patches and excludes unknown data", () => {
    const scene = emptyScene();
    scene.cues = [cue()];
    const saved = validateScene({
      ...JSON.parse(JSON.stringify(scene)),
      url: "https://untrusted.test",
    });
    expect(saved).toEqual(scene);
    expect(saved.cues[0]!.patch).not.toBe(scene.cues[0]!.patch);
  });
  it("rejects invalid ranges, duplicate IDs, unsafe patch values and oversized scenes", () => {
    const base = emptyScene();
    for (const bad of [
      { end: 61 },
      { start: 10, end: 5 },
      { effects: NaN },
      { cues: [cue(), cue()] },
      { cues: [cue({ patch: { ...DEFAULT, feedback: 10 } })] },
      { cues: Array.from({ length: 25 }, (_, i) => cue({ id: String(i) })) },
      { media: { kind: "youtube", name: "x", id: "bad" } },
    ])
      expect(() => validateScene({ ...base, ...bad })).toThrow();
  });
  it("accepts supported YouTube URL forms and rejects unrelated or malformed URLs", () => {
    for (const url of [
      "https://youtu.be/M7lc1UVf-VE?t=2",
      "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      "https://m.youtube.com/shorts/M7lc1UVf-VE",
      "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
    ])
      expect(youtubeId(url)).toBe("M7lc1UVf-VE");
    for (const url of [
      "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
      "javascript:alert(1)",
      "https://youtube.com/playlist?list=anything",
      "https://youtu.be/short",
      "not a URL",
    ])
      expect(() => youtubeId(url)).toThrow();
  });
});
describe("preview and export timing", () => {
  it("starts in the middle of an existing tail and stops exactly at the scene end", () => {
    expect(cueWindow(cue(), 5, 3, 4)).toEqual({
      at: 3,
      offset: 1,
      duration: 1,
    });
    expect(cueWindow(cue(), 5, 0, 4)).toEqual({
      at: 2,
      offset: 0,
      duration: 2,
    });
    expect(cueWindow(cue({ muted: true }), 5, 0, 4)).toBeUndefined();
    expect(cueWindow(cue({ time: 4 }), 5, 0, 4)).toBeUndefined();
  });
  it("exports leading silence, overlapping tails, levels and a bounded range", () => {
    const scene = {
      ...emptyScene(),
      start: 1,
      end: 5,
      effects: 0.5,
      cues: [cue({ id: "tail", time: 0, gain: 0.5 }), cue()],
    };
    const samples = new Map([
      ["tail", new Float32Array([1, 1, 1, 1, 1, 1])],
      ["cue-1", new Float32Array([0.5, 0.5])],
    ]);
    expect(Array.from(mixScene(scene, samples, 2).pcm)).toEqual([
      0.25, 0.25, 0.5, 0.5, 0, 0, 0, 0,
    ]);
    expect(
      Array.from(
        mixScene({ ...scene, start: 0, cues: [cue()] }, samples, 2).pcm,
      ),
    ).toEqual([0, 0, 0, 0, 0.25, 0.25, 0, 0, 0, 0]);
  });
  it("excludes muted and out-of-range cues, clips sums, and reports the pre-clip peak", () => {
    const scene = {
      ...emptyScene(),
      end: 1,
      effects: 1,
      cues: [
        cue({ time: 0 }),
        cue({ id: "two", time: 0 }),
        cue({ id: "muted", time: 0, muted: true }),
        cue({ id: "late", time: 1 }),
      ],
    };
    const samples = new Map(
      scene.cues.map((c) => [c.id, new Float32Array([0.8, -0.8])]),
    );
    const result = mixScene(scene, samples, 2);
    expect(Array.from(result.pcm)).toEqual([1, -1]);
    expect(result.peak).toBeCloseTo(1.6);
  });
});
