import type { Editor } from "../../../useEditor.ts";

export function RenderControls({ editor: e }: { editor: Editor }) {
  return (
    <>
      <select
        id="backend"
        aria-label="Render backend"
        value={e.backend}
        onChange={(event) =>
          e.setBackend(event.target.value as "cpu" | "webgpu")
        }
      >
        <option value="cpu">CPU</option>
        <option value="webgpu" disabled={e.cpuRenderRequired}>
          WebGPU
        </option>
      </select>
      {e.cpuRenderRequired && (
        <span
          className="render-path-hint"
          data-tooltip="This sound uses the same CPU DSP for Live and Render, including all layers and modulation."
        >
          Live DSP
        </span>
      )}
      <button id="render" disabled={e.busy} onClick={() => void e.render()}>
        Render
      </button>
      <label className="check">
        <input
          id="auto-preview"
          type="checkbox"
          checked={e.auto}
          onChange={(event) => e.setAuto(event.target.checked)}
        />
        Auto
      </label>
      <label className="check">
        <input
          id="render-loop"
          type="checkbox"
          checked={e.renderLoop}
          onChange={(event) => e.setRenderLoop(event.target.checked)}
        />
        Loop
      </label>
    </>
  );
}
