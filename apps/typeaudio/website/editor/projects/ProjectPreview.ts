import { CueAudio } from "../../video-audio.ts";
import { decodeProject } from "../../project/decodeProject.ts";
import { projectUrl } from "../../project/catalog.ts";

/** Disposable audition resources; never writes to the working document. */
export class ProjectPreview {
  private audio?: CueAudio;
  private request?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  stop() {
    this.request?.abort();
    this.request = undefined;
    clearTimeout(this.timer);
    this.audio?.close();
    this.audio = undefined;
  }
  async play(id: string, playing: () => void, ended: () => void) {
    this.stop();
    const request = new AbortController();
    this.request = request;
    const audio = new CueAudio();
    this.audio = audio;
    try {
      // Unlock in the original click gesture, before any network/worker awaits.
      await audio.unlock();
      const response = await fetch(projectUrl(id), { signal: request.signal });
      if (!response.ok) throw new Error("Could not load this preview.");
      const { scene } = decodeProject(await response.json());
      const samples = await audio.prepare(scene);
      if (request.signal.aborted) return;
      audio.schedule(scene, samples, scene.start);
      playing();
      this.timer = setTimeout(
        () => {
          if (request.signal.aborted) return;
          this.stop();
          ended();
        },
        (scene.end - scene.start) * 1000,
      );
    } catch (error) {
      if (request.signal.aborted) return;
      this.stop();
      throw error;
    }
  }
}
