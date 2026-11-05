import { BLANK, RECIPES } from "./sound-recipes.ts";
import { describe, expect, it } from "vitest";
import { DEFAULT, SAMPLE_RATE, validatePatch } from "./designer.ts";
import { curveAt, needsLiveRenderer, soundLength } from "./sound-design.ts";
import { waveFromExpression } from "./wave-expression.ts";
import { SoundDsp, renderSound } from "./sound-dsp.ts";
import { PcmRecorder, MAX_RECORD_SECONDS } from "./pcm-recorder.ts";

const energy = (pcm: Float32Array) =>
  pcm.reduce((sum, x) => sum + x * x, 0) / pcm.length;
describe("procedural sound documents", () => {
  it("restores older patches and keeps extension arrays owned and bounded", () => {
    const old = { ...DEFAULT } as Record<string, unknown>;
    for (const key of [
      "wave",
      "curves",
      "layers",
      "fmIndex",
      "fmRatio",
      "seed",
    ])
      delete old[key];
    const restored = validatePatch(old);
    expect(restored).toEqual(DEFAULT);
    restored.wave[0] = 1;
    expect(DEFAULT.wave[0]).toBe(0);
    for (const recipe of Object.values(RECIPES))
      expect(validatePatch(recipe.patch)).toEqual(recipe.patch);
    for (const extra of [
      { seed: 0 },
      { fmIndex: Infinity },
      { wave: [0] },
      { curves: { pitch: [{ time: 0, value: 0 }] } },
      {
        curves: {
          gain: [
            { time: 0, value: 1 },
            { time: 1, value: 2 },
          ],
        },
      },
      {
        curves: {
          pitch: [
            { time: 0, value: 0 },
            { time: 0, value: 2 },
            { time: 1, value: 0 },
          ],
        },
      },
    ])
      expect(() => validatePatch({ ...DEFAULT, ...extra })).toThrow();
    const layer = {
      id: "layer",
      name: "Layer",
      offset: 0,
      muted: false,
      patch: DEFAULT,
    };
    expect(() =>
      validatePatch({ ...DEFAULT, layers: [layer, layer] }),
    ).toThrow();
    expect(() =>
      validatePatch({ ...DEFAULT, layers: [{ ...layer, id: "base" }] }),
    ).toThrow();
    expect(() =>
      validatePatch({
        ...DEFAULT,
        layers: [{ ...layer, patch: { ...DEFAULT, layers: [layer] } }],
      }),
    ).toThrow();
  });
  it("evaluates a bounded wave expression and rejects code or non-finite samples", () => {
    const wave = waveFromExpression("sin(2*pi*phase) + .3*sin(6*pi*phase)");
    expect(wave).toHaveLength(64);
    expect(Math.max(...wave)).toBeCloseTo(1);
    expect(wave.reduce((sum, x) => sum + x, 0)).toBeCloseTo(0);
    for (const expression of [
      "window.alert(1)",
      "sin.constructor(1)",
      "(()=>1)()",
      "1/0",
      "sqrt(-1)",
      "1",
      "(".repeat(33) + "phase" + ")".repeat(33),
      "sin(phase);0",
    ])
      expect(() => waveFromExpression(expression)).toThrow();
  });
  it("interpolates automation and selects the renderer for audible extended features", () => {
    expect(
      curveAt(
        [
          { time: 0, value: 12 },
          { time: 1, value: -12 },
        ],
        0.25,
        0,
      ),
    ).toBe(6);
    expect(curveAt([], 1, 1)).toBe(1);
    expect(needsLiveRenderer(DEFAULT)).toBe(false);
    for (const patch of [
      { ...DEFAULT, lfoDepth: 0.5 },
      ...Object.values(RECIPES).map((r) => r.patch),
    ])
      expect(needsLiveRenderer(patch)).toBe(true);
  });
});

