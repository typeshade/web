import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Editor } from "../useEditor.ts";
import { download } from "../model.ts";
import { Icon } from "./Panel.tsx";
export function WorkspaceShell({
  editor: e,
  children,
}: {
  editor: Editor;
  children: ReactNode;
}) {
  const file = useRef<HTMLInputElement>(null),
    [menu, setMenu] = useState(false);
  const picture = e.state.workspace === "picture";
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const editable =
        event.target instanceof HTMLElement &&
        !!event.target.closest("input,textarea,select,[contenteditable=true]");
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
      if (event.code === "Space") {
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
    setMenu(false);
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
        <div className="file-menu">
          <button aria-expanded={menu} onClick={() => setMenu(!menu)}>
            File
          </button>
          {menu && (
            <>
              <button
                className="menu-dismiss"
                aria-label="Close file menu"
                onClick={() => setMenu(false)}
              />
              <div className="menu-popover">
                <button
                  onClick={() => {
                    e.dispatch({ type: "select", id: "" });
                    e.patch({ ...e.presets.warm.patch }, "Untitled sound");
                    e.workspace("sound");
                    setMenu(false);
                  }}
                >
                  New sound
                </button>
                <button
                  id="open-project"
                  onClick={() => {
                    file.current?.click();
                    setMenu(false);
                  }}
                >
                  Open project…<kbd>JSON</kbd>
                </button>
                <button id="save-project" onClick={save}>
                  Export project…<kbd>⌘ S</kbd>
                </button>
                <hr />
                <button
                  onClick={() => {
                    e.videoInput.current?.click();
                    setMenu(false);
                  }}
                >
                  Import video…
                </button>
                <button
                  onClick={() => {
                    e.patchInput.current?.click();
                    setMenu(false);
                  }}
                >
                  Import sound…
                </button>
              </div>
            </>
          )}
        </div>
        <button
          id="undo"
          title="Undo (Ctrl/Cmd Z)"
          disabled={!e.state.past.length}
          onClick={e.undo}
        >
          Undo
        </button>
        <button
          id="redo"
          title="Redo (Ctrl/Cmd Shift Z)"
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
          onClick={() => {
            document.documentElement.style.removeProperty("--project-width");
            document.documentElement.style.removeProperty("--timeline-height");
          }}
        >
          Reset layout
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
                    <option value="webgpu">WebGPU</option>
                  </select>
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
