import type { Editor } from "../../../useEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";

export function RoomProperties({ editor: e }: { editor: Editor }) {
  const space = e.state.scene.space;
  if (!space) return null;
  const controls = [
    { key: "earlyGain", label: "Early reflections", min: 0, max: 1, step: .05, value: space.room.earlyGain ?? .7 },
    { key: "lateGain", label: "Late reverberation", min: 0, max: 1, step: .05, value: space.room.lateGain ?? .2 },
    { key: "decaySeconds", label: "Room decay (s)", min: .05, max: 8, step: .05, value: space.room.decaySeconds ?? 2 },
    { key: "gainDb", label: "Master trim (dB)", min: -60, max: 24, step: .1, value: space.gainDb },
    { key: "highpassHz", label: "Highpass (Hz)", min: 0, max: 500, step: 1, value: space.highpassHz },
  ];
  return <Panel title="Scene space" className="room-properties">
    <p className="panel-hint">Stereo space shared by the composition. Position and room edits prepare a new preview.</p>
    {controls.map(control => <label className="inline-property" key={control.key}>
      {control.label}
      <input aria-label={control.label} type="number" min={control.min} max={control.max} step={control.step}
        value={control.value} onFocus={e.beginEdit} onBlur={e.endEdit}
        onChange={event => {
          const value = event.target.valueAsNumber;
          if (!Number.isFinite(value) || value < control.min || value > control.max) return;
          e.scene(scene => ({ ...scene, space: control.key === "gainDb" || control.key === "highpassHz"
            ? { ...scene.space!, [control.key]: value }
            : { ...scene.space!, room: { ...scene.space!.room, [control.key]: value } } }));
        }} />
    </label>)}
  </Panel>;
}
