import type { Editor } from "../../../useEditor.ts";

export function LiveRecordingControls({ editor: e }: { editor: Editor }) {
  return (
    <>
      <button
        id="record-live"
        className={e.recording ? "recording" : ""}
        disabled={!e.live || e.busy}
        onClick={() => (e.recording ? e.stopRecording() : void e.recordLive())}
        data-tooltip="Record the live output, including your edits, for up to 30 seconds. Stops when playback stops."
      >
        {e.recording ? "Stop recording" : "Record live"}
      </button>
      {e.recorded && (
        <button
          id="export-take"
          onClick={e.exportTake}
          data-tooltip="Download the last recorded take as a mono WAV. This take stays available until the next recording or page reload."
        >
          Export take ({(e.recorded.length / 48000).toFixed(1)} s)
        </button>
      )}
    </>
  );
}
