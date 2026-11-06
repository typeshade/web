import { useEffect, useRef } from "react";
import { disposeGraphCompiler } from "../../../graph/compilationClient.ts";
import { SoundEngine } from "../../engine/SoundEngine.ts";
import { SceneTransport } from "../../engine/SceneTransport.ts";
export function useAudioResources() {
  const sound = useRef<SoundEngine>(null!);
  sound.current ??= new SoundEngine();
  const transport = useRef<SceneTransport>(null!);
  transport.current ??= new SceneTransport();
  useEffect(
    () => () => {
      sound.current.close();
      disposeGraphCompiler();
      transport.current.close();
    },
    [],
  );
  return { sound, transport, assetLibrary: transport.current.audio.assets };
}

export type EditorResources = ReturnType<typeof useAudioResources>;
