import { GraphSelectionInspector } from "./GraphSelectionInspector.tsx";
import { duplicationError } from "../../../../graph/duplicateNodes.ts";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { DEFINITIONS } from "typeaudio/graph";
import { Panel } from "../../molecules/Panel.tsx";
import { Parameter } from "../../molecules/sound/Parameter.tsx";
export function GraphInspector({ controller: c }: { controller: GraphEditor }) {
  const n = c.selected,
    g = c.graph;
  if (!g) return null;
  if (!n || c.selectedIds.length !== 1)
    return <GraphSelectionInspector controller={c} />;
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
          disabled={c.busy || !!duplicationError(g, [n.id])}
          data-tooltip={
            duplicationError(g, [n.id]) ??
            "Duplicate this node with its incoming connections."
          }
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
