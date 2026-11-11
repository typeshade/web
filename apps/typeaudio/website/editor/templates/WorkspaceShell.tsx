import { type ReactNode, type RefObject } from "react";
import type { Editor } from "../useEditor.ts";
import { AppMenuBar } from "../components/organisms/chrome/AppMenuBar.tsx";
import { MobileTasks } from "../components/molecules/chrome/MobileTasks.tsx";
import { TransportBar } from "../components/organisms/chrome/TransportBar.tsx";
import { DocumentBar } from "../components/molecules/chrome/DocumentBar.tsx";
import { ToolRail } from "../components/molecules/chrome/ToolRail.tsx";
import { StatusBar } from "../components/molecules/chrome/StatusBar.tsx";
export function WorkspaceShell({
  editor: e,
  children,
  projectFile,
  onCommands,
  onProjects,
}: {
  editor: Editor;
  children: ReactNode;
  projectFile: RefObject<HTMLInputElement | null>;
  onCommands: () => void;
  onProjects: () => void;
}) {
  return (
    <div
      className="studio-app"
      data-mobile-panel={e.mobilePanel}
      data-source-editing={e.sourceEditing}
    >
      <a className="skip" href="#editor-main">
        Skip to workspace
      </a>
      <AppMenuBar editor={e} file={projectFile} onCommands={onCommands} />
      <DocumentBar editor={e} onProjects={onProjects} />
      <TransportBar editor={e} />
      <MobileTasks editor={e} />
      <div className="editor-body">
        <ToolRail editor={e} />
        {children}
      </div>
      <StatusBar editor={e} />
    </div>
  );
}
