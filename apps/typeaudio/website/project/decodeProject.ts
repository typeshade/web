import { validateScene } from "../video-model.ts";

/** Versioned agent project files and legacy scene files enter the same document validator. */
export function decodeProject(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid project file.");
  const data = raw as Record<string, unknown>;
  if (data.schema !== undefined) {
    if (data.schema !== "typeaudio.project" || data.version !== 1)
      throw new Error(
        "Use a supported TypeAudio project (typeaudio.project, version 1).",
      );
    return { scene: validateScene(data.scene), audioAssets: data.audioAssets };
  }
  return { scene: validateScene(raw), audioAssets: data.audioAssets };
}
