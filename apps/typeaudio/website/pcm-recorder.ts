import { SAMPLE_RATE } from "./sound/constants.ts";
export const MAX_RECORD_SECONDS = 30;
/** Allocate on the record command; copying a render quantum never allocates. */
export class PcmRecorder {
  readonly samples = new Float32Array(SAMPLE_RATE * MAX_RECORD_SECONDS);
  frames = 0;
  append(block: Float32Array): boolean {
    const count = Math.min(block.length, this.samples.length - this.frames);
    for (let i = 0; i < count; i++) this.samples[this.frames + i] = block[i]!;
    this.frames += count;
    return this.frames === this.samples.length;
  }
}
