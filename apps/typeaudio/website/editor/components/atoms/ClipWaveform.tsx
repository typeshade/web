import { useEffect, useRef } from "react";
/** Real PCM peaks; no synthetic placeholder waveforms. */
export function ClipWaveform({
  samples,
  offset = 0,
  frames,
}: {
  samples?: Float32Array;
  offset?: number;
  frames?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const g = canvas.getContext("2d")!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (!samples) return;
    g.strokeStyle = "#c8d5e6";
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      let peak = 0;
      const a = Math.floor(
          offset +
            (Math.min(samples.length - offset, frames ?? samples.length) * x) /
              canvas.width,
        ),
        b = Math.floor(
          offset +
            (Math.min(samples.length - offset, frames ?? samples.length) *
              (x + 1)) /
              canvas.width,
        );
      for (let i = a; i < b; i += Math.max(1, Math.floor((b - a) / 30)))
        peak = Math.max(peak, Math.abs(samples[i] || 0));
      const height = Math.min(1, peak) * canvas.height * 0.46;
      g.moveTo(x, canvas.height / 2 - height);
      g.lineTo(x, canvas.height / 2 + height);
    }
    g.stroke();
  }, [samples, offset, frames]);
  return <canvas ref={ref} width={700} height={50} aria-hidden="true" />;
}
