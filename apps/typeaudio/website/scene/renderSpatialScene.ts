import { prepareRoom, prepareRoomSource, RoomMixer } from "typeaudio/spatial/room";
import { cueRange, cueEnvelope, fadeAt, type Scene } from "../video-model.ts";
import { positionAt } from "./positionAt.ts";
import { finishStereo } from "./finishStereo.ts";
import type { StereoScene } from "./types.ts";

/** Bounded offline preparation. The editor, playback and WAV export share this stereo result. */
export function renderSpatialScene(scene: Scene, samples: Map<string, Float32Array>): StereoScene {
  if (!scene.space) throw new Error("This scene has no spatial configuration.");
  const sr = 48000, block = 128, space = scene.space, room = prepareRoom(space.room, sr);
  const cues = scene.cues.filter(c => !c.muted && samples.has(c.id) && c.time < scene.end);
  const frames = Math.round(scene.end * sr) - Math.round(scene.start * sr);
  const outputLeft = new Float32Array(frames), outputRight = new Float32Array(frames);
  if (!cues.length) return { left: outputLeft, right: outputRight, peak: 0 };
  const sources = cues.map(cue => {
    const pcm = samples.get(cue.id)!, range = cueRange(cue, pcm.length / sr);
    return { cue, pcm, range, envelope: cueEnvelope(cue, pcm.length / sr),
      points: cue.space?.points ?? [{ time: 0, ...space.listener.position }] };
  });
  // Sources are <= 60 seconds. This also retains up to 16 seconds of late-field history.
  const origin = Math.round(Math.max(scene.start - 80, Math.min(scene.start, ...cues.map(c => c.time))) * sr);
  const first = Math.round(scene.start * sr) - origin, end = first + frames;
  const mixer = new RoomMixer(room, { capacity: cues.length, maxFrames: block });
  const inputs = cues.map(() => new Float32Array(block));
  const left = new Float32Array(block), right = new Float32Array(block);
  function target(slot: number, age: number) {
    const { cue, points } = sources[slot];
    const prepared = prepareRoomSource(room, space.listener, { position: positionAt(points, age),
      referenceDistance: 1.5, rolloff: .5, airAbsorption: .04, spread: cue.space?.spread ?? 0 });
    const send = cue.space?.send ?? .4;
    mixer.setSource(slot, { ...prepared,
      reflections: prepared.reflections.map(p => ({ ...p, left: p.left * send, right: p.right * send })),
      late: { ...prepared.late, gain: prepared.late.gain * send } });
  }
  sources.forEach((s, i) => target(i, s.range.start));
  for (let at = 0; at < end; at += block) {
    const count = Math.min(block, end - at);
    for (let slot = 0; slot < sources.length; slot++) {
      const { cue, pcm, range, envelope } = sources[slot];
      const local = at + origin - Math.round(cue.time * sr), start = Math.round(range.start * sr);
      const length = Math.round(range.duration * sr);
      if (at % 512 === 0 && local >= 0 && local < length) target(slot, (start + local) / sr);
      for (let i = 0; i < count; i++) {
        const offset = local + i, index = start + offset;
        inputs[slot][i] = offset < 0 || offset >= length ? 0 : pcm[index] * cue.gain * fadeAt(envelope, index / sr);
      }
    }
    mixer.process(inputs, left, right, count);
    for (let i = 0; i < count; i++) {
      const dest = at + i - first;
      if (dest >= 0) { outputLeft[dest] = left[i]; outputRight[dest] = right[i]; }
    }
  }
  if (mixer.invalidSamples || mixer.invalidOutputSamples || mixer.invalidTailSamples)
    throw new Error("Invalid spatial audio. Check source code and levels.");
  return finishStereo(outputLeft, outputRight, space.highpassHz, space.gainDb);
}
