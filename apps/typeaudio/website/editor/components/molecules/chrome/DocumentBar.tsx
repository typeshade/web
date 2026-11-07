import type { Editor } from "../../../useEditor.ts";
import { Icon } from "../../atoms/Icon.tsx";

export function DocumentBar({ editor: e }: { editor: Editor }) {
  const picture = e.state.workspace === "picture";
  return (
    <div className="document-bar">
      <div className="document-tab">
        <Icon name={picture ? "film" : "sound"} />
        {picture ? (
          <input
            id="scene-name"
            aria-label="Project name"
            value={e.state.scene.name}
            maxLength={100}
            onChange={(event) => {
              const name = event.target.value;
              e.scene((current) => ({ ...current, name }));
            }}
          />
        ) : (
          <span>
            {e.state.patchName}
            {e.selected && !e.selected.audio ? " / Selected layer" : ""}
          </span>
        )}
        <span className={`save-state ${e.saveStatus}`} role="status">
          {e.saveStatus === "saved"
            ? "Saved in this browser"
            : e.saveStatus === "saving"
              ? "Saving…"
              : "Not saved — download a project file"}
          {Object.values(e.state.drafts ?? {}).some((d) => d.text !== d.base) &&
            " · Code draft"}
        </span>
      </div>
      <span className="document-status">
        {picture ? "Composition" : "Sound source"} ·{" "}
        {e.selected?.audio
          ? picture
            ? "Imported audio"
            : "Source sound"
          : e.selected
            ? "Linked layer"
            : "Local project"}
      </span>
    </div>
  );
}
