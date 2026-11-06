import type { Editor } from "../../../useEditor.ts";
import { WaveEditor } from "./WaveEditor.tsx";
import { CurveEditor } from "./CurveEditor.tsx";
import { Panel } from "../../molecules/Panel.tsx";
import { MODULES } from "../../../config/soundModules.ts";
import { Parameter } from "../../molecules/sound/Parameter.tsx";
import { Envelope } from "../../atoms/Envelope.tsx";
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
