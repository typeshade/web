import { LiveAudio } from "../../live-audio.ts";
import { SAMPLE_RATE, type Patch } from "../../designer.ts";
import type { RenderStats } from "../../designer-render.ts";
import { patchPrograms } from "../../graph/client.ts";
export interface Rendered {
  dry: Float32Array;
  wet: Float32Array;
  tier: string;
  peak: number;
  milliseconds: number;
  report: string;
  timing: RenderStats & {
    deviceSetupMs: number;
    deviceReused: boolean;
    postprocessMs: number;
    workerMs: number;
    wallMs: number;
  };
}
/** Owns audio resources; UI components never construct worklets or workers. */
export class SoundEngine {
  context?: AudioContext;
  live?: LiveAudio;
  private source?: AudioBufferSourceNode;
  private worker?: Worker;
  private reject?: (error: Error) => void;
  private renderId = 0;
  private generation = 0;
  async unlock() {
    this.context ??= new AudioContext({
      sampleRate: SAMPLE_RATE,
      latencyHint: "interactive",
    });
    await this.context.resume();
    return this.context;
  }
  async start(
    patch: Patch,
    repeat: boolean,
    dry: boolean,
    meter: (frames: number, revision: number, invalidSamples: number) => void,
    error: (message: string) => void,
  ) {
    this.stop();
    const generation = this.generation,
      context = await this.unlock();
    if (generation !== this.generation) return;
    const live = new LiveAudio(error, meter);
    this.live = live;
    await live.start(context, patch, repeat, dry);
  }
  update(patch: Patch, repeat: boolean, dry: boolean) {
    this.live?.update(patch, repeat, dry);
  }
  render(patch: Patch, backend: "cpu" | "webgpu"): Promise<Rendered> {
    this.cancelRender();
    if (
      backend === "webgpu" &&
      !(navigator as Navigator & { gpu?: unknown }).gpu
    ) {
      return Promise.reject(
        new Error("WebGPU is unavailable. Select CPU to render this sound."),
      );
    }
    const requested = performance.now();
    return new Promise((resolve, reject) => {
      const worker =
        this.worker ??
        new Worker(new URL("../../render.worker.ts", import.meta.url), {
          type: "module",
        });
      this.worker = worker;
      const id = ++this.renderId;
      let settled = false;
      const timer = setTimeout(
        () =>
          finish(
            new Error("Render timed out. Reduce voices or note hold."),
            undefined,
            true,
          ),
        90000,
      );
      const finish = (error?: Error, result?: Rendered, discard = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.worker === worker) {
          this.reject = undefined;
          if (discard) {
            worker.terminate();
            this.worker = undefined;
          }
        }
        if (error) reject(error);
        else resolve(result!);
      };
      this.reject = (error) => finish(error, undefined, true);
      worker.onerror = (e) => {
        if (settled && this.worker === worker) {
          worker.terminate();
          this.worker = undefined;
        }
        finish(new Error(e.message || "Render failed."), undefined, true);
      };
      worker.onmessage = ({ data }) => {
        if (data.id !== id) return;
        if (data.error) {
          finish(new Error(data.error));
          return;
        }
        const wallMs = performance.now() - requested;
        finish(undefined, {
          ...data,
          milliseconds: wallMs,
          timing: { ...data.timing, workerMs: data.milliseconds, wallMs },
          report:
            data.report +
            `\nRequest to result: ${wallMs.toFixed(2)} ms, including worker startup and message transfer.`,
        });
      };
      void patchPrograms(patch)
        .then((programs) => {
          if (!settled) worker.postMessage({ id, patch, backend, programs });
        })
        .catch((error) => {
          finish(
            error instanceof Error ? error : new Error(String(error)),
            undefined,
            true,
          );
        });
    });
  }
  cancelRender() {
    this.reject?.(new Error("Render cancelled."));
    this.reject = undefined;
  }
  async play(pcm: Float32Array, loop: boolean, onEnded: () => void) {
    this.stop();
    const generation = this.generation,
      ctx = await this.unlock();
    if (generation !== this.generation) return;
    const buffer = ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
    buffer.copyToChannel(new Float32Array(pcm), 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(ctx.destination);
    this.source = source;
    source.onended = () => {
      source.disconnect();
      if (this.source === source) {
        this.source = undefined;
        onEnded();
      }
    };
    source.start();
  }
  stop() {
    this.generation++;
    this.live?.stop();
    this.live = undefined;
    const source = this.source;
    this.source = undefined;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
  }
  close() {
    this.stop();
    this.cancelRender();
    this.worker?.terminate();
    this.worker = undefined;
    void this.context?.close();
  }
}
