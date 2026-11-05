import "./video-style.css";
import { PRESETS, SAMPLE_RATE, validatePatch, type Patch } from "./designer.ts";
import { wav } from "./audio.ts";
import { CueAudio } from "./video-audio.ts";
import {
  emptyScene,
  validateScene,
  youtubeId,
  mixScene,
  MAX_CUES,
  type Scene,
  type Cue,
} from "./video-model.ts";
import { createYouTube, type YouTubePlayer } from "./video-youtube.ts";
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const field = (id: string) => el<HTMLInputElement>(id);
const button = (id: string) => el<HTMLButtonElement>(id);
const video = el<HTMLVideoElement>("video");
const audio = new CueAudio(),
  STORE = "typeaudio.video.scene.v1";
let scene = emptyScene(),
  selected = "",
  history: Scene[] = [],
  patches = new Map<string, { name: string; patch: Patch }>();
let samples = new Map<string, Float32Array>(),
  mediaKind: "none" | "file" | "youtube" = "none",
  youtube: YouTubePlayer | undefined,
  mediaUrl: string | undefined;
let mediaGeneration = 0,
  transportGeneration = 0,
  renderGeneration = 0,
  position = 0,
  epoch = 0,
  playing = false,
  loopPending = false,
  anchor: { video: number; audio: number; rate: number } | undefined;
let ready = false,
  frame = 0,
  disposed = false;
