import { useRef } from "react";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import type { GraphGestures } from "../../../hooks/graph/useGraphGestures.ts";
import type { GraphConnectionsController } from "../../../hooks/graph/useGraphConnections.ts";
import { DEFINITIONS } from "typeaudio/graph";
import type { GraphNode } from "typeaudio/graph";
import { NODE_METADATA } from "../../../config/graphNodeMetadata.ts";
import { openContext } from "../../../interactions/openContext.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";
import { WIDTH, moveNodes } from "../../../shared/graphGeometry.ts";
import { GraphPort } from "./GraphPort.tsx";
export function GraphNodeCard({
  node: n,
  controller: c,
  gestures,
  connections,
}: {
  node: GraphNode;
  controller: GraphEditor;
  gestures: GraphGestures;
  connections: GraphConnectionsController;
}) {
  const { openMenu } = useInteractions(),
    pointerFocus = useRef(false);
  const def = DEFINITIONS[n.kind],
    selected = c.selectedIds.includes(n.id);
  return (
    <div
      data-graph-node={n.id}
      data-node-kind={n.kind}
      role="group"
      aria-label={`${n.name} node`}
      tabIndex={0}
      className={`graph-node ${selected ? "selected" : ""} ${c.selected?.id === n.id ? "primary-selection" : ""} ${n.bypass ? "bypassed" : ""}`}
      style={{ left: n.x, top: n.y, width: WIDTH }}
      onPointerDown={(event) => {
        pointerFocus.current = true;
        connections.select();
        gestures.down(event, n);
        pointerFocus.current = false;
      }}
      onFocus={(event) => {
        if (
          event.target === event.currentTarget &&
          !pointerFocus.current &&
          !c.isSelected(n.id)
        )
          c.select(n.id);
      }}
      onContextMenu={(event) => {
        c.select(n.id, "preserve");
        openContext(
          event,
          openMenu,
          `graph-${n.id}`,
          "Node actions",
          c.items(n),
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
            `graph-${n.id}`,
            "Node actions",
            c.items(n),
          );
          return;
        }
        if (event.target !== event.currentTarget) return;
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          c.change({
            ...c.graph!,
            nodes: moveNodes(
              c.graph!.nodes,
              c.getSelection(),
              (event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowLeft"
                  ? -1
                  : 0) * (event.shiftKey ? 20 : 5),
              (event.key === "ArrowDown"
                ? 1
                : event.key === "ArrowUp"
                  ? -1
                  : 0) * (event.shiftKey ? 20 : 5),
            ),
          });
        }
      }}
    >
      <div className="graph-node-title">
        <span>{n.name}</span>
        <small>{n.bypass ? "BYPASS" : def.label}</small>
      </div>
      <div className="graph-node-ports">
        {Object.entries(def.inputs).map(([port, signal]) => (
          <GraphPort
            key={port}
            endpoint={{ node: n.id, port }}
            name={n.name}
            signal={signal}
            connected={!!n.inputs[port]}
            busy={c.busy}
            connections={connections}
          />
        ))}
      </div>
      {n.kind !== "output" && (
        <GraphPort
          endpoint={{ node: n.id }}
          binding={n.kind === "code" ? "out" : undefined}
          name={n.name}
          signal={def.output}
          connected={c.graph!.nodes.some((other) =>
            Object.values(other.inputs).includes(n.id),
          )}
          busy={c.busy}
          connections={connections}
        />
      )}
      <div
        className="graph-node-caption"
        data-tooltip={NODE_METADATA[n.kind].summary}
      >
        {n.kind === "code"
          ? "Sample code · input → out"
          : n.kind === "parameter"
            ? `p${n.values[0]} · ${c.graph!.parameters[n.values[0]!]!.name}`
            : n.kind === "output"
              ? "Mono · 48 kHz"
              : n.values
                  .map(
                    (v, i) =>
                      `${def.controls[i]!.name.split(" (")[0].split(":")[0]} ${Number(v.toFixed(3))}`,
                  )
                  .join(" · ")}
      </div>
    </div>
  );
}
