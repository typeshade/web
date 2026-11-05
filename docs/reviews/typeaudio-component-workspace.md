# TypeAudio component workspace

The owner chose Photoshop/After Effects as the visual and workflow references,
then explicitly requested a complete component-level redesign. This replaces the
page controllers and card UI with one React workspace application. It retains the
pinned TypeAudio DSP, live worklet, finite renderer, PCM cache and scene format.

## Structure and behavior

The two entry routes load `website/editor/App.tsx`. `WorkspaceShell`, `Panel`,
`ProjectPanel`, `SoundMonitor`, `SoundEditor`, `Composition`, `Timeline`,
`Inspector`, `Mixer`, `TonePad`, `Variations` and `Splitter` provide distinct UI
boundaries. A document reducer owns selection, sound patches, scene and undo/redo;
the coordinator hook connects actions and persistence to separate sound/transport
engine adapters. Components receive typed state/actions rather than querying and
mutating unrelated DOM controls.

The shared shell has workspace/document tabs, a compact command bar and tool rail,
project assets on the left, a central viewer, a lower dock/timeline and properties
on the right. It uses neutral gray panels with restrained blue selection. Project
width and lower-dock height resize by pointer or keyboard; this is a fixed panel
arrangement, not free-form window docking. Mobile stacks the components.

A selected Picture layer opens directly in Sound. Patch edits update that layer,
and switching workspaces keeps the local media object URL. Timeline clips display
actual PCM peaks, drag/snap, move by keyboard, zoom and pan. Library sounds can be
dragged onto the timeline. Undo/Redo restores the document; File opens/exports scene
JSON. Existing patch/scene storage and JSON formats remain compatible.

## Content and limits

Reviewed the new English workspace/panel labels, File commands, property controls,
empty states, import/export descriptions, errors, keyboard help, live/render
boundary and local-media/YouTube instructions. Generated engine documents retain
their existing English source and provenance; they now use a separate stylesheet.
This is not a new translation or full imported-document review.

Live processing is CPU AudioWorklet; Render supports finite CPU/WebGPU output.
Live LFO is excluded from finite sound files and timeline clips. Scene ranges
remain limited to 60 seconds in the first hour with up to 24 layers. Effects WAV
excludes original video audio; local video must be re-selected after reloading.
YouTube playback depends on embedding/network availability and sync is approximate.
Physical device latency and hardware GPU throughput are not measured here.

## Validation

Shader/TypeScript check, production build and 23 unit tests pass, including four
new document tests for shared selected-layer edits, source isolation, undo/redo,
history bounds and project validation. The production-build Chromium suite passes: actual one-node eight-voice live audio
without render-worker requests, CPU/WebGPU WAV agreement within 1/32768 with
query-bearing worker URLs, effects/dry comparison, patch/project exchange, shared
selected-layer editing, clip drag and keyboard moves, undo/redo, panel resizing,
timeline zoom/hand pan, native library drag/drop, actual WebM range/end loops and
retained media across workspaces. Desktop and 320/390px layout checks pass; rendered
screenshots were inspected. Missing WebGPU, mocked YouTube transport and blocked
API recovery pass with no application runtime errors. External YouTube availability
and physical device latency are not established by this suite.
