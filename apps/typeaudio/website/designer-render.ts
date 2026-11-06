import type { Device, FuseReport } from "typeshade/runtime";
import { bank } from "../src/bank.ts";
import { DesignerVoice, designerSynth, designerMix } from "./designer.shade.ts";
import { SAMPLE_RATE } from "./sound/constants.ts";
import { type Patch } from "./sound/types.ts";

// Finite render batches are independent of Live's 128-frame callback quantum.
export const RENDER_BATCH = 16384;
export interface RenderStats {
  frames: number;
  batchFrames: number;
  batches: number;
  pcmReadbacks: number;
  dispatches: number;
  /** Plan submissions; the explicit final PCM download is counted separately. */
  submissions: number;
  planMs: number;
  /** Includes waiting for any queued GPU work, not just transfer time. */
  readbackMs: number;
}
export async function renderPatch(
  dev: Device,
  p: Patch,
): Promise<{
  samples: Float32Array;
  reports: FuseReport[];
  stats: RenderStats;
}> {
  const instances = Array.from({ length: p.voices }, (_, i) => {
    const cents = p.voices === 1 ? 0 : (i / (p.voices - 1) - 0.5) * p.spread;
    const a = p.frequency * 2 ** (cents / 1200);
    const b = a * 2 ** (p.transpose / 12 + p.detune / 1200);
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
  const voices = bank(dev, instances);
  const frames = Math.ceil((p.duration + p.release) * SAMPLE_RATE);
  const master = dev.array(frames, "f32");
  const reports: FuseReport[] = [];
  let planMs = 0;
  try {
    for (let at = 0; at < frames; at += RENDER_BATCH) {
      const n = Math.min(RENDER_BATCH, frames - at);
      const started = performance.now();
      const report = await dev.fuse((scope) => {
        const lanes = scope.scratch(p.voices * n);
        designerSynth(lanes, voices.instances, n);
        designerMix(
          master,
          lanes,
          p.voices,
          n,
          at,
          1 / p.voices,
          p.distortion ? 1 : 0,
          p.drive,
        );
      });
      planMs += performance.now() - started;
      reports.push(report);
    }
    const started = performance.now();
    // read() may expose the owner's host storage. Return an owned result before
    // release() makes that storage eligible for reuse by the next render.
    const samples = (await master.read()).slice();
    return {
      samples,
      reports,
      stats: {
        frames,
        batchFrames: RENDER_BATCH,
        batches: reports.length,
        pcmReadbacks: 1,
        dispatches: reports.reduce((n, r) => n + r.dispatches, 0),
        submissions: reports.reduce((n, r) => n + r.submissions, 0),
        planMs,
        readbackMs: performance.now() - started,
      },
    };
  } finally {
    dev.release(master);
    dev.release(voices.instances);
  }
}
