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

## Tone state rollback correction

A regression was reproduced on the deployed component workspace: after setting
an independent source to 440 Hz, editing a selected clip at 660 Hz, deselecting
and returning to Sound showed 660 Hz for the source. The source draft and selected
clip shared a mutable projection. Whole-scene/whole-patch writes also allowed an
older callback snapshot to overwrite unrelated newer edits.

The document now retains an independent source and derives the visible sound from
selection. Field changes merge against the reducer's current document; clip moves
change only their target cue. Media replacement keeps selection/source. One atomic
browser document stores source, scene and selection, with legacy migration and
compatibility mirrors. No-op edits preserve undo/redo. Delayed project/patch imports
are discarded after newer edits or load requests, and obsolete media callbacks
cannot attach to a replacement session. Render/PCM results are associated with
the patch they were prepared for. A/B position survives panel changes and is marked
Custom when it no longer describes the current patch.

Focused browser regression covers source/clip Tone across selection, workspace
switches and reload, same-turn field edits, delayed imports after edits, latest
project-open precedence and A/B continuity. The same source/clip scenario failed
on the previous deployed version and passes on the correction. Existing audio,
CPU/WebGPU, timeline, project and video regression coverage is retained.

## Live audio computation

The reported problem was stuttering during Live, rather than finite WebGPU render
throughput. Live continues to use synchronous CPU AudioWorklet processing. Its
website-owned oscillator/filter/envelope implementation now uses one flat TypeShade
kernel with persistent typed buffers. It preserves the TypeAudio f32 oscillator,
RBJ lowpass and envelope equations, independently checked against DesignerVoice
across all four waveforms, filter on/off and envelope repeat boundaries. The
finite renderer, source library and compiler pins are unchanged.

A build-only adapter uses the pinned compiler's internal CPU generator and its
matching generated-code runtime. It removes the leaf kernel's unused argument
publication, whose array otherwise allocates on every call; it retains DSP writes
into the caller's buffers. The adapter refuses interpreter fallback, nested
generated functions, array/object construction and unaudited scalar builtins.
This is a version-coupled website adapter, not a new public TypeAudio API. Review
it when changing the compiler pin. Delay/reverb tap and feedback configuration is
computed once per block. GUI control bursts keep their latest value within a
microtask; parameter delivery and retrigger do not wait for display frames. Edits
made while the worklet loads are reapplied after startup. AudioContext explicitly
requests the browser's interactive latency profile.

The manual `bench:live` runner loads the actual production worklet into a dedicated
Chromium worker. In the Linux cloud environment, each trial warms 500 blocks, then
computes 6,000 blocks (16 seconds at 48 kHz, 128 frames/block), with delay, reverb
and LFO enabled. Three trials per voice count compare main `ce0a139` against this
change; table values are median total compute time and median p99 block cost.

| Unison voices | Before total | After total | Before p99 | After p99 |
| --- | --- | --- | --- | --- |
| 1 | 360.5 ms | 190.3 ms | 0.2 ms | 0.2 ms |
| 2 | 525.0 ms | 206.0 ms | 0.3 ms | 0.2 ms |
| 8 | 1,570.5 ms | 342.6 ms | 0.6 ms | 0.2 ms |

Eight-voice compute time fell about 78% (4.6 times the throughput). Across those
three eight-voice trials, the largest observed block duration was 7.3 ms before
and 1.1 ms after; counts above the 2.67 ms block duration were 7 and 0. These are
worker computation observations with a roughly 0.1 ms timer, not measurements of
real audio-thread deadline misses. Repeated measurements vary with scheduling and
JIT/GC activity. They do not establish hardware GPU performance, physical output
latency, or a game-wide real-time guarantee. Browser/OS/device behavior and the
target game's full workload still need testing on target hardware.

32 unit tests, shader/TypeScript checks, production build and both browser suites
pass. Browser checks include one continuous eight-voice worklet, live parameter
bursts, control delivery while requestAnimationFrame is suppressed, effects and
modulation, finite CPU/WebGPU PCM parity, and the Tone state regressions. The new
English implementation and measurement descriptions were reviewed within this
scope; no broader imported-document or translation review is claimed.