function mediaDuration(): number {
  return mediaKind === "file"
    ? video.duration
    : mediaKind === "youtube"
      ? youtube?.getDuration() || 0
      : 0;
}
function finishScene(): void {
  if (loopPending) return;
  halt();
  if (scene.loop) {
    loopPending = true;
    void play(true).finally(() => (loopPending = false));
  } else {
    seek(scene.end);
    status("Scene finished.");
  }
}
function status(text: string, error = false): void {
  el("status").textContent = text;
  el("status").classList.toggle("error", error);
}
function clone(): Scene {
  return structuredClone(scene);
}
function current(): number {
  if (mediaKind === "file") return video.currentTime || 0;
  if (mediaKind === "youtube") return youtube?.getCurrentTime() || 0;
  return position + (playing ? (performance.now() - epoch) / 1000 : 0);
}
function running(): boolean {
  if (mediaKind === "file")
    return (
      !video.paused && !video.seeking && !video.ended && video.readyState >= 2
    );
  if (mediaKind === "youtube") return youtube?.getPlayerState() === 1;
  return playing;
}
function rate(): number {
  return mediaKind === "file"
    ? video.playbackRate
    : mediaKind === "youtube"
      ? youtube?.getPlaybackRate() || 1
      : 1;
}
function halt(): void {
  position = current();
  playing = false;
  transportGeneration++;
  video.pause();
  youtube?.pauseVideo();
  audio.stop();
  anchor = undefined;
  el("clock").dataset.scheduled = "0";
}
function seek(at: number): void {
  at = Math.max(0, Math.min(3600, at));
  audio.stop();
  anchor = undefined;
  position = at;
  epoch = performance.now();
  if (mediaKind === "file")
    video.currentTime = Math.min(at, video.duration || at);
  if (mediaKind === "youtube") youtube?.seekTo(at, true);
}
function levels(): void {
  video.volume = scene.original;
  youtube?.setVolume(scene.original * 100);
}
function save(): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(scene));
    el("save-status").textContent = "Saved in this browser";
  } catch {
    el("save-status").textContent = "Storage unavailable — export your project";
  }
}
function changed(): void {
  halt();
  save();
  const last = history.at(-1);
  if (JSON.stringify(last) !== JSON.stringify(scene)) history.push(clone());
  if (history.length > 30) history.shift();
  draw();
  void prepare();
}
async function prepare(): Promise<void> {
  const generation = ++renderGeneration,
    snapshot = clone();
  ready = false;
  button("play").disabled = true;
  button("export-wav").disabled = true;
  button("audition").disabled = true;
  status(
    snapshot.cues.length
      ? "Preparing sound cues…"
      : "Ready. Add a cue or load a video.",
  );
  try {
    const next = await audio.prepare(snapshot);
    if (generation !== renderGeneration || disposed) return;
    samples = next;
    ready = true;
    button("play").disabled = false;
    button("export-wav").disabled = !scene.cues.length;
    button("audition").disabled = false;
    status(
      scene.cues.length
        ? "Cues ready. Play the scene or select a cue to edit it."
        : "Ready. Add a cue or load a video.",
    );
    draw();
  } catch (error) {
    if (generation === renderGeneration) status(String(error), true);
  }
}
async function play(restart = false): Promise<void> {
  halt();
  const generation = transportGeneration;
  try {
    if (!ready) throw new Error("Wait for sound cues to finish rendering.");
    await audio.unlock();
    if (generation !== transportGeneration) return;
    if (restart || current() < scene.start || current() >= scene.end)
      seek(scene.start);
    if (mediaKind === "file") await video.play();
    else if (mediaKind === "youtube") youtube?.playVideo();
    else {
      epoch = performance.now();
      playing = true;
    }
    if (generation !== transportGeneration) return;
    status(
      mediaKind === "youtube"
        ? "YouTube reference playback. Cue sync is approximate."
        : "Playing scene.",
    );
  } catch (error) {
    if (generation === transportGeneration) {
      halt();
      status(String(error), true);
    }
  }
}
function tick(): void {
  if (disposed) return;
  const at = current(),
    active = running();
  el("clock").textContent = `${at.toFixed(3)} s`;
  field("seek").value = String(at);
  const playhead = el("timeline-playhead");
  if (playhead) {
    playhead.style.left = `${Math.max(0, Math.min(100, ((at - scene.start) / (scene.end - scene.start)) * 100))}%`;
  }
  if (active && at >= scene.end - 0.008 && !loopPending) {
    finishScene();
  } else if (active && ready && audio.context?.state === "running") {
    const speed = rate(),
      clock = audio.context.currentTime;
    const drift = anchor
      ? Math.abs(at - (anchor.video + (clock - anchor.audio) * anchor.rate))
      : Infinity;
    if (
      !anchor ||
      anchor.rate !== speed ||
      drift > (mediaKind === "youtube" ? 0.3 : 0.08)
    ) {
      audio.schedule(scene, samples, at, speed);
      anchor = { video: at, audio: clock, rate: speed };
      el("clock").dataset.scheduled = String(audio.scheduled);
    }
  } else if (anchor) {
    audio.stop();
    anchor = undefined;
    el("clock").dataset.scheduled = "0";
  }
  frame = requestAnimationFrame(tick);
}
function sources(): void {
  patches = new Map(
    Object.entries(PRESETS).map(([key, p]) => [
      key,
      { name: p.name, patch: p.patch },
    ]),
  );
  try {
    const raw = localStorage.getItem("typeaudio.video.designer-patch.v1");
    if (raw) {
      const value = JSON.parse(raw);
      patches.set("designer", {
        name: `Designer: ${String(value.name).slice(0, 40)}`,
        patch: validatePatch(value.patch),
      });
    }
  } catch {}
  try {
    const raw = JSON.parse(
      localStorage.getItem("typeaudio.designer.saved.v1") || "[]",
    );
    if (Array.isArray(raw))
      for (const [i, p] of raw.slice(0, 30).entries())
        try {
          patches.set(`saved-${i}`, {
            name: `Saved: ${String(p.name).slice(0, 40)}`,
            patch: validatePatch(p.patch),
          });
        } catch {}
  } catch {}
  for (const id of ["new-source", "cue-source"]) {
    const select = el<HTMLSelectElement>(id),
      old = select.value;
    select.replaceChildren();
    if (id === "cue-source")
      select.append(new Option("Keep current sound", ""));
    for (const [key, p] of patches) select.append(new Option(p.name, key));
    if (patches.has(old)) select.value = old;
  }
}
function cue(): Cue | undefined {
  return scene.cues.find((c) => c.id === selected);
}
function drawTimeline(): void {
  const target = el("timeline");
  target.replaceChildren();
  el("timeline-in").textContent = `${scene.start.toFixed(2)} s`;
  el("timeline-out").textContent = `${scene.end.toFixed(2)} s`;
  el("cue-count").textContent = `${scene.cues.length} / ${MAX_CUES}`;
  el("empty-cues").hidden = scene.cues.length > 0;
  for (const c of [...scene.cues].sort((a, b) => a.time - b.time)) {
    const row = document.createElement("div");
    row.className = "cue-row";
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.cue = c.id;
    b.className = "cue-marker" + (c.muted ? " muted" : "");
    b.setAttribute("aria-pressed", String(c.id === selected));
    b.textContent = `${c.time.toFixed(2)}s · ${c.name}${c.muted ? " · muted" : ""}`;
    b.title = b.textContent;
    const duration = (samples.get(c.id)?.length || 0) / SAMPLE_RATE;
    if (c.time >= scene.end || c.time + duration < scene.start) {
      b.className = "cue-outside";
      b.textContent += " · outside range";
    } else {
      const left = Math.max(
          0,
          ((c.time - scene.start) / (scene.end - scene.start)) * 100,
        ),
        bar = document.createElement("span");
      bar.className = "cue-span";
      bar.style.left = `${left}%`;
      bar.style.width = `${Math.min(100 - left, Math.max(0.3, ((c.time + duration - Math.max(c.time, scene.start)) / (scene.end - scene.start)) * 100))}%`;
      b.append(bar);
    }
    b.addEventListener("click", () => {
      selected = c.id;
      draw();
    });
    row.append(b);
    target.append(row);
  }
  const playhead = document.createElement("div");
  playhead.id = "timeline-playhead";
  playhead.setAttribute("aria-hidden", "true");
  target.append(playhead);
}
function draw(): void {
  field("scene-name").value = scene.name;
  field("range-in").value = String(scene.start);
  field("range-out").value = String(scene.end);
  field("loop").checked = scene.loop;
  field("seek").min = "0";
  field("seek").max = String(
    Math.min(3600, Math.max(scene.end, mediaDuration() || 0)),
  );
  field("original-volume").value = String(scene.original);
  field("effects-volume").value = String(scene.effects);
  el("original-value").textContent = `${Math.round(scene.original * 100)}%`;
  el("effects-value").textContent = `${Math.round(scene.effects * 100)}%`;
  button("undo").disabled = history.length < 2;
  button("add-cue").disabled = scene.cues.length >= MAX_CUES;
  levels();
  drawTimeline();
  const c = cue();
  el<HTMLFieldSetElement>("cue-fields").disabled = !c;
  el("select-hint").hidden = !!c;
  if (c) {
    field("cue-name").value = c.name;
    field("cue-time").value = String(c.time);
    field("cue-gain").value = String(c.gain);
    field("cue-muted").checked = c.muted;
    field("cue-source").value = "";
    field("cue-frequency").value = String(c.patch.frequency);
    field("cue-duration").value = String(c.patch.duration);
    field("cue-release").value = String(c.patch.release);
    el("cue-gain-value").textContent = `${Math.round(c.gain * 100)}%`;
    el("cue-detail").textContent =
      `${((samples.get(c.id)?.length || 0) / SAMPLE_RATE).toFixed(2)} s including rendered effect tails. Changes affect this cue only.`;
  } else el("cue-detail").textContent = "";
}
function changeCue(edit: (c: Cue) => void): void {
  const c = cue();
  if (!c) return;
  const old = clone();
  try {
    edit(c);
    scene = validateScene(scene);
    changed();
  } catch (error) {
    scene = old;
    draw();
    status(String(error), true);
  }
}
function cleanupMedia(): void {
  halt();
  mediaGeneration++;
  video.onloadedmetadata = null;
  video.onerror = null;
  youtube?.destroy();
  youtube = undefined;
  video.removeAttribute("src");
  video.load();
  if (mediaUrl) URL.revokeObjectURL(mediaUrl);
  mediaUrl = undefined;
  mediaKind = "none";
  video.hidden = true;
  el("youtube-host").hidden = true;
  el("youtube-host").replaceChildren();
  el("empty-view").hidden = false;
  el("media-label").textContent = "Audio-only preview";
}
function fitDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) return;
  if (scene.start >= duration) {
    scene.start = 0;
    scene.end = Math.min(10, duration);
  } else scene.end = Math.min(scene.end, duration);
  draw();
  save();
}
field("video-file").addEventListener("change", () => {
  const file = field("video-file").files?.[0];
  if (!file) return;
  cleanupMedia();
  const generation = mediaGeneration;
  mediaUrl = URL.createObjectURL(file);
  video.src = mediaUrl;
  video.hidden = false;
  el("empty-view").hidden = true;
  mediaKind = "file";
  scene.media = { kind: "file", name: file.name.slice(0, 100) };
  video.onloadedmetadata = () => {
    if (generation !== mediaGeneration) return;
    if (!Number.isFinite(video.duration) || video.duration < 0.05) {
      cleanupMedia();
      status(
        "Choose a video with a finite duration of at least 0.05 seconds.",
        true,
      );
      return;
    }
    fitDuration(video.duration);
    history = [clone()];
    el("media-label").textContent = file.name;
    changed();
    status("Video ready. Pause on an action, then add a cue.");
  };
  video.onerror = () => {
    if (generation !== mediaGeneration) return;
    cleanupMedia();
    status(
      "This video could not be decoded. Try an MP4 (H.264) or WebM file supported by your browser.",
      true,
    );
  };
  field("video-file").value = "";
});
button("load-youtube").addEventListener("click", async () => {
  let id: string;
  try {
    id = youtubeId(field("youtube-url").value.trim());
  } catch (error) {
    status(String(error), true);
    return;
  }
  cleanupMedia();
  const generation = mediaGeneration;
  el("youtube-host").hidden = false;
  el("empty-view").hidden = true;
  const mount = document.createElement("div");
  el("youtube-host").append(mount);
  status("Loading YouTube reference…");
  button("load-youtube").disabled = true;
  try {
    const player = await createYouTube(
      mount,
      id,
      () => {
        if (generation !== mediaGeneration) return;
        audio.stop();
        anchor = undefined;
        if (youtube && youtube.getDuration() > 0)
          fitDuration(youtube.getDuration());
        if (youtube?.getPlayerState() === 0) finishScene();
      },
      (message) => {
        if (generation !== mediaGeneration) return;
        halt();
        status(message, true);
      },
    );
    if (generation !== mediaGeneration) {
      player.destroy();
      return;
    }
    youtube = player;
    mediaKind = "youtube";
    scene.media = { kind: "youtube", name: id, id };
    fitDuration(player.getDuration());
    history = [clone()];
    el("media-label").textContent = "YouTube · approximate sync";
    changed();
    status("YouTube ready. Use Play scene to enable the sound cues.");
  } catch (error) {
    if (generation === mediaGeneration) {
      cleanupMedia();
      status(String(error), true);
    }
  } finally {
    button("load-youtube").disabled = false;
  }
});
video.addEventListener("ended", () => {
  if (mediaKind === "file") finishScene();
});
button("play").addEventListener("click", () => void play());
button("pause").addEventListener("click", () => {
  halt();
  status("Paused.");
});
button("stop").addEventListener("click", () => {
  halt();
  seek(scene.start);
  status("Stopped at range start.");
});
field("seek").addEventListener("input", () => {
  const was = running();
  halt();
  seek(Number(field("seek").value));
  if (was) void play();
});
function rangeChange(): void {
  halt();
  try {
    const next = validateScene({
      ...scene,
      start: Number(field("range-in").value),
      end: Number(field("range-out").value),
    });
    if (mediaDuration() > 0 && next.end > mediaDuration())
      throw new Error("The scene range must fit inside the video.");
    scene = next;
    changed();
  } catch (error) {
    draw();
    status(String(error), true);
  }
}
for (const id of ["range-in", "range-out"])
  field(id).addEventListener("change", rangeChange);
