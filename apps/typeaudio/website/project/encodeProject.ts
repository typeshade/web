import type { Scene } from "../video-model.ts";
import type { ProjectEditorState } from "./editorState.ts";

export function encodeProject(
  scene: Scene,
  audioAssets: unknown[] = [],
  editor?: ProjectEditorState,
) {
  const assets = audioAssets.length ? { audioAssets } : {};
  if (editor)
    return {
      schema: "typeaudio.project",
      version: 2,
      scene,
      editor,
      ...assets,
    };
  return scene.space || scene.origin
    ? { schema: "typeaudio.project", version: 1, scene, ...assets }
    : { ...scene, ...assets };
}
