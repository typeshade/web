import { useRef, useState } from "react";
import type { Editor, SavedSound } from "../useEditor.ts";
import { Panel, Icon } from "./Panel.tsx";
import { download } from "../model.ts";
export function ProjectPanel({ editor: e }: { editor: Editor }) {
  const [tab, setTab] = useState<"project" | "sounds">("sounds"),
    [search, setSearch] = useState("");
  const file = e.videoInput,
    patchFile = e.patchInput;
  const sounds: { id: string; value: SavedSound; kind: string }[] = [
    ...Object.entries(e.presets).map(([id, value]) => ({
      id,
      value,
      kind: "Preset",
    })),
    ...e.saved.map((value, i) => ({ id: `saved-${i}`, value, kind: "Saved" })),
  ];
  return (
    <Panel
      title="Project"
      className="project-panel"
      actions={
        <button
          title="Import video"
          aria-label="Import video"
          onClick={() => file.current?.click()}
        >
          <Icon name="plus" />
        </button>
      }
    >
      <div className="panel-tabs" role="group" aria-label="Project browser">
        <button
          aria-pressed={tab === "sounds"}
          onClick={() => setTab("sounds")}
        >
          Sounds
        </button>
        <button
          aria-pressed={tab === "project"}
          onClick={() => setTab("project")}
        >
          Media
        </button>
      </div>
      <input
        hidden={tab !== "sounds"}
        className="asset-search"
        aria-label="Search assets"
        placeholder="Search sounds…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <input
        id="video-file"
        type="file"
        ref={file}
        accept="video/*"
        hidden
        onChange={(event) => {
          const f = event.target.files?.[0];
          if (f) {
            e.workspace("picture");
            e.loadFile(f);
            setTab("project");
          }
          event.target.value = "";
        }}
      />
      {tab === "sounds" ? (
        <>
          <div className="asset-columns">
            <span>Name</span>
            <span>Type</span>
          </div>
          <div className="asset-list">
            {sounds
              .filter((s) =>
                s.value.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map(({ id, value, kind }) => (
                <button
                  key={id}
                  className="asset-row"
                  data-preset={kind === "Preset" ? id : undefined}
                  aria-pressed={e.state.patchName === value.name}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData(
                      "application/typeaudio-sound",
                      JSON.stringify(value),
                    )
                  }
                  onClick={() => {
                    e.patch(value.patch, value.name);
                  }}
                  onDoubleClick={() => {
                    if (e.state.workspace === "picture") e.addCue(value);
                    else void e.startLive();
                  }}
                >
                  <Icon name="sound" />
                  <span>{value.name}</span>
                  <small>{kind}</small>
                </button>
              ))}
          </div>
          <p className="panel-hint">
            Double-click to{" "}
            {e.state.workspace === "picture" ? "add at playhead" : "audition"}.
            Drag a sound onto the timeline.
          </p>
        </>
      ) : (
        <div className="media-assets">
          <button className="asset-row" onClick={() => e.workspace("picture")}>
            <Icon name="film" />
            <span>{e.state.scene.media.name || "Untitled composition"}</span>
          </button>
          <button id="choose-video" onClick={() => file.current?.click()}>
            <Icon name="folder" />
            Import video…
          </button>
          <p className="panel-hint">
            Local files stay in your browser. Re-select footage after reopening
            a project.
          </p>
          <YouTubeInput editor={e} />
        </div>
      )}
      <div className="project-bottom">
        <label>
          Sound name
          <input
            id="patch-name"
            maxLength={40}
            value={e.state.patchName}
            onChange={(event) => e.patch(e.state.patch, event.target.value)}
          />
        </label>
        <div className="button-row">
          <button id="save-patch" onClick={e.savePatch}>
            Save sound
          </button>
          <button
            id="export-patch"
            onClick={() =>
              download(
                new Blob(
                  [
                    JSON.stringify(
                      {
                        version: 1,
                        name: e.state.patchName,
                        patch: e.state.patch,
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                ),
                "typeaudio-patch.json",
              )
            }
          >
            Export
          </button>
          <button id="import-patch" onClick={() => patchFile.current?.click()}>
            Import
          </button>
        </div>
        <input
          ref={patchFile}
          id="patch-file"
          type="file"
          accept=".json"
          hidden
          onChange={(event) => {
            const f = event.target.files?.[0];
            if (f) void e.importPatch(f);
            event.target.value = "";
          }}
        />
        <p className="panel-hint">
          Sounds and projects are saved in this browser.
        </p>
      </div>
    </Panel>
  );
}
// The composition owns the player; the shared editor carries the explicit load request.
function YouTubeInput({ editor: e }: { editor: Editor }) {
  const [url, setUrl] = useState(
    e.state.scene.media.id ? `https://youtu.be/${e.state.scene.media.id}` : "",
  );
  return (
    <div className="youtube-import">
      <label>
        YouTube reference
        <input
          id="youtube-url"
          type="url"
          value={url}
          placeholder="Paste video URL"
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <button
        id="load-youtube"
        onClick={() => {
          e.workspace("picture");
          e.loadYouTube(url);
        }}
      >
        Load reference
      </button>
      <p className="panel-hint">
        Loads YouTube on request. Cue sync is approximate.
      </p>
    </div>
  );
}
