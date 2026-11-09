import type { Editor } from "../../../useEditor.ts";
import { Icon } from "../../atoms/Icon.tsx";

export function SoundTransportControls({ editor: e }: { editor: Editor }) {
  return (
    <>
      <button
        id="live-start"
        className={`icon-button ${e.live ? "active" : ""}`}
        aria-label={
          e.mode === "live" ? "Start live audio" : "Play rendered audio"
        }
        disabled={e.busy || (e.mode === "render" && !e.rendered)}
        onClick={() => {
          if (e.mode === "live") void e.startLive();
          else if (e.rendered)
            void e.sound.play(
              e.dry ? e.rendered.dry : e.rendered.wet,
              e.renderLoop,
              () => e.setNotice("Playback finished."),
            );
        }}
      >
        <Icon name="play" />
      </button>
      <button
        id="live-stop"
        className="icon-button"
        aria-label="Stop audio"
        onClick={() => {
          e.stopSound();
          e.setNotice("Audio stopped.");
        }}
      >
        <Icon name="stop" />
      </button>
      <button
        id="live-retrigger"
        disabled={!e.live}
        onClick={() => e.sound.live?.retrigger()}
      >
        Retrigger
      </button>
      <label className="check">
        <input
          id="live-repeat"
          type="checkbox"
          checked={e.repeat}
          onChange={(event) => e.setRepeat(event.target.checked)}
        />
        Repeat
      </label>
      <div className="segmented modes">
        <button
          id="mode-live"
          aria-pressed={e.mode === "live"}
          onClick={() => e.setMode("live")}
        >
          Live
        </button>
        <button
          id="mode-render"
          aria-pressed={e.mode === "render"}
          onClick={() => e.setMode("render")}
        >
          Render
        </button>
      </div>
    </>
  );
}
