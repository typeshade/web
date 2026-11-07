import { useEffect, useState } from "react";
import type { FunctionPort } from "typeaudio/function-graph";
import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";

export function FunctionInputRename({
  controller: c,
  port,
}: {
  controller: FunctionEditor;
  port: FunctionPort;
}) {
  const [name, setName] = useState(port.name);
  useEffect(() => setName(port.name), [port.name, c.node?.id]);
  const disabled = c.busy || c.hasDrafts;
  return (
    <div className="function-input-rename">
      <label>
        Source parameter
        <input
          aria-label={`Rename ${port.name} input`}
          value={name}
          maxLength={64}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") setName(port.name);
            if (event.key === "Enter" && name !== port.name && name.trim())
              void c.renameInput(port.id, name.trim());
          }}
        />
      </label>
      <button
        disabled={disabled || name === port.name || !name.trim()}
        onClick={() => void c.renameInput(port.id, name.trim())}
        data-tooltip="Rename the TypeShade parameter and its references. Existing instances keep their pin IDs, connections and compatible state."
      >
        Rename input
      </button>
      {c.hasDrafts && (
        <small>Apply or revert source drafts before renaming an input.</small>
      )}
    </div>
  );
}
