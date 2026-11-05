import { useRef } from "react";
import { DIMENSIONS, useWorkspaceLayout, type Dimension } from "../layout.tsx";
import type { ReactNode } from "react";
export function Panel({
  title,
  children,
  actions,
  className = "",
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`} aria-label={title}>
      <div className="panel-header">
        <h2>{title}</h2>
        <div className="panel-actions">{actions}</div>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Icon({
  name,
}: {
  name:
    | "play"
    | "stop"
    | "select"
    | "hand"
    | "sound"
    | "film"
    | "plus"
    | "undo"
    | "redo"
    | "volume"
    | "folder"
    | "download"
    | "pause";
}) {
  const paths = {
    play: "m9 5 11 7-11 7Z",
    pause: "M8 5v14M16 5v14",
    stop: "M6 6h12v12H6Z",
    select: "m5 3 14 10-7 1-4 7Z",
    hand: "M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 4-3 6-6 6h-1c-3 0-5-3-7-6l-2-3a2 2 0 0 1 3-2l3 3",
    sound: "M3 9h4l5-5v16l-5-5H3ZM16 8q5 4 0 8",
    film: "M3 4h18v16H3ZM3 9h18M7 4v5m5-5v5m5-5v5",
    plus: "M12 5v14M5 12h14",
    undo: "m9 5-5 5 5 5M4 10h9a6 6 0 0 1 0 12",
    redo: "m15 5 5 5-5 5m5-5h-9a6 6 0 0 0 0 12",
    volume: "M3 10h4l5-5v14l-5-5H3ZM16 7q6 5 0 10",
    folder: "M3 6h7l2 3h9v11H3Z",
    download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Splitter({ dimension }: { dimension: Dimension }) {
  const layout = useWorkspaceLayout(),
    config = DIMENSIONS[dimension],
    axis = dimension === "dock" ? "y" : "x",
    direction = dimension === "project" ? 1 : -1;
  const drag = useRef<
    | {
        pointer: number;
        start: number;
        initial: number;
        override: number | undefined;
      }
    | undefined
  >(undefined);
  function end(cancel = false) {
    const d = drag.current;
    if (!d) return;
    drag.current = undefined;
    if (cancel) layout.set(dimension, d.override);
    else layout.save();
  }
  return (
    <div
      className={`splitter splitter-${axis} splitter-${dimension}`}
      role="separator"
      aria-label={config.label}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-valuemin={config.min}
      aria-valuemax={config.max}
      aria-valuenow={layout.size(dimension)}
      data-tooltip={`${config.label}. Drag or use arrow keys. Double-click to reset.`}
      tabIndex={0}
      onDoubleClick={() => {
        layout.set(dimension, undefined);
        layout.save();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && drag.current) {
          event.preventDefault();
          end(true);
          return;
        }
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(event.key)
        ) {
          event.preventDefault();
          const delta =
            (["ArrowLeft", "ArrowUp"].includes(event.key) ? -10 : 10) *
            direction;
          layout.set(
            dimension,
            event.key === "Home"
              ? config.min
              : event.key === "End"
                ? config.max
                : layout.size(dimension) + delta,
          );
          layout.save();
        }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointer: event.pointerId,
          start: axis === "x" ? event.clientX : event.clientY,
          initial: layout.size(dimension),
          override: layout.sizes[dimension],
        };
      }}
      onPointerMove={(event) => {
        const d = drag.current;
        if (d)
          layout.set(
            dimension,
            d.initial +
              ((axis === "x" ? event.clientX : event.clientY) - d.start) *
                direction,
          );
      }}
      onPointerUp={() => end()}
      onPointerCancel={() => end(true)}
      onLostPointerCapture={() => end(true)}
    />
  );
}
