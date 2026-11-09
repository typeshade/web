import type { languages } from "monaco-editor/esm/vs/editor/editor.api.js";

/** Lexical coloring only. Types, completions and diagnostics come from TypeShade's service. */
export const syntax: languages.IMonarchLanguage = {
  keywords: [
    "const",
    "let",
    "if",
    "else",
    "true",
    "false",
    "export",
    "import",
    "from",
    "function",
    "return",
    "for",
    "while",
    "break",
    "continue",
    "type",
    "interface",
    "class",
    "readonly",
    "as",
    "new",
    "switch",
    "case",
    "default",
    "void",
  ],
  types: [
    "f32",
    "u32",
    "i32",
    "f64",
    "bool",
    "number",
    "boolean",
    "vec2",
    "vec3",
    "vec4",
    "array",
  ],
  tokenizer: {
    root: [
      [/\/\/.*$/, "comment"],
      [/\/\*/, "comment", "@comment"],
      [/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/, "string"],
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
      [/0[xX][\da-fA-F]+|\d*\.?\d+(?:[eE][\-+]?\d+)?/, "number"],
      [/[{}()[\]]/, "@brackets"],
      [/[+\-*/%=!<>|&?:]+/, "operator"],
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
  },
};

export const configuration: languages.LanguageConfiguration = {
  comments: { lineComment: "//", blockComment: ["/*", "*/"] },
  brackets: [
    ["{", "}"],
    ["(", ")"],
    ["[", "]"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "(", close: ")" },
    { open: "[", close: "]" },
  ],
  indentationRules: {
    increaseIndentPattern: /\{[^}]*$/,
    decreaseIndentPattern: /^\s*\}/,
  },
};
