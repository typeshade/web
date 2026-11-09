import type { RefObject } from "react";
import type { Editor } from "../useEditor.ts";
import type { GraphEditor } from "../hooks/graph/useGraphEditor.ts";
import type { CodeDocuments } from "../hooks/code/useCodeDocuments.ts";
import type { useWorkspaceLayout } from "../hooks/layout/useWorkspaceLayout.ts";
import { applicationMenu } from "../interactions/applicationMenu.ts";
import { arrangeGraph } from "../shared/graphLayout.ts";
import type { StudioCommand } from "./types.ts";

/** File/Edit/Window actions share their source with the application menus. */
export function createStudioCommands(
  e: Editor,
  c: GraphEditor,
  code: CodeDocuments,
  layout: ReturnType<typeof useWorkspaceLayout>,
  file: RefObject<HTMLInputElement | null>,
) {
  const commands: StudioCommand[] = ["File", "Edit", "Window"].flatMap(
    (group) =>
      applicationMenu(
        group as "File" | "Edit" | "Window",
        e,
        layout,
        file,
        () => void e.exportProject(),
      ).flatMap((item, i) =>
        "separator" in item
          ? []
          : [
              {
                id: `${group}.${i}`,
                group,
                label: item.label,
                shortcut: item.shortcut,
                disabled: item.disabled,
                run: item.action,
              },
            ],
      ),
  );
  commands.push(
    {
      id: "sound",
      group: "Workspace",
      label: "Open Sound workspace",
      run: () => e.workspace("sound"),
    },
    {
      id: "picture",
      group: "Workspace",
      label: "Open Picture workspace",
      run: () => e.workspace("picture"),
    },
    {
      id: "live",
      group: "Audio",
      label: e.live ? "Stop live sound" : "Start live sound",
      disabled: e.busy || e.state.workspace === "picture",
      run: () => {
        if (e.live) e.stopSound();
        else {
          e.setMode("live");
          void e.startLive();
        }
      },
    },
    {
      id: "save-sound",
      group: "File",
      label: "Save sound to library",
      run: e.savePatch,
    },
  );
  const files: StudioCommand[] = c.graph
    ? code.documents.map((doc) => ({
        id: `code.${doc.id}`,
        group: "Code document",
        label: doc.label + (doc.dirty ? " · unapplied" : ""),
        run: () => {
          e.workspace("sound");
          layout.focus(false);
          code.select(doc.id);
          code.focus();
        },
      }))
    : [];
  if (c.graph)
    commands.push(
      {
        id: "code.bottom",
        group: "Layout",
        label: "Code below graph",
        run: () => {
          e.workspace("sound");
          layout.focus(false);
          layout.setCodeMode("bottom");
        },
      },
      {
        id: "code.right",
        group: "Layout",
        label: "Code beside graph",
        disabled: !layout.wide,
        run: () => {
          e.workspace("sound");
          layout.focus(false);
          layout.setCodeMode("right");
        },
      },
      {
        id: "code.focus",
        group: "Layout",
        label: "Focus code editor",
        run: () => {
          e.workspace("sound");
          layout.focus(false);
          layout.setCodeMode("code");
          code.focus();
        },
      },
      {
        id: "code.apply",
        group: "Code",
        label: "Apply current draft",
        shortcut: "Ctrl/⌘ Enter",
        disabled: c.busy || !code.dirty || code.conflict || code.generated,
        run: () => void code.apply(),
      },
      {
        id: "code.revert",
        group: "Code",
        label: "Revert current draft",
        disabled: !code.dirty || c.busy || code.generated,
        run: code.revert,
      },
      {
        id: "graph.arrange",
        group: "Graph",
        label: "Arrange nodes",
        disabled: c.busy,
        run: () => {
          c.e.endEdit();
          c.change(arrangeGraph(c.graph!));
        },
      },
      {
        id: "graph.code",
        group: "Graph",
        label: "Add Code node",
        disabled:
          c.busy ||
          c.graph.nodes.length >= 16 ||
          c.graph.nodes.filter((n) => n.kind === "code").length >= 2,
        run: () => void c.add("code"),
      },
      ...files,
    );
  return { commands, files };
}
