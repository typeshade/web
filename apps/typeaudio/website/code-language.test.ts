import { describe, expect, it } from "vitest";
import { TypeShadeSession } from "./editor/code/language/TypeShadeSession.ts";
import type {
  LanguageMethod,
  LanguageResults,
} from "./editor/code/language/types.ts";
import { SCALAR_FUNCTIONS } from "typeaudio/graph";

describe("TypeShade editor language service", () => {
  function query<K extends LanguageMethod>(
    session: TypeShadeSession,
    method: K,
    text: string,
    offset = text.length,
    version = 1,
    mode: "sample" | "module" = "sample",
  ) {
    const before = text.slice(0, offset).split("\n");
    return session.query({
      id: 1,
      method,
      document: { uri: "file:///sound/contact.shade.ts", text, version, mode },
      position: {
        line: before.length - 1,
        character: before[before.length - 1]!.length,
      },
      newName: "pitch",
    }) as LanguageResults[K];
  }
  it("completes user locals from the actual TypeScript scope", () => {
    const session = new TypeShadeSession();
    const text = "const frequency: f32 = 440;\nout = sin(fre";
    expect(
      query(session, "completions", text).some(
        (item) => item.label === "frequency",
      ),
    ).toBe(true);
    expect(
      query(session, "completions", text).some(
        (item) => item.label === "window",
      ),
    ).toBe(false);
    expect(
      query(session, "completions", "out = si").some(
        (item) => item.label === "sin",
      ),
    ).toBe(true);
    const labels = new Set(
      query(session, "completions", "out = ").map((item) => item.label),
    );
    for (const name of SCALAR_FUNCTIONS)
      expect(labels.has(name), name).toBe(true);
  });
  it("reports type errors and unknown names on visible lines before Apply", () => {
    const session = new TypeShadeSession();
    const text = "const frequency: f32 = true;\nout = missingName;";
    const problems = query(session, "diagnostics", text);
    expect(
      problems.some(
        (d) => d.range.start.line === 0 && /f32|boolean/.test(d.message),
      ),
    ).toBe(true);
    expect(
      problems.some(
        (d) => d.range.start.line === 1 && d.message.includes("missingName"),
      ),
    ).toBe(true);
    expect(
      query(session, "diagnostics", "out = sin(time * p0);", 0, 2),
    ).toEqual([]);
  });
  it("provides actual types, call signatures and navigation for declared locals", () => {
    const session = new TypeShadeSession();
    const text = "const frequency: f32 = 440;\nout = sin(frequency);";
    const at = text.lastIndexOf("frequency") + 3;
    expect(query(session, "hover", text, at)?.contents).toContain("f32");
    expect(query(session, "definition", text, at)[0]?.range.start.line).toBe(0);
    expect(query(session, "references", text, at)).toHaveLength(2);
    const changes = query(session, "rename", text, at);
    expect(Object.values(changes)[0]).toHaveLength(2);
    expect(
      query(session, "signature", "out = sin(")?.signatures.some((signature) =>
        /f32|number/.test(signature.label),
      ),
    ).toBe(true);
    expect(query(session, "prepareRename", "out = p0;", 7)).toBeUndefined();
  });
  it("reads complete TypeShade modules without a sample wrapper", () => {
    const session = new TypeShadeSession();
    const text =
      '"use typeshade";\nexport function tone(frequency: f32): f32 {\nreturn sin(fre\n}';
    expect(
      query(
        session,
        "completions",
        text,
        text.indexOf("sin(fre") + 7,
        1,
        "module",
      ).some((item) => item.label === "frequency"),
    ).toBe(true);
  });
});
