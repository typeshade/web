import type { Editor } from "../useEditor.ts";
import { type MenuItem } from "./types.ts";
import { useWorkspaceLayout } from "../hooks/layout/useWorkspaceLayout.ts";

export function applicationMenu(
  name: "File" | "Edit" | "Window",
  e: Editor,
  layout: ReturnType<typeof useWorkspaceLayout>,
  file: React.RefObject<HTMLInputElement | null>,
  save: () => void,
): MenuItem[] {
  const key = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";
  const items: MenuItem[] =
    name === "File"
      ? [
          {
            label: "New sound",
            action: e.newSound,
          },
          {
            label: "New procedural sound",
            id: "new-graph",
            action: () => void e.newGraph(),
          },
          {
            label: "Open project…",
            id: "open-project",
            action: () => file.current?.click(),
          },
          {
            label: "Export project…",
            id: "save-project",
            shortcut: `${key} S`,
            action: save,
          },
          { separator: true },
          {
            label: "Import audio…",
            disabled: e.audioImporting,
            action: () => e.audioInput.current?.click(),
          },
          {
            label: "Import video…",
            action: () => e.videoInput.current?.click(),
          },
          {
            label: "Import sound…",
            action: () => e.patchInput.current?.click(),
          },
        ]
      : name === "Edit"
        ? [
            {
              label: "Undo",
              shortcut: `${key} Z`,
              disabled: !e.state.past.length && !e.state.checkpoint,
              action: e.undo,
            },
            {
              label: "Redo",
              shortcut: `${key} Shift Z`,
              disabled: !e.state.future.length,
              action: e.redo,
            },
            { separator: true },
            {
              label: "Split at playhead",
              shortcut: `${key} Shift D`,
              disabled: !e.selected,
              action: () => e.splitClips(),
            },
            {
              label: "Select all layers",
              shortcut: `${key} A`,
              disabled: !e.state.scene.cues.length,
              action: () =>
                e.dispatch({
                  type: "selectMany",
                  ids: e.state.scene.cues.map((c) => c.id),
                }),
            },
            {
              label:
                e.selectedIds.length > 1
                  ? "Duplicate selected layers"
                  : "Duplicate layer",
              shortcut: `${key} D`,
              disabled:
                !e.selected ||
                e.state.scene.cues.length + e.selectedIds.length > 24,
              action: e.duplicate,
            },
            {
              label:
                e.selectedIds.length > 1
                  ? "Delete selected layers"
                  : "Delete layer",
              shortcut: "Delete",
              disabled: !e.selected,
              danger: true,
              action: e.deleteCue,
            },
          ]
        : [
            {
              label: "Focus viewer",
              shortcut: "F",
              disabled: innerWidth <= 950,
              checked: layout.focused,
              action: () => layout.focus(!layout.focused),
            },
            { separator: true },
            { label: "Reset layout", action: layout.reset },
          ];

  return items;
}
