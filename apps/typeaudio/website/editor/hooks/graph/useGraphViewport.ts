import { useEffect, useRef, useState } from "react";
import type { GraphEditor } from "./useGraphEditor.ts";
import {
  graphBounds,
  type GraphView,
  type Point,
} from "../../shared/graphGeometry.ts";

export function useGraphViewport(c: GraphEditor) {
  const surface = useRef<HTMLDivElement>(null);
  const lockZoom = useRef(false);
  const [view, setState] = useState<GraphView>(
    () => c.viewMemory.current.get(c.owner) ?? { x: 24, y: 32, scale: 0.85 },
  );
  const current = useRef({ c, view });
  current.current = { c, view };
  function setView(next: GraphView | ((previous: GraphView) => GraphView)) {
    const value =
      typeof next === "function" ? next(current.current.view) : next;
    current.current.view = value;
    const { viewMemory, owner } = current.current.c;
    viewMemory.current.set(owner, value);
    if (viewMemory.current.size > 32)
      viewMemory.current.delete(viewMemory.current.keys().next().value!);
    setState(value);
  }
  function point(x: number, y: number): Point {
    const r = surface.current!.getBoundingClientRect(),
      v = current.current.view;
    return { x: (x - r.left - v.x) / v.scale, y: (y - r.top - v.y) / v.scale };
  }
  function center() {
    const r = surface.current!.getBoundingClientRect();
    return point(r.left + r.width / 2, r.top + r.height / 2);
  }
  function fit(nodes = current.current.c.graph?.nodes ?? []) {
    const r = surface.current?.getBoundingClientRect();
    if (!r?.width || !r.height || !nodes.length) return;
    const b = graphBounds(nodes),
      scale = Math.max(
        0.15,
        Math.min(1.2, (r.width - 60) / b.width, (r.height - 60) / b.height),
      );
    setView({
      x: (r.width - b.width * scale) / 2 - b.x * scale,
      y: (r.height - b.height * scale) / 2 - b.y * scale,
      scale,
    });
  }
  function frameSelection() {
    const g = current.current.c;
    fit(g.graph?.nodes.filter((n) => g.getSelection().includes(n.id)));
  }
  function zoom(factor: number, anchor?: Point) {
    const r = surface.current!.getBoundingClientRect(),
      v = current.current.view;
    const screen = anchor ?? {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      },
      p = point(screen.x, screen.y);
    const scale = Math.max(0.15, Math.min(2.5, v.scale * factor));
    setView({
      x: screen.x - r.left - p.x * scale,
      y: screen.y - r.top - p.y * scale,
      scale,
    });
  }
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    let initialized = c.viewMemory.current.has(c.owner),
      width = 0,
      height = 0;
    if (initialized) setView(c.viewMemory.current.get(c.owner)!);
    const observer = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (!initialized) {
        fit();
        initialized = true;
      } else if (width && height)
        setView((v) => ({
          ...v,
          x: v.x + (r.width - width) / 2,
          y: v.y + (r.height - height) / 2,
        }));
      width = r.width;
      height = r.height;
    });
    observer.observe(el);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (lockZoom.current) return;
      zoom(Math.exp(-event.deltaY * 0.001), {
        x: event.clientX,
        y: event.clientY,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", wheel);
    };
  }, [c.owner]);
  return {
    surface,
    view,
    setView,
    point,
    center,
    fit,
    frameSelection,
    zoom,
    lockZoom,
  };
}
export type GraphViewport = ReturnType<typeof useGraphViewport>;
