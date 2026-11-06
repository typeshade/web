import { type ReactNode } from "react";
import type { Editor } from "../useEditor.ts";
import { AppMenuBar } from "../components/organisms/chrome/AppMenuBar.tsx";
import { TransportBar } from "../components/organisms/chrome/TransportBar.tsx";
import { DocumentBar } from "../components/molecules/chrome/DocumentBar.tsx";
import { ToolRail } from "../components/molecules/chrome/ToolRail.tsx";
import { StatusBar } from "../components/molecules/chrome/StatusBar.tsx";
export function WorkspaceShell({
  editor: e,
  children,
}: {
  editor: Editor;
  children: ReactNode;
}) {
  return (
    <div className="studio-app">
      <a className="skip" href="#editor-main">
        Skip to workspace
      </a>
      <AppMenuBar editor={e} />
      <DocumentBar editor={e} />
      <TransportBar editor={e} />
      <div className="editor-body">
        <ToolRail editor={e} />
        {children}
      </div>
      <StatusBar editor={e} />
    </div>
  );
}
