import type { FunctionEditor } from "../hooks/functions/useFunctionEditor.ts";
import type { FunctionDocuments } from "../hooks/functions/useFunctionDocuments.ts";
import type { useWorkspaceLayout } from "../hooks/layout/useWorkspaceLayout.ts";
import type { StudioCommand } from "./types.ts";

export function functionCommands(
  c: FunctionEditor,
  d: FunctionDocuments,
  layout: ReturnType<typeof useWorkspaceLayout>,
) {
  const files: StudioCommand[] = d.tabs.map((tab) => ({
    id: `function.file.${tab.path}`,
    group: "TypeShade module",
    label: tab.path + (tab.dirty ? " · unapplied" : ""),
    run: () => {
      c.e.workspace("sound");
      layout.focus(false);
      c.selectFile(tab.path);
      c.focus();
    },
  }));
  const commands: StudioCommand[] = [
    ...files,
    {
      id: "function.new",
      group: "Function",
      label: "New TypeShade function",
      disabled: c.busy,
      run: () => void c.create(),
    },
    {
      id: "function.apply",
      group: "Code",
      label: "Apply edited TypeShade modules",
      shortcut: "Ctrl/⌘ Enter",
      disabled: c.busy || !d.dirty || !!d.conflicts.length,
      run: () => void d.apply(),
    },
    {
      id: "function.revert",
      group: "Code",
      label: "Revert current module draft",
      disabled: c.busy || d.text === c.graph?.modules[d.path],
      run: d.revert,
    },
    ...(["bottom", "right", "code"] as const).map(
      (mode): StudioCommand => ({
        id: `function.layout.${mode}`,
        group: "Layout",
        label:
          mode === "code"
            ? "Focus code editor"
            : mode === "right"
              ? "Code beside graph"
              : "Code below graph",
        disabled: mode === "right" && !layout.wide,
        run: () => {
          c.e.workspace("sound");
          layout.focus(false);
          layout.setCodeMode(mode);
          c.focus();
        },
      }),
    ),
  ];
  return { files, commands };
}
