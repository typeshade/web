import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GraphEditor } from "../useGraphEditor.ts";
import {
  DEFINITIONS,
  type GraphNode,
  type NodeKind,
} from "../../graph/model.ts";
import { Panel } from "./Panel.tsx";
import {
  openContext,
  useInteractions,
  type MenuItem,
} from "../interactions.tsx";
const WIDTH = 166;
const curve = (x: number, y: number, a: number, b: number) =>
  `M${x} ${y} C${x + 65} ${y},${a - 65} ${b},${a} ${b}`;
export function GraphCanvas({ controller: c }: { controller: GraphEditor }) {
  const { openMenu } = useInteractions(),
    surface = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 24, y: 32, scale: 0.85 }),
    [link, setLink] = useState<string>(),
    [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [kind, setKind] = useState<NodeKind>("code");
  const drag = useRef<
    | {
        pointer: number;
        x: number;
        y: number;
        node?: GraphNode;
        view: typeof view;
        element: HTMLElement;
      }
    | undefined
  >(undefined);
  const g = c.graph;
  const currentGraph = useRef(g);
  currentGraph.current = g;
  useEffect(() => {
    if (!surface.current || !currentGraph.current) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(surface.current);
    return () => observer.disconnect();
  }, [c.owner]);
  if (!g) return null;
  function point(x: number, y: number) {
    const r = surface.current!.getBoundingClientRect();
    return {
      x: (x - r.left - view.x) / view.scale,
      y: (y - r.top - view.y) / view.scale,
    };
  }
  function finish(cancel = false) {
    const d = drag.current;
    if (!d) return;
    drag.current = undefined;
    if (d.node) {
      if (cancel) c.e.cancelEdit();
      else c.e.endEdit();
    } else if (cancel) setView(d.view);
    try {
      d.element.releasePointerCapture(d.pointer);
    } catch {}
  }
  function down(event: PointerEvent<HTMLElement>, n?: GraphNode) {
    if (event.button !== 0 && event.button !== 1) return;
    if ((event.target as Element).closest("button,input,select,textarea"))
      return;
    event.preventDefault();
    event.stopPropagation();
    const pan = event.button === 1 || c.e.state.tool === "hand" || !n;
    if (n && !pan) {
      event.currentTarget.focus({ preventScroll: true });
      c.select(n.id);
      c.e.beginEdit();
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      node: pan ? undefined : n,
      view,
      element: event.currentTarget,
    };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (link) setCursor(point(event.clientX, event.clientY));
    if (!d) return;
    if (d.node)
      c.edit(d.node.id, {
        x: Math.max(
          -10000,
          Math.min(10000, d.node.x + (event.clientX - d.x) / view.scale),
        ),
        y: Math.max(
          -10000,
          Math.min(10000, d.node.y + (event.clientY - d.y) / view.scale),
        ),
      });
    else
      setView({
        ...d.view,
        x: d.view.x + event.clientX - d.x,
        y: d.view.y + event.clientY - d.y,
      });
  }
  function fit() {
    const r = surface.current!.getBoundingClientRect(),
      xs = currentGraph.current!.nodes.map((n) => n.x),
      ys = currentGraph.current!.nodes.map((n) => n.y),
      minX = Math.min(...xs),
      minY = Math.min(...ys),
      w = Math.max(...xs) + WIDTH - minX,
      h = Math.max(...ys) + 140 - minY,
      s = Math.max(
        0.25,
        Math.min(1.2, (r.width - 60) / w, (r.height - 55) / h),
      );
    setView({
      x: (r.width - w * s) / 2 - minX * s,
      y: (r.height - h * s) / 2 - minY * s,
      scale: s,
    });
  }
  function additions(x: number, y: number): MenuItem[] {
    return (Object.keys(DEFINITIONS) as NodeKind[])
      .filter((k) => k !== "output")
      .map((k) => ({
        label: `Add ${DEFINITIONS[k].label}`,
        disabled:
          c.busy ||
          g!.nodes.length >= 16 ||
          (k === "code" &&
            g!.nodes.filter((n) => n.kind === "code").length >= 2),
        action: () => c.add(k, x, y),
      }));
  }
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
      <div className="graph-toolbar">
        <select
          aria-label="Node type"
          value={kind}
          onChange={(event) => setKind(event.target.value as NodeKind)}
        >
          {(Object.keys(DEFINITIONS) as NodeKind[])
            .filter((k) => k !== "output")
            .map((k) => (
              <option key={k} value={k}>
                {DEFINITIONS[k].label}
              </option>
            ))}
        </select>
        <button
          id="add-graph-node"
          disabled={c.busy || g.nodes.length >= 16}
          onClick={() => {
            const r = surface.current!.getBoundingClientRect(),
              p = point(r.left + r.width / 2, r.top + r.height / 2);
            c.add(kind, p.x, p.y);
          }}
        >
          + Add node
        </button>
        <span className="graph-count">{g.nodes.length} / 16 nodes</span>
        <button disabled={c.busy} onClick={() => c.recipe("impact")}>
          Impact recipe
        </button>
        <button disabled={c.busy} onClick={() => c.recipe("tone")}>
          Tone recipe
        </button>
      </div>
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
          if (drag.current) return;
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
          <svg className="graph-wires" aria-hidden="true">
            {g.nodes.flatMap((n) =>
              Object.entries(n.inputs).map(([port, from]) => {
                const a = g.nodes.find((n) => n.id === from)!;
                const y =
                  n.y +
                  50 +
                  Object.keys(DEFINITIONS[n.kind].inputs).indexOf(port) * 25;
                return (
                  <path
                    key={n.id + port}
                    className={DEFINITIONS[a.kind].output}
                    d={curve(a.x + WIDTH, a.y + 50, n.x, y)}
                  />
                );
              }),
            )}
            {link &&
              (() => {
                const n = g.nodes.find((n) => n.id === link);
                return n ? (
                  <path
                    className="pending"
                    d={curve(n.x + WIDTH, n.y + 50, cursor.x, cursor.y)}
                  />
                ) : null;
              })()}
          </svg>
          {g.nodes.map((n) => (
            <div
              key={n.id}
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
                {Object.entries(DEFINITIONS[n.kind].inputs).map(
                  ([port, type]) => (
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
                  ),
                )}
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
