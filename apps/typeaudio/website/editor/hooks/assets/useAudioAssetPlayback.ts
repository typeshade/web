import { DEFAULT } from "../../../sound/defaultPatch.ts";
import { SAMPLE_RATE } from "../../../sound/constants.ts";
import { type AudioAssetRef } from "../../../audio-asset.ts";
import { wav } from "../../../audio.ts";
import { download } from "../../shared/download.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
import type { SceneSession } from "../picture/useSceneSession.ts";
export function useAudioAssetPlayback(
  { latest, setNotice }: DocumentController,
  { assetLibrary, transport }: EditorResources,
  { stopScene, sceneAction }: SceneSession,
  stopSound: () => void,
) {
  async function auditionAudio(ref: AudioAssetRef) {
    stopSound();
    stopScene();
    const generation = sceneAction.current;
    try {
      await transport.current.audio.unlock();
      const pcm = await assetLibrary.read(ref);
      if (generation !== sceneAction.current) return;
      const id = "audio-preview";
      transport.current.audio.schedule(
        {
          ...latest.current.state.scene,
          start: 0,
          end: pcm.length / SAMPLE_RATE,
          cues: [
            {
              id,
              name: ref.name,
              time: 0,
              gain: 1,
              muted: false,
              patch: { ...DEFAULT },
              audio: ref,
            },
          ],
        },
        new Map([[id, pcm]]),
        0,
      );
      setNotice(`Auditioning ${ref.name}.`);
    } catch (error) {
      if (generation === sceneAction.current) setNotice(String(error));
    }
  }
  async function exportAudio(ref: AudioAssetRef) {
    try {
      const pcm = await assetLibrary.read(ref);
      download(
        new Blob([wav(pcm, SAMPLE_RATE)], { type: "audio/wav" }),
        ref.name.replace(/\.[^.]+$/, "") + "-mono.wav",
      );
    } catch (error) {
      setNotice(String(error));
    }
  }
  return { auditionAudio, exportAudio };
}
