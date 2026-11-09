import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { syntax, configuration } from "./typeShadeSyntax.ts";
import { registerCompletions } from "./language/registerCompletions.ts";
import { registerHover } from "./language/registerHover.ts";
import { registerSignatureHelp } from "./language/registerSignatureHelp.ts";
import { registerNavigation } from "./language/registerNavigation.ts";

export function registerTypeShade(m: typeof Monaco) {
  m.languages.register({
    id: "typeshade",
    extensions: [".shade", ".shade.ts"],
  });
  m.languages.setMonarchTokensProvider("typeshade", syntax);
  m.languages.setLanguageConfiguration("typeshade", configuration);
  registerCompletions(m);
  registerHover(m);
  registerSignatureHelp(m);
  registerNavigation(m);
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
