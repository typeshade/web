import { useCallback, useEffect } from "react";
import { type Workspace } from "../../state/documentTypes.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import { isStudioPath, studioPath } from "../../shared/studioPath.ts";
export function useWorkspaceNavigation(
  { dispatch }: DocumentController,
  stopSound: () => void,
  stopScene: () => void,
) {
  /** `replace` keeps one history entry, for a switch that is part of opening a project. */
  const workspace = useCallback(
    (next: Workspace, replace = false) => {
      stopSound();
      stopScene();
      dispatch({ type: "workspace", workspace: next });
      // The project query names the open project in both workspaces.
      const url = studioPath(next) + location.search;
      if (
        replace ||
        !isStudioPath(location.pathname) ||
        url === location.pathname + location.search
      )
        history.replaceState(history.state, "", url);
      else history.pushState({}, "", url);
    },
    [stopSound, stopScene],
  );
  useEffect(() => {
    const fn = () => {
      if (!isStudioPath(location.pathname)) return; // Leaving for the start screen.
      stopSound();
      stopScene();
      dispatch({
        type: "workspace",
        workspace: location.pathname.startsWith("/studio/video")
          ? "picture"
          : "sound",
      });
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, [stopSound, stopScene]);

  return workspace;
}
