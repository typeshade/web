import { SAMPLE_RATE, validatePatch, type Patch } from "./designer.ts";
import {
  MAX_LIBRARY_FRAMES,
  validateAudioRef,
  type AudioAssetRef,
} from "./audio-asset.ts";
export const MAX_CUES = 24;
export interface Cue {
  id: string;
  name: string;
  time: number;
  gain: number;
  muted: boolean;
  patch: Patch;
  audio?: AudioAssetRef;
  sourceIn?: number;
  sourceOut?: number | null;
  fadeIn?: number;
  fadeOut?: number;
  /** Original source range whose fades survive a non-destructive split. */
  fadeAnchor?: [number, number];
}
export interface Scene {
  version: 1;
  name: string;
  media: { kind: "none" | "file" | "youtube"; name: string; id?: string };
  start: number;
  end: number;
  loop: boolean;
  original: number;
  effects: number;
  cues: Cue[];
}
export const emptyScene = (): Scene => ({
  version: 1,
  name: "Untitled scene",
  media: { kind: "none", name: "" },
  start: 0,
  end: 10,
  loop: true,
  original: 0.5,
  effects: 0.7,
  cues: [],
});
function number(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Expected a number between ${min} and ${max}.`);
  return value;
}
function label(value: unknown): string {
  if (typeof value !== "string" || value.length > 100)
    throw new Error("Names must be at most 100 characters.");
  return value;
}
export function youtubeId(value: string): string {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Enter a YouTube video URL.");
  let id: string | null = null;
  if (["youtu.be", "www.youtu.be"].includes(url.hostname))
    id = url.pathname.slice(1);
  else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "www.youtube-nocookie.com",
    ].includes(url.hostname)
  ) {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1] ?? null);
  }
  if (!id || !/^[-\w]{11}$/.test(id))
    throw new Error("Use a YouTube watch, Shorts or share URL for one video.");
  return id;
}
export function validateScene(raw: unknown): Scene {
  if (!raw || typeof raw !== "object") throw new Error("Invalid scene.");
  const s = raw as Scene;
  if (s.version !== 1 || !Array.isArray(s.cues) || s.cues.length > MAX_CUES)
    throw new Error("Use a version-1 scene with at most 24 cues.");
  if (!s.media || !["none", "file", "youtube"].includes(s.media.kind))
    throw new Error("Invalid media reference.");
  const media: Scene["media"] = {
    kind: s.media.kind,
    name: label(s.media.name),
  };
  if (media.kind === "youtube") {
    if (typeof s.media.id !== "string" || !/^[-\w]{11}$/.test(s.media.id))
      throw new Error("Invalid YouTube ID.");
    media.id = s.media.id;
  }
  const start = number(s.start, 0, 3600),
    end = number(s.end, 0.05, 3600);
  if (end <= start || end - start > 60)
    throw new Error(
      "Choose a scene range longer than zero and no longer than 60 seconds.",
    );
  if (typeof s.loop !== "boolean") throw new Error("Invalid loop setting.");
  const ids = new Set<string>();
  const audioFrames = new Map<string, number>();
  const cues = s.cues.map((c) => {
    if (
      !c ||
      typeof c.id !== "string" ||
      !/^[-\w]{1,50}$/.test(c.id) ||
      ids.has(c.id) ||
      typeof c.muted !== "boolean"
    )
      throw new Error("Invalid or duplicate cue.");
    ids.add(c.id);
    const cue: Cue = {
      id: c.id,
      name: label(c.name),
      time: number(c.time, 0, 3600),
      gain: number(c.gain, 0, 1),
      muted: c.muted,
      patch: validatePatch(c.patch),
    };
    if (c.audio !== undefined) {
      cue.audio = validateAudioRef(c.audio);
      const frames = audioFrames.get(cue.audio.id);
      if (frames !== undefined && frames !== cue.audio.frames)
        throw new Error("Audio source references disagree about their length.");
      audioFrames.set(cue.audio.id, cue.audio.frames);
    }
    if (c.sourceIn !== undefined) cue.sourceIn = number(c.sourceIn, 0, 60);
    if (c.sourceOut !== undefined)
      cue.sourceOut = c.sourceOut === null ? null : number(c.sourceOut, 0, 60);
    if (cue.sourceOut != null && cue.sourceOut <= (cue.sourceIn ?? 0))
      throw new Error("Source out must be after source in.");
    if (c.fadeIn !== undefined) cue.fadeIn = number(c.fadeIn, 0, 60);
    if (c.fadeOut !== undefined) cue.fadeOut = number(c.fadeOut, 0, 60);
    if (c.fadeAnchor !== undefined) {
      if (!Array.isArray(c.fadeAnchor) || c.fadeAnchor.length !== 2)
        throw new Error("Invalid fade anchor.");
      const start = number(c.fadeAnchor[0], 0, 60),
        end = number(c.fadeAnchor[1], 0, 60);
      if (end <= start) throw new Error("Invalid fade anchor range.");
      cue.fadeAnchor = [start, end];
    }
    return cue;
  });
  if ([...audioFrames.values()].reduce((n, v) => n + v, 0) > MAX_LIBRARY_FRAMES)
    throw new Error("A project can contain up to 120 seconds of source audio.");
  return {
    version: 1,
    name: label(s.name),
    media,
    start,
    end,
    loop: s.loop,
    original: number(s.original, 0, 1),
    effects: number(s.effects, 0, 1),
    cues,
  };
}
/** Source and timeline edits are rounded to the PCM sample clock. */
export function cueRange(cue: Cue, duration: number, rate = SAMPLE_RATE) {
  const total = Math.round(duration * rate),
    start = Math.min(
      total,
      Math.max(0, Math.round((cue.sourceIn ?? 0) * rate)),
    ),
    end = Math.max(
      start,
      Math.min(total, Math.round((cue.sourceOut ?? duration) * rate)),
    );
  return {
    start: start / rate,
    end: end / rate,
    duration: (end - start) / rate,
  };
}
export interface FadeEnvelope {
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
}
export function cueEnvelope(
  cue: Cue,
  duration: number,
  rate = SAMPLE_RATE,
): FadeEnvelope {
  const range = cueRange(cue, duration, rate);
  return {
    start: cue.fadeAnchor?.[0] ?? range.start,
    end: cue.fadeAnchor?.[1] ?? range.end,
    fadeIn: cue.fadeIn ?? 0,
    fadeOut: cue.fadeOut ?? 0,
  };
}
export function fadeAt(envelope: FadeEnvelope, time: number): number {
  return Math.max(
    0,
    Math.min(
      1,
      envelope.fadeIn ? (time - envelope.start) / envelope.fadeIn : 1,
      envelope.fadeOut ? (envelope.end - time) / envelope.fadeOut : 1,
    ),
  );
}
/** Linear breakpoints for AudioParam scheduling; the same envelope is used by WAV. */
export function fadePoints(envelope: FadeEnvelope, from: number, to: number) {
  const e = envelope;
  const times = [
    from,
    to,
    e.start,
    e.start + e.fadeIn,
    e.end - e.fadeOut,
    e.end,
  ];
  if (e.fadeIn && e.fadeOut)
    times.push(
      (e.fadeIn * e.end + e.fadeOut * e.start) / (e.fadeIn + e.fadeOut),
    );
  return [...new Set(times.filter((t) => t >= from && t <= to))]
    .sort((a, b) => a - b)
    .map((time) => ({ time, value: fadeAt(e, time) }));
}
/** Used by both preview and WAV export, including seeking into a trimmed clip. */
export function cueWindow(
  cue: Cue,
  duration: number,
  from: number,
  to: number,
  rate = SAMPLE_RATE,
): { at: number; offset: number; duration: number } | undefined {
  const range = cueRange(cue, duration, rate),
    begin = Math.round(cue.time * rate),
    at = Math.max(Math.round(from * rate), begin),
    end = Math.min(
      Math.round(to * rate),
      begin + Math.round(range.duration * rate),
    );
  if (cue.muted || end <= at) return;
  return {
    at: at / rate,
    offset: range.start + (at - begin) / rate,
    duration: (end - at) / rate,
  };
}
export function mixScene(
  scene: Scene,
  samples: Map<string, Float32Array>,
  rate: number,
): { pcm: Float32Array; peak: number } {
  const origin = Math.round(scene.start * rate),
    pcm = new Float32Array(Math.round(scene.end * rate) - origin);
  for (const cue of scene.cues) {
    const data = samples.get(cue.id);
    if (!data || cue.muted) continue;
    const range = cueRange(cue, data.length / rate, rate),
      start = Math.round(range.start * rate),
      length = Math.round(range.duration * rate),
      shift = Math.round(cue.time * rate) - origin,
      gain = cue.gain * scene.effects,
      envelope = cueEnvelope(cue, data.length / rate, rate);
    for (let i = Math.max(0, -shift); i < length && i + shift < pcm.length; i++)
      pcm[i + shift]! +=
        data[start + i]! * gain * fadeAt(envelope, (start + i) / rate);
  }
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    peak = Math.max(peak, Math.abs(pcm[i]!));
    pcm[i] = Math.max(-1, Math.min(1, pcm[i]!));
  }
  return { pcm, peak };
}
