import { useRef } from "react";
import { validateScene } from "../../../video-model.ts";
import {
  MAX_PROJECT_BYTES,
  packAudio,
  unpackAudioAssets,
} from "../../../audio-asset.ts";
import { patchPrograms } from "../../../graph/preparePatch.ts";
import { download } from "../../shared/download.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
import type { MediaSource } from "../media/useMediaSource.ts";
export function useProjectFiles(
  { editVersion, dispatch, latest, setNotice }: DocumentController,
  { assetLibrary, transport }: EditorResources,
  { detach }: MediaSource,
  setAudioRevision: React.Dispatch<React.SetStateAction<number>>,
) {
  const projectRequest = useRef(0);
  async function openProject(file: File) {
    const request = ++projectRequest.current,
      version = editVersion.current;
    const current = () =>
      request === projectRequest.current && version === editVersion.current;
    try {
      if (file.size > MAX_PROJECT_BYTES)
        throw new Error(
          "Project files must be smaller than 40 MB, including embedded audio.",
        );
      const raw = JSON.parse(await file.text()),
        next = validateScene(raw);
      for (const cue of next.cues)
        if (!cue.audio) await patchPrograms(cue.patch);
      const assets = await unpackAudioAssets(
        raw.audioAssets,
        next.cues.flatMap((c) => (c.audio ? [c.audio] : [])),
      );
      if (!current()) return;
      await assetLibrary.put(assets);
      if (!current()) return;
      detach();
      dispatch({ type: "open", scene: next });
      setAudioRevision((n) => n + 1);
      transport.current.seek(next.start);
      setNotice(
        next.media.kind === "none"
          ? "Project opened."
          : `Project opened. Re-select video: ${next.media.name}`,
      );
    } catch (error) {
      if (current()) setNotice(`Import failed: ${String(error)}`);
    }
  }
  async function exportProject() {
    const snapshot = latest.current.state.scene;
    try {
      const refs = [
        ...new Map(
          snapshot.cues.flatMap((c) =>
            c.audio ? [[c.audio.id, c.audio] as const] : [],
          ),
        ).values(),
      ];
      const audioAssets = [];
      for (const ref of refs)
        audioAssets.push(
          packAudio({ ...ref, pcm: await assetLibrary.read(ref) }),
        );
      const data = JSON.stringify(
        { ...snapshot, ...(audioAssets.length ? { audioAssets } : {}) },
        null,
        2,
      );
      download(
        new Blob([data], { type: "application/json" }),
        "typeaudio-scene.json",
      );
      setNotice(
        audioAssets.length
          ? "Exported project with its source audio. Re-select video when reopening."
          : "Project exported.",
      );
    } catch (error) {
      setNotice(`Export failed: ${String(error)}`);
    }
  }
  return { openProject, exportProject };
}
