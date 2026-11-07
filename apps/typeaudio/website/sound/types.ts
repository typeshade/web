import type { SoundGraph } from "typeaudio/graph";
import type { FunctionGraphDocument } from "typeaudio/function-graph";
import type { PreparedProgram, FunctionLayout } from "../functions/types.ts";
export interface CurvePoint {
  time: number;
  value: number;
}

export type CurveTarget = "pitch" | "cutoff" | "gain";

export interface SoundLayer {
  id: string;
  name: string;
  offset: number;
  muted: boolean;
  patch: Patch;
}

export interface Patch {
  graph: SoundGraph | null;
  functions?: FunctionGraphDocument | null;
  functionLayout?: FunctionLayout;
  baseMuted: boolean;
  fmRatio: number;
  fmIndex: number;
  seed: number;
  wave: number[];
  curves: Record<CurveTarget, CurvePoint[]>;
  layers: SoundLayer[];
  shapeA: number;
  shapeB: number;
  blend: number;
  frequency: number;
  transpose: number;
  detune: number;
  voices: number;
  spread: number;
  cutoff: number;
  resonance: number;
  filter: boolean;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  duration: number;
  drive: number;
  distortion: boolean;
  delay: boolean;
  delayTime: number;
  feedback: number;
  delayMix: number;
  reverb: boolean;
  room: number;
  reverbMix: number;
  volume: number;
  lfoRate: number;
  lfoDepth: number;
  lfoTarget: number;
  lfoShape: number;
  lfoSync: boolean;
  tempo: number;
}

export interface RenderRequest {
  id?: number;
  patch: Patch;
  backend: "cpu" | "webgpu";
  programs?: PreparedProgram[];
}
