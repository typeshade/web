import type {
  FunctionDescriptor,
  FunctionGraphDocument,
  FunctionPort,
} from "typeaudio/function-graph";

export function compatiblePort(
  a: Pick<FunctionPort, "type" | "role" | "rate" | "unit">,
  b: Pick<FunctionPort, "type" | "role" | "rate" | "unit">,
) {
  return (
    a.type === b.type &&
    a.role === b.role &&
    a.rate === b.rate &&
    (a.unit ?? "") === (b.unit ?? "")
  );
}
export function connectionOptions(
  graph: FunctionGraphDocument,
  descriptors: FunctionDescriptor[],
  node: string,
  port: FunctionPort,
) {
  return graph.nodes.flatMap((n) => {
    const d = descriptors.find((d) => d.id === n.definition);
    return d && n.id !== node && compatiblePort(d.output, port)
      ? [{ node: n.id, port: d.output.id, label: `${d.export} · ${n.id}` }]
      : [];
  });
}
