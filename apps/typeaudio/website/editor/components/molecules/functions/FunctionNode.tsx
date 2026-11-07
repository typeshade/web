import type {
  FunctionInstance,
  FunctionDescriptor,
} from "typeaudio/function-graph";
import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import type { FunctionViewport } from "../../../hooks/functions/useFunctionViewport.ts";
import { openContext } from "../../../interactions/openContext.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";

export function FunctionNode({
  node,
  descriptor,
  controller: c,
  viewport: v,
  wire,
  start,
  connect,
}: {
  node: FunctionInstance;
  descriptor: FunctionDescriptor;
  controller: FunctionEditor;
  viewport: FunctionViewport;
  wire?: { node: string; port: string };
  start: (node: string, port: string) => void;
  connect: (node: string, port: string) => void;
}) {
  const { openMenu } = useInteractions(),
    position = c.position(node.id),
    selected = c.node?.id === node.id;
  return (
    <div
      className={`function-node ${selected ? "selected" : ""}`}
      style={{ left: position.x, top: position.y }}
      data-function-node={node.id}
      role="group"
      aria-label={`${descriptor.export} instance ${node.id}`}
      tabIndex={0}
      onFocus={(event) => {
        if (event.target === event.currentTarget) c.select(node.id);
      }}
      onPointerDown={(event) => v.down(event, node.id)}
      onPointerMove={v.move}
      onPointerUp={() => v.finish()}
      onPointerCancel={() => v.finish(true)}
      onDoubleClick={() => {
        c.select(node.id);
        c.focus();
      }}
      onContextMenu={(event) => {
        c.select(node.id);
        openContext(
          event,
          openMenu,
          node.id,
          "Function instance",
          c.items(node.id),
        );
      }}
      onKeyDown={(event) => {
        if (
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10")
        ) {
          openContext(
            event,
            openMenu,
            node.id,
            "Function instance",
            c.items(node.id),
          );
          return;
        }
        if (event.target !== event.currentTarget) return;
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "d"
        ) {
          event.preventDefault();
          event.stopPropagation();
          void c.add(node.definition, node.id);
        }
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          c.remove(node.id);
        }
        if (event.key === "Enter") {
          c.select(node.id);
          c.focus();
        }
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          event.stopPropagation();
          const step = event.shiftKey ? 20 : 5;
          c.move(
            node.id,
            position.x +
              (event.key === "ArrowRight"
                ? step
                : event.key === "ArrowLeft"
                  ? -step
                  : 0),
            position.y +
              (event.key === "ArrowDown"
                ? step
                : event.key === "ArrowUp"
                  ? -step
                  : 0),
          );
        }
      }}
    >
      <div className="function-node-heading">
        <strong>{descriptor.export}</strong>
        <span>
          {c.graph?.output.node === node.id
            ? "OUTPUT"
            : descriptor.state
              ? "STATE"
              : "FUNCTION"}
        </span>
      </div>
      <div className="function-node-source">
        {c.graph?.definitions.find((d) => d.id === node.definition)?.module}
      </div>
      <button
        className={`function-pin output ${wire?.node === node.id ? "pending" : ""}`}
        data-function-output={node.id}
        aria-label={`Connect output of ${node.id}`}
        disabled={c.busy}
        data-tooltip={`${descriptor.output.type} · ${descriptor.output.role}/${descriptor.output.rate}. Click or drag to an input.`}
        onPointerDown={(event) => {
          event.stopPropagation();
          start(node.id, descriptor.output.id);
        }}
        onClick={() => start(node.id, descriptor.output.id)}
      >
        <span>{descriptor.output.id}</span>
        <i aria-hidden="true" />
      </button>
      {descriptor.inputs.map((port, i) => (
        <button
          key={port.id}
          className={`function-pin input ${node.inputs[port.id]?.kind === "connection" ? "connected" : ""}`}
          style={{ top: 88 + i * 30 }}
          data-function-input={node.id}
          data-function-port={port.id}
          aria-label={`Connect ${port.name} of ${node.id}`}
          disabled={c.busy}
          data-tooltip={`${port.type} · ${port.role}/${port.rate}${port.unit ? ` · ${port.unit}` : ""}. Select an output first or use the input selector in Properties.`}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => {
            event.stopPropagation();
            if (wire) connect(node.id, port.id);
          }}
          onClick={(event) => {
            c.select(node.id);
            if (wire && event.detail === 0) connect(node.id, port.id);
          }}
        >
          <i aria-hidden="true" />
          <span>{port.name}</span>
          <small>{port.type}</small>
        </button>
      ))}
      <div
        className="function-node-footer"
        style={{ marginTop: Math.max(1, descriptor.inputs.length) * 30 + 34 }}
      >
        <button
          onClick={() => {
            c.select(node.id);
            c.focus();
          }}
          data-tooltip="Open the complete TypeShade module. Instances share its source and keep separate state."
        >
          Open function ↗
        </button>
        <small>{node.id}</small>
      </div>
    </div>
  );
}
