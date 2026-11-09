import { useState } from "react";
import type { Editor } from "../../useEditor.ts";
export function useSoundSelection(e: Editor) {
  const [module, setModule] = useState("source");
  const [selection, setSelection] = useState({ owner: "", id: "base" }),
    owner =
      e.state.selected && !e.selected?.audio
        ? `cue:${e.state.selected}`
        : "source";
  const sourceId = selection.owner === owner ? selection.id : "base",
    layer = e.state.patch.layers.find((l) => l.id === sourceId);
  const selectSource = (id: string) => {
    e.endEdit();
    setSelection({ owner, id });
  };
  const sourceEditor = layer
    ? {
        ...e,
        state: { ...e.state, patch: layer.patch },
        patch: (changes: Partial<typeof layer.patch>) =>
          e.editLayer(layer.id, changes),
      }
    : e;

  return {
    owner,
    sourceId,
    layer,
    sourceEditor,
    selectSource,
    module,
    setModule,
  };
}
export type SoundSelection = ReturnType<typeof useSoundSelection>;