button("set-in").addEventListener("click", () => {
  field("range-in").value = current().toFixed(2);
  rangeChange();
});
button("set-out").addEventListener("click", () => {
  field("range-out").value = current().toFixed(2);
  rangeChange();
});
field("loop").addEventListener("change", () => {
  scene.loop = field("loop").checked;
  changed();
});
field("scene-name").addEventListener("change", () => {
  scene.name = field("scene-name").value.slice(0, 100);
  changed();
});
for (const [id, key] of [
  ["original-volume", "original"],
  ["effects-volume", "effects"],
] as const) {
  field(id).addEventListener("input", () => {
    scene[key] = Number(field(id).value);
    levels();
    audio.setLevel(scene.effects);
    el(key + "-value").textContent = `${Math.round(scene[key] * 100)}%`;
    save();
  });
  field(id).addEventListener("change", () => {
    history.push(clone());
    if (history.length > 30) history.shift();
    button("undo").disabled = history.length < 2;
  });
}
button("refresh-sources").addEventListener("click", () => {
  sources();
  status("Saved sounds refreshed. Existing cues keep their own patches.");
});
button("add-cue").addEventListener("click", () => {
  const p = patches.get(field("new-source").value);
  if (!p || scene.cues.length >= MAX_CUES) return;
  const c: Cue = {
    id: crypto.randomUUID(),
    name: p.name,
    time: Math.round(Math.min(3600, current()) * 1000) / 1000,
    gain: 0.7,
    muted: false,
    patch: { ...p.patch },
  };
  scene.cues.push(c);
  selected = c.id;
  changed();
});
field("cue-name").addEventListener("change", () =>
  changeCue((c) => (c.name = field("cue-name").value)),
);
field("cue-time").addEventListener("change", () =>
  changeCue((c) => (c.time = Number(field("cue-time").value))),
);
button("cue-to-playhead").addEventListener("click", () =>
  changeCue((c) => (c.time = Math.round(current() * 1000) / 1000)),
);
field("cue-gain").addEventListener("change", () =>
  changeCue((c) => (c.gain = Number(field("cue-gain").value))),
);
field("cue-gain").addEventListener(
  "input",
  () =>
    (el("cue-gain-value").textContent =
      `${Math.round(Number(field("cue-gain").value) * 100)}%`),
);
field("cue-muted").addEventListener("change", () =>
  changeCue((c) => (c.muted = field("cue-muted").checked)),
);
field("cue-source").addEventListener("change", () => {
  const p = patches.get(field("cue-source").value);
  if (p)
    changeCue((c) => {
      c.patch = { ...p.patch };
      c.name = p.name;
    });
});
for (const [id, key] of [
  ["cue-frequency", "frequency"],
  ["cue-duration", "duration"],
  ["cue-release", "release"],
] as const)
  field(id).addEventListener("change", () =>
    changeCue((c) => (c.patch[key] = Number(field(id).value))),
  );
