import { validateScene, emptyScene } from "../video-model.ts";
import { validateEditorState } from "./editorState.ts";
import { functionPatch } from "../functions/initialFunctions.ts";
import { hasFunctionSources } from "../functions/hasFunctionSources.ts";

/** Versioned agent project files and legacy scene files enter the same document validator. */
export function decodeProject(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid project file.");
  const data = raw as Record<string, unknown>;
  if (data.schema === "typeaudio.function-graph")
    return {
      scene: emptyScene(),
      audioAssets: undefined,
      editor: {
        source: { name: "Function sound", patch: functionPatch(data) },
        drafts: {},
        selected: "",
        selection: [],
      },
    };
  if (data.schema !== undefined) {
    if (
      data.schema !== "typeaudio.project" ||
      (data.version !== 1 && data.version !== 2 && data.version !== 3)
    )
      throw new Error(
        "Use a supported TypeAudio project (typeaudio.project, version 1, 2 or 3).",
      );
    const scene = validateScene(data.scene),
      editor =
        data.version === 1 ? undefined : validateEditorState(data.editor);
    if (
      data.version !== 3 &&
      (scene.cues.some((c) => hasFunctionSources(c.patch)) ||
        (editor && hasFunctionSources(editor.source.patch)))
    )
      throw new Error("Function sounds require project version 3.");
    return {
      scene,
      audioAssets: data.audioAssets,
      editor,
    };
  }
  const scene = validateScene(raw);
  if (scene.cues.some((c) => hasFunctionSources(c.patch)))
    throw new Error("Function sounds require project version 3.");
  return {
    scene,
    audioAssets: data.audioAssets,
    editor: undefined,
  };
}
