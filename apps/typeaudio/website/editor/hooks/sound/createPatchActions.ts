import { validatePatch } from "../../../sound/validatePatch.ts";
import { type Patch } from "../../../sound/types.ts";
import { BLANK } from "../../../sound-recipes.ts";
import { updatePatch } from "../../state/documentUpdates.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
export function createPatchActions({ dispatch }: DocumentController) {
  function patch(changes: Partial<Patch>, name?: string) {
    dispatch({ type: "edit", edit: (d) => updatePatch(d, changes, name) });
  }
  function editLayer(id: string, changes: Partial<Patch>) {
    dispatch({
      type: "edit",
      edit: (d) =>
        updatePatch(d, {
          layers: d.patch.layers.map((l) =>
            l.id === id
              ? { ...l, patch: validatePatch({ ...l.patch, ...changes }) }
              : l,
          ),
        }),
    });
  }
  function changeLayer(
    id: string,
    changes: { name?: string; offset?: number; muted?: boolean },
  ) {
    dispatch({
      type: "edit",
      edit: (d) =>
        updatePatch(d, {
          layers: d.patch.layers.map((l) =>
            l.id === id ? { ...l, ...changes } : l,
          ),
        }),
    });
  }
  function addLayer(copy?: string) {
    const id = crypto.randomUUID();
    dispatch({
      type: "edit",
      edit: (d) => {
        if (d.patch.layers.length >= 3) return d;
        const original =
          copy === "base"
            ? d.patch
            : d.patch.layers.find((l) => l.id === copy)?.patch;
        return updatePatch(d, {
          layers: [
            ...d.patch.layers,
            {
              id,
              name: copy ? "Layer copy" : "New layer",
              offset: 0,
              muted: false,
              patch: validatePatch({
                ...(original || BLANK),
                layers: [],
                baseMuted: false,
              }),
            },
          ],
        });
      },
    });
    return id;
  }
  function removeLayer(id: string) {
    dispatch({
      type: "edit",
      edit: (d) =>
        updatePatch(d, { layers: d.patch.layers.filter((l) => l.id !== id) }),
    });
  }
  return { patch, editLayer, changeLayer, addLayer, removeLayer };
}

export type PatchActions = ReturnType<typeof createPatchActions>;
