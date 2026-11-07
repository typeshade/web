import { useState } from "react";
import { SoundMonitor } from "./SoundMonitor.tsx";
import { Panel } from "../../molecules/Panel.tsx";
import { GraphCanvas } from "../graph/GraphCanvas.tsx";
import type { Editor } from "../../../useEditor.ts";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import { FunctionCanvas } from "../functions/FunctionCanvas.tsx";
export function SoundViewer({
  editor: e,
  graph,
  functions,
  hidden: picture,
}: {
  editor: Editor;
  graph: GraphEditor;
  functions: FunctionEditor;
  hidden: boolean;
}) {
  const [graphMonitor, setGraphMonitor] = useState(false);
  return (
    <div
      className={`document-view ${graph.graph || functions.graph ? "has-graph" : ""}`}
      hidden={picture}
    >
      {!!functions.graph && !graphMonitor ? (
        <FunctionCanvas controller={functions} />
      ) : !!graph.graph && !graphMonitor ? (
        <GraphCanvas controller={graph} />
      ) : (
        <Panel title="Sound / Monitor">
          <SoundMonitor editor={e} />
        </Panel>
      )}
      {!!(graph.graph || functions.graph) && (
        <div className="graph-view-switch">
          <button
            aria-pressed={!graphMonitor}
            onClick={() => setGraphMonitor(false)}
          >
            Node network
          </button>
          <button
            aria-pressed={graphMonitor}
            onClick={() => setGraphMonitor(true)}
          >
            Waveform / Spectrum
          </button>
        </div>
      )}
    </div>
  );
}
