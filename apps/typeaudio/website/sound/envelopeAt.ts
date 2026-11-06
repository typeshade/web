import type { Patch } from "./types.ts";
export function envelopeAt(t: number, p: Patch): number {
  const held = (time: number): number =>
    time < p.attack
      ? time / p.attack
      : time < p.attack + p.decay
        ? 1 - ((1 - p.sustain) * (time - p.attack)) / p.decay
        : p.sustain;
  return t < 0
    ? 0
    : t < p.duration
      ? held(t)
      : held(p.duration) * Math.max(0, 1 - (t - p.duration) / p.release);
}
