import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compileGraph } from "typeaudio/graph/compiler";
import { decodeProject } from "./project/decodeProject.ts";
import { encodeProject } from "./project/encodeProject.ts";
import { EXAMPLES } from "./project/catalog.ts";
import { compileFunctionGraph } from "typeaudio/function-graph/compiler";
import {
  preparedCode,
  registerFunctionPrograms,
} from "./functions/preparedPrograms.ts";
import { initialGraph } from "./graph/recipes.ts";
import type { Patch } from "./sound/types.ts";
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

/** A cue's function sound, compiled and registered as the editor prepares it. */
function install(patch: Patch) {
  const program = compileFunctionGraph(patch.functions);
  new Function(preparedCode(program))();
  registerFunctionPrograms([program]);
}

/** The procedural (node network) starting point's sound, for the graph-source contract. */
const graphPatch = (): Patch => ({
  ...DEFAULT,
  graph: initialGraph(),
  duration: 2,
  volume: 0.65,
});

describe("editable agent project contract", () => {
  it("opens, compiles and round-trips every example without losing authored data", () => {
    for (const item of EXAMPLES) {
      const raw = example(item.id),
        { scene, editor } = decodeProject(raw);
      expect(scene.cues).toHaveLength(item.layers);
      expect(scene.media).toEqual({
        kind: "youtube",
        name: "Frieren sound-design reference",
        id: "YHCqcyX9N3s",
      });
      expect(scene.origin?.id).toBe(item.id);
      expect(raw.audioAssets).toBeUndefined();
      expect(decodeProject(encodeProject(scene, [], editor)).scene).toEqual(
        scene,
      );
      for (const cue of scene.cues) {
        expect(cue.audio).toBeUndefined();
        expect(cue.patch.graph).toBeNull();
        expect(cue.space?.points.length).toBeGreaterThan(0);
        const program = compileFunctionGraph(cue.patch.functions);
        expect(program.artifacts.length).toBeGreaterThan(0);
        expect(cue.patch.functions!.parameters.length).toBeGreaterThan(0);
      }
    }
  }, 60000);

  it("plays every cue of the wall hit and mixes them in the room without clipping", () => {
    const { scene } = decodeProject(example("unseen-force-wall-hit"));
    const samples = new Map<string, Float32Array>();
    for (const cue of scene.cues) {
      install(cue.patch);
      const { wet, invalidSamples } = renderSound(cue.patch);
      expect(invalidSamples).toBe(0);
      expect(wet.reduce((m, x) => Math.max(m, Math.abs(x)), 0)).toBeGreaterThan(
        0.001,
      );
      samples.set(cue.id, wet);
    }
    const mix = renderSpatialScene(scene, samples);
    expect(mix.peak).toBeGreaterThan(0.1);
    expect(mix.peak).toBeLessThanOrEqual(1);
    const at = Math.round((scene.cues[0].time - scene.start) * 48000);
    const before = mix.left.subarray(0, at - 480).reduce(
      (m, x) => Math.max(m, Math.abs(x)),
      0,
    );
    expect(before).toBe(0);
  }, 120000);

  it("regenerates a different signal after a named control edit", () => {
    const { scene } = decodeProject(example("unseen-force-wall-hit"));
    const patch = scene.cues[0].patch;
    install(patch);
    const before = renderSound(patch).wet;
    const edited = structuredClone(scene);
    const control = edited.cues[0].patch.functions!.parameters[0]!;
    control.value = Number(control.value) * 0.25;
    const reopened = decodeProject(
      encodeProject(edited, [], {
        source: { name: "Source", patch: edited.cues[0].patch },
        drafts: {},
        selected: "",
        selection: [],
      }),
    ).scene;
    const after = renderSound(reopened.cues[0].patch).wet;
    let difference = 0;
    for (let i = 0; i < before.length; i++)
      difference += Math.abs(before[i] - after[i]);
    expect(difference / before.length).toBeGreaterThan(1e-4);
    expect(reopened.cues[0].patch.functions!.parameters[0]!.value).toBe(
      control.value,
    );
    expect(after.every(Number.isFinite)).toBe(true);
  }, 30000);

  it("regenerates a different signal after a graph parameter edit", () => {
    const patch = graphPatch();
    new Function(compileGraph(patch.graph!).code)();
    const before = renderSound(patch).wet;
    const edited = structuredClone(patch);
    edited.graph!.parameters[0].value = 600;
    const after = renderSound(validatePatch(edited)).wet;
    let difference = 0;
    for (let i = 0; i < before.length; i++)
      difference += Math.abs(before[i] - after[i]);
    expect(difference / before.length).toBeGreaterThan(0.0005);
    expect(after.every(Number.isFinite)).toBe(true);
  }, 30000);

  it("accepts short and long graph sources while retaining legacy voice limits", () => {
    for (const patch of [
      graphPatch(),
      decodeProject(example("unseen-force-wall-hit")).scene.cues[0].patch,
    ]) {
      expect(validatePatch({ ...patch, duration: 0.02 }).duration).toBe(0.02);
      expect(validatePatch({ ...patch, duration: 30 }).duration).toBe(30);
      expect(() => validatePatch({ ...patch, duration: 31 })).toThrow();
    }
    expect(() => validatePatch({ ...DEFAULT, duration: 30 })).toThrow();
  });

  it("rejects unsupported projects and invalid positions instead of silently discarding fields", () => {
    expect(() =>
      decodeProject({ schema: "typeaudio.project", version: 999 }),
    ).toThrow(/supported/);
    const raw = example("unseen-force-wall-hit");
    raw.scene.cues[0].space.points[0].x = 900;
    expect(() => decodeProject(raw)).toThrow(/inside/);
    const valid = decodeProject(example("unseen-force-wall-hit")).scene;
    // A legacy scene file has no editor state, so it cannot carry function sounds.
    expect(() => decodeProject({ ...valid })).toThrow(/version 3/);
    const legacy = { ...valid, cues: [] };
    expect(decodeProject(legacy).scene).toEqual(legacy);
  });

  it("invalidates spatial previews for audible edits and keeps mixer faders independent", () => {
    const scene = decodeProject(example("unseen-force-wall-hit")).scene,
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
        s.cues[0].patch.functions!.parameters[0]!.value = 0.01;
      },
    ]) {
      const edited = structuredClone(scene);
      change(edited);
      expect(sceneRenderKey(edited)).not.toBe(key);
    }
  });

  it("renders directional stereo from editable positions and exports the same channels", () => {
    const source = decodeProject(example("unseen-force-wall-hit")).scene;
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
