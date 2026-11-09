/** Snap a moving clip's start/end to nearby anchors using a screen-space tolerance. */
export function moveClip(
  start: number,
  dx: number,
  width: number,
  span: number,
  duration: number,
  snap: boolean,
  coarse: boolean,
  anchors: readonly number[],
): { time: number; guide?: number } {
  const proposed = start + (dx / Math.max(1, width)) * span,
    unit = coarse ? 0.1 : snap ? 0.01 : 0.001;
  let time = Math.max(0, Math.min(3600, Math.round(proposed / unit) * unit)),
    guide: number | undefined;
  if (snap) {
    let distance = (span * 6) / Math.max(1, width);
    for (const anchor of anchors)
      for (const offset of [0, duration]) {
        const candidate = anchor - offset,
          diff = Math.abs(candidate - proposed);
        if (candidate >= 0 && candidate <= 3600 && diff < distance) {
          distance = diff;
          time = candidate;
          guide = anchor;
        }
      }
  }
  return { time: Math.round(time * 1000) / 1000, guide };
}
