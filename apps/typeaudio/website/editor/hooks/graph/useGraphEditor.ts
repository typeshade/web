import { useRef } from "react";
import type { Editor } from "../../useEditor.ts";
import { DEFINITIONS } from "typeaudio/graph";
import { initialGraph } from "../../../graph/recipes.ts";
import { validateGraph } from "typeaudio/graph";
import { connectNodes, connectionError } from "../../../graph/connectNodes.ts";
import {
  duplicateNodes,
  duplicationError,
} from "../../../graph/duplicateNodes.ts";
import { removeNodes } from "../../../graph/removeNodes.ts";
import { insertNode, type NodeAttachment } from "../../../graph/insertNode.ts";
import type { GraphNode, NodeKind, SoundGraph } from "typeaudio/graph";
import type { MenuItem } from "../../interactions/types.ts";
import type { GraphView } from "../../shared/graphGeometry.ts";
import { graphPlacement } from "../../shared/graphPlacement.ts";
import { useGraphSelection } from "./useGraphSelection.ts";
import { useGraphCompilation } from "./useGraphCompilation.ts";

export function useGraphEditor(e: Editor, owner: string) {
  const graph = e.state.patch.graph;
  const selection = useGraphSelection(graph, owner);
  const compilation = useGraphCompilation(e, owner);
  const { latest, apply, setError, busy } = compilation;
  const viewMemory = useRef(new Map<string, GraphView>());
  function select(id: string, mode?: "replace" | "toggle" | "preserve") {
    e.endEdit();
    selection.select(id, mode);
  }
  function change(next: SoundGraph) {
    try {
      e.patch({ graph: validateGraph(next) });
    } catch (error) {
      setError(String(error));
    }
  }
  function edit(id: string, changes: Partial<GraphNode>, compile = false) {
    const current = latest.current.graph;
    if (!current) return;
    const next = {
      ...current,
      nodes: current.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    };
    if (compile) void apply(next);
    else change(next);
  }
  function connect(from: string | undefined, to: string, port: string) {
    const current = latest.current.graph;
    if (!current || busy) return;
    const error = from
      ? connectionError(current, { from, to, port })
      : undefined;
    if (error) {
      setError(error);
      return;
    }
    void apply(connectNodes(current, from, to, port));
  }
  async function add(
    kind: NodeKind,
    x = 120,
    y = 100,
    attachment?: NodeAttachment,
  ) {
    const current = latest.current.graph;
    if (!current || busy) return false;
    try {
      const next = insertNode(
        current,
        kind,
        graphPlacement(current.nodes, kind, { x, y }),
        attachment,
      );
      if (await apply(next.graph)) {
        selection.selectMany([next.id]);
        return true;
      }
    } catch (error) {
      setError(String(error));
    }
    return false;
  }
  async function remove(ids: string | string[] = selection.getSelection()) {
    const current = latest.current.graph;
    if (!current || busy) return;
    const next = removeNodes(current, typeof ids === "string" ? [ids] : ids);
    if (next.nodes.length === current.nodes.length) return;
    if (await apply(next))
      selection.selectMany(
        selection
          .getSelection()
          .filter((id) => next.nodes.some((n) => n.id === id)),
      );
  }
  async function duplicate(ids: string | string[] = selection.getSelection()) {
    const current = latest.current.graph;
    if (!current || busy) return;
    try {
      const next = duplicateNodes(
        current,
        typeof ids === "string" ? [ids] : ids,
      );
      if (next.ids.length && (await apply(next.graph)))
        selection.selectMany(next.ids);
    } catch (error) {
      setError(String(error));
    }
  }
  function items(node: GraphNode): MenuItem[] {
    const ids = selection.isSelected(node.id)
      ? selection.getSelection()
      : [node.id];
    const multiple = ids.length > 1;
    const removable = graph!.nodes.filter(
      (n) => ids.includes(n.id) && n.kind !== "output",
    );
    return [
      { label: "Select node", action: () => select(node.id) },
      {
        label: "Bypass node",
        checked: node.bypass,
        disabled: busy || node.kind === "output",
        action: () => edit(node.id, { bypass: !node.bypass }, true),
      },
      {
        label: multiple
          ? `Duplicate ${removable.length} nodes`
          : "Duplicate node",
        shortcut: "Ctrl/⌘ D",
        disabled: busy || !removable.length || !!duplicationError(graph!, ids),
        action: () => void duplicate(ids),
      },
      {
        label: "Disconnect inputs",
        disabled: busy || !Object.keys(node.inputs).length,
        action: () => edit(node.id, { inputs: {} }, true),
      },
      { separator: true },
      {
        label: multiple ? `Delete ${removable.length} nodes` : "Delete node",
        disabled: busy || !removable.length,
        danger: true,
        action: () => void remove(ids),
      },
    ];
  }
  async function recipe(kind: "impact" | "tone") {
    const next = initialGraph(kind);
    if (await apply(next))
      selection.selectMany([
        next.nodes.find((n) => n.kind === "code")?.id ?? next.nodes[0]!.id,
      ]);
  }
  return {
    e,
    owner,
    graph,
    ...selection,
    ...compilation,
    viewMemory,
    select,
    change,
    edit,
    connect,
    add,
    remove,
    duplicate,
    items,
    recipe,
    definition: selection.selected
      ? DEFINITIONS[selection.selected.kind]
      : undefined,
  };
}
export type GraphEditor = ReturnType<typeof useGraphEditor>;
