import type { KeyboardEvent } from "react";
import type { GraphEditor } from "./useGraphEditor.ts";
import type { GraphViewport } from "./useGraphViewport.ts";
import type { GraphGestures } from "./useGraphGestures.ts";
import type { GraphConnectionsController } from "./useGraphConnections.ts";
import type { GraphNodePickerController } from "./useGraphNodePicker.ts";
export function graphKeyboardHandler(
  c: GraphEditor,
  view: GraphViewport,
  gestures: GraphGestures,
  links: GraphConnectionsController,
  picker: GraphNodePickerController,
) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("input,textarea,select")) return;
    const key = event.key.toLowerCase(),
      command = event.ctrlKey || event.metaKey;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    if (key === "escape") {
      handled();
      gestures.finish(true);
      links.cancel();
      links.select();
      return;
    }
    if (command && key === "z" && gestures.dragging()) {
      handled();
      gestures.finish(true);
      return;
    }
    if (command && key === "a") {
      handled();
      links.select();
      c.selectMany(c.graph!.nodes.map((n) => n.id));
      return;
    }
    if (command && key === "d") {
      handled();
      if (!c.busy) void c.duplicate();
      return;
    }
    if (key === "delete" || key === "backspace") {
      handled();
      if (links.selected) links.disconnect();
      else if (!c.busy) void c.remove();
      return;
    }
    if (!command && key === "f") {
      handled();
      c.getSelection().length ? view.frameSelection() : view.fit();
      return;
    }
    if (key === "home") {
      handled();
      view.fit();
      return;
    }
    if (key === "enter" && event.target === view.surface.current) {
      handled();
      (
        view.surface.current.querySelector<HTMLElement>(
          ".graph-node.primary-selection",
        ) ?? view.surface.current.querySelector<HTMLElement>(".graph-node")
      )?.focus();
      return;
    }
    if (
      (key === "tab" &&
        !event.shiftKey &&
        event.target === view.surface.current) ||
      (key === "a" && event.shiftKey && !command)
    ) {
      handled();
      links.cancel();
      picker.open();
    }
  };
}
