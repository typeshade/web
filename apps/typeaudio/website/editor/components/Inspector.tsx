import type { Editor } from "../useEditor.ts";
import { useEffect, useRef } from "react";
import { Panel, Icon } from "./Panel.tsx";
export function Inspector({ editor: e }: { editor: Editor }) {
  const c = e.selected;
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
                <small>Audio layer</small>
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
                {((e.samples.get(c.id)?.length || 0) / 48000).toFixed(2)} s
                including rendered effect tails.
              </p>
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
            </div>
            <div className="button-row">
              <button
                id="audition"
                disabled={!e.ready}
                onClick={() => void e.auditionCue(c.id)}
              >
                Audition
              </button>
              <button id="duplicate" onClick={e.duplicate}>
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
export function Mixer({ editor: e }: { editor: Editor }) {
  return (
    <Panel title="Audio mix" className="mixer-panel">
      {(["original", "effects"] as const).map((key) => (
        <label className="parameter" key={key}>
          {key === "original" ? "Original video" : "Sound effects"}
          <output>{Math.round(e.state.scene[key] * 100)}%</output>
          <input
            id={`${key}-volume`}
            type="range"
            min="0"
            max="1"
            step=".01"
            value={e.state.scene[key]}
            onChange={(event) => {
              const value = Number(event.target.value);
              e.scene((current) => ({ ...current, [key]: value }), true, false);
            }}
          />
        </label>
      ))}
      <details>
        <summary>Export settings</summary>
        <p className="panel-hint">
          WAV contains added effects in the selected range. Original video audio
          is excluded. This does not export a video file.
        </p>
        <p className="panel-hint">Mono · 48 kHz · 16-bit PCM</p>
      </details>
    </Panel>
  );
}
