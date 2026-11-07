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
  return (
    <div className="graph-code-panel">
      <CodeDocumentTabs documents={d} />
      <div className="graph-code-toolbar">
        <span>
          {d.generated
            ? "Graph / Generated source"
            : `Nodes / ${d.node?.name ?? "Code"} / Sample code`}
        </span>
        {!d.generated && (
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
      <CodeContext
        parameters={c.graph?.parameters ?? []}
        generated={d.generated}
      />
      {d.conflict && !d.generated && (
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
        <MonacoCodeEditor
          documentKey={d.key}
          value={d.text}
          readOnly={d.generated}
          focusRequest={d.focusRequest}
          diagnostic={
            d.node && d.diagnosticCurrent
              ? codeDiagnostic(c.error, d.node.name)
              : undefined
          }
          onChange={d.change}
          onApply={() => void d.apply()}
          onSave={() => void c.e.exportProject()}
        />
      </div>
      <GraphCodeReference />
      <p className="graph-code-status" role={c.error ? "alert" : "status"}>
        {c.error ||
          (c.busy
            ? "Compiling off the audio thread…"
            : d.generated
              ? "Read-only source for the applied graph. Edit a Code node to change its sound."
              : d.dirty
                ? "Unapplied draft · Ctrl/⌘ S saves this text with the project. Ctrl/⌘ Enter applies it to the sound."
                : "Applied · Ctrl/⌘ Space: completion · F2: rename · F12: definition · Apply checks audio-node limits.")}
      </p>
    </div>
  );
}
