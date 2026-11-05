import { useEffect, useRef } from "react";
import type { Editor } from "../useEditor.ts";
import { SAMPLE_RATE, spectrum as fft } from "../../designer.ts";
/** Real PCM peaks; no synthetic placeholder waveforms. */
export function ClipWaveform({
  samples,
  offset = 0,
}: {
  samples?: Float32Array;
  offset?: number;
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
          offset + ((samples.length - offset) * x) / canvas.width,
        ),
        b = Math.floor(
          offset + ((samples.length - offset) * (x + 1)) / canvas.width,
        );
      for (let i = a; i < b; i += Math.max(1, Math.floor((b - a) / 30)))
        peak = Math.max(peak, Math.abs(samples[i] || 0));
      const height = Math.min(1, peak) * canvas.height * 0.46;
      g.moveTo(x, canvas.height / 2 - height);
      g.lineTo(x, canvas.height / 2 + height);
    }
    g.stroke();
  }, [samples, offset]);
  return <canvas ref={ref} width={700} height={50} aria-hidden="true" />;
}
export function SoundMonitor({ editor: e }: { editor: Editor }) {
  const ref = useRef<HTMLCanvasElement>(null),
    peak = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    if (e.state.workspace !== "sound") return;
    let frame = 0;
    const canvas = ref.current!,
      g = canvas.getContext("2d")!;
    function draw() {
      const live = e.sound.live?.trace();
      const pcm = e.rendered
        ? e.dry
          ? e.rendered.dry
          : e.rendered.wet
        : undefined;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.strokeStyle = "#7da7dc";
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= canvas.width; x += 50) {
        g.moveTo(x, 0);
        g.lineTo(x, canvas.height);
      }
      for (let y = 0; y <= canvas.height; y += 50) {
        g.moveTo(0, y);
        g.lineTo(canvas.width, y);
      }
      g.strokeStyle = "#303238";
      g.stroke();
      g.beginPath();
      g.strokeStyle = "#9dbff4";
      g.lineWidth = 1.5;
      const data = e.spectrum
        ? live?.bins || (pcm ? fft(pcm) : undefined)
        : live?.wave || pcm;
      if (data) {
        let max = 0;
        for (let x = 0; x < canvas.width; x++) {
          const i = Math.min(
            data.length - 1,
            Math.floor((x / canvas.width) * data.length),
          );
          const value = data[i] || 0;
          max = Math.max(max, Math.abs(value));
          const y = e.spectrum
            ? canvas.height *
              (1 - Math.max(0, Math.min(1, (value + 100) / 100)))
            : canvas.height / 2 - value * canvas.height * 0.45;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        if (peak.current && !e.spectrum)
          peak.current.textContent = max.toFixed(3);
      } else {
        if (peak.current) peak.current.textContent = "0.000";
        g.moveTo(0, canvas.height / 2);
        g.lineTo(canvas.width, canvas.height / 2);
      }
      g.stroke();
      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frame);
  }, [e.sound, e.rendered, e.dry, e.spectrum, e.state.workspace]);
  return (
    <div className="sound-view">
      <div className="viewer-toolbar">
        <div className="segmented">
          <button
            data-view="wave"
            aria-pressed={!e.spectrum}
            onClick={() => e.setSpectrum(false)}
          >
            Waveform
          </button>
          <button
            data-view="spectrum"
            aria-pressed={e.spectrum}
            onClick={() => e.setSpectrum(true)}
          >
            Spectrum
          </button>
        </div>
        <span className="mono">
          {e.live ? "LIVE" : e.rendered ? "RENDERED" : "NO SIGNAL"}
        </span>
      </div>
      <div className="signal-canvas">
        <canvas
          id="waveform"
          ref={ref}
          width={1200}
          height={350}
          role="img"
          aria-label={
            e.spectrum ? "Audio frequency spectrum" : "Audio waveform"
          }
        />
        {!e.live && !e.rendered && (
          <div className="viewer-empty">
            <IconNote />
            <strong>Start with a sound</strong>
            <span>Select a preset, then press Play.</span>
            <button className="primary" onClick={() => void e.startLive()}>
              Start live audio
            </button>
          </div>
        )}
      </div>
      <div className="axis mono">
        <span>{e.spectrum ? "20 Hz" : "0 s"}</span>
        <span>{e.spectrum ? "FREQUENCY / dB" : "AMPLITUDE"}</span>
        <span>
          {e.spectrum
            ? "24 kHz"
            : `${e.rendered ? ((e.dry ? e.rendered.dry : e.rendered.wet).length / SAMPLE_RATE).toFixed(2) + " s" : "48 kHz"}`}
        </span>
      </div>
      <div className="monitor-footer">
        <div className="segmented">
          <button
            id="monitor-dry"
            aria-pressed={e.dry}
            onClick={() => e.setDry(true)}
          >
            Before FX
          </button>
          <button
            id="monitor-wet"
            aria-pressed={!e.dry}
            onClick={() => e.setDry(false)}
          >
            After FX
          </button>
        </div>
        <span>
          Peak{" "}
          <output id="metric-peak" ref={peak}>
            0.000
          </output>
        </span>
        <span id="metric-backend">
          {e.live
            ? "CPU live"
            : e.rendered?.tier === "webgpu"
              ? "WebGPU"
              : e.rendered
                ? "CPU"
                : "—"}
        </span>
      </div>
      <details className="execution">
        <summary>Execution report</summary>
        <pre>
          {e.rendered?.report ||
            "Live audio runs continuously on the CPU audio thread. Render prepares a finite CPU or WebGPU clip; live modulation is excluded from its WAV."}
        </pre>
      </details>
    </div>
  );
}
function IconNote() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
    >
      <path d="M4 22h5l3-12 5 26 5-31 5 31 5-26 3 12h5" />
    </svg>
  );
}
