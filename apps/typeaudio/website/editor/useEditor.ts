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
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...initialDocument(),
    past: [],
    future: [],
    workspace: location.pathname.startsWith("/studio/video")
      ? ("picture" as const)
      : ("sound" as const),
    tool: "select" as const,
  }));
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
    [rendered, setRendered] = useState<Rendered>(),
    [dry, setDry] = useState(false),
    [spectrum, setSpectrum] = useState(false),
    [repeat, setRepeat] = useState(true),
    [auto, setAuto] = useState(false),
    [renderLoop, setRenderLoop] = useState(false);
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
  const transport = useRef<SceneTransport>(null!);
  transport.current ??= new SceneTransport();
  const latest = useRef({ state, samples, ready });
  latest.current = { state, samples, ready };
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
      localStorage.setItem(SCENE_KEY, JSON.stringify(state.scene));
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your project to keep it.",
      );
    }
  }, [state.scene]);
  useEffect(() => {
    sound.current.update(state.patch, repeat, dry);
  }, [state.patch, repeat, dry]);
  useEffect(() => {
    if (!state.selected)
      try {
        localStorage.setItem(
          "typeaudio.editor.source.v1",
          JSON.stringify({ name: state.patchName, patch: state.patch }),
        );
      } catch {}
  }, [state.patch, state.patchName, state.selected]);
  const cueKey = JSON.stringify(state.scene.cues.map((c) => [c.id, c.patch]));
  useEffect(() => {
    let active = true;
    stopScene();
    setReady(false);
    if (state.workspace !== "picture") return;
    void transport.current.audio
      .prepare(state.scene)
      .then((next) => {
        if (active) {
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
  function patch(next: Patch, name = state.patchName) {
    dispatch({ type: "edit", edit: (d) => updatePatch(d, next, name) });
  }
  function scene(next: Scene, record = true) {
    if (
      next.cues !== state.scene.cues ||
      next.start !== state.scene.start ||
      next.end !== state.scene.end ||
      next.loop !== state.scene.loop
    )
      stopScene();
    dispatch({
      type: "edit",
      edit: (d) => {
        const scene = validateScene(next),
          c = scene.cues.find((c) => c.id === d.selected);
        return {
          ...d,
          scene,
          ...(c ? { patch: { ...c.patch }, patchName: c.name } : {}),
        };
      },
      record,
    });
  }
  function cue(edit: (cue: Cue) => Cue) {
    scene({
      ...state.scene,
      cues: state.scene.cues.map((c) =>
        c.id === state.selected ? edit(c) : c,
      ),
    });
  }
  function addCue(
    value: SavedSound = { name: state.patchName, patch: state.patch },
  ) {
    if (state.scene.cues.length >= MAX_CUES) {
      setNotice("A composition can contain at most 24 clips.");
      return;
    }
    const id = crypto.randomUUID();
    const next = {
      ...state.scene,
      cues: [
        ...state.scene.cues,
        {
          id,
          name: value.name,
          patch: { ...value.patch },
          gain: 0.7,
          muted: false,
          time:
            Math.round(Math.min(3600, transport.current.current()) * 1000) /
            1000,
        },
      ],
    };
    scene(next);
    dispatch({ type: "select", id });
    setNotice("Sound clip added at playhead.");
  }
  function deleteCue() {
    scene({
      ...state.scene,
      cues: state.scene.cues.filter((c) => c.id !== state.selected),
    });
    dispatch({ type: "select", id: "" });
  }
  function duplicate() {
    const c = state.scene.cues.find((c) => c.id === state.selected);
    if (!c) return;
    if (state.scene.cues.length >= MAX_CUES) {
      setNotice("A composition can contain at most 24 clips.");
      return;
    }
    const id = crypto.randomUUID();
    scene({
      ...state.scene,
      cues: [
        ...state.scene.cues,
        { ...structuredClone(c), id, time: Math.min(3600, c.time + 0.25) },
      ],
    });
    dispatch({ type: "select", id });
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
      setRendered(result);
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
  function setRange(start: number, end: number) {
    try {
      if (
        transport.current.duration() > 0 &&
        end > transport.current.duration()
      )
        throw new Error("The range must fit inside the video.");
      scene({ ...state.scene, start, end });
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
    const old = latest.current.state.scene;
    let start = old.start,
      end = old.end;
    if (start >= duration) {
      start = 0;
      end = Math.min(10, duration);
    } else end = Math.min(end, duration);
    scene({ ...old, start, end, media: media || old.media });
  }
  function detach() {
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
      type: "open",
      scene: {
        ...state.scene,
        media: { kind: "file", name: file.name.slice(0, 100) },
      },
    });
  }
  useEffect(
    () => () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    },
    [mediaUrl],
  );
  async function openProject(file: File) {
    try {
      if (file.size > 100000)
        throw new Error("Project files must be smaller than 100 KB.");
      const next = validateScene(JSON.parse(await file.text()));
      detach();
      dispatch({ type: "open", scene: next });
      transport.current.seek(next.start);
      setNotice(
        next.media.kind === "none"
          ? "Project opened."
          : `Project opened. Re-select media: ${next.media.name}`,
      );
    } catch (error) {
      setNotice(`Import failed: ${String(error)}`);
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
    try {
      if (file.size > 20000)
        throw new Error("Patch files must be smaller than 20 KB.");
      const p = JSON.parse(await file.text());
      if (p.version !== 1) throw new Error("Unsupported patch version.");
      patch(
        validatePatch(p.patch),
        String(p.name || "Imported patch").slice(0, 40),
      );
      setNotice("Patch imported.");
    } catch (error) {
      setNotice(`Import failed: ${String(error)}`);
    }
  }
  function exportScene() {
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
    } else patch({ ...snapshots.current[slot] });
  }
  const selected = state.scene.cues.find((c) => c.id === state.selected);
  return {
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
    ready,
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
    morph: (t: number) =>
      patch(morphPatch(snapshots.current.a, snapshots.current.b, t)),
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
