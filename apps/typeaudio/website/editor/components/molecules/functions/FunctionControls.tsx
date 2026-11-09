import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import { ScalarInput } from "../../atoms/ScalarInput.tsx";

export function FunctionControls({
  controller: c,
}: {
  controller: FunctionEditor;
}) {
  return (
    <div className="function-controls" aria-label="Named function controls">
      <h3>Named controls</h3>
      {c.graph?.parameters.map((p) => (
        <label key={p.id} className="function-control">
          <span>
            {p.name}
            <small>{p.unit ?? p.type}</small>
          </span>
          <ScalarInput
            label={`${p.name} control`}
            type={p.type}
            value={p.value}
            min={p.min}
            max={p.max}
            live
            onCommit={(value) => c.control(p.id, value)}
          />
        </label>
      ))}
      {!c.graph?.parameters.length && (
        <p className="panel-hint">
          Expose a control input to adjust it here during playback.
        </p>
      )}
    </div>
  );
}
