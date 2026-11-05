import { CueAudio } from "../../video-audio.ts";
import type { Scene } from "../../video-model.ts";
import type { YouTubePlayer } from "../../video-youtube.ts";
/** Media time is the master clock. Re-schedule cues after seeks, buffering and drift. */
export class SceneTransport {
  readonly audio = new CueAudio();
  video?: HTMLVideoElement;
  youtube?: YouTubePlayer;
  kind: "none" | "file" | "youtube" = "none";
  position = 0;
  private epoch = 0;
  private playing = false;
  private anchor?: { time: number; audio: number; rate: number };
  private generation = 0;
  current() {
    return this.kind === "file"
      ? this.video?.currentTime || 0
      : this.kind === "youtube"
        ? this.youtube?.getCurrentTime() || 0
        : this.position +
          (this.playing ? (performance.now() - this.epoch) / 1000 : 0);
  }
  active() {
    return this.kind === "file"
      ? !!this.video &&
          !this.video.paused &&
          !this.video.seeking &&
          !this.video.ended &&
          this.video.readyState >= 2
      : this.kind === "youtube"
        ? this.youtube?.getPlayerState() === 1
        : this.playing;
  }
  duration() {
    return this.kind === "file"
      ? this.video?.duration || 0
      : this.kind === "youtube"
        ? this.youtube?.getDuration() || 0
        : 0;
  }
  stop() {
    this.position = this.current();
    this.playing = false;
    this.generation++;
    this.video?.pause();
    this.youtube?.pauseVideo();
    this.audio.stop();
    this.anchor = undefined;
  }
  seek(time: number) {
    time = Math.max(0, Math.min(3600, time));
    this.audio.stop();
    this.anchor = undefined;
    this.position = time;
    this.epoch = performance.now();
    if (this.kind === "file" && this.video)
      this.video.currentTime = Math.min(time, this.video.duration || time);
    if (this.kind === "youtube") this.youtube?.seekTo(time, true);
  }
  async play(scene: Scene, restart = false) {
    this.stop();
    const generation = this.generation;
    await this.audio.unlock();
    if (generation !== this.generation) return;
    if (restart || this.current() < scene.start || this.current() >= scene.end)
      this.seek(scene.start);
    if (this.kind === "file") await this.video?.play();
    else if (this.kind === "youtube") this.youtube?.playVideo();
    else {
      this.epoch = performance.now();
      this.playing = true;
    }
  }
  level(scene: Scene) {
    if (this.video) this.video.volume = scene.original;
    this.youtube?.setVolume(scene.original * 100);
    this.audio.setLevel(scene.effects);
  }
  tick(scene: Scene, samples: Map<string, Float32Array>, ready: boolean) {
    const at = this.current(),
      active = this.active();
    if (active && at >= scene.end - 0.008) return true;
    const ctx = this.audio.context;
    if (active && ready && ctx?.state === "running") {
      const rate =
        this.kind === "file"
          ? this.video?.playbackRate || 1
          : this.kind === "youtube"
            ? this.youtube?.getPlaybackRate() || 1
            : 1;
      const drift = this.anchor
        ? Math.abs(
            at -
              (this.anchor.time +
                (ctx.currentTime - this.anchor.audio) * this.anchor.rate),
          )
        : Infinity;
      if (
        !this.anchor ||
        this.anchor.rate !== rate ||
        drift > (this.kind === "youtube" ? 0.3 : 0.08)
      ) {
        this.audio.schedule(scene, samples, at, rate);
        this.anchor = { time: at, audio: ctx.currentTime, rate };
      }
    } else if (this.anchor) {
      this.audio.stop();
      this.anchor = undefined;
    }
    return false;
  }
  detach() {
    this.stop();
    this.youtube?.destroy();
    this.youtube = undefined;
    this.kind = "none";
    this.position = 0;
    this.video?.removeAttribute("src");
    this.video?.load();
  }
  close() {
    this.detach();
    this.audio.close();
  }
}
