import type { SoundPlaybackContext } from "./playbackTypes.ts";
import { audioPatch } from "../../../sound/audioPatch.ts";
export function createFiniteRender(context: SoundPlaybackContext) {
  const {
    stopSound,
    soundGeneration,
    setRendered,
    setBusy,
    setNotice,
    backend,
    sound,
    state,
    latest,
    patchKey,
    dry,
    renderLoop,
  } = context;
  async function render(autoplay = false) {
    stopSound();
    const generation = soundGeneration.current;
    setRendered(undefined);
    setBusy(true);
    setNotice(`Rendering on ${backend === "cpu" ? "CPU" : "WebGPU"}…`);
    try {
      const result = await sound.current.render(state.patch, backend);
      if (generation !== soundGeneration.current) return;
      if (JSON.stringify(audioPatch(latest.current.state.patch)) !== patchKey) {
        setBusy(false);
        setNotice("Sound changed. Render again to hear the current settings.");
        return;
      }
      setRendered({ ...result, patchKey });
      setBusy(false);
      setNotice(
        result.peak > 1
          ? "Render complete. Clipping detected; lower layer output levels."
          : "Render complete. Modulation and automation are included.",
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
  return render;
}
