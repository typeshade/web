import { useEffect } from "react";
import type { Editor } from "../../useEditor.ts";
import { useInteractions } from "./useInteractions.ts";
import { useWorkspaceLayout } from "../layout/useWorkspaceLayout.ts";

export function useEditorShortcuts(e: Editor) {
  const picture = e.state.workspace === "picture",
    menus = useInteractions(),
    layout = useWorkspaceLayout();
  function save() {
    void e.exportProject();
    menus.closeMenu();
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        (event.target instanceof Element &&
          event.target.closest(".monaco-editor,dialog")) ||
        (event.target instanceof HTMLElement &&
          event.target.closest('[role="menu"]') &&
          !event.ctrlKey &&
          !event.metaKey)
      )
        return;
      const target =
        event.target instanceof HTMLElement
          ? event.target.closest("input,textarea,select,[contenteditable=true]")
          : null;
      const editable =
        !!target &&
        !(
          target instanceof HTMLInputElement &&
          ["range", "checkbox"].includes(target.type)
        );
      if (editable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? e.redo() : e.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
        return;
      }
      if (picture && (event.ctrlKey || event.metaKey)) {
        if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          e.dispatch({
            type: "selectMany",
            ids: e.state.scene.cues.map((c) => c.id),
          });
          return;
        }
        if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          event.shiftKey ? e.splitClips() : e.duplicate();
          return;
        }
      }
      if (event.code === "Space") {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(
            'button:not([data-cue]),input[type="checkbox"],summary',
          )
        )
          return;
        if (event.repeat || (!picture && e.busy)) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        if (picture) {
          if (e.playing) e.stopScene();
          else void e.playScene();
        } else if (e.mode === "live") {
          if (e.live) e.stopSound();
          else void e.startLive();
        } else if (e.rendered)
          void e.sound.play(
            e.dry ? e.rendered.dry : e.rendered.wet,
            e.renderLoop,
            () => e.setNotice("Playback finished."),
          );
        return;
      }
      if (
        picture &&
        ["Delete", "Backspace"].includes(event.key) &&
        e.selected
      ) {
        event.preventDefault();
        e.deleteCue();
      }
      if (event.key === "Escape" && layout.focused) {
        layout.focus(false);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === "f" && innerWidth > 950) {
        event.preventDefault();
        layout.focus(!layout.focused);
        return;
      }
      if (event.key.toLowerCase() === "v")
        e.dispatch({ type: "tool", tool: "select" });
      if (event.key.toLowerCase() === "h")
        e.dispatch({ type: "tool", tool: "hand" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
}
