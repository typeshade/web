# TypeAudio studio

TypeAudio's website lives in this application. The library source is pinned by the
`sources/typeaudio` submodule at `575b42b`; `src` is a link to that source, not a fork.
The initial website was imported from TypeAudio revision
`1d6eb0d272f6f61fdf81b4023652f033e6261f35` (PRs 19–21), including the worker module
identity fix, sound designer and synchronous AudioWorklet. Those PRs were closed after the website transfer; they are not needed to
build this application. The library modules are unchanged between
these revisions. Documentation comes from the pinned library revision.

## Development

Use Node 24, pnpm 10.28.2 and Bun 1.4.3 or newer.

```sh
git submodule update --init sources/typeaudio
pnpm install --frozen-lockfile
pnpm dev:typeaudio
pnpm check:typeaudio
pnpm test:typeaudio
pnpm build:typeaudio
pnpm --filter typeaudio-site exec playwright-core install chromium
pnpm --filter typeaudio-site test:browser
```

The preparation script links the pinned app compiler into the library's ignored
`node_modules`. Both module trees must use one runtime registry. It refuses to
replace an existing, different compiler installation. Generated shader host views
are ignored. Vite builds each worker as one module to preserve resident array
identity even when its URL contains a query string. The separate Vite application
preserves this compiler pipeline; it consumes the web workspace's shared UI tokens.

## Sound exploration

- Live runs on the CPU audio thread at 48 kHz. Controls preserve oscillator phase
  and effect tails; continuous settings settle over approximately 12 ms.
- The XY pad maps horizontal movement to logarithmic filter cutoff and vertical
  movement to oscillator blend. Ordinary sliders offer the same keyboard controls.
- Store A and B capture session-only patches. Recall preserves the running voice;
  the blend control interpolates frequencies logarithmically. Discrete settings
  switch at the midpoint. Save locally or export JSON to keep a resulting patch.
- Live LFO uses sine or triangle modulation of cutoff, pitch or oscillator blend.
  Its clock advances in the audio processor at 128-frame control intervals, without
  UI timers. Beat sync means one cycle per beat at the selected tempo. Depth zero
  disables the modulation. Filter cutoff modulation requires the filter to be on.
- CPU/WebGPU Render and WAV export remain finite, **unmodulated** renders. They do
  not record a live performance. LFO controls and render completion explain this.
- Older version-1 JSON patches remain valid and default to modulation depth zero.
  New exports include the live modulation settings. Snapshots are not exported.

The website's live oscillator/filter/envelope kernel is compiled from TypeShade
to f32 CPU code during the build. Playback reuses voice state, parameter and output
buffers instead of calling the generic class host boundary for each block. The
build adapter uses the pinned compiler's internal generator and matching runtime;
compiler upgrades must review that adapter. The library pin is unchanged. Finite
rendering uses a separate batched CPU/WebGPU path. Control bursts are coalesced within a microtask, without a
display-frame wait. Retrigger flushes pending controls before sending its event.

For a repeatable CPU compute comparison, build first, then run
`pnpm --filter typeaudio-site bench:live`. Set `TYPESHADE_CHROMIUM` to use an existing
Chromium executable. Results go to `artifacts/live-performance.json`: three trials
per voice count, 500 warm-up blocks, then 6,000 128-frame blocks at 48 kHz. It runs
the production worklet code in a dedicated worker and measures computation only.
It does not measure audio-device latency, actual AudioWorklet deadline misses,
or input-to-speaker latency. Browsers do not offer a hard real-time guarantee.

Finite Render keeps oscillator/filter state local to each voice for a batch, then
commits it to the bank. It uses up to 16,384 frames per batch and gathers, averages,
drives and scales directly into a resident output tape. PCM is read once at the
end. The Sound editor retains its worker and one device per requested backend
after successful renders; each device's released-array pool is limited to 16 MiB.
Cancellation and timeout terminate pending workers. Errors and device loss evict
the affected device. Completed results own their PCM and do not alias pooled storage.

The displayed render duration measures the main-thread request through result
delivery, including worker startup and message transfer. The report also separates
device setup, plan/scheduling time, output wait/readback and CPU post-processing.
Output wait includes outstanding GPU execution; it is not a pure transfer-time
measurement. GPU timestamps appear only when the runtime provides them.

After building, `pnpm --filter typeaudio-site bench:render` compares CPU and WebGPU
with fresh and repeated requests, three trials per workload. It records browser
and adapter metadata in `artifacts/render-performance.json`. For a software-only
check, explicitly set `TYPEAUDIO_BENCH_SOFTWARE_GPU=1`. Those results do not establish
hardware GPU throughput or Live audio latency.

