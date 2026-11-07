import type { Scene } from "../video-model.ts";

/** Every audible room edit invalidates its cached composition; faders stay on the playback bus. */
export function sceneRenderKey(scene: Scene): string {
  return JSON.stringify(
    scene.space
      ? {
          start: scene.start,
          end: scene.end,
          space: scene.space,
          cues: scene.cues,
        }
      : scene.cues.map((c) => [c.id, c.audio ?? c.patch]),
  );
}
