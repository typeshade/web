import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { queryModel } from "./modelDocuments.ts";
import { monacoRange } from "./monacoRange.ts";
export function registerHover(m: typeof Monaco) {
  return m.languages.registerHoverProvider("typeshade", {
    async provideHover(model, position, token) {
      const hover = await queryModel(model, "hover", token, position);
      return hover
        ? {
            range: monacoRange(hover.range),
            contents: [{ value: hover.contents }],
          }
        : undefined;
    },
  });
}
