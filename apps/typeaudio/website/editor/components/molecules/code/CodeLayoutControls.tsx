import { useWorkspaceLayout } from "../../../hooks/layout/useWorkspaceLayout.ts";

export function CodeLayoutControls({ onFocus }: { onFocus: () => void }) {
  const layout = useWorkspaceLayout();
  return (
    <div
      className="code-layout-controls"
      role="group"
      aria-label="Editor layout"
    >
      <button
        aria-label="Code below graph"
        aria-pressed={layout.codeMode === "bottom"}
        data-tooltip="Split horizontally: graph above code."
        onClick={() => {
          layout.focus(false);
          layout.setCodeMode("bottom");
        }}
      >
        Below
      </button>
      <button
        aria-label="Code beside graph"
        aria-pressed={layout.codeMode === "right"}
        disabled={!layout.wide}
        data-tooltip="Split vertically: code beside graph. Available on wide screens."
        onClick={() => {
          layout.focus(false);
          layout.setCodeMode("right");
        }}
      >
        Beside
      </button>
      <button
        aria-label="Focus code editor"
        aria-pressed={layout.codeMode === "code"}
        data-tooltip="Expand code into the central workspace."
        onClick={() => {
          layout.focus(false);
          layout.setCodeMode("code");
          onFocus();
        }}
      >
        Code
      </button>
    </div>
  );
}
