import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { DEFINITIONS } from "../../../../graph/catalog.ts";
import { type GraphNode } from "../../../../graph/types.ts";
import { openContext } from "../../../interactions/openContext.ts";
import type { GraphViewport } from "../../../hooks/graph/useGraphViewport.ts";
import { WIDTH } from "../../../shared/graphGeometry.ts";
export function GraphNodeCard({
  node: n,
  controller: c,
  viewport,
}: {
  node: GraphNode;
  controller: GraphEditor;
  viewport: GraphViewport;
}) {
  const g = c.graph!,
    { down, link, setLink, setCursor, point, openMenu } = viewport;
  return (
    <div
      data-graph-node={n.id}
      data-node-kind={n.kind}
      role="group"
      aria-label={`${n.name} node`}
      tabIndex={0}
      className={`graph-node ${c.selected?.id === n.id ? "selected" : ""} ${n.bypass ? "bypassed" : ""}`}
      style={{ left: n.x, top: n.y, width: WIDTH }}
      onPointerDown={(event) => down(event, n)}
      onFocus={() => {
        if (c.selected?.id !== n.id) c.select(n.id);
      }}
      onContextMenu={(event) => {
        c.select(n.id);
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
        if ((event.target as Element).closest("button")) return;
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          c.edit(n.id, {
            x:
              n.x +
              (event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowLeft"
                  ? -1
                  : 0) *
                (event.shiftKey ? 20 : 5),
            y:
              n.y +
              (event.key === "ArrowDown"
                ? 1
                : event.key === "ArrowUp"
                  ? -1
                  : 0) *
                (event.shiftKey ? 20 : 5),
          });
        }
      }}
    >
      <div className="graph-node-title">
        <span>{n.name}</span>
        <small>{n.bypass ? "BYPASS" : DEFINITIONS[n.kind].label}</small>
      </div>
      <div className="graph-node-ports">
        {Object.entries(DEFINITIONS[n.kind].inputs).map(([port, type]) => (
          <button
            key={port}
            className={`graph-port input ${type}`}
            data-graph-input={port}
            data-graph-target={n.id}
            aria-label={`${n.name} ${port} input`}
            data-tooltip={`${type} input. Connect a matching output, or use Node properties to choose a source.`}
            disabled={c.busy}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              if (link) {
                c.connect(link, n.id, port);
                setLink(undefined);
              } else c.select(n.id);
            }}
          >
            <i />
            {port}
          </button>
        ))}
      </div>
      {n.kind !== "output" && (
        <button
          className={`graph-port output ${DEFINITIONS[n.kind].output}`}
          data-graph-output={n.id}
          aria-label={`${n.name} output`}
          disabled={c.busy}
          data-tooltip="Drag to a matching input. Keyboard: activate this output, then activate an input."
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setLink(n.id);
            setCursor(point(event.clientX, event.clientY));
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (link) setCursor(point(event.clientX, event.clientY));
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            const input = document
              .elementFromPoint(event.clientX, event.clientY)
              ?.closest<HTMLElement>("[data-graph-input]");
            if (input) {
              c.connect(
                n.id,
                input.dataset.graphTarget!,
                input.dataset.graphInput!,
              );
              setLink(undefined);
            }
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onClick={(event) => {
            if (event.detail === 0) {
              setLink(n.id);
              setCursor({ x: n.x + WIDTH + 70, y: n.y + 50 });
            }
          }}
        >
          {DEFINITIONS[n.kind].output}
          <i />
        </button>
      )}
      <div className="graph-node-caption">
        {n.kind === "code"
          ? "TypeShade · 4 state values"
          : n.kind === "parameter"
            ? `p${n.values[0]} · ${g.parameters[n.values[0]!]!.name}`
            : n.values.length
              ? n.values.map((v) => Number(v.toFixed(3))).join(" · ")
              : n.kind === "output"
                ? "Mono · 48 kHz"
                : ""}
      </div>
    </div>
  );
}