describe("shared live and finite synthesis", () => {
  it("renders seeded white noise reproducibly with low DC and different seeds", () => {
    const p = validatePatch({
      ...BLANK,
      shapeA: 4,
      attack: 0.002,
      decay: 0.01,
      sustain: 1,
      duration: 0.5,
      release: 0.02,
    });
    const first = renderSound(p).wet,
      second = renderSound(p).wet,
      other = renderSound({ ...p, seed: 2 }).wet;
    expect(first).toEqual(second);
    expect(first).not.toEqual(other);
    expect(
      Math.abs(first.reduce((a, b) => a + b, 0) / first.length),
    ).toBeLessThan(0.01);
    expect(energy(first)).toBeGreaterThan(0.005);
    expect(first.every(Number.isFinite)).toBe(true);
  });
  it("changes the actual signal with FM, custom waves, LFO and each automation target", () => {
    const plain = renderSound(BLANK).wet;
    const changes = [
      { fmIndex: 3, fmRatio: 2.7 },
      { shapeA: 5, wave: waveFromExpression("tanh(4*sin(2*pi*phase))") },
      { lfoDepth: 1, lfoTarget: 1, lfoRate: 8 },
      {
        curves: {
          pitch: [
            { time: 0, value: 24 },
            { time: 1, value: -24 },
          ],
          cutoff: [],
          gain: [],
        },
      },
      {
        filter: true,
        cutoff: 1800,
        shapeA: 1,
        curves: {
          pitch: [],
          cutoff: [
            { time: 0, value: 2 },
            { time: 1, value: -4 },
          ],
          gain: [],
        },
      },
      {
        curves: {
          pitch: [],
          cutoff: [],
          gain: [
            { time: 0, value: 1 },
            { time: 1, value: 0 },
          ],
        },
      },
    ];
    for (const change of changes) {
      const wet = renderSound(validatePatch({ ...BLANK, ...change })).wet;
      expect(wet.every(Number.isFinite)).toBe(true);
      expect(energy(wet)).toBeGreaterThan(0.00001);
      expect(wet).not.toEqual(plain);
    }
  });
  it("matches audio callback output exactly, including an unaligned layer start and effect tails", () => {
    const p = validatePatch({
      ...RECIPES.door.patch,
      layers: RECIPES.door.patch.layers.map((l, i) => ({
        ...l,
        offset: i ? 1.517 : 0.103,
        patch: { ...l.patch, lfoDepth: 0.7 },
      })),
    });
    const offline = renderSound(p),
      dsp = new SoundDsp(p),
      live = new Float32Array(offline.wet.length),
      block = new Float32Array(128);
    dsp.repeat = false;
    dsp.oneShot = true;
    for (let at = 0; at < live.length; at += 128) {
      const n = Math.min(128, live.length - at);
      dsp.process(block, n);
      live.set(block.subarray(0, n), at);
    }
    expect(live).toEqual(offline.wet);
    expect(live.at(-1)).toBe(0);
    expect(energy(live)).toBeGreaterThan(0.0001);
  });
  it("places delayed layers on the sample clock and excludes muted layers", () => {
    expect(
      renderSound({ ...BLANK, baseMuted: true }).wet.every((x) => x === 0),
    ).toBe(true);
    expect(needsLiveRenderer({ ...BLANK, baseMuted: true })).toBe(true);
    const layer = {
      id: "tone",
      name: "Tone",
      offset: 0.251,
      muted: false,
      patch: { ...BLANK, duration: 0.5, release: 0.02 },
    };
    const p = validatePatch({ ...BLANK, volume: 0, layers: [layer] });
    const wet = renderSound(p).wet,
      start = Math.round(layer.offset * SAMPLE_RATE);
    expect(wet.subarray(0, start).every((x) => x === 0)).toBe(true);
    expect(energy(wet.subarray(start))).toBeGreaterThan(0.001);
    const muted = renderSound({
      ...p,
      layers: [{ ...layer, muted: true }],
    }).wet;
    expect(muted.every((x) => x === 0)).toBe(true);
    expect(wet.length).toBe(Math.ceil(soundLength(p) * SAMPLE_RATE));
  });
  it("plays one note with Repeat off and restarts its clock on retrigger", () => {
    const dsp = new SoundDsp({ ...BLANK, duration: 0.5, release: 0.02 });
    dsp.repeat = false;
    const note = new Float32Array(32000);
    dsp.process(note);
    expect(energy(note)).toBeGreaterThan(0.001);
    const tail = new Float32Array(128);
    dsp.process(tail);
    expect(tail.every((x) => x === 0)).toBe(true);
    dsp.retrigger();
    const restarted = new Float32Array(4096);
    dsp.process(restarted);
    expect(energy(restarted)).toBeGreaterThan(0.001);
  });
  it("bounds recording and retains the actual sequence of audio blocks", () => {
    const recorder = new PcmRecorder(),
      block = new Float32Array(128).fill(0.25);
    expect(recorder.append(block)).toBe(false);
    block.fill(-0.5);
    recorder.append(block);
    expect(recorder.samples[127]).toBe(0.25);
    expect(recorder.samples[128]).toBe(-0.5);
    while (recorder.frames < recorder.samples.length) recorder.append(block);
    expect(recorder.frames).toBe(MAX_RECORD_SECONDS * SAMPLE_RATE);
    expect(recorder.append(block)).toBe(true);
  });
});
