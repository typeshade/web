import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { FunctionEditor } from "./useFunctionEditor.ts";

export function useFunctionViewport(c: FunctionEditor) {
  const surface = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 20, y: 20, scale: 0.85 });
  const latest = useRef({ c, view });
  latest.current = { c, view };
  const drag = useRef<
    | {
        id?: string;
        pointer: number;
        element: HTMLElement;
        x: number;
        y: number;
        left: number;
        top: number;
        editing: boolean;
        owner: string;
      }
    | undefined
  >(undefined);
  function fit() {
    const el = surface.current,
      { c } = latest.current;
    if (!el || !c.graph?.nodes.length) return;
    const points = c.graph.nodes.map((n) => c.position(n.id)),
      x = Math.min(...points.map((p) => p.x)),
      y = Math.min(...points.map((p) => p.y)),
      width = Math.max(...points.map((p) => p.x + 240)) - x,
      height =
        Math.max(
          ...c.graph.nodes.map(
            (n, i) =>
              points[i]!.y +
              Math.max(
                200,
                150 +
                  (c.descriptors.find((d) => d.id === n.definition)?.inputs
                    .length ?? 3) *
                    30,
              ),
          ),
        ) - y,
      scale = Math.max(
        0.25,
        Math.min(
          1,
          (el.clientWidth - 40) / width,
          (el.clientHeight - 40) / height,
        ),
      );
    setView({
      x: (el.clientWidth - width * scale) / 2 - x * scale,
      y: (el.clientHeight - height * scale) / 2 - y * scale,
      scale,
    });
  }
  function zoom(factor: number, x?: number, y?: number) {
    const el = surface.current,
      v = latest.current.view;
    if (!el) return;
    x ??= el.clientWidth / 2;
    y ??= el.clientHeight / 2;
    const scale = Math.max(0.25, Math.min(2, v.scale * factor));
    setView({
      x: x - ((x - v.x) * scale) / v.scale,
      y: y - ((y - v.y) * scale) / v.scale,
      scale,
    });
  }
  function finish(cancel = false) {
    const d = drag.current;
    if (!d) return;
    drag.current = undefined;
    if (d.editing && d.owner === latest.current.c.owner) {
      if (cancel) latest.current.c.e.cancelEdit();
      else latest.current.c.e.endEdit();
    }
    try {
      d.element.releasePointerCapture(d.pointer);
    } catch {}
  }
  function down(event: PointerEvent<HTMLElement>, id?: string) {
    if (event.button !== 0 && event.button !== 1) return;
    if ((event.target as Element).closest("button,input,select,textarea"))
      return;
    event.preventDefault();
    event.stopPropagation();
    const pan =
      !id || event.button === 1 || event.altKey || c.e.state.tool === "hand";
    if (id && !pan) c.select(id);
    const at = !pan && id ? c.position(id) : view;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: pan ? undefined : id,
      pointer: event.pointerId,
      element: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      left: at.x,
      top: at.y,
      editing: false,
      owner: c.owner,
    };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    const dx = event.clientX - d.x,
      dy = event.clientY - d.y;
    if (d.id) {
      if (!d.editing && Math.hypot(dx, dy) < 3) return;
      if (!d.editing) {
        latest.current.c.e.beginEdit();
        d.editing = true;
      }
      latest.current.c.move(
        d.id,
        d.left + dx / view.scale,
        d.top + dy / view.scale,
      );
    } else setView({ ...view, x: d.left + dx, y: d.top + dy });
  }
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const timer = setTimeout(fit, 0),
      blur = () => finish(true);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (drag.current) return;
      const r = el.getBoundingClientRect();
      zoom(
        Math.exp(-event.deltaY * 0.001),
        event.clientX - r.left,
        event.clientY - r.top,
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", blur);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", blur);
      finish(true);
    };
  }, [c.owner, c.e.state.documentEpoch]);
  useEffect(() => {
    const timer = setTimeout(fit, 0);
    return () => clearTimeout(timer);
  }, [c.graph?.nodes.length]);
  return { surface, view, fit, zoom, down, move, finish };
}
export type FunctionViewport = ReturnType<typeof useFunctionViewport>;
