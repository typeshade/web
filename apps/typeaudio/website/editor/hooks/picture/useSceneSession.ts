import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_RATE } from "../../../sound/constants.ts";
import { cueRange, mixScene } from "../../../video-model.ts";
import { wav } from "../../../audio.ts";
import { stereoWav } from "../../../scene/stereoWav.ts";
import { sceneRenderKey } from "../../../scene/sceneRenderKey.ts";
import { download } from "../../shared/download.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
export function useSceneSession(
  { state, setNotice }: DocumentController,
  { transport }: EditorResources,
  audioRevision: number,
) {
  const [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [ready, setReady] = useState(false),
    [samples, setSamples] = useState(new Map<string, Float32Array>());
  const cueKey = sceneRenderKey(state.scene),
    preparedKey = useRef("");
  const sceneReady = ready && preparedKey.current === cueKey,
    latest = useRef({ state, samples, ready: sceneReady });
  latest.current = { state, samples, ready: sceneReady };
  const sceneAction = useRef(0),
    looping = useRef(false);
  const stopScene = useCallback(() => {
    sceneAction.current++;
    transport.current.stop();
    setPosition(transport.current.current());
    setPlaying(false);
  }, []);

  useEffect(() => {
    let active = true;
    stopScene();
    setReady(false);
    if (state.workspace !== "picture") return;
    void transport.current.audio
      .prepare(state.scene)
      .then((next) => {
        if (active) {
          preparedKey.current = cueKey;
          setSamples(next);
          setReady(true);
        }
      })
      .catch((error) => {
        if (active) setNotice(String(error));
      });
    return () => {
      active = false;
    };
  }, [cueKey, state.workspace, stopScene, audioRevision]);
  useEffect(() => {
    transport.current.level(state.scene);
  }, [state.scene.original, state.scene.effects]);
  const playScene = useCallback(
    async (restart = false) => {
      sceneAction.current++;
      try {
        if (!latest.current.ready)
          throw new Error("Wait for sound clips to prepare.");
        await transport.current.play(latest.current.state.scene, restart);
        setPlaying(true);
        setNotice("Playing composition.");
      } catch (error) {
        stopScene();
        setNotice(String(error));
      }
    },
    [stopScene],
  );
  const finishScene = useCallback(() => {
    if (looping.current) return;
    stopScene();
    const scene = latest.current.state.scene;
    if (scene.loop) {
      looping.current = true;
      void playScene(true).finally(() => {
        looping.current = false;
      });
    } else {
      transport.current.seek(scene.end);
      setNotice("Composition finished.");
    }
  }, [playScene, stopScene]);

  useEffect(() => {
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      const l = latest.current;
      if (l.state.workspace === "picture") {
        if (transport.current.tick(l.state.scene, l.samples, l.ready))
          finishScene();
        if (now - last > 32) {
          setPosition(transport.current.current());
          setPlaying(transport.current.active());
          last = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [finishScene]);
  function seek(at: number) {
    const was = transport.current.active();
    transport.current.seek(at);
    setPosition(at);
    if (was) void playScene();
  }
  async function auditionCue(id: string) {
    stopScene();
    const generation = sceneAction.current;
    try {
      await transport.current.audio.unlock();
      const current = latest.current,
        cue = current.state.scene.cues.find((c) => c.id === id),
        pcm = current.samples.get(id);
      if (generation !== sceneAction.current || !current.ready || !cue || !pcm)
        return;
      transport.current.audio.schedule(
        {
          ...current.state.scene,
          space: undefined,
          start: 0,
          end: cueRange(cue, pcm.length / SAMPLE_RATE).duration,
          cues: [{ ...cue, time: 0, muted: false }],
        },
        current.samples,
        0,
      );
      setNotice(current.state.scene.space ? "Auditioning the selected source without the scene room." : "Auditioning selected clip.");
    } catch (error) {
      if (generation === sceneAction.current) setNotice(String(error));
    }
  }
  function exportScene() {
    if (!sceneReady) return;
    if (state.scene.space) {
      const pcm = transport.current.audio.spatial.read(state.scene);
      if (!pcm) return;
      download(new Blob([stereoWav(pcm, state.scene.effects)], { type: "audio/wav" }), "typeaudio-effects-stereo.wav");
      setNotice(`Exported the stereo effects composition.${pcm.peak * state.scene.effects > 1 ? " Clipping detected; lower Effects level." : ""}`);
      return;
    }
    const result = mixScene(state.scene, samples, SAMPLE_RATE);
    download(
      new Blob([wav(result.pcm, SAMPLE_RATE)], { type: "audio/wav" }),
      "typeaudio-effects.wav",
    );
    setNotice(
      `Exported effects only. Original audio is excluded.${result.peak > 1 ? " Clipping detected; lower Effects level." : ""}`,
    );
  }
  return {
    playing,
    position,
    sceneReady,
    samples,
    stopScene,
    playScene,
    finishScene,
    seek,
    auditionCue,
    exportScene,
    sceneAction,
    latest,
    setPlaying,
  };
}

export type SceneSession = ReturnType<typeof useSceneSession>;
