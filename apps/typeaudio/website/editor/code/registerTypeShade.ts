import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { FUNCTIONS, VARIABLES } from "./languageVocabulary.ts";

export function registerTypeShade(m: typeof Monaco) {
  m.languages.register({ id: "typeshade", extensions: [".shade"] });
  m.languages.setMonarchTokensProvider("typeshade", {
    keywords: ["const", "let", "if", "else", "true", "false"],
    types: ["f32", "u32", "i32", "bool"],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@types": "type",
              "@default": "identifier",
            },
          },
        ],
        [/\d*\.?\d+([eE][\-+]?\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/[+\-*/%=!<>|&?:]+/, "operator"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });
  m.languages.setLanguageConfiguration("typeshade", {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["{", "}"],
      ["(", ")"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "(", close: ")" },
    ],
  });
  m.languages.registerCompletionItemProvider("typeshade", {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: [
          ...Object.entries(VARIABLES).map(([label, documentation]) => ({
            label,
            documentation,
            insertText: label,
            kind: m.languages.CompletionItemKind.Variable,
            range,
          })),
          ...Object.entries(FUNCTIONS).map(([label, fn]) => ({
            label,
            detail: `${label}(${fn.args.join(", ")})`,
            documentation: fn.help,
            insertText: `${label}(${fn.args.map((arg, i) => `\${${i + 1}:${arg}}`).join(", ")})`,
            insertTextRules:
              m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            kind: m.languages.CompletionItemKind.Function,
            range,
          })),
        ],
      };
    },
  });
  m.languages.registerHoverProvider("typeshade", {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position)?.word;
      const help = word && (VARIABLES[word] ?? FUNCTIONS[word]?.help);
      return help
        ? { contents: [{ value: `**${word}** — ${help}` }] }
        : undefined;
    },
  });
  m.editor.defineTheme("typeaudio", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#202124",
      "editorLineNumber.foreground": "#737882",
      "editor.lineHighlightBackground": "#292c32",
      "editor.selectionBackground": "#364e71",
      "editorWidget.background": "#292c32",
    },
  });
}
