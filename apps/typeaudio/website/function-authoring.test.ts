import { audioPatch } from "./sound/audioPatch.ts";
import { newFunctionDefinition } from "./functions/newDefinition.ts";
import { describe, expect, it } from "vitest";
import { compileFunctionGraph } from "typeaudio/function-graph/compiler";
import { functionPatch } from "./functions/initialFunctions.ts";
import { functionSourceKey } from "./functions/sourceKey.ts";
import {
  registerFunctionPrograms,
  preparedCode,
} from "./functions/preparedPrograms.ts";
import { renderSound } from "./sound-dsp.ts";
import { FunctionPatchDsp } from "./functions/FunctionPatchDsp.ts";
import { decodeProject } from "./project/decodeProject.ts";
import { encodeProject } from "./project/encodeProject.ts";
import { emptyScene } from "./video-model.ts";
import {
  addFunctionInstance,
  removeFunctionInstance,
  setFunctionControl,
} from "./functions/instanceOperations.ts";
import { TypeShadeSession } from "./editor/code/language/TypeShadeSession.ts";
import type { LanguageResults } from "./editor/code/language/types.ts";
import { validatePatch } from "./sound/validatePatch.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";

function install(p = functionPatch()) {
  const program = compileFunctionGraph(p.functions);
  new Function(preparedCode(program))();
  registerFunctionPrograms([program]);
  return { p, program };
}
describe("editable TypeShade function sounds", () => {
  it("keeps node positions out of audio identity while retaining audible source and control edits", () => {
    const p = functionPatch(),
      moved = structuredClone(p);
    moved.functionLayout!.noise = { x: 800, y: 500 };
    expect(audioPatch(moved)).toEqual(audioPatch(p));
    moved.functions!.parameters[0]!.value = 500;
    expect(audioPatch(moved)).not.toEqual(audioPatch(p));
    const layered = {
      ...p,
      layers: [
        { id: "layer", name: "Layer", patch: p, offset: 0, muted: false },
      ],
    };
    expect(
      audioPatch({
        ...layered,
        layers: [
          { ...layered.layers[0]!, patch: { ...p, functionLayout: {} } },
        ],
      }),
    ).toEqual(audioPatch(layered));
    expect(p.functionLayout!.noise).not.toEqual({ x: 800, y: 500 });
  });
  it("creates a complete reusable module with explicit time, sample rate and per-instance state", () => {
    const next = newFunctionDefinition(functionPatch().functions!);
    const descriptor = compileFunctionGraph(next).artifacts.at(-1)!.descriptor;
    expect(descriptor.state!.fields[0]!.name).toBe("memory");
    expect(descriptor.context.map((c) => c.value)).toEqual([
      "time",
      "sampleRate",
    ]);
    expect(descriptor.inputs.map((p) => p.name)).toEqual(["input", "amount"]);
  });
  it("imports the engine source, retains drafts and positions, and reproduces edited audio after a project round trip", () => {
    const source = functionPatch();
    const imported = decodeProject(source.functions);
    const p = imported.editor!.source.patch;
    p.functions = setFunctionControl(p.functions!, "pitch", 350);
    p.functionLayout!.noise = { x: 320, y: 150 };
    const drafts = {
      [JSON.stringify([
        JSON.stringify(["source", "base"]),
        "module:/resonator.shade.ts",
      ])]: {
        base: p.functions.modules["/resonator.shade.ts"]!,
        text: '"use typeshade"; export function unfinished(',
      },
    };
    const project = encodeProject(emptyScene(), [], {
      ...imported.editor!,
      source: { name: "Edited impact", patch: p },
      drafts,
    });
    expect(project.version).toBe(3);
    const reopened = decodeProject(JSON.parse(JSON.stringify(project))).editor!;
    expect(reopened.drafts).toEqual(drafts);
    expect(reopened.source.patch.functionLayout).toEqual(p.functionLayout);
    install(p);
    const before = renderSound(p).wet;
    install(reopened.source.patch);
    expect(renderSound(reopened.source.patch).wet).toEqual(before);
    expect(before.some((v) => Math.abs(v) > 0.01)).toBe(true);
    expect(() => decodeProject({ ...project, version: 2 })).toThrow(
      /version 3/,
    );
  });
  it("updates controls without preparation or lost source state", () => {
    const { p } = install(),
      voice = new FunctionPatchDsp(p),
      out = new Float32Array(128);
    voice.process(out);
    const next = {
      ...p,
      functions: setFunctionControl(p.functions!, "pitch", 420),
    };
    expect(functionSourceKey(next.functions)).toBe(
      functionSourceKey(p.functions!),
    );
    voice.update(next);
    voice.process(out);
    expect(voice.dsp.frames).toBe(256);
    expect(out.some((v) => Math.abs(v) > 0.001)).toBe(true);
    voice.retrigger();
    expect(voice.dsp.frames).toBe(0);
  });
  it("composes duplicated instances and disconnects removed sources through the engine contract", () => {
    const { p, program } = install(),
      graph = p.functions!;
    const descriptor = program.artifacts.find(
      (a) => a.descriptor.id === "excitation",
    )!.descriptor;
    const next = addFunctionInstance(graph, descriptor, "noise");
    expect(next.graph.nodes.at(-1)!.inputs).toEqual(graph.nodes[0]!.inputs);
    const resonator = next.graph.nodes.find(
      (n) => n.definition === "resonator",
    )!;
    const input = program.artifacts
      .find((a) => a.descriptor.id === "resonator")!
      .descriptor.inputs.find((p) => p.role === "audio")!;
    resonator.inputs[input.id] = {
      kind: "connection",
      node: next.id,
      port: descriptor.output.id,
    };
    expect(compileFunctionGraph(next.graph).order).toContain(next.id);
    const removed = removeFunctionInstance(
      next.graph,
      program.artifacts.map((a) => a.descriptor),
      next.id,
    );
    expect(compileFunctionGraph(removed).order).not.toContain(next.id);
    expect(() =>
      removeFunctionInstance(
        graph,
        program.artifacts.map((a) => a.descriptor),
        graph.output.node,
      ),
    ).toThrow(/another output/);
  });
  it("reports imported source types and definitions using the complete module language service", () => {
    const s = new TypeShadeSession(),
      uri = "file:///sound/function/main.shade.ts",
      helper = "file:///sound/function/helper.shade.ts";
    const text =
      '"use typeshade";\nimport { shape } from "./helper.shade.ts";\nexport function process(value:f32):f32 { return shape(value); }';
    const document = {
      uri,
      text,
      version: 1,
      mode: "module" as const,
      files: {
        [helper]:
          '"use typeshade"; export function shape(value:f32):f32 { return value * 0.5; }',
      },
    };
    const diagnostics = s.query({
      id: 1,
      method: "diagnostics",
      document,
    }) as LanguageResults["diagnostics"];
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const definitions = s.query({
      id: 2,
      method: "definition",
      document,
      position: {
        line: 2,
        character: text.split("\n")[2]!.indexOf("shape") + 2,
      },
    }) as LanguageResults["definition"];
    expect(definitions.some((d) => d.uri === helper)).toBe(true);
    const bad = {
      ...document,
      files: {
        [helper]:
          '"use typeshade"; export function shape(value:bool):f32 { return 0; }',
      },
    };
    const errors = s.query({
      id: 3,
      method: "diagnostics",
      document: bad,
    }) as LanguageResults["diagnostics"];
    expect(errors.some((d) => d.severity === "error")).toBe(true);
  });
  it("preserves legacy sources and rejects ambiguous source documents", () => {
    expect(validatePatch(DEFAULT).functions).toBeNull();
    expect(() =>
      validatePatch({
        ...functionPatch(),
        graph: { version: 1, nodes: [], parameters: [] },
      }),
    ).toThrow();
    const p = functionPatch();
    expect(() =>
      validatePatch({
        ...p,
        functionLayout: { excitation: { x: Infinity, y: 0 } },
      }),
    ).toThrow();
    expect(
      encodeProject(emptyScene(), [], {
        source: { name: "Legacy", patch: DEFAULT },
        drafts: {},
        selected: "",
        selection: [],
      }).version,
    ).toBe(2);
  });
});
