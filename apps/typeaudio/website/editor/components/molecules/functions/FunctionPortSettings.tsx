import { FunctionInputRename } from "./FunctionInputRename.tsx";
import type { FunctionPort } from "typeaudio/function-graph";
import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";

export function FunctionPortSettings({
  controller: c,
  port,
}: {
  controller: FunctionEditor;
  port: FunctionPort;
}) {
  return (
    <details className="function-port-settings">
      <summary data-tooltip="Types come from TypeShade. Role, update rate and units describe this pin in every instance.">
        Pin settings
      </summary>
      <FunctionInputRename controller={c} port={port} />
      <label>
        Role and update rate
        <select
          aria-label={`${port.name} pin role`}
          value={`${port.role}/${port.rate}`}
          disabled={c.busy}
          onChange={(event) => {
            const [role, rate] = event.target.value.split("/") as [
              "audio" | "control",
              "sample" | "block",
            ];
            void c.configurePort(port.name, {
              role,
              rate,
              unit: role === "audio" ? (port.unit ?? "amplitude") : undefined,
            });
          }}
        >
          <option value="control/block">Control · per block</option>
          <option value="control/sample">Control · per sample</option>
          {port.type === "f32" && (
            <option value="audio/sample">Audio · per sample</option>
          )}
        </select>
      </label>
      <label>
        Unit
        <input
          key={port.unit ?? ""}
          aria-label={`${port.name} pin unit`}
          defaultValue={port.unit ?? ""}
          maxLength={40}
          disabled={c.busy}
          onBlur={(event) => {
            if (event.target.value !== (port.unit ?? ""))
              void c.configurePort(port.name, {
                unit: event.target.value || undefined,
              });
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
      <small>
        Applies to every instance. Incompatible connections must be disconnected
        first.
      </small>
    </details>
  );
}
