export function GraphToolbar({
  count,
  selected,
  busy,
  snap,
  onSnap,
  onAdd,
  onArrange,
  onRecipe,
}: {
  count: number;
  selected: number;
  busy: boolean;
  snap: boolean;
  onSnap: (snap: boolean) => void;
  onAdd: () => void;
  onArrange: () => void;
  onRecipe: (recipe: "impact" | "tone") => void;
}) {
  return (
    <div className="graph-toolbar">
      <button
        id="add-graph-node"
        disabled={busy || count >= 16}
        onClick={onAdd}
        data-tooltip="Search source, processor and control nodes. Tab on the canvas or Shift+A opens search."
      >
        + Add node <kbd>Tab</kbd>
      </button>
      <button
        onClick={onArrange}
        disabled={busy}
        data-tooltip="Arrange the graph from inputs to output. Undo restores the previous positions."
      >
        Arrange
      </button>
      <button
        aria-pressed={snap}
        onClick={() => onSnap(!snap)}
        data-tooltip="Snap node movement to the 20-unit grid; group spacing is preserved."
      >
        Snap
      </button>
      <span className="graph-count">
        {count} / 16 nodes{selected ? ` · ${selected} selected` : ""}
      </span>
      <details className="graph-recipes">
        <summary data-tooltip="Replace the network with a starting recipe. Undo restores your graph.">
          Recipes
        </summary>
        <div>
          <button
            disabled={busy}
            onClick={(event) => {
              event.currentTarget.closest("details")!.open = false;
              onRecipe("impact");
            }}
          >
            Impact recipe
          </button>
          <button
            disabled={busy}
            onClick={(event) => {
              event.currentTarget.closest("details")!.open = false;
              onRecipe("tone");
            }}
          >
            Tone recipe
          </button>
        </div>
      </details>
    </div>
  );
}
