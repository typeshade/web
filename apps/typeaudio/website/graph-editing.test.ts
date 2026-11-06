import { describe, expect, it } from "vitest";
import { initialGraph } from "./graph/recipes.ts";
import { createNode } from "./graph/createNode.ts";
import { validateGraph } from "./graph/validateGraph.ts";
import { duplicateNodes } from "./graph/duplicateNodes.ts";
import { removeNodes } from "./graph/removeNodes.ts";
import { connectNodes, connectionError } from "./graph/connectNodes.ts";
import { insertNode, insertionError } from "./graph/insertNode.ts";
import { graphKey } from "./graph/graphIdentity.ts";
import { arrangeGraph } from "./editor/shared/graphLayout.ts";
import { graphPlacement } from "./editor/shared/graphPlacement.ts";
import { moveNodes, nodeHeight, WIDTH } from "./editor/shared/graphGeometry.ts";

describe("graph editing operations", () => {
  it("places new nodes without obscuring existing cards, including near coordinate limits", () => {
    const nodes = [
      createNode("noise", "a", 100, 100),
      createNode("mix", "b", 10000, 10000),
    ];
    for (const origin of [
      { x: 100, y: 100 },
      { x: 10000, y: 10000 },
    ]) {
      const position = graphPlacement(nodes, "lowpass", origin);
      expect(Math.abs(position.x)).toBeLessThanOrEqual(10000);
      expect(Math.abs(position.y)).toBeLessThanOrEqual(10000);
      for (const node of nodes)
        expect(
          position.x + WIDTH <= node.x ||
            position.x >= node.x + WIDTH ||
            position.y + nodeHeight({ kind: "lowpass" }) <= node.y ||
            position.y >= node.y + nodeHeight(node),
        ).toBe(true);
    }
    expect(graphPlacement(nodes, "noise", { x: -200, y: 0 })).toEqual({
      x: -200,
      y: 0,
    });
  });
  it("duplicates a group with internal wires remapped and external inputs retained", () => {
    const graph = initialGraph(),
      before = structuredClone(graph);
    const result = duplicateNodes(graph, ["noise", "impact", "output"]);
    expect(result.ids).toHaveLength(2);
    const noise = result.graph.nodes.find((n) => n.id === result.ids[0])!;
    const code = result.graph.nodes.find((n) => n.id === result.ids[1])!;
    expect(code.inputs.input).toBe(noise.id);
    expect(
      result.graph.nodes.find((n) => n.id === "filter")!.inputs.input,
    ).toBe("impact");
    expect(
      duplicateNodes(graph, ["impact"]).graph.nodes.at(-1)!.inputs.input,
    ).toBe("noise");
    expect(result.graph.nodes.filter((n) => n.kind === "output")).toHaveLength(
      1,
    );
    expect(graph).toEqual(before);
    expect(() => duplicateNodes(result.graph, ["impact"])).toThrow(/two Code/);
  });
  it("deletes a group atomically while protecting Output and removing dangling inputs", () => {
    const graph = initialGraph(),
      result = removeNodes(graph, ["impact", "noise", "output"]);
    expect(result.nodes.map((n) => n.id)).toEqual(["filter", "output"]);
    expect(result.nodes[0]!.inputs).toEqual({});
    expect(validateGraph(result)).toEqual(result);
    expect(graph.nodes).toHaveLength(4);
  });
  it("rejects cycles and wrong signals before committing a connection", () => {
    const graph = initialGraph();
    expect(
      connectionError(graph, { from: "filter", to: "impact", port: "input" }),
    ).toMatch(/cycle/);
    expect(
      connectionError(graph, { from: "noise", to: "filter", port: "cutoff" }),
    ).toMatch(/audio/);
    expect(
      connectionError(graph, { from: "noise", to: "output", port: "input" }),
    ).toBeUndefined();
    const next = connectNodes(graph, "noise", "output", "input");
    expect(next.nodes.find((n) => n.id === "output")!.inputs.input).toBe(
      "noise",
    );
    expect(graph.nodes.find((n) => n.id === "output")!.inputs.input).toBe(
      "filter",
    );
  });
  it("inserts a compatible node into a wire and supports either loose end", () => {
    const graph = initialGraph(),
      wire = { from: "filter", to: { node: "output", port: "input" } };
    const result = insertNode(graph, "gain", { x: 400, y: 200 }, wire),
      gain = result.graph.nodes.at(-1)!;
    expect(gain.inputs.input).toBe("filter");
    expect(
      result.graph.nodes.find((n) => n.id === "output")!.inputs.input,
    ).toBe(gain.id);
    expect(insertionError(graph, "parameter", wire)).toMatch(/compatible/);
    expect(insertionError(graph, "oscillator", { from: "noise" })).toMatch(
      /compatible/,
    );
    expect(
      insertNode(
        graph,
        "parameter",
        { x: 0, y: 0 },
        { to: { node: "filter", port: "cutoff" } },
      ).graph.nodes.find((n) => n.id === "filter")!.inputs.cutoff,
    ).toBeTruthy();
    expect(
      insertNode(
        graph,
        "lowpass",
        { x: 0, y: 0 },
        { from: "noise" },
      ).graph.nodes.at(-1)!.inputs.input,
    ).toBe("noise");
  });
  it("arranges disconnected and connected nodes without changing the compiled program", () => {
    const graph = initialGraph();
    graph.nodes.push(createNode("noise", "loose", -100, -200));
    const arranged = arrangeGraph(graph);
    expect(graphKey(arranged)).toBe(graphKey(graph));
    for (const node of arranged.nodes)
      for (const source of Object.values(node.inputs))
        expect(node.x).toBeGreaterThan(
          arranged.nodes.find((n) => n.id === source)!.x + WIDTH,
        );
    for (const node of arranged.nodes)
      for (const other of arranged.nodes)
        if (node.id !== other.id && node.x === other.x)
          expect(Math.abs(node.y - other.y)).toBeGreaterThanOrEqual(
            Math.min(nodeHeight(node), nodeHeight(other)),
          );
    expect(arrangeGraph(arranged)).toEqual(arranged);
  });
  it("moves and snaps a group with one bounded delta, preserving internal spacing", () => {
    const nodes = [
      createNode("noise", "a", 9980, 13),
      createNode("noise", "b", 9990, 38),
      createNode("noise", "c", 0, 0),
    ];
    const moved = moveNodes(nodes, ["a", "b"], 100, -6);
    expect(moved.map((n) => n.x)).toEqual([9990, 10000, 0]);
    expect(moved[1]!.y - moved[0]!.y).toBe(25);
    const snapped = moveNodes(nodes, ["a", "b"], -37, 15, true);
    expect(snapped[0]!.x % 20).toBe(0);
    expect(snapped[0]!.y % 20).toBe(0);
    expect(snapped[1]!.x - snapped[0]!.x).toBe(10);
    expect(snapped[2]).toBe(nodes[2]);
  });
});
