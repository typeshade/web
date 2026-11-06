import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { queryModel } from "./modelDocuments.ts";
export function registerSignatureHelp(m: typeof Monaco) {
  return m.languages.registerSignatureHelpProvider("typeshade", {
    signatureHelpTriggerCharacters: ["(", ","],
    signatureHelpRetriggerCharacters: [")"],
    async provideSignatureHelp(model, position, token) {
      const help = await queryModel(model, "signature", token, position);
      return help
        ? {
            value: {
              ...help,
              signatures: help.signatures.map((s) => ({
                ...s,
                documentation: s.documentation
                  ? { value: s.documentation }
                  : undefined,
                parameters: s.parameters.map((p) => ({
                  ...p,
                  documentation: p.documentation
                    ? { value: p.documentation }
                    : undefined,
                })),
              })),
            },
            dispose() {},
          }
        : undefined;
    },
  });
}
