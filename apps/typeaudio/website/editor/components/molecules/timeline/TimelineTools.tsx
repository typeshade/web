import type { Editor } from "../../../useEditor.ts";
import { Icon } from "../../atoms/Icon.tsx";

export function TimelineTools({ editor: e }: { editor: Editor }) {
  const scene = e.state.scene;
  return (
    <div className="timeline-tools">
      <button
        id="add-cue"
        className="subtle"
        disabled={scene.cues.length >= 24}
        onClick={() => e.addCue()}
      >
        <Icon name="plus" />
        Add sound at playhead
      </button>
      <button
        id="timeline-import-audio"
        disabled={e.audioImporting}
        onClick={() => e.audioInput.current?.click()}
        data-tooltip="Import an audio file at the playhead. WAV, MP3, Ogg and FLAC depend on browser support."
      >
        Import audio…
      </button>
      <button
        id="split-cue"
        disabled={!e.selectedIds.length}
        data-tooltip="Split selected clips at the playhead. Ctrl/⌘ Shift D."
        onClick={() => e.splitClips()}
      >
        Split
      </button>
      <span className="mono">
        {scene.cues.length} / 24 layers
        {e.selectedIds.length > 1 ? ` · ${e.selectedIds.length} selected` : ""}
      </span>
      <div className="range-inputs">
        <label>
          In
          <input
            id="range-in"
            type="number"
            min="0"
            max="3600"
            step=".01"
            value={scene.start}
            onChange={(event) =>
              e.setRange({ start: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Out
          <input
            id="range-out"
            type="number"
            min=".05"
            max="3600"
            step=".01"
            value={scene.end}
            onChange={(event) =>
              e.setRange({ end: Number(event.target.value) })
            }
          />
        </label>
        <label className="check">
          <input
            id="loop"
            type="checkbox"
            checked={scene.loop}
            onChange={(event) => {
              const loop = event.target.checked;
              e.scene((current) => ({ ...current, loop }));
            }}
          />
          Loop
        </label>
      </div>
    </div>
  );
}
