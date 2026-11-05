import { LiveAudio } from "../../live-audio.ts";
import { SAMPLE_RATE, type Patch } from "../../designer.ts";
export interface Rendered {
  dry: Float32Array;
  wet: Float32Array;
  tier: string;
  peak: number;
  milliseconds: number;
  report: string;
}
/** Owns audio resources; UI components never construct worklets or workers. */
export class SoundEngine {
  context?: AudioContext;
  live?: LiveAudio;
  private source?: AudioBufferSourceNode;
  private worker?: Worker;
  private reject?: (error: Error) => void;
  private generation = 0;
  async unlock() {
    this.context ??= new AudioContext({ sampleRate: SAMPLE_RATE });
    await this.context.resume();
    return this.context;
  }
  async start(
    patch: Patch,
    repeat: boolean,
    dry: boolean,
    meter: (frames: number, revision: number) => void,
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
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("../../render.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker = worker;
      this.reject = reject;
      const timer = setTimeout(
        () =>
          finish(new Error("Render timed out. Reduce voices or note hold.")),
        90000,
      );
      const finish = (error?: Error, result?: Rendered) => {
        clearTimeout(timer);
        worker.terminate();
        if (this.worker === worker) {
          this.worker = undefined;
          this.reject = undefined;
        }
        if (error) reject(error);
        else resolve(result!);
      };
      this.reject = (error) => finish(error);
      worker.onerror = (e) => finish(new Error(e.message || "Render failed."));
      worker.onmessage = ({ data }) =>
        data.error ? finish(new Error(data.error)) : finish(undefined, data);
      worker.postMessage({ patch, backend });
    });
  }
  cancelRender() {
    this.reject?.(new Error("Render cancelled."));
    this.reject = undefined;
    this.worker?.terminate();
    this.worker = undefined;
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
    void this.context?.close();
  }
}
