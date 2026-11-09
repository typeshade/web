import { validateScene } from "../video-model.ts";
import { renderSpatialScene } from "./renderSpatialScene.ts";

self.onmessage = ({ data }) => {
  try {
    const scene = validateScene(data.scene);
    const result = renderSpatialScene(scene, new Map(data.samples));
    self.postMessage(result, {
      transfer: [result.left.buffer, result.right.buffer],
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
