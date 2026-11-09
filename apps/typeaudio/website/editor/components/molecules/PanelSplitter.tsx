import { useRef } from "react";
import { DIMENSIONS } from "../../layout/constants.ts";
import { useWorkspaceLayout } from "../../hooks/layout/useWorkspaceLayout.ts";
import { type Dimension } from "../../layout/types.ts";
export function PanelSplitter({ dimension }: { dimension: Dimension }) {
  const layout = useWorkspaceLayout(),
    config = DIMENSIONS[dimension],
    axis = dimension === "dock" || dimension === "codeDock" ? "y" : "x",
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
      className={`splitter splitter-${axis} splitter-${dimension === "codeDock" ? "dock" : dimension}`}
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
