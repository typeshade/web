export type NodeKind =
  | "parameter"
  | "oscillator"
  | "noise"
  | "code"
  | "gain"
  | "lowpass"
  | "envelope"
  | "mix"
  | "output";
export type Signal = "audio" | "control";
export interface GraphParameter {
  name: string;
  min: number;
  max: number;
  value: number;
}
export interface GraphNode {
  id: string;
  kind: NodeKind;
  name: string;
  x: number;
  y: number;
  values: number[];
  inputs: Record<string, string>;
  code: string;
  bypass: boolean;
}
export interface SoundGraph {
  version: 1;
  nodes: GraphNode[];
  parameters: GraphParameter[];
}
export interface NodeDefinition {
  label: string;
  output: Signal;
  inputs: Record<string, Signal>;
  controls: {
    name: string;
    min: number;
    max: number;
    value: number;
    step: number;
  }[];
  hint: string;
}
const control = (
  name: string,
  min: number,
  max: number,
  value: number,
  step = 0.01,
) => ({ name, min, max, value, step });
export const DEFINITIONS: Record<NodeKind, NodeDefinition> = {
  parameter: {
    label: "Parameter",
    output: "control",
    inputs: {},
    controls: [control("Parameter index", 0, 3, 0, 1)],
    hint: "Expose one of p0–p3 as a control signal. Edit its name and range in Parameters.",
  },
  oscillator: {
    label: "Oscillator",
    output: "audio",
    inputs: { frequency: "control" },
    controls: [
      control("Frequency (Hz)", 20, 16000, 220, 1),
      control("Shape: sine / saw / square / triangle", 0, 3, 0, 1),
    ],
    hint: "A continuous oscillator. A frequency connection overrides its frequency field. Sharp shapes are not band-limited.",
  },
  noise: {
    label: "Noise",
    output: "audio",
    inputs: {},
    controls: [control("Seed", 1, 65535, 2026, 1)],
    hint: "Repeatable white noise. Retrigger restores the seed.",
  },
  code: {
    label: "Code",
    output: "audio",
    inputs: { input: "audio" },
    controls: [],
    hint: "Write scalar TypeShade statements. Read input, time, sampleRate and p0–p3; write out. state0–state3 persist between samples. Loops, imports and helper functions are unavailable here.",
  },
  gain: {
    label: "Gain",
    output: "audio",
    inputs: { input: "audio", amount: "control" },
    controls: [control("Amount", 0, 2, 0.5)],
    hint: "Scale an audio signal. A control connection overrides Amount.",
  },
  lowpass: {
    label: "Lowpass",
    output: "audio",
    inputs: { input: "audio", cutoff: "control" },
    controls: [control("Cutoff (Hz)", 20, 16000, 2400, 1)],
    hint: "A stateful one-pole lowpass. Parameter edits preserve its previous sample.",
  },
  envelope: {
    label: "Envelope",
    output: "audio",
    inputs: { input: "audio" },
    controls: [
      control("Attack (s)", 0.001, 1, 0.005, 0.001),
      control("Decay (s)", 0.01, 4, 0.3, 0.01),
    ],
    hint: "A linear attack followed by exponential decay, restarted by Retrigger.",
  },
  mix: {
    label: "Mix",
    output: "audio",
    inputs: { a: "audio", b: "audio" },
    controls: [control("Balance", 0, 1, 0.5)],
    hint: "Blend two audio signals. An unconnected input is silent.",
  },
  output: {
    label: "Output",
    output: "audio",
    inputs: { input: "audio" },
    controls: [],
    hint: "The graph output. The sound's output level and duration apply after the graph.",
  },
};
export const IMPACT_CODE = `// p0: pitch, p1: decay, p2: strength, p3: texture
state0 = fract(state0 + p0 * (1 + 0.6 * exp(-time * 45)) / sampleRate);
const body: f32 = sin(state0 * 6.28318530718) * exp(-time / max(0.01, p1));
const contact: f32 = input * exp(-time * 90) * p3;
out = (body + contact) * p2 * min(1, time * 2400);`;
export function createNode(
  kind: NodeKind,
  id: string = crypto.randomUUID(),
  x = 80,
  y = 80,
): GraphNode {
  return {
    id,
    kind,
    name: DEFINITIONS[kind].label,
    x,
    y,
    values: DEFINITIONS[kind].controls.map((c) => c.value),
    inputs: {},
    code: kind === "code" ? "out = input;" : "",
    bypass: false,
  };
}
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
const number = (v: unknown, min: number, max: number) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    throw new Error(`Graph value must be between ${min} and ${max}.`);
  return v;
};
export function validateGraph(raw: unknown): SoundGraph {
  const g = raw as SoundGraph;
  if (
    !g ||
    g.version !== 1 ||
    !Array.isArray(g.nodes) ||
    !g.nodes.length ||
    g.nodes.length > 16 ||
    !Array.isArray(g.parameters) ||
    g.parameters.length !== 4
  )
    throw new Error("A graph needs 1–16 nodes and four exposed parameters.");
  const ids = new Set<string>();
  const nodes = g.nodes.map((n) => {
    if (
      !n ||
      typeof n.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(n.id) ||
      ids.has(n.id) ||
      !Object.hasOwn(DEFINITIONS, n.kind) ||
      typeof n.name !== "string" ||
      !n.name.trim() ||
      n.name.length > 40 ||
      typeof n.bypass !== "boolean" ||
      !n.inputs ||
      typeof n.inputs !== "object" ||
      Array.isArray(n.inputs) ||
      typeof n.code !== "string" ||
      n.code.length > 1800
    )
      throw new Error("Invalid graph node.");
    const def = DEFINITIONS[n.kind];
    ids.add(n.id);
    if (!Array.isArray(n.values) || n.values.length !== def.controls.length)
      throw new Error("Invalid node parameters.");
    const values = n.values.map((v, i) => {
      const c = def.controls[i]!;
      number(v, c.min, c.max);
      if (c.step === 1 && !Number.isInteger(v))
        throw new Error(`${c.name} must be a whole number.`);
      return v;
    });
    const inputs: Record<string, string> = {};
    for (const [port, id] of Object.entries(n.inputs)) {
      if (!Object.hasOwn(def.inputs, port) || typeof id !== "string")
        throw new Error("Invalid graph connection.");
      inputs[port] = id;
    }
    if (n.kind === "output" && n.bypass)
      throw new Error("The output cannot be bypassed.");
    return {
      id: n.id,
      kind: n.kind,
      name: n.name,
      x: number(n.x, -10000, 10000),
      y: number(n.y, -10000, 10000),
      inputs,
      values,
      code: n.kind === "code" ? n.code : "",
      bypass: n.bypass,
    };
  });
  if (
    nodes.filter((n) => n.kind === "output").length !== 1 ||
    nodes.filter((n) => n.kind === "code").length > 2
  )
    throw new Error(
      "A graph needs one Output and supports up to two Code nodes.",
    );
  for (const n of nodes)
    for (const [port, id] of Object.entries(n.inputs)) {
      const from = nodes.find((n) => n.id === id);
      if (
        !from ||
        from.kind === "output" ||
        DEFINITIONS[from.kind].output !== DEFINITIONS[n.kind].inputs[port]
      )
        throw new Error(
          "Connect audio to audio, and controls to control inputs.",
        );
    }
  const parameters = g.parameters.map((p) => {
    if (
      !p ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 32
    )
      throw new Error("Name each exposed parameter.");
    number(p.min, -16000, 16000);
    number(p.max, -16000, 16000);
    if (p.min >= p.max)
      throw new Error("Parameter maximum must exceed its minimum.");
    return {
      name: p.name,
      min: p.min,
      max: p.max,
      value: number(p.value, p.min, p.max),
    };
  });
  const result = { version: 1 as const, nodes, parameters };
  orderedNodes(result);
  return result;
}
/** Evaluate every node once; reject cycles before they can reach audio processing. */
export function orderedNodes(g: SoundGraph): GraphNode[] {
  const result: GraphNode[] = [],
    active = new Set<string>(),
    done = new Set<string>(),
    map = new Map(g.nodes.map((n) => [n.id, n]));
  function visit(n: GraphNode) {
    if (active.has(n.id))
      throw new Error(
        "This connection creates a cycle. Feedback requires a dedicated delay node.",
      );
    if (done.has(n.id)) return;
    active.add(n.id);
    // The compile key ignores object insertion order, so evaluation and parameter
    // layout must use the same canonical port order after JSON round trips.
    for (const [, id] of Object.entries(n.inputs).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const source = map.get(id);
      if (!source) throw new Error("Missing graph source.");
      visit(source);
    }
    active.delete(n.id);
    done.add(n.id);
    result.push(n);
  }
  for (const n of [...g.nodes].sort((a, b) => a.id.localeCompare(b.id)))
    visit(n);
  return result;
}
export function graphKey(g: SoundGraph): string {
  return JSON.stringify(
    [...g.nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) => [
        n.id,
        n.kind,
        n.code,
        Object.entries(n.inputs).sort(([a], [b]) => a.localeCompare(b)),
        n.bypass,
      ]),
  );
}
export function graphValues(g: SoundGraph): Float32Array {
  return new Float32Array([
    ...g.parameters.map((p) => p.value),
    ...orderedNodes(g).flatMap((n) => [n.values[0] ?? 0, n.values[1] ?? 0]),
  ]);
}
