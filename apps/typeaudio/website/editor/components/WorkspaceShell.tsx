import { useEffect, useRef, type ReactNode } from "react";
import type { Editor } from "../useEditor.ts";
import { download } from "../model.ts";
import { Icon } from "./Panel.tsx";
import { useInteractions, type MenuItem } from "../interactions.tsx";
import { useWorkspaceLayout } from "../layout.tsx";
export function WorkspaceShell({
  editor: e,
  children,
}: {
  editor: Editor;
  children: ReactNode;
}) {
  const file = useRef<HTMLInputElement>(null),
    menus = useInteractions(),
    layout = useWorkspaceLayout();
  const picture = e.state.workspace === "picture";
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        (event.target instanceof HTMLElement &&
          event.target.closest('[role="menu"]') &&
          !event.ctrlKey &&
          !event.metaKey)
      )
        return;
      const target =
        event.target instanceof HTMLElement
          ? event.target.closest("input,textarea,select,[contenteditable=true]")
          : null;
      const editable =
        !!target &&
        !(
          target instanceof HTMLInputElement &&
          ["range", "checkbox"].includes(target.type)
        );
      if (editable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? e.redo() : e.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        picture ? save() : e.savePatch();
        return;
      }
      if (picture && (event.ctrlKey || event.metaKey)) {
        if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          e.dispatch({
            type: "selectMany",
            ids: e.state.scene.cues.map((c) => c.id),
          });
          return;
        }
        if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          event.shiftKey ? e.splitClips() : e.duplicate();
          return;
        }
      }
      if (event.code === "Space") {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(
            'button:not([data-cue]),input[type="checkbox"],summary',
          )
        )
          return;
        if (event.repeat || (!picture && e.busy)) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        if (picture) {
          if (e.playing) e.stopScene();
          else void e.playScene();
        } else if (e.mode === "live") {
          if (e.live) e.stopSound();
          else void e.startLive();
        } else if (e.rendered)
          void e.sound.play(
            e.dry ? e.rendered.dry : e.rendered.wet,
            e.renderLoop,
            () => e.setNotice("Playback finished."),
          );
        return;
      }
      if (
        picture &&
        ["Delete", "Backspace"].includes(event.key) &&
        e.selected
      ) {
        event.preventDefault();
        e.deleteCue();
      }
      if (event.key === "Escape" && layout.focused) {
        layout.focus(false);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === "f" && innerWidth > 950) {
        event.preventDefault();
        layout.focus(!layout.focused);
        return;
      }
      if (event.key.toLowerCase() === "v")
        e.dispatch({ type: "tool", tool: "select" });
      if (event.key.toLowerCase() === "h")
        e.dispatch({ type: "tool", tool: "hand" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  function save() {
    download(
      new Blob([JSON.stringify(e.state.scene, null, 2)], {
        type: "application/json",
      }),
      "typeaudio-scene.json",
    );
    menus.closeMenu();
  }
  function showMenu(name: "File" | "Edit" | "Window", origin: HTMLElement) {
    if (menus.menuKey === name) {
      menus.closeMenu();
      return;
    }
    const key = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";
    const items: MenuItem[] =
      name === "File"
        ? [
            {
              label: "New sound",
              action: e.newSound,
            },
            {
              label: "Open project…",
              id: "open-project",
              action: () => file.current?.click(),
            },
            {
              label: "Export project…",
              id: "save-project",
              shortcut: `${key} S`,
              action: save,
            },
            { separator: true },
            {
              label: "Import video…",
              action: () => e.videoInput.current?.click(),
            },
            {
              label: "Import sound…",
              action: () => e.patchInput.current?.click(),
            },
          ]
        : name === "Edit"
          ? [
              {
                label: "Undo",
                shortcut: `${key} Z`,
                disabled: !e.state.past.length && !e.state.checkpoint,
                action: e.undo,
              },
              {
                label: "Redo",
                shortcut: `${key} Shift Z`,
                disabled: !e.state.future.length,
                action: e.redo,
              },
              { separator: true },
              {
                label: "Split at playhead",
                shortcut: `${key} Shift D`,
                disabled: !e.selected,
                action: () => e.splitClips(),
              },
              {
                label: "Select all layers",
                shortcut: `${key} A`,
                disabled: !e.state.scene.cues.length,
                action: () =>
                  e.dispatch({
                    type: "selectMany",
                    ids: e.state.scene.cues.map((c) => c.id),
                  }),
              },
              {
                label:
                  e.selectedIds.length > 1
                    ? "Duplicate selected layers"
                    : "Duplicate layer",
                shortcut: `${key} D`,
                disabled:
                  !e.selected ||
                  e.state.scene.cues.length + e.selectedIds.length > 24,
                action: e.duplicate,
              },
              {
                label:
                  e.selectedIds.length > 1
                    ? "Delete selected layers"
                    : "Delete layer",
                shortcut: "Delete",
                disabled: !e.selected,
                danger: true,
                action: e.deleteCue,
              },
            ]
          : [
              {
                label: "Focus viewer",
                shortcut: "F",
                disabled: innerWidth <= 950,
                checked: layout.focused,
                action: () => layout.focus(!layout.focused),
              },
              { separator: true },
              { label: "Reset layout", action: layout.reset },
            ];
    const rect = origin.getBoundingClientRect();
    menus.openMenu(
      name,
      `${name} menu`,
      items,
      { x: rect.left, y: rect.bottom + 4 },
      origin,
    );
  }
  return (
    <div className="studio-app">
      <a className="skip" href="#editor-main">
        Skip to workspace
      </a>
      <header className="app-menubar">
        <a
          href="/"
          className="app-brand"
          onClick={(event) => {
            event.preventDefault();
            e.workspace("sound");
          }}
        >
          <img src="/icon.png" width="22" height="22" alt="" />
          <span>TypeAudio</span>
        </a>
        {(["File", "Edit", "Window"] as const).map((name) => (
          <button
            key={name}
            aria-haspopup="menu"
            aria-expanded={menus.menuKey === name}
            onClick={(event) => showMenu(name, event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                showMenu(name, event.currentTarget);
              }
            }}
          >
            {name}
          </button>
        ))}
        <button
          id="undo"
          data-tooltip="Undo the last document edit (Ctrl/Cmd Z)."
          disabled={!e.state.past.length && !e.state.checkpoint}
          onClick={e.undo}
        >
          Undo
        </button>
        <button
          id="redo"
          data-tooltip="Redo the last undone edit (Ctrl/Cmd Shift Z)."
          disabled={!e.state.future.length}
          onClick={e.redo}
        >
          Redo
        </button>
        <div className="workspace-tabs" role="group" aria-label="Workspace">
          <button aria-pressed={!picture} onClick={() => e.workspace("sound")}>
            Sound
          </button>
          <button aria-pressed={picture} onClick={() => e.workspace("picture")}>
            Picture
          </button>
        </div>
        <button
          className="quiet reset-layout"
          data-tooltip="Restore default panel sizes and show all panels."
          onClick={layout.reset}
        >
          Reset layout
        </button>
        <button
          className="quiet viewer-focus-toggle"
          aria-pressed={layout.focused}
          data-tooltip="Maximize the viewer and restore panels with F."
          onClick={() => layout.focus(!layout.focused)}
        >
          {layout.focused ? "Restore panels" : "Focus viewer"}
        </button>
        <a
          className="help-link"
          href="/docs/architecture/"
          target="_blank"
          rel="noopener"
        >
          Help
        </a>
      </header>
      <input
        ref={file}
        id="project-file"
        type="file"
        accept=".json"
        hidden
        onChange={(event) => {
          const f = event.target.files?.[0];
          if (f) {
            e.workspace("picture");
            void e.openProject(f);
          }
          event.target.value = "";
        }}
      />
      <div className="document-bar">
        <div className="document-tab">
          <Icon name={picture ? "film" : "sound"} />
          {picture ? (
            <input
              id="scene-name"
              aria-label="Project name"
              value={e.state.scene.name}
              maxLength={100}
              onChange={(event) => {
                const name = event.target.value;
                e.scene((current) => ({ ...current, name }));
              }}
            />
          ) : (
            <span>
              {e.state.patchName}
              {e.selected ? " / Selected layer" : ""}
            </span>
          )}
          <span className="document-dot" title="Saved in this browser" />
        </div>
        <span className="document-status">
          {picture ? "Composition" : "Sound source"} ·{" "}
          {e.selected ? "Linked layer" : "Local project"}
        </span>
      </div>
      <div className="options-bar">
        <div className="transport-buttons">
          {picture ? (
            <>
              <button
                id="play"
                className="icon-button"
                aria-label="Play composition"
                disabled={!e.ready}
                onClick={() => void e.playScene()}
              >
                <Icon name="play" />
              </button>
              <button
                id="pause"
                className="icon-button"
                aria-label="Pause composition"
                onClick={e.stopScene}
              >
                <Icon name="pause" />
              </button>
              <button
                id="stop"
                className="icon-button"
                aria-label="Stop composition"
                onClick={() => {
                  e.stopScene();
                  e.seek(e.state.scene.start);
                }}
              >
                <Icon name="stop" />
              </button>
              <output className="timecode">{e.position.toFixed(3)} s</output>
            </>
          ) : (
            <>
              <button
                id="live-start"
                className={`icon-button ${e.live ? "active" : ""}`}
                aria-label={
                  e.mode === "live" ? "Start live audio" : "Play rendered audio"
                }
                disabled={e.busy || (e.mode === "render" && !e.rendered)}
                onClick={() => {
                  if (e.mode === "live") void e.startLive();
                  else if (e.rendered)
                    void e.sound.play(
                      e.dry ? e.rendered.dry : e.rendered.wet,
                      e.renderLoop,
                      () => e.setNotice("Playback finished."),
                    );
                }}
              >
                <Icon name="play" />
              </button>
              <button
                id="live-stop"
                className="icon-button"
                aria-label="Stop audio"
                onClick={() => {
                  e.stopSound();
                  e.setNotice("Audio stopped.");
                }}
              >
                <Icon name="stop" />
              </button>
              <button
                id="live-retrigger"
                disabled={!e.live}
                onClick={() => e.sound.live?.retrigger()}
              >
                Retrigger
              </button>
              <label className="check">
                <input
                  id="live-repeat"
                  type="checkbox"
                  checked={e.repeat}
                  onChange={(event) => e.setRepeat(event.target.checked)}
                />
                Repeat
              </label>
              <div className="segmented modes">
                <button
                  id="mode-live"
                  aria-pressed={e.mode === "live"}
                  onClick={() => e.setMode("live")}
                >
                  Live
                </button>
                <button
                  id="mode-render"
                  aria-pressed={e.mode === "render"}
                  onClick={() => e.setMode("render")}
                >
                  Render
                </button>
              </div>
              {e.mode === "live" && (
                <>
                  <button
                    id="record-live"
                    className={e.recording ? "recording" : ""}
                    disabled={!e.live || e.busy}
                    onClick={() =>
                      e.recording ? e.stopRecording() : void e.recordLive()
                    }
                    data-tooltip="Record the live output, including your edits, for up to 30 seconds. Stops when playback stops."
                  >
                    {e.recording ? "Stop recording" : "Record live"}
                  </button>
                  {e.recorded && (
                    <button
                      id="export-take"
                      onClick={e.exportTake}
                      data-tooltip="Download the last recorded take as a mono WAV. This take stays available until the next recording or page reload."
                    >
                      Export take ({(e.recorded.length / 48000).toFixed(1)} s)
                    </button>
                  )}
                </>
              )}
              {e.mode === "render" && (
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
                  <button
                    id="render"
                    disabled={e.busy}
                    onClick={() => void e.render()}
                  >
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
                      onChange={(event) =>
                        e.setRenderLoop(event.target.checked)
                      }
                    />
                    Loop
                  </label>
                </>
              )}
            </>
          )}
        </div>
        <div className="export-actions">
          {!picture && (
            <button
              id="use-in-video"
              onClick={() => {
                e.workspace("picture");
                if (!e.selected) e.addCue();
              }}
            >
              Use in Picture
            </button>
          )}
          <button
            className="primary"
            id={picture ? "export-wav" : "download"}
            disabled={
              picture ? !e.ready || !e.state.scene.cues.length : !e.rendered
            }
            onClick={picture ? e.exportScene : e.exportSound}
          >
            <Icon name="download" />
            Export WAV
          </button>
        </div>
      </div>
      <div className="editor-body">
        <nav className="tool-rail" aria-label="Editing tools">
          <button
            aria-label="Selection tool (V)"
            aria-pressed={e.state.tool === "select"}
            onClick={() => e.dispatch({ type: "tool", tool: "select" })}
          >
            <Icon name="select" />
          </button>
          <button
            aria-label="Hand tool (H)"
            aria-pressed={e.state.tool === "hand"}
            onClick={() => e.dispatch({ type: "tool", tool: "hand" })}
          >
            <Icon name="hand" />
          </button>
          <span className="tool-divider" />
          <button
            aria-label="Sound workspace"
            onClick={() => e.workspace("sound")}
          >
            <Icon name="sound" />
          </button>
          <button
            aria-label="Picture workspace"
            onClick={() => e.workspace("picture")}
          >
            <Icon name="film" />
          </button>
        </nav>
        {children}
      </div>
      <footer className="status-bar">
        <span
          className={`status-led ${e.live || e.playing ? "running" : ""}`}
        />
        <p id="status" role="status" aria-live="polite">
          {e.notice}
        </p>
        <span
          className="mono"
          id="live-indicator"
          data-frames={e.meter.frames}
          data-revision={e.meter.revision}
        >
          {e.busy ? "PROCESSING" : e.live ? "LIVE / CPU" : "48 kHz · MONO"}
        </span>
      </footer>
    </div>
  );
}
