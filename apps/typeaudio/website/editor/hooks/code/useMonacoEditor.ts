import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import type { CodeDiagnostic } from "../../code/codeDiagnostic.ts";
import {
  observeLanguageModel,
  type LanguageAnalysis,
} from "../../code/language/observeLanguageModel.ts";
import { setModelBindings } from "../../code/language/modelBindings.ts";
import type { TypeshadeRange } from "typeshade/language-service";

export interface MonacoEditorProps {
  documentKey: string;
  value: string;
  readOnly: boolean;
  focusRequest: number;
  diagnostic?: CodeDiagnostic;
  bindings?: Readonly<Record<string, string>>;
  onChange: (value: string) => void;
  onApply: () => void;
  onSave: () => void;
}
type Session = {
  m: typeof Monaco;
  editor: Monaco.editor.IStandaloneCodeEditor;
  models: Map<
    string,
    {
      model: Monaco.editor.ITextModel;
      view: Monaco.editor.ICodeEditorViewState | null;
      analysis: LanguageAnalysis;
      language?: ReturnType<typeof observeLanguageModel>;
    }
  >;
};
let nextInstance = 0;

/** Owns editor resources, models and their cursor/undo histories; never audio resources. */
export function useMonacoEditor(props: MonacoEditorProps) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  const syncing = useRef(false),
    active = useRef("");
  const [session, setSession] = useState<Session>();
  const [failure, setFailure] = useState("");
  const [cursor, setCursor] = useState({ lineNumber: 1, column: 1 });
  const [analysis, setAnalysis] = useState<LanguageAnalysis>({
    status: "checking",
    problems: [],
  });
  const [instance] = useState(() => ++nextInstance);
  const handledFocus = useRef(0);
  useLayoutEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("../../code/loadMonaco.ts")
      .then(({ monaco: m }) => {
        if (disposed || !host.current) return;
        const editor = m.editor.create(host.current, {
          model: null,
          theme: "typeaudio",
          automaticLayout: true,
          fontFamily: "PlexMono, 'IBM Plex Mono', monospace",
          fontSize: 12,
          lineHeight: 20,
          tabSize: 2,
          insertSpaces: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
          renderLineHighlight: "line",
          padding: { top: 10, bottom: 10 },
          fixedOverflowWidgets: true,
          overviewRulerLanes: 0,
          wordWrap: "on",
          wrappingIndent: "same",
          contextmenu: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: "off",
          parameterHints: { enabled: true },
          renameOnType: false,
          stickyScroll: { enabled: false },
          ariaLabel: "TypeShade node code",
          editContext: false,
        });
        const models: Session["models"] = new Map();
        const changed = editor.onDidChangeModelContent(() => {
          if (
            !syncing.current &&
            active.current === latest.current.documentKey &&
            !latest.current.readOnly
          )
            latest.current.onChange(editor.getValue());
        });
        const moved = editor.onDidChangeCursorPosition((event) =>
          setCursor(event.position),
        );
        const action = editor.addAction({
          id: "typeaudio.apply",
          label: "Apply TypeShade code",
          keybindings: [m.KeyMod.CtrlCmd | m.KeyCode.Enter],
          contextMenuGroupId: "typeaudio",
          contextMenuOrder: 1,
          precondition: "!editorReadonly",
          run: () => latest.current.onApply(),
        });
        const save = editor.onKeyDown((event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            event.keyCode === m.KeyCode.KeyS
          ) {
            event.preventDefault();
            event.stopPropagation();
            latest.current.onSave();
          }
        });
        setSession({ m, editor, models });
        cleanup = () => {
          save.dispose();
          action.dispose();
          changed.dispose();
          moved.dispose();
          editor.dispose();
          for (const { model, language } of models.values()) {
            language?.dispose();
            model.dispose();
          }
        };
      })
      .catch((error) => {
        if (!disposed) setFailure(String(error));
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    const { m, editor, models } = session;
    const previous = models.get(active.current);
    const switching = active.current !== props.documentKey;
    if (switching && previous) previous.view = editor.saveViewState();
    let entry = models.get(props.documentKey);
    if (!entry) {
      entry = {
        model: m.editor.createModel(
          props.value,
          "typeshade",
          m.Uri.parse(
            `inmemory://typeaudio/${instance}/${encodeURIComponent(props.documentKey)}.shade.ts`,
          ),
        ),
        view: null,
        analysis: { status: "checking", problems: [] },
      };
      entry.model.updateOptions({ tabSize: 2, insertSpaces: true });
      models.set(props.documentKey, entry);
      const current = entry,
        key = props.documentKey;
      current.language = observeLanguageModel(
        m,
        current.model,
        props.readOnly ? "module" : "sample",
        (next) => {
          current.analysis = next;
          if (active.current === key) setAnalysis(next);
        },
      );
    }
    setModelBindings(entry.model, props.bindings);
    syncing.current = true;
    if (entry.model.getValue() !== props.value)
      entry.model.setValue(props.value);
    if (switching) {
      active.current = props.documentKey;
      editor.setModel(entry.model);
      if (entry.view) editor.restoreViewState(entry.view);
      setCursor(editor.getPosition() ?? { lineNumber: 1, column: 1 });
      setAnalysis(entry.analysis);
    }
    editor.updateOptions({
      readOnly: props.readOnly,
      ariaLabel: props.readOnly ? "Generated TypeShade" : "TypeShade node code",
    });
    syncing.current = false;
    const d = props.diagnostic;
    m.editor.setModelMarkers(
      entry.model,
      "typeaudio",
      d
        ? [
            {
              severity: m.MarkerSeverity.Error,
              message: d.message,
              startLineNumber: Math.min(d.line, entry.model.getLineCount()),
              endLineNumber: Math.min(d.line, entry.model.getLineCount()),
              startColumn: 1,
              endColumn: entry.model.getLineMaxColumn(
                Math.min(d.line, entry.model.getLineCount()),
              ),
            },
          ]
        : [],
    );
  }, [
    session,
    props.documentKey,
    props.value,
    props.readOnly,
    props.diagnostic,
    props.bindings,
    instance,
  ]);
  useEffect(() => {
    if (session && props.focusRequest > handledFocus.current) {
      handledFocus.current = props.focusRequest;
      session.editor.focus();
    }
  }, [session, props.focusRequest]);
  function revealProblem(range: TypeshadeRange) {
    if (!session) return;
    const position = {
      lineNumber: range.start.line + 1,
      column: range.start.character + 1,
    };
    session.editor.setPosition(position);
    session.editor.revealPositionInCenter(position);
    session.editor.focus();
  }
  return {
    host,
    ready: !!session,
    failure,
    cursor,
    analysis,
    revealProblem,
    retryAnalysis: () =>
      session?.models.get(active.current)?.language?.refresh(),
  };
}
