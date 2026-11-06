import { useRef } from "react";
import { NumericValue } from "../NumericValue.tsx";
import { DEFAULT } from "../../../../sound/defaultPatch.ts";
import { openContext } from "../../../interactions/openContext.ts";
import { useInteractions } from "../../../hooks/interactions/useInteractions.ts";
import type { Editor } from "../../../useEditor.ts";
import { LIMITS } from "../../../../sound/limits.ts";
import { SHAPES } from "../../../../sound/constants.ts";
import { type Patch } from "../../../../sound/types.ts";
import { labels } from "../../../config/parameterMetadata.ts";
import { units } from "../../../config/parameterMetadata.ts";
import { HELP } from "../../../config/parameterMetadata.ts";
export function Parameter({
  editor: e,
  name,
}: {
  editor: Editor;
  name: Exclude<keyof Patch, "graph" | "wave" | "curves" | "layers">;
}) {
  const gesture = useRef(false),
    { openMenu } = useInteractions();
  const value = e.state.patch[name],
    limit = LIMITS[name],
    options =
      name === "shapeA" || name === "shapeB"
        ? SHAPES
        : name === "lfoTarget"
          ? ["Filter cutoff", "Pitch", "Oscillator blend"]
          : name === "lfoShape"
            ? ["Sine", "Triangle"]
            : undefined;
  if (typeof value === "boolean")
    return (
      <label className="check" data-tooltip={HELP[name]}>
        <input
          id={name}
          type="checkbox"
          checked={value}
          onChange={(event) => e.patch({ [name]: event.target.checked })}
        />
        {labels[name] || name}
      </label>
    );
  const integer = [
    "shapeA",
    "shapeB",
    "voices",
    "transpose",
    "lfoTarget",
    "lfoShape",
    "seed",
  ].includes(name);
  const step = integer
    ? 1
    : ["frequency", "cutoff", "tempo"].includes(name)
      ? 1
      : ["attack"].includes(name)
        ? 0.001
        : 0.01;
  return (
    <div
      className={`parameter ${options ? "parameter-select" : ""}`}
      data-tooltip={
        name === "lfoRate" && e.state.patch.lfoSync
          ? "Beat sync is on. Rate follows BPM."
          : HELP[name]
      }
      onContextMenu={(event) => {
        if (
          event.target instanceof HTMLInputElement &&
          event.target.type !== "range"
        )
          return;
        openContext(
          event,
          openMenu,
          `parameter-${name}`,
          `${labels[name] || name} options`,
          [
            {
              label: `Reset ${labels[name] || name}`,
              action: () => e.patch({ [name]: DEFAULT[name] }),
            },
          ],
        );
      }}
    >
      <label htmlFor={name}>{labels[name] || name}</label>
      {options ? (
        <select
          id={name}
          value={value}
          onChange={(event) => e.patch({ [name]: Number(event.target.value) })}
        >
          {options.map((option, i) => (
            <option value={i} key={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <>
          <NumericValue
            editor={e}
            name={name}
            label={labels[name] || name}
            unit={units[name] || ""}
            step={step}
            integer={integer}
            disabled={name === "lfoRate" && e.state.patch.lfoSync}
          />
          <input
            id={name}
            type="range"
            min={limit[0]}
            max={limit[1]}
            step={step}
            value={value}
            disabled={name === "lfoRate" && e.state.patch.lfoSync}
            onPointerDown={(event) => {
              if (event.button === 0) {
                gesture.current = true;
                e.beginEdit();
              }
            }}
            onPointerUp={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onPointerCancel={() => {
              if (gesture.current) e.cancelEdit();
              gesture.current = false;
            }}
            onLostPointerCapture={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && gesture.current) {
                event.preventDefault();
                event.stopPropagation();
                e.cancelEdit();
                gesture.current = false;
              } else if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                  "PageUp",
                  "PageDown",
                ].includes(event.key) &&
                !gesture.current
              ) {
                gesture.current = true;
                e.beginEdit();
              }
            }}
            onKeyUp={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onBlur={() => {
              if (gesture.current) e.endEdit();
              gesture.current = false;
            }}
            onChange={(event) =>
              e.patch({ [name]: Number(event.target.value) })
            }
          />
        </>
      )}
    </div>
  );
}
