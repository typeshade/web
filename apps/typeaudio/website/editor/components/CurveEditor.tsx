import { useRef, useState } from "react";
import type { Editor } from "../useEditor.ts";
import {
  CURVE_LIMITS,
  type CurveTarget,
  type CurvePoint,
} from "../../designer.ts";
import { openContext, useInteractions } from "../interactions.tsx";

export function CurveEditor({ editor: e }: { editor: Editor }) {
  const [target, setTarget] = useState<CurveTarget>("pitch"),
    [selected, setSelected] = useState(0);
  const drag = useRef<number | undefined>(undefined),
    suppress = useRef(false),
    { openMenu } = useInteractions();
  const points = e.state.patch.curves[target],
    [low, high] = CURVE_LIMITS[target],
    length = e.state.patch.duration + e.state.patch.release;
  const at = Math.min(selected, points.length - 1),
    point = points[at];
  function apply(next: CurvePoint[]) {
    e.patch({ curves: { ...e.state.patch.curves, [target]: next } });
  }
  function edit(index: number, time: number, value: number) {
    const gap =
      index > 0 && index < points.length - 1
        ? Math.min(
            0.001,
            (points[index + 1]!.time - points[index - 1]!.time) / 4,
          )
        : 0;
    const next = points.map((p, i) =>
      i === index
        ? {
            time:
              index === 0
                ? 0
                : index === points.length - 1
                  ? 1
                  : Math.max(
                      points[index - 1]!.time + gap,
                      Math.min(points[index + 1]!.time - gap, time),
                    ),
            value: Math.max(low, Math.min(high, value)),
          }
        : p,
    );
    apply(next);
  }
  function position(
    event: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>,
  ) {
    const r = event.currentTarget.getBoundingClientRect();
    return {
      time: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)),
      value: Math.max(
        low,
        Math.min(
          high,
          high - ((event.clientY - r.top) / r.height) * (high - low),
        ),
      ),
    };
  }
  function end(cancel = false) {
    if (drag.current === undefined) return;
    drag.current = undefined;
    cancel ? e.cancelEdit() : e.endEdit();
  }
  function preset(kind: "flat" | "rise" | "fall") {
    const center = target === "gain" ? 1 : 0,
      range = target === "pitch" ? 24 : target === "cutoff" ? 4 : 1;
    apply(
      kind === "flat"
        ? [
            { time: 0, value: center },
            { time: 1, value: center },
          ]
        : kind === "fall"
          ? [
              { time: 0, value: range },
              { time: 1, value: target === "gain" ? 0 : -range },
            ]
          : [
              { time: 0, value: target === "gain" ? 0 : -range },
              { time: 1, value: range },
            ],
    );
    setSelected(0);
  }
  return (
    <div className="curve-editor">
      <label>
        Automate
        <select
          aria-label="Automation target"
          value={target}
          onChange={(event) => {
            e.endEdit();
            setTarget(event.target.value as CurveTarget);
            setSelected(0);
          }}
        >
          <option value="pitch">Pitch · semitones</option>
          <option value="cutoff">Filter cutoff · octaves</option>
          <option value="gain">Layer level · multiplier</option>
        </select>
      </label>
      <div className="button-row">
        <button
          disabled={points.length < 2 || points.length >= 16}
          onClick={() => {
            const i = Math.max(0, Math.min(at, points.length - 2)),
              a = points[i]!,
              b = points[i + 1]!;
            const next = points.slice();
            next.splice(i + 1, 0, {
              time: (a.time + b.time) / 2,
              value: (a.value + b.value) / 2,
            });
            apply(next);
            setSelected(i + 1);
          }}
        >
          Add point
        </button>
        <button onClick={() => preset("flat")}>Flat</button>
        <button onClick={() => preset("rise")}>Rise</button>
        <button onClick={() => preset("fall")}>Fall</button>
        <button disabled={!points.length} onClick={() => apply([])}>
          Clear
        </button>
      </div>
      <svg
        viewBox="0 0 280 140"
        className="curve-drawing"
        aria-label={`${target} automation curve`}
        onClick={(event) => {
          if (suppress.current) {
            suppress.current = false;
            return;
          }
          if (
            event.target !== event.currentTarget ||
            !points.length ||
            points.length >= 16
          )
            return;
          const p = position(event);
          if (points.some((q) => Math.abs(q.time - p.time) < 0.002)) return;
          const next = [...points, p].sort((a, b) => a.time - b.time);
          apply(next);
          setSelected(next.indexOf(p));
        }}
        onPointerMove={(event) => {
          if (drag.current === undefined) return;
          suppress.current = true;
          const p = position(event);
          edit(drag.current, p.time, p.value);
        }}
        onPointerUp={() => end()}
        onPointerCancel={() => end(true)}
        onLostPointerCapture={() => end(true)}
      >
        <path className="curve-grid" d="M0 70H280M140 0V140" />
        {points.length > 0 && (
          <polyline
            points={points
              .map(
                (p) =>
                  `${p.time * 280},${((high - p.value) / (high - low)) * 140}`,
              )
              .join(" ")}
          />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.time * 276 + 2}
            cy={2 + ((high - p.value) / (high - low)) * 136}
            r={i === at ? 5 : 4}
            role="button"
            tabIndex={0}
            aria-label={`Curve point ${i + 1}`}
            onFocus={() => setSelected(i)}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              event.currentTarget.focus();
              setSelected(i);
              drag.current = i;
              suppress.current = false;
              e.beginEdit();
              event.currentTarget.ownerSVGElement!.setPointerCapture(
                event.pointerId,
              );
            }}
            onContextMenu={(event) =>
              openContext(
                event,
                openMenu,
                "curve-point",
                "Curve point actions",
                [
                  {
                    label: "Delete point",
                    disabled: i === 0 || i === points.length - 1,
                    action: () => apply(points.filter((_, j) => j !== i)),
                  },
                ],
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                end(true);
              } else if (
                event.key === "Delete" &&
                i > 0 &&
                i < points.length - 1
              ) {
                event.preventDefault();
                event.stopPropagation();
                apply(points.filter((_, j) => j !== i));
              } else if (event.key.startsWith("Arrow")) {
                event.preventDefault();
                event.stopPropagation();
                edit(
                  i,
                  p.time +
                    (event.key === "ArrowRight"
                      ? 0.01
                      : event.key === "ArrowLeft"
                        ? -0.01
                        : 0),
                  p.value +
                    (event.key === "ArrowUp"
                      ? (high - low) / 100
                      : event.key === "ArrowDown"
                        ? -(high - low) / 100
                        : 0),
                );
              }
            }}
          />
        ))}
      </svg>
      <div className="curve-scale">
        <span>0 s</span>
        <span>{length.toFixed(2)} s</span>
      </div>
      {point ? (
        <div className="wave-sample">
          <label>
            Time (s)
            <input
              aria-label="Curve point time"
              type="number"
              step=".01"
              min="0"
              max={length}
              disabled={at === 0 || at === points.length - 1}
              value={Number((point.time * length).toFixed(3))}
              onFocus={e.beginEdit}
              onBlur={e.endEdit}
              onChange={(event) => {
                if (Number.isFinite(event.target.valueAsNumber))
                  edit(at, event.target.valueAsNumber / length, point.value);
              }}
            />
          </label>
          <label>
            {target === "pitch"
              ? "Semitones"
              : target === "cutoff"
                ? "Octaves"
                : "Level"}
            <input
              aria-label="Curve point value"
              type="number"
              min={low}
              max={high}
              step={target === "gain" ? ".01" : ".1"}
              value={Number(point.value.toFixed(3))}
              onFocus={e.beginEdit}
              onBlur={e.endEdit}
              onChange={(event) => {
                if (Number.isFinite(event.target.valueAsNumber))
                  edit(at, point.time, event.target.valueAsNumber);
              }}
            />
          </label>
        </div>
      ) : (
        <p className="panel-hint">
          Choose Flat, Rise or Fall to start a curve.
        </p>
      )}
      <p className="panel-hint">
        Click to add points, drag or use arrow keys to adjust. Escape cancels a
        drag. Curves follow the layer's note and release; the final value holds
        through the effects tail. Cutoff automation requires Filter.
      </p>
    </div>
  );
}
