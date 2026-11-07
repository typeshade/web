import { useCallback, useEffect, useState } from "react";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";

export function useProjectPreview(
  { state, setNotice }: DocumentController,
  { projectPreview }: EditorResources,
  stopSound: () => void,
  stopScene: () => void,
) {
  const [preview, setPreview] = useState<{
    id: string;
    phase: "preparing" | "playing";
  }>();
  const stopPreview = useCallback(() => {
    projectPreview.stop();
    setPreview(undefined);
  }, [projectPreview]);
  useEffect(stopPreview, [
    state.scene,
    state.source,
    state.drafts,
    state.workspace,
    stopPreview,
  ]);
  async function previewProject(id: string) {
    stopSound();
    stopScene();
    setPreview({ id, phase: "preparing" });
    try {
      await projectPreview.play(
        id,
        () => setPreview({ id, phase: "playing" }),
        () => setPreview(undefined),
      );
    } catch (error) {
      setPreview(undefined);
      setNotice(String(error));
    }
  }
  return { preview, previewProject, stopPreview };
}
