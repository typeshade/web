import { PRESETS } from "../sound/presets.ts";
import { RECIPES } from "../sound-recipes.ts";
import { useEditorDocument } from "./hooks/document/useEditorDocument.ts";
import { useAudioResources } from "./hooks/session/useAudioResources.ts";
import { useWorkspaceNavigation } from "./hooks/session/useWorkspaceNavigation.ts";
import { usePageLifecycle } from "./hooks/session/usePageLifecycle.ts";
import { useSoundSession } from "./hooks/sound/useSoundSession.ts";
import { useLiveRecording } from "./hooks/sound/useLiveRecording.ts";
import { createPatchActions } from "./hooks/sound/createPatchActions.ts";
import { useSoundCreation } from "./hooks/sound/useSoundCreation.ts";
import { useSoundVariations } from "./hooks/sound/useSoundVariations.ts";
import { useSoundLibrary } from "./hooks/sound/useSoundLibrary.ts";
import { useAudioLibrary } from "./hooks/assets/useAudioLibrary.ts";
import { useSceneSession } from "./hooks/picture/useSceneSession.ts";
import { createSceneActions } from "./hooks/picture/createSceneActions.ts";
import { useClipActions } from "./hooks/picture/useClipActions.ts";
import { useMediaSource } from "./hooks/media/useMediaSource.ts";
import { useProjectFiles } from "./hooks/project/useProjectFiles.ts";
import { useAudioImport } from "./hooks/assets/useAudioImport.ts";
import { useAudioAssetPlayback } from "./hooks/assets/useAudioAssetPlayback.ts";
/** Composes feature controllers around one authoritative document and one audio resource owner. */
export function useEditor() {
  const document = useEditorDocument(),
    resources = useAudioResources();
  const { state, dispatch, notice, setNotice } = document;
  const sound = useSoundSession(document, resources),
    library = useAudioLibrary(document, resources);
  const scene = useSceneSession(document, resources, library.audioRevision);
  const workspace = useWorkspaceNavigation(
    document,
    sound.stopSound,
    scene.stopScene,
  );
  const patches = createPatchActions(document),
    scenes = createSceneActions(document, resources, scene);
  const clips = useClipActions(document, resources, scene, scenes, workspace);
  const media = useMediaSource(document, resources, scene.stopScene);
  const projects = useProjectFiles(
    document,
    resources,
    media,
    library.setAudioRevision,
  );
  const imports = useAudioImport(
    document,
    resources,
    library.setAudioRevision,
    workspace,
  );
  const assets = useAudioAssetPlayback(
    document,
    resources,
    scene,
    sound.stopSound,
  );
  const recording = useLiveRecording(resources, setNotice);
  const creation = useSoundCreation(
    document,
    patches,
    sound.stopSound,
    workspace,
  );
  const variations = useSoundVariations(document, patches);
  const sounds = useSoundLibrary(document, patches);
  usePageLifecycle(
    resources,
    scene.sceneAction,
    sound.setLive,
    scene.setPlaying,
  );
  const { setLive, ...soundApi } = sound;
  const { latest, sceneAction, setPlaying, sceneReady, ...sceneApi } = scene;
  const { audioRevision, setAudioRevision, ...libraryApi } = library;
  return {
    state,
    dispatch,
    notice,
    setNotice,
    workspace,
    ...soundApi,
    ...sceneApi,
    ...libraryApi,
    ...patches,
    ...scenes,
    ...clips,
    ...media,
    ...projects,
    ...imports,
    ...assets,
    ...recording,
    ...creation,
    ...variations,
    ...sounds,
    ready: sceneReady,
    sound: resources.sound.current,
    transport: resources.transport.current,
    presets: PRESETS,
    recipes: RECIPES,
    beginEdit: () => dispatch({ type: "begin" }),
    endEdit: () => dispatch({ type: "commit" }),
    cancelEdit: () => dispatch({ type: "cancel" }),
    undo: () => {
      scene.stopScene();
      dispatch({ type: "undo" });
    },
    redo: () => {
      scene.stopScene();
      dispatch({ type: "redo" });
    },
  };
}
export type Editor = ReturnType<typeof useEditor>;
