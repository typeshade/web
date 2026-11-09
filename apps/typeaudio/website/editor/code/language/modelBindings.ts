import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";

/** UI binding labels enrich real language results without changing code or its scope. */
const descriptions = new WeakMap<
  Monaco.editor.ITextModel,
  Readonly<Record<string, string>>
>();
export function setModelBindings(
  model: Monaco.editor.ITextModel,
  bindings?: Readonly<Record<string, string>>,
) {
  descriptions.set(model, bindings ?? {});
}
export function modelBinding(model: Monaco.editor.ITextModel, name: string) {
  return descriptions.get(model)?.[name];
}
