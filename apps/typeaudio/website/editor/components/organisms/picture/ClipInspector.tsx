import { cueRange } from "../../../../video-model.ts";
import { trimClip, MIN_CLIP } from "../../../clip-edit.ts";
import type { Editor } from "../../../useEditor.ts";
import { useEffect, useRef } from "react";
import { Panel } from "../../molecules/Panel.tsx";
import { Icon } from "../../atoms/Icon.tsx";
import { Mixer } from "./Mixer.tsx";
export function ClipInspector({ editor: e }: { editor: Editor }) {
  const c = e.selected;
  const range = c ? cueRange(c, e.sourceDuration(c)) : undefined;
  const name = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (e.renameRequest?.id === c?.id) {
      name.current?.focus();
      name.current?.select();
    }
  }, [e.renameRequest, c?.id]);
  return (
    <>
      <Panel title="Properties" className="clip-properties">
        {c ? (
          <>
            <div className="selected-object">
              <Icon name="sound" />
              <span>
                {c.name}
                <small>
                  {e.selectedIds.length > 1
                    ? `Active clip · ${e.selectedIds.length} selected`
                    : c.audio
                      ? "Imported audio"
                      : "Audio layer"}
                </small>
              </span>
            </div>
            <label>
              Name
              <input
                id="cue-name"
                ref={name}
                value={c.name}
                maxLength={100}
                onChange={(event) => {
                  const name = event.target.value;
                  e.cue((c) => ({ ...c, name }));
                }}
              />
            </label>
            {c.audio && (
              <div className="property-section">
                <h3>Audio source</h3>
                <p className="audio-source-name">{c.audio.name}</p>
                <p className="panel-hint">
                  Mono · 48 kHz · Source audio is included when you export the
                  project.
                </p>
                {!e.audioAssets.some((a) => a.id === c.audio!.id) && (
                  <p className="panel-hint">
                    Source unavailable in this browser. Import the original file
                    or reopen a project with embedded audio.
                  </p>
                )}
                <button
                  disabled={e.audioImporting}
                  onClick={() => e.audioInput.current?.click()}
                >
                  Import audio…
                </button>
              </div>
            )}
            <div className="property-section">
              <h3>Timing</h3>
              <label className="inline-property">
                Start
                <input
                  id="cue-time"
                  type="number"
                  min="0"
                  max="3600"
                  step=".01"
                  value={c.time}
                  onChange={(event) => {
                    const v = Number(event.target.value);
                    if (v >= 0 && v <= 3600) e.cue((c) => ({ ...c, time: v }));
                  }}
                />
              </label>
              <button
                id="cue-to-playhead"
                onClick={() =>
                  e.cue((c) => ({
                    ...c,
                    time: Math.round(e.position * 1000) / 1000,
                  }))
                }
              >
                Move to playhead
              </button>
              <p className="panel-hint">
                {range!.duration.toFixed(3)} s from a{" "}
                {e.sourceDuration(c).toFixed(3)} s source
                {c.audio ? "." : ", including effect tails."}
              </p>
            </div>
            <div className="property-section">
              <h3>Trim & fades</h3>
              {(["in", "out"] as const).map((edge) => (
                <label className="inline-property" key={edge}>
                  Source {edge}
                  <input
                    id={`cue-source-${edge}`}
                    type="number"
                    min={edge === "in" ? 0 : range!.start + MIN_CLIP}
                    max={
                      edge === "in"
                        ? range!.end - MIN_CLIP
                        : e.sourceDuration(c)
                    }
                    step=".01"
                    value={Number(
                      (edge === "in" ? range!.start : range!.end).toFixed(5),
                    )}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value))
                        e.cue((current) =>
                          trimClip(
                            current,
                            edge,
                            current.time +
                              value -
                              cueRange(current, e.sourceDuration(current))
                                .start,
                            e.sourceDuration(current),
                          ),
                        );
                    }}
                  />
                </label>
              ))}
              {(["fadeIn", "fadeOut"] as const).map((key) => (
                <label className="inline-property" key={key}>
                  {key === "fadeIn" ? "Fade in" : "Fade out"}
                  <input
                    id={`cue-${key}`}
                    type="number"
                    min="0"
                    max={60}
                    step=".01"
                    value={Number((c[key] ?? 0).toFixed(5))}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value >= 0)
                        e.cue((current) => ({
                          ...current,
                          [key]: Math.min(60, value),
                          fadeAnchor: undefined,
                        }));
                    }}
                  />
                </label>
              ))}
              <p className="panel-hint">
                Times are in seconds. Trimming keeps the original sound
                available.
              </p>
              {c.fadeAnchor && (
                <p className="panel-hint">
                  Fades continue across the split. Adjust a fade to start a new
                  envelope on this piece.
                </p>
              )}
              <div className="button-row">
                <button onClick={() => e.resetTrim([c.id])}>Reset trim</button>
                <button onClick={() => e.resetFades([c.id])}>
                  Reset fades
                </button>
              </div>
            </div>
            <div className="property-section">
              <h3>Audio</h3>
              <label className="parameter">
                Level<output>{Math.round(c.gain * 100)}%</output>
                <input
                  id="cue-gain"
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={c.gain}
                  onChange={(event) => {
                    const gain = Number(event.target.value);
                    e.cue((c) => ({ ...c, gain }));
                  }}
                />
              </label>
              <label className="check">
                <input
                  id="cue-muted"
                  type="checkbox"
                  checked={c.muted}
                  onChange={(event) => {
                    const muted = event.target.checked;
                    e.cue((c) => ({ ...c, muted }));
                  }}
                />
                Mute layer
              </label>
              {!c.audio && (
                <>
                  <button
                    id="edit-cue-sound"
                    className="full"
                    onClick={() => e.workspace("sound")}
                  >
                    Edit sound <Icon name="sound" />
                  </button>
                  <p className="panel-hint">
                    Edits in Sound workspace update this layer.
                  </p>
                </>
              )}
            </div>
            {e.selectedIds.length > 1 && (
              <p className="panel-hint">
                Properties above edit the active clip. Duplicate and Delete
                apply to all {e.selectedIds.length} selected layers.
              </p>
            )}
            <div className="button-row">
              <button
                id="audition"
                disabled={!e.ready}
                onClick={() => void e.auditionCue(c.id)}
              >
                Audition
              </button>
              <button
                id="duplicate"
                disabled={e.state.scene.cues.length + e.selectedIds.length > 24}
                onClick={e.duplicate}
              >
                Duplicate
              </button>
              <button id="delete-cue" onClick={e.deleteCue}>
                Delete
              </button>
            </div>
          </>
        ) : (
          <div className="inspector-empty">
            <Icon name="select" />
            <p>Select a sound layer to edit its properties.</p>
          </div>
        )}
      </Panel>
      <Mixer editor={e} />
    </>
  );
}
