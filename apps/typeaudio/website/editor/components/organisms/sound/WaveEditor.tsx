import { useRef, useState } from "react";
import type { Editor } from "../../../useEditor.ts";
import { DEFAULT } from "../../../../sound/defaultPatch.ts";
import { WAVE_SIZE } from "../../../../sound/constants.ts";
import { waveFromExpression } from "../../../../wave-expression.ts";
export function WaveEditor({ editor: e }: { editor: Editor }) {
  const [expression, setExpression] = useState(
      "sin(2 * pi * phase) + 0.3 * sin(6 * pi * phase)",
    ),
    [error, setError] = useState(""),
    [index, setIndex] = useState(0);
  const drag = useRef<{ index: number; value: number } | undefined>(undefined),
    wave = e.state.patch.wave;
  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const r = event.currentTarget.getBoundingClientRect(),
      i = Math.max(
        0,
        Math.min(
          WAVE_SIZE - 1,
          Math.round(((event.clientX - r.left) / r.width) * (WAVE_SIZE - 1)),
        ),
      ),
      v = Math.max(
        -1,
        Math.min(1, 1 - (2 * (event.clientY - r.top)) / r.height),
      );
    const next = wave.slice(),
      last = drag.current;
    for (let j = Math.min(last.index, i); j <= Math.max(last.index, i); j++)
      next[j] =
        i === last.index
          ? v
          : last.value +
            ((v - last.value) * (j - last.index)) / (i - last.index);
    drag.current = { index: i, value: v };
    setIndex(i);
    e.patch({ wave: next, shapeA: 5 });
  }
  function end(cancel = false) {
    if (!drag.current) return;
    drag.current = undefined;
    cancel ? e.cancelEdit() : e.endEdit();
  }
  return (
    <div className="wave-editor">
      <p className="panel-hint">
        Draw one cycle, or generate it from an expression. Both oscillators use
        this table when set to Custom wave.
      </p>
      <svg
        viewBox="0 0 280 140"
        className="wave-drawing"
        role="img"
        aria-label="Custom waveform. Drag to draw; edit individual samples below."
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          e.beginEdit();
          const r = event.currentTarget.getBoundingClientRect(),
            i = Math.max(
              0,
              Math.min(
                63,
                Math.round(((event.clientX - r.left) / r.width) * 63),
              ),
            );
          drag.current = { index: i, value: wave[i]! };
          move(event);
        }}
        onPointerMove={move}
        onPointerUp={() => end()}
        onPointerCancel={() => end(true)}
        onLostPointerCapture={() => end(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            end(true);
          }
        }}
      >
        <path className="curve-grid" d="M0 70H280M140 0V140" />
        <polyline
          points={wave
            .map((v, i) => `${(i / 63) * 280},${70 - v * 65}`)
            .join(" ")}
        />
        <circle cx={(index / 63) * 280} cy={70 - wave[index]! * 65} r="3" />
      </svg>
      <div className="wave-sample">
        <label>
          Sample
          <input
            aria-label="Wave sample index"
            type="number"
            min="0"
            max="63"
            value={index}
            onChange={(event) =>
              setIndex(
                Math.max(
                  0,
                  Math.min(63, Math.round(event.target.valueAsNumber || 0)),
                ),
              )
            }
          />
        </label>
        <label>
          Amplitude
          <input
            aria-label="Wave sample amplitude"
            type="number"
            min="-1"
            max="1"
            step=".01"
            value={Number(wave[index]!.toFixed(3))}
            onFocus={e.beginEdit}
            onBlur={e.endEdit}
            onChange={(event) => {
              const v = event.target.valueAsNumber;
              if (Number.isFinite(v) && v >= -1 && v <= 1) {
                const next = wave.slice();
                next[index] = v;
                e.patch({ wave: next, shapeA: 5 });
              }
            }}
          />
        </label>
      </div>
      <label className="expression-field">
        Wave expression
        <textarea
          aria-label="Wave expression"
          spellCheck={false}
          maxLength={512}
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
        />
      </label>
      <div className="button-row">
        <button
          onClick={() => {
            try {
              const next = waveFromExpression(expression);
              e.patch({ wave: next, shapeA: 5 });
              setError("");
            } catch (error) {
              setError(String(error));
            }
          }}
        >
          Apply expression
        </button>
        <button
          onClick={() => {
            e.patch({ wave: DEFAULT.wave, shapeA: 5 });
            setError("");
          }}
        >
          Reset wave
        </button>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <p className="panel-hint">
        phase runs from 0 to 1. Use pi, sin, cos, tanh, abs, sqrt, exp and
        arithmetic. Expressions generate 64 samples with DC removed and peak
        normalized. This editor defines a periodic waveform.
      </p>
    </div>
  );
}
