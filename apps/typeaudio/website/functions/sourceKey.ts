import type { FunctionGraphDocument } from "typeaudio/function-graph";

/** Controls update existing state. Source, bindings and port metadata require preparation. */
export function functionSourceKey(graph: FunctionGraphDocument) {
  return JSON.stringify({
    ...graph,
    parameters: graph.parameters.map(
      ({ value: _value, ...parameter }) => parameter,
    ),
  });
}
