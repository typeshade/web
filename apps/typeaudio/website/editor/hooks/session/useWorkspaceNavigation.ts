import { useCallback, useEffect } from "react";
import { type Workspace } from "../../state/documentTypes.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
export function useWorkspaceNavigation(
  { dispatch }: DocumentController,
  stopSound: () => void,
  stopScene: () => void,
) {
  const workspace = useCallback(
    (next: Workspace) => {
      stopSound();
      stopScene();
      dispatch({ type: "workspace", workspace: next });
      history.pushState({}, "", next === "sound" ? "/" : "/studio/video/");
    },
    [stopSound, stopScene],
  );
  useEffect(() => {
    const fn = () => {
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
