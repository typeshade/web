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

## Procedural node graphs

Choose **File → New procedural sound** or **Project → Sounds → New procedural
sound**. The Impact recipe connects Noise → Code → Lowpass → Output. The Tone
recipe connects Parameter → Oscillator → Envelope → Output. Start Live, adjust
the four exposed parameters, and retrigger to hear the beginning again. Switch
the central viewer between Node network and Waveform / Spectrum.

Drag nodes to arrange the graph and drag an output onto a matching input to
connect it. Audio ports are blue circles; control ports are gold squares. The
inspector also provides connection dropdowns. Wheel zooms, middle-drag or the
Hand tool pans, and Fit frames the network. On the canvas, Enter focuses the
selected node and Tab opens Add node; Shift+Tab leaves the canvas. Activate an
output and then an input to connect them with the keyboard. Node context menus
also open with Shift+F10. Move, duplicate, bypass, disconnect and delete operations
participate in document Undo/Redo; Escape cancels a node drag.

Select Code and write scalar TypeShade in the lower dock. **Apply code** or
Ctrl/Cmd+Enter compiles it in a dedicated worker. Failed compilation keeps the
applied graph and running audio. A result that arrives after a newer graph edit
is discarded. Drafts survive node selection within the session; only successfully
applied code is included in local saves, patch exports and Picture projects.
**Generated source** shows the combined TypeShade kernel. **Code reference**
documents the available inputs and scalar functions.

For example, this node generates a sine wave from exposed Pitch (`p0`) and
Strength (`p2`) without an audio input:

```ts
state0 = fract(state0 + p0 / sampleRate);
out = sin(state0 * 6.28318530718) * p2;
```

`input` is the connected audio signal, `time` counts seconds since Retrigger,
and `sampleRate` is 48000. `p0`–`p3` are editable named parameters. `state0`–`state3`
are persistent scalar floats; assign the sample to `out`. Scalar variables,
assignments and `if` are supported, with `sin`, `cos`, `abs`, `min`, `max`, `clamp`,
`fract`, `floor`, `ceil`, `sqrt`, `exp`, `exp2`, `pow`, `tanh`, `mix`, `select` and
the `f32`/`u32`/`i32` casts. Code bodies cannot contain loops, functions, imports,
arrays or browser access. Limits are 1800 characters and 350 syntax elements per
Code node, two Code nodes and 16 total nodes per graph, and four exposed parameters.
Graphs must be acyclic and have one Output. Non-finite samples are silenced with
a Live warning; finite rendering rejects them so a broken graph cannot silently
export an empty take.

The graph compiles through the pinned TypeShade CPU generator to one scalar
sample loop. Blob modules install the compiled kernel into the existing
AudioWorklet and finite-render worker; there is no browser `eval` or compiler on
the audio callback. Codegen checks reject fallback, nested generated calls and
callback allocation. The compiler loads lazily when a graph is used. Parameter,
name and layout edits reuse the kernel. Continuous controls settle over about
12 ms; code/connection changes preserve unchanged node state and crossfade for
10 ms. Retrigger resets graph state and its seeded noise. There is no GPU
readback in this path. Live, WAV and Picture use the same CPU graph DSP.

Each graph replaces the synthesis and effects of its source layer. Output level,
note hold, source offsets and layer mute still apply; sound-rack effects and
unison do not process that graph. Graphs can coexist with ordinary source layers
and imported Picture clips. Output is mono, the Lowpass is one-pole, and sharp
oscillator shapes are not band-limited. Feedback/delay networks, reusable
subgraphs, sample-player nodes, stereo buses, parameter automation tracks and a
game-runtime graph export are not implemented. Patch/project JSON stores the
editable network; WAV and Record live export its audio.

