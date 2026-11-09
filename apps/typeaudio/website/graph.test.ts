import { describe, expect, it } from "vitest";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { validatePatch } from "./sound/validatePatch.ts";
import { initialGraph } from "./graph/recipes.ts";
import { createNode } from "./graph/createNode.ts";
import { graphKey } from "typeaudio/graph";
import { graphValues } from "typeaudio/graph";
import { validateGraph } from "typeaudio/graph";
import { compileGraph } from "typeaudio/graph/compiler";
import { graphKernel } from "typeaudio/graph/runtime";
import { renderSound, SoundDsp } from "./sound-dsp.ts";
import { GraphDsp } from "typeaudio/graph/runtime";
import { morphPatch } from "./exploration.ts";
function install(g = initialGraph()) {
  const program = compileGraph(g);
  // Tests instantiate generated code directly; browsers load it as a blob module.
  new Function(program.code)();
  return program;
}

describe("procedural graph contracts", () => {
  it("validates typed connections, topology, bounds and portable patches", () => {
    const g = initialGraph("tone");
    expect(validateGraph(JSON.parse(JSON.stringify(g)))).toEqual(g);
    expect(validatePatch({ ...DEFAULT, graph: g }).graph).toEqual(g);
    const cycle = structuredClone(g);
    cycle.nodes.find((n) => n.id === "osc")!.inputs.frequency = "osc";
    expect(() => validateGraph(cycle)).toThrow(/audio|control/);
    const loop = initialGraph();
    loop.nodes.find((n) => n.id === "impact")!.inputs.input = "filter";
    expect(() => validateGraph(loop)).toThrow(/cycle/);
    expect(() =>
      validateGraph({
        ...g,
        nodes: g.nodes.filter((n) => n.kind !== "output"),
      }),
    ).toThrow(/Output/);
    expect(() =>
      validateGraph({
        ...g,
        parameters: g.parameters.map((p) => ({ ...p, value: Infinity })),
      }),
    ).toThrow();
    const large = initialGraph();
    while (large.nodes.length < 17) large.nodes.push(createNode("gain"));
    expect(() => validateGraph(large)).toThrow(/16/);
    const metadata = structuredClone(g);
    metadata.nodes[0]!.x += 40;
    metadata.nodes[0]!.name = "Moved";
    metadata.parameters[0]!.value = 700;
    expect(graphKey(metadata)).toBe(graphKey(g));
    expect(
      morphPatch({ ...DEFAULT, graph: g }, DEFAULT, 0.75).graph,
    ).toBeNull();
  });
  it("compiles actual TypeShade and keeps seeded state independent of block boundaries", () => {
    const g = initialGraph(),
      p = install(g),
      kernel = graphKernel(p.key);
    const params = graphValues(g);
    // Use the canonical parameter layout rather than assuming node evaluation order.
    const run = (block: number) => {
      const all = new Float32Array(4800),
        out = new Float32Array(block),
        state = new Float32Array(g.nodes.length * 4),
        clock = new Uint32Array(g.nodes.length + 1);
      for (let at = 0; at < all.length; at += block) {
        const n = Math.min(block, all.length - at);
        kernel(out, state, clock, params, n);
        all.set(out.subarray(0, n), at);
      }
      return all;
    };
    const whole = run(4800);
    expect(run(128)).toEqual(whole);
    expect(run(73)).toEqual(whole);
    expect(whole.every(Number.isFinite)).toBe(true);
    expect(whole.some((x) => Math.abs(x) > 0.01)).toBe(true);
  });
  it("rejects loops, host access, arrays and malformed Code before audio installation", () => {
    for (const code of [
      "while (true) {}",
      "for(let i=0;i<2;i++) out += 1;",
      "out = window.location;",
      "const data = [1,2]; out=data[0];",
      "function x(): f32 { return 1; } out=x();",
      "__state[0] = 0;",
      "out = unknownValue;",
    ]) {
      const g = initialGraph();
      g.nodes.find((n) => n.kind === "code")!.code = code;
      expect(() => compileGraph(g), code).toThrow();
    }
    const g = initialGraph();
    g.nodes.push({
      ...createNode("code", "second"),
      code: "out = tanh(input * p2);",
      inputs: { input: "impact" },
    });
    g.nodes.find((n) => n.id === "filter")!.inputs.input = "second";
    expect(() => install(g)).not.toThrow();
  });
  it("uses identical graph DSP in finite rendering and live-sized blocks", () => {
    const g = initialGraph();
    install(g);
    const patch = { ...DEFAULT, graph: g, duration: 0.5, volume: 0.6 };
    const expected = renderSound(patch).wet,
      dsp = new SoundDsp(patch),
      actual = new Float32Array(expected.length),
      block = new Float32Array(128);
    dsp.oneShot = true;
    dsp.repeat = false;
    for (let at = 0; at < actual.length; at += 128) {
      const count = Math.min(128, actual.length - at);
      dsp.process(block, count);
      actual.set(block.subarray(0, count), at);
    }
    expect(actual).toEqual(expected);
    expect(actual.some((x) => Math.abs(x) > 0.01)).toBe(true);
  });
  it("changes parameters without recompiling or resetting oscillator state", () => {
    const g = initialGraph("tone");
    install(g);
    const p = { ...DEFAULT, graph: g },
      a = new GraphDsp(p),
      b = new GraphDsp(p),
      out = new Float32Array(128),
      reference = new Float32Array(128);
    a.process(out);
    b.process(reference);
    expect(out).toEqual(reference);
    const updated = structuredClone(g);
    updated.parameters[0]!.value = 900;
    a.update({ ...p, graph: updated });
    a.process(out);
    b.process(reference);
    expect(out).not.toEqual(reference);
    expect(a.frames).toBe(256);
    const moved = structuredClone(g);
    moved.nodes[0]!.x += 100;
    b.update({ ...p, graph: moved });
    const control = new GraphDsp(p);
    control.process(new Float32Array(128));
    control.process(new Float32Array(128));
    control.process(out);
    b.process(reference);
    expect(out).toEqual(reference);
  });
  it("keeps non-finite code output and state away from the audio destination", () => {
    const g = initialGraph();
    g.nodes.find((n) => n.kind === "code")!.code =
      "state0 = sqrt(-p0); out = state0;";
    install(g);
    const dsp = new GraphDsp({ ...DEFAULT, graph: g }),
      out = new Float32Array(128);
    dsp.process(out);
    expect(out.every(Number.isFinite)).toBe(true);
    expect(dsp.invalidSamples).toBeGreaterThan(0);
  });
  it("keeps parameter slots canonical when JSON connection properties are reordered", () => {
    const g = initialGraph(),
      mix = createNode("mix", "a"),
      left = createNode("noise", "c"),
      right = createNode("noise", "d"),
      output = createNode("output", "o");
    left.values[0] = 11;
    right.values[0] = 125;
    mix.values[0] = 0.2;
    mix.inputs = { a: left.id, b: right.id };
    output.inputs.input = mix.id;
    g.nodes = [mix, left, right, output];
    install(g);
    const reordered = structuredClone(g);
    reordered.nodes[0]!.inputs = { b: right.id, a: left.id };
    expect(graphKey(reordered)).toBe(graphKey(g));
    expect(graphValues(reordered)).toEqual(graphValues(g));
    expect(renderSound({ ...DEFAULT, graph: reordered }).wet).toEqual(
      renderSound({ ...DEFAULT, graph: g }).wet,
    );
  });
  it("initializes a noise node added to a running graph and preserves existing oscillator phase", () => {
    const g = initialGraph("tone");
    install(g);
    const p = { ...DEFAULT, graph: g },
      running = new GraphDsp(p),
      reference = new GraphDsp(p),
      a = new Float32Array(128),
      b = new Float32Array(128);
    for (let i = 0; i < 10; i++) {
      running.process(a);
      reference.process(b);
    }
    const next = structuredClone(g);
    next.nodes.push(createNode("noise", "extra"));
    install(next);
    const changed = new GraphDsp({ ...p, graph: next }, running);
    for (let i = 0; i < 3; i++) {
      changed.process(a);
      reference.process(b);
    }
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
    next.nodes.find((n) => n.kind === "output")!.inputs.input = "extra";
    install(next);
    const noise = new GraphDsp({ ...p, graph: next }, running);
    noise.process(a);
    noise.process(a);
    expect(a.some((v) => v > 0.01)).toBe(true);
    expect(a.some((v) => v < -0.01)).toBe(true);
  });
});
