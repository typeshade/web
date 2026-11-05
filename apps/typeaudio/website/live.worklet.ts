import { PcmRecorder } from "./pcm-recorder.ts";
import { SoundDsp } from "./sound-dsp.ts";
import { DEFAULT, SAMPLE_RATE, type Patch } from "./designer.ts";
interface ProcessorBase {
  readonly port: MessagePort;
}
const scope = globalThis as unknown as {
  AudioWorkletProcessor: new () => ProcessorBase;
  sampleRate: number;
  registerProcessor(
    name: string,
    constructor: new (options: {
      processorOptions?: { patch?: Patch; repeat?: boolean; dry?: boolean };
    }) => ProcessorBase,
  ): void;
};
class LiveProcessor extends scope.AudioWorkletProcessor {
  private dsp: SoundDsp;
  private running = true;
  private reported = 0;
  private recording: PcmRecorder | undefined;
  private finishRecording() {
    const recording = this.recording;
    this.recording = undefined;
    if (recording)
      this.port.postMessage(
        {
          type: "recorded",
          samples: recording.samples,
          frames: recording.frames,
        },
        [recording.samples.buffer],
      );
  }
  constructor(options: {
    processorOptions?: { patch?: Patch; repeat?: boolean; dry?: boolean };
  }) {
    super();
    if (scope.sampleRate !== SAMPLE_RATE)
      throw new Error("Live mode requires a 48 kHz audio context.");
    this.dsp = new SoundDsp(options.processorOptions?.patch || DEFAULT);
    this.dsp.repeat = options.processorOptions?.repeat ?? true;
    this.dsp.dry = options.processorOptions?.dry ?? false;
    this.port.onmessage = ({ data }) => {
      try {
        if (data.type === "patch")
          this.dsp.update(data.patch, data.repeat, data.dry);
        if (data.type === "retrigger") this.dsp.retrigger();
        if (data.type === "record-start") this.recording = new PcmRecorder();
        if (data.type === "record-stop") this.finishRecording();
        if (data.type === "stop") {
          this.finishRecording();
          this.running = false;
        }
      } catch (error) {
        this.port.postMessage({ type: "error", message: String(error) });
      }
    };
    this.port.postMessage({ type: "ready" });
  }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (!this.running) return false;
    const out = outputs[0]?.[0];
    if (!out) return true;
    try {
      this.dsp.process(out);
      if (this.recording?.append(out)) this.finishRecording();
      if (this.dsp.frames - this.reported >= 4800) {
        this.reported = this.dsp.frames;
        this.port.postMessage({
          type: "meter",
          frames: this.dsp.frames,
          revision: this.dsp.revision,
        });
      }
    } catch (error) {
      this.finishRecording();
      out.fill(0);
      this.port.postMessage({ type: "error", message: String(error) });
      this.running = false;
    }
    return this.running;
  }
}
scope.registerProcessor("typeaudio-live", LiveProcessor);
