import { DEFINITIONS } from "typeaudio/graph";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { nodeContext } from "../../../code/nodeContext.ts";

export function BuiltinNodeContext({
  controller: c,
}: {
  controller: GraphEditor;
}) {
  const node = c.selectedIds.length === 1 ? c.selected : undefined;
  if (!node)
    return (
      <div className="builtin-node-context">
        <h3>
          {c.selectedIds.length
            ? `${c.selectedIds.length} nodes selected`
            : "No node selected"}
        </h3>
        <p>
          Select one node to inspect its connections and settings. Select a Code
          node to edit its sample calculation.
        </p>
        <div className="button-row">
          {c.graph?.nodes
            .filter((n) => c.selectedIds.includes(n.id))
            .map((n) => (
              <button key={n.id} onClick={() => c.select(n.id)}>
                {n.name}
              </button>
            ))}
        </div>
      </div>
    );
  const definition = DEFINITIONS[node.kind],
    context = nodeContext(c.graph!, node);
  return (
    <div className="builtin-node-context">
      <h3>
        {node.name} · Built-in {definition.label}
      </h3>
      <p>
        This node uses TypeAudio's built-in processing. Change its controls in
        Node properties; it has no editable sample body.
      </p>
      <p>{definition.hint}</p>
      <dl>
        {definition.controls.map((control, i) => (
          <div key={i}>
            <dt>{control.name}</dt>
            <dd>{node.values[i]}</dd>
          </div>
        ))}
        {context.inputs.map(({ port, source }) => (
          <div key={port}>
            <dt>{port}</dt>
            <dd>
              {source ? (
                <button onClick={() => c.select(source.id)}>
                  {source.name}
                </button>
              ) : definition.inputs[port] === "audio" ? (
                "Silence (0)"
              ) : (
                "Node control value"
              )}
            </dd>
          </div>
        ))}
        <div>
          <dt>Output</dt>
          <dd>
            {node.kind === "output"
              ? "Sound output"
              : context.targets.length
                ? context.targets.map(({ node: target, port }) => (
                    <button
                      key={`${target.id}:${port}`}
                      onClick={() => c.select(target.id)}
                    >
                      {target.name} · {port}
                    </button>
                  ))
                : "No downstream connection"}
          </dd>
        </div>
      </dl>
      {node.bypass && (
        <p className="node-bypass-notice">
          Bypassed: this node's processing is skipped.
        </p>
      )}
    </div>
  );
}
