import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";
import { ExposedParameter } from "../../molecules/graph/ExposedParameter.tsx";
import { GraphCodeEditor } from "./GraphCodeEditor.tsx";
import type { CodeDocuments } from "../../../hooks/code/useCodeDocuments.ts";
import { CodeLayoutControls } from "../../molecules/code/CodeLayoutControls.tsx";
export function GraphDock({
  controller: c,
  documents,
}: {
  controller: GraphEditor;
  documents: CodeDocuments;
}) {
  return (
    <Panel
      title="Node / Code"
      className="graph-dock-panel"
      actions={<CodeLayoutControls onFocus={documents.focus} />}
    >
      <div className="graph-dock">
        <GraphCodeEditor controller={c} documents={documents} />
        <div className="graph-parameters" aria-label="Exposed parameters">
          <h3 className="graph-parameters-heading">Shared graph parameters</h3>
          {c.graph?.parameters.map((_, i) => (
            <ExposedParameter key={i} controller={c} index={i} />
          ))}
        </div>
      </div>
    </Panel>
  );
}
