import { useEffect, useState } from "react";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
export function ExposedParameter({
  controller: c,
  index,
}: {
  controller: GraphEditor;
  index: number;
}) {
  const p = c.graph!.parameters[index]!;
  const [open, setOpen] = useState(false),
    [name, setName] = useState(p.name),
    [min, setMin] = useState(String(p.min)),
    [max, setMax] = useState(String(p.max));
  useEffect(() => {
    setName(p.name);
    setMin(String(p.min));
    setMax(String(p.max));
  }, [p.name, p.min, p.max]);
  const update = (value: number) => {
    if (Number.isFinite(value) && value >= p.min && value <= p.max)
      c.change({
        ...c.graph!,
        parameters: c.graph!.parameters.map((old, i) =>
          i === index ? { ...old, value } : old,
        ),
      });
  };
  return (
    <div className="graph-exposed">
      <div>
        <label htmlFor={`graph-param-${index}`}>
          {p.name} <code>p{index}</code>
        </label>
        <button
          aria-label={`Configure p${index}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          …
        </button>
      </div>
      <input
        id={`graph-param-${index}`}
        type="range"
        min={p.min}
        max={p.max}
        step={(p.max - p.min) / 1000}
        value={p.value}
        onPointerDown={c.e.beginEdit}
        onPointerUp={c.e.endEdit}
        onKeyDown={(event) => {
          if (event.key.startsWith("Arrow")) c.e.beginEdit();
        }}
        onKeyUp={c.e.endEdit}
        onBlur={c.e.endEdit}
        onChange={(event) => update(Number(event.target.value))}
      />
      <input
        aria-label={`${p.name} value`}
        type="number"
        step="any"
        min={p.min}
        max={p.max}
        value={p.value}
        onFocus={c.e.beginEdit}
        onBlur={c.e.endEdit}
        onChange={(event) => update(event.target.valueAsNumber)}
      />
      {open && (
        <div className="graph-param-config">
          <input
            aria-label={`p${index} name`}
            maxLength={32}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            aria-label={`p${index} minimum`}
            type="number"
            value={min}
            onChange={(event) => setMin(event.target.value)}
          />
          <input
            aria-label={`p${index} maximum`}
            type="number"
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
          <button
            onClick={() => {
              const lo = Number(min),
                hi = Number(max);
              if (
                name.trim() &&
                Number.isFinite(lo) &&
                Number.isFinite(hi) &&
                lo < hi &&
                lo >= -16000 &&
                hi <= 16000
              ) {
                c.change({
                  ...c.graph!,
                  parameters: c.graph!.parameters.map((old, i) =>
                    i === index
                      ? {
                          name: name.trim(),
                          min: lo,
                          max: hi,
                          value: Math.max(lo, Math.min(hi, old.value)),
                        }
                      : old,
                  ),
                });
                setOpen(false);
              } else
                c.e.setNotice(
                  "Use a name and an increasing range between -16000 and 16000.",
                );
            }}
          >
            Apply range
          </button>
        </div>
      )}
    </div>
  );
}
