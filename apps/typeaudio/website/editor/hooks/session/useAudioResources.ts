import { useEffect, useRef } from "react";
import { disposeGraphCompiler } from "../../../graph/compilationClient.ts";
import { SoundEngine } from "../../engine/SoundEngine.ts";
import { SceneTransport } from "../../engine/SceneTransport.ts";
import { ProjectPreview } from "../../projects/ProjectPreview.ts";
import { ProjectHistory } from "../../projects/ProjectHistory.ts";
export function useAudioResources() {
  const sound = useRef<SoundEngine>(null!);
  sound.current ??= new SoundEngine();
  const transport = useRef<SceneTransport>(null!);
  transport.current ??= new SceneTransport();
  const projectHistory = useRef<ProjectHistory>(null!);
  projectHistory.current ??= new ProjectHistory();
  const projectPreview = useRef<ProjectPreview>(null!);
  projectPreview.current ??= new ProjectPreview();
  useEffect(
    () => () => {
      projectPreview.current.stop();
      sound.current.close();
      disposeGraphCompiler();
      transport.current.close();
    },
    [],
  );
  return {
    sound,
    transport,
    assetLibrary: transport.current.audio.assets,
    projectHistory: projectHistory.current,
    projectPreview: projectPreview.current,
  };
}

export type EditorResources = ReturnType<typeof useAudioResources>;
