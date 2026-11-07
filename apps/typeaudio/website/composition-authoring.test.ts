import { describe, expect, it } from "vitest";
import { FUNCTION_COMPOSITION_PATH } from "typeaudio/function-graph";
import {
  applyFunctionComposition,
  compileFunctionGraph,
  projectFunctionComposition,
} from "typeaudio/function-graph/compiler";
import { functionPatch } from "./functions/initialFunctions.ts";
import {
  registerFunctionPrograms,
  preparedCode,
} from "./functions/preparedPrograms.ts";
import { renderSound } from "./sound-dsp.ts";
import { audioPatch } from "./sound/audioPatch.ts";
import { validatePatch } from "./sound/validatePatch.ts";
import { patchFileVersion } from "./sound/patchFileVersion.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { decodeProject } from "./project/decodeProject.ts";
import { encodeProject } from "./project/encodeProject.ts";
import { emptyScene } from "./video-model.ts";
import { codeDocumentKey, resolveCodeDraft } from "./editor/code/codeDraft.ts";
import { TypeShadeSession } from "./editor/code/language/TypeShadeSession.ts";
import type { LanguageResults } from "./editor/code/language/types.ts";

function fixture() {
  const patch = functionPatch(),
    program = compileFunctionGraph(patch.functions);
  new Function(preparedCode(program))();
  registerFunctionPrograms([program]);
  return { patch, program, source: projectFunctionComposition(program).source };
}
const key = codeDocumentKey(
  JSON.stringify(["source", "base"]),
  `module:${FUNCTION_COMPOSITION_PATH}`,
);

describe("composition source authoring", () => {
  it("saves applied source and an invalid draft in version 4 and reproduces the applied PCM", () => {
    const { patch, source } = fixture();
    patch.functionComposition = source;
    const drafts = {
      [key]: { base: source, text: source + "\nexport function unfinished(" },
    };
    const project = encodeProject(emptyScene(), [], {
      source: { name: "Network", patch },
      drafts,
      selected: "",
      selection: [],
    });
    expect(project.version).toBe(4);
    const editor = decodeProject(JSON.parse(JSON.stringify(project))).editor!;
    expect(editor.drafts).toEqual(drafts);
    expect(editor.source.patch.functionComposition).toBe(source);
    expect(renderSound(editor.source.patch).wet).toEqual(
      renderSound(patch).wet,
    );
    expect(patchFileVersion(editor.source.patch)).toBe(3);
    expect(() => decodeProject({ ...project, version: 3 })).toThrow(
      /version 4/,
    );
  });
  it("versions a composition draft before its first apply without changing legacy function projects", () => {
    const { patch, source } = fixture();
    const editor = {
      source: { name: "Network", patch },
      drafts: {},
      selected: "",
      selection: [],
    };
    expect(encodeProject(emptyScene(), [], editor).version).toBe(3);
    expect(patchFileVersion(patch)).toBe(2);
    const project = encodeProject(emptyScene(), [], {
      ...editor,
      drafts: {
        [key]: { base: source, text: source + "\n// work in progress" },
      },
    });
    expect(project.version).toBe(4);
    expect(
      decodeProject(project).editor!.source.patch.functionComposition,
    ).toBeNull();
    expect(() => decodeProject({ ...project, version: 3 })).toThrow(
      /version 4/,
    );
  });
  it("keeps authoring source out of sound identity while applying audible connections through the engine", () => {
    const { patch, program, source } = fixture();
    expect(
      audioPatch({ ...patch, functionComposition: source + "\n// transient" }),
    ).toEqual(audioPatch(patch));
    const layered = {
      ...DEFAULT,
      layers: [{ id: "layer", name: "Body", patch, offset: 0, muted: false }],
    };
    expect(
      audioPatch({
        ...layered,
        layers: [
          {
            ...layered.layers[0]!,
            patch: { ...patch, functionComposition: source },
          },
        ],
      }),
    ).toEqual(audioPatch(layered));
    const next = applyFunctionComposition(
      program,
      source.replace("gain(body, strength, time)", "gain(noise, 0.1, time)"),
    );
    const changed = {
      ...patch,
      functions: next.program.document,
      functionComposition: next.composition.source,
    };
    expect(audioPatch(changed)).not.toEqual(audioPatch(patch));
    registerFunctionPrograms([next.program]);
    expect(renderSound(changed).wet).not.toEqual(renderSound(patch).wet);
  });
  it("keeps a conflicting draft across visual projection and rejects orphaned authoring source", () => {
    const { patch, program, source } = fixture();
    const draft = { base: source, text: source + "\n// unfinished detail" };
    const next = structuredClone(program);
    next.document.nodes[2]!.inputs.in = {
      kind: "connection",
      node: "noise",
      port: "out",
    };
    const applied = projectFunctionComposition(next, source).source;
    expect(resolveCodeDraft(draft, applied)).toEqual({
      ...draft,
      conflict: true,
    });
    expect(resolveCodeDraft({ base: source, text: source }, applied).text).toBe(
      applied,
    );
    expect(() =>
      validatePatch({ ...DEFAULT, functionComposition: source }),
    ).toThrow();
    expect(() =>
      validatePatch({ ...patch, functionComposition: " " }),
    ).toThrow();
  });
  it("uses real TypeShade diagnostics and imported definitions in the composition file", () => {
    const { program, source } = fixture(),
      service = new TypeShadeSession();
    const root = "file:///sound/network",
      uri = root + FUNCTION_COMPOSITION_PATH;
    const document = {
      uri,
      text: source,
      version: 1,
      mode: "module" as const,
      files: Object.fromEntries(
        Object.entries(program.document.modules).map(([path, value]) => [
          root + path,
          value,
        ]),
      ),
    };
    const diagnostics = service.query({
      id: 1,
      method: "diagnostics",
      document,
    }) as LanguageResults["diagnostics"];
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const lines = source.split("\n"),
      line = lines.findIndex((l) => l.includes("= resonator("));
    const definitions = service.query({
      id: 2,
      method: "definition",
      document,
      position: { line, character: lines[line]!.indexOf("resonator(") + 2 },
    }) as LanguageResults["definition"];
    expect(
      definitions.some((d) => d.uri === root + "/resonator.shade.ts"),
    ).toBe(true);
    const bad = {
      ...document,
      text: source.replace(
        "gain(body, strength, time)",
        "gain(body, missing, time)",
      ),
    };
    expect(
      (
        service.query({
          id: 3,
          method: "diagnostics",
          document: bad,
        }) as LanguageResults["diagnostics"]
      ).some((d) => d.severity === "error"),
    ).toBe(true);
  });
});
