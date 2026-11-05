import type { Editor } from "../useEditor.ts";
import { Panel } from "./Panel.tsx";
import { openContext, useInteractions } from "../interactions.tsx";

export function SourceRack({
  editor: e,
  selected,
  select,
}: {
  editor: Editor;
  selected: string;
  select: (id: string) => void;
}) {
  const { openMenu } = useInteractions(),
    layer = e.state.patch.layers.find((l) => l.id === selected);
  const full = e.state.patch.layers.length >= 3;
  const duplicate = (id: string) => {
    e.endEdit();
    select(e.addLayer(id));
  };
  return (
    <Panel
      title="Sound layers"
      className="source-rack"
      actions={
        <button
          onClick={() => {
            e.endEdit();
            select(e.addLayer());
          }}
          disabled={full}
          aria-label="Add sound layer"
          data-tooltip="Add an independent source, envelope, modulation and effects. Up to four layers."
        >
          +
        </button>
      }
    >
      <div className="source-list" role="group" aria-label="Sound layers">
        {[
          {
            id: "base",
            name: "Base source",
            muted: e.state.patch.baseMuted,
            offset: 0,
          },
          ...e.state.patch.layers,
        ].map((l) => (
          <button
            key={l.id}
            data-source-layer={l.id}
            aria-pressed={selected === l.id}
            onClick={() => select(l.id)}
            onKeyDown={(event) => {
              if (
                event.key === "ContextMenu" ||
                (event.shiftKey && event.key === "F10")
              ) {
                event.preventDefault();
                const r = event.currentTarget.getBoundingClientRect();
                event.currentTarget.dispatchEvent(
                  new MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    clientX: r.left + 16,
                    clientY: r.top + r.height / 2,
                  }),
                );
              }
            }}
            onContextMenu={(event) =>
              openContext(
                event,
                openMenu,
                "source-layer",
                "Sound layer actions",
                [
                  { label: "Edit layer", action: () => select(l.id) },
                  {
                    label: "Duplicate layer",
                    disabled: full,
                    action: () => duplicate(l.id),
                  },
                  {
                    label: l.muted ? "Unmute layer" : "Mute layer",
                    action: () =>
                      l.id === "base"
                        ? e.patch({ baseMuted: !l.muted })
                        : e.changeLayer(l.id, { muted: !l.muted }),
                  },
                  {
                    label: "Delete layer",
                    disabled: l.id === "base",
                    danger: true,
                    action: () => {
                      e.removeLayer(l.id);
                      select("base");
                    },
                  },
                ],
              )
            }
          >
            <span>{l.muted ? "○" : "●"}</span>
            <span>{l.name}</span>
            <small>{l.offset.toFixed(2)} s</small>
          </button>
        ))}
      </div>
      {layer && (
        <div className="layer-settings">
          <label>
            Layer name
            <input
              aria-label="Sound layer name"
              value={layer.name}
              maxLength={40}
              onFocus={e.beginEdit}
              onBlur={e.endEdit}
              onChange={(event) =>
                e.changeLayer(layer.id, { name: event.target.value })
              }
            />
          </label>
          <label>
            Start at (s)
            <input
              aria-label="Sound layer start"
              type="number"
              min="0"
              max="5"
              step=".01"
              value={layer.offset}
              onFocus={e.beginEdit}
              onBlur={e.endEdit}
              onChange={(event) => {
                const v = event.target.valueAsNumber;
                if (Number.isFinite(v) && v >= 0 && v <= 5)
                  e.changeLayer(layer.id, { offset: v });
              }}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={layer.muted}
              onChange={(event) =>
                e.changeLayer(layer.id, { muted: event.target.checked })
              }
            />
            Mute layer
          </label>
          <button
            onClick={() => {
              e.removeLayer(layer.id);
              select("base");
            }}
          >
            Delete layer
          </button>
        </div>
      )}
      {!layer && (
        <label className="check">
          <input
            type="checkbox"
            checked={e.state.patch.baseMuted}
            onChange={(event) => e.patch({ baseMuted: event.target.checked })}
          />
          Mute base source
        </label>
      )}
      <div className="button-row">
        <button disabled={full} onClick={() => duplicate(selected)}>
          Duplicate layer
        </button>
        <button
          onClick={() => {
            e.newSound();
            select("base");
          }}
        >
          New sound
        </button>
      </div>
      <p className="panel-hint">
        Select a layer to edit its modules. A/B variations store the entire
        sound.
      </p>
    </Panel>
  );
}
