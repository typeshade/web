import { useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "../../useEditor.ts";
import { DEFAULT } from "../../../sound/defaultPatch.ts";
import { parameterLimits } from "../../../sound/parameterLimits.ts";
import { type Patch } from "../../../sound/types.ts";
import { openContext } from "../../interactions/openContext.ts";
import { useInteractions } from "../../hooks/interactions/useInteractions.ts";
export function NumericValue({
  editor: e,
  name,
  label,
  unit,
  step,
  integer,
  disabled = false,
}: {
  editor: Editor;
  name: Exclude<keyof Patch, "wave" | "curves" | "layers">;
  label: string;
  unit: string;
  step: number;
  integer: boolean;
  disabled?: boolean;
}) {
  const value = e.state.patch[name] as number,
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null),
    button = useRef<HTMLButtonElement>(null),
    returnFocus = useRef(false),
    gesture = useRef<{ x: number; value: number; moved: boolean } | undefined>(
      undefined,
    ),
    suppress = useRef(false),
    finished = useRef(false);
  const { openMenu } = useInteractions(),
    [min, max] = parameterLimits(e.state.patch, name);
  useLayoutEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      button.current?.focus();
    }
  }, [editing]);
  const format = (v: number) => String(Number(v.toFixed(3)));
  function begin() {
    finished.current = false;
    setDraft(format(value));
    setEditing(true);
    e.beginEdit();
  }
  function finish(cancel = false) {
    if (finished.current) return;
    finished.current = true;
    if (cancel || !draft.trim() || !Number.isFinite(Number(draft)))
      e.cancelEdit();
    else {
      const v = Math.max(min, Math.min(max, Number(draft)));
      e.patch({ [name]: integer ? Math.round(v) : v });
      e.endEdit();
    }
    setEditing(false);
  }
  return (
    <span className="numeric-value">
      {editing ? (
        <input
          ref={input}
          id={`${name}-value`}
          className="parameter-number"
          type="number"
          aria-label={`${label} value`}
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            const n = Number(text);
            if (
              text.trim() &&
              Number.isFinite(n) &&
              n >= min &&
              n <= max &&
              (!integer || Number.isInteger(n))
            ) {
              e.beginEdit();
              e.patch({ [name]: n });
            }
          }}
          onBlur={() => finish()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              returnFocus.current = true;
              finish(event.key === "Escape");
            }
          }}
        />
      ) : (
        <button
          ref={button}
          type="button"
          className="parameter-value"
          disabled={disabled}
          aria-label={`Edit ${label} value`}
          data-tooltip={
            disabled
              ? "Beat sync is on. Rate follows BPM."
              : `${label}: drag to adjust, click to type. Hold Shift for finer changes. Right-click to reset.`
          }
          onClick={(event) => {
            if (suppress.current && event.detail > 0) {
              suppress.current = false;
              return;
            }
            begin();
          }}
          onContextMenu={(event) =>
            openContext(
              event,
              openMenu,
              `parameter-${name}`,
              `${label} options`,
              [
                { label: "Enter value…", action: begin },
                {
                  label: `Reset ${label}`,
                  action: () => e.patch({ [name]: DEFAULT[name] }),
                },
              ],
            )
          }
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            suppress.current = false;
            event.currentTarget.setPointerCapture(event.pointerId);
            gesture.current = { x: event.clientX, value, moved: false };
          }}
          onPointerMove={(event) => {
            const g = gesture.current;
            if (!g) return;
            const dx = event.clientX - g.x;
            if (!g.moved && Math.abs(dx) < 3) return;
            if (!g.moved) {
              g.moved = true;
              e.beginEdit();
            }
            const precision = integer ? 1 : step * (event.shiftKey ? 0.1 : 1);
            const raw =
              name === "frequency" || name === "cutoff"
                ? g.value * 2 ** (dx / (event.shiftKey ? 600 : 120))
                : g.value + (dx * precision) / (integer ? 10 : 1);
            const next = Math.max(
              min,
              Math.min(max, Math.round(raw / precision) * precision),
            );
            e.patch({ [name]: next });
          }}
          onPointerUp={() => {
            if (gesture.current?.moved) {
              e.endEdit();
              suppress.current = true;
            }
            gesture.current = undefined;
          }}
          onPointerCancel={() => {
            if (gesture.current?.moved) e.cancelEdit();
            gesture.current = undefined;
          }}
          onLostPointerCapture={() => {
            if (gesture.current?.moved) e.cancelEdit();
            gesture.current = undefined;
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && gesture.current?.moved) {
              event.preventDefault();
              e.cancelEdit();
              gesture.current = undefined;
              suppress.current = true;
            }
          }}
        >
          {format(value)}
        </button>
      )}
      {unit && <span className="parameter-unit">{unit}</span>}
    </span>
  );
}
