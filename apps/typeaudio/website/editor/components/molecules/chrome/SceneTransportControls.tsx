import type { Editor } from "../../../useEditor.ts";
import { Icon } from "../../atoms/Icon.tsx";

export function SceneTransportControls({ editor: e }: { editor: Editor }) {
  return (
    <>
      <button
        id="play"
        className="icon-button"
        aria-label="Play composition"
        disabled={!e.ready}
        onClick={() => void e.playScene()}
      >
        <Icon name="play" />
      </button>
      <button
        id="pause"
        className="icon-button"
        aria-label="Pause composition"
        onClick={e.stopScene}
      >
        <Icon name="pause" />
      </button>
      <button
        id="stop"
        className="icon-button"
        aria-label="Stop composition"
        onClick={() => {
          e.stopScene();
          e.seek(e.state.scene.start);
        }}
      >
        <Icon name="stop" />
      </button>
      <output className="timecode">{e.position.toFixed(3)} s</output>
    </>
  );
}
