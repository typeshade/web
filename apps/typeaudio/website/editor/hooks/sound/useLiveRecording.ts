import { useState } from "react";
import { SAMPLE_RATE } from "../../../sound/constants.ts";
import { wav } from "../../../audio.ts";
import { download } from "../../shared/download.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
import type { Notice } from "../../state/types.ts";
export function useLiveRecording(
  { sound }: EditorResources,
  setNotice: Notice,
) {
  const [recording, setRecording] = useState(false),
    [recorded, setRecorded] = useState<Float32Array>();
  async function recordLive() {
    const live = sound.current.live;
    if (!live || recording) return;
    setRecording(true);
    setNotice("Recording live output, up to 30 seconds.");
    try {
      const pcm = await live.record();
      if (!pcm.length) throw new Error("Recording was empty.");
      setRecorded(pcm);
      setNotice(
        `Recorded ${(pcm.length / SAMPLE_RATE).toFixed(2)} s. Export the take to keep it.${pcm.some((v) => Math.abs(v) > 1) ? " Clipping detected; lower layer output levels." : ""}`,
      );
    } catch (error) {
      setNotice(String(error));
    } finally {
      setRecording(false);
    }
  }
  function exportTake() {
    if (recorded)
      download(
        new Blob([wav(recorded, SAMPLE_RATE)], { type: "audio/wav" }),
        "typeaudio-take.wav",
      );
  }
  return {
    recording,
    recorded,
    recordLive,
    exportTake,
    stopRecording: () => sound.current.live?.stopRecording(),
  };
}
