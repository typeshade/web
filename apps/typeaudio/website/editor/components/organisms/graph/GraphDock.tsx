import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { Panel } from "../../molecules/Panel.tsx";
import { ExposedParameter } from "../../molecules/graph/ExposedParameter.tsx";
import { GraphCodeEditor } from "./GraphCodeEditor.tsx";
export function GraphDock({ controller: c }: { controller: GraphEditor }) {
  return (
    <Panel title="Code / Parameters" className="graph-dock-panel">
      <div className="graph-dock">
        <GraphCodeEditor controller={c} />
        <div className="graph-parameters" aria-label="Exposed parameters">
          {c.graph?.parameters.map((_, i) => (
            <ExposedParameter key={i} controller={c} index={i} />
          ))}
        </div>
      </div>
    </Panel>
  );
}
