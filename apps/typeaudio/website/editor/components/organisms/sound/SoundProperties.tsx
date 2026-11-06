import { SoundEditor } from "./SoundEditor.tsx";
import { SourceRack } from "./SourceRack.tsx";
import { GraphInspector } from "../graph/GraphInspector.tsx";
import type { Editor } from "../../../useEditor.ts";
import type { SoundSelection } from "../../../hooks/sound/useSoundSelection.ts";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
export function SoundProperties({
  editor: e,
  selection,
  graph,
}: {
  editor: Editor;
  selection: SoundSelection;
  graph: GraphEditor;
}) {
  const { owner, layer, sourceEditor, module, selectSource } = selection;
  return (
    <>
      {graph.graph ? (
        <GraphInspector controller={graph} />
      ) : (
        <SoundEditor
          key={`${owner}-${layer?.id || "base"}`}
          editor={sourceEditor}
          sourceName={layer?.name || "Base source"}
          module={module}
        />
      )}
      <SourceRack
        editor={e}
        selected={layer?.id || "base"}
        select={selectSource}
      />
    </>
  );
}
