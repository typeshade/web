import { Panel } from "../../molecules/Panel.tsx";
import { MODULES } from "../../../config/soundModules.ts";
import { TonePad } from "../../molecules/sound/TonePad.tsx";
import { Variations } from "../../molecules/sound/Variations.tsx";
import type { Editor } from "../../../useEditor.ts";
import type { SoundSelection } from "../../../hooks/sound/useSoundSelection.ts";
export function SignalChainPanel({
  editor: e,
  selection,
}: {
  editor: Editor;
  selection: SoundSelection;
}) {
  const { owner, layer, sourceEditor, module, setModule } = selection;
  return (
    <Panel title="Signal chain" className="sound-dock">
      <div className="signal-modules" role="group" aria-label="Sound modules">
        {MODULES.map((m, i) => (
          <button
            key={m.id}
            data-module={m.id}
            aria-pressed={module === m.id}
            onClick={() => setModule(m.id)}
          >
            <small>{String(i + 1).padStart(2, "0")}</small>
            {m.name}
            <span>›</span>
          </button>
        ))}
      </div>
      <div className="sound-dock-controls">
        <div>
          <h3>Tone · {layer?.name || "Base source"}</h3>
          <TonePad
            key={`${owner}-${layer?.id || "base"}`}
            editor={sourceEditor}
          />
        </div>
        <div>
          <h3>Variations</h3>
          <Variations editor={e} />
        </div>
        <div className="sound-summary">
          <h3>{e.selected ? "Selected layer" : "Source"}</h3>
          <span>{e.state.patchName}</span>
          <p>
            {e.state.patch.layers.length + 1}{" "}
            {e.state.patch.layers.length ? "layers" : "layer"} ·{" "}
            {e.state.patch.voices}{" "}
            {e.state.patch.voices === 1 ? "base voice" : "base voices"} ·{" "}
            {Math.round(e.state.patch.frequency)} Hz
          </p>
          <p>
            Hold {e.state.patch.duration.toFixed(2)} s / Release{" "}
            {e.state.patch.release.toFixed(2)} s
          </p>
          <button
            onClick={() => {
              e.workspace("picture");
              if (!e.selected) e.addCue();
            }}
          >
            Add to composition
          </button>
        </div>
      </div>
    </Panel>
  );
}
