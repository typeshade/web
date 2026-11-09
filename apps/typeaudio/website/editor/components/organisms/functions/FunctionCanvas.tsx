import { useState } from "react";
import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import { useFunctionViewport } from "../../../hooks/functions/useFunctionViewport.ts";
import { FunctionNode } from "../../molecules/functions/FunctionNode.tsx";
import { FunctionConnections } from "../../molecules/functions/FunctionConnections.tsx";
import { Panel } from "../../molecules/Panel.tsx";
import { openContext } from "../../../interactions/openContext.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";
import { compatiblePort } from "../../../../functions/connectionOptions.ts";

export function FunctionCanvas({
  controller: c,
}: {
  controller: FunctionEditor;
}) {
  const v = useFunctionViewport(c),
    { openMenu } = useInteractions();
  const [search, setSearch] = useState(""),
    [wire, setWire] = useState<{ node: string; port: string }>();
  async function connect(node: string, port: string) {
    if (!wire) return;
    const fromNode = c.graph!.nodes.find((n) => n.id === wire.node),
      toNode = c.graph!.nodes.find((n) => n.id === node);
    const output = c.descriptors.find(
        (d) => d.id === fromNode?.definition,
      )?.output,
      input = c.descriptors
        .find((d) => d.id === toNode?.definition)
        ?.inputs.find((p) => p.id === port);
    if (!output || !input || !compatiblePort(output, input)) {
      c.setError(
        "These pins need the same type, rate, role and unit. Choose a compatible input.",
      );
      return;
    }
    const selected = wire;
    setWire(undefined);
    await c.bind(node, port, { kind: "connection", ...selected });
  }
  return (
    <Panel
      title="Function network"
      className="function-network-panel"
      actions={
        <>
          <button
            onClick={() => v.zoom(1 / 1.2)}
            aria-label="Zoom function network out"
          >
            −
          </button>
          <button
            onClick={v.fit}
            data-tooltip="Frame every function instance in the canvas."
          >
            Fit
          </button>
          <button
            onClick={() => v.zoom(1.2)}
            aria-label="Zoom function network in"
          >
            +
          </button>
        </>
      }
    >
      <div className="function-toolbar">
        <input
          aria-label="Find a function"
          placeholder="Find a function…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Add function instance"
          value=""
          disabled={c.busy || !c.program}
          onChange={(event) => {
            if (event.target.value) void c.add(event.target.value);
          }}
        >
          <option value="">Add instance…</option>
          {c.graph?.definitions
            .filter((d) =>
              `${d.export} ${d.module}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.export} · {d.module}
              </option>
            ))}
        </select>
        <button
          disabled={c.busy}
          onClick={() => void c.create()}
          data-tooltip="Create an ordinary TypeShade module and its first reusable instance."
        >
          New function
        </button>
      </div>
      <div
        ref={v.surface}
        className="function-canvas"
        tabIndex={0}
        aria-label="Function node canvas"
        onPointerDown={v.down}
        onPointerMove={v.move}
        onPointerUp={() => v.finish()}
        onPointerCancel={() => v.finish(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setWire(undefined);
            v.finish(true);
          }
          if (
            event.key.toLowerCase() === "f" &&
            event.target === event.currentTarget
          )
            v.fit();
        }}
        onContextMenu={(event) =>
          openContext(event, openMenu, "function-canvas", "Function network", [
            {
              label: "New function",
              disabled: c.busy,
              action: () => void c.create(),
            },
            { label: "Frame all instances", action: v.fit },
            {
              label: "Cancel connection",
              disabled: !wire,
              action: () => setWire(undefined),
            },
          ])
        }
      >
        <div
          className="function-world"
          style={{
            transform: `translate(${v.view.x}px, ${v.view.y}px) scale(${v.view.scale})`,
          }}
        >
          <FunctionConnections controller={c} />
          {c.graph?.nodes.map((node) => {
            const descriptor = c.descriptors.find(
              (d) => d.id === node.definition,
            );
            return (
              descriptor && (
                <FunctionNode
                  key={node.id}
                  node={node}
                  descriptor={descriptor}
                  controller={c}
                  viewport={v}
                  wire={wire}
                  start={(node, port) => setWire({ node, port })}
                  connect={(node, port) => void connect(node, port)}
                />
              )
            );
          })}
        </div>
        {!c.program && (
          <p className="function-canvas-status">
            {c.error || "Preparing function pins…"}
          </p>
        )}
      </div>
      <div className="function-network-status" role="status">
        {c.busy
          ? "Preparing changes…"
          : wire
            ? `Connect ${wire.node}.${wire.port} to an input · Esc cancels`
            : "Drag to move · Scroll to zoom · Double-click to edit source"}
      </div>
      {!!c.error && (
        <p className="function-error" role="alert">
          {c.error}
        </p>
      )}
    </Panel>
  );
}