After building, `pnpm --filter typeaudio-site bench:graph` measures the production
worklet's graph processing in a dedicated worker: Impact, Tone, a 16-node/two-Code
graph and four such layers. Results are saved to `artifacts/graph-performance.json`.
This measures callback computation, not device latency or browser scheduling
guarantees. Engine and compiler pins are unchanged.

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
- Render includes LFO and automation. Graphs, noise, FM, custom waves, layers, base mute or
  automation use the same CPU DSP as Live; the backend selector identifies this
  path and disables WebGPU. Basic unmodulated patches retain batched CPU/WebGPU
  rendering. Render plays one note per layer with bounded effect tails.
- Repeat off now plays one note and its tail. Repeat on loops the complete sound.
  Retrigger restarts ordinary sound envelopes, automation and LFO clocks while
  preserving oscillator phase and effect buffers; graph sources reset their state.
  Structural layer/start-offset edits retrigger.
- Record live captures the worklet output, including parameter edits and monitor
  selection, for up to 30 seconds. Export take writes mono 48 kHz, 16-bit WAV.
  Stopping playback also finishes the recording. Takes are session-only and must
  be exported before leaving the page; they do not include speaker/device latency.
- Older version-1 JSON patches remain valid and default to modulation depth zero.
  New exports include modulation, wave tables, curves and source layers. Snapshots are not exported.

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
per workload (unison, the three recipes and a four-layer stress patch), 500 warm-up
blocks, then 6,000 128-frame blocks at 48 kHz. It runs
the production worklet code in a dedicated worker and measures computation only.
It does not measure audio-device latency, actual AudioWorklet deadline misses,
or input-to-speaker latency. Browsers do not offer a hard real-time guarantee.

The basic CPU/WebGPU Render path keeps oscillator/filter state local to each voice for a batch, then
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

## Build a sound

File → New sound starts with one sine source. The Oscillators module offers sine,
saw, square, triangle, deterministic white noise and a custom periodic wave.
FM ratio/index modulate oscillator A; Noise seed makes repeated renders repeatable.
The Wave module edits 64 samples by pointer or number, or generates a wave from
`phase`, `pi`, arithmetic and `sin`, `cos`, `tanh`, `abs`, `sqrt`, `exp`. Expressions
are parsed into a bounded waveform calculation, with DC removed and peak normalized.
This is a periodic-wave editor, not an arbitrary TypeShade/JavaScript DSP runtime.
The current oscillator implementation does not provide band-limited synthesis;
high pitches, FM depth and sharp custom waves can alias.

Sound layers supports a base source and three additional sources. Each has its own
oscillators, unison, filter, envelope, effects, LFO and automation. Select a layer
before changing modules. Additional layers start up to five seconds later; mute,
duplicate and delete commands operate on the selected layer. Base mute is saved
with the sound. Layers sum directly: lower their output levels if export reports
clipping. Imported recordings are available as Picture clips (see below); they
are not oscillator sources in this rack. Effect routing remains fixed.

Automation edits pitch (semitones), cutoff (octaves) and post-effects layer level.
Curves have 2–16 points spanning the layer's hold and release; the final value holds
through its effects tail. Click to add a point, drag or use arrows to adjust, or
edit its time/value numerically. Escape cancels a drag; points retain ordered times.
Pitch/cutoff and LFO update at audio control intervals of at most 128 frames; layer
starts and gain curves follow sample time. A/B stores the entire layered sound;
wave samples interpolate, while curve shapes and layer arrangements switch at the
midpoint. Save/export the resulting patch to keep it.

Project → Sounds includes Laser shot, Metal impact and SF door recipes. SF door
separates the motor, air release and latch; selecting each layer exposes the source
and automation that make that part. Render and Picture use the complete sound,
including layer offsets, LFO and curves. Existing version-1 patches/projects remain
readable; the new fields receive defaults and nested layer graphs are rejected.

## Editor interactions

Right-click a sound, clip, parameter or viewer for contextual commands. Menus also
support Shift+F10 on focused sounds/clips, arrows, Home/End, Enter and Escape.
Hover or focus controls for tooltips. Text fields retain the browser's own menu.

