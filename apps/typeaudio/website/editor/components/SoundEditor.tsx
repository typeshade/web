import type { Editor } from "../useEditor.ts";
import { LIMITS, SHAPES, envelopeAt, type Patch } from "../../designer.ts";

import { Panel } from "./Panel.tsx";
export const MODULES = [
  {
    id: "source",
    name: "Oscillators",
    keys: [
      "shapeA",
      "shapeB",
      "frequency",
      "transpose",
      "blend",
      "detune",
      "voices",
      "spread",
    ],
  },
  {
    id: "filter",
    name: "Filter",
    toggle: "filter",
    keys: ["cutoff", "resonance"],
  },
  {
    id: "envelope",
    name: "Envelope",
    keys: ["attack", "decay", "sustain", "release", "duration"],
  },
  { id: "drive", name: "Drive", toggle: "distortion", keys: ["drive"] },
  {
    id: "delay",
    name: "Delay",
    toggle: "delay",
    keys: ["delayTime", "feedback", "delayMix"],
  },
  {
    id: "reverb",
    name: "Reverb",
    toggle: "reverb",
    keys: ["room", "reverbMix"],
  },
  {
    id: "modulation",
    name: "Modulation",
    keys: ["lfoTarget", "lfoShape", "lfoRate", "lfoDepth", "lfoSync", "tempo"],
  },
  { id: "output", name: "Output", keys: ["volume"] },
] as const;
const labels: Record<string, string> = {
  shapeA: "Oscillator A",
  shapeB: "Oscillator B",
  frequency: "Pitch",
  transpose: "B transpose",
  blend: "Oscillator blend",
  detune: "B detune",
  voices: "Voices",
  spread: "Spread",
  cutoff: "Cutoff",
  resonance: "Resonance",
  attack: "Attack",
  decay: "Decay",
  sustain: "Sustain",
  release: "Release",
  duration: "Note hold",
  drive: "Drive",
  delayTime: "Time",
  feedback: "Feedback",
  delayMix: "Mix",
  room: "Room size",
  reverbMix: "Mix",
  lfoTarget: "Target",
  lfoShape: "Wave",
  lfoRate: "Rate",
  lfoDepth: "Depth",
  lfoSync: "Tempo sync",
  tempo: "Tempo",
  volume: "Output level",
};
const units: Record<string, string> = {
  frequency: "Hz",
  cutoff: "Hz",
  transpose: "st",
  detune: "ct",
  spread: "ct",
  attack: "s",
  decay: "s",
  release: "s",
  duration: "s",
  delayTime: "s",
  lfoRate: "Hz",
  tempo: "BPM",
};
export function Parameter({
  editor: e,
  name,
}: {
  editor: Editor;
  name: keyof Patch;
}) {
  const value = e.state.patch[name],
    limit = LIMITS[name],
    options =
      name === "shapeA" || name === "shapeB"
        ? SHAPES
        : name === "lfoTarget"
          ? ["Filter cutoff", "Pitch", "Oscillator blend"]
          : name === "lfoShape"
            ? ["Sine", "Triangle"]
            : undefined;
  if (typeof value === "boolean")
    return (
      <label className="check">
        <input
          id={name}
          type="checkbox"
          checked={value}
          onChange={(event) => e.patch({ [name]: event.target.checked })}
        />
        {labels[name] || name}
      </label>
    );
  const integer = [
    "shapeA",
    "shapeB",
    "voices",
    "transpose",
    "lfoTarget",
    "lfoShape",
  ].includes(name);
  const step = integer
    ? 1
    : ["frequency", "cutoff", "tempo"].includes(name)
      ? 1
      : ["attack"].includes(name)
        ? 0.001
        : 0.01;
  return (
    <label
      className={`parameter ${options ? "parameter-select" : ""}`}
      htmlFor={name}
    >
      <span>{labels[name] || name}</span>
      {options ? (
        <select
          id={name}
          value={value}
          onChange={(event) => e.patch({ [name]: Number(event.target.value) })}
        >
          {options.map((option, i) => (
            <option value={i} key={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <>
          <output>
            {Number(value.toFixed(3))} {units[name] || ""}
          </output>
          <input
            id={name}
            type="range"
            min={limit[0]}
            max={limit[1]}
            step={step}
            value={value}
            disabled={name === "lfoRate" && e.state.patch.lfoSync}
            onChange={(event) =>
              e.patch({ [name]: Number(event.target.value) })
            }
          />
        </>
      )}
    </label>
  );
}
export function SoundEditor({
  editor: e,
  module,
}: {
  editor: Editor;
  module: string;
}) {
  const config = MODULES.find((m) => m.id === module) || MODULES[0];
  const enabled = !("toggle" in config) || e.state.patch[config.toggle];
  return (
    <Panel
      title={`${config.name} / ${e.selected ? "Selected clip" : "Sound"}`}
      className="sound-properties"
      actions={
        "toggle" in config ? (
          <label className="check">
            <input
              id={config.toggle}
              type="checkbox"
              checked={e.state.patch[config.toggle]}
              onChange={(event) =>
                e.patch({
                  [config.toggle]: event.target.checked,
                })
              }
            />
            Enable
          </label>
        ) : undefined
      }
    >
      {config.id === "envelope" && <Envelope patch={e.state.patch} />}
      <div className={`parameter-grid ${!enabled ? "bypassed" : ""}`}>
        {config.keys.map((name) => (
          <Parameter key={name} editor={e} name={name} />
        ))}
      </div>
      {config.id === "source" && (
        <div className="note-keys" aria-label="Note shortcuts">
          {Object.entries({
            C3: 130.81,
            E3: 164.81,
            G3: 196,
            A3: 220,
            C4: 261.63,
          }).map(([note, frequency]) => (
            <button key={note} onClick={() => e.patch({ frequency })}>
              {note}
            </button>
          ))}
        </div>
      )}
      {config.id === "modulation" && (
        <p className="panel-hint">
          Modulation runs in Live mode. Finite renders and timeline clips
          exclude live LFO.
        </p>
      )}
    </Panel>
  );
}
function Envelope({ patch: p }: { patch: Patch }) {
  const duration = p.duration + p.release;
  const path = Array.from({ length: 140 }, (_, i) => {
    const t = (i / 139) * duration;
    return `${i ? "L" : "M"}${(i / 139) * 300},${75 - envelopeAt(t, p) * 65}`;
  }).join(" ");
  return (
    <svg
      className="envelope"
      viewBox="0 0 300 80"
      role="img"
      aria-label="Amplitude envelope"
    >
      <path d={path} />
    </svg>
  );
}
export function TonePad({ editor: e }: { editor: Editor }) {
  const position = {
    x: Math.log(e.state.patch.cutoff / 80) / Math.log(200),
    y: 1 - e.state.patch.blend,
  };
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect(),
      x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y = Math.max(
        0,
        Math.min(1, 1 - (event.clientY - rect.top) / rect.height),
      );
    e.patch({
      cutoff: Math.round(80 * Math.pow(200, x)),
      blend: Math.round(y * 100) / 100,
    });
  };
  return (
    <div
      id="xy-pad"
      className="tone-pad"
      role="group"
      aria-label="Tone pad: horizontal cutoff, vertical oscillator blend"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
    >
      <span>OSCILLATOR B ↑</span>
      <span className="pad-axis">FILTER CUTOFF →</span>
      <i
        style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
      />
    </div>
  );
}
export function Variations({ editor: e }: { editor: Editor }) {
  const morph = e.morphAmount;
  return (
    <div className="variation-controls">
      <div className="button-row">
        {(["a", "b"] as const).map((slot) => (
          <div key={slot} className="segmented">
            <button
              id={`store-${slot}`}
              onClick={() => e.snapshot("store", slot)}
            >
              Store {slot.toUpperCase()}
            </button>
            <button
              id={`recall-${slot}`}
              onClick={() => e.snapshot("recall", slot)}
            >
              Recall
            </button>
          </div>
        ))}
      </div>
      <label className="parameter">
        <span>A / B blend</span>
        <output>
          {morph === undefined ? "Custom" : `${Math.round(morph * 100)}%`}
        </output>
        <input
          id="morph"
          type="range"
          min="0"
          max="1"
          step=".01"
          value={morph ?? 0.5}
          onChange={(event) => {
            const v = Number(event.target.value);
            e.morph(v);
          }}
        />
      </label>
      <button id="randomize" onClick={e.randomize}>
        Randomize sound
      </button>
    </div>
  );
}
