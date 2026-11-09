import workletUrl from "./live.worklet.ts?worker&url";
import type { Patch } from "./sound/types.ts";
import { patchPrograms } from "./graph/preparePatch.ts";
import { loadGraphModule } from "./graph/loadGraphModule.ts";
import { patchSourceKey } from "./functions/patchSourceKey.ts";
import { preparedCode } from "./functions/preparedPrograms.ts";
const modules = new WeakMap<AudioContext, Promise<void>>();

export class LiveAudio {
  private node: AudioWorkletNode | undefined;
  private gain: GainNode | undefined;
  private analyser: AnalyserNode | undefined;
  private closed = false;
  private pending: { patch: Patch; repeat: boolean; dry: boolean } | undefined;
  private updateQueued = false;
  private context: AudioContext | undefined;
  private wave = new Float32Array(2048);
  private recording:
    | {
        resolve: (pcm: Float32Array) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    | undefined;
  private rejectRecording(message: string) {
    const pending = this.recording;
    this.recording = undefined;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
  }
  private bins = new Float32Array(1024);
  private installed = "";
  private updateId = 0;
  private patchKey(p: Patch) {
    return JSON.stringify(
      [p, ...p.layers.map((l) => l.patch)].map((p) => patchSourceKey(p)),
    );
  }
  private async install(p: Patch) {
    const programs = await patchPrograms(p);
    for (const program of programs)
      await loadGraphModule(preparedCode(program), (url) =>
        this.context!.audioWorklet.addModule(url),
      );
    return programs;
  }
  constructor(
    private onError: (message: string) => void,
    private onMeter: (
      frames: number,
      revision: number,
      invalidSamples: number,
    ) => void,
  ) {}
  async start(
    context: AudioContext,
    patch: Patch,
    repeat: boolean,
    dry: boolean,
  ): Promise<void> {
    this.context = context;
    if (!context.audioWorklet)
      throw new Error(
        "AudioWorklet is unavailable. Use Render mode in this browser.",
      );
    let loaded = modules.get(context);
    if (!loaded) {
      loaded = context.audioWorklet.addModule(workletUrl);
      modules.set(context, loaded);
      loaded.catch(() => modules.delete(context));
    }
    await loaded;
    const programs = await this.install(patch);
    this.installed = this.patchKey(patch);
    if (this.closed) throw new Error("Live start cancelled.");
    const node = new AudioWorkletNode(context, "typeaudio-live", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { patch, repeat, dry, programs },
    });
    this.node = node;
    node.onprocessorerror = () => {
      const message =
        "The live audio processor stopped. Restart Live or reduce the voice count.";
      this.rejectRecording(message);
      this.onError(message);
    };
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(new Error("The live audio processor did not become ready.")),
        8000,
      );
      node.port.onmessage = ({ data }) => {
        if (data.type === "ready") {
          clearTimeout(timer);
          resolve();
        }
        if (data.type === "error") {
          clearTimeout(timer);
          reject(new Error(data.message));
          this.rejectRecording(data.message);
          this.onError(data.message);
        }
        if (data.type === "recorded" && this.recording) {
          const pending = this.recording;
          this.recording = undefined;
          clearTimeout(pending.timer);
          pending.resolve(data.samples.slice(0, data.frames));
        }
        if (data.type === "meter")
          this.onMeter(data.frames, data.revision, data.invalidSamples || 0);
      };
    });
    if (this.closed) {
      node.port.postMessage({ type: "stop" });
      node.port.close();
      throw new Error("Live start cancelled.");
    }
    this.gain = context.createGain();
    this.gain.gain.setValueAtTime(0, context.currentTime);
    this.gain.gain.linearRampToValueAtTime(1, context.currentTime + 0.02);
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.65;
    node.connect(this.gain).connect(this.analyser).connect(context.destination);
    this.flushUpdate();
  }
  update(patch: Patch, repeat: boolean, dry: boolean): void {
    if (this.closed) return;
    this.pending = { patch, repeat, dry };
    // Coalesce one input burst without waiting for a display frame. Game/control
    // commands must also work when requestAnimationFrame is delayed or paused.
    if (this.node && !this.updateQueued) {
      this.updateQueued = true;
      queueMicrotask(() => {
        this.updateQueued = false;
        this.flushUpdate();
      });
    }
  }
  private flushUpdate(): void {
    if (this.closed || !this.node || !this.pending) return;
    const next = this.pending;
    this.pending = undefined;
    const id = ++this.updateId,
      key = this.patchKey(next.patch);
    if (key === this.installed)
      this.node.port.postMessage({ type: "patch", ...next });
    else
      void this.install(next.patch)
        .then((programs) => {
          if (this.closed || id !== this.updateId) return;
          this.installed = key;
          this.node?.port.postMessage({ type: "patch", ...next, programs });
        })
        .catch((error) => {
          if (!this.closed && id === this.updateId)
            this.onError(`Graph unchanged: ${String(error)}`);
        });
  }
  retrigger(): void {
    this.flushUpdate();
    this.node?.port.postMessage({ type: "retrigger" });
  }
  record(): Promise<Float32Array> {
    if (this.closed || !this.node)
      return Promise.reject(new Error("Start live audio before recording."));
    if (this.recording)
      return Promise.reject(new Error("Recording is already running."));
    this.flushUpdate();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.recording = undefined;
        this.node?.port.postMessage({ type: "record-stop" });
        reject(
          new Error("Recording did not complete. Restart Live and try again."),
        );
      }, 35000);
      this.recording = { resolve, reject, timer };
      this.node!.port.postMessage({ type: "record-start" });
    });
  }
  stopRecording(): void {
    this.node?.port.postMessage({ type: "record-stop" });
  }
  trace(): { wave: Float32Array; bins: Float32Array } | undefined {
    if (!this.analyser || this.closed) return;
    this.analyser.getFloatTimeDomainData(this.wave);
    this.analyser.getFloatFrequencyData(this.bins);
    return { wave: this.wave, bins: this.bins };
  }
  stop(): void {
    if (this.closed) return;
    this.stopRecording();
    this.closed = true;
    this.updateQueued = false;
    this.pending = undefined;
    const node = this.node,
      gain = this.gain,
      analyser = this.analyser,
      ctx = this.context;
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.004);
    }
    setTimeout(() => {
      node?.port.postMessage({ type: "stop" });
      node?.disconnect();
      gain?.disconnect();
      analyser?.disconnect();
      if (!this.recording) node?.port.close();
      else setTimeout(() => node?.port.close(), 1000);
    }, 25);
  }
}
