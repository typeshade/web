import { useRef } from "react";
import type { Editor } from "../../../useEditor.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";
import { useWorkspaceLayout } from "../../../hooks/layout/useWorkspaceLayout.ts";
import { applicationMenu } from "../../../interactions/applicationMenu.ts";
export function AppMenuBar({ editor: e }: { editor: Editor }) {
  const file = useRef<HTMLInputElement>(null),
    menus = useInteractions(),
    layout = useWorkspaceLayout(),
    picture = e.state.workspace === "picture";
  function save() {
    void e.exportProject();
    menus.closeMenu();
  }
  function showMenu(name: "File" | "Edit" | "Window", origin: HTMLElement) {
    if (menus.menuKey === name) {
      menus.closeMenu();
      return;
    }
    const items = applicationMenu(name, e, layout, file, save);
    const rect = origin.getBoundingClientRect();
    menus.openMenu(
      name,
      `${name} menu`,
      items,
      { x: rect.left, y: rect.bottom + 4 },
      origin,
    );
  }
  return (
    <>
      <header className="app-menubar">
        <a
          href="/"
          className="app-brand"
          onClick={(event) => {
            event.preventDefault();
            e.workspace("sound");
          }}
        >
          <img src="/icon.png" width="22" height="22" alt="" />
          <span>TypeAudio</span>
        </a>
        {(["File", "Edit", "Window"] as const).map((name) => (
          <button
            key={name}
            aria-haspopup="menu"
            aria-expanded={menus.menuKey === name}
            onClick={(event) => showMenu(name, event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                showMenu(name, event.currentTarget);
              }
            }}
          >
            {name}
          </button>
        ))}
        <button
          id="undo"
          data-tooltip="Undo the last document edit (Ctrl/Cmd Z)."
          disabled={!e.state.past.length && !e.state.checkpoint}
          onClick={e.undo}
        >
          Undo
        </button>
        <button
          id="redo"
          data-tooltip="Redo the last undone edit (Ctrl/Cmd Shift Z)."
          disabled={!e.state.future.length}
          onClick={e.redo}
        >
          Redo
        </button>
        <div className="workspace-tabs" role="group" aria-label="Workspace">
          <button aria-pressed={!picture} onClick={() => e.workspace("sound")}>
            Sound
          </button>
          <button aria-pressed={picture} onClick={() => e.workspace("picture")}>
            Picture
          </button>
        </div>
        <button
          className="quiet reset-layout"
          data-tooltip="Restore default panel sizes and show all panels."
          onClick={layout.reset}
        >
          Reset layout
        </button>
        <button
          className="quiet viewer-focus-toggle"
          aria-pressed={layout.focused}
          data-tooltip="Maximize the viewer and restore panels with F."
          onClick={() => layout.focus(!layout.focused)}
        >
          {layout.focused ? "Restore panels" : "Focus viewer"}
        </button>
        <a
          className="help-link"
          href="/docs/architecture/"
          target="_blank"
          rel="noopener"
        >
          Help
        </a>
      </header>
      <input
        ref={file}
        id="project-file"
        type="file"
        accept=".json"
        hidden
        onChange={(event) => {
          const f = event.target.files?.[0];
          if (f) {
            e.workspace("picture");
            void e.openProject(f);
          }
          event.target.value = "";
        }}
      />
    </>
  );
}