button("delete-cue").addEventListener("click", () => {
  scene.cues = scene.cues.filter((c) => c.id !== selected);
  selected = scene.cues[0]?.id || "";
  changed();
});
button("duplicate").addEventListener("click", () => {
  const c = cue();
  if (!c) return;
  if (scene.cues.length >= MAX_CUES) {
    status("A scene can contain at most 24 cues.", true);
    return;
  }
  const next = {
    ...structuredClone(c),
    id: crypto.randomUUID(),
    time: Math.min(3600, c.time + 0.25),
  };
  scene.cues.push(next);
  selected = next.id;
  changed();
});
button("audition").addEventListener("click", async () => {
  const c = cue();
  if (!c || !ready) return;
  halt();
  const generation = transportGeneration;
  try {
    await audio.unlock();
    if (generation !== transportGeneration) return;
    const data = samples.get(c.id);
    if (!data) return;
    audio.schedule(
      {
        ...scene,
        start: 0,
        end: data.length / SAMPLE_RATE,
        cues: [{ ...c, time: 0, muted: false }],
      },
      samples,
      0,
    );
    status("Auditioning selected cue.");
  } catch (error) {
    status(String(error), true);
  }
});
button("undo").addEventListener("click", () => {
  if (history.length < 2) return;
  halt();
  history.pop();
  scene = structuredClone(history.at(-1)!);
  selected = scene.cues.some((c) => c.id === selected)
    ? selected
    : scene.cues[0]?.id || "";
  save();
  draw();
  void prepare();
});
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
button("save-project").addEventListener("click", () =>
  download(
    new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" }),
    "typeaudio-scene.json",
  ),
);
button("open-project").addEventListener("click", () =>
  field("project-file").click(),
);
field("project-file").addEventListener("change", async () => {
  const file = field("project-file").files?.[0];
  if (!file) return;
  try {
    if (file.size > 100000)
      throw new Error("Scene files must be smaller than 100 KB.");
    const next = validateScene(JSON.parse(await file.text()));
    cleanupMedia();
    scene = next;
    position = scene.start;
    selected = scene.cues[0]?.id || "";
    history = [clone()];
    save();
    draw();
    await prepare();
    if (!ready) return;
    status(
      scene.media.kind === "none"
        ? "Project opened."
        : `Project opened. Re-select the video or load its YouTube reference: ${scene.media.name}`,
    );
    if (scene.media.id)
      field("youtube-url").value =
        `https://www.youtube.com/watch?v=${scene.media.id}`;
  } catch (error) {
    status(`Import failed: ${String(error)}`, true);
  } finally {
    field("project-file").value = "";
  }
});
button("export-wav").addEventListener("click", () => {
  if (!ready) return;
  halt();
  const result = mixScene(scene, samples, SAMPLE_RATE);
  download(
    new Blob([wav(result.pcm, SAMPLE_RATE)], { type: "audio/wav" }),
    "typeaudio-effects.wav",
  );
  status(
    `Exported ${(scene.end - scene.start).toFixed(2)} seconds of effects from ${scene.start.toFixed(2)}s. Original audio is excluded.${result.peak > 1 ? " Overlapping cues clipped; lower Effects level and export again." : ""}`,
  );
});
try {
  const raw = localStorage.getItem(STORE);
  if (raw) scene = validateScene(JSON.parse(raw));
} catch {
  status("The saved scene could not be read. Starting a new scene.", true);
}
if (scene.media.kind !== "none")
  el("media-label").textContent = `Re-select video: ${scene.media.name}`;
if (scene.media.id)
  field("youtube-url").value =
    `https://www.youtube.com/watch?v=${scene.media.id}`;
history = [clone()];
selected = scene.cues[0]?.id || "";
sources();
if (patches.has("designer")) field("new-source").value = "designer";
draw();
void prepare();
tick();
window.addEventListener("storage", (event) => {
  if (
    event.key === "typeaudio.video.designer-patch.v1" ||
    event.key === "typeaudio.designer.saved.v1"
  )
    sources();
});
window.addEventListener("pagehide", (event) => {
  halt();
  if (!event.persisted) {
    disposed = true;
    cancelAnimationFrame(frame);
    cleanupMedia();
    audio.close();
  }
});
