import { codeDocumentKey, resolveCodeDraft } from "../../code/codeDraft.ts";
import { useEffect, useState } from "react";
import type {
  FunctionGraphDocument,
  InputBinding,
  PortMetadata,
} from "typeaudio/function-graph";
import {
  validateFunctionDocument,
  FUNCTION_COMPOSITION_PATH,
} from "typeaudio/function-graph";
import type { Editor } from "../../useEditor.ts";
import { useFunctionCompilation } from "./useFunctionCompilation.ts";
import {
  addFunctionInstance,
  removeFunctionInstance,
  setFunctionControl,
  freshFunctionId,
} from "../../../functions/instanceOperations.ts";
import { newFunctionDefinition } from "../../../functions/newDefinition.ts";
import type { MenuItem } from "../../interactions/types.ts";

export function useFunctionEditor(e: Editor, owner: string) {
  const graph = e.state.patch.functions,
    layout = e.state.patch.functionLayout ?? {};
  const compilation = useFunctionCompilation(e, owner);
  const [selected, setSelected] = useState(""),
    [file, setFile] = useState("");
  const [focusRequest, focus] = useState(0);
  const [focusLine, setFocusLine] = useState<number>();
  useEffect(() => {
    setSelected("");
    setFile("");
  }, [owner, e.state.documentEpoch]);
  const id = graph?.nodes.some((n) => n.id === selected)
    ? selected
    : graph?.nodes[0]?.id;
  const node = graph?.nodes.find((n) => n.id === id);
  const definition = graph?.definitions.find((d) => d.id === node?.definition);
  const descriptors =
    compilation.program?.artifacts.map((a) => a.descriptor) ?? [];
  const descriptor = descriptors.find((d) => d.id === node?.definition);
  const activeFile =
    file &&
    (graph?.modules[file] !== undefined ||
      (file === FUNCTION_COMPOSITION_PATH &&
        !!compilation.program?.composition))
      ? file
      : (definition?.module ?? Object.keys(graph?.modules ?? {})[0]);
  const current = () => compilation.latest.current.graph!;
  function select(id: string) {
    e.endEdit();
    setFocusLine(undefined);
    setSelected(id);
    const n = current().nodes.find((n) => n.id === id);
    setFile(
      current().definitions.find((d) => d.id === n?.definition)?.module ?? "",
    );
  }
  async function add(definition: string, copy?: string) {
    const d = descriptors.find((d) => d.id === definition);
    if (!d || compilation.busy) return;
    const next = addFunctionInstance(current(), d, copy);
    const origin = copy
      ? layout[copy]
      : { x: 60 + current().nodes.length * 60, y: 240 };
    if (
      await compilation.apply(next.graph, {
        ...layout,
        [next.id]: {
          x: (origin?.x ?? 0) + 40,
          y: (origin?.y ?? 0) + Math.max(260, 150 + d.inputs.length * 30),
        },
      })
    )
      setSelected(next.id);
  }
  async function create() {
    const next = newFunctionDefinition(current()),
      n = next.nodes.at(-1)!;
    const x =
      Math.max(40, ...current().nodes.map((n) => layout[n.id]?.x ?? 40)) + 280;
    if (await compilation.apply(next, { ...layout, [n.id]: { x, y: 80 } })) {
      setSelected(n.id);
      setFile(next.definitions.at(-1)!.module);
      focus((n) => n + 1);
    }
  }
  function bind(node: string, port: string, binding: InputBinding) {
    const g = current();
    return compilation.apply({
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === node ? { ...n, inputs: { ...n.inputs, [port]: binding } } : n,
      ),
    });
  }
  function change(graph: FunctionGraphDocument) {
    try {
      e.patch({ functions: validateFunctionDocument(graph) });
    } catch (error) {
      compilation.setError(String(error));
    }
  }
  function expose(port: string) {
    if (!node || !descriptor) return;
    const pin = descriptor.inputs.find((p) => p.id === port)!;
    const binding = node.inputs[port],
      id = freshFunctionId("control");
    const value =
      binding?.kind === "constant"
        ? binding.value
        : (pin.default ?? (pin.type === "bool" ? false : 0));
    const g = current();
    void compilation.apply({
      ...g,
      parameters: [
        ...g.parameters,
        { id, name: pin.name, type: pin.type, unit: pin.unit, value },
      ],
      nodes: g.nodes.map((n) =>
        n.id === node.id
          ? {
              ...n,
              inputs: {
                ...n.inputs,
                [port]: { kind: "parameter", parameter: id },
              },
            }
          : n,
      ),
    });
  }
  function remove(id: string) {
    try {
      const nextLayout = { ...layout };
      delete nextLayout[id];
      void compilation.apply(
        removeFunctionInstance(current(), descriptors, id),
        nextLayout,
      );
    } catch (error) {
      compilation.setError(String(error));
    }
  }
  const appliedComposition =
    e.state.patch.functionComposition ??
    compilation.program?.composition?.source;
  const ownedFiles = {
    ...graph?.modules,
    ...(appliedComposition
      ? { [FUNCTION_COMPOSITION_PATH]: appliedComposition }
      : {}),
  };
  const hasDrafts = Object.entries(ownedFiles).some(([path, applied]) => {
    const buffer = resolveCodeDraft(
      e.state.drafts?.[codeDocumentKey(owner, `module:${path}`)],
      applied,
    );
    return buffer.text !== applied || buffer.conflict;
  });
  function openComposition(id?: string) {
    setFile(FUNCTION_COMPOSITION_PATH);
    const key = codeDocumentKey(owner, `module:${FUNCTION_COMPOSITION_PATH}`);
    const buffer =
      appliedComposition &&
      resolveCodeDraft(e.state.drafts?.[key], appliedComposition);
    setFocusLine(
      id && buffer && buffer.text === appliedComposition
        ? compilation.program?.composition?.nodes[id]?.line
        : undefined,
    );
    focus((n) => n + 1);
  }
  async function renameInput(port: string, name: string) {
    if (!node || compilation.busy || hasDrafts) return false;
    return compilation.apply(current(), undefined, false, {
      mode: "project",
      source: appliedComposition,
      rename: { definition: node.definition, port, name },
    });
  }
  function items(id: string): MenuItem[] {
    const n = current().nodes.find((n) => n.id === id)!;
    const d = descriptors.find((d) => d.id === n.definition);
    return [
      {
        label: "Open TypeShade function",
        action: () => {
          select(id);
          focus((n) => n + 1);
        },
      },
      {
        label: "Locate call in composition",
        disabled: !compilation.program?.composition,
        action: () => openComposition(id),
      },
      {
        label: "Duplicate instance",
        shortcut: "Ctrl/⌘ D",
        disabled: compilation.busy,
        action: () => void add(n.definition, id),
      },
      {
        label: "Use as output",
        checked: current().output.node === id,
        disabled: compilation.busy || d?.output.role !== "audio",
        action: () =>
          void compilation.apply({
            ...current(),
            output: { node: id, port: d!.output.id },
          }),
      },
      { separator: true },
      {
        label: "Delete instance",
        danger: true,
        disabled: compilation.busy || current().output.node === id,
        action: () => remove(id),
      },
    ];
  }
  return {
    e,
    owner,
    graph,
    layout,
    ...compilation,
    node,
    descriptor,
    descriptors,
    definition,
    activeFile,
    selectFile: setFile,
    focusRequest,
    focusLine,
    hasDrafts,
    renameInput,
    openComposition,
    focus: () => {
      setFocusLine(undefined);
      focus((n) => n + 1);
    },
    select,
    add,
    create,
    bind,
    expose,
    remove,
    items,
    position: (id: string) =>
      layout[id] ?? {
        x:
          40 +
          Math.max(0, graph?.nodes.findIndex((n) => n.id === id) ?? 0) * 280,
        y: 80,
      },
    move: (id: string, x: number, y: number) =>
      e.patch({
        functionLayout: {
          ...compilation.latest.current.e.state.patch.functionLayout,
          [id]: {
            x: Math.max(-20000, Math.min(20000, x)),
            y: Math.max(-20000, Math.min(20000, y)),
          },
        },
      }),
    control: (id: string, value: number | boolean) =>
      change(setFunctionControl(current(), id, value)),
    configurePort: (name: string, metadata: Partial<PortMetadata>) =>
      compilation.apply({
        ...current(),
        definitions: current().definitions.map((d) =>
          d.id === node?.definition
            ? {
                ...d,
                inputs: {
                  ...d.inputs,
                  [name]: { ...d.inputs[name]!, ...metadata },
                },
              }
            : d,
        ),
      }),
    update: change,
  };
}
export type FunctionEditor = ReturnType<typeof useFunctionEditor>;
