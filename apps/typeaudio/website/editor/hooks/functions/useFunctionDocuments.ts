import { FUNCTION_COMPOSITION_PATH } from "typeaudio/function-graph";
import { useEffect } from "react";
import type { FunctionEditor } from "./useFunctionEditor.ts";
import { codeDocumentKey, resolveCodeDraft } from "../../code/codeDraft.ts";

/** Full source files and incomplete buffers share the existing project draft ownership. */
export function useFunctionDocuments(c: FunctionEditor) {
  const drafts = c.e.state.drafts ?? {},
    graph = c.graph;
  const compositionSource =
    c.e.state.patch.functionComposition ?? c.program?.composition?.source;
  const appliedFiles: Record<string, string> = {
    ...(compositionSource
      ? { [FUNCTION_COMPOSITION_PATH]: compositionSource }
      : {}),
    ...graph?.modules,
  };
  const keyFor = (path: string) => codeDocumentKey(c.owner, `module:${path}`);
  const source = JSON.stringify(appliedFiles);
  useEffect(() => {
    c.e.dispatch({
      type: "reconcileDrafts",
      update: (current) => {
        let next = current;
        for (const [path, applied] of Object.entries(appliedFiles)) {
          const key = keyFor(path),
            before = current[key];
          if (!before) continue;
          const value = resolveCodeDraft(before, applied);
          if (value.base !== before.base || value.text !== before.text)
            next = { ...next, [key]: { base: value.base, text: value.text } };
        }
        return next;
      },
    });
  }, [c.owner, source]);
  const path = c.activeFile ?? "",
    applied = appliedFiles[path] ?? "";
  const buffer = resolveCodeDraft(drafts[keyFor(path)], applied);
  const files = Object.fromEntries(
    Object.entries(appliedFiles).map(([path, applied]) => [
      path,
      resolveCodeDraft(drafts[keyFor(path)], applied).text,
    ]),
  );
  function change(path: string, text: string) {
    c.clearProblems();
    c.setError("");
    const key = keyFor(path),
      applied = appliedFiles[path] ?? "";
    c.e.dispatch({
      type: "drafts",
      update: (current) => ({
        ...current,
        [key]: { base: resolveCodeDraft(current[key], applied).base, text },
      }),
    });
  }
  const conflicts = Object.entries(appliedFiles)
    .filter(
      ([path, source]) =>
        resolveCodeDraft(drafts[keyFor(path)], source).conflict,
    )
    .map(([path]) => path);
  async function apply() {
    if (!graph || c.busy || conflicts.length) return;
    const { [FUNCTION_COMPOSITION_PATH]: source, ...modules } = files;
    const composition =
      source !== undefined && source !== compositionSource
        ? { mode: "apply" as const, source }
        : undefined;
    if (
      await c.apply(
        { ...c.latest.current.graph!, modules },
        undefined,
        true,
        composition,
      )
    ) {
      c.e.dispatch({
        type: "drafts",
        update: (current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(files).map(([path, text]) => {
              const key = keyFor(path);
              if (path === FUNCTION_COMPOSITION_PATH && !composition)
                return [key, current[key] ?? { base: text, text }];
              return [key, { base: text, text: current[key]?.text ?? text }];
            }),
          ),
        }),
      });
    }
  }
  function resolve(keep: boolean) {
    c.e.dispatch({
      type: "drafts",
      update: (current) => ({
        ...current,
        [keyFor(path)]: { base: applied, text: keep ? buffer.text : applied },
      }),
    });
    c.setError("");
  }
  return {
    path,
    applied,
    composition: path === FUNCTION_COMPOSITION_PATH,
    text: buffer.text,
    files,
    conflicts,
    conflict: buffer.conflict,
    key: `${c.e.state.documentEpoch ?? 0}:${c.owner}:${path}`,
    projectKey: `${c.e.state.documentEpoch ?? 0}:${c.owner}`,
    dirty: Object.entries(files).some(
      ([path, text]) => text !== appliedFiles[path],
    ),
    tabs: Object.entries(files).map(([path, text]) => ({
      path,
      composition: path === FUNCTION_COMPOSITION_PATH,
      label:
        path === FUNCTION_COMPOSITION_PATH ? "Network" : path.split("/").at(-1),
      dirty: text !== appliedFiles[path],
    })),
    change,
    apply,
    revert: () => resolve(false),
    keep: () => resolve(true),
  };
}
export type FunctionDocuments = ReturnType<typeof useFunctionDocuments>;
