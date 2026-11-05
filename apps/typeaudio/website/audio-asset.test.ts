import { describe, it, expect } from "vitest";
import {
  makeAudioAsset,
  packAudio,
  unpackAudio,
  unpackAudioAssets,
  validateAudioRef,
  MAX_AUDIO_FRAMES,
  MAX_LIBRARY_FRAMES,
} from "./audio-asset.ts";
import { DEFAULT } from "./designer.ts";
import { emptyScene, validateScene } from "./video-model.ts";
import {
  reducer,
  projectDocument,
  updatePatch,
  type EditorState,
} from "./editor/model.ts";
const pcm = Float32Array.from(
  { length: 10000 },
  (_, i) => Math.sin(i * 0.03) * 0.8,
);
describe("portable source audio", () => {
  it("preserves float PCM exactly across chunk boundaries and deduplicates by content", async () => {
    const a = await makeAudioAsset("first.wav", pcm),
      b = await makeAudioAsset("renamed.wav", pcm.slice());
    expect(a.id).toBe(b.id);
    expect(a.name).not.toBe(b.name);
    const encoded = packAudio(a),
      decoded = await unpackAudio(JSON.parse(JSON.stringify(encoded)));
    expect(decoded.pcm).toEqual(pcm);
    expect(decoded.id).toBe(a.id);
    expect(encoded.data.length).toBe(Math.ceil((pcm.length * 4) / 3) * 4);
  });
  it("rejects damaged, mismatched, oversized and non-finite audio before storage", async () => {
    const a = await makeAudioAsset("source.wav", pcm),
      encoded = packAudio(a);
    for (const bad of [
      { ...encoded, id: "0".repeat(64) },
      { ...encoded, frames: 10001 },
      { ...encoded, sampleRate: 44100 },
      { ...encoded, encoding: "url" },
      { ...encoded, data: encoded.data.slice(4) },
    ])
      await expect(unpackAudio(bad)).rejects.toThrow();
    const invalid = new Float32Array(480);
    invalid[0] = NaN;
    await expect(makeAudioAsset("bad.wav", invalid)).rejects.toThrow();
    expect(() =>
      validateAudioRef({ ...a, frames: MAX_AUDIO_FRAMES + 1 }),
    ).toThrow();
    await expect(unpackAudioAssets([encoded, encoded], [a])).rejects.toThrow(
      /unique/,
    );
    await expect(unpackAudioAssets([encoded], [])).rejects.toThrow(/match/);
    const refs = Array.from({ length: 5 }, (_, i) => ({
      ...a,
      id: String(i).repeat(64),
      frames: MAX_AUDIO_FRAMES,
    }));
    expect(refs.reduce((n, a) => n + a.frames, 0)).toBeGreaterThan(
      MAX_LIBRARY_FRAMES,
    );
    await expect(unpackAudioAssets(refs, refs)).rejects.toThrow(/120 seconds/);
  });
  it("round trips clip references without copying PCM into the scene or undo history", async () => {
    const a = await makeAudioAsset("field.wav", pcm),
      audio = { id: a.id, name: a.name, frames: a.frames };
    const cue = {
      id: "clip",
      name: "Field recording",
      time: 1,
      gain: 0.7,
      muted: false,
      patch: { ...DEFAULT },
      audio,
      sourceIn: 0.02,
      sourceOut: 0.1,
      fadeIn: 0.01,
    };
    const scene = { ...emptyScene(), cues: [cue] };
    expect(validateScene(JSON.parse(JSON.stringify(scene)))).toEqual(scene);
    expect(JSON.stringify(scene)).not.toContain("pcm");
    expect(() =>
      validateScene({
        ...scene,
        cues: [
          cue,
          { ...cue, id: "other", audio: { ...audio, frames: 20000 } },
        ],
      }),
    ).toThrow(/disagree/);
    const initial: EditorState = {
      ...projectDocument({
        scene,
        source: { name: "Draft", patch: { ...DEFAULT, cutoff: 9000 } },
        selected: "clip",
        patch: DEFAULT,
        patchName: "Draft",
      }),
      past: [],
      future: [],
      workspace: "picture",
      tool: "select",
    };
    expect(initial.patchName).toBe("Draft");
    let s = reducer(initial, {
      type: "edit",
      edit: (d) => updatePatch(d, { cutoff: 500 }, "Updated draft"),
    });
    expect(s.scene.cues[0]!.audio).toEqual(audio);
    expect(s.scene.cues[0]!.patch).toEqual(DEFAULT);
    expect(s.source.patch.cutoff).toBe(500);
    s = reducer(s, { type: "undo" });
    expect(s.source.patch.cutoff).toBe(9000);
    expect(s.selected).toBe("clip");
    expect(s.scene.cues[0]!.audio).toEqual(audio);
  });
});
