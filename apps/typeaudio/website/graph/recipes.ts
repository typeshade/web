import type { GraphNode } from "typeaudio/graph";
import type { SoundGraph } from "typeaudio/graph";
import { createNode } from "./createNode.ts";
export const IMPACT_CODE = `// p0: pitch, p1: decay, p2: strength, p3: texture
state0 = fract(state0 + p0 * (1 + 0.6 * exp(-time * 45)) / sampleRate);
const body: f32 = sin(state0 * 6.28318530718) * exp(-time / max(0.01, p1));
const contact: f32 = input * exp(-time * 90) * p3;
out = (body + contact) * p2 * min(1, time * 2400);`;

export function initialGraph(recipe: "impact" | "tone" = "impact"): SoundGraph {
  const output = createNode("output", "output", 700, 130);
  let nodes: GraphNode[];
  if (recipe === "impact") {
    const noise = createNode("noise", "noise", 50, 130),
      code = createNode("code", "impact", 270, 130),
      lowpass = createNode("lowpass", "filter", 490, 130);
    code.code = IMPACT_CODE;
    code.inputs.input = noise.id;
    lowpass.inputs.input = code.id;
    output.inputs.input = lowpass.id;
    nodes = [noise, code, lowpass, output];
  } else {
    const parameter = createNode("parameter", "pitch", 50, 60),
      osc = createNode("oscillator", "osc", 270, 90),
      env = createNode("envelope", "env", 490, 130);
    osc.inputs.frequency = parameter.id;
    env.inputs.input = osc.id;
    output.inputs.input = env.id;
    nodes = [parameter, osc, env, output];
  }
  return {
    version: 1,
    nodes,
    parameters: [
      { name: "Pitch", min: 40, max: 1600, value: 180 },
      { name: "Decay", min: 0.02, max: 2, value: 0.25 },
      { name: "Strength", min: 0, max: 1, value: 0.6 },
      { name: "Texture", min: 0, max: 1, value: 0.4 },
    ],
  };
}