Click a blue property value to type, or drag it horizontally to scrub. Shift gives
finer scrubbing. Enter commits and Escape cancels numeric entry. Sound property
and Tone-pad gestures undo as one edit; clip moves commit on release. Alt-drag
copies a clip, Middle-drag pans, and Snap aligns nearby clip edges and the playhead.

Resize the Project, Properties and lower dock dividers. Arrow keys resize focused
dividers; double-click resets one size. Sizes persist in this browser. Window →
Reset layout restores defaults, and F focuses/restores the desktop viewer.

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
project, selected layer and in-memory local video. A selected procedural layer's
sound is edited directly in Sound and immediately updates that layer's patch.
When an imported audio clip is selected, Sound edits the independent source draft;
Use in Picture adds that draft as a new procedural layer.

- `state/` separates document types, projection, selection, restoration and the
  undo/redo reducer. History keeps 30 snapshots; opening a project or replacing
  media resets it. `hooks/document/useEditorDocument.ts` owns the reducer,
  persistence and the revision used to reject stale asynchronous results.
- `useEditor.ts` composes feature controllers from `hooks/`; playback, recording,
  imports, project files, clip actions and graph editing have separate owners.
  `hooks/session/useAudioResources.ts` creates and releases the audio resources.
  UI components receive typed state and actions.
- `engine/SoundEngine.ts` wraps the existing worklet and finite CPU/WebGPU worker.
  `engine/SceneTransport.ts` follows native/YouTube media time and schedules PCM
  with the existing `CueAudio` cache. UI components do not construct audio nodes.
- `components/atoms/` contains individual visual controls; `molecules/` combines
  controls into panels, toolbars and inputs; `organisms/` owns feature panels.
  Each TSX file defines one component. `templates/WorkspaceShell.tsx` composes
  the application chrome, and `templates/WorkspaceGrid.tsx` arranges panel slots.
  `pages/StudioPage.tsx` connects the controllers to the workspace.
- The project organisms browse/import sounds, audio files and video. `AudioLibraryPanel`
  exposes audition, drag/drop, export and removal; `audio-library.ts` stores decoded
  PCM in IndexedDB separately from document/history references. `SoundEditor`,
  `SoundMonitor`, `TonePad` and `Variations` compose the sound workspace.
  `GraphCanvas`, `GraphInspector` and `GraphDock` use `useGraphEditor` for node
  selection, draft/apply and graph operations. `graph/validateGraph.ts` validates
  the portable network; `graph/compiler/` separates code validation, source
  generation and the pinned compiler adapter. `graph/dsp.ts` owns stateful execution.
  `Composition`, `Timeline` and `ClipInspector` compose Picture; `Mixer` handles the
  listening levels.
- `sound/` separates patch types/defaults/presets, limits and validation from
  envelope sampling, individual PCM effects and spectrum analysis.
- `styles/index.css` imports feature stylesheets in cascade order for the compact
  neutral-gray panels, selection color and desktop/mobile arrangements.
  Generated engine documents use their own `docs.css`.

The [editor architecture guide](website/editor/README.md) describes these
boundaries and how to extend them. `pnpm check:typeaudio` checks the component
convention, dependency direction, resource ownership and runtime import cycles.

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
Drag either clip edge to trim the original source, or use Source in/out in
Properties. The top handles set linear fade-in/out; Properties accepts exact
seconds. Reset trim restores the full source, and Reset fades removes the envelope.
Trims are retained if a sound changes length; a clip outside its shorter source
stays silent until you reset or adjust the trim.

Ctrl/Cmd-click toggles layer selection; Shift-click selects a range. Drag, Alt-drag,
Duplicate and Delete operate on the selected group, keeping relative timing.
Properties edits the active clip. Ctrl/Cmd A selects all layers, Ctrl/Cmd D copies
them, and Ctrl/Cmd Shift D splits selected clips at the playhead. A split continues
the original source and fades without retriggering synthesis. Adjusting a fade
anchors a new envelope to that piece. Each piece must be at least 10 ms long;
splits and copies respect the 24-layer limit.

