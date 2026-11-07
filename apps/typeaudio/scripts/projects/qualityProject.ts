import { functionPatch } from '../../website/functions/initialFunctions.ts';
import { validateScene } from '../../website/video-model.ts';
import { encodeProject } from '../../website/project/encodeProject.ts';
import type { SceneSpace } from '../../website/scene/types.ts';

interface Candidate {
  schema: string; version: number; id: string; sourceSha256: string; duration: number;
  picture: { youtubeId: string; start: number; end: number };
  sourceProfile: { sampleRate: number; volume: number; onsetFadeFrames: number; endFadeFrames: number };
  space: SceneSpace & { position: { x: number; y: number; z: number }; spread: number; send: number };
}

/** Preserve the engine pilot's source, duration, reference range and room in the existing v3 format. */
export function qualityProject(raw: unknown, source: unknown) {
  const candidate = raw as Candidate;
  if (!candidate || candidate.schema !== 'typeaudio.quality-candidate' || candidate.version !== 1 ||
      !/^[a-z][a-z0-9-]{0,63}$/.test(candidate.id) || !/^[a-f0-9]{64}$/.test(candidate.sourceSha256) ||
      !Number.isFinite(candidate.duration) || candidate.duration < 0.1 || candidate.duration > 10 ||
      !candidate.picture || Math.abs(candidate.picture.end - candidate.picture.start - candidate.duration) > 1e-6 ||
      candidate.sourceProfile?.sampleRate !== 48000 || candidate.sourceProfile?.volume !== 1 ||
      candidate.sourceProfile?.onsetFadeFrames !== 240 || candidate.sourceProfile?.endFadeFrames !== 1440)
    throw new Error('Use a version-1 quality candidate with the supported 48 kHz source profile.');
  const patch = { ...functionPatch(source), duration: candidate.duration, volume: 1 };
  const name = `Column impact · ${candidate.id}`;
  const scene = validateScene({
    version: 1, name, media: { kind: 'youtube', name: 'Frieren sound-design reference', id: candidate.picture.youtubeId },
    start: candidate.picture.start, end: candidate.picture.end, original: 0, effects: 1, loop: false,
    cues: [{ id: 'column-impact', name, time: candidate.picture.start, gain: 1, muted: false, patch,
      space: { points: [{ time: 0, ...candidate.space.position }], spread: candidate.space.spread, send: candidate.space.send } }],
    space: { room: candidate.space.room, listener: candidate.space.listener, gainDb: 0, highpassHz: 0 },
    origin: { id: `quality-${candidate.id}`, revision: candidate.sourceSha256, author: 'TypeAudio sound-design agent',
      notes: 'Editable procedural candidate. Human listening review is pending. YouTube alignment is approximate. Contact, body modes and fragments remain editable TypeShade functions. Evaluation evidence is stored with the source run.' },
  });
  return encodeProject(scene, [], { source: { name, patch }, drafts: {}, selected: 'column-impact', selection: ['column-impact'] });
}
