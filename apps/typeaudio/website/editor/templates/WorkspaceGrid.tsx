import { PanelSplitter } from "../components/molecules/PanelSplitter.tsx";
import type { ReactNode } from "react";
import type { Workspace } from "../state/documentTypes.ts";
export function WorkspaceGrid({
  workspace,
  hasGraph,
  focused,
  project,
  viewer,
  inspector,
  dock,
  onViewerContextMenu,
}: {
  workspace: Workspace;
  hasGraph: boolean;
  focused: boolean;
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
      className={`workspace ${picture ? "picture-workspace" : "sound-workspace"} ${hasGraph ? "graph-workspace" : ""} ${focused ? "viewer-focused" : ""}`}
      data-workspace={workspace}
    >
      {project}
      <PanelSplitter dimension="project" />
      <div className="viewer-region" onContextMenu={onViewerContextMenu}>
        {viewer}
      </div>
      <PanelSplitter dimension="inspector" />
      <aside className="inspector-region">{inspector}</aside>
      <PanelSplitter dimension="dock" />
      <div className="dock-region">{dock}</div>
    </main>
  );
}
