import { useRef } from "react";
import { DEFAULT } from "../../../../sound/defaultPatch.ts";
import { openContext } from "../../../interactions/openContext.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";
import type { Editor } from "../../../useEditor.ts";
export function TonePad({ editor: e }: { editor: Editor }) {
  const active = useRef(false),
    { openMenu } = useInteractions();
  const end = (cancel = false) => {
    if (!active.current) return;
    active.current = false;
    cancel ? e.cancelEdit() : e.endEdit();
  };
  const position = {
    x: Math.log(e.state.patch.cutoff / 80) / Math.log(200),
    y: 1 - e.state.patch.blend,
  };
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !active.current ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect(),
      x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y = Math.max(
        0,
        Math.min(1, 1 - (event.clientY - rect.top) / rect.height),
      );
    e.patch({
      cutoff: Math.round(80 * Math.pow(200, x)),
      blend: Math.round(y * 100) / 100,
    });
  };
  return (
    <div
      id="xy-pad"
      className="tone-pad"
      role="group"
      tabIndex={0}
      data-tooltip="Drag horizontally for filter cutoff and vertically for oscillator blend. Arrow keys adjust the same controls. Escape cancels a drag."
      aria-label="Tone pad: horizontal cutoff, vertical oscillator blend"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.focus();
        active.current = true;
        e.beginEdit();
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={() => end()}
      onPointerCancel={() => end(true)}
      onLostPointerCapture={() => end(true)}
      onBlur={() => end()}
      onContextMenu={(event) =>
        openContext(event, openMenu, "tone", "Tone options", [
          {
            label: "Reset Tone",
            action: () =>
              e.patch({ cutoff: DEFAULT.cutoff, blend: DEFAULT.blend }),
          },
        ])
      }
      onKeyDown={(event) => {
        if (event.key === "Escape" && active.current) {
          event.preventDefault();
          event.stopPropagation();
          end(true);
        } else if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          if (!active.current) {
            active.current = true;
            e.beginEdit();
          }
          const step = event.shiftKey ? 0.002 : 0.02;
          const x = Math.max(
            0,
            Math.min(
              1,
              position.x +
                (event.key === "ArrowRight"
                  ? step
                  : event.key === "ArrowLeft"
                    ? -step
                    : 0),
            ),
          );
          const blend = Math.max(
            0,
            Math.min(
              1,
              e.state.patch.blend +
                (event.key === "ArrowUp"
                  ? step
                  : event.key === "ArrowDown"
                    ? -step
                    : 0),
            ),
          );
          e.patch({
            cutoff: Math.round(80 * 200 ** x),
            blend: Math.round(blend * 1000) / 1000,
          });
        }
      }}
      onKeyUp={(event) => {
        if (event.key.startsWith("Arrow")) end();
      }}
    >
      <span>OSCILLATOR B ↑</span>
      <span className="pad-axis">FILTER CUTOFF →</span>
      <i
        style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
      />
    </div>
  );
}
