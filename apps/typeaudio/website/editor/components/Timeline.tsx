import { useRef, useState } from "react";
import type { Editor } from "../useEditor.ts";
import { validateAudioRef } from "../../audio-asset.ts";
import { validatePatch } from "../../designer.ts";
import { Panel, Icon } from "./Panel.tsx";
import { openContext, useInteractions } from "../interactions.tsx";
import { clipItems } from "../clip-menu.ts";
import { TimelineClip, type GroupDrag } from "./TimelineClip.tsx";
export function Timeline({ editor: e }: { editor: Editor }) {
  const { openMenu } = useInteractions();
  const [zoom, setZoom] = useState(1),
    [snap, setSnap] = useState(true);
  const [group, setGroup] = useState<GroupDrag>();
  const scroll = useRef<HTMLDivElement>(null);
  const pan = useRef<
    { x: number; y: number; left: number; top: number } | undefined
  >(undefined);
  const scene = e.state.scene,
    span = scene.end - scene.start;
  function timeAt(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      scene.start +
      Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * span
    );
  }
  function drop(event: React.DragEvent<HTMLElement>, at: number) {
    event.preventDefault();
    try {
      if (event.dataTransfer.files.length) {
        if (event.dataTransfer.files.length !== 1)
          throw new Error("Import one audio file at a time.");
        void e.importAudio(event.dataTransfer.files[0]!, at);
        return;
      }
      const audio = event.dataTransfer.getData("application/typeaudio-audio");
      if (audio) {
        const ref = validateAudioRef(JSON.parse(audio));
        const asset = e.audioAssets.find(
          (a) => a.id === ref.id && a.frames === ref.frames,
        );
        if (!asset)
          throw new Error("Import this audio into the Audio library first.");
        e.addAudioCue(asset, at);
        return;
      }
      const value = JSON.parse(
        event.dataTransfer.getData("application/typeaudio-sound"),
      );
      e.seek(at);
      e.addCue({
        name: String(value.name).slice(0, 100),
        patch: validatePatch(value.patch),
      });
    } catch (error) {
      e.setNotice(String(error));
    }
  }
  return (
    <Panel
      title="Timeline"
      className="timeline-panel"
      actions={
        <>
          <label className="check">
            <input
              id="snap"
              data-tooltip="Snap to the grid, playhead and clip edges. Shift uses a coarser grid."
              type="checkbox"
              checked={snap}
              onChange={(event) => setSnap(event.target.checked)}
            />
            Snap
          </label>
          <button
            aria-label="Zoom out"
            disabled={zoom === 1}
            onClick={() => setZoom(Math.max(1, zoom / 2))}
          >
            −
          </button>
          <span className="mono">{zoom * 100}%</span>
          <button
            aria-label="Zoom in"
            disabled={zoom === 8}
            onClick={() => setZoom(Math.min(8, zoom * 2))}
          >
            +
          </button>
          <button onClick={() => setZoom(1)}>Fit</button>
        </>
      }
    >
      <div className="timeline-tools">
        <button
          id="add-cue"
          className="subtle"
          disabled={scene.cues.length >= 24}
          onClick={() => e.addCue()}
        >
          <Icon name="plus" />
          Add sound at playhead
        </button>
        <button
          id="timeline-import-audio"
          disabled={e.audioImporting}
          onClick={() => e.audioInput.current?.click()}
          data-tooltip="Import an audio file at the playhead. WAV, MP3, Ogg and FLAC depend on browser support."
        >
          Import audio…
        </button>
        <button
          id="split-cue"
          disabled={!e.selectedIds.length}
          data-tooltip="Split selected clips at the playhead. Ctrl/⌘ Shift D."
          onClick={() => e.splitClips()}
        >
          Split
        </button>
        <span className="mono">
          {scene.cues.length} / 24 layers
          {e.selectedIds.length > 1
            ? ` · ${e.selectedIds.length} selected`
            : ""}
        </span>
        <div className="range-inputs">
          <label>
            In
            <input
              id="range-in"
              type="number"
              min="0"
              max="3600"
              step=".01"
              value={scene.start}
              onChange={(event) =>
                e.setRange({ start: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Out
            <input
              id="range-out"
              type="number"
              min=".05"
              max="3600"
              step=".01"
              value={scene.end}
              onChange={(event) =>
                e.setRange({ end: Number(event.target.value) })
              }
            />
          </label>
          <label className="check">
            <input
              id="loop"
              type="checkbox"
              checked={scene.loop}
              onChange={(event) => {
                const loop = event.target.checked;
                e.scene((current) => ({ ...current, loop }));
              }}
            />
            Loop
          </label>
        </div>
      </div>
      <div
        className="timeline-scroll"
        ref={scroll}
        onPointerDown={(event) => {
          if (
            !(
              event.button === 1 ||
              (event.button === 0 && e.state.tool === "hand")
            )
          )
            return;
          event.preventDefault();
          const node = event.currentTarget,
            x = event.clientX,
            initial = node.scrollLeft;
          node.setPointerCapture(event.pointerId);
          pan.current = {
            x,
            y: event.clientY,
            left: initial,
            top: node.scrollTop,
          };
        }}
        onPointerMove={(event) => {
          const p = pan.current;
          if (p) {
            event.currentTarget.scrollLeft = p.left - (event.clientX - p.x);
            event.currentTarget.scrollTop = p.top - (event.clientY - p.y);
          }
        }}
        onPointerUp={() => {
          pan.current = undefined;
        }}
        onPointerCancel={() => {
          pan.current = undefined;
        }}
        onLostPointerCapture={() => {
          pan.current = undefined;
        }}
      >
        <div className="timeline-content" style={{ width: `${zoom * 100}%` }}>
          <div className="ruler-row">
            <div className="layer-header">
              Layers <small>Start / Level</small>
            </div>
            <div
              className="time-ruler"
              onPointerDown={(event) => {
                if (event.button === 0 && e.state.tool === "select")
                  e.seek(timeAt(event));
              }}
            >
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} style={{ left: `${i * 10}%` }}>
                  {(scene.start + (span * i) / 10).toFixed(2)}s
                </span>
              ))}
            </div>
          </div>
          <div className="layers">
            {scene.cues.map((cue, i) => (
              <div
                className={`layer-row ${e.selectedIds.includes(cue.id) ? "selected" : ""}`}
                key={cue.id}
              >
                <button
                  className="layer-name"
                  aria-pressed={e.selectedIds.includes(cue.id)}
                  onClick={(event) =>
                    e.selectCue(
                      cue.id,
                      event.ctrlKey || event.metaKey
                        ? "toggle"
                        : event.shiftKey
                          ? "range"
                          : undefined,
                    )
                  }
                  data-tooltip="Select this layer. Ctrl/Cmd-click toggles selection; Shift-click selects a range. Double-click to rename."
                  onDoubleClick={() => e.renameCue(cue.id)}
                  onContextMenu={(event) => {
                    const ids = e.selectCue(cue.id, "preserve");
                    openContext(
                      event,
                      openMenu,
                      `clip-${cue.id}`,
                      "Clip actions",
                      clipItems(e, cue, ids),
                    );
                  }}
                >
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <Icon name="sound" />
                  <span>
                    {cue.name}
                    <small>
                      {cue.time.toFixed(2)}s ·{" "}
                      {cue.muted ? "Muted" : `${Math.round(cue.gain * 100)}%`}
                    </small>
                  </span>
                </button>
                <div
                  className="clip-lane"
                  onPointerDown={(event) => {
                    if (
                      event.button === 0 &&
                      event.target === event.currentTarget &&
                      e.state.tool === "select"
                    ) {
                      e.seek(timeAt(event));
                      e.dispatch({ type: "select", id: "" });
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }}
                  onContextMenu={(event) => {
                    const at = timeAt(event);
                    openContext(
                      event,
                      openMenu,
                      "timeline",
                      "Timeline actions",
                      [
                        {
                          label: "Add current sound here",
                          disabled: scene.cues.length >= 24,
                          action: () => {
                            e.seek(at);
                            e.addCue();
                          },
                        },
                        {
                          label: "Move playhead here",
                          action: () => e.seek(at),
                        },
                        { separator: true },
                        {
                          label: "Snap",
                          checked: snap,
                          action: () => setSnap(!snap),
                        },
                        { label: "Fit timeline", action: () => setZoom(1) },
                      ],
                    );
                  }}
                  onDrop={(event) => drop(event, timeAt(event))}
                >
                  <TimelineClip
                    cue={cue}
                    editor={e}
                    snap={snap}
                    samples={e.ready ? e.samples.get(cue.id) : undefined}
                    group={group}
                    setGroup={setGroup}
                  />
                </div>
              </div>
            ))}
          </div>
          {scene.cues.length === 0 && (
            <div
              className="empty-layers"
              onContextMenu={(event) =>
                openContext(event, openMenu, "timeline", "Timeline actions", [
                  {
                    label: "Add current sound at playhead",
                    action: () => e.addCue(),
                  },
                ])
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => drop(event, e.transport.current())}
            >
              <Icon name="sound" />
              <span>
                Add a sound, import audio, or drag a file onto the timeline.
              </span>
              <button
                disabled={e.audioImporting}
                onClick={() => e.audioInput.current?.click()}
              >
                Import audio…
              </button>
            </div>
          )}
          <div className="timeline-cursor-space">
            <div
              className="playhead"
              style={{
                left: `${Math.max(0, Math.min(100, ((e.position - scene.start) / span) * 100))}%`,
              }}
            >
              <i />
            </div>
          </div>
        </div>
      </div>
      <div className="timeline-bottom">
        <span>
          Drag to move · Edges trim · Top handles fade · Ctrl/⌘-click selects
          layers
        </span>
        <span>48 kHz · Effects, modulation and automation included</span>
      </div>
    </Panel>
  );
}
