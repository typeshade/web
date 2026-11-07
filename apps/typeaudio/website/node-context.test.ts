import { describe, expect, it } from "vitest";
import { compileGraph } from "typeaudio/graph/compiler";
import { nodeContext } from "./editor/code/nodeContext.ts";
import { initialGraph } from "./graph/recipes.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { renderSound } from "./sound-dsp.ts";

describe("node and code bindings", () => {
  it("follows actual connection IDs across renames and duplicate display names", () => {
    const graph = initialGraph(),
      node = graph.nodes.find((n) => n.kind === "code")!;
    graph.nodes[0]!.name = "Source A";
    graph.nodes[2]!.name = "Source A";
    graph.parameters[0]!.name = "Body pitch";
    const context = nodeContext(graph, node);
    expect(context.source?.id).toBe("noise");
    expect(context.targets.map((t) => [t.node.id, t.port])).toEqual([
      ["filter", "input"],
    ]);
    expect(context.bindings.input).toContain("Source A");
    expect(context.bindings.p0).toContain("Body pitch");
    graph.nodes[0]!.name = "Renamed excitation";
    expect(nodeContext(graph, node).bindings.input).toContain(
      "Renamed excitation",
    );
  });
  it("shows disconnected input, unused output and unassigned parameter defaults", () => {
    const graph = initialGraph(),
      node = graph.nodes.find((n) => n.kind === "code")!;
    delete node.inputs.input;
    delete graph.nodes.find((n) => n.id === "filter")!.inputs.input;
    graph.parameters = [];
    const context = nodeContext(graph, node);
    expect(context.source).toBeUndefined();
    expect(context.targets).toEqual([]);
    expect(context.bindings.input).toMatch(/silence \(0\)/);
    expect(context.bindings.out).toMatch(/no downstream/);
    expect(context.bindings.p3).toMatch(/supplies 0/);
  });
  it("keeps the named-local recipe's audio identical to the original sample body", () => {
    const graph = initialGraph(),
      before = structuredClone(graph);
    before.nodes.find((n) => n.kind === "code")!.code =
      `state0 = fract(state0 + p0 * (1 + 0.6 * exp(-time * 45)) / sampleRate);
const body: f32 = sin(state0 * 6.28318530718) * exp(-time / max(0.01, p1));
const contact: f32 = input * exp(-time * 90) * p3;
out = (body + contact) * p2 * min(1, time * 2400);`;
    new Function(compileGraph(before).code)();
    const original = renderSound({
      ...DEFAULT,
      duration: 0.1,
      graph: before,
    }).wet;
    new Function(compileGraph(graph).code)();
    const renamed = renderSound({ ...DEFAULT, duration: 0.1, graph }).wet;
    expect(renamed).toEqual(original);
    expect(renamed.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
  });
});
