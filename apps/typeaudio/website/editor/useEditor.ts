import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  DEFAULT,
  PRESETS,
  SAMPLE_RATE,
  validatePatch,
  type Patch,
} from "../designer.ts";
import {
  MAX_CUES,
  mixScene,
  validateScene,
  type Cue,
  type Scene,
} from "../video-model.ts";
import { wav } from "../audio.ts";
import { morphPatch } from "../exploration.ts";
import {
  initialDocument,
  reducer,
  SCENE_KEY,
  PATCH_KEY,
  updatePatch,
  updateScene,
  DOCUMENT_KEY,
  type Action,
  download,
  type Workspace,
} from "./model.ts";
import { SoundEngine, type Rendered } from "./engine/SoundEngine.ts";
import { SceneTransport } from "./engine/SceneTransport.ts";
export interface SavedSound {
  name: string;
  patch: Patch;
}
export function useEditor() {
  const [state, rawDispatch] = useReducer(reducer, undefined, () => ({
    ...initialDocument(),
    past: [],
    future: [],
    workspace: location.pathname.startsWith("/studio/video")
      ? ("picture" as const)
      : ("sound" as const),
    tool: "select" as const,
  }));
  const editVersion = useRef(0),
    projectRequest = useRef(0),
    patchRequest = useRef(0);
  const dispatch = useCallback((action: Action) => {
    if (
      ["edit", "open", "media", "undo", "redo", "select"].includes(action.type)
    )
      editVersion.current++;
    rawDispatch(action);
  }, []);
  const [notice, setNotice] = useState(
    "Ready. Choose a preset or import a video.",
  );
  const [saved, setSaved] = useState<SavedSound[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PATCH_KEY) || "[]")
        .slice(0, 30)
        .map((p: SavedSound) => ({
          name: String(p.name).slice(0, 40),
          patch: validatePatch(p.patch),
        }));
    } catch {
      return [];
    }
  });
  const [mode, setModeState] = useState<"live" | "render">("live"),
    [backend, setBackend] = useState<"cpu" | "webgpu">("cpu");
  const [live, setLive] = useState(false),
    [busy, setBusy] = useState(false),
    [renderCache, setRendered] = useState<Rendered & { patchKey: string }>(),
    [dry, setDry] = useState(false),
    [spectrum, setSpectrum] = useState(false),
    [repeat, setRepeat] = useState(true),
    [auto, setAuto] = useState(false),
    [renderLoop, setRenderLoop] = useState(false);
  const patchKey = JSON.stringify(state.patch);
  const rendered = renderCache?.patchKey === patchKey ? renderCache : undefined;
  const [morphState, setMorphState] = useState<{
    value: number;
    key: string;
  }>();
  const morphAmount =
    morphState?.key === patchKey ? morphState.value : undefined;
  const [meter, setMeter] = useState({ frames: 0, revision: 0 }),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [ready, setReady] = useState(false),
    [samples, setSamples] = useState(new Map<string, Float32Array>());
  const videoInput = useRef<HTMLInputElement>(null),
    patchInput = useRef<HTMLInputElement>(null);
  const [youtubeRequest, setYouTubeRequest] = useState<{
    url: string;
    id: number;
  }>();
  const [mediaUrl, setMediaUrl] = useState(""),
    [mediaLabel, setMediaLabel] = useState("Audio composition"),
    [mediaKind, setMediaKind] = useState<"none" | "file" | "youtube">("none");
  const sound = useRef<SoundEngine>(null!);
  sound.current ??= new SoundEngine();
  const mediaEpoch = useRef(0);
  const transport = useRef<SceneTransport>(null!);
  transport.current ??= new SceneTransport();
  const cueKey = JSON.stringify(state.scene.cues.map((c) => [c.id, c.patch]));
  const preparedKey = useRef("");
  const sceneReady = ready && preparedKey.current === cueKey;
  const latest = useRef({ state, samples, ready: sceneReady });
  latest.current = { state, samples, ready: sceneReady };
  const soundGeneration = useRef(0),
    looping = useRef(false),
    snapshots = useRef({ a: { ...DEFAULT }, b: { ...DEFAULT } });
  const stopSound = useCallback(() => {
    soundGeneration.current++;
    sound.current.stop();
    sound.current.cancelRender();
    setLive(false);
    setBusy(false);
  }, []);
  const stopScene = useCallback(() => {
    transport.current.stop();
    setPosition(transport.current.current());
    setPlaying(false);
  }, []);
  const workspace = useCallback(
    (next: Workspace) => {
      stopSound();
      stopScene();
      dispatch({ type: "workspace", workspace: next });
      history.pushState({}, "", next === "sound" ? "/" : "/studio/video/");
    },
    [stopSound, stopScene],
  );
  useEffect(() => {
    const fn = () => {
      stopSound();
      stopScene();
      dispatch({
        type: "workspace",
        workspace: location.pathname.startsWith("/studio/video")
          ? "picture"
          : "sound",
      });
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, [stopSound, stopScene]);
  useEffect(() => {
    try {
      localStorage.setItem(
        DOCUMENT_KEY,
        JSON.stringify({
          version: 1,
          scene: state.scene,
          source: state.source,
          selected: state.selected,
        }),
      );
      // Compatibility mirrors are not used to restore a partially written document.
      localStorage.setItem(SCENE_KEY, JSON.stringify(state.scene));
      localStorage.setItem(
        "typeaudio.editor.source.v1",
        JSON.stringify(state.source),
      );
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your project to keep it.",
      );
    }
  }, [state.scene, state.source, state.selected]);
  useEffect(() => {
    sound.current.update(state.patch, repeat, dry);
  }, [state.patch, repeat, dry]);
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
  }, [cueKey, state.workspace, stopScene]);
  useEffect(() => {
    transport.current.level(state.scene);
  }, [state.scene.original, state.scene.effects]);
  const playScene = useCallback(
    async (restart = false) => {
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
  useEffect(() => {
    const stop = () => {
      sound.current.stop();
      transport.current.stop();
      setLive(false);
      setPlaying(false);
    };
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      sound.current.close();
      transport.current.close();
    };
  }, []);
  function patch(changes: Partial<Patch>, name?: string) {
    setMorphState(undefined);
    dispatch({ type: "edit", edit: (d) => updatePatch(d, changes, name) });
  }
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
  function deleteCue() {
    const id = state.selected;
    scene((current) => ({
      ...current,
      cues: current.cues.filter((c) => c.id !== id),
    }));
  }
  function duplicate() {
    const id = crypto.randomUUID();
    stopScene();
    dispatch({
      type: "edit",
      edit: (d) => {
        const c = d.scene.cues.find((c) => c.id === d.selected);
        if (!c || d.scene.cues.length >= MAX_CUES) return d;
        return {
          ...d,
          selected: id,
          scene: {
            ...d.scene,
            cues: [
              ...d.scene.cues,
              {
                ...structuredClone(c),
                id,
                time: Math.min(3600, c.time + 0.25),
              },
            ],
          },
        };
      },
    });
  }
  async function startLive() {
    stopSound();
    const generation = soundGeneration.current;
    try {
      setBusy(true);
      await sound.current.start(
        state.patch,
        repeat,
        dry,
        (frames, revision) => setMeter({ frames, revision }),
        (message) => {
          stopSound();
          setNotice(message);
        },
      );
      if (generation !== soundGeneration.current) return;
      setLive(true);
      setBusy(false);
      setNotice("Live on CPU. Controls update the running sound.");
    } catch (error) {
      if (generation === soundGeneration.current) {
        setBusy(false);
        setNotice(String(error));
      }
    }
  }
  async function render(autoplay = false) {
    stopSound();
    const generation = soundGeneration.current;
    setRendered(undefined);
    setBusy(true);
    setNotice(`Rendering on ${backend === "cpu" ? "CPU" : "WebGPU"}…`);
    try {
      const result = await sound.current.render(state.patch, backend);
      if (generation !== soundGeneration.current) return;
      if (JSON.stringify(latest.current.state.patch) !== patchKey) {
        setBusy(false);
        setNotice("Sound changed. Render again to hear the current settings.");
        return;
      }
      setRendered({ ...result, patchKey });
      setBusy(false);
      setNotice(
        state.patch.lfoDepth
          ? "Render complete. Live modulation is excluded from this WAV."
          : "Render complete.",
      );
      if (autoplay)
        await sound.current.play(
          dry ? result.dry : result.wet,
          renderLoop,
          () => setNotice("Playback finished."),
        );
    } catch (error) {
      if (generation === soundGeneration.current) {
        setBusy(false);
        setNotice(String(error));
      }
    }
  }
  const renderRef = useRef(render);
  renderRef.current = render;
  useEffect(() => {
    if (!auto || mode !== "render" || state.workspace !== "sound") return;
    const timer = setTimeout(() => void renderRef.current(true), 400);
    return () => clearTimeout(timer);
  }, [auto, mode, state.patch, state.workspace]);
  function setMode(next: "live" | "render") {
    stopSound();
    setModeState(next);
    setAuto(false);
    setNotice(
      next === "live"
        ? "Ready for continuous live sound."
        : "Render a finite CPU or WebGPU clip.",
    );
  }
  function seek(at: number) {
    const was = transport.current.active();
    transport.current.seek(at);
    setPosition(at);
    if (was) void playScene();
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
  function detach() {
    mediaEpoch.current++;
    stopScene();
    transport.current.detach();
    setMediaUrl("");
    setMediaKind("none");
    setMediaLabel("Audio composition");
  }
  function loadFile(file: File) {
    detach();
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaKind("file");
    transport.current.kind = "file";
    setMediaLabel(file.name);
    dispatch({
      type: "media",
      media: { kind: "file", name: file.name.slice(0, 100) },
    });
  }
  useEffect(
    () => () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    },
    [mediaUrl],
  );
  async function openProject(file: File) {
    const request = ++projectRequest.current,
      version = editVersion.current;
    const current = () =>
      request === projectRequest.current && version === editVersion.current;
    try {
      if (file.size > 100000)
        throw new Error("Project files must be smaller than 100 KB.");
      const next = validateScene(JSON.parse(await file.text()));
      if (!current()) return;
      detach();
      dispatch({ type: "open", scene: next });
      transport.current.seek(next.start);
      setNotice(
        next.media.kind === "none"
          ? "Project opened."
          : `Project opened. Re-select media: ${next.media.name}`,
      );
    } catch (error) {
      if (current()) setNotice(`Import failed: ${String(error)}`);
    }
  }
  function savePatch() {
    const value = { name: state.patchName.trim(), patch: state.patch };
    if (!value.name) {
      setNotice("Name the sound before saving.");
      return;
    }
    const next = [value, ...saved.filter((p) => p.name !== value.name)].slice(
      0,
      30,
    );
    try {
      localStorage.setItem(PATCH_KEY, JSON.stringify(next));
      setSaved(next);
      setNotice("Sound saved in this browser.");
    } catch {
      setNotice("Storage unavailable. Export the patch instead.");
    }
  }
  async function importPatch(file: File) {
    const request = ++patchRequest.current,
      version = editVersion.current;
    const current = () =>
      request === patchRequest.current && version === editVersion.current;
    try {
      if (file.size > 20000)
        throw new Error("Patch files must be smaller than 20 KB.");
      const p = JSON.parse(await file.text());
      if (!current()) return;
      if (p.version !== 1) throw new Error("Unsupported patch version.");
      patch(
        validatePatch(p.patch),
        String(p.name || "Imported patch").slice(0, 40),
      );
      setNotice("Patch imported.");
    } catch (error) {
      if (current()) setNotice(`Import failed: ${String(error)}`);
    }
  }
  function exportScene() {
    if (!sceneReady) return;
    const result = mixScene(state.scene, samples, SAMPLE_RATE);
    download(
      new Blob([wav(result.pcm, SAMPLE_RATE)], { type: "audio/wav" }),
      "typeaudio-effects.wav",
    );
    setNotice(
      `Exported effects only. Original audio is excluded.${result.peak > 1 ? " Clipping detected; lower Effects level." : ""}`,
    );
  }
  function exportSound() {
    if (rendered)
      download(
        new Blob([wav(dry ? rendered.dry : rendered.wet, SAMPLE_RATE)], {
          type: "audio/wav",
        }),
        "typeaudio-sound.wav",
      );
  }
  function randomize() {
    patch(
      {
        ...DEFAULT,
        shapeA: Math.floor(Math.random() * 4),
        shapeB: Math.floor(Math.random() * 4),
        frequency: [65.4, 110, 220, 440][Math.floor(Math.random() * 4)],
        cutoff: Math.round(500 + Math.random() * 5500),
        resonance: Math.round((0.6 + Math.random() * 2.5) * 10) / 10,
        blend: Math.random(),
        reverb: Math.random() > 0.5,
        delay: Math.random() > 0.5,
      },
      "Random sound",
    );
  }
  function snapshot(action: "store" | "recall", slot: "a" | "b") {
    if (action === "store") {
      snapshots.current[slot] = { ...state.patch };
      setNotice(`Stored variation ${slot.toUpperCase()}.`);
    } else {
      patch({ ...snapshots.current[slot] });
      setMorphState({
        value: slot === "a" ? 0 : 1,
        key: JSON.stringify(snapshots.current[slot]),
      });
    }
  }
  const selected = state.scene.cues.find((c) => c.id === state.selected);
  return {
    mediaEpoch,
    videoInput,
    patchInput,
    youtubeRequest,
    loadYouTube: (url: string) => setYouTubeRequest({ url, id: Date.now() }),
    state,
    dispatch,
    notice,
    setNotice,
    saved,
    mode,
    setMode,
    backend,
    setBackend,
    live,
    busy,
    rendered,
    dry,
    setDry,
    spectrum,
    setSpectrum,
    repeat,
    setRepeat,
    auto,
    setAuto,
    renderLoop,
    setRenderLoop,
    meter,
    playing,
    position,
    ready: sceneReady,
    samples,
    mediaUrl,
    mediaLabel,
    mediaKind,
    setMediaKind,
    setMediaLabel,
    sound: sound.current,
    transport: transport.current,
    workspace,
    stopSound,
    stopScene,
    playScene,
    finishScene,
    patch,
    scene,
    cue,
    addCue,
    deleteCue,
    duplicate,
    startLive,
    render,
    seek,
    setRange,
    fitDuration,
    detach,
    loadFile,
    openProject,
    savePatch,
    importPatch,
    exportScene,
    exportSound,
    randomize,
    snapshot,
    selected,
    morphAmount,
    morph: (t: number) => {
      const next = morphPatch(snapshots.current.a, snapshots.current.b, t);
      patch(next);
      setMorphState({ value: t, key: JSON.stringify(next) });
    },
    undo: () => {
      stopScene();
      dispatch({ type: "undo" });
    },
    redo: () => {
      stopScene();
      dispatch({ type: "redo" });
    },
    presets: PRESETS,
  };
}
export type Editor = ReturnType<typeof useEditor>;
