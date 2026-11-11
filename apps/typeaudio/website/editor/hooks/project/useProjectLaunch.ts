import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "../../useEditor.ts";
import type { LaunchRequest } from "../session/useAppRoute.ts";
import { emptyProject } from "../../../project/startingPoints.ts";
import {
  type DocumentIdentity,
  identityFromSearch,
  identitySearch,
  readIdentity,
  sameIdentity,
} from "../../state/documentIdentity.ts";
import { isStudioPath, studioPath } from "../../shared/studioPath.ts";
import { isExample, RETIRED_EXAMPLES } from "../../../project/catalog.ts";

/**
 * Opens what the start screen or the URL asked for, keeps the editor URL naming the open
 * project, and keeps the work in Saved copies before the editor returns to the start screen.
 */
export function useProjectLaunch(
  e: Editor,
  request: LaunchRequest,
  onExit: () => void,
) {
  const editor = useRef(e);
  editor.current = e;
  /** Show the working document's URL: its workspace and the project it came from. */
  function showDocument() {
    const path = isStudioPath(location.pathname)
      ? location.pathname
      : studioPath(editor.current.state.workspace);
    history.replaceState(
      history.state,
      "",
      path + identitySearch(readIdentity()),
    );
  }
  function open(identity: DocumentIdentity) {
    if (identity.kind === "copy")
      return editor.current.openSavedProject(identity.id);
    // A retired example's editor URL keeps the working document it was opened into.
    if (!isExample(identity.id) && identity.id in RETIRED_EXAMPLES)
      return Promise.resolve(false);
    return editor.current.openExample(identity.id);
  }
  async function launch(next: LaunchRequest) {
    const current = editor.current;
    if (next.kind === "example" || next.kind === "copy")
      await open({ kind: next.kind, id: next.id });
    else if (next.kind === "file") await current.openProjectData(next.data);
    else if (next.kind === "new") {
      if (await current.loadProject(async () => emptyProject())) {
        const opened = editor.current;
        if (next.template === "procedural") await opened.newGraph();
        else if (next.template === "function") await opened.newFunctionSound();
        else if (next.template === "picture") {
          opened.workspace("picture", true);
          opened.setNotice(
            "New composition. Import a video or a YouTube link, then add sounds to the timeline.",
          );
        } else
          opened.setNotice(
            "New project. Shape the sound, or switch to Picture to arrange layers.",
          );
      }
    } else {
      const wanted = identityFromSearch(location.search);
      if (wanted && !sameIdentity(wanted, readIdentity())) await open(wanted);
    }
    showDocument();
  }
  useEffect(() => {
    const timer = setTimeout(() => void launch(request), 0);
    return () => clearTimeout(timer);
  }, []);
  const workspace = e.state.workspace;
  useEffect(() => {
    document.title =
      workspace === "picture"
        ? "Picture workspace · TypeAudio"
        : "Sound workspace · TypeAudio";
  }, [workspace]);
  const leave = useCallback(() => {
    if (editor.current.leaveProject()) onExit();
  }, [onExit]);
  useEffect(() => {
    const fn = () => {
      if (!isStudioPath(location.pathname)) {
        // Back to the start screen. Stay in the editor if the work cannot be kept.
        if (editor.current.leaveProject()) onExit();
        else
          history.pushState(
            null,
            "",
            studioPath(editor.current.state.workspace) +
              identitySearch(readIdentity()),
          );
        return;
      }
      const wanted = identityFromSearch(location.search);
      if (wanted && !sameIdentity(wanted, readIdentity()))
        void open(wanted).then(showDocument);
      else showDocument();
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, [onExit]);
  return { leave };
}
