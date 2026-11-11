import { functionCommands } from "../commands/functionCommands.ts";
import { SourceBreadcrumb } from "../components/molecules/picture/SourceBreadcrumb.tsx";
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
import { useFunctionEditor } from "../hooks/functions/useFunctionEditor.ts";
import { useFunctionDocuments } from "../hooks/functions/useFunctionDocuments.ts";
import { FunctionCodeDock } from "../components/organisms/functions/FunctionCodeDock.tsx";
import { useProjectLaunch } from "../hooks/project/useProjectLaunch.ts";
import type { LaunchRequest } from "../hooks/session/useAppRoute.ts";
export function StudioPage({
  launch,
  onExit,
}: {
  launch: LaunchRequest;
  onExit: () => void;
}) {
  const e = useEditor(),
    layout = useWorkspaceLayout(),
    selection = useSoundSelection(e),
    picture = e.state.workspace === "picture";
  const sourceEditing =
    picture && e.sourceEditing && !!e.selected && !e.selected.audio;
  const graph = useGraphEditor(
    selection.sourceEditor,
    JSON.stringify([selection.owner, selection.sourceId]),
  );
  const onViewerContextMenu = useViewerContextMenu(e);
  const functions = useFunctionEditor(
    selection.sourceEditor,
    JSON.stringify([selection.owner, selection.sourceId]),
  );
  const functionDocuments = useFunctionDocuments(functions);
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
  if (functions.graph) {
    const extra = functionCommands(functions, functionDocuments, layout);
    commands.files = extra.files;
    commands.commands.push(...extra.commands);
  }
  useEditorShortcuts(e);
  const { leave } = useProjectLaunch(e, launch, onExit);
  return (
    <WorkspaceShell
      editor={e}
      projectFile={projectFile}
      onCommands={() => palette.open()}
      onProjects={leave}
    >
      <WorkspaceGrid
        workspace={e.state.workspace}
        hasGraph={!!(graph.graph || functions.graph) && !picture}
        focused={layout.focused}
        codeMode={layout.codeMode}
        project={
          <ProjectPanel
            editor={e}
            onOpenProject={() => projectFile.current?.click()}
          />
        }
        viewer={
          <>
            <div
              className={
                sourceEditing ? "source-editing-view" : "document-view"
              }
              hidden={picture && !sourceEditing}
            >
              {sourceEditing && (
                <SourceBreadcrumb
                  editor={e}
                  sourceName={selection.layer?.name || "Base source"}
                />
              )}
              <SoundViewer
                editor={e}
                graph={graph}
                functions={functions}
                hidden={false}
              />
              {sourceEditing && functions.graph && (
                <FunctionCodeDock
                  controller={functions}
                  documents={functionDocuments}
                />
              )}
              {sourceEditing && graph.graph && (
                <GraphDock controller={graph} documents={documents} />
              )}
              {sourceEditing && !graph.graph && !functions.graph && (
                <SignalChainPanel editor={e} selection={selection} />
              )}
            </div>
            <div className="document-view" hidden={!picture || sourceEditing}>
              <Composition editor={e} />
            </div>
          </>
        }
        inspector={
          picture && !sourceEditing ? (
            <ClipInspector editor={e} graph={graph} />
          ) : (
            <SoundProperties
              editor={e}
              selection={selection}
              graph={graph}
              functions={functions}
            />
          )
        }
        dock={
          picture ? (
            <Timeline editor={e} />
          ) : functions.graph ? (
            <FunctionCodeDock
              controller={functions}
              documents={functionDocuments}
            />
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
