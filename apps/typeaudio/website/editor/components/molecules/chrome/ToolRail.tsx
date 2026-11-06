import type { Editor } from "../../../useEditor.ts";
import { Icon } from "../../atoms/Icon.tsx";

export function ToolRail({ editor: e }: { editor: Editor }) {
  const picture = e.state.workspace === "picture";
  return (
    <nav className="tool-rail" aria-label="Editing tools">
      <button
        aria-label="Selection tool (V)"
        aria-pressed={e.state.tool === "select"}
        onClick={() => e.dispatch({ type: "tool", tool: "select" })}
      >
        <Icon name="select" />
      </button>
      <button
        aria-label="Hand tool (H)"
        aria-pressed={e.state.tool === "hand"}
        onClick={() => e.dispatch({ type: "tool", tool: "hand" })}
      >
        <Icon name="hand" />
      </button>
      <span className="tool-divider" />
      <button aria-label="Sound workspace" onClick={() => e.workspace("sound")}>
        <Icon name="sound" />
      </button>
      <button
        aria-label="Picture workspace"
        onClick={() => e.workspace("picture")}
      >
        <Icon name="film" />
      </button>
    </nav>
  );
}
