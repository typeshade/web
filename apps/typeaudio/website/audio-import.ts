import { SAMPLE_RATE } from "./designer.ts";
import {
  MAX_AUDIO_FILE_BYTES,
  MAX_AUDIO_SECONDS,
  makeAudioAsset,
  type AudioAsset,
} from "./audio-asset.ts";
/** Inspect duration before allocating decoded PCM for a compressed file. */
async function audioDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file),
    audio = document.createElement("audio");
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Audio metadata timed out. Try a WAV file.")),
        15000,
      );
      audio.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve(audio.duration);
      };
      audio.onerror = () => {
        clearTimeout(timer);
        reject(
          new Error(
            "This browser could not read the audio file. Try WAV, MP3, Ogg or FLAC.",
          ),
        );
      };
      audio.preload = "metadata";
      audio.src = url;
    });
  } finally {
    audio.onloadedmetadata = null;
    audio.onerror = null;
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  }
}
export async function decodeAudioFile(file: File): Promise<AudioAsset> {
  if (!file.size || file.size > MAX_AUDIO_FILE_BYTES)
    throw new Error("Choose an audio file no larger than 25 MB.");
  const duration = await audioDuration(file);
  if (
    !Number.isFinite(duration) ||
    duration < 0.01 ||
    duration > MAX_AUDIO_SECONDS + 0.001
  )
    throw new Error(
      "Choose audio between 10 ms and 30 seconds. Trim longer recordings before importing.",
    );
  const context = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error(
      "This browser could not decode the audio. Try a PCM WAV file.",
    );
  }
  if (buffer.numberOfChannels > 2)
    throw new Error(
      "Use mono or stereo audio. Multichannel recordings are not supported.",
    );
  const pcm = buffer.getChannelData(0).slice();
  if (buffer.numberOfChannels === 2) {
    const right = buffer.getChannelData(1);
    for (let i = 0; i < pcm.length; i++) pcm[i] = (pcm[i]! + right[i]!) * 0.5;
  }
  return makeAudioAsset(file.name, pcm);
}
