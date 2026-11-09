import type { StereoScene } from "./types.ts";

export function stereoWav(pcm: StereoScene, gain = 1): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + pcm.left.length * 4),
    view = new DataView(buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, 48000, true);
  view.setUint32(28, 192000, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, buffer.byteLength - 44, true);
  for (let i = 0; i < pcm.left.length; i++)
    for (const channel of [0, 1]) {
      const x = Math.max(
        -1,
        Math.min(1, (channel ? pcm.right[i] : pcm.left[i]) * gain),
      );
      view.setInt16(
        44 + i * 4 + channel * 2,
        Math.round(x * (x < 0 ? 32768 : 32767)),
        true,
      );
    }
  return buffer;
}
