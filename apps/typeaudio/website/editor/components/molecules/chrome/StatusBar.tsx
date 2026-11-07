import type { Editor } from "../../../useEditor.ts";

export function StatusBar({ editor: e }: { editor: Editor }) {
  const picture = e.state.workspace === "picture";
  return (
    <footer className="status-bar">
      <span className={`status-led ${e.live || e.playing ? "running" : ""}`} />
      <p id="status" role="status" aria-live="polite">
        {e.notice}
      </p>
      <span
        className="mono"
        id="live-indicator"
        data-frames={e.meter.frames}
        data-revision={e.meter.revision}
      >
        {e.busy
          ? "PROCESSING"
          : e.live
            ? "LIVE / CPU"
            : picture && e.state.scene.space
              ? "48 kHz · STEREO"
              : "48 kHz · MONO"}
      </span>
    </footer>
  );
}
