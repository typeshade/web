import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { queryModel } from "./modelDocuments.ts";
import { monacoRange } from "./monacoRange.ts";
export function registerNavigation(m: typeof Monaco) {
  m.languages.registerDefinitionProvider("typeshade", {
    async provideDefinition(model, position, token) {
      return (await queryModel(model, "definition", token, position))?.map(
        (l) => ({ uri: m.Uri.parse(l.uri), range: monacoRange(l.range) }),
      );
    },
  });
  m.languages.registerReferenceProvider("typeshade", {
    async provideReferences(model, position, _context, token) {
      return (await queryModel(model, "references", token, position))?.map(
        (l) => ({ uri: m.Uri.parse(l.uri), range: monacoRange(l.range) }),
      );
    },
  });
  m.languages.registerRenameProvider("typeshade", {
    async resolveRenameLocation(model, position, token) {
      const result = await queryModel(model, "prepareRename", token, position);
      return result
        ? { range: monacoRange(result.range), text: result.placeholder }
        : {
            range: m.Range.fromPositions(position),
            text: "",
            rejectReason:
              "Rename a variable declared in this document. Engine inputs and state have fixed names.",
          };
    },
    async provideRenameEdits(model, position, newName, token) {
      if (!/^[a-zA-Z_$][\w$]*$/.test(newName) || newName.startsWith("__"))
        return {
          edits: [],
          rejectReason:
            "Use a valid local variable name without a leading double underscore.",
        };
      const changes = await queryModel(
        model,
        "rename",
        token,
        position,
        newName,
      );
      return {
        edits: Object.entries(changes ?? {}).flatMap(([uri, entries]) =>
          entries.map((edit) => ({
            resource: m.Uri.parse(uri),
            versionId: m.editor.getModel(m.Uri.parse(uri))?.getVersionId(),
            textEdit: { range: monacoRange(edit.range), text: edit.newText },
          })),
        ),
      };
    },
  });
}
