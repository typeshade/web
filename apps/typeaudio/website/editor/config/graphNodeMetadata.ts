import type { NodeKind } from "typeaudio/graph";
export const NODE_METADATA: Record<
  NodeKind,
  { category: string; summary: string }
> = {
  oscillator: {
    category: "Sources",
    summary: "Periodic tones · sine, saw, square, triangle",
  },
  noise: { category: "Sources", summary: "Repeatable white noise" },
  code: {
    category: "Processing",
    summary: "Write a scalar TypeShade signal processor",
  },
  gain: { category: "Processing", summary: "Scale an audio signal" },
  lowpass: { category: "Processing", summary: "Smooth high frequencies" },
  envelope: {
    category: "Processing",
    summary: "Shape a sound's attack and decay",
  },
  mix: { category: "Routing", summary: "Blend two audio signals" },
  parameter: { category: "Controls", summary: "Connect an exposed parameter" },
  output: { category: "Routing", summary: "Final mono output" },
};
