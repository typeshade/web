import type { TypeshadePosition, TypeshadeRange } from "typeshade/language-service";
import type { LanguageDocument } from "./types.ts";
import { VARIABLES } from "../languageVocabulary.ts";

/** The language service reads a valid TypeShade function; Monaco edits only its sample body. */
export function projectNodeCode(document: LanguageDocument) {
  const prefix = document.mode === "module" ? "" : [
    '"use typeshade";',
    "export function __sample(",
    ...Object.entries(VARIABLES).filter(([name]) => name !== "out").map(([name, help]) => `/** ${help} */ ${name}: f32,`),
    "): f32 {",
    "/** Assign the output sample. */ let out: f32 = 0;",
    "",
  ].join("\n");
  const lines = prefix.split("\n").length - 1;
  const text = prefix + document.text + (prefix ? "\nreturn out;\n}" : "");
  const last = document.text.split("\n");
  const end = { line: last.length - 1, character: last[last.length - 1]!.length };
  const toSource = (p: TypeshadePosition) => ({ line: p.line + lines, character: p.character });
  const fromSource = (range: TypeshadeRange): TypeshadeRange | undefined => {
    if (range.start.line < lines || range.start.line >= lines + last.length) return undefined;
    return {
      start: { line: range.start.line - lines, character: range.start.character },
      end: range.end.line >= lines + last.length ? end : { line: range.end.line - lines, character: range.end.character },
    };
  };
  return { text, prefixLength: prefix.length, lines, toSource, fromSource, end };
}
