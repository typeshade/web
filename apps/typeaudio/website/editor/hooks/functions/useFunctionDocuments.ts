import { useEffect } from "react";
import type { FunctionEditor } from "./useFunctionEditor.ts";
import { codeDocumentKey, resolveCodeDraft } from "../../code/codeDraft.ts";

/** Full source files and incomplete buffers share the existing project draft ownership. */
export function useFunctionDocuments(c: FunctionEditor) {
  const drafts = c.e.state.drafts ?? {},
    graph = c.graph;
  const keyFor = (path: string) => codeDocumentKey(c.owner, `module:${path}`);
  const source = JSON.stringify(graph?.modules ?? {});
  useEffect(() => {
    c.e.dispatch({
      type: "drafts",
      update: (current) => {
        let next = current;
        for (const [path, applied] of Object.entries(graph?.modules ?? {})) {
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
    applied = graph?.modules[path] ?? "";
  const buffer = resolveCodeDraft(drafts[keyFor(path)], applied);
  const files = Object.fromEntries(
    Object.entries(graph?.modules ?? {}).map(([path, applied]) => [
      path,
      resolveCodeDraft(drafts[keyFor(path)], applied).text,
    ]),
  );
  function change(path: string, text: string) {
    c.clearProblems();
    c.setError("");
    const key = keyFor(path),
      applied = graph?.modules[path] ?? "";
    c.e.dispatch({
      type: "drafts",
      update: (current) => ({
        ...current,
        [key]: { base: resolveCodeDraft(current[key], applied).base, text },
      }),
    });
  }
  const conflicts = Object.entries(graph?.modules ?? {})
    .filter(
      ([path, source]) =>
        resolveCodeDraft(drafts[keyFor(path)], source).conflict,
    )
    .map(([path]) => path);
  async function apply() {
    if (!graph || c.busy || conflicts.length) return;
    const modules = files;
    if (
      await c.apply({ ...c.latest.current.graph!, modules }, undefined, true)
    ) {
      c.e.dispatch({
        type: "drafts",
        update: (current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(modules).map(([path, text]) => {
              const key = keyFor(path);
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
    text: buffer.text,
    files,
    conflicts,
    conflict: buffer.conflict,
    key: `${c.e.state.documentEpoch ?? 0}:${c.owner}:${path}`,
    projectKey: `${c.e.state.documentEpoch ?? 0}:${c.owner}`,
    dirty: Object.entries(files).some(
      ([path, text]) => text !== graph?.modules[path],
    ),
    tabs: Object.entries(files).map(([path, text]) => ({
      path,
      dirty: text !== graph?.modules[path],
    })),
    change,
    apply,
    revert: () => resolve(false),
    keep: () => resolve(true),
  };
}
export type FunctionDocuments = ReturnType<typeof useFunctionDocuments>;
