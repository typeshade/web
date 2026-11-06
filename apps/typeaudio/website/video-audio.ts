import { SAMPLE_RATE } from "./sound/constants.ts";
import { type Patch } from "./sound/types.ts";
import {
  cueWindow,
  cueEnvelope,
  fadePoints,
  type Scene,
} from "./video-model.ts";
import { AudioLibrary } from "./editor/audio-library.ts";
import { patchPrograms } from "./graph/preparePatch.ts";
export class CueAudio {
  readonly assets = new AudioLibrary();
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
        let settled = false;
        const finish = (error?: string, pcm?: Float32Array) => {
          if (settled) return;
          settled = true;
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
        void patchPrograms(patch)
          .then((programs) => {
            if (this.worker === worker)
              worker.postMessage({ patch, backend: "cpu", programs });
          })
          .catch((error) => finish(String(error)));
      });
    });
    this.queue = next.catch(() => {});
    return next;
  }
  async prepare(scene: Scene): Promise<Map<string, Float32Array>> {
    const result = new Map<string, Float32Array>();
    for (const cue of scene.cues)
      result.set(
        cue.id,
        cue.audio
          ? await this.assets.read(cue.audio)
          : await this.render(cue.patch),
      );
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
    const now = ctx.currentTime,
      origin = Math.round(at * SAMPLE_RATE) / SAMPLE_RATE;
    for (const cue of scene.cues) {
      const pcm = samples.get(cue.id);
      if (!pcm) continue;
      const window = cueWindow(cue, pcm.length / SAMPLE_RATE, at, scene.end);
      if (!window) continue;
      const key = cue.audio
        ? `audio:${cue.audio.id}`
        : JSON.stringify(cue.patch);
      let buffer = this.buffers.get(key);
      if (!buffer) {
        buffer = ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
        buffer.copyToChannel(new Float32Array(pcm), 0);
        // Imported sources can leave the library while this transport stays alive.
        if (this.buffers.size >= 32)
          this.buffers.delete(this.buffers.keys().next().value!);
        this.buffers.set(key, buffer);
      }
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      const when = now + (window.at - origin) / rate;
      const points = fadePoints(
        cueEnvelope(cue, pcm.length / SAMPLE_RATE),
        window.offset,
        window.offset + window.duration,
      );
      // A source can start on the sample immediately before a fractional timestamp.
      // Initialize the gain too, so that sample cannot use GainNode's default 1.
      gain.gain.value = points[0]!.value * cue.gain;
      for (let i = 0; i < points.length; i++) {
        const point = points[i]!,
          time = when + (point.time - window.offset) / rate;
        if (i === 0) gain.gain.setValueAtTime(point.value * cue.gain, time);
        else gain.gain.linearRampToValueAtTime(point.value * cue.gain, time);
      }
      source.connect(gain).connect(this.bus);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start(when, window.offset, window.duration);
      this.nodes.push(source);
      this.scheduled++;
    }
  }
  close(): void {
    this.closed = true;
    this.assets.close();
    this.stop();
    this.abort?.();
    this.worker?.terminate();
    void this.context?.close();
  }
}
