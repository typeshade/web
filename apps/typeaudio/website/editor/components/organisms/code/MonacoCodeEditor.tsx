import {
  useMonacoEditor,
  type MonacoEditorProps,
} from "../../../hooks/code/useMonacoEditor.ts";

export function MonacoCodeEditor(props: MonacoEditorProps) {
  const editor = useMonacoEditor(props);
  return (
    <div className="code-editor-frame" data-document={props.documentKey}>
      <div
        id="graph-code"
        className="monaco-host"
        ref={editor.host}
        data-ready={editor.ready}
      />
      {!editor.ready && (
        <p className="code-loading" role={editor.failure ? "alert" : "status"}>
          {editor.failure
            ? "The code editor could not load. Reload the page to retry."
            : "Loading code editor…"}
        </p>
      )}
      <div className="code-position">
        <span>
          Ln {editor.cursor.lineNumber}, Col {editor.cursor.column}
        </span>
        <span>
          {props.readOnly
            ? "Read only"
            : `${props.value.length} / 1800 characters`}
        </span>
        <span>TypeShade · Spaces: 2</span>
      </div>
    </div>
  );
}
