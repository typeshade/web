import {
  MAX_CUES,
  validateScene,
  type Cue,
  type Scene,
} from "../../../video-model.ts";
import { updateScene } from "../../state/documentUpdates.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
import type { SavedSound } from "../../state/types.ts";
import type { SceneSession } from "./useSceneSession.ts";
export function createSceneActions(
  { state, dispatch, latest, setNotice }: DocumentController,
  { transport }: EditorResources,
  { stopScene }: SceneSession,
) {
  function scene(edit: (current: Scene) => Scene, record = true, pause = true) {
    if (pause) stopScene();
    dispatch({ type: "edit", edit: (d) => updateScene(d, edit), record });
  }
  function cue(edit: (cue: Cue) => Cue, id = state.selected) {
    scene((current) => ({
      ...current,
      cues: current.cues.map((c) => (c.id === id ? edit(c) : c)),
    }));
  }
  function setRange(changes: Partial<Pick<Scene, "start" | "end">>) {
    try {
      const duration = transport.current.duration();
      const next = { ...latest.current.state.scene, ...changes };
      if (duration > 0 && next.end > duration)
        throw new Error("The range must fit inside the video.");
      validateScene(next);
      scene((current) => ({ ...current, ...changes }));
    } catch (error) {
      setNotice(String(error));
    }
  }
  function fitDuration(duration: number, media?: Scene["media"]) {
    if (!Number.isFinite(duration) || duration < 0.05) {
      setNotice(
        "Choose a video with a finite duration of at least 0.05 seconds.",
      );
      return;
    }
    scene((current) => {
      const start = current.start >= duration ? 0 : current.start;
      const end =
        current.start >= duration
          ? Math.min(10, duration)
          : Math.min(current.end, duration);
      return { ...current, start, end, media: media || current.media };
    });
  }
  function addCue(value?: SavedSound) {
    const id = crypto.randomUUID(),
      time =
        Math.round(Math.min(3600, transport.current.current()) * 1000) / 1000;
    stopScene();
    dispatch({
      type: "edit",
      edit: (d) => {
        if (d.scene.cues.length >= MAX_CUES) return d;
        const source = value || { name: d.patchName, patch: d.patch };
        return {
          ...d,
          selected: id,
          selection: [id],
          scene: {
            ...d.scene,
            cues: [
              ...d.scene.cues,
              {
                id,
                name: source.name,
                patch: { ...source.patch },
                gain: 0.7,
                muted: false,
                time,
              },
            ],
          },
        };
      },
    });
    setNotice("Sound clip added at playhead.");
  }
  return { scene, cue, setRange, fitDuration, addCue };
}

export type SceneActions = ReturnType<typeof createSceneActions>;
