import { SAMPLE_RATE, type Patch } from "./designer.ts";
import { cueWindow, type Scene } from "./video-model.ts";
export class CueAudio {
  context: AudioContext | undefined;
  private cache = new Map<string, Float32Array>();
  private buffers = new Map<string, AudioBuffer>();
  private nodes: AudioBufferSourceNode[] = [];
  private bus: GainNode | undefined;
  private limiter: WaveShaperNode | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private worker: Worker | undefined;
  private abort: (() => void) | undefined;
  private closed = false;
  scheduled = 0;
  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.limiter = this.context.createWaveShaper();
      this.limiter.curve = new Float32Array([-1, 1]);
      this.limiter.connect(this.context.destination);
    }
    await this.context.resume();
  }
  render(patch: Patch): Promise<Float32Array> {
    const key = JSON.stringify(patch),
      cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);
    const next = this.queue.then(() => {
      if (this.closed) throw new Error("Audio rendering was closed.");
      const cached = this.cache.get(key);
      if (cached) return cached;
      return new Promise<Float32Array>((resolve, reject) => {
        const worker = new Worker(
          new URL("./render.worker.ts", import.meta.url),
          { type: "module" },
        );
        this.worker = worker;
        const finish = (error?: string, pcm?: Float32Array) => {
          clearTimeout(timer);
          worker.terminate();
          this.worker = undefined;
          this.abort = undefined;
          if (error) reject(new Error(error));
          else {
            if (this.cache.size >= 32) {
              const oldest = this.cache.keys().next().value!;
              this.cache.delete(oldest);
              this.buffers.delete(oldest);
            }
            this.cache.set(key, pcm!);
            resolve(pcm!);
          }
        };
        const timer = setTimeout(
          () => finish("Cue render timed out. Reduce its voices or note hold."),
          90000,
        );
        this.abort = () => finish("Cue render cancelled.");
        worker.onerror = (e) => finish(e.message || "Cue render failed.");
        worker.onmessage = ({ data }) => {
          if (data.error) finish(data.error);
          else if (
            !(data.wet instanceof Float32Array) ||
            !data.wet.every(Number.isFinite)
          )
            finish("Invalid cue audio.");
          else finish(undefined, data.wet);
        };
        worker.postMessage({ patch, backend: "cpu" });
      });
    });
    this.queue = next.catch(() => {});
    return next;
  }
  async prepare(scene: Scene): Promise<Map<string, Float32Array>> {
    const result = new Map<string, Float32Array>();
    for (const cue of scene.cues)
      result.set(cue.id, await this.render(cue.patch));
    return result;
  }
  setLevel(level: number): void {
    if (this.bus && this.context)
      this.bus.gain.setTargetAtTime(level, this.context.currentTime, 0.01);
  }
  stop(): void {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {}
      node.disconnect();
    }
    this.nodes = [];
    this.bus?.disconnect();
    this.bus = undefined;
    this.scheduled = 0;
  }
  schedule(
    scene: Scene,
    samples: Map<string, Float32Array>,
    at: number,
    rate = 1,
  ): void {
    this.stop();
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    this.bus = ctx.createGain();
    this.bus.gain.value = scene.effects;
    this.bus.connect(this.limiter!);
    for (const cue of scene.cues) {
      const pcm = samples.get(cue.id);
      if (!pcm) continue;
      const window = cueWindow(cue, pcm.length / SAMPLE_RATE, at, scene.end);
      if (!window) continue;
      const key = JSON.stringify(cue.patch);
      let buffer = this.buffers.get(key);
      if (!buffer) {
        buffer = ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
        buffer.copyToChannel(new Float32Array(pcm), 0);
        this.buffers.set(key, buffer);
      }
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      gain.gain.value = cue.gain;
      source.connect(gain).connect(this.bus);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start(
        ctx.currentTime + (window.at - at) / rate,
        window.offset,
        window.duration,
      );
      this.nodes.push(source);
      this.scheduled++;
    }
  }
  close(): void {
    this.closed = true;
    this.stop();
    this.abort?.();
    this.worker?.terminate();
    void this.context?.close();
  }
}
