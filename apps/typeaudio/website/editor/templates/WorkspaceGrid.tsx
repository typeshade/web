import { PanelSplitter } from "../components/molecules/PanelSplitter.tsx";
import type { ReactNode } from "react";
import type { Workspace } from "../state/documentTypes.ts";
import type { CodeMode } from "../layout/types.ts";
export function WorkspaceGrid({
  workspace,
  hasGraph,
  focused,
  codeMode,
  project,
  viewer,
  inspector,
  dock,
  onViewerContextMenu,
}: {
  workspace: Workspace;
  hasGraph: boolean;
  focused: boolean;
  codeMode: CodeMode;
  project: ReactNode;
  viewer: ReactNode;
  inspector: ReactNode;
  dock: ReactNode;
  onViewerContextMenu: React.MouseEventHandler<HTMLDivElement>;
}) {
  const picture = workspace === "picture";
  return (
    <main
      id="editor-main"
      tabIndex={-1}
      className={`workspace ${picture ? "picture-workspace" : "sound-workspace"} ${hasGraph ? `graph-workspace code-layout-${codeMode}` : ""} ${focused ? "viewer-focused" : ""}`}
      data-workspace={workspace}
    >
      {project}
      <PanelSplitter dimension="project" />
      <div className="viewer-region" onContextMenu={onViewerContextMenu}>
        {viewer}
      </div>
      <PanelSplitter dimension="inspector" />
      <aside className="inspector-region">{inspector}</aside>
      <PanelSplitter
        dimension={
          hasGraph && !picture
            ? codeMode === "right"
              ? "code"
              : "codeDock"
            : "dock"
        }
      />
      <div className="dock-region">{dock}</div>
    </main>
  );
}
