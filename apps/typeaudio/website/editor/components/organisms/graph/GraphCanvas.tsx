import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";
import { openContext } from "../../../interactions/openContext.ts";
import { useGraphViewport } from "../../../hooks/graph/useGraphViewport.ts";
import { GraphToolbar } from "../../molecules/graph/GraphToolbar.tsx";
import { GraphConnections } from "../../molecules/graph/GraphConnections.tsx";
import { GraphNodeCard } from "../../molecules/graph/GraphNodeCard.tsx";
export function GraphCanvas({ controller: c }: { controller: GraphEditor }) {
  const viewport = useGraphViewport(c);
  const {
    surface,
    view,
    setView,
    link,
    setLink,
    cursor,
    point,
    finish,
    down,
    move,
    fit,
    additions,
    openMenu,
  } = viewport;
  const g = c.graph;
  if (!g) return null;
  return (
    <Panel
      title="Sound / Node network"
      className="graph-network"
      actions={
        <>
          <button
            onClick={fit}
            data-tooltip="Fit the complete node graph in the viewer."
          >
            Fit
          </button>
          <button
            aria-label="Zoom graph out"
            onClick={() =>
              setView((v) => ({ ...v, scale: Math.max(0.25, v.scale - 0.1) }))
            }
          >
            −
          </button>
          <span>{Math.round(view.scale * 100)}%</span>
          <button
            aria-label="Zoom graph in"
            onClick={() =>
              setView((v) => ({ ...v, scale: Math.min(2, v.scale + 0.1) }))
            }
          >
            +
          </button>
        </>
      }
    >
      <GraphToolbar controller={c} viewport={viewport} />
      <div
        ref={surface}
        className={`graph-surface ${link ? "is-connecting" : ""}`}
        tabIndex={0}
        aria-label="Node graph canvas"
        aria-describedby="graph-canvas-help"
        onPointerDown={(event) => down(event)}
        onPointerMove={move}
        onPointerUp={() => finish()}
        onPointerCancel={() => finish(true)}
        onLostPointerCapture={() => finish(true)}
        onWheel={(event) => {
          if (viewport.dragging()) return;
          const p = point(event.clientX, event.clientY),
            r = surface.current!.getBoundingClientRect(),
            scale = Math.max(
              0.25,
              Math.min(2, view.scale * Math.exp(-event.deltaY * 0.001)),
            );
          setView({
            scale,
            x: event.clientX - r.left - p.x * scale,
            y: event.clientY - r.top - p.y * scale,
          });
        }}
        onKeyDown={(event) => {
          if ((event.target as Element).closest("input,textarea,select"))
            return;
          if (event.key === "Escape") {
            event.preventDefault();
            setLink(undefined);
            finish(true);
          }
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "d" &&
            c.selected
          ) {
            event.preventDefault();
            event.stopPropagation();
            if (!c.busy) c.duplicate(c.selected.id);
          }
          if (
            (event.key === "Delete" || event.key === "Backspace") &&
            c.selected
          ) {
            event.preventDefault();
            event.stopPropagation();
            if (!c.busy) c.remove(c.selected.id);
          }
          if (
            event.key.toLowerCase() === "f" &&
            !event.ctrlKey &&
            !event.metaKey
          ) {
            event.preventDefault();
            event.stopPropagation();
            fit();
          }
          if (event.key === "Enter" && event.target === surface.current) {
            event.preventDefault();
            surface.current
              ?.querySelector<HTMLElement>(".graph-node.selected")
              ?.focus();
          }
          if (
            event.key === "Tab" &&
            !event.shiftKey &&
            event.target === surface.current
          ) {
            event.preventDefault();
            const r = surface.current!.getBoundingClientRect();
            openMenu(
              "add-node",
              "Add node",
              additions(100, 100),
              { x: r.left + 20, y: r.top + 20 },
              surface.current,
            );
          }
        }}
        onContextMenu={(event) => {
          if ((event.target as Element).closest("[data-graph-node]")) return;
          const p = point(event.clientX, event.clientY);
          openContext(event, openMenu, "graph-canvas", "Graph actions", [
            ...additions(p.x, p.y),
            { separator: true },
            { label: "Fit graph", shortcut: "F", action: fit },
          ]);
        }}
      >
        <div
          className="graph-world"
          style={{
            transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
          }}
        >
          <GraphConnections graph={g} link={link} cursor={cursor} />
          {g.nodes.map((n) => (
            <GraphNodeCard
              key={n.id}
              node={n}
              controller={c}
              viewport={viewport}
            />
          ))}
        </div>
      </div>
      <div className="graph-footer" id="graph-canvas-help">
        {c.busy
          ? "Compiling…"
          : link
            ? "Choose an input · Escape cancels"
            : "Drag nodes / ports · Wheel zooms · Middle-drag pans · Enter selects · Tab adds a node"}
      </div>
    </Panel>
  );
}
