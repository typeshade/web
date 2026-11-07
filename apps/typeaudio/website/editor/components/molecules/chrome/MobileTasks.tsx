import type { Editor } from "../../../useEditor.ts";
import type { MobilePanel } from "../../../hooks/layout/useEditorView.ts";

export function MobileTasks({ editor: e }: { editor: Editor }) {
  return (
    <nav className="mobile-tasks" aria-label="Editor tasks">
      {(["listen", "layers", "edit", "projects"] as MobilePanel[]).map(
        (panel) => (
          <button
            key={panel}
            aria-pressed={e.mobilePanel === panel}
            onClick={() =>
              panel === "edit"
                ? e.showLayerProperties()
                : panel === "listen"
                  ? e.showComposition()
                  : e.setMobilePanel(panel)
            }
          >
            {panel === "listen"
              ? "Listen"
              : panel === "layers"
                ? e.state.workspace === "picture"
                  ? "Layers"
                  : "Code / FX"
                : panel === "edit"
                  ? "Edit"
                  : "Projects"}
          </button>
        ),
      )}
    </nav>
  );
}
