import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";
import { FunctionInput } from "../../molecules/functions/FunctionInput.tsx";
import { FunctionControls } from "../../molecules/functions/FunctionControls.tsx";
import { Parameter } from "../../molecules/sound/Parameter.tsx";

export function FunctionInspector({
  controller: c,
}: {
  controller: FunctionEditor;
}) {
  return (
    <Panel title="Function properties" className="function-inspector">
      <FunctionControls controller={c} />
      {c.node && c.descriptor && (
        <>
          <h3>{c.descriptor.export}</h3>
          <p className="function-instance-id">Instance · {c.node.id}</p>
          <div className="button-row">
            <button onClick={() => c.focus()}>Edit function</button>
            <button
              disabled={c.busy}
              onClick={() => void c.add(c.node!.definition, c.node!.id)}
            >
              Duplicate
            </button>
          </div>
          <p className="panel-hint">
            {c.descriptor.state
              ? "Each instance keeps its own state. Instances share the source file."
              : "Instances share this function's source file."}
          </p>
          {c.descriptor.inputs.map((port) => (
            <FunctionInput
              key={`${c.node!.id}:${port.id}`}
              port={port}
              controller={c}
            />
          ))}
          {c.descriptor.output.role === "audio" && (
            <button
              className="function-output-button"
              aria-pressed={c.graph?.output.node === c.node.id}
              disabled={c.busy}
              onClick={() =>
                void c.apply({
                  ...c.graph!,
                  output: { node: c.node!.id, port: c.descriptor!.output.id },
                })
              }
            >
              {c.graph?.output.node === c.node.id
                ? "Current sound output"
                : "Use as sound output"}
            </button>
          )}
        </>
      )}
      <h3>Playback</h3>
      <Parameter editor={c.e} name="duration" />
      <Parameter editor={c.e} name="volume" />
      <p className="panel-hint">
        Mono · 48 kHz · CPU. Functions own synthesis and effects.
      </p>
    </Panel>
  );
}
