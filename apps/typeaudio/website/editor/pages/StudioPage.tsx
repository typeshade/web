import { useEditorShortcuts } from "../hooks/interactions/useEditorShortcuts.ts";
import { useEditor } from "../useEditor.ts";
import { WorkspaceShell } from "../templates/WorkspaceShell.tsx";
import { ProjectPanel } from "../components/organisms/project/ProjectPanel.tsx";
import { Composition } from "../components/organisms/picture/Composition.tsx";
import { Timeline } from "../components/organisms/timeline/Timeline.tsx";
import { ClipInspector } from "../components/organisms/picture/ClipInspector.tsx";
import { useWorkspaceLayout } from "../hooks/layout/useWorkspaceLayout.ts";
import { useGraphEditor } from "../hooks/graph/useGraphEditor.ts";
import { GraphDock } from "../components/organisms/graph/GraphDock.tsx";
import { useSoundSelection } from "../hooks/sound/useSoundSelection.ts";
import { useViewerContextMenu } from "../hooks/interactions/useViewerContextMenu.ts";
import { WorkspaceGrid } from "../templates/WorkspaceGrid.tsx";
import { SoundViewer } from "../components/organisms/sound/SoundViewer.tsx";
import { SoundProperties } from "../components/organisms/sound/SoundProperties.tsx";
import { SignalChainPanel } from "../components/organisms/sound/SignalChainPanel.tsx";
import { useCodeDocuments } from "../hooks/code/useCodeDocuments.ts";
import { useCommandPalette } from "../hooks/interactions/useCommandPalette.ts";
import { createStudioCommands } from "../commands/createStudioCommands.ts";
import { CommandPalette } from "../components/organisms/chrome/CommandPalette.tsx";
export function StudioPage() {
  const e = useEditor(),
    layout = useWorkspaceLayout(),
    selection = useSoundSelection(e),
    picture = e.state.workspace === "picture";
  const graph = useGraphEditor(
    selection.sourceEditor,
    JSON.stringify([selection.owner, selection.sourceId]),
  );
  const onViewerContextMenu = useViewerContextMenu(e);
  const documents = useCodeDocuments(graph),
    palette = useCommandPalette(),
    projectFile = useRef<HTMLInputElement>(null);
  const commands = createStudioCommands(
    e,
    graph,
    documents,
    layout,
    projectFile,
  );
  useEditorShortcuts(e);
  return (
    <WorkspaceShell
      editor={e}
      projectFile={projectFile}
      onCommands={() => palette.open()}
    >
      <WorkspaceGrid
        workspace={e.state.workspace}
        hasGraph={!!graph.graph && !picture}
        focused={layout.focused}
        codeMode={layout.codeMode}
        project={<ProjectPanel editor={e} />}
        viewer={
          <>
            <SoundViewer editor={e} graph={graph} hidden={picture} />
            <div className="document-view" hidden={!picture}>
              <Composition editor={e} />
            </div>
          </>
        }
        inspector={
          picture ? (
            <ClipInspector editor={e} />
          ) : (
            <SoundProperties editor={e} selection={selection} graph={graph} />
          )
        }
        dock={
          picture ? (
            <Timeline editor={e} />
          ) : graph.graph ? (
            <GraphDock controller={graph} documents={documents} />
          ) : (
            <SignalChainPanel editor={e} selection={selection} />
          )
        }
        onViewerContextMenu={onViewerContextMenu}
      />
      {palette.mode && (
        <CommandPalette
          key={palette.mode}
          mode={palette.mode}
          commands={
            palette.mode === "files" ? commands.files : commands.commands
          }
          onClose={palette.close}
        />
      )}
    </WorkspaceShell>
  );
}
import { useRef } from "react";
