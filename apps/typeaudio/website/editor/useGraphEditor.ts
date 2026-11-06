import { useEffect, useRef, useState } from "react";
import type { Editor } from "./useEditor.ts";
import {
  createNode,
  DEFINITIONS,
  graphKey,
  initialGraph,
  validateGraph,
  type GraphNode,
  type NodeKind,
  type SoundGraph,
} from "../graph/model.ts";
import { prepareGraph } from "../graph/client.ts";
import type { MenuItem } from "./interactions.tsx";
export function useGraphEditor(e: Editor, owner: string) {
  const graph = e.state.patch.graph;
  const [selection, setSelection] = useState({ owner: "", id: "" });
  const selected =
    graph?.nodes.find(
      (n) => selection.owner === owner && n.id === selection.id,
    ) ??
    graph?.nodes.find((n) => n.kind === "code") ??
    graph?.nodes[0];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [source, setSource] = useState("");
  const latest = useRef({ e, owner, graph });
  latest.current = { e, owner, graph };
  const request = useRef(0);
  useEffect(() => {
    request.current++;
    setBusy(false);
    setError("");
    return () => {
      request.current++;
    };
  }, [owner]);
  const key = graph ? graphKey(graph) : "";
  useEffect(() => {
    let active = true;
    if (graph)
      void prepareGraph(graph)
        .then((p) => {
          if (active) {
            setSource(p.source);
            setError("");
          }
        })
        .catch((error) => {
          if (active) setError(String(error));
        });
    return () => {
      active = false;
    };
  }, [key, owner]);
  function select(id: string) {
    e.endEdit();
    setSelection({ owner, id });
  }
  function change(next: SoundGraph) {
    try {
      e.patch({ graph: validateGraph(next) });
    } catch (error) {
      setError(String(error));
    }
  }
  async function apply(next: SoundGraph, selectedId?: string) {
    const id = ++request.current,
      before = JSON.stringify(latest.current.graph),
      sourceOwner = owner;
    setBusy(true);
    setError("");
    try {
      const checked = validateGraph(next),
        program = await prepareGraph(checked);
      if (id !== request.current || sourceOwner !== latest.current.owner)
        return;
      if (JSON.stringify(latest.current.graph) !== before)
        throw new Error(
          "The sound changed during compilation. Apply again to keep the newer edits.",
        );
      latest.current.e.endEdit();
      latest.current.e.patch({ graph: checked });
      if (selectedId) setSelection({ owner, id: selectedId });
      setSource(program.source);
      e.setNotice(
        "Graph applied. Parameter edits preserve running state. Retrigger starts a new note.",
      );
    } catch (error) {
      if (id === request.current) {
        setError(String(error));
        e.setNotice("Graph unchanged. Fix the node error and apply again.");
      }
    } finally {
      if (id === request.current) setBusy(false);
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
    const n = latest.current.graph?.nodes.find((n) => n.id === to);
    if (!n) return;
    const inputs = { ...n.inputs };
    if (from) inputs[port] = from;
    else delete inputs[port];
    edit(to, { inputs }, true);
  }
  function add(kind: NodeKind, x = 120, y = 100) {
    const current = latest.current.graph;
    if (!current) return;
    const n = createNode(kind, undefined, x, y);
    void apply({ ...current, nodes: [...current.nodes, n] }, n.id);
  }
  function remove(id: string) {
    const current = latest.current.graph;
    if (!current || current.nodes.find((n) => n.id === id)?.kind === "output")
      return;
    void apply({
      ...current,
      nodes: current.nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          inputs: Object.fromEntries(
            Object.entries(n.inputs).filter(([, source]) => source !== id),
          ),
        })),
    });
  }
  function duplicate(id: string) {
    const current = latest.current.graph,
      n = current?.nodes.find((n) => n.id === id);
    if (!current || !n || n.kind === "output") return;
    const copy = {
      ...n,
      id: crypto.randomUUID(),
      name: n.name.slice(0, 34) + " copy",
      x: Math.min(10000, n.x + 35),
      y: Math.min(10000, n.y + 95),
    };
    void apply({ ...current, nodes: [...current.nodes, copy] }, copy.id);
  }
  function items(n: GraphNode): MenuItem[] {
    return [
      { label: "Select node", action: () => select(n.id) },
      {
        label: "Bypass node",
        checked: n.bypass,
        disabled: busy || n.kind === "output",
        action: () => edit(n.id, { bypass: !n.bypass }, true),
      },
      {
        label: "Duplicate node",
        shortcut: "Ctrl/⌘ D",
        disabled: busy || n.kind === "output" || graph!.nodes.length >= 16,
        action: () => duplicate(n.id),
      },
      {
        label: "Disconnect inputs",
        disabled: busy || !Object.keys(n.inputs).length,
        action: () => edit(n.id, { inputs: {} }, true),
      },
      { separator: true },
      {
        label: "Delete node",
        disabled: busy || n.kind === "output",
        danger: true,
        action: () => remove(n.id),
      },
    ];
  }
  return {
    e,
    owner,
    graph,
    selected,
    busy,
    error,
    source,
    select,
    change,
    apply,
    edit,
    connect,
    add,
    remove,
    duplicate,
    items,
    recipe: (recipe: "impact" | "tone") => void apply(initialGraph(recipe)),
    definition: selected ? DEFINITIONS[selected.kind] : undefined,
  };
}
export type GraphEditor = ReturnType<typeof useGraphEditor>;
