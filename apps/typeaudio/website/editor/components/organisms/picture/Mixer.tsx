import type { Editor } from "../../../useEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";
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
        <p className="panel-hint">{e.state.scene.space ? "Stereo" : "Mono"} · 48 kHz · 16-bit PCM</p>
      </details>
    </Panel>
  );
}
