import type { StereoScene } from "./types.ts";

/** Offline stereo delivery filtering and static trim. No automatic normalization. */
export function finishStereo(left: Float32Array, right: Float32Array, hz: number, gainDb: number): StereoScene {
  const omega = 2 * Math.PI * hz / 48000, cosine = Math.cos(omega), alpha = Math.sin(omega) / Math.SQRT2;
  const a0 = 1 + alpha, b0 = (1 + cosine) / (2 * a0), b1 = -(1 + cosine) / a0, b2 = b0;
  const a1 = -2 * cosine / a0, a2 = (1 - alpha) / a0, gain = 10 ** (gainDb / 20);
  let peak = 0;
  for (const channel of [left, right]) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < channel.length; i++) {
      const x = channel[i], y = hz === 0 ? x : b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      channel[i] = y * gain * Math.min(1, i / 480, (channel.length - 1 - i) / 2400);
      if (!Number.isFinite(channel[i])) throw new Error("Non-finite room output.");
      peak = Math.max(peak, Math.abs(channel[i]));
    }
  }
  return { left, right, peak };
}
