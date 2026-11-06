import type { SoundGraph, GraphNode } from "typeaudio/graph";
import { envelopeCode } from "./envelopeCode.ts";

export interface StudyLayer {
  id: string; family: string; role: string; start: number; duration: number;
  pitch: number; decay: number; character: number; seed: number; gainDb: number;
  gain: [number, number][]; position: [number, number, number, number][];
  spread: number; roomSend: number;
}
export function createStudyGraph(layer: StudyLayer, code: string): SoundGraph {
  const node = (id: string, name: string, kind: GraphNode["kind"], x: number,
    inputs: Record<string, string>, values: number[] = [], body = ""): GraphNode =>
    ({ id, name, kind, x, y: 90, inputs, values, code: body, bypass: false });
  return { version: 1, parameters: [
    { name: "Pitch", min: 20, max: 8000, value: layer.pitch },
    { name: "Decay", min: .001, max: 30, value: layer.decay },
    { name: "Envelope span", min: .02, max: 30, value: layer.duration },
    { name: "Character", min: 0, max: 1, value: layer.character },
  ], nodes: [
    node("excitation", "Seeded excitation", "noise", 30, {}, [layer.seed]),
    node("material", layer.family, "code", 270, { input: "excitation" }, [], code),
    node("amplitude", "Amplitude envelope", "code", 510, { input: "material" }, [], envelopeCode(layer.gain, layer.duration)),
    node("output", "Output", "output", 750, { input: "amplitude" }),
  ] };
}
