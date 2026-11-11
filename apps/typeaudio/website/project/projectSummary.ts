/** Layer count and length of a saved project, read without validating or compiling it. */
export function projectSummary(content: unknown): {
  layers: number;
  seconds?: number;
} {
  const data = (content ?? {}) as {
    scene?: { cues?: unknown[]; start?: unknown; end?: unknown };
    editor?: { source?: { patch?: { duration?: unknown } } };
  };
  const scene = data.scene && "cues" in data.scene ? data.scene : undefined;
  const layers = Array.isArray(scene?.cues) ? scene.cues.length : 0;
  if (
    layers &&
    typeof scene?.start === "number" &&
    typeof scene.end === "number" &&
    scene.end > scene.start
  )
    return { layers, seconds: scene.end - scene.start };
  const duration = data.editor?.source?.patch?.duration;
  return typeof duration === "number" && duration > 0
    ? { layers, seconds: duration }
    : { layers };
}
