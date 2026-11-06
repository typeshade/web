import { useEffect } from "react";
import type { EditorResources } from "./useAudioResources.ts";
export function usePageLifecycle(
  { sound, transport }: EditorResources,
  sceneAction: React.RefObject<number>,
  setLive: (value: boolean) => void,
  setPlaying: (value: boolean) => void,
) {
  useEffect(() => {
    const stop = () => {
      sceneAction.current++;
      sound.current.stop();
      transport.current.stop();
      setLive(false);
      setPlaying(false);
    };
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
    };
  }, []);
}
