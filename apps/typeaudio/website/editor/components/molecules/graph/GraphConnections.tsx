import { DEFINITIONS } from "../../../../graph/catalog.ts";
import type { SoundGraph } from "../../../../graph/types.ts";
import type { GraphConnectionsController } from "../../../hooks/graph/useGraphConnections.ts";
import type { GraphNodePickerController } from "../../../hooks/graph/useGraphNodePicker.ts";
import {
  inputPoint,
  outputPoint,
  curve,
} from "../../../shared/graphGeometry.ts";
import { GraphConnection } from "./GraphConnection.tsx";
export function GraphConnections({
  graph: g,
  connections: c,
  picker,
  busy,
}: {
  graph: SoundGraph;
  connections: GraphConnectionsController;
  picker: GraphNodePickerController;
  busy: boolean;
}) {
  return (
    <svg className="graph-wires" role="group" aria-label="Graph connections">
      {g.nodes.flatMap((n) =>
        Object.entries(n.inputs).map(([port, from]) => {
          const source = g.nodes.find((node) => node.id === from)!,
            start = outputPoint(source),
            end = inputPoint(n, port),
            wire = { from, to: n.id, port };
          return (
            <GraphConnection
              key={n.id + ":" + port}
              wire={wire}
              start={start}
              end={end}
              label={`${source.name} to ${n.name} ${port}`}
              signal={DEFINITIONS[source.kind].output}
              selected={c.selected?.to === n.id && c.selected.port === port}
              busy={busy}
              onSelect={() => c.select(wire)}
              onDisconnect={() => c.disconnect(wire)}
              onInsert={() =>
                picker.open(
                  { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 + 40 },
                  { from, to: { node: n.id, port } },
                )
              }
            />
          );
        }),
      )}
      {c.origin && c.pending && (
        <path
          className="pending"
          d={
            c.pending.port === undefined
              ? curve(c.origin.x, c.origin.y, c.cursor.x, c.cursor.y)
              : curve(c.cursor.x, c.cursor.y, c.origin.x, c.origin.y)
          }
        />
      )}
    </svg>
  );
}
