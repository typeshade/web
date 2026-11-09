import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";
import { openContext } from "../../../interactions/openContext.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";
import { useGraphViewport } from "../../../hooks/graph/useGraphViewport.ts";
import { useGraphGestures } from "../../../hooks/graph/useGraphGestures.ts";
import { useGraphConnections } from "../../../hooks/graph/useGraphConnections.ts";
import { useGraphNodePicker } from "../../../hooks/graph/useGraphNodePicker.ts";
import { graphKeyboardHandler } from "../../../hooks/graph/graphKeyboardHandler.ts";
import { arrangeGraph } from "../../../shared/graphLayout.ts";
import { GRID } from "../../../shared/graphGeometry.ts";
import { GraphToolbar } from "../../molecules/graph/GraphToolbar.tsx";
import { GraphViewControls } from "../../molecules/graph/GraphViewControls.tsx";
import { GraphConnections } from "../../molecules/graph/GraphConnections.tsx";
import { GraphNodeCard } from "../../molecules/graph/GraphNodeCard.tsx";
import { GraphNodePicker } from "./GraphNodePicker.tsx";
export function GraphCanvas({ controller: c }: { controller: GraphEditor }) {
  const viewport = useGraphViewport(c),
    gestures = useGraphGestures(c, viewport),
    picker = useGraphNodePicker(c, viewport);
  const connections = useGraphConnections(c, viewport, picker),
    { openMenu } = useInteractions();
  const { surface, view } = viewport,
    graph = c.graph;
  if (!graph) return null;
  function arrange() {
    const next = arrangeGraph(graph!);
    c.e.endEdit();
    c.change(next);
    viewport.fit(next.nodes);
  }
  return (
    <Panel
      title="Sound / Node network"
      className="graph-network"
      actions={
        <GraphViewControls
          scale={view.scale}
          hasSelection={!!c.selectedIds.length}
          onFit={() => viewport.fit()}
          onFrame={viewport.frameSelection}
          onZoom={viewport.zoom}
        />
      }
    >
      <GraphToolbar
        count={graph.nodes.length}
        selected={c.selectedIds.length}
        busy={c.busy}
        snap={gestures.snap}
        onSnap={gestures.setSnap}
        onAdd={() => {
          connections.cancel();
          picker.open();
        }}
        onArrange={arrange}
        onRecipe={(recipe) => {
          connections.cancel();
          void c.recipe(recipe);
        }}
      />
      <div
        ref={surface}
        className={`graph-surface ${connections.pending ? "is-connecting" : ""}`}
        tabIndex={0}
        aria-label="Node graph canvas"
        aria-describedby="graph-canvas-help"
        style={{
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundSize: `${GRID * view.scale * (view.scale < 0.5 ? 2 : 1)}px ${GRID * view.scale * (view.scale < 0.5 ? 2 : 1)}px`,
        }}
        onPointerDown={(event) => {
          connections.select();
          gestures.down(event);
        }}
        onPointerMove={(event) => {
          gestures.move(event);
          connections.move(event);
        }}
        onPointerUp={() => gestures.finish()}
        onPointerCancel={() => {
          gestures.finish(true);
          connections.cancel();
        }}
        onLostPointerCapture={() => gestures.finish(true)}
        onDoubleClick={(event) => {
          if (
            !(event.target as Element).closest(
              "[data-graph-node],[data-graph-wire]",
            )
          )
            picker.open(viewport.point(event.clientX, event.clientY));
        }}
        onKeyDown={graphKeyboardHandler(
          c,
          viewport,
          gestures,
          connections,
          picker,
        )}
        onContextMenu={(event) => {
          if (
            (event.target as Element).closest(
              "[data-graph-node],[data-graph-wire]",
            )
          )
            return;
          const point = viewport.point(event.clientX, event.clientY);
          openContext(event, openMenu, "graph-canvas", "Graph actions", [
            {
              label: "Add node…",
              shortcut: "Tab",
              disabled: c.busy,
              action: () => picker.open(point),
            },
            {
              label: "Select all nodes",
              shortcut: "Ctrl/⌘ A",
              action: () => c.selectMany(graph.nodes.map((n) => n.id)),
            },
            { label: "Arrange nodes", disabled: c.busy, action: arrange },
            { separator: true },
            {
              label: "Frame selection",
              shortcut: "F",
              disabled: !c.selectedIds.length,
              action: viewport.frameSelection,
            },
            {
              label: "Fit graph",
              shortcut: "Home",
              action: () => viewport.fit(),
            },
          ]);
        }}
      >
        <div
          className="graph-world"
          style={{
            transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
          }}
        >
          <GraphConnections
            graph={graph}
            connections={connections}
            picker={picker}
            busy={c.busy}
          />
          {graph.nodes.map((node) => (
            <GraphNodeCard
              key={node.id}
              node={node}
              controller={c}
              gestures={gestures}
              connections={connections}
            />
          ))}
          {gestures.box && (
            <div
              className="graph-selection-box"
              style={{
                left: gestures.box.x,
                top: gestures.box.y,
                width: gestures.box.width,
                height: gestures.box.height,
              }}
            />
          )}
        </div>
        {picker.request && <GraphNodePicker graph={graph} picker={picker} />}
      </div>
      <div className="graph-footer" id="graph-canvas-help">
        {c.busy
          ? "Compiling…"
          : (connections.feedback ??
            (connections.selected
              ? "Connection selected · Delete disconnects · Enter inserts a node"
              : "Drag empty space to select · Shift-click adds · Middle-drag pans · Tab adds · F frames selection"))}
      </div>
    </Panel>
  );
}
