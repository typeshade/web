import type { FunctionEditor } from "../../../hooks/functions/useFunctionEditor.ts";
import { curve } from "../../../shared/graphGeometry.ts";

export function FunctionConnections({
  controller: c,
}: {
  controller: FunctionEditor;
}) {
  return (
    <svg className="function-wires" aria-label="Function connections">
      {c.graph?.nodes.flatMap((node) =>
        Object.entries(node.inputs).flatMap(([port, binding]) => {
          if (binding.kind !== "connection") return [];
          const to = c.position(node.id),
            from = c.position(binding.node),
            d = c.descriptors.find((d) => d.id === node.definition),
            index = d?.inputs.findIndex((p) => p.id === port) ?? 0;
          return (
            <g key={`${node.id}:${port}`}>
              <path
                d={curve(
                  from.x + 240,
                  from.y + 70,
                  to.x,
                  to.y + 101 + index * 30,
                )}
              />
              <title>{`${binding.node}.${binding.port} → ${node.id}.${port}`}</title>
            </g>
          );
        }),
      )}
    </svg>
  );
}
