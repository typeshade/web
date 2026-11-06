import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GraphEditor } from "./useGraphEditor.ts";
import type { GraphViewport } from "./useGraphViewport.ts";
import type { GraphNode } from "../../../graph/types.ts";
import {
  moveNodes,
  nodeHeight,
  WIDTH,
  type Point,
  type GraphView,
} from "../../shared/graphGeometry.ts";
interface Gesture {
  kind: "nodes" | "pan" | "box";
  pointer: number;
  start: Point;
  view: GraphView;
  element: HTMLElement;
  nodes: GraphNode[];
  ids: string[];
  previous: string[];
  additive: boolean;
  moved: boolean;
  editing: boolean;
  owner: string;
}
export function useGraphGestures(c: GraphEditor, viewport: GraphViewport) {
  const [box, setBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>();
  const [snap, setSnap] = useState(false);
  const drag = useRef<Gesture | undefined>(undefined);
  const latest = useRef(c);
  latest.current = c;
  function finish(cancel = false) {
    const d = drag.current;
    if (!d) return;
    drag.current = undefined;
    viewport.lockZoom.current = false;
    const same = d.owner === latest.current.owner;
    if (d.editing) {
      if (cancel && same) c.e.cancelEdit();
      else c.e.endEdit();
    }
    if (cancel && same && d.kind === "box") c.selectMany(d.previous);
    if (cancel && d.kind === "pan") viewport.setView(d.view);
    setBox(undefined);
    try {
      d.element.releasePointerCapture(d.pointer);
    } catch {}
  }
  useEffect(() => {
    const cancel = () => finish(true);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      finish(true);
    };
  }, [c.owner]);
  function down(event: PointerEvent<HTMLElement>, node?: GraphNode) {
    if (
      (event.button !== 0 && event.button !== 1) ||
      (event.target as Element).closest(
        "button,input,select,textarea,[data-graph-wire]",
      )
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const pan = event.button === 1 || event.altKey || c.e.state.tool === "hand";
    const previous = c.getSelection();
    if (node && !pan)
      c.select(
        node.id,
        event.shiftKey || event.ctrlKey || event.metaKey
          ? "toggle"
          : "preserve",
      );
    event.currentTarget.focus({ preventScroll: true });
    if (node && !pan && !c.isSelected(node.id)) return;
    if (!node && !pan && !event.shiftKey) c.selectMany([]);
    event.currentTarget.setPointerCapture(event.pointerId);
    viewport.lockZoom.current = true;
    drag.current = {
      kind: pan ? "pan" : node ? "nodes" : "box",
      pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      view: viewport.view,
      element: event.currentTarget,
      nodes: c.graph!.nodes,
      ids: c.getSelection(),
      previous,
      additive: event.shiftKey,
      moved: false,
      editing: false,
      owner: c.owner,
    };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    const dx = event.clientX - d.start.x,
      dy = event.clientY - d.start.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    if (d.kind === "pan")
      viewport.setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
    else if (d.kind === "nodes") {
      if (!d.editing) {
        c.e.beginEdit();
        d.editing = true;
      }
      const moved = moveNodes(
        d.nodes,
        d.ids,
        dx / d.view.scale,
        dy / d.view.scale,
        snap,
      );
      const graph = latest.current.graph!;
      c.change({
        ...graph,
        nodes: graph.nodes.map((n) =>
          d.ids.includes(n.id)
            ? {
                ...n,
                x: moved.find((m) => m.id === n.id)!.x,
                y: moved.find((m) => m.id === n.id)!.y,
              }
            : n,
        ),
      });
    } else {
      const a = viewport.point(d.start.x, d.start.y),
        b = viewport.point(event.clientX, event.clientY);
      const rect = {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(a.x - b.x),
        height: Math.abs(a.y - b.y),
      };
      setBox(rect);
      const ids = d.nodes
        .filter(
          (n) =>
            n.x < rect.x + rect.width &&
            n.x + WIDTH > rect.x &&
            n.y < rect.y + rect.height &&
            n.y + nodeHeight(n) > rect.y,
        )
        .map((n) => n.id);
      c.selectMany(d.additive ? [...d.previous, ...ids] : ids);
    }
  }
  return {
    down,
    move,
    finish,
    box,
    snap,
    setSnap,
    dragging: () => !!drag.current,
  };
}
export type GraphGestures = ReturnType<typeof useGraphGestures>;
