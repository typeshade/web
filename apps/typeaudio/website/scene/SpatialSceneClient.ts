import type { Scene } from "../video-model.ts";
import type { StereoScene } from "./types.ts";
import { sceneRenderKey } from "./sceneRenderKey.ts";

export class SpatialSceneClient {
  private cancel?: () => void;
  private result?: { key: string; pcm: StereoScene };
  async prepare(scene: Scene, samples: Map<string, Float32Array>): Promise<void> {
    this.cancel?.();
    const key = sceneRenderKey(scene);
    if (this.result?.key === key) return;
    this.result = undefined;
    await new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL("./scene.worker.ts", import.meta.url), { type: "module" });
      let done = false;
      const finish = (error?: string, pcm?: StereoScene) => {
        if (done) return;
        done = true; clearTimeout(timer); worker.terminate(); this.cancel = undefined;
        if (error) reject(new Error(error));
        else { this.result = { key, pcm: pcm! }; resolve(); }
      };
      const timer = setTimeout(() => finish("Room preview timed out. Reduce the composition length or layer count."), 90000);
      this.cancel = () => finish("Room preview cancelled.");
      worker.onerror = event => finish(event.message || "Room preview failed.");
      worker.onmessage = ({ data }) => {
        if (data.error) finish(data.error);
        else if (!(data.left instanceof Float32Array) || !(data.right instanceof Float32Array) ||
          data.left.length !== data.right.length || !data.left.every(Number.isFinite) || !data.right.every(Number.isFinite))
          finish("Invalid room preview.");
        else finish(undefined, data);
      };
      worker.postMessage({ scene, samples: [...samples] });
    });
  }
  read(scene: Scene): StereoScene | undefined {
    return this.result?.key === sceneRenderKey(scene) ? this.result.pcm : undefined;
  }
  close() { this.cancel?.(); this.result = undefined; }
}
