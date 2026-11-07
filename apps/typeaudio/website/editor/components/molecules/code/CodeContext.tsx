import type { GraphNode, SoundGraph } from "typeaudio/graph";
import { nodeContext } from "../../../code/nodeContext.ts";

export function CodeContext({
  graph,
  node,
  generated,
  onSelectNode,
}: {
  graph: SoundGraph;
  node?: GraphNode;
  generated: boolean;
  onSelectNode: (id: string) => void;
}) {
  if (generated)
    return (
      <p className="code-context-generated">
        Engine output for the whole graph · Read only. This is compiled from the
        nodes; edit a Code node's sample body to change its calculation.
      </p>
    );
  if (!node) return null;
  const context = nodeContext(graph, node);
  return (
    <details className="code-context">
      <summary>
        <strong>
          {context.source?.name ?? "Silence (0)"} → <code>input</code>
        </strong>
        <span>
          <code>out</code> →{" "}
          {context.targets.map((t) => t.node.name).join(", ") || "Unconnected"}
        </span>
        <span>Bindings &amp; state</span>
      </summary>
      {node.bypass && (
        <p className="node-bypass-notice">
          Bypassed: audio passes through the input without executing this code.
        </p>
      )}
      <div className="code-bindings">
        <p>
          This body runs once for each audio sample, at 48,000 samples per
          second. Read <code>input: f32</code> and assign <code>out: f32</code>.
        </p>
        <div className="code-connection-links">
          <span>Input:</span>
          {context.source ? (
            <button
              data-code-target={context.source.id}
              onClick={() => onSelectNode(context.source!.id)}
            >
              {context.source.name}
            </button>
          ) : (
            <span>Unconnected · input = 0</span>
          )}
          <span>Output:</span>
          {context.targets.map(({ node: target, port }) => (
            <button
              key={`${target.id}:${port}`}
              data-code-target={target.id}
              onClick={() => onSelectNode(target.id)}
            >
              {target.name} · {port}
            </button>
          ))}
        </div>
        <p>Shared graph parameters (available without a cable):</p>
        <div className="code-parameter-links">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              data-code-parameter={i}
              disabled={!graph.parameters[i]}
              onClick={() =>
                document.getElementById(`graph-param-${i}`)?.focus()
              }
            >
              <code>p{i}</code> {graph.parameters[i]?.name ?? "Unassigned (0)"}
            </button>
          ))}
        </div>
        <p>
          <code>time: f32</code> Seconds since Retrigger.{" "}
          <code>sampleRate: f32</code> 48000 Hz.
        </p>
        <p>
          <code>state0…state3: f32</code> Values kept between samples. Retrigger
          resets them to zero. Local variables are recalculated for every
          sample.
        </p>
        <p>
          Apply code changes this node's calculation. Its cables, other nodes
          and graph parameters stay in the graph editor. Functions and imports
          are outside this sample-body contract.
        </p>
      </div>
    </details>
  );
}
