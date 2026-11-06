import { useEffect, useState } from "react";
import { type AudioAssetRef } from "../../../audio-asset.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
export function useAudioLibrary(
  { latest, setNotice }: DocumentController,
  { assetLibrary }: EditorResources,
) {
  const [audioAssets, setAudioAssets] = useState<AudioAssetRef[]>([]),
    [audioRevision, setAudioRevision] = useState(0);
  useEffect(() => {
    void assetLibrary
      .list()
      .then(setAudioAssets)
      .catch((error) => setNotice(String(error)));
  }, [assetLibrary, audioRevision]);
  function audioInUse(id: string) {
    const s = latest.current.state;
    return [
      s,
      ...s.past,
      ...s.future,
      ...(s.checkpoint ? [s.checkpoint] : []),
    ].some((d) => d.scene.cues.some((c) => c.audio?.id === id));
  }
  async function removeAudio(id: string) {
    if (audioInUse(id)) {
      setNotice("This audio is used by the composition or its undo history.");
      return;
    }
    try {
      await assetLibrary.remove(id);
      setAudioRevision((n) => n + 1);
      setNotice("Audio removed from this browser's library.");
    } catch (error) {
      setNotice(String(error));
    }
  }
  return {
    audioAssets,
    audioRevision,
    setAudioRevision,
    removeAudio,
    audioInUse,
  };
}
