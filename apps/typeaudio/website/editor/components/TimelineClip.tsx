import { useRef, useState } from "react";
import type { Editor } from "../useEditor.ts";
import {
  cueRange,
  cueEnvelope,
  fadePoints,
  type Cue,
} from "../../video-model.ts";
import { SAMPLE_RATE } from "../../designer.ts";
import { trimClip, moveDelta } from "../clip-edit.ts";
import { moveClip } from "../timeline-gesture.ts";
import { openContext, useInteractions } from "../interactions.tsx";
import { clipItems } from "../clip-menu.ts";
import { ClipWaveform } from "./Waveform.tsx";
export type GroupDrag = { ids: string[]; delta: number; copy: boolean };
type Handle = "in" | "out" | "fadeIn" | "fadeOut";
export function TimelineClip({
  cue,
  editor: e,
  snap,
  samples,
  group,
  setGroup,
}: {
  cue: Cue;
  editor: Editor;
  snap: boolean;
  samples?: Float32Array;
  group?: GroupDrag;
  setGroup: (value: GroupDrag | undefined) => void;
}) {
  const { openMenu } = useInteractions();
  const [guide, setGuide] = useState<number>(),
    [draft, setDraft] = useState<Cue>();
  const suppressClick = useRef(false);
  const drag = useRef<
    | {
        x: number;
        width: number;
        ids: string[];
        copy: boolean;
        moved: boolean;
        collapse: boolean;
        kind: Handle | "move";
        next: Cue;
        delta: number;
      }
    | undefined
  >(undefined);
  const scene = e.state.scene,
    span = scene.end - scene.start,
    sourceDuration = e.sourceDuration(cue),
    current = draft ?? {
      ...cue,
      time: cue.time + (group?.ids.includes(cue.id) ? group.delta : 0),
    },
    range = cueRange(current, sourceDuration),
    time = current.time,
    duration = range.duration,
    visibleStart = Math.max(time, scene.start),
    visibleEnd = Math.min(time + duration, scene.end),
    left = ((visibleStart - scene.start) / span) * 100,
    width = ((visibleEnd - visibleStart) / span) * 100,
    sourceStart = range.start + visibleStart - time,
    sourceEnd = range.start + visibleEnd - time,
    envelope = cueEnvelope(current, sourceDuration),
    points = fadePoints(envelope, sourceStart, sourceEnd),
    selected = e.selectedIds.includes(cue.id);
  function cancel() {
    drag.current = undefined;
    setDraft(undefined);
    setGroup(undefined);
    setGuide(undefined);
  }
  function context(
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) {
    const ids = e.selectCue(cue.id, "preserve");
    openContext(
      event,
      openMenu,
      `clip-${cue.id}`,
      "Clip actions",
      clipItems(e, cue, ids),
    );
  }
  function select(
    event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
    preserve = false,
  ) {
    return e.selectCue(
      cue.id,
      event.ctrlKey || event.metaKey
        ? "toggle"
        : event.shiftKey
          ? "range"
          : preserve
            ? "preserve"
            : undefined,
    );
  }
  function handleKey(event: React.KeyboardEvent, kind: Handle) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const delta =
      (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 0.1 : 0.01);
    if (kind === "in" || kind === "out")
      e.cue(
        (c) =>
          trimClip(
            c,
            kind,
            c.time + (kind === "out" ? e.clipDuration(c) : 0) + delta,
            e.sourceDuration(c),
          ),
        cue.id,
      );
    else
      e.cue(
        (c) => ({
          ...c,
          [kind]: Math.max(
            0,
            Math.min(
              e.clipDuration(c),
              (c[kind] ?? 0) + (kind === "fadeOut" ? -delta : delta),
            ),
          ),
          fadeAnchor: undefined,
        }),
        cue.id,
      );
  }
  if (time >= scene.end || time + duration <= scene.start || duration === 0)
    return (
      <button
        className="outside-clip"
        data-cue={cue.id}
        onContextMenu={context}
        onClick={(event) => select(event)}
      >
        {duration === 0
          ? "Outside source · Reset trim in Properties"
          : `Outside range · ${cue.time.toFixed(2)} s`}
      </button>
    );
  const handle = (kind: Handle, position: number) => (
    <button
      key={kind}
      type="button"
      className={`clip-handle ${kind === "in" || kind === "out" ? "trim-handle" : "fade-handle"} handle-${kind}`}
      data-handle={kind}
      aria-label={`${kind === "in" ? "Trim start" : kind === "out" ? "Trim end" : kind === "fadeIn" ? "Fade in" : "Fade out"}: ${cue.name}`}
      data-tooltip={`${kind === "in" ? "Trim start" : kind === "out" ? "Trim end" : kind === "fadeIn" ? "Fade in" : "Fade out"}. Drag or use arrow keys; Shift changes 100 ms. Escape cancels a drag.`}
      style={{ left: `${Math.max(0, Math.min(100, position))}%` }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => handleKey(event, kind)}
    />
  );
  return (
    <>
      <div
        role="group"
        tabIndex={0}
        data-selected={selected}
        data-cue={cue.id}
        className={`audio-clip ${cue.muted ? "muted" : ""} ${draft || group?.ids.includes(cue.id) ? "dragging" : ""} ${group?.copy && group.ids.includes(cue.id) ? "copying" : ""}`}
        aria-label={`${cue.name}, ${cue.time.toFixed(2)} seconds${selected ? ", selected" : ""}. Drag to move or use arrow keys.`}
        style={{ left: `${left}%`, width: `${Math.max(0.3, width)}%` }}
        data-tooltip={`${cue.name}. Drag to move, Alt-drag to copy. Ctrl/Cmd-click toggles selection; Shift-click selects a range. Right-click for actions.`}
        onClick={(event) => {
          if (suppressClick.current && event.detail > 0) {
            suppressClick.current = false;
            return;
          }
          select(event);
        }}
        onContextMenu={context}
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
            cancel();
            return;
          }
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter") {
            event.preventDefault();
            select(event);
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const ids = e.selectCue(cue.id, "preserve");
            e.moveClips(
              ids,
              (event.key === "ArrowRight" ? 1 : -1) *
                (event.shiftKey ? 0.1 : 0.01),
            );
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || e.state.tool !== "select") return;
          event.stopPropagation();
          e.stopScene();
          suppressClick.current = true;
          const kind = ((event.target as HTMLElement)
            .closest("[data-handle]")
            ?.getAttribute("data-handle") ?? "move") as Handle | "move";
          const ids =
            kind === "move"
              ? select(event, true)
              : e.selectCue(cue.id, "preserve");
          if (!ids.includes(cue.id)) return;
          const target = event.currentTarget;
          if (kind === "move") target.focus();
          target.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            width: target.parentElement!.getBoundingClientRect().width,
            ids,
            copy: event.altKey,
            moved: false,
            collapse:
              kind === "move" &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey,
            kind,
            next: cue,
            delta: 0,
          };
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d) return;
          const dx = event.clientX - d.x;
          d.moved ||= Math.abs(dx) > 2;
          if (!d.moved) return;
          const anchors = [scene.start, scene.end, e.position];
          for (const other of scene.cues)
            if (!d.ids.includes(other.id))
              anchors.push(other.time, other.time + e.clipDuration(other));
          if (d.kind === "move") {
            const moved = moveClip(
              cue.time,
              dx,
              d.width,
              span,
              e.clipDuration(cue),
              snap,
              event.shiftKey,
              anchors,
            );
            d.delta = moveDelta(
              scene.cues.filter((c) => d.ids.includes(c.id)),
              moved.time - cue.time,
            );
            setGroup({ ids: d.ids, delta: d.delta, copy: d.copy });
            setGuide(moved.guide);
          } else if (d.kind === "in" || d.kind === "out") {
            const moved = moveClip(
              cue.time + (d.kind === "out" ? e.clipDuration(cue) : 0),
              dx,
              d.width,
              span,
              0,
              snap,
              event.shiftKey,
              anchors,
            );
            d.next = trimClip(cue, d.kind, moved.time, sourceDuration);
            setDraft(d.next);
            setGuide(moved.guide);
          } else {
            const amount =
              (cue[d.kind] ?? 0) +
              (((d.kind === "fadeIn" ? 1 : -1) * dx) / d.width) * span;
            d.next = {
              ...cue,
              [d.kind]:
                Math.round(
                  Math.max(0, Math.min(e.clipDuration(cue), amount)) *
                    SAMPLE_RATE,
                ) / SAMPLE_RATE,
              fadeAnchor: undefined,
            };
            setDraft(d.next);
          }
        }}
        onPointerUp={() => {
          const d = drag.current;
          cancel();
          if (d && !d.moved && d.collapse) e.selectCue(cue.id);
          if (d?.moved) {
            if (d.kind === "move") e.moveClips(d.ids, d.delta, d.copy);
            else e.cue(() => d.next, cue.id);
          }
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        <span>{cue.name}</span>
        <ClipWaveform
          samples={samples}
          offset={sourceStart * SAMPLE_RATE}
          frames={(sourceEnd - sourceStart) * SAMPLE_RATE}
        />
        <svg
          className="clip-envelope"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points={points
              .map(
                (p) =>
                  `${((p.time - sourceStart) / (sourceEnd - sourceStart)) * 100},${100 - p.value * 90}`,
              )
              .join(" ")}
          />
        </svg>
        {visibleStart === time && handle("in", 0)}
        {visibleEnd === time + duration && handle("out", 100)}
        {handle(
          "fadeIn",
          ((Math.min(range.end, envelope.start + (current.fadeIn ?? 0)) -
            sourceStart) /
            (sourceEnd - sourceStart)) *
            100,
        )}
        {handle(
          "fadeOut",
          ((Math.max(range.start, envelope.end - (current.fadeOut ?? 0)) -
            sourceStart) /
            (sourceEnd - sourceStart)) *
            100,
        )}
        {(draft || group?.ids.includes(cue.id)) && (
          <span className="clip-drag-readout">
            {group?.copy ? "Copy · " : ""}
            {time.toFixed(3)} s · {duration.toFixed(3)} s
          </span>
        )}
      </div>
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
