import { DEFINITIONS } from "../../../../graph/catalog.ts";
import type { SoundGraph } from "../../../../graph/types.ts";
import { WIDTH, curve } from "../../../shared/graphGeometry.ts";
export function GraphConnections({
  graph: g,
  link,
  cursor,
}: {
  graph: SoundGraph;
  link?: string;
  cursor: { x: number; y: number };
}) {
  return (
    <svg className="graph-wires" aria-hidden="true">
      {g.nodes.flatMap((n) =>
        Object.entries(n.inputs).map(([port, from]) => {
          const a = g.nodes.find((n) => n.id === from)!;
          const y =
            n.y +
            50 +
            Object.keys(DEFINITIONS[n.kind].inputs).indexOf(port) * 25;
          return (
            <path
              key={n.id + port}
              className={DEFINITIONS[a.kind].output}
              d={curve(a.x + WIDTH, a.y + 50, n.x, y)}
            />
          );
        }),
      )}
      {link &&
        (() => {
          const n = g.nodes.find((n) => n.id === link);
          return n ? (
            <path
              className="pending"
              d={curve(n.x + WIDTH, n.y + 50, cursor.x, cursor.y)}
            />
          ) : null;
        })()}
    </svg>
  );
}
