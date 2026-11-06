import {
  validateReproduction,
  type FeedbackVersions,
} from "typeaudio/feedback";
import type { SoundGraph } from "typeaudio/graph";

/** Capture the applied graph. This does not claim to record prior edits or playback timing. */
export function createGraphSnapshot(
  graph: SoundGraph,
  volume: number,
  duration: number,
  versions: FeedbackVersions,
  environment: { userAgent: string; platform: string },
) {
  return validateReproduction({
    format: "typeaudio.graph-reproduction",
    version: 1,
    capture: "snapshot",
    versions,
    environment,
    backend: "cpu",
    sampleRate: 48000,
    blockFrames: 128,
    frames: Math.max(1, Math.min(480000, Math.round(duration * 48000))),
    volume,
    graph,
    events: [],
  });
}
