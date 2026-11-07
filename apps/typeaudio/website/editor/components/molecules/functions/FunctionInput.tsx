import type { FunctionPort } from "typeaudio/function-graph";
import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import { connectionOptions } from "../../../../functions/connectionOptions.ts";
import { ScalarInput } from "../../atoms/ScalarInput.tsx";

export function FunctionInput({
  controller: c,
  port,
}: {
  controller: FunctionEditor;
  port: FunctionPort;
}) {
  const node = c.node!,
    graph = c.graph!,
    binding = node.inputs[port.id];
  const value =
    !binding || binding.kind === "constant"
      ? "constant"
      : binding.kind === "parameter"
        ? `parameter:${binding.parameter}`
        : `node:${binding.node}:${binding.port}`;
  const sources = connectionOptions(graph, c.descriptors, node.id, port);
  const parameters = graph.parameters.filter(
    (p) =>
      port.role === "control" &&
      port.rate === "block" &&
      port.type === p.type &&
      (port.unit ?? "") === (p.unit ?? ""),
  );
  return (
    <div className="function-input-binding">
      <label>
        {port.name}
        <small>
          {port.type} · {port.role}/{port.rate}
          {port.unit ? ` · ${port.unit}` : ""}
        </small>
        <select
          aria-label={`${port.name} input binding`}
          value={value}
          disabled={c.busy}
          onChange={(event) => {
            const [kind, id, output] = event.target.value.split(":");
            void c.bind(
              node.id,
              port.id,
              kind === "parameter"
                ? { kind: "parameter", parameter: id! }
                : kind === "node"
                  ? { kind: "connection", node: id!, port: output! }
                  : {
                      kind: "constant",
                      value: port.default ?? (port.type === "bool" ? false : 0),
                    },
            );
          }}
        >
          <option value="constant">Constant</option>
          {parameters.map((p) => (
            <option key={p.id} value={`parameter:${p.id}`}>
              Control · {p.name}
            </option>
          ))}
          {sources.map((p) => (
            <option key={p.node} value={`node:${p.node}:${p.port}`}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {value === "constant" && (
        <ScalarInput
          label={`${port.name} constant`}
          type={port.type}
          value={
            binding?.kind === "constant"
              ? binding.value
              : (port.default ?? (port.type === "bool" ? false : 0))
          }
          disabled={c.busy}
          onCommit={(value) =>
            void c.bind(node.id, port.id, { kind: "constant", value })
          }
        />
      )}
      {port.role === "control" &&
        port.rate === "block" &&
        binding?.kind !== "parameter" && (
          <button
            disabled={c.busy}
            onClick={() => c.expose(port.id)}
            data-tooltip="Create a named control for this input. Its value can change during playback without resetting state."
          >
            Expose {port.name}
          </button>
        )}
    </div>
  );
}
