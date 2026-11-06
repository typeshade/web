import { useEffect, useState } from "react";
import type { GraphEditor } from "../useGraphEditor.ts";
import { DEFINITIONS } from "../../graph/model.ts";
import { Panel } from "./Panel.tsx";
import { Parameter } from "./SoundEditor.tsx";
export function GraphInspector({ controller: c }: { controller: GraphEditor }) {
  const n = c.selected,
    g = c.graph;
  if (!n || !g) return null;
  const def = DEFINITIONS[n.kind];
  return (
    <Panel title="Node properties" className="graph-inspector">
      <label>
        Node name
        <input
          aria-label="Node name"
          maxLength={40}
          value={n.name}
          onFocus={c.e.beginEdit}
          onBlur={c.e.endEdit}
          onChange={(event) => {
            if (event.target.value.trim())
              c.edit(n.id, { name: event.target.value });
          }}
        />
      </label>
      <p className="panel-hint">{def.hint}</p>
      {def.controls.map((control, i) => (
        <label className="graph-field" key={i}>
          {control.name}
          <input
            type="number"
            aria-label={control.name}
            min={control.min}
            max={control.max}
            step={control.step}
            value={n.values[i]}
            onFocus={c.e.beginEdit}
            onBlur={c.e.endEdit}
            onChange={(event) => {
              const v = event.target.valueAsNumber;
              if (Number.isFinite(v) && v >= control.min && v <= control.max)
                c.edit(n.id, {
                  values: n.values.map((old, j) => (i === j ? v : old)),
                });
            }}
          />
        </label>
      ))}
      {Object.entries(def.inputs).map(([port, type]) => (
        <label className="graph-field" key={port}>
          {port} · {type}
          <select
            aria-label={`${port} connection`}
            disabled={c.busy}
            value={n.inputs[port] ?? ""}
            onChange={(event) =>
              c.connect(event.target.value || undefined, n.id, port)
            }
          >
            <option value="">
              {type === "audio" ? "Unconnected (silence)" : "Use node value"}
            </option>
            {g.nodes
              .filter(
                (from) =>
                  from.id !== n.id &&
                  from.kind !== "output" &&
                  DEFINITIONS[from.kind].output === type,
              )
              .map((from) => (
                <option key={from.id} value={from.id}>
                  {from.name}
                </option>
              ))}
          </select>
        </label>
      ))}
      <label className="check">
        <input
          type="checkbox"
          checked={n.bypass}
          disabled={c.busy || n.kind === "output"}
          onChange={(event) =>
            c.edit(n.id, { bypass: event.target.checked }, true)
          }
        />
        Bypass node
      </label>
      <div className="graph-inspector-actions">
        <button
          disabled={c.busy || n.kind === "output"}
          onClick={() => c.duplicate(n.id)}
        >
          Duplicate
        </button>
        <button
          disabled={c.busy || n.kind === "output"}
          onClick={() => c.remove(n.id)}
        >
          Delete
        </button>
      </div>
      <div className="property-section">
        <h3>Sound output</h3>
        <Parameter editor={c.e} name="duration" />
        <Parameter editor={c.e} name="volume" />
        <p className="panel-hint">
          The graph owns synthesis and processing. Sound-rack effects and unison
          do not process this source. Output is mono; Live and WAV use the same
          CPU graph.
        </p>
      </div>
    </Panel>
  );
}
function ExposedParameter({
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
export function GraphDock({ controller: c }: { controller: GraphEditor }) {
  const n = c.selected;
  const [drafts, setDrafts] = useState<
      Record<string, { base: string; text: string }>
    >({}),
    [generated, setGenerated] = useState(false);
  const id = c.owner + ":" + n?.id,
    draft = drafts[id],
    text = draft?.base === n?.code ? draft!.text : (n?.code ?? ""),
    dirty = text !== n?.code;
  const setDraft = (next: { id: string; base: string; text: string }) =>
    setDrafts((old) => ({
      ...old,
      [next.id]: { base: next.base, text: next.text },
    }));
  return (
    <Panel title="Code / Parameters" className="graph-dock-panel">
      <div className="graph-dock">
        <div className="graph-code-panel">
          <div className="graph-code-toolbar">
            <span>
              {generated
                ? "Generated TypeShade"
                : n?.kind === "code"
                  ? `${n.name} · TypeShade`
                  : "Node code"}
              {dirty && !generated ? " · unapplied" : ""}
            </span>
            <button onClick={() => setGenerated(!generated)}>
              {generated ? "Edit node" : "Generated source"}
            </button>
            {n?.kind === "code" && !generated && (
              <button
                id="apply-graph-code"
                className="primary"
                disabled={c.busy || !dirty}
                onClick={() => c.edit(n.id, { code: text }, true)}
              >
                {c.busy ? "Compiling…" : "Apply code"}
              </button>
            )}
          </div>
          {generated || n?.kind === "code" ? (
            <textarea
              id="graph-code"
              aria-label={
                generated ? "Generated TypeShade" : "TypeShade node code"
              }
              spellCheck={false}
              readOnly={generated}
              value={generated ? c.source : text}
              onChange={(event) =>
                setDraft({ id, base: n!.code, text: event.target.value })
              }
              onKeyDown={(event) => {
                if (
                  (event.ctrlKey || event.metaKey) &&
                  event.key === "Enter" &&
                  !generated &&
                  n
                ) {
                  event.preventDefault();
                  c.edit(n.id, { code: text }, true);
                }
                if (event.key === "Tab" && !generated) {
                  event.preventDefault();
                  const el = event.currentTarget,
                    at = el.selectionStart;
                  setDraft({
                    id,
                    base: n!.code,
                    text:
                      text.slice(0, at) + "  " + text.slice(el.selectionEnd),
                  });
                  requestAnimationFrame(() =>
                    el.setSelectionRange(at + 2, at + 2),
                  );
                }
              }}
            />
          ) : (
            <p className="panel-hint">
              Select a Code node to write TypeShade. Connect its input to
              process an existing signal, or generate audio from p0–p3 and
              persistent state0–state3. Assign the result to out.
            </p>
          )}
          <details className="graph-code-reference">
            <summary>Code reference</summary>
            <p>
              Read input (audio), time (seconds since Retrigger), sampleRate
              (48000), and exposed parameters p0–p3. Assign out. The four scalar
              values state0–state3 persist between samples and reset on
              Retrigger.
            </p>
            <p>
              Use scalar variables, assignments and if statements. Functions:{" "}
              <code>
                sin, cos, abs, min, max, clamp, fract, floor, ceil, sqrt, exp,
                exp2, pow, tanh, mix, select, f32, u32, i32
              </code>
              .
            </p>
            <p>
              A Code node allows 1800 characters and 350 syntax elements. Loops,
              imports, arrays and helper functions are unavailable. Each graph
              supports 16 nodes and two Code nodes. Unapplied drafts stay in
              this session.
            </p>
          </details>
          <p className="graph-code-status" role={c.error ? "alert" : undefined}>
            {c.error ||
              (c.busy
                ? "Compiling off the audio thread…"
                : "Ctrl/⌘ Enter applies code. Draft code is saved to the sound only after a successful compile.")}
          </p>
        </div>
        <div className="graph-parameters" aria-label="Exposed parameters">
          {c.graph?.parameters.map((_, i) => (
            <ExposedParameter key={i} controller={c} index={i} />
          ))}
        </div>
      </div>
    </Panel>
  );
}
