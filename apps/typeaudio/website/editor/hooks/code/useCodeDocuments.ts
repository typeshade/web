import { useCallback, useEffect, useState } from "react";
import type { GraphEditor } from "../graph/useGraphEditor.ts";
import {
  codeDocumentKey,
  resolveCodeDraft,
  GENERATED_DOCUMENT,
  SELECTION_DOCUMENT,
} from "../../code/codeDraft.ts";
import type { CodeDraft, CodeDrafts } from "../../../project/editorState.ts";

/** Owns unapplied buffers independently from the sound document and its history. */
export function useCodeDocuments(c: GraphEditor) {
  const drafts = c.e.state.drafts ?? {};
  const setDrafts = useCallback(
    (update: (current: CodeDrafts) => CodeDrafts) =>
      c.e.dispatch({ type: "drafts", update }),
    [c.e.dispatch],
  );
  const [active, setActive] = useState<{
    owner: string;
    id: string;
    selection?: GraphEditor["selectionVersion"];
    epoch?: number;
  }>({ owner: "", id: "" });
  const [attempt, setAttempt] = useState<{ key: string; text: string }>();
  const [focusRequest, requestFocus] = useState(0);
  const nodes = c.graph?.nodes.filter((n) => n.kind === "code") ?? [];
  const appliedCodes = JSON.stringify(nodes.map((n) => [n.id, n.code]));
  useEffect(() => {
    c.e.dispatch({
      type: "reconcileDrafts",
      update: (current) => {
        let next = current;
        for (const [id, applied] of JSON.parse(appliedCodes) as [
          string,
          string,
        ][]) {
          const key = codeDocumentKey(c.owner, id),
            saved = current[key];
          if (!saved) continue;
          const resolved = resolveCodeDraft(saved, applied);
          if (resolved.base !== saved.base || resolved.text !== saved.text)
            next = {
              ...next,
              [key]: { base: resolved.base, text: resolved.text },
            };
        }
        return next;
      },
    });
  }, [c.owner, appliedCodes]);
  // An explicit generated view lasts until the next canvas selection, even if
  // that selection chooses the same node. Ordinary nodes must never show another
  // node's editable body. Draft ownership stays independent from view selection.
  const inspected = c.selectedIds.length === 1 ? c.selected : undefined;
  const generatedRequested =
    active.owner === c.owner &&
    active.selection === c.selectionVersion &&
    active.epoch === c.e.state.documentEpoch &&
    active.id === GENERATED_DOCUMENT;
  const id = generatedRequested
    ? GENERATED_DOCUMENT
    : (inspected?.id ?? SELECTION_DOCUMENT);
  const node = nodes.find((n) => n.id === id);
  const key = codeDocumentKey(c.owner, id);
  const documentKey = `${c.e.state.documentEpoch ?? 0}:${key}`;
  const buffer = resolveCodeDraft(drafts[key], node?.code ?? "");
  const dirty = !!node && buffer.text !== node.code;
  const generated = id === GENERATED_DOCUMENT;
  const text = generated ? c.source : buffer.text;
  function update(key: string, value: CodeDraft) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }
  function select(id: string) {
    setActive({
      owner: c.owner,
      id,
      selection: c.selectionVersion,
      epoch: c.e.state.documentEpoch,
    });
    if (id !== GENERATED_DOCUMENT && id !== SELECTION_DOCUMENT) c.select(id);
  }
  async function apply() {
    const graph = c.latest.current.graph;
    if (!node || !graph || c.busy || !dirty || buffer.conflict) return false;
    const code = text;
    setAttempt({ key, text: code });
    const applied = await c.apply({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, code } : n)),
    });
    if (applied) {
      // Typing while the worker compiles must not erase the newer buffer.
      setDrafts((current) => ({
        ...current,
        [key]: { base: code, text: current[key]?.text ?? code },
      }));
    }
    return applied;
  }
  return {
    id,
    key: documentKey,
    node,
    generated,
    text,
    dirty,
    conflict: buffer.conflict,
    diagnosticCurrent: attempt?.key === key && attempt.text === text,
    focusRequest,
    focus: () => requestFocus((value) => value + 1),
    documents: [
      ...(!inspected || inspected.kind !== "code"
        ? [
            {
              id: inspected?.id ?? SELECTION_DOCUMENT,
              label: inspected ? `${inspected.name} · settings` : "Selection",
              kind: "settings",
              dirty: false,
            },
          ]
        : []),
      ...nodes.map((n) => ({
        id: n.id,
        label: `${n.name}${nodes.filter((other) => other.name === n.name).length > 1 ? `-${n.id.slice(0, 8)}` : ""} · sample`,
        kind: "sample",
        dirty:
          resolveCodeDraft(drafts[codeDocumentKey(c.owner, n.id)], n.code)
            .text !== n.code,
      })),
      {
        id: GENERATED_DOCUMENT,
        label: "Generated kernel · read only",
        kind: "generated",
        dirty: false,
      },
    ],
    select,
    apply,
    change: (text: string) => {
      if (node) update(key, { base: buffer.base, text });
    },
    revert: () => {
      if (node) {
        update(key, { base: node.code, text: node.code });
        c.setError("");
      }
    },
    keepDraft: () => {
      if (node) update(key, { base: node.code, text });
    },
  };
}
export type CodeDocuments = ReturnType<typeof useCodeDocuments>;
