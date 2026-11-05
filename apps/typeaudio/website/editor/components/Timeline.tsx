import { useRef, useState } from "react";
import type { Editor } from "../useEditor.ts";
import type { Cue } from "../../video-model.ts";
import { validatePatch, SAMPLE_RATE } from "../../designer.ts";
import { Panel, Icon } from "./Panel.tsx";
import { ClipWaveform } from "./Waveform.tsx";
export function Timeline({ editor: e }: { editor: Editor }) {
  const [zoom, setZoom] = useState(1),
    [snap, setSnap] = useState(true);
  const scroll = useRef<HTMLDivElement>(null);
  const scene = e.state.scene,
    span = scene.end - scene.start;
  function timeAt(
    event: React.PointerEvent<HTMLElement> | React.DragEvent<HTMLElement>,
  ) {
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
          if (e.state.tool !== "hand") return;
          event.preventDefault();
          const node = event.currentTarget,
            x = event.clientX,
            initial = node.scrollLeft;
          node.setPointerCapture(event.pointerId);
          node.onpointermove = (move) => {
            node.scrollLeft = initial - (move.clientX - x);
          };
          node.onpointerup = () => {
            node.onpointermove = null;
            node.onpointerup = null;
          };
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
                if (e.state.tool === "select") e.seek(timeAt(event));
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
        <span>Drag clips to move · Shift to snap to 0.1 s · Space to play</span>
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
  const [draft, setDraft] = useState<number>(),
    drag = useRef<
      | { x: number; time: number; next: number; width: number; moved: boolean }
      | undefined
    >(undefined);
  const scene = e.state.scene,
    span = scene.end - scene.start,
    time = draft ?? cue.time,
    duration = samples
      ? samples.length / SAMPLE_RATE
      : cue.patch.duration + cue.patch.release,
    left = Math.max(0, ((time - scene.start) / span) * 100),
    width = Math.min(
      100 - left,
      ((time + duration - Math.max(time, scene.start)) / span) * 100,
    );
  if (time >= scene.end || time + duration <= scene.start)
    return (
      <button
        className="outside-clip"
        data-cue={cue.id}
        onClick={() => e.dispatch({ type: "select", id: cue.id })}
      >
        Outside range · {cue.time.toFixed(2)} s
      </button>
    );
  return (
    <button
      className={`audio-clip ${cue.muted ? "muted" : ""}`}
      data-cue={cue.id}
      aria-label={`${cue.name}, ${cue.time.toFixed(2)} seconds. Drag to move or use arrow keys.`}
      aria-pressed={e.state.selected === cue.id}
      style={{ left: `${left}%`, width: `${Math.max(0.3, width)}%` }}
      onClick={() => e.dispatch({ type: "select", id: cue.id })}
      onKeyDown={(event) => {
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
        if (e.state.tool !== "select") return;
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
        };
      }}
      onPointerMove={(event) => {
        const d = drag.current;
        if (!d) return;
        const delta = ((event.clientX - d.x) / d.width) * span;
        const unit = event.shiftKey ? 0.1 : snap ? 0.01 : 0.001;
        d.next = Math.max(
          0,
          Math.min(3600, Math.round((d.time + delta) / unit) * unit),
        );
        d.moved ||= Math.abs(event.clientX - d.x) > 2;
        if (d.moved) setDraft(d.next);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = undefined;
        setDraft(undefined);
        if (d?.moved) e.cue((c) => ({ ...c, time: d.next }), cue.id);
      }}
      onPointerCancel={() => {
        drag.current = undefined;
        setDraft(undefined);
      }}
    >
      <span>{cue.name}</span>
      <ClipWaveform
        samples={samples}
        offset={Math.max(0, (scene.start - time) * SAMPLE_RATE)}
      />
    </button>
  );
}
