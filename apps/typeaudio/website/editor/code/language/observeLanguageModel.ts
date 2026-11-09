import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import type { TypeshadeDiagnostic } from "typeshade/language-service";
import type { LanguageDocument } from "./types.ts";
import { languageClient } from "./LanguageClient.ts";
import { snapshot, setDocumentMode } from "./modelDocuments.ts";
import { monacoRange } from "./monacoRange.ts";

export interface LanguageAnalysis {
  status: "checking" | "ready" | "failed";
  problems: readonly TypeshadeDiagnostic[];
  failure?: string;
}

/** Debounces draft analysis. Audio and the applied document are never touched. */
export function observeLanguageModel(
  m: typeof Monaco,
  model: Monaco.editor.ITextModel,
  mode: LanguageDocument["mode"],
  changed: (analysis: LanguageAnalysis) => void,
) {
  setDocumentMode(model, mode);
  languageClient.retain(model.uri.toString());
  let timer: ReturnType<typeof setTimeout>,
    abort: AbortController | undefined,
    disposed = false;
  const severity = {
    error: m.MarkerSeverity.Error,
    warning: m.MarkerSeverity.Warning,
    information: m.MarkerSeverity.Info,
    hint: m.MarkerSeverity.Hint,
  };
  function refresh() {
    if (disposed || model.isDisposed()) return;
    clearTimeout(timer);
    abort?.abort();
    m.editor.setModelMarkers(model, "typeshade-language", []);
    changed({ status: "checking", problems: [] });
    timer = setTimeout(async () => {
      const document = snapshot(model),
        current = new AbortController();
      abort = current;
      try {
        const problems = await languageClient.request("diagnostics", document, {
          signal: current.signal,
        });
        if (
          disposed ||
          model.isDisposed() ||
          current.signal.aborted ||
          model.getVersionId() !== document.version
        )
          return;
        m.editor.setModelMarkers(
          model,
          "typeshade-language",
          problems.map((p) => ({
            ...monacoRange(p.range),
            severity: severity[p.severity],
            message: p.message,
            code: String(p.code),
            source: p.source,
          })),
        );
        changed({ status: "ready", problems });
      } catch (error) {
        if (
          disposed ||
          model.isDisposed() ||
          current.signal.aborted ||
          model.getVersionId() !== document.version
        )
          return;
        changed({
          status: "failed",
          problems: [],
          failure: error instanceof Error ? error.message : String(error),
        });
      }
    }, 180);
  }
  const listener = model.onDidChangeContent(refresh);
  refresh();
  return {
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      abort?.abort();
      listener.dispose();
      languageClient.release(model.uri.toString());
    },
  };
}
