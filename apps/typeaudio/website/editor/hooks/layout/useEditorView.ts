import { useEffect, useRef, useState } from "react";
import type { EditorState } from "../../state/documentTypes.ts";

export type MobilePanel = "listen" | "layers" | "edit" | "projects";

/** View choices never change the composition or the selected source. */
export function useEditorView(state: EditorState) {
  const [sourceEditing, setSourceEditing] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(
    state.scene.cues.length ? "listen" : "projects",
  );
  const previous = useRef([state.documentEpoch, state.workspace]);
  useEffect(() => {
    const next = [state.documentEpoch, state.workspace];
    if (next.every((value, i) => value === previous.current[i])) return;
    previous.current = next;
    setSourceEditing(false);
    setMobilePanel("listen");
  }, [state.documentEpoch, state.workspace]);
  return {
    sourceEditing:
      sourceEditing &&
      state.workspace === "picture" &&
      !!state.scene.cues.find((c) => c.id === state.selected && !c.audio),
    mobilePanel,
    setMobilePanel,
    editSource: () => {
      setSourceEditing(true);
      setMobilePanel("edit");
    },
    showLayerProperties: () => {
      setSourceEditing(false);
      setMobilePanel("edit");
    },
    showComposition: () => {
      setSourceEditing(false);
      setMobilePanel("listen");
    },
  };
}
