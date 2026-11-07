import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_RATE } from "../../../sound/constants.ts";
import { needsLiveRenderer } from "../../../sound-design.ts";
import { wav } from "../../../audio.ts";
import { download } from "../../shared/download.ts";
import { type Rendered } from "../../engine/SoundEngine.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
import { createLivePlayback } from "./createLivePlayback.ts";
import { createFiniteRender } from "./createFiniteRender.ts";
import { audioPatch } from "../../../sound/audioPatch.ts";
export function useSoundSession(
  { state, setNotice }: DocumentController,
  resources: EditorResources,
) {
  const { sound } = resources;
  const [mode, setModeState] = useState<"live" | "render">("live"),
    [preferredBackend, setBackend] = useState<"cpu" | "webgpu">("cpu");
  const cpuRenderRequired = needsLiveRenderer(state.patch),
    backend = cpuRenderRequired ? "cpu" : preferredBackend;
  const [live, setLive] = useState(false),
    [busy, setBusy] = useState(false),
    [renderCache, setRendered] = useState<Rendered & { patchKey: string }>(),
    [dry, setDry] = useState(false),
    [spectrum, setSpectrum] = useState(false),
    [repeat, setRepeat] = useState(true),
    [auto, setAuto] = useState(false),
    [renderLoop, setRenderLoop] = useState(false);

  const patchKey = JSON.stringify(audioPatch(state.patch)),
    rendered = renderCache?.patchKey === patchKey ? renderCache : undefined;
  const [meter, setMeter] = useState({ frames: 0, revision: 0 }),
    soundGeneration = useRef(0);
  const latest = useRef({ state, repeat, dry });
  latest.current = { state, repeat, dry };
  const stopSound = useCallback(() => {
    soundGeneration.current++;
    sound.current.stop();
    sound.current.cancelRender();
    setLive(false);
    setBusy(false);
  }, []);

  useEffect(() => {
    sound.current.update(state.patch, repeat, dry);
  }, [patchKey, repeat, dry]);
  const context = {
    state,
    setNotice,
    sound,
    latest,
    repeat,
    dry,
    backend,
    patchKey,
    renderLoop,
    stopSound,
    soundGeneration,
    setLive,
    setBusy,
    setMeter,
    setRendered,
  };
  const startLive = createLivePlayback(context),
    render = createFiniteRender(context);
  const renderRef = useRef(render);
  renderRef.current = render;
  useEffect(() => {
    if (!auto || mode !== "render" || state.workspace !== "sound") return;
    const timer = setTimeout(() => void renderRef.current(true), 400);
    return () => clearTimeout(timer);
  }, [auto, mode, patchKey, state.workspace]);
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
  function exportSound() {
    if (rendered)
      download(
        new Blob([wav(dry ? rendered.dry : rendered.wet, SAMPLE_RATE)], {
          type: "audio/wav",
        }),
        "typeaudio-sound.wav",
      );
  }
  return {
    mode,
    setMode,
    backend,
    setBackend,
    cpuRenderRequired,
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
    stopSound,
    startLive,
    render,
    exportSound,
    setLive,
  };
}
