export function GraphViewControls({
  scale,
  hasSelection,
  onFit,
  onFrame,
  onZoom,
}: {
  scale: number;
  hasSelection: boolean;
  onFit: () => void;
  onFrame: () => void;
  onZoom: (factor: number) => void;
}) {
  return (
    <>
      <button onClick={onFit} data-tooltip="Fit the complete graph. Home">
        Fit all
      </button>
      <button
        disabled={!hasSelection}
        onClick={onFrame}
        data-tooltip="Frame the selected nodes. F"
      >
        Frame
      </button>
      <button aria-label="Zoom graph out" onClick={() => onZoom(1 / 1.2)}>
        −
      </button>
      <span className="graph-zoom">{Math.round(scale * 100)}%</span>
      <button aria-label="Zoom graph in" onClick={() => onZoom(1.2)}>
        +
      </button>
    </>
  );
}
