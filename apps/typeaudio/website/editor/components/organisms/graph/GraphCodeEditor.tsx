import { useMemo, useRef } from "react";
import { BuiltinNodeContext } from "../../molecules/code/BuiltinNodeContext.tsx";
import { nodeContext } from "../../../code/nodeContext.ts";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import type { CodeDocuments } from "../../../hooks/code/useCodeDocuments.ts";
import { codeDiagnostic } from "../../../code/codeDiagnostic.ts";
import { GraphCodeReference } from "../../molecules/graph/GraphCodeReference.tsx";
import { CodeDocumentTabs } from "../../molecules/code/CodeDocumentTabs.tsx";
import { MonacoCodeEditor } from "../code/MonacoCodeEditor.tsx";
import { CodeContext } from "../../molecules/code/CodeContext.tsx";

export function GraphCodeEditor({
  controller: c,
  documents: d,
}: {
  controller: GraphEditor;
  documents: CodeDocuments;
}) {
  const context = useMemo(
    () => (c.graph && d.node ? nodeContext(c.graph, d.node) : undefined),
    [c.graph, d.node],
  );
  const visibleCode = !!d.node || d.generated;
  // Keep Monaco mounted while inspecting built-ins so a return preserves text Undo
  // and cursor position. A graph without Code does not load Monaco until requested.
  const lastDocument = useRef<{ key: string; value: string }>(undefined);
  if (visibleCode) lastDocument.current = { key: d.key, value: d.text };
  return (
    <div className="graph-code-panel">
      <CodeDocumentTabs documents={d} />
      <div className="graph-code-toolbar">
        <span>
          {d.generated
            ? "Whole graph / Generated engine output"
            : d.node
              ? `${d.node.name} / One sample at a time`
              : "Selected node / Built-in settings"}
        </span>
        {d.node && (
          <>
            <button
              disabled={!d.dirty || c.busy}
              onClick={d.revert}
              data-tooltip="Discard this draft and restore the sound's applied code."
            >
              Revert draft
            </button>
            <button
              id="apply-graph-code"
              className="primary"
              disabled={c.busy || !d.dirty || d.conflict}
              onClick={() => void d.apply()}
              data-tooltip="Compile and apply this node (Ctrl/Cmd Enter). Audio keeps playing during compilation."
            >
              {c.busy ? "Compiling…" : "Apply code"}
            </button>
          </>
        )}
      </div>
      {visibleCode && (
        <CodeContext
          graph={c.graph!}
          node={d.node}
          generated={d.generated}
          onSelectNode={d.select}
        />
      )}
      {d.conflict && d.node && (
        <div className="code-conflict" role="alert">
          <span>The applied code changed. Your draft is preserved.</span>
          <button onClick={d.revert}>Use applied code</button>
          <button onClick={d.keepDraft}>Keep my draft</button>
        </div>
      )}
      <div
        id="code-document-panel"
        role="tabpanel"
        aria-labelledby={`code-tab-${d.generated ? "generated" : `node-${d.id}`}`}
      >
        {!visibleCode && <BuiltinNodeContext controller={c} />}
        {lastDocument.current && (
          <div className="retained-code-editor" hidden={!visibleCode}>
            <MonacoCodeEditor
              documentKey={lastDocument.current.key}
              value={lastDocument.current.value}
              readOnly={!d.node}
              focusRequest={visibleCode ? d.focusRequest : 0}
              diagnostic={
                d.node && d.diagnosticCurrent
                  ? codeDiagnostic(c.error, d.node.name)
                  : undefined
              }
              bindings={context?.bindings}
              onChange={d.change}
              onApply={() => void d.apply()}
              onSave={() => void c.e.exportProject()}
            />
          </div>
        )}
      </div>
      {d.node && <GraphCodeReference />}
      <p className="graph-code-status" role={c.error ? "alert" : "status"}>
        {c.error ||
          (c.busy
            ? "Compiling off the audio thread…"
            : !visibleCode
              ? "Select a Code node to edit its calculation. Built-in node controls are in Node properties."
              : d.generated
                ? "Read-only source for the applied graph. Edit a Code node to change its sound."
                : d.dirty
                  ? "Unapplied draft · Ctrl/⌘ S saves this text with the project. Ctrl/⌘ Enter applies it to the sound."
                  : "Applied · Ctrl/⌘ Space: completion · F2: rename · F12: definition · Apply checks audio-node limits.")}
      </p>
    </div>
  );
}
