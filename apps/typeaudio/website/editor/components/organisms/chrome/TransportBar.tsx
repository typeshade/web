import type { Editor } from "../../../useEditor.ts";
import { SceneTransportControls } from "../../molecules/chrome/SceneTransportControls.tsx";
import { SoundTransportControls } from "../../molecules/chrome/SoundTransportControls.tsx";
import { LiveRecordingControls } from "../../molecules/chrome/LiveRecordingControls.tsx";
import { RenderControls } from "../../molecules/chrome/RenderControls.tsx";
import { ExportActions } from "../../molecules/chrome/ExportActions.tsx";
export function TransportBar({ editor: e }: { editor: Editor }) {
  const picture = e.state.workspace === "picture";
  return (
    <div className="options-bar">
      <div className="transport-buttons">
        {picture ? (
          <SceneTransportControls editor={e} />
        ) : (
          <>
            <SoundTransportControls editor={e} />
            {e.mode === "live" ? (
              <LiveRecordingControls editor={e} />
            ) : (
              <RenderControls editor={e} />
            )}
          </>
        )}
      </div>
      <ExportActions editor={e} />
    </div>
  );
}
