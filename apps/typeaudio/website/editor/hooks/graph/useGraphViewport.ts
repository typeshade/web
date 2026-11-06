import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GraphEditor } from "./useGraphEditor.ts";
import { DEFINITIONS } from "../../../graph/catalog.ts";
import { type GraphNode, type NodeKind } from "../../../graph/types.ts";
import { useInteractions } from "../interactions/useInteractions.ts";
import { type MenuItem } from "../../interactions/types.ts";
import { WIDTH } from "../../shared/graphGeometry.ts";
export function useGraphViewport(c: GraphEditor) {
  const { openMenu } = useInteractions(),
    surface = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 24, y: 32, scale: 0.85 }),
    [link, setLink] = useState<string>(),
    [cursor, setCursor] = useState({ x: 0, y: 0 });
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

  return {
    dragging: () => !!drag.current,
    surface,
    view,
    setView,
    link,
    setLink,
    cursor,
    setCursor,
    point,
    finish,
    down,
    move,
    fit,
    additions,
    openMenu,
  };
}
export type GraphViewport = ReturnType<typeof useGraphViewport>;