The sound controls draw on [Ableton rack variations and macro controls](https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/)
and [Bitwig's modulation system](https://www.bitwig.com/userguide/latest/the_unified_modulation_system/).
These references inform direct sound manipulation and quick comparison; this site
is a small sound designer, not a full DAW. Browser performance and end-to-end audio
latency still require measurement on the user's hardware.

## Publishing

The TypeAudio CI workflow checks and builds this application. Its artifact is
`dist`. Production deploy supports `typeaudio` on `main` and uses the existing
`typeaudio-site` Worker and `audio.typeshade.dev` custom domain.

After the approved cutover, run **TypeAudio production cutover** once. It creates
only `typeaudio-production`, restricts it to main, verifies that the original
TypeAudio publisher is idle and disables that publisher. Existing protections
and all other sites' settings are retained. It uses the repository's existing
`DEPLOYMENT_ADMIN_TOKEN` Actions secret. The inherited `CLOUDFLARE_API_TOKEN`
remains in the protected deployment job; no credentials enter the browser build.

Then dispatch **Production deploy** with `site=typeaudio` from main. The workflow
checks the environment and old publisher before building, runs the studio tests,
captures the previous version and verifies the new version receives all traffic.
The existing `WEBSITE_OPERATIONS_ENABLED` switch must remain enabled. Do not rerun
the older all-site setup workflow, which deliberately disables operations.

Rollback uses the captured Worker version. Re-enable the old publisher only after
disabling new publishing; two repositories must not deploy this Worker together.

## Component workspace

The UI is a React application under `website/editor/`. Both `/` (Sound) and
`/studio/video/` (Picture) load the same editor. Switching workspaces retains the
project, selected layer and in-memory local video. A selected layer's sound is
edited directly in Sound and immediately updates that layer's patch.

- `model.ts` holds the shared document, selection and undo/redo reducer. History
  keeps 30 document snapshots; opening a project or replacing media resets it.
- `useEditor.ts` owns project actions, local persistence, patch library and the
  engine lifecycle. UI components receive typed state and actions.
- `engine/SoundEngine.ts` wraps the existing worklet and finite CPU/WebGPU worker.
  `engine/SceneTransport.ts` follows native/YouTube media time and schedules PCM
  with the existing `CueAudio` cache. UI components do not construct audio nodes.
- `components/WorkspaceShell` owns workspace tabs, document tools, File commands,
  transport, tool selection, export and status. `Panel` and `Splitter` provide
  shared panel structure and keyboard/pointer resizing.
- `ProjectPanel` browses/imports sounds and media. `SoundEditor`, `SoundMonitor`,
  `TonePad` and `Variations` compose the sound workspace. `Composition`, `Timeline`
  and `Inspector` compose Picture; `Mixer` handles the listening levels.
- `workspace.css` defines the compact neutral-gray panel system, restrained blue
  selection color, document tabs, tool rail and desktop/mobile arrangements.
  Generated engine documents use their own `docs.css`.

The owner's visual/workflow references are Photoshop and After Effects: a
project browser, central viewer, lower timeline, selected-object properties and
persistent workspace context. Panels resize along the project/timeline dividers;
there is no free-form docking system. The original page controllers and card-based
styles are removed rather than retained behind the component UI.

In Picture, import a local video or explicitly load a YouTube reference from
Project → Media. Add a sound at the playhead, double-click one in the sound library,
or drag one into the timeline. Select a layer to change timing, gain and mute;
**Edit sound** opens that layer's patch in Sound. Drag waveform clips to position
them, use arrow keys for 0.01-second moves (Shift: 0.1), and zoom/pan the timeline.
Space plays/pauses; V/H select the selection/hand tools; Delete removes a selected
layer; Ctrl/Cmd Z and Shift Z undo/redo. Shortcuts yield to text/number inputs.

- Up to 24 cues; ranges span at most 60 seconds within the first hour.
- Clips use finite CPU renders without live LFO. Changing clip sound prepares new
  PCM. Original video and effects have independent listening levels.
- Local video uses an object URL and is never uploaded. JSON stores references and
  patches, not media. Re-select footage after reopening or reloading the project.
- YouTube uses the [official IFrame API](https://developers.google.com/youtube/iframe_api_reference)
  only on explicit load. Embedded availability depends on the video and network;
  cue synchronization is approximate.
- Effects WAV is mono 48 kHz, 16-bit PCM for the selected range, including silence
  and cropped tails. Original audio and video are excluded. Clipping is reported.
  Sound WAV is a separate finite CPU/WebGPU render, excluding live modulation.
- Scene JSON and saved patch keys remain compatible with the previous studio.
  A standalone source draft is retained locally; save/export named sounds to keep
  or share them. Session A/B snapshots are not included in patch exports.

`test:browser` runs `check-workspace-browser.ts`. It covers actual live processing,
query-bearing CPU/WebGPU workers and PCM parity, project and patch exchange,
shared selected-layer editing, waveform clip dragging, keyboard/undo/redo,
transport and video loops, mobile layout and mocked YouTube recovery. The local
four-second VP8/WebM fixture uses FFmpeg `testsrc2` (160×90, 12 fps, 40 kbps).
YouTube adapter tests do not establish external video availability. Browser/device
latency and physical GPU headroom are not established by these checks.
