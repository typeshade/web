import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialDocument } from "../../state/restoreDocument.ts";
import { reducer } from "../../state/documentReducer.ts";
import { SCENE_KEY, DOCUMENT_KEY } from "../../state/storageKeys.ts";
import { type Action } from "../../state/documentTypes.ts";
export function useEditorDocument() {
  const [state, rawDispatch] = useReducer(reducer, undefined, () => ({
    ...initialDocument(),
    past: [],
    future: [],
    workspace: location.pathname.startsWith("/studio/video")
      ? ("picture" as const)
      : ("sound" as const),
    tool: "select" as const,
  }));
  const editVersion = useRef(0);
  const dispatch = useCallback((action: Action) => {
    if (
      [
        "edit",
        "open",
        "media",
        "undo",
        "redo",
        "select",
        "selectMany",
        "cancel",
      ].includes(action.type)
    )
      editVersion.current++;
    rawDispatch(action);
  }, []);
  const [notice, setNotice] = useState(
    "Ready. Choose a preset or import a video.",
  );

  const latest = useRef({ state });
  latest.current = { state };
  useEffect(() => {
    try {
      localStorage.setItem(
        DOCUMENT_KEY,
        JSON.stringify({
          version: 1,
          scene: state.scene,
          source: state.source,
          selected: state.selected,
          selection: state.selection,
        }),
      );
      // Compatibility mirrors are not used to restore a partially written document.
      localStorage.setItem(SCENE_KEY, JSON.stringify(state.scene));
      localStorage.setItem(
        "typeaudio.editor.source.v1",
        JSON.stringify(state.source),
      );
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your project to keep it.",
      );
    }
  }, [state.scene, state.source, state.selected, state.selection]);
  return { state, dispatch, editVersion, notice, setNotice, latest };
}

export type DocumentController = ReturnType<typeof useEditorDocument>;
