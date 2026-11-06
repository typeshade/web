import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import type { LanguageDocument, LanguageMethod } from "./types.ts";
import { languageClient } from "./LanguageClient.ts";

const modes = new WeakMap<Monaco.editor.ITextModel, LanguageDocument["mode"]>();
export function setDocumentMode(
  model: Monaco.editor.ITextModel,
  mode: LanguageDocument["mode"],
) {
  modes.set(model, mode);
}
export function snapshot(model: Monaco.editor.ITextModel): LanguageDocument {
  return {
    uri: model.uri.toString(),
    text: model.getValue(),
    version: model.getVersionId(),
    mode: modes.get(model) ?? "sample",
  };
}
/** A cancelled query or a query for an older model version must not change the editor. */
export async function queryModel<K extends LanguageMethod>(
  model: Monaco.editor.ITextModel,
  method: K,
  token: Monaco.CancellationToken,
  position?: Monaco.Position,
  newName?: string,
) {
  if (model.isDisposed() || token.isCancellationRequested) return undefined;
  const document = snapshot(model),
    abort = new AbortController();
  const cancellation = token.onCancellationRequested(() => abort.abort());
  try {
    const result = await languageClient.request(method, document, {
      position: position && {
        line: position.lineNumber - 1,
        character: position.column - 1,
      },
      newName,
      signal: abort.signal,
    });
    return !model.isDisposed() &&
      model.getVersionId() === document.version &&
      !token.isCancellationRequested
      ? result
      : undefined;
  } catch {
    return undefined;
  } finally {
    cancellation.dispose();
  }
}
