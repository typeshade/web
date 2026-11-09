import { SAMPLE_RATE } from "../sound/constants.ts";
import { cueRange, type Cue } from "../video-model.ts";

export const MIN_CLIP = 0.01;
const frame = (time: number) => Math.round(time * SAMPLE_RATE) / SAMPLE_RATE;
export function moveDelta(cues: readonly Cue[], delta: number): number {
  if (!cues.length) return 0;
  return Math.max(
    -Math.min(...cues.map((c) => c.time)),
    Math.min(3600 - Math.max(...cues.map((c) => c.time)), frame(delta)),
  );
}
/** Trim edges without changing source data. Dragging the left edge keeps the right edge still. */
export function trimClip(
  cue: Cue,
  edge: "in" | "out",
  at: number,
  sourceDuration: number,
): Cue {
  const range = cueRange(cue, sourceDuration);
  if (range.duration < MIN_CLIP) return cue;
  if (edge === "in") {
    const delta = frame(
      Math.max(
        -Math.min(cue.time, range.start),
        Math.min(3600 - cue.time, range.duration - MIN_CLIP, at - cue.time),
      ),
    );
    return {
      ...cue,
      time: frame(cue.time + delta),
      sourceIn: frame(range.start + delta),
      fadeAnchor: undefined,
    };
  }
  const end = frame(
    Math.max(
      range.start + MIN_CLIP,
      Math.min(sourceDuration, range.start + at - cue.time),
    ),
  );
  return {
    ...cue,
    sourceOut: end >= frame(sourceDuration) ? null : end,
    fadeAnchor: undefined,
  };
}
/** Split on sample boundaries; both pieces keep the original fade coordinates. */
export function splitClip(
  cue: Cue,
  at: number,
  sourceDuration: number,
  id: string,
): [Cue, Cue] | undefined {
  const range = cueRange(cue, sourceDuration),
    cut = frame(range.start + at - cue.time);
  if (
    Math.round((cut - range.start) * SAMPLE_RATE) < MIN_CLIP * SAMPLE_RATE ||
    Math.round((range.end - cut) * SAMPLE_RATE) < MIN_CLIP * SAMPLE_RATE ||
    frame(cue.time + cut - range.start) > 3600
  )
    return;
  const anchor =
    cue.fadeAnchor ??
    (cue.fadeIn || cue.fadeOut
      ? ([range.start, range.end] as [number, number])
      : undefined);
  return [
    { ...cue, sourceIn: range.start, sourceOut: cut, fadeAnchor: anchor },
    {
      ...cue,
      id,
      time: frame(cue.time + cut - range.start),
      sourceIn: cut,
      fadeAnchor: anchor,
    },
  ];
}
