import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import type { FunctionDocuments } from "../../../hooks/functions/useFunctionDocuments.ts";
import { Panel } from "../../molecules/Panel.tsx";
import { MonacoCodeEditor } from "../code/MonacoCodeEditor.tsx";
import { CodeLayoutControls } from "../../molecules/code/CodeLayoutControls.tsx";

export function FunctionCodeDock({
  controller: c,
  documents: d,
}: {
  controller: FunctionEditor;
  documents: FunctionDocuments;
}) {
  const problem = c.problems.find((p) => p.file === d.path);
  return (
    <Panel
      title="TypeShade source"
      className="graph-dock-panel function-code-panel"
      actions={
        <>
          <button
            disabled={!c.program?.composition}
            onClick={() => c.openComposition()}
            data-tooltip="Edit the function calls that define this network."
          >
            Network code
          </button>
          <CodeLayoutControls onFocus={c.focus} />
        </>
      }
    >
      <div
        className="function-file-tabs"
        role="tablist"
        aria-label="TypeShade source files"
      >
        {d.tabs.map((tab) => (
          <button
            role="tab"
            aria-selected={tab.path === d.path}
            key={tab.path}
            onClick={() =>
              tab.composition ? c.openComposition() : c.selectFile(tab.path)
            }
            title={tab.path}
          >
            {tab.label}
            {tab.dirty ? " •" : ""}
          </button>
        ))}
      </div>
      <div className="function-code-actions">
        <span>
          {d.path}{" "}
          <small>
            {d.composition
              ? "Calls define nodes; state and context are explicit."
              : "Complete TypeShade module"}
          </small>
        </span>
        <button
          id="apply-function-code"
          disabled={c.busy || !d.dirty || !!d.conflicts.length}
          onClick={() => void d.apply()}
          data-tooltip="Compile all edited source files and apply them together. Ctrl/⌘ Enter."
        >
          {c.busy ? "Preparing…" : "Apply source"}
        </button>
        <button disabled={c.busy || d.text === d.applied} onClick={d.revert}>
          Revert file
        </button>
      </div>
      {!!d.conflicts.length && (
        <div className="function-error" role="alert">
          Applied source changed while these files had drafts:{" "}
          {d.conflicts.join(", ")}.{" "}
          {d.conflict && <button onClick={d.keep}>Keep this draft</button>}
        </div>
      )}
      <MonacoCodeEditor
        documentKey={d.key}
        value={d.text}
        mode="module"
        readOnly={false}
        focusRequest={c.focusRequest}
        focusLine={c.focusLine}
        project={{ key: d.projectKey, path: d.path, files: d.files }}
        onChange={(text) => d.change(d.path, text)}
        onModuleChange={d.change}
        onOpenModule={c.selectFile}
        onApply={() => void d.apply()}
        onSave={() => void c.e.exportProject()}
        diagnostic={problem && { line: problem.line, message: problem.message }}
      />
      {!!c.program?.compositionError && (
        <p className="function-error">
          Network code unavailable: {c.program.compositionError}
        </p>
      )}
      {!!c.error && (
        <div className="function-error" role="alert">
          {c.error}
        </div>
      )}
    </Panel>
  );
}
