import type {
  GraphEndpoint,
  GraphConnectionsController,
} from "../../../hooks/graph/useGraphConnections.ts";
import type { Signal } from "typeaudio/graph";
export function GraphPort({
  endpoint,
  name,
  signal,
  connected,
  busy,
  connections,
}: {
  endpoint: GraphEndpoint;
  name: string;
  signal: Signal;
  connected: boolean;
  busy: boolean;
  connections: GraphConnectionsController;
}) {
  const input = endpoint.port !== undefined,
    status = connections.status(endpoint),
    matching = status === "compatible";
  return (
    <button
      type="button"
      className={`graph-port ${input ? "input" : "output"} ${signal} ${connected ? "connected" : ""} ${status ? (matching ? "compatible" : "incompatible") : ""}`}
      data-graph-input={endpoint.port}
      data-graph-target={input ? endpoint.node : undefined}
      data-graph-output={!input ? endpoint.node : undefined}
      aria-label={`${name} ${input ? endpoint.port + " input" : "output"}`}
      aria-pressed={
        connections.pending?.node === endpoint.node &&
        connections.pending?.port === endpoint.port
      }
      data-tooltip={`${signal} ${input ? "input" : "output"}. Drag or activate a matching port. Drop on empty space to add a connected node. Escape cancels.`}
      disabled={busy}
      onPointerDown={(event) => connections.down(event, endpoint)}
      onPointerMove={connections.move}
      onPointerUp={connections.up}
      onPointerCancel={connections.cancel}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) connections.activate(endpoint);
      }}
    >
      {input && <i aria-hidden="true" />}
      {input ? endpoint.port : signal}
      {!input && <i aria-hidden="true" />}
    </button>
  );
}
