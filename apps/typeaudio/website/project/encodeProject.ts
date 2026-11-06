import type { Scene } from "../video-model.ts";

export function encodeProject(scene: Scene, audioAssets: unknown[] = []) {
  const assets = audioAssets.length ? { audioAssets } : {};
  return scene.space || scene.origin
    ? { schema: "typeaudio.project", version: 1, scene, ...assets }
    : { ...scene, ...assets };
}
