import { duplicationError } from "../../../../graph/duplicateNodes.ts";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";
import { Parameter } from "../../molecules/sound/Parameter.tsx";
export function GraphSelectionInspector({
  controller: c,
}: {
  controller: GraphEditor;
}) {
  const nodes = c.graph!.nodes.filter((n) => c.selectedIds.includes(n.id)),
    removable = nodes.filter((n) => n.kind !== "output");
  return (
    <Panel title="Node properties" className="graph-inspector">
      <h3>
        {nodes.length ? `${nodes.length} nodes selected` : "Select a node"}
      </h3>
      <p className="panel-hint">
        {nodes.length
          ? "Drag to move the group. Duplicate keeps its internal connections. Output stays in the graph."
          : "Click a node to edit its properties. Drag empty canvas space to select a group."}
      </p>
      {nodes.map((node) => (
        <button
          className="graph-selection-item"
          key={node.id}
          onClick={() => c.select(node.id)}
        >
          {node.name}
        </button>
      ))}
      {!!nodes.length && (
        <div className="graph-inspector-actions">
          <button
            disabled={
              c.busy ||
              !removable.length ||
              !!duplicationError(c.graph!, c.selectedIds)
            }
            onClick={() => void c.duplicate()}
          >
            Duplicate selection
          </button>
          <button
            disabled={c.busy || !removable.length}
            onClick={() => void c.remove()}
          >
            Delete selection
          </button>
        </div>
      )}
      <div className="property-section">
        <h3>Sound output</h3>
        <Parameter editor={c.e} name="duration" />
        <Parameter editor={c.e} name="volume" />
      </div>
    </Panel>
  );
}
