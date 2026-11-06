import { useEffect, useState } from "react";
import type { GraphEditor } from "./useGraphEditor.ts";
import type { GraphViewport } from "./useGraphViewport.ts";
import type { NodeAttachment } from "../../../graph/insertNode.ts";
import type { NodeKind } from "../../../graph/types.ts";
import type { Point } from "../../shared/graphGeometry.ts";
export function useGraphNodePicker(c: GraphEditor, viewport: GraphViewport) {
  const [request, setRequest] = useState<{
    point: Point;
    attachment: NodeAttachment;
    owner: string;
  }>();
  useEffect(() => setRequest(undefined), [c.owner]);
  function open(point = viewport.center(), attachment: NodeAttachment = {}) {
    if (!c.busy) setRequest({ point, attachment, owner: c.owner });
  }
  function close() {
    setRequest(undefined);
    viewport.surface.current?.focus({ preventScroll: true });
  }
  function choose(kind: NodeKind) {
    if (!request || request.owner !== c.owner) return;
    const { point, attachment } = request;
    close();
    void c.add(kind, point.x, point.y, attachment);
  }
  return {
    request: request?.owner === c.owner ? request : undefined,
    open,
    close,
    choose,
  };
}
export type GraphNodePickerController = ReturnType<typeof useGraphNodePicker>;
