import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compileGraph } from "typeaudio/graph/compiler";
import { decodeProject } from "./project/decodeProject.ts";
import { encodeProject } from "./project/encodeProject.ts";
import { PROJECTS } from "./project/catalog.ts";
import { renderSound } from "./sound-dsp.ts";
import { validatePatch } from "./sound/validatePatch.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { validateScene } from "./video-model.ts";
import { sceneRenderKey } from "./scene/sceneRenderKey.ts";
import { renderSpatialScene } from "./scene/renderSpatialScene.ts";
import { stereoWav } from "./scene/stereoWav.ts";

function example(id: string) {
  return JSON.parse(
    readFileSync(
      new URL(`./public/projects/${id}.json`, import.meta.url),
      "utf8",
    ),
  );
}

describe("editable agent project contract", () => {
  it("opens, compiles and round-trips every source-only project without losing authored data", () => {
    const seen = new Set<string>();
    for (const item of PROJECTS)
      for (const variant of ["A", "B"]) {
        const raw = example(item.id + "-" + variant),
          { scene } = decodeProject(raw);
        expect(scene.cues).toHaveLength(item.layers);
        expect(scene.media.id).toBe("YHCqcyX9N3s");
        expect(scene.original).toBe(0);
        expect(scene.space?.room.decaySeconds).toBe(2.1);
        expect(decodeProject(encodeProject(scene)).scene).toEqual(scene);
        for (const cue of scene.cues) {
          expect(cue.audio).toBeUndefined();
          expect(
            cue.patch.graph?.nodes.filter((n) => n.kind === "code"),
          ).toHaveLength(2);
          expect(cue.space?.points.length).toBeGreaterThan(0);
          const code = JSON.stringify(cue.patch.graph);
          if (!seen.has(code)) {
            const program = compileGraph(cue.patch.graph!);
            expect(program.source).toContain('"use typeshade"');
            seen.add(code);
          }
        }
      }
    expect(seen.size).toBeGreaterThan(40);
  }, 60000);

  it("regenerates a different signal after a material parameter edit", () => {
    const { scene } = decodeProject(example("frieren-red-A"));
    const patch = scene.cues[0].patch;
    new Function(compileGraph(patch.graph!).code)();
    const before = renderSound(patch).wet;
    const edited = structuredClone(scene);
    edited.cues[0].patch.graph!.parameters[3].value = 0.8;
    const reopened = decodeProject(encodeProject(edited)).scene;
    const after = renderSound(reopened.cues[0].patch).wet;
    let difference = 0;
    for (let i = 0; i < before.length; i++)
      difference += Math.abs(before[i] - after[i]);
    expect(difference / before.length).toBeGreaterThan(0.005);
    expect(reopened.cues[0].patch.graph!.parameters[3].value).toBe(0.8);
    expect(after.every(Number.isFinite)).toBe(true);
  }, 30000);

  it("accepts short and long graph sources while retaining legacy voice limits", () => {
    const patch = decodeProject(example("frieren-force-A")).scene.cues[0].patch;
    expect(validatePatch({ ...patch, duration: 0.02 }).duration).toBe(0.02);
    expect(validatePatch({ ...patch, duration: 30 }).duration).toBe(30);
    expect(() => validatePatch({ ...patch, duration: 31 })).toThrow();
    expect(() => validatePatch({ ...DEFAULT, duration: 30 })).toThrow();
  });

  it("rejects unsupported projects and invalid positions instead of silently discarding fields", () => {
    expect(() =>
      decodeProject({ schema: "typeaudio.project", version: 2 }),
    ).toThrow(/supported/);
    const raw = example("frieren-red-A");
    raw.scene.cues[0].space.points[0].x = 900;
    expect(() => decodeProject(raw)).toThrow(/inside/);
    const valid = decodeProject(example("frieren-red-A")).scene;
    expect(decodeProject({ ...valid }).scene).toEqual(valid);
  });

  it("invalidates spatial previews for audible edits and keeps mixer faders independent", () => {
    const scene = decodeProject(example("frieren-red-A")).scene,
      key = sceneRenderKey(scene);
    expect(sceneRenderKey({ ...scene, effects: 0.4 })).toBe(key);
    for (const change of [
      (s: typeof scene) => {
        s.cues[0].gain *= 0.5;
      },
      (s: typeof scene) => {
        s.cues[0].time += 0.1;
      },
      (s: typeof scene) => {
        s.cues[0].space!.points[0].x += 0.1;
      },
      (s: typeof scene) => {
        s.space!.room = { ...s.space!.room, lateGain: 0.1 };
      },
      (s: typeof scene) => {
        s.cues[0].patch.graph!.parameters[3].value = 0.9;
      },
    ]) {
      const edited = structuredClone(scene);
      change(edited);
      expect(sceneRenderKey(edited)).not.toBe(key);
    }
  });

  it("renders directional stereo from editable positions and exports the same channels", () => {
    const source = decodeProject(example("frieren-red-A")).scene;
    const scene = validateScene({
      ...source,
      start: 0,
      end: 0.15,
      cues: [
        {
          ...source.cues[0],
          time: 0,
          space: {
            ...source.cues[0].space,
            points: [{ time: 0, x: -2, y: 0, z: -2 }],
          },
        },
      ],
      space: {
        ...source.space,
        gainDb: 0,
        highpassHz: 0,
        room: { ...source.space!.room, earlyGain: 0, lateGain: 0 },
      },
    });
    const samples = new Map([
      [
        scene.cues[0].id,
        Float32Array.from({ length: 7200 }, (_, i) => 0.1 * Math.sin(i * 0.04)),
      ],
    ]);
    const pcm = renderSpatialScene(scene, samples);
    const energy = (a: Float32Array) => a.reduce((sum, x) => sum + x * x, 0);
    expect(energy(pcm.left)).toBeGreaterThan(energy(pcm.right) * 2);
    const moved = structuredClone(scene);
    moved.cues[0].space!.points[0].x = 2;
    const other = renderSpatialScene(moved, samples);
    expect(energy(other.right)).toBeGreaterThan(energy(other.left) * 2);
    const wav = new DataView(stereoWav(pcm));
    expect(wav.getUint16(22, true)).toBe(2);
    expect(wav.getUint32(40, true)).toBe(7200 * 4);
    expect(wav.getInt16(44 + 700 * 4, true) / 32768).toBeCloseTo(
      pcm.left[700],
      4,
    );
  });
});
