import { describe, expect, it } from "vitest";
import { createDevice } from "typeshade/runtime";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { SAMPLE_RATE } from "./sound/constants.ts";
import { type Patch } from "./sound/types.ts";
import { DesignerVoice } from "./designer.shade.ts";
import { renderPatch, RENDER_BATCH } from "./designer-render.ts";

function reference(p: Patch): Float32Array {
  const voices = Array.from({ length: p.voices }, (_, i) => {
    const cents = p.voices === 1 ? 0 : (i / (p.voices - 1) - 0.5) * p.spread;
    const a = p.frequency * 2 ** (cents / 1200),
      b = a * 2 ** (p.transpose / 12 + p.detune / 1200);
    return new DesignerVoice(
      a,
      b,
      p.shapeA,
      p.shapeB,
      i * 0.11,
      p.blend,
      p.cutoff,
      p.resonance,
      p.filter ? 1 : 0,
      p.attack,
      p.decay,
      p.sustain,
      p.release,
      p.duration,
    );
  });
  const out = new Float32Array(
    Math.ceil((p.duration + p.release) * SAMPLE_RATE),
  );
  for (let n = 0; n < out.length; n++) {
    let sum = 0;
    for (const voice of voices) sum = Math.fround(sum + voice.tick());
    let value = Math.fround(sum * Math.fround(1 / p.voices));
    if (p.distortion)
      value = Math.fround(Math.tanh(Math.fround(value * Math.fround(p.drive))));
    out[n] = Math.fround(value * Math.fround(0.7));
  }
  return out;
}
describe("batched finite rendering", () => {
  it("holds oscillator/filter/envelope state and exact frame count across a short final batch", async () => {
    const dev = await createDevice({ prefer: ["cpu"] });
    try {
      for (const patch of [
        {
          ...DEFAULT,
          voices: 3,
          shapeA: 3,
          shapeB: 0,
          duration: 0.513,
          release: 0.027,
          resonance: 1.7,
        },
        {
          ...DEFAULT,
          voices: 1,
          shapeA: 2,
          shapeB: 1,
          duration: 0.5,
          release: 0.02,
          filter: false,
          distortion: false,
        },
      ]) {
        const expected = reference(patch),
          { samples, stats } = await renderPatch(dev, patch);
        expect(samples.length).toBe(expected.length);
        expect(stats.batches).toBe(Math.ceil(expected.length / RENDER_BATCH));
        expect(stats.pcmReadbacks).toBe(1);
        expect(
          samples.reduce(
            (m, v, i) => Math.max(m, Math.abs(v - expected[i]!)),
            0,
          ),
        ).toBeLessThan(0.00001);
      }
    } finally {
      await dev.dispose();
    }
  }, 20000);
  it("keeps returned PCM independent when the device reuses released output storage", async () => {
    const dev = await createDevice({ prefer: ["cpu"] });
    try {
      const patch = { ...DEFAULT, duration: 0.5, release: 0.02, voices: 1 };
      const first = await renderPatch(dev, patch),
        saved = first.samples.slice();
      const second = await renderPatch(dev, { ...patch, frequency: 880 });
      expect(dev.statistics.reuses).toBeGreaterThan(0);
      expect(first.samples).toEqual(saved);
      expect(second.samples).not.toEqual(saved);
    } finally {
      await dev.dispose();
    }
  });
});
