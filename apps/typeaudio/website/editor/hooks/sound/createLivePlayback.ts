import { type Patch } from "../../../sound/types.ts";
import type { SoundPlaybackContext } from "./playbackTypes.ts";
export function createLivePlayback(context: SoundPlaybackContext) {
  const {
    stopSound,
    soundGeneration,
    setBusy,
    sound,
    state,
    repeat,
    dry,
    setMeter,
    setNotice,
    latest,
    setLive,
  } = context;
  async function startLive(override?: Patch) {
    stopSound();
    const generation = soundGeneration.current;
    let warnedInvalid = false;
    try {
      setBusy(true);
      await sound.current.start(
        override ?? state.patch,
        repeat,
        dry,
        (frames, revision, invalidSamples) => {
          setMeter({ frames, revision });
          if (invalidSamples && !warnedInvalid)
            setNotice(
              "Graph produced non-finite samples; those samples were silenced. Check division, sqrt and pow in Code nodes.",
            );
          warnedInvalid = invalidSamples > 0;
        },
        (message) => {
          stopSound();
          setNotice(message);
        },
      );
      if (generation !== soundGeneration.current) return;
      sound.current.update(
        latest.current.state.patch,
        latest.current.repeat,
        latest.current.dry,
      );
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
  return startLive;
}
