import { useState } from "react";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { DEFINITIONS } from "../../../../graph/catalog.ts";
import { type NodeKind } from "../../../../graph/types.ts";
import type { GraphViewport } from "../../../hooks/graph/useGraphViewport.ts";
export function GraphToolbar({
  controller: c,
  viewport,
}: {
  controller: GraphEditor;
  viewport: GraphViewport;
}) {
  const g = c.graph!,
    { surface, point } = viewport;
  const [kind, setKind] = useState<NodeKind>("code");
  return (
    <div className="graph-toolbar">
      <select
        aria-label="Node type"
        value={kind}
        onChange={(event) => setKind(event.target.value as NodeKind)}
      >
        {(Object.keys(DEFINITIONS) as NodeKind[])
          .filter((k) => k !== "output")
          .map((k) => (
            <option key={k} value={k}>
              {DEFINITIONS[k].label}
            </option>
          ))}
      </select>
      <button
        id="add-graph-node"
        disabled={c.busy || g.nodes.length >= 16}
        onClick={() => {
          const r = surface.current!.getBoundingClientRect(),
            p = point(r.left + r.width / 2, r.top + r.height / 2);
          c.add(kind, p.x, p.y);
        }}
      >
        + Add node
      </button>
      <span className="graph-count">{g.nodes.length} / 16 nodes</span>
      <button disabled={c.busy} onClick={() => c.recipe("impact")}>
        Impact recipe
      </button>
      <button disabled={c.busy} onClick={() => c.recipe("tone")}>
        Tone recipe
      </button>
    </div>
  );
}
