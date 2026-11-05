import { useState } from "react";
import { useEditor } from "./useEditor.ts";
import { WorkspaceShell } from "./components/WorkspaceShell.tsx";
import { ProjectPanel } from "./components/ProjectPanel.tsx";
import { SoundMonitor } from "./components/Waveform.tsx";
import { Panel, Splitter } from "./components/Panel.tsx";
import {
  MODULES,
  SoundEditor,
  TonePad,
  Variations,
} from "./components/SoundEditor.tsx";
import { Composition } from "./components/Composition.tsx";
import { Timeline } from "./components/Timeline.tsx";
import { Inspector } from "./components/Inspector.tsx";
export function App() {
  const e = useEditor(),
    [module, setModule] = useState("source"),
    picture = e.state.workspace === "picture";
  return (
    <WorkspaceShell editor={e}>
      <main
        id="editor-main"
        className={`workspace ${picture ? "picture-workspace" : "sound-workspace"}`}
        data-workspace={e.state.workspace}
      >
        <ProjectPanel editor={e} />
        <Splitter axis="x" variable="--project-width" min={170} max={380} />
        <div className="viewer-region">
          <div className="document-view" hidden={picture}>
            <Panel title="Sound / Monitor">
              <SoundMonitor editor={e} />
            </Panel>
          </div>
          <div className="document-view" hidden={!picture}>
            <Composition editor={e} />
          </div>
        </div>
        <aside className="inspector-region">
          {picture ? (
            <Inspector editor={e} />
          ) : (
            <>
              <SoundEditor editor={e} module={module} />
              <Panel title="Sound controls" className="utility-panel">
                <button
                  onClick={() =>
                    e.patch({ ...e.presets.warm.patch }, "Warm lead")
                  }
                >
                  Reset sound
                </button>
                <p className="panel-hint">
                  {e.selected
                    ? "Editing the selected timeline layer."
                    : "Choose a module below to edit its parameters."}
                </p>
                <p className="panel-hint">
                  Live processing uses the CPU audio thread. Render exports a
                  finite CPU or WebGPU clip.
                </p>
              </Panel>
            </>
          )}
        </aside>
        <Splitter axis="y" variable="--timeline-height" min={190} max={480} />
        <div className="dock-region">
          {picture ? (
            <Timeline editor={e} />
          ) : (
            <Panel title="Signal chain" className="sound-dock">
              <div
                className="signal-modules"
                role="group"
                aria-label="Sound modules"
              >
                {MODULES.map((m, i) => (
                  <button
                    key={m.id}
                    data-module={m.id}
                    aria-pressed={module === m.id}
                    onClick={() => setModule(m.id)}
                  >
                    <small>{String(i + 1).padStart(2, "0")}</small>
                    {m.name}
                    <span>›</span>
                  </button>
                ))}
              </div>
              <div className="sound-dock-controls">
                <div>
                  <h3>Tone</h3>
                  <TonePad editor={e} />
                </div>
                <div>
                  <h3>Variations</h3>
                  <Variations editor={e} />
                </div>
                <div className="sound-summary">
                  <h3>Source</h3>
                  <span>{e.state.patchName}</span>
                  <p>
                    {e.state.patch.voices} voices ·{" "}
                    {Math.round(e.state.patch.frequency)} Hz
                  </p>
                  <p>
                    Hold {e.state.patch.duration.toFixed(2)} s / Release{" "}
                    {e.state.patch.release.toFixed(2)} s
                  </p>
                  <button
                    onClick={() => {
                      e.workspace("picture");
                      if (!e.selected) e.addCue();
                    }}
                  >
                    Add to composition
                  </button>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </main>
    </WorkspaceShell>
  );
}