Space plays/pauses; V/H select the selection/hand tools; Ctrl/Cmd Z and Shift Z
undo/redo. A group move or drag is one history entry; Escape cancels an active
pointer edit. Shortcuts yield to text/number inputs.

Project → Audio or File → Import audio adds a recording at the playhead. Drop a
file onto a timeline row to place it at that time. WAV, MP3, Ogg and FLAC support
depends on the browser decoder. Files must be mono or stereo, between 10 ms and
30 seconds, and no larger than 25 MiB. Imports are resampled to 48 kHz; stereo is
averaged to mono. The browser library holds up to 24 distinct files and 120 seconds
of source audio. Identical decoded audio shares one stored source.

Click an Audio library item to audition it; double-click, drag it or use its plus
button to add another clip. Right-click or press Shift+F10 for file actions. Imported
clips support the same timing, trim, fade, split, gain, mute and group edits as
procedural clips. These edits reuse the decoded source without running synthesis.
The Sound rack's filters, modulation and effects do not process imported clips.

Files stay in this browser. Export project embeds the composition's referenced
audio as lossless float PCM, so another browser can open the same composition.
Project JSON is limited to 40 MiB. Re-select video separately. Missing audio blocks
preview/WAV export with a recovery message; importing the original file or reopening
a project with embedded audio restores the source while retaining clip edits.
If the composition changes during a file import, the file is saved to the library
without adding a clip. A failed decode, validation or storage write leaves the
document unchanged. Removal is disabled for audio referenced by the composition
or its undo/redo history; reloading or opening another project resets that history.

- Up to 24 cues; ranges span at most 60 seconds within the first hour.
- Procedural clips use finite CPU renders including LFO, automation and source layers.
  Changing their sound prepares new PCM. Imported clips read stored PCM. Original
  video and the effects composition have independent listening levels.
- Local media is never uploaded. Video uses an object URL and is excluded from project
  JSON. Re-select footage after reopening or reloading the project.
- YouTube uses the [official IFrame API](https://developers.google.com/youtube/iframe_api_reference)
  only on explicit load. Embedded availability depends on the video and network;
  cue synchronization is approximate.
- Effects WAV is mono 48 kHz, 16-bit PCM for the selected range, including silence
  and trimmed source ranges, fades and cropped tails. Preview uses the same source
  windows and linear fade envelopes. Original audio and video are excluded. Clipping is reported.
  Sound WAV is a finite render with modulation. Export take saves a recorded performance.
- Existing version-1 scenes and saved patches remain readable. New audio references
  are optional scene fields; embedded PCM is excluded from local document history.
  A standalone source draft is retained locally; save/export named sounds to keep
  or share them. Session A/B snapshots are not included in patch exports.

`test:browser` runs the workspace, state, device-loss, interaction, sound-design,
timeline and audio-import browser suites. They cover actual live processing,
query-bearing CPU/WebGPU workers and PCM parity, project and patch exchange,
shared selected-layer editing, waveform clip dragging, keyboard/undo/redo,
transport and video loops, mobile layout and mocked YouTube recovery. Timeline
checks compare split WAVs sample-for-sample and replay captured preview source
offsets/gain automation in an OfflineAudioContext against the exported WAV. Audio
import checks use a real stereo WAV and verify resampling/downmix, mixed PCM,
IndexedDB reload, portable projects in an empty browser, missing/corrupt files,
intervening edits, storage failure and history-protected deletion. The local
four-second VP8/WebM fixture uses FFmpeg `testsrc2` (160×90, 12 fps, 40 kbps).
YouTube adapter tests do not establish external video availability. Browser/device
latency and physical GPU headroom are not established by these checks.
