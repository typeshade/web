import type { TypeshadeRange } from "typeshade/language-service";
export function monacoRange(range: TypeshadeRange) {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}
