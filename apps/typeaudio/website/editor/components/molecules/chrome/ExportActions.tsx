import type { Editor } from "../../../useEditor.ts";
import { Icon } from "../../atoms/Icon.tsx";

export function ExportActions({ editor: e }: { editor: Editor }) {
  const picture = e.state.workspace === "picture";
  return (
    <div className="export-actions">
      {!picture && (
        <button
          id="use-in-video"
          onClick={() => {
            e.workspace("picture");
            if (!e.selected || e.selected.audio) e.addCue();
          }}
        >
          Use in Picture
        </button>
      )}
      <button
        className="primary"
        id={picture ? "export-wav" : "download"}
        disabled={
          picture ? !e.ready || !e.state.scene.cues.length : !e.rendered
        }
        onClick={picture ? e.exportScene : e.exportSound}
      >
        <Icon name="download" />
        Export WAV
      </button>
    </div>
  );
}
