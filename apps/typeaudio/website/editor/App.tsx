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
import { useWorkspaceLayout } from "./layout.tsx";
import {
  openContext,
  useInteractions,
  type MenuItem,
} from "./interactions.tsx";
import { SourceRack } from "./components/SourceRack.tsx";
export function App() {
  const layout = useWorkspaceLayout();
  const { openMenu } = useInteractions();
  const e = useEditor(),
    [module, setModule] = useState("source"),
    picture = e.state.workspace === "picture";
  const [selection, setSelection] = useState({ owner: "", id: "base" }),
    owner = e.state.selected || "source";
  const sourceId = selection.owner === owner ? selection.id : "base",
    layer = e.state.patch.layers.find((l) => l.id === sourceId);
  const selectSource = (id: string) => {
    e.endEdit();
    setSelection({ owner, id });
  };
  const sourceEditor = layer
    ? {
        ...e,
        state: { ...e.state, patch: layer.patch },
        patch: (changes: Partial<typeof layer.patch>) =>
          e.editLayer(layer.id, changes),
      }
    : e;
  return (
    <WorkspaceShell editor={e}>
      <main
        id="editor-main"
        tabIndex={-1}
        className={`workspace ${picture ? "picture-workspace" : "sound-workspace"} ${layout.focused ? "viewer-focused" : ""}`}
        data-workspace={e.state.workspace}
      >
        <ProjectPanel editor={e} />
        <Splitter dimension="project" />
        <div
          className="viewer-region"
          onContextMenu={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest(
                "button,input,select,textarea,video,iframe,a",
              )
            )
              return;
            const items: MenuItem[] = picture
              ? [
                  {
                    label: "Import video…",
                    action: () => e.videoInput.current?.click(),
                  },
                ]
              : [
                  {
                    label: "Waveform",
                    checked: !e.spectrum,
                    action: () => e.setSpectrum(false),
                  },
                  {
                    label: "Spectrum",
                    checked: e.spectrum,
                    action: () => e.setSpectrum(true),
                  },
                  {
                    label: "Monitor before FX",
                    checked: e.dry,
                    action: () => e.setDry(!e.dry),
                  },
                  { separator: true },
                  {
                    label: "Render current sound",
                    disabled: e.busy,
                    action: () => {
                      e.setMode("render");
                      void e.render();
                    },
                  },
                  {
                    label: "Export WAV…",
                    disabled: !e.rendered,
                    action: e.exportSound,
                  },
                ];
            openContext(
              event,
              openMenu,
              "viewer",
              picture ? "Composition actions" : "Monitor actions",
              [
                ...items,
                { separator: true },
                {
                  label: "Focus viewer",
                  shortcut: "F",
                  checked: layout.focused,
                  disabled: innerWidth <= 950,
                  action: () => layout.focus(!layout.focused),
                },
              ],
            );
          }}
        >
          <div className="document-view" hidden={picture}>
            <Panel title="Sound / Monitor">
              <SoundMonitor editor={e} />
            </Panel>
          </div>
          <div className="document-view" hidden={!picture}>
            <Composition editor={e} />
          </div>
        </div>
        <Splitter dimension="inspector" />
        <aside className="inspector-region">
          {picture ? (
            <Inspector editor={e} />
          ) : (
            <>
              <SoundEditor
                key={`${owner}-${layer?.id || "base"}`}
                editor={sourceEditor}
                sourceName={layer?.name || "Base source"}
                module={module}
              />
              <SourceRack
                editor={e}
                selected={layer?.id || "base"}
                select={selectSource}
              />
            </>
          )}
        </aside>
        <Splitter dimension="dock" />
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
                  <h3>Tone · {layer?.name || "Base source"}</h3>
                  <TonePad
                    key={`${owner}-${layer?.id || "base"}`}
                    editor={sourceEditor}
                  />
                </div>
                <div>
                  <h3>Variations</h3>
                  <Variations editor={e} />
                </div>
                <div className="sound-summary">
                  <h3>{e.selected ? "Selected layer" : "Source"}</h3>
                  <span>{e.state.patchName}</span>
                  <p>
                    {e.state.patch.layers.length + 1}{" "}
                    {e.state.patch.layers.length ? "layers" : "layer"} ·{" "}
                    {e.state.patch.voices}{" "}
                    {e.state.patch.voices === 1 ? "base voice" : "base voices"}{" "}
                    · {Math.round(e.state.patch.frequency)} Hz
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
