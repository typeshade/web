import type { Editor } from "../../../useEditor.ts";
export function Variations({ editor: e }: { editor: Editor }) {
  const morph = e.morphAmount;
  return (
    <div className="variation-controls">
      <div className="button-row">
        {(["a", "b"] as const).map((slot) => (
          <div key={slot} className="segmented">
            <button
              id={`store-${slot}`}
              onClick={() => e.snapshot("store", slot)}
            >
              Store {slot.toUpperCase()}
            </button>
            <button
              id={`recall-${slot}`}
              onClick={() => e.snapshot("recall", slot)}
            >
              Recall
            </button>
          </div>
        ))}
      </div>
      <label className="parameter">
        <span>A / B blend</span>
        <output>
          {morph === undefined ? "Custom" : `${Math.round(morph * 100)}%`}
        </output>
        <input
          id="morph"
          type="range"
          min="0"
          max="1"
          step=".01"
          value={morph ?? 0.5}
          onChange={(event) => {
            const v = Number(event.target.value);
            e.morph(v);
          }}
        />
      </label>
      <button id="randomize" onClick={e.randomize}>
        Randomize sound
      </button>
    </div>
  );
}
