import { useRef, useState } from "react";
import { DEFAULT } from "../../../sound/defaultPatch.ts";
import { SAMPLE_RATE } from "../../../sound/constants.ts";
import { MAX_CUES } from "../../../video-model.ts";
import { decodeAudioFile } from "../../../audio-import.ts";
import { type AudioAssetRef } from "../../../audio-asset.ts";
import { type Workspace } from "../../state/documentTypes.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
export function useAudioImport(
  { editVersion, dispatch, latest, setNotice }: DocumentController,
  { assetLibrary, transport }: EditorResources,
  setAudioRevision: React.Dispatch<React.SetStateAction<number>>,
  workspace: (next: Workspace) => void,
) {
  const audioInput = useRef<HTMLInputElement>(null),
    audioRequest = useRef(0),
    [audioImporting, setAudioImporting] = useState(false);
  function addAudioCue(audio: AudioAssetRef, at = transport.current.current()) {
    if (latest.current.state.scene.cues.length >= MAX_CUES) {
      setNotice("A composition can contain up to 24 sound layers.");
      return;
    }
    const id = crypto.randomUUID(),
      time = Math.max(
        0,
        Math.min(3600, Math.round(at * SAMPLE_RATE) / SAMPLE_RATE),
      );
    workspace("picture");
    dispatch({
      type: "edit",
      edit: (d) =>
        d.scene.cues.length >= MAX_CUES
          ? d
          : {
              ...d,
              selected: id,
              selection: [id],
              scene: {
                ...d.scene,
                cues: [
                  ...d.scene.cues,
                  {
                    id,
                    name: audio.name,
                    time,
                    gain: 1,
                    muted: false,
                    patch: { ...DEFAULT },
                    audio,
                  },
                ],
              },
            },
    });
    setNotice(
      "Audio clip added. Drag its edges to trim; use the top handles for fades.",
    );
  }
  async function importAudio(file: File, at = transport.current.current()) {
    const request = ++audioRequest.current,
      version = editVersion.current;
    setAudioImporting(true);
    setNotice("Importing audio…");
    try {
      const asset = await decodeAudioFile(file);
      if (request !== audioRequest.current) return;
      await assetLibrary.put([asset]);
      setAudioRevision((n) => n + 1);
      if (request !== audioRequest.current) return;
      if (latest.current.state.scene.cues.some((c) => c.audio?.id === asset.id))
        setNotice(
          "Audio source available. Existing clips keep their edits; add another copy from the Audio library.",
        );
      else if (editVersion.current === version)
        addAudioCue(
          { id: asset.id, name: asset.name, frames: asset.frames },
          at,
        );
      else
        setNotice(
          "Audio saved in the Audio library. The composition changed during import; add the clip when ready.",
        );
    } catch (error) {
      if (request === audioRequest.current)
        setNotice(`Audio import failed: ${String(error)}`);
    } finally {
      if (request === audioRequest.current) setAudioImporting(false);
    }
  }
  return { audioInput, audioImporting, addAudioCue, importAudio };
}
