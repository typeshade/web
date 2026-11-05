import { SAMPLE_RATE } from "./designer.ts";
export const MAX_AUDIO_SECONDS = 30;
export const MAX_AUDIO_FRAMES = SAMPLE_RATE * MAX_AUDIO_SECONDS;
export const MAX_LIBRARY_FRAMES = SAMPLE_RATE * 120;
export const MAX_AUDIO_ASSETS = 24;
export const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 40 * 1024 * 1024;
export interface AudioAssetRef {
  id: string;
  name: string;
  frames: number;
}
export interface AudioAsset extends AudioAssetRef {
  pcm: Float32Array;
}
export interface PortableAudio extends AudioAssetRef {
  encoding: "f32le-base64";
  sampleRate: 48000;
  data: string;
}
export function validateAudioRef(value: unknown): AudioAssetRef {
  const v = value as AudioAssetRef;
  if (
    !v ||
    typeof v.id !== "string" ||
    !/^[a-f0-9]{64}$/.test(v.id) ||
    typeof v.name !== "string" ||
    !v.name.length ||
    v.name.length > 100 ||
    !Number.isInteger(v.frames) ||
    v.frames < 480 ||
    v.frames > MAX_AUDIO_FRAMES
  )
    throw new Error(
      "Invalid audio reference. Use audio between 10 ms and 30 seconds.",
    );
  return { id: v.id, name: v.name, frames: v.frames };
}
export function validatePcm(pcm: Float32Array): void {
  if (
    !(pcm instanceof Float32Array) ||
    pcm.length < 480 ||
    pcm.length > MAX_AUDIO_FRAMES ||
    !pcm.every((v) => Number.isFinite(v) && Math.abs(v) <= 16)
  )
    throw new Error(
      "Audio must contain valid samples and last between 10 ms and 30 seconds.",
    );
}
function pcmBytes(pcm: Float32Array): Uint8Array {
  validatePcm(pcm);
  const bytes = new Uint8Array(pcm.length * 4),
    view = new DataView(bytes.buffer);
  for (let i = 0; i < pcm.length; i++) view.setFloat32(i * 4, pcm[i]!, true);
  return bytes;
}
async function digest(bytes: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function makeAudioAsset(
  name: string,
  pcm: Float32Array,
): Promise<AudioAsset> {
  const id = await digest(pcmBytes(pcm));
  return {
    ...validateAudioRef({
      id,
      name: name.slice(0, 100) || "Imported audio",
      frames: pcm.length,
    }),
    pcm,
  };
}
export function packAudio(asset: AudioAsset): PortableAudio {
  const bytes = pcmBytes(asset.pcm);
  let data = "";
  // Chunk conversion avoids an argument-stack overflow on long recordings.
  for (let i = 0; i < bytes.length; i += 24576)
    data += btoa(String.fromCharCode(...bytes.subarray(i, i + 24576)));
  return {
    ...validateAudioRef(asset),
    encoding: "f32le-base64",
    sampleRate: 48000,
    data,
  };
}
export async function unpackAudio(value: unknown): Promise<AudioAsset> {
  const ref = validateAudioRef(value),
    v = value as PortableAudio;
  if (
    v.encoding !== "f32le-base64" ||
    v.sampleRate !== SAMPLE_RATE ||
    typeof v.data !== "string" ||
    v.data.length !== Math.ceil((ref.frames * 4) / 3) * 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(v.data)
  )
    throw new Error("Invalid embedded audio encoding.");
  let binary: string;
  try {
    binary = atob(v.data);
  } catch {
    throw new Error("Invalid embedded audio data.");
  }
  if (binary.length !== ref.frames * 4)
    throw new Error("Embedded audio length does not match its reference.");
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0)),
    view = new DataView(bytes.buffer),
    pcm = new Float32Array(ref.frames);
  for (let i = 0; i < pcm.length; i++) pcm[i] = view.getFloat32(i * 4, true);
  validatePcm(pcm);
  if ((await digest(bytes)) !== ref.id)
    throw new Error("Embedded audio checksum does not match.");
  return { ...ref, pcm };
}
/** Decode all entries before opening a storage transaction or changing the document. */
export async function unpackAudioAssets(
  value: unknown,
  refs: AudioAssetRef[],
): Promise<AudioAsset[]> {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_AUDIO_ASSETS)
    throw new Error("A project supports up to 24 audio assets.");
  let frames = 0;
  const ids = new Set<string>();
  for (const raw of value) {
    const ref = validateAudioRef(raw);
    frames += ref.frames;
    if (
      ids.has(ref.id) ||
      !refs.some((r) => r.id === ref.id && r.frames === ref.frames)
    )
      throw new Error("Embedded audio must match a unique project source.");
    ids.add(ref.id);
  }
  if (frames > MAX_LIBRARY_FRAMES)
    throw new Error("A project can contain up to 120 seconds of source audio.");
  const assets: AudioAsset[] = [];
  for (const raw of value) assets.push(await unpackAudio(raw));
  return assets;
}
