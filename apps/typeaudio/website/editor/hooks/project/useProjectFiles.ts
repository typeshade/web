import { useRef, useState } from "react";
import { decodeProject } from "../../../project/decodeProject.ts";
import { encodeProject } from "../../../project/encodeProject.ts";
import { projectUrl } from "../../../project/catalog.ts";
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
  workspace: (next: "picture") => void,
) {
  const projectRequest = useRef(0);
  const [projectLoading, setProjectLoading] = useState(false);
  async function loadProject(read: () => Promise<unknown>) {
    const request = ++projectRequest.current,
      version = editVersion.current;
    const current = () =>
      request === projectRequest.current && version === editVersion.current;
    setProjectLoading(true);
    try {
      const { scene: next, audioAssets } = decodeProject(await read());
      for (const cue of next.cues)
        if (!cue.audio) {
          if (!current()) return;
          await patchPrograms(cue.patch);
        }
      const assets = await unpackAudioAssets(
        audioAssets,
        next.cues.flatMap((c) => (c.audio ? [c.audio] : [])),
      );
      if (!current()) return;
      await assetLibrary.put(assets);
      if (!current()) return;
      detach();
      dispatch({ type: "open", scene: next });
      workspace("picture");
      setAudioRevision((n) => n + 1);
      transport.current.seek(next.start);
      setNotice(
        next.media.kind === "youtube"
          ? "Editable project opened. Select a layer to edit its sound; connect the YouTube reference when needed."
          : next.media.kind === "none"
            ? "Project opened."
            : `Project opened. Re-select video: ${next.media.name}`,
      );
    } catch (error) {
      if (current()) setNotice(`Import failed: ${String(error)}`);
    } finally {
      if (request === projectRequest.current) setProjectLoading(false);
    }
  }
  async function openProject(file: File) {
    return loadProject(async () => {
      if (file.size > MAX_PROJECT_BYTES)
        throw new Error(
          "Project files must be smaller than 40 MB, including embedded audio.",
        );
      return JSON.parse(await file.text());
    });
  }
  async function openExample(id: string) {
    return loadProject(async () => {
      const response = await fetch(projectUrl(id));
      if (!response.ok)
        throw new Error("This example project could not be loaded.");
      const text = await response.text();
      if (text.length > MAX_PROJECT_BYTES)
        throw new Error("Project file is too large.");
      return JSON.parse(text);
    });
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
        encodeProject(snapshot, audioAssets),
        null,
        2,
      );
      download(
        new Blob([data], { type: "application/json" }),
        snapshot.origin
          ? `${snapshot.name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}.typeaudio.json`
          : "typeaudio-scene.json",
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
  return { openProject, openExample, projectLoading, exportProject };
}
