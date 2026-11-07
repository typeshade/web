import type {
  FunctionDescriptor,
  FunctionGraphDocument,
  ScalarValue,
} from "typeaudio/function-graph";

export function freshFunctionId(prefix = "node") {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
export function addFunctionInstance(
  graph: FunctionGraphDocument,
  descriptor: FunctionDescriptor,
  copy?: string,
) {
  const source = graph.nodes.find((n) => n.id === copy);
  const node = {
    id: freshFunctionId(),
    definition: descriptor.id,
    inputs: source
      ? structuredClone(source.inputs)
      : Object.fromEntries(
          descriptor.inputs.map((p) => [
            p.id,
            {
              kind: "constant" as const,
              value: p.default ?? (p.type === "bool" ? false : 0),
            },
          ]),
        ),
  };
  return { graph: { ...graph, nodes: [...graph.nodes, node] }, id: node.id };
}
export function removeFunctionInstance(
  graph: FunctionGraphDocument,
  descriptors: FunctionDescriptor[],
  id: string,
) {
  if (graph.output.node === id)
    throw new Error("Choose another output before deleting this instance.");
  return {
    ...graph,
    nodes: graph.nodes
      .filter((n) => n.id !== id)
      .map((n) => ({
        ...n,
        inputs: Object.fromEntries(
          Object.entries(n.inputs).map(([port, binding]) => {
            const pin = descriptors
              .find((d) => d.id === n.definition)
              ?.inputs.find((p) => p.id === port);
            return [
              port,
              binding.kind === "connection" && binding.node === id
                ? {
                    kind: "constant",
                    value: pin?.default ?? (pin?.type === "bool" ? false : 0),
                  }
                : binding,
            ];
          }),
        ),
      })),
  } as FunctionGraphDocument;
}
export function setFunctionControl(
  graph: FunctionGraphDocument,
  id: string,
  value: ScalarValue,
) {
  return {
    ...graph,
    parameters: graph.parameters.map((p) =>
      p.id === id ? { ...p, value } : p,
    ),
  };
}
