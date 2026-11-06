import { describe, expect, it } from "vitest";
import { codeDocumentKey, resolveCodeDraft } from "./editor/code/codeDraft.ts";
import { codeDiagnostic } from "./editor/code/codeDiagnostic.ts";
import { FUNCTIONS } from "./editor/code/languageVocabulary.ts";
import { HELPERS } from "./graph/compiler/scalarFunctions.ts";
import { searchCommands } from "./editor/commands/searchCommands.ts";

describe("code document ownership", () => {
  it("keeps dirty drafts when Undo or an import changes applied code", () => {
    expect(
      resolveCodeDraft({ base: "out = 1;", text: "out = p0;" }, "out = 0;"),
    ).toEqual({ base: "out = 1;", text: "out = p0;", conflict: true });
    expect(
      resolveCodeDraft({ base: "out = 1;", text: "out = 1;" }, "out = 0;"),
    ).toEqual({ base: "out = 0;", text: "out = 0;", conflict: false });
  });
  it("recognizes an applied draft and isolates keys that contain delimiters", () => {
    expect(
      resolveCodeDraft({ base: "before", text: "after" }, "after"),
    ).toEqual({ base: "after", text: "after", conflict: false });
    expect(codeDocumentKey("source:base", "code")).not.toBe(
      codeDocumentKey("source", "base:code"),
    );
  });
});
describe("editor language help", () => {
  it("offers exactly the scalar functions accepted by the pinned worker validator", () => {
    expect(Object.keys(FUNCTIONS).sort()).toEqual([...HELPERS].sort());
  });
  it("marks only explicit locations for the matching node", () => {
    expect(
      codeDiagnostic(
        "Error: Contact, line 3: Loops are unavailable.",
        "Contact",
      ),
    ).toEqual({ line: 3, message: "Loops are unavailable." });
    expect(
      codeDiagnostic("Error: Contact, line 3: Loops are unavailable.", "Body"),
    ).toBeUndefined();
    expect(
      codeDiagnostic("The sound changed during compilation.", "Contact"),
    ).toBeUndefined();
  });
});
it("searches category and label together while keeping unavailable actions discoverable", () => {
  const commands = [
    {
      id: "1",
      label: "Code beside graph",
      group: "Layout",
      disabled: true,
      run() {},
    },
    { id: "2", label: "Code below graph", group: "Layout", run() {} },
    { id: "3", label: "Apply code", group: "Code", run() {} },
  ];
  expect(searchCommands(commands, "graph layout").map((c) => c.id)).toEqual([
    "2",
    "1",
  ]);
  expect(searchCommands(commands, "not available")).toEqual([]);
});
