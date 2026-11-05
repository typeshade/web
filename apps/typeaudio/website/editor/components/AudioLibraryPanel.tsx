import type { Editor } from "../useEditor.ts";
import { SAMPLE_RATE } from "../../designer.ts";
import { type AudioAssetRef } from "../../audio-asset.ts";
import { Icon } from "./Panel.tsx";
import {
  openContext,
  useInteractions,
  type MenuItem,
} from "../interactions.tsx";
export function AudioLibraryPanel({ editor: e }: { editor: Editor }) {
  const { openMenu } = useInteractions();
  function items(a: AudioAssetRef): MenuItem[] {
    return [
      { label: "Audition audio", action: () => void e.auditionAudio(a) },
      {
        label: "Add at playhead",
        disabled: e.state.scene.cues.length >= 24,
        action: () => e.addAudioCue(a),
      },
      { label: "Export mono WAV…", action: () => void e.exportAudio(a) },
      { separator: true },
      {
        label: "Remove from browser",
        disabled: e.audioInUse(a.id),
        danger: true,
        action: () => void e.removeAudio(a.id),
      },
    ];
  }
  return (
    <div
      className="audio-library"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        if (event.dataTransfer.files.length !== 1) {
          e.setNotice("Import one audio file at a time.");
          return;
        }
        void e.importAudio(event.dataTransfer.files[0]!);
      }}
    >
      <button
        id="choose-audio"
        className="full"
        disabled={e.audioImporting}
        onClick={() => e.audioInput.current?.click()}
      >
        <Icon name="folder" />
        {e.audioImporting ? "Importing…" : "Import audio…"}
      </button>
      <p className="panel-hint">
        Drop an audio file here or on the timeline. Up to 30 s and 25 MB per
        file. Stereo is averaged to mono at 48 kHz.
      </p>
      <div className="asset-list">
        {e.audioAssets.map((a) => (
          <div className="audio-asset" key={a.id}>
            <button
              className="asset-row"
              data-audio-asset={a.id}
              draggable
              data-tooltip={`${a.name}. Click to audition; double-click or drag to add. Right-click for file actions.`}
              onClick={() => void e.auditionAudio(a)}
              onDoubleClick={() => e.addAudioCue(a)}
              onDragStart={(event) =>
                event.dataTransfer.setData(
                  "application/typeaudio-audio",
                  JSON.stringify(a),
                )
              }
              onContextMenu={(event) =>
                openContext(
                  event,
                  openMenu,
                  `audio-${a.id}`,
                  "Audio actions",
                  items(a),
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "ContextMenu" ||
                  (event.shiftKey && event.key === "F10")
                )
                  openContext(
                    event,
                    openMenu,
                    `audio-${a.id}`,
                    "Audio actions",
                    items(a),
                  );
              }}
            >
              <Icon name="sound" />
              <span>
                {a.name}
                <small>{(a.frames / SAMPLE_RATE).toFixed(2)} s · Mono</small>
              </span>
            </button>
            <button
              aria-label={`Add ${a.name} at playhead`}
              data-tooltip="Add this audio at the playhead."
              disabled={e.state.scene.cues.length >= 24}
              onClick={() => e.addAudioCue(a)}
            >
              +
            </button>
          </div>
        ))}
        {!e.audioAssets.length && (
          <p className="panel-hint">
            Import a recording to combine it with generated sounds.
          </p>
        )}
      </div>
      <p className="panel-hint">
        {e.audioAssets.length} / 24 files ·{" "}
        {(
          e.audioAssets.reduce((n, a) => n + a.frames, 0) / SAMPLE_RATE
        ).toFixed(1)}{" "}
        / 120 s stored
      </p>
      <p className="panel-hint">
        Files stay in this browser. Export project includes its audio. Remove
        unused files from the right-click menu; files in the composition or undo
        history stay protected.
      </p>
    </div>
  );
}
