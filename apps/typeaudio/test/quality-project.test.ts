import { describe, expect, it } from "vitest";
import source from "../website/functions/function-sound.json";
import { qualityProject } from "../scripts/projects/qualityProject.ts";
import { decodeProject } from "../website/project/decodeProject.ts";
import { encodeProject } from "../website/project/encodeProject.ts";

const candidate = {
  schema: "typeaudio.quality-candidate",
  version: 1,
  id: "test",
  sourceSha256: "a".repeat(64),
  duration: 3,
  picture: { youtubeId: "YHCqcyX9N3s", start: 145.887, end: 148.887 },
  sourceProfile: {
    sampleRate: 48000,
    volume: 1,
    onsetFadeFrames: 240,
    endFadeFrames: 1440,
  },
  space: {
    room: { min: { x: -5, y: -3, z: -5 }, max: { x: 5, y: 5, z: 5 } },
    listener: { position: { x: 0, y: 0, z: 0 } },
    position: { x: 1, y: 0.4, z: -3 },
    spread: 0.2,
    send: 0.18,
  },
};

describe("quality candidate project import", () => {
  it("keeps duration, gain, source, YouTube range and room after editing and saving", () => {
    const project = qualityProject(candidate, source),
      opened = decodeProject(project);
    expect(project).toMatchObject({ schema: "typeaudio.project", version: 3 });
    expect(opened.scene).toMatchObject({
      start: 145.887,
      end: 148.887,
      media: { kind: "youtube", id: "YHCqcyX9N3s" },
    });
    const patch = opened.scene.cues[0]!.patch;
    expect(patch.duration).toBe(3);
    expect(patch.volume).toBe(0.7);
    expect(opened.scene.space!.gainDb).toBeCloseTo(20 * Math.log10(1 / 0.7));
    expect(patch.functions).toEqual(source);
    expect(opened.scene.cues[0]!.space?.send).toBe(0.18);
    const module = Object.keys(patch.functions!.modules)[0]!;
    patch.functions!.modules[module] += "\n// Saved source edit.\n";
    opened.editor!.source.patch = structuredClone(patch);
    const saved = decodeProject(encodeProject(opened.scene, [], opened.editor));
    expect(saved.scene.cues[0]!.patch.functions!.modules[module]).toContain(
      "Saved source edit.",
    );
    expect(saved.editor!.source.patch.functions).toEqual(
      saved.scene.cues[0]!.patch.functions,
    );
    expect(saved.scene.space).toEqual(opened.scene.space);
  });
  it("rejects mismatched duration and unsupported source rendering profiles", () => {
    expect(() =>
      qualityProject({ ...candidate, duration: 2 }, source),
    ).toThrow();
    expect(() =>
      qualityProject(
        {
          ...candidate,
          sourceProfile: { ...candidate.sourceProfile, volume: 0.65 },
        },
        source,
      ),
    ).toThrow();
  });
});
