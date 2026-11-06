import type { GraphConnection as Connection } from "../../../../graph/connectNodes.ts";
import type { Signal } from "../../../../graph/types.ts";
import { curve, type Point } from "../../../shared/graphGeometry.ts";
import { openContext } from "../../../interactions/openContext.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";
export function GraphConnection({
  wire,
  start,
  end,
  label,
  signal,
  selected,
  busy,
  onSelect,
  onDisconnect,
  onInsert,
}: {
  wire: Connection;
  start: Point;
  end: Point;
  label: string;
  signal: Signal;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onDisconnect: () => void;
  onInsert: () => void;
}) {
  const { openMenu } = useInteractions();
  const path = curve(start.x, start.y, end.x, end.y);
  function context(
    event: React.MouseEvent<SVGGElement> | React.KeyboardEvent<SVGGElement>,
  ) {
    onSelect();
    openContext(
      event,
      openMenu,
      `wire-${wire.to}-${wire.port}`,
      "Connection actions",
      [
        { label: "Insert node…", disabled: busy, action: onInsert },
        {
          label: "Disconnect",
          shortcut: "Delete",
          disabled: busy,
          action: onDisconnect,
        },
      ],
    );
  }
  return (
    <g
      data-graph-wire={`${wire.to}:${wire.port}`}
      className={`graph-connection ${selected ? "selected" : ""}`}
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus();
        onSelect();
      }}
      onFocus={onSelect}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (!busy) onInsert();
      }}
      onContextMenu={context}
      onKeyDown={(event) => {
        if (
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10")
        )
          context(event);
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onInsert();
        }
      }}
    >
      <path className={`graph-wire-line ${signal}`} d={path} />
      <path className="graph-wire-hit" d={path} />
    </g>
  );
}
