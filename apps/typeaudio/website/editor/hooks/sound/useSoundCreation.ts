import { BLANK } from "../../../sound-recipes.ts";
import { initialGraph } from "../../../graph/recipes.ts";
import { prepareGraph } from "../../../graph/compilationClient.ts";
import { type Workspace } from "../../state/documentTypes.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { PatchActions } from "./createPatchActions.ts";
export function useSoundCreation(
  { dispatch, editVersion, setNotice }: DocumentController,
  { patch }: PatchActions,
  stopSound: () => void,
  workspace: (next: Workspace) => void,
) {
  function newSound() {
    stopSound();
    dispatch({ type: "select", id: "" });
    patch({ ...BLANK }, "Untitled sound");
    workspace("sound");
    setNotice(
      "New sound. Choose a source, add layers and shape its automation.",
    );
  }
  async function newGraph() {
    const version = editVersion.current;
    setNotice("Preparing a procedural sound…");
    try {
      const graph = initialGraph();
      await prepareGraph(graph);
      if (version !== editVersion.current) {
        setNotice(
          "The sound changed. Choose New procedural sound again when ready.",
        );
        return;
      }
      stopSound();
      dispatch({ type: "select", id: "" });
      patch({ ...BLANK, graph, duration: 2, volume: 0.65 }, "Impact graph");
      workspace("sound");
      setNotice(
        "Procedural sound ready. Start Live, edit exposed parameters, or select the Code node.",
      );
    } catch (error) {
      setNotice(String(error));
    }
  }
  return { newSound, newGraph };
}
