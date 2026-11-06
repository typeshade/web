import type { Editor } from "../../../useEditor.ts";
import type { CueSpace } from "../../../../scene/types.ts";
import { validateCueSpace } from "../../../../scene/validateSceneSpace.ts";

export function SpatialSourceProperties({ editor: e }: { editor: Editor }) {
  const cue = e.selected, scene = e.state.scene;
  if (!cue || !scene.space) return null;
  const space = cue.space ?? { points: [{ time: 0, ...scene.space.listener.position }], spread: 0, send: .4 };
  function change(next: CueSpace) {
    try {
      const checked = validateCueSpace(next, scene.space);
      e.cue(current => ({ ...current, space: checked }));
    } catch (error) { e.setNotice(String(error)); }
  }
  return <div className="property-section spatial-source-properties">
    <h3>Position and room</h3>
    {(["spread", "send"] as const).map(key => <label className="inline-property" key={key}>
      {key === "send" ? "Room send" : "Source spread"}
      <input aria-label={key === "send" ? "Room send" : "Source spread"} type="number" min="0" max="1" step=".05"
        value={space[key]} onFocus={e.beginEdit} onBlur={e.endEdit}
        onChange={event => { const v = event.target.valueAsNumber; if (Number.isFinite(v) && v >= 0 && v <= 1) change({ ...space, [key]: v }); }} />
    </label>)}
    <p className="panel-hint">Metres relative to the listener: X right, Y up, −Z forward. Times follow the source, including trims.</p>
    <div className="trajectory-points">
      {space.points.map((point, index) => <fieldset key={index}>
        <legend>Position {index + 1}</legend>
        {(["time", "x", "y", "z"] as const).map(axis => <label key={axis}>
          {axis === "time" ? "Seconds" : axis.toUpperCase()}
          <input aria-label={`Position ${index + 1} ${axis}`} type="number" step=".1" value={point[axis]}
            disabled={axis === "time" && index === 0} onFocus={e.beginEdit} onBlur={e.endEdit}
            onChange={event => { const v = event.target.valueAsNumber;
              if (Number.isFinite(v)) change({ ...space, points: space.points.map((p, i) => i === index ? { ...p, [axis]: v } : p) }); }} />
        </label>)}
        {index > 0 && <button onClick={() => change({ ...space, points: space.points.filter((_, i) => i !== index) })}>Remove point</button>}
      </fieldset>)}
    </div>
    <button disabled={space.points.length >= 16 || space.points.at(-1)!.time >= 60}
      onClick={() => { const last = space.points.at(-1)!; change({ ...space, points: [...space.points, { ...last, time: Math.min(60, last.time + 1) }] }); }}>
      Add position point
    </button>
  </div>;
}
