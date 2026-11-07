import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { queryModel } from "./modelDocuments.ts";
import { modelBinding } from "./modelBindings.ts";
import { monacoRange } from "./monacoRange.ts";

export function registerCompletions(m: typeof Monaco) {
  const k = m.languages.CompletionItemKind;
  const kinds = {
    keyword: k.Keyword,
    type: k.Class,
    function: k.Function,
    attribute: k.Property,
    builtin: k.Function,
    variable: k.Variable,
    field: k.Field,
    struct: k.Struct,
    resource: k.Variable,
    snippet: k.Snippet,
  };
  return m.languages.registerCompletionItemProvider("typeshade", {
    triggerCharacters: ["."],
    async provideCompletionItems(model, position, _context, token) {
      const result = await queryModel(model, "completions", token, position);
      if (!result) return undefined;
      const word = model.getWordUntilPosition(position);
      return {
        suggestions: result.map((item) => ({
          label: item.label,
          kind: kinds[item.kind],
          detail: modelBinding(model, item.label)
            ? `${item.detail ?? "f32"} · ${modelBinding(model, item.label)}`
            : item.detail,
          documentation:
            modelBinding(model, item.label) ??
            (item.documentation ? { value: item.documentation } : undefined),
          insertText: item.textEdit?.newText ?? item.insertText ?? item.label,
          insertTextRules:
            item.insertTextFormat === "snippet"
              ? m.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
          sortText: item.sortText,
          filterText: item.filterText,
          range: item.textEdit
            ? monacoRange(item.textEdit.range)
            : {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
              },
        })),
      };
    },
  });
}
