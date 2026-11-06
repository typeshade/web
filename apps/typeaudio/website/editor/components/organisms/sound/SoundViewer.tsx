import { useState } from "react";
import { SoundMonitor } from "./SoundMonitor.tsx";
import { Panel } from "../../molecules/Panel.tsx";
import { GraphCanvas } from "../graph/GraphCanvas.tsx";
import type { Editor } from "../../../useEditor.ts";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
export function SoundViewer({
  editor: e,
  graph,
  hidden: picture,
}: {
  editor: Editor;
  graph: GraphEditor;
  hidden: boolean;
}) {
  const [graphMonitor, setGraphMonitor] = useState(false);
  return (
    <div
      className={`document-view ${graph.graph ? "has-graph" : ""}`}
      hidden={picture}
    >
      {!!graph.graph && !graphMonitor ? (
        <GraphCanvas controller={graph} />
      ) : (
        <Panel title="Sound / Monitor">
          <SoundMonitor editor={e} />
        </Panel>
      )}
      {!!graph.graph && (
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
