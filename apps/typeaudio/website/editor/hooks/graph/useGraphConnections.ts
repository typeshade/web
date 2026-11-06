import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GraphEditor } from "./useGraphEditor.ts";
import type { GraphViewport } from "./useGraphViewport.ts";
import type { GraphNodePickerController } from "./useGraphNodePicker.ts";
import {
  connectionError,
  type GraphConnection,
} from "../../../graph/connectNodes.ts";
import {
  inputPoint,
  outputPoint,
  type Point,
} from "../../shared/graphGeometry.ts";
export type GraphEndpoint = { node: string; port?: string };
export function useGraphConnections(
  c: GraphEditor,
  viewport: GraphViewport,
  picker: GraphNodePickerController,
) {
  const [pending, setPending] = useState<GraphEndpoint>(),
    [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [hover, setHover] = useState<GraphEndpoint>(),
    [selected, setSelected] = useState<GraphConnection>();
  const active = useRef<GraphEndpoint | undefined>(undefined);
  const drag = useRef<
    { x: number; y: number; element: HTMLElement; pointer: number } | undefined
  >(undefined);
  const graph = c.graph!;
  function cancel() {
    viewport.lockZoom.current = false;
    const d = drag.current;
    drag.current = undefined;
    active.current = undefined;
    setPending(undefined);
    setHover(undefined);
    if (d)
      try {
        d.element.releasePointerCapture(d.pointer);
      } catch {}
  }
  useEffect(() => {
    cancel();
    setSelected(undefined);
  }, [c.owner]);
  useEffect(() => {
    if (pending && !graph.nodes.some((n) => n.id === pending.node)) cancel();
    if (
      selected &&
      graph.nodes.find((n) => n.id === selected.to)?.inputs[selected.port] !==
        selected.from
    )
      setSelected(undefined);
  }, [graph]);
  useEffect(() => {
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, []);
  function connection(
    origin: GraphEndpoint,
    target: GraphEndpoint,
  ): GraphConnection | undefined {
    if (origin.port === undefined && target.port !== undefined)
      return { from: origin.node, to: target.node, port: target.port };
    if (origin.port !== undefined && target.port === undefined)
      return { from: target.node, to: origin.node, port: origin.port };
  }
  function status(target: GraphEndpoint) {
    if (!pending) return undefined;
    const wire = connection(pending, target);
    return wire
      ? (connectionError(graph, wire) ?? "compatible")
      : "Choose a matching input and output.";
  }
  function endpointAt(x: number, y: number): GraphEndpoint | undefined {
    const el = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-graph-output],[data-graph-input]");
    return el?.dataset.graphOutput
      ? { node: el.dataset.graphOutput }
      : el?.dataset.graphTarget
        ? { node: el.dataset.graphTarget, port: el.dataset.graphInput }
        : undefined;
  }
  function start(endpoint: GraphEndpoint) {
    active.current = endpoint;
    setPending(endpoint);
    setSelected(undefined);
    const node = graph.nodes.find((n) => n.id === endpoint.node)!;
    setCursor(
      endpoint.port === undefined
        ? outputPoint(node)
        : inputPoint(node, endpoint.port),
    );
  }
  function commit(origin: GraphEndpoint, target: GraphEndpoint) {
    const wire = connection(origin, target);
    if (!wire) return false;
    const error = connectionError(graph, wire);
    if (error) {
      c.setError(error);
      return false;
    }
    c.connect(wire.from, wire.to, wire.port);
    cancel();
    return true;
  }
  function activate(endpoint: GraphEndpoint) {
    if (c.busy) return;
    if (active.current) {
      if (!commit(active.current, endpoint)) start(endpoint);
    } else start(endpoint);
  }
  function down(event: PointerEvent<HTMLElement>, endpoint: GraphEndpoint) {
    if (event.button !== 0 || c.busy) return;
    event.preventDefault();
    event.stopPropagation();
    // A second click can finish a connection without requiring a drag.
    if (active.current && connection(active.current, endpoint)) {
      commit(active.current, endpoint);
      return;
    }
    start(endpoint);
    event.currentTarget.focus({ preventScroll: true });
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      element: event.currentTarget,
      pointer: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    viewport.lockZoom.current = true;
  }
  function move(event: PointerEvent<HTMLElement>) {
    if (!active.current) return;
    setCursor(viewport.point(event.clientX, event.clientY));
    setHover(endpointAt(event.clientX, event.clientY));
  }
  function up(event: PointerEvent<HTMLElement>) {
    const d = drag.current,
      origin = active.current;
    if (!d || !origin) return;
    event.stopPropagation();
    drag.current = undefined;
    viewport.lockZoom.current = false;
    try {
      d.element.releasePointerCapture(d.pointer);
    } catch {}
    if (Math.hypot(event.clientX - d.x, event.clientY - d.y) < 4) return;
    const target = endpointAt(event.clientX, event.clientY);
    if (target) {
      commit(origin, target);
      cancel();
    } else {
      const inside = viewport.surface.current?.contains(
        document.elementFromPoint(event.clientX, event.clientY),
      );
      const blank = !document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-graph-node]");
      cancel();
      if (inside && blank)
        picker.open(
          viewport.point(event.clientX, event.clientY),
          origin.port === undefined
            ? { from: origin.node }
            : { to: { node: origin.node, port: origin.port } },
        );
    }
  }
  function select(wire?: GraphConnection) {
    cancel();
    setSelected(wire);
    if (wire) c.selectMany([]);
  }
  function disconnect(wire = selected) {
    if (wire && !c.busy) {
      c.connect(undefined, wire.to, wire.port);
      setSelected(undefined);
    }
  }
  const originNode = pending && graph.nodes.find((n) => n.id === pending.node);
  const origin =
    originNode && pending
      ? pending.port === undefined
        ? outputPoint(originNode)
        : inputPoint(originNode, pending.port)
      : undefined;
  const hovered = hover && status(hover);
  return {
    pending,
    cursor,
    origin,
    selected,
    hover,
    status,
    down,
    move,
    up,
    activate,
    cancel,
    select,
    disconnect,
    feedback:
      hovered && hovered !== "compatible"
        ? hovered
        : pending
          ? "Choose a highlighted port, or drop on empty space to add a connected node. Escape cancels."
          : undefined,
  };
}
export type GraphConnectionsController = ReturnType<typeof useGraphConnections>;
