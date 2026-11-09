export type ClipHandleKind = "in" | "out" | "fadeIn" | "fadeOut";
export function ClipHandle({
  kind,
  position,
  name,
  onKeyDown,
}: {
  kind: ClipHandleKind;
  position: number;
  name: string;
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      className={`clip-handle ${kind === "in" || kind === "out" ? "trim-handle" : "fade-handle"} handle-${kind}`}
      data-handle={kind}
      aria-label={`${kind === "in" ? "Trim start" : kind === "out" ? "Trim end" : kind === "fadeIn" ? "Fade in" : "Fade out"}: ${name}`}
      data-tooltip={`${kind === "in" ? "Trim start" : kind === "out" ? "Trim end" : kind === "fadeIn" ? "Fade in" : "Fade out"}. Drag or use arrow keys; Shift changes 100 ms. Escape cancels a drag.`}
      style={{ left: `${Math.max(0, Math.min(100, position))}%` }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
    />
  );
}
