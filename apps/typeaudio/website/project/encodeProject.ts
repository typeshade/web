import type { Scene } from "../video-model.ts";
import type { ProjectEditorState } from "./editorState.ts";
import { hasFunctionSources } from "../functions/hasFunctionSources.ts";

export function encodeProject(
  scene: Scene,
  audioAssets: unknown[] = [],
  editor?: ProjectEditorState,
) {
  const assets = audioAssets.length ? { audioAssets } : {};
  const functions =
    scene.cues.some((c) => hasFunctionSources(c.patch)) ||
    (editor &&
      (hasFunctionSources(editor.source.patch) ||
        Object.keys(editor.drafts).some((key) =>
          JSON.parse(key)[1]?.startsWith("module:"),
        )));
  if (editor)
    return {
      schema: "typeaudio.project",
      version: functions ? 3 : 2,
      scene,
      editor,
      ...assets,
    };
  if (functions)
    throw new Error(
      "Save function sounds with their editor source and drafts.",
    );
  return scene.space || scene.origin
    ? { schema: "typeaudio.project", version: 1, scene, ...assets }
    : { ...scene, ...assets };
}
