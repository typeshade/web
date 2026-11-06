export function TimelineViewportControls({
  snap,
  setSnap,
  zoom,
  setZoom,
}: {
  snap: boolean;
  setSnap: (value: boolean) => void;
  zoom: number;
  setZoom: (value: number) => void;
}) {
  return (
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
  );
}
