import { soundLength } from "../../sound-design.ts";
import { useRef, useState } from "react";
import type { Editor } from "../useEditor.ts";
import type { Cue } from "../../video-model.ts";
import { validatePatch, SAMPLE_RATE } from "../../designer.ts";
import { Panel, Icon } from "./Panel.tsx";
import { ClipWaveform } from "./Waveform.tsx";
import {
  openContext,
  useInteractions,
  type MenuItem,
} from "../interactions.tsx";
import { moveClip } from "../timeline-gesture.ts";
function clipItems(e: Editor, cue: Cue): MenuItem[] {
  return [
    {
      label: "Audition clip",
      disabled: !e.ready || !e.samples.has(cue.id),
      action: () => void e.auditionCue(cue.id),
    },
    {
      label: "Edit sound",
      action: () => {
        e.dispatch({ type: "select", id: cue.id });
        e.workspace("sound");
      },
    },
    { label: "Rename…", action: () => e.renameCue(cue.id) },
    { separator: true },
    {
      label: "Move to playhead",
      action: () =>
        e.cue(
          (c) => ({
            ...c,
            time: Math.max(
              0,
              Math.min(3600, Math.round(e.transport.current() * 1000) / 1000),
            ),
          }),
          cue.id,
        ),
    },
    {
      label: "Mute layer",
      checked: cue.muted,
      action: () => e.cue((c) => ({ ...c, muted: !c.muted }), cue.id),
    },
    {
      label: "Duplicate layer",
      shortcut: "Alt-drag",
      disabled: e.state.scene.cues.length >= 24,
      action: () => e.duplicateCue(cue.id),
    },
    { separator: true },
    {
      label: "Delete layer",
      shortcut: "Delete",
      danger: true,
      action: () => e.deleteCueById(cue.id),
    },
  ];
}
export function Timeline({ editor: e }: { editor: Editor }) {
  const { openMenu } = useInteractions();
  const [zoom, setZoom] = useState(1),
    [snap, setSnap] = useState(true);
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
        <span className="mono">{scene.cues.length} / 24 layers</span>
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
                className={`layer-row ${e.state.selected === cue.id ? "selected" : ""}`}
                key={cue.id}
              >
                <button
                  className="layer-name"
                  aria-pressed={e.state.selected === cue.id}
                  onClick={() => e.dispatch({ type: "select", id: cue.id })}
                  data-tooltip="Select this layer. Double-click to rename; right-click for clip actions."
                  onDoubleClick={() => e.renameCue(cue.id)}
                  onContextMenu={(event) => {
                    e.dispatch({ type: "select", id: cue.id });
                    openContext(
                      event,
                      openMenu,
                      `clip-${cue.id}`,
                      "Clip actions",
                      clipItems(e, cue),
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
                  onDrop={(event) => {
                    event.preventDefault();
                    try {
                      const value = JSON.parse(
                        event.dataTransfer.getData(
                          "application/typeaudio-sound",
                        ),
                      );
                      e.seek(timeAt(event));
                      e.addCue({
                        name: String(value.name).slice(0, 100),
                        patch: validatePatch(value.patch),
                      });
                    } catch (error) {
                      e.setNotice(String(error));
                    }
                  }}
                >
                  <Clip
                    cue={cue}
                    editor={e}
                    snap={snap}
                    samples={e.samples.get(cue.id)}
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
              onDrop={(event) => {
                event.preventDefault();
                try {
                  const value = JSON.parse(
                    event.dataTransfer.getData("application/typeaudio-sound"),
                  );
                  e.addCue({
                    name: String(value.name).slice(0, 100),
                    patch: validatePatch(value.patch),
                  });
                } catch (error) {
                  e.setNotice(String(error));
                }
              }}
            >
              <Icon name="sound" />
              <span>Add a sound or drag one from the Project panel.</span>
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
          Drag to move · Alt-drag to copy · Middle-drag to pan · Right-click for
          actions
        </span>
        <span>48 kHz · CPU clips · Live LFO excluded</span>
      </div>
    </Panel>
  );
}
function Clip({
  cue,
  editor: e,
  snap,
  samples,
}: {
  cue: Cue;
  editor: Editor;
  snap: boolean;
  samples?: Float32Array;
}) {
  const { openMenu } = useInteractions();
  const [guide, setGuide] = useState<number>();
  const suppressClick = useRef(false);
  const [draft, setDraft] = useState<number>(),
    drag = useRef<
      | {
          x: number;
          time: number;
          next: number;
          width: number;
          moved: boolean;
          copy: boolean;
        }
      | undefined
    >(undefined);
  const scene = e.state.scene,
    span = scene.end - scene.start,
    time = draft ?? cue.time,
    duration = samples ? samples.length / SAMPLE_RATE : soundLength(cue.patch),
    left = Math.max(0, ((time - scene.start) / span) * 100),
    width = Math.min(
      100 - left,
      ((time + duration - Math.max(time, scene.start)) / span) * 100,
    );
  function context(
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) {
    e.dispatch({ type: "select", id: cue.id });
    openContext(
      event,
      openMenu,
      `clip-${cue.id}`,
      "Clip actions",
      clipItems(e, cue),
    );
  }
  if (time >= scene.end || time + duration <= scene.start)
    return (
      <button
        className="outside-clip"
        data-cue={cue.id}
        onContextMenu={context}
        onClick={() => e.dispatch({ type: "select", id: cue.id })}
      >
        Outside range · {cue.time.toFixed(2)} s
      </button>
    );
  return (
    <>
      <button
        className={`audio-clip ${cue.muted ? "muted" : ""} ${draft !== undefined ? "dragging" : ""} ${drag.current?.copy ? "copying" : ""}`}
        data-cue={cue.id}
        aria-label={`${cue.name}, ${cue.time.toFixed(2)} seconds. Drag to move or use arrow keys.`}
        aria-pressed={e.state.selected === cue.id}
        style={{ left: `${left}%`, width: `${Math.max(0.3, width)}%` }}
        onClick={(event) => {
          if (suppressClick.current && event.detail > 0) {
            suppressClick.current = false;
            return;
          }
          e.dispatch({ type: "select", id: cue.id });
        }}
        onContextMenu={context}
        data-tooltip={`${cue.name}. Drag to move, Alt-drag to copy. Right-click for clip actions.`}
        onKeyDown={(event) => {
          if (
            event.key === "ContextMenu" ||
            (event.shiftKey && event.key === "F10")
          ) {
            context(event);
            return;
          }
          if (event.key === "Escape" && drag.current) {
            event.preventDefault();
            event.stopPropagation();
            drag.current = undefined;
            setDraft(undefined);
            setGuide(undefined);
            return;
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const delta =
              (event.key === "ArrowRight" ? 1 : -1) *
              (event.shiftKey ? 0.1 : 0.01);
            e.cue(
              (c) => ({
                ...c,
                time: Math.max(0, Math.min(3600, c.time + delta)),
              }),
              cue.id,
            );
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || e.state.tool !== "select") return;
          suppressClick.current = false;
          event.stopPropagation();
          e.stopScene();
          e.dispatch({ type: "select", id: cue.id });
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            time: cue.time,
            next: cue.time,
            width:
              event.currentTarget.parentElement!.getBoundingClientRect().width,
            moved: false,
            copy: event.altKey,
          };
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d) return;
          const anchors = [scene.start, scene.end, e.position];
          for (const other of scene.cues)
            if (other.id !== cue.id)
              anchors.push(
                other.time,
                other.time +
                  (e.samples.get(other.id)?.length
                    ? e.samples.get(other.id)!.length / SAMPLE_RATE
                    : soundLength(other.patch)),
              );
          const moved = moveClip(
            d.time,
            event.clientX - d.x,
            d.width,
            span,
            duration,
            snap,
            event.shiftKey,
            anchors,
          );
          d.next = moved.time;
          d.moved ||= Math.abs(event.clientX - d.x) > 2;
          if (d.moved) {
            setDraft(d.next);
            setGuide(moved.guide);
          }
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = undefined;
          setDraft(undefined);
          setGuide(undefined);
          suppressClick.current = !!d?.moved;
          if (d?.moved) {
            if (d.copy) {
              if (scene.cues.length >= 24)
                e.setNotice("A composition can contain up to 24 sound layers.");
              else e.duplicateCue(cue.id, d.next);
            } else e.cue((c) => ({ ...c, time: d.next }), cue.id);
          }
        }}
        onPointerCancel={() => {
          drag.current = undefined;
          setDraft(undefined);
          setGuide(undefined);
        }}
        onLostPointerCapture={() => {
          drag.current = undefined;
          setDraft(undefined);
          setGuide(undefined);
        }}
      >
        <span>{cue.name}</span>
        {draft !== undefined && (
          <span className="clip-drag-readout">
            {drag.current?.copy ? "Copy · " : ""}
            {draft.toFixed(3)} s
          </span>
        )}
        <ClipWaveform
          samples={samples}
          offset={Math.max(0, (scene.start - time) * SAMPLE_RATE)}
        />
      </button>
      {guide !== undefined && (
        <div
          className="clip-snap-guide"
          style={{ left: `${((guide - scene.start) / span) * 100}%` }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
