import { useRef } from "react";
import { NumericValue } from "./NumericValue.tsx";
import { DEFAULT } from "../../designer.ts";
import { openContext, useInteractions } from "../interactions.tsx";
import type { Editor } from "../useEditor.ts";
import { LIMITS, SHAPES, envelopeAt, type Patch } from "../../designer.ts";

import { WaveEditor } from "./WaveEditor.tsx";
import { CurveEditor } from "./CurveEditor.tsx";
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
      "fmRatio",
      "fmIndex",
      "seed",
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
  { id: "wave", name: "Wave", keys: [] },
  { id: "automation", name: "Automation", keys: [] },
  { id: "output", name: "Output", keys: ["volume"] },
] as const;
const labels: Record<string, string> = {
  fmRatio: "FM ratio",
  fmIndex: "FM index",
  seed: "Noise seed",
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
const HELP: Partial<Record<keyof Patch, string>> = {
  fmRatio:
    "Modulator frequency relative to oscillator A. Non-integer ratios add inharmonic partials.",
  fmIndex:
    "FM depth for oscillator A. Zero disables FM. Noise sources ignore FM.",
  seed: "Deterministic noise seed. The same sound renders the same noise again.",
  shapeA: "Waveform for oscillator A. Blend balances it with oscillator B.",
  shapeB: "Waveform for oscillator B. Transpose and detune adjust its pitch.",
  frequency: "Base pitch of the oscillators. Tune it while Live runs.",
  transpose: "Oscillator B pitch, in semitones relative to oscillator A.",
  detune: "Fine pitch offset for oscillator B, in cents.",
  voices:
    "Unison voices for this sound. More voices add density and processing cost.",
  spread: "Pitch spread across the unison voices, in cents.",
  blend: "Balance between oscillators A and B.",
  cutoff: "Transition frequency of the lowpass filter.",
  resonance: "Emphasis around the lowpass cutoff frequency.",
  attack: "Time to reach full amplitude after a trigger.",
  decay: "Time to fall from the attack peak to the sustain level.",
  sustain: "Amplitude held after the decay stage.",
  release: "Time to fade after the note hold.",
  duration: "Note hold before release. Turn Repeat off to play the sound once.",
  drive: "Input gain for soft clipping. Enable Drive to hear it.",
  delayTime: "Time between echoes. Edits preserve the running delay tail.",
  feedback: "Amount of each echo returned to the delay.",
  delayMix: "Balance of the dry signal and delay echoes.",
  room: "Reverb room size. Enable Reverb to hear it.",
  reverbMix: "Balance of the dry signal and reverb tail.",
  lfoTarget:
    "Parameter controlled by the LFO: cutoff, pitch or oscillator blend.",
  lfoShape: "Sine or triangle modulation.",
  lfoSync: "Follow the composition BPM instead of the free modulation rate.",
  tempo:
    "Composition BPM. With Beat sync enabled, the LFO cycles once per beat.",
  lfoDepth: "Strength of modulation in Live and CPU renders.",
  lfoRate: "Modulation cycles per second. Beat sync follows BPM instead.",
  volume: "Output level for Live and exported sound.",
};
export function Parameter({
  editor: e,
  name,
}: {
  editor: Editor;
  name: Exclude<keyof Patch, "graph" | "wave" | "curves" | "layers">;
}) {
  const gesture = useRef(false),
    { openMenu } = useInteractions();
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
      <label className="check" data-tooltip={HELP[name]}>
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
    "seed",
  ].includes(name);
  const step = integer
    ? 1
    : ["frequency", "cutoff", "tempo"].includes(name)
      ? 1
      : ["attack"].includes(name)
        ? 0.001
        : 0.01;
  return (
    <div
      className={`parameter ${options ? "parameter-select" : ""}`}
      data-tooltip={
        name === "lfoRate" && e.state.patch.lfoSync
          ? "Beat sync is on. Rate follows BPM."
          : HELP[name]
      }
      onContextMenu={(event) => {
        if (
          event.target instanceof HTMLInputElement &&
          event.target.type !== "range"
        )
          return;
        openContext(
          event,
          openMenu,
          `parameter-${name}`,
          `${labels[name] || name} options`,
          [
            {
              label: `Reset ${labels[name] || name}`,
              action: () => e.patch({ [name]: DEFAULT[name] }),
            },
          ],
        );
      }}
    >
      <label htmlFor={name}>{labels[name] || name}</label>
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
          <NumericValue
            editor={e}
            name={name}
            label={labels[name] || name}
            unit={units[name] || ""}
            step={step}
            integer={integer}
            disabled={name === "lfoRate" && e.state.patch.lfoSync}
          />
          <input
            id={name}
            type="range"
            min={limit[0]}
            max={limit[1]}
            step={step}
            value={value}
            disabled={name === "lfoRate" && e.state.patch.lfoSync}
            onPointerDown={(event) => {
              if (event.button === 0) {
                gesture.current = true;
                e.beginEdit();
              }
            }}
            onPointerUp={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onPointerCancel={() => {
              if (gesture.current) e.cancelEdit();
              gesture.current = false;
            }}
            onLostPointerCapture={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && gesture.current) {
                event.preventDefault();
                event.stopPropagation();
                e.cancelEdit();
                gesture.current = false;
              } else if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                  "PageUp",
                  "PageDown",
                ].includes(event.key) &&
                !gesture.current
              ) {
                gesture.current = true;
                e.beginEdit();
              }
            }}
            onKeyUp={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onBlur={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onChange={(event) =>
              e.patch({ [name]: Number(event.target.value) })
            }
          />
        </>
      )}
    </div>
  );
}
export function SoundEditor({
  editor: e,
  module,
  sourceName,
}: {
  editor: Editor;
  module: string;
  sourceName?: string;
}) {
  const config = MODULES.find((m) => m.id === module) || MODULES[0];
  const enabled = !("toggle" in config) || e.state.patch[config.toggle];
  return (
    <Panel
      title={`${config.name} / ${sourceName || (e.selected ? "Selected clip" : "Sound")}`}
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
      {config.id === "wave" && <WaveEditor editor={e} />}
      {config.id === "automation" && <CurveEditor editor={e} />}
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
          Modulation is included in Live, CPU renders and timeline clips. Use
          Record live to capture parameter changes during playback.
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
  const active = useRef(false),
    { openMenu } = useInteractions();
  const end = (cancel = false) => {
    if (!active.current) return;
    active.current = false;
    cancel ? e.cancelEdit() : e.endEdit();
  };
  const position = {
    x: Math.log(e.state.patch.cutoff / 80) / Math.log(200),
    y: 1 - e.state.patch.blend,
  };
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !active.current ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    )
      return;
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
      tabIndex={0}
      data-tooltip="Drag horizontally for filter cutoff and vertically for oscillator blend. Arrow keys adjust the same controls. Escape cancels a drag."
      aria-label="Tone pad: horizontal cutoff, vertical oscillator blend"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.focus();
        active.current = true;
        e.beginEdit();
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={() => end()}
      onPointerCancel={() => end(true)}
      onLostPointerCapture={() => end(true)}
      onBlur={() => end()}
      onContextMenu={(event) =>
        openContext(event, openMenu, "tone", "Tone options", [
          {
            label: "Reset Tone",
            action: () =>
              e.patch({ cutoff: DEFAULT.cutoff, blend: DEFAULT.blend }),
          },
        ])
      }
      onKeyDown={(event) => {
        if (event.key === "Escape" && active.current) {
          event.preventDefault();
          event.stopPropagation();
          end(true);
        } else if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          if (!active.current) {
            active.current = true;
            e.beginEdit();
          }
          const step = event.shiftKey ? 0.002 : 0.02;
          const x = Math.max(
            0,
            Math.min(
              1,
              position.x +
                (event.key === "ArrowRight"
                  ? step
                  : event.key === "ArrowLeft"
                    ? -step
                    : 0),
            ),
          );
          const blend = Math.max(
            0,
            Math.min(
              1,
              e.state.patch.blend +
                (event.key === "ArrowUp"
                  ? step
                  : event.key === "ArrowDown"
                    ? -step
                    : 0),
            ),
          );
          e.patch({
            cutoff: Math.round(80 * 200 ** x),
            blend: Math.round(blend * 1000) / 1000,
          });
        }
      }}
      onKeyUp={(event) => {
        if (event.key.startsWith("Arrow")) end();
      }}
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
