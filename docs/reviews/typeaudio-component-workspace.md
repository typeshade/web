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

## Finite WebGPU render optimization

The follow-up starts from `75e3d89` and optimizes the separate finite renderer. The
previous implementation created a worker/device for every Sound render and read
PCM after every 1,024 frames. The renderer now uses up to 16,384 frames per batch,
holds each voice's recurrent state in invocation-local storage until the batch
finishes, and gathers/averages/drives/scales directly into a resident output tape.
It reads PCM once and returns an owned copy before releasing the tape to the pool.
The 4-second hold plus 0.35-second release case now uses 13 plans and one PCM
readback, versus 204 plans/readbacks. Its reports count 26 kernel dispatches and
13 plan submissions; the explicit final download is outside those plan counts.

The Sound editor retains completed workers and one device per backend. Each
device's released-array pool is limited to 16 MiB; this is not a total GPU memory
limit. Backend selection remains strict. Request IDs reject obsolete responses.
Cancellation and timeout terminate the pending worker; close also frees idle
workers. Rendering errors evict the affected device, and device loss invalidates
its cache entry. Active renders release their residents before owner disposal.
The Picture clip renderer still creates CPU workers per uncached clip. Live's
128-frame CPU callback and its generated worklet are unchanged.

The render metric now measures request-to-result wall time, including worker
startup/message delivery. Reports distinguish device setup, plan/scheduling time,
output wait plus PCM readback, and CPU post-processing. Output wait includes any
queued GPU execution and must not be read as transfer-only time. Actual GPU times
remain optional runtime timestamp measurements; missing values are not zero.

`bench:render` records actual production-worker requests, three fresh workers per
backend/workload and two identical requests per worker. The baseline worker
recreated its device for the second request; the optimized worker reuses it. In
cloud Chromium with `google / swiftshader`, `isFallbackAdapter: true`, the median
request-to-result wall times were:

| Voices / hold / release | GPU first, before | GPU first, after | GPU repeated, before | GPU repeated, after |
| --- | --- | --- | --- | --- |
| 1 / 0.5 s / 0.35 s | 1,124.3 ms | 295.7 ms | 962.1 ms | 62.1 ms |
| 8 / 4 s / 0.35 s | 3,432.3 ms | 519.8 ms | 3,148.4 ms | 280.1 ms |

Repeated WebGPU render time fell about 94% and 91% respectively. These are
SwiftShader software-adapter observations, not hardware GPU results or Live
latency measurements. The default patch has filter/drive on and delay/reverb/LFO
off. The outputs contain 40,800 and 208,800 mono frames. The manual runner records
adapter/browser metadata and phase timings. By default it uses the browser's
selected adapter; inspect each run's device metadata to identify hardware or
fallback execution. Forcing software requires `TYPEAUDIO_BENCH_SOFTWARE_GPU=1`.

CPU repeated medians were 28.9 → 21.7 ms for one voice and 433.4 → 462.2 ms for
eight voices. The latter was about 7% slower in this run; its trial range overlaps
the baseline range (422.9–529.7 ms before, 455.0–476.8 ms after). This comparison
does not establish an eight-voice CPU improvement. One-voice CPU remains faster
than WebGPU in this environment; eight-voice repeated WebGPU was faster here.
Target hardware, cold compilation, other patches and concurrent workloads can
change that relationship.

The bounded English review covers the new report text, timing descriptions and
benchmark instructions. It does not claim another imported-document or translation
review. Source library and compiler pins remain unchanged.

Shader/TypeScript checks, 34 unit tests, the production build and both existing
browser suites pass. Added coverage checks multi-batch CPU output against an
independent per-sample TypeAudio reference, retained PCM ownership, identical
repeated GPU output, long eight-voice CPU/WebGPU WAV parity (maximum 1/32768 here),
worker/device reuse across backends, obsolete request IDs and cancellation/timeout
recovery. A third browser check forces device loss during a real GPU submission
through a wrapper around the production worker. It verifies error delivery, a new
GPU device on retry, and retention of the independent CPU device. The delayed
render fixture now echoes request IDs so it still exercises patch revision checks.

The first production build was gated by a browser-fixture failure after the PR
checks passed. The paused-display test discarded RAF callbacks; if an application
loop reached that stub, restoring the native function did not restart the loop.
An explicit 80 ms pause reproduced the later timeline scheduling timeout on Chrome
156. The fixture now retains/cancels paused callbacks and resumes them with the
native scheduler restored. Its assertion polls independently of RAF. The same
80 ms pause and full browser suite pass with this correction. No application or
audio-processing code changed for this fixture repair.

## Editor interaction pass

This follow-up starts from `5ceba3a` and keeps the owner's Photoshop/After Effects
workspace direction. Shared interaction and layout providers now own transient
menus/tooltips and panel preferences. They are separate from the audio document,
its undo history and the engine adapters.

File/Edit/Window and contextual menus share keyboard navigation, disabled/checked
items, type-to-select, Escape, focus restoration and viewport bounds. Contexts
cover project sounds, timeline clips and empty lanes, parameters, the Tone pad and
the viewer. Clip actions target explicit cue IDs, including when the clicked cue
was not previously selected. They expose audition, editing, rename, mute, move to
playhead, duplication and deletion. Native text/video context menus remain native.
Menu commands perform existing editor operations; the UI does not pretend to
support arbitrary signal routing or free-form window docking.

Tooltips support hover and keyboard focus, delay/dismissal, viewport placement and
`aria-describedby`. Parameter help explains units and behavior, including synced
rate and Live modulation limits. The decorative panel-header menu glyph has been
removed. Numeric property values can be clicked for entry, dragged for scrubbing
or reset through their menu. Pitch/cutoff scrubbing is logarithmic; Shift gives
finer steps. Input stays within the patch's validated bounds. Enter commits;
Escape restores the original value. Focus returns after keyboard entry.

A document checkpoint groups Sound property/range and Tone-pad edits into one
undo step. Cancellation and gestures with no net change preserve redo. Changing
selection/workspace commits the previous target before projecting the next sound.
The checkpoint is not part of saved project data. The independent source and
selected clip remain separate. A/B labels are derived from the applied patch key,
so restoring a matching patch after a manual edit can recover its variation
position; storing an endpoint marks the current sound as that endpoint.

Project width, properties width and dock height resize by pointer or keyboard.
Completed sizes are validated and saved under `typeaudio.editor.layout.v1`;
Escape cancels a resize, double-click resets one dimension, and Reset layout
clears preferences. Desktop focus-viewer mode uses F/Escape. Small screens keep
the stacked arrangement and disable this desktop focus mode. These are fixed
panel positions with saved sizes, not draggable floating windows.

Clip moves remain drafts until release; Escape/pointer cancellation discard the
draft. Alt-drag copies without moving the original, then selects the copy. Snap
uses a six-pixel tolerance around clip boundaries, range boundaries and playhead,
in addition to the grid. A guide and time readout show the current draft. Middle
button or Hand-tool panning handles horizontal/vertical scroll and pointer loss.
Right-click does not start clip, Tone-pad or panel drags. Global Space preserves
native button/checkbox behavior and ignores key repeat during audio playback.

Reviewed the new English commands, tooltips, input help, shortcuts and layout
labels, and inspected desktop Sound/Picture screenshots. Audio kernels, worker
rendering, source pins, WAV semantics and the saved scene format are unchanged.
This pass does not claim a new imported-document or translation review.

Validation: shader/TypeScript checks, all 38 unit tests, the production build and
all four browser suites pass on Chrome 156. The interaction suite covers numeric
entry/scrub/range history, cancel/redo, tooltip descriptions, native Space behavior,
Tone/A-B rollback, menu keyboard focus, saved/cancelled/reset panel sizes, targeted
clip actions, rename, Alt-copy, magnetic snap, cancellation, panning and menu bounds.
Desktop live audio, numeric entry, context menus, tooltips and the 390 px stacked
layout were also inspected in screenshots. Existing suites retain audio/worker,
media, persistence and 320/390 px layout coverage. GPU checks use SwiftShader here;
this UI pass establishes no new hardware latency or performance claim.

## Procedural sound design

This pass starts from web `598fdc5`. Sound sources now include deterministic white
noise, FM on oscillator A and a 64-sample periodic wave. The Wave component supports
drawing, numeric samples and a bounded expression language. It parses arithmetic
and named functions once on the main thread; it does not execute arbitrary user
JavaScript or TypeShade in the audio callback. The CPU TypeShade leaf kernel reads
the resulting table and keeps per-voice FM/noise state in preallocated buffers.
The library and compiler pins remain unchanged.

A patch contains a base source plus up to three independent layers, each with its
own synthesis, filter, envelope, effects, modulation and a start offset up to five
seconds. Layer selection routes property edits to that layer without replacing
the source/selected Picture clip document. Base mute, layer mute, duplication,
deleting, naming and offsets participate in document history and serialization.
The new fields have defaults for older version-1 files. Layer nesting, duplicate
IDs, oversized tables and invalid curve points are rejected; project imports
allow up to 1 MB for the extended documents.

Pitch, cutoff and post-effects level curves use 2–16 ordered points across note
hold/release. Final values hold during bounded effects tails. Pitch/cutoff and
LFO controls run at intervals of at most 128 frames; gain curves and layer starts
follow sample time. Structural layer/offset edits retrigger; other controls update
the running state. Repeat off now plays one note and tail, while Repeat on loops
the complete layered sound. A/B interpolates wave samples and scalar controls;
layer arrangements and curve shapes switch at the midpoint.

The new sources, layers, base mute, LFO and automation render through the same CPU
DSP as the worklet, including in Picture. WebGPU is visibly unavailable for those
patches and the worker rejects an explicit unsupported backend request. Basic
unmodulated patches retain the prior batched CPU/WebGPU path. Render is one note
per layer; Record live captures the worklet's actual output and parameter gestures
for up to 30 seconds. Playback stop completes the take. Export take writes mono
48 kHz 16-bit WAV; clipping is reported. Takes are session-only, and physical
speaker/device output latency is outside this capture.

The three example recipes expose their construction: Laser shot uses a descending
pitch curve and FM, Metal impact adds a noise transient, and SF door layers motor,
air release and latch. The UI retains the neutral panel layout and shared menu,
tooltip, numeric-entry and undo interactions. Desktop waveform/automation screens
and the 390 px arrangement were visually inspected. The English review covers
new controls, hints, errors, recipes and README instructions. It does not claim an
imported-library documentation or translation review. Remaining synthesis limits
include aliasing at high frequencies/complex waveforms, fixed effect routing and
no sample-file source or arbitrary DSP-program editor.

Unit checks cover validation/backward compatibility, expression bounds, seeded
noise reproducibility, audible FM/wave/LFO/curve changes, delayed/muted layers,
recording capacity and exact shared-DSP output across callback boundaries. The
new browser suite covers real edits/undo, wave/curve dragging, project recovery,
CPU export reproducibility, Picture export and sample-by-sample comparison of a
recorded worklet take with its downloaded WAV.

A compute-only browser worker benchmark ran the built worklet in Chrome 156 for
two trials per scenario, 500 warm-up blocks and 6,000 measured 128-frame blocks.
Recipe p99 costs were 0.2–0.4 ms; a four-layer/32-voice stress patch reached about
0.6 ms p99. That stress scenario recorded 0 and 4 calls above the 2.67 ms quantum
budget, with maxima of 2.3 and 6.6 ms. Other workloads also had isolated outliers.
These are elapsed worker-call observations, not actual AudioWorklet deadline-miss
or hardware input/output latency measurements; they establish no hard real-time
guarantee. The runner now includes recipes and the layered stress case.

Local validation passes shader/TypeScript checks, 47 unit tests, production build,
style/scope checks and all five browser suites. The last cleanup also checks the
new source-layer keyboard menu and the completed recording/export flow.

## Timeline editing follow-up — 2026-11-05

Picture now supports source trimming, linear clip fades, splitting at the playhead
and multiple selected layers. Clip-edge handles and Source in/out fields retain
the original PCM. Top handles and numeric fade fields control the envelope. A
split creates two layers sharing the source window and original fade coordinates,
so it does not retrigger synthesis or restart a fade. Editing a fade or trim
anchors the envelope to that piece. Reset trim restores the source window; Reset
fades removes the envelope. A source shortened below its saved trim remains silent
until the trim is adjusted or reset. The 24-layer and 60-second scene limits remain;
splits leave at least 10 ms in each piece.

Ctrl/Cmd-click toggles selection, Shift-click selects a range and Ctrl/Cmd A selects
all layers. Group moves preserve relative timing at the timeline bounds. Alt-drag,
Duplicate, Delete and the corresponding context actions operate on the selection;
Properties identifies and edits the active clip. Ctrl/Cmd D duplicates and Ctrl/Cmd
Shift D splits. Pointer edits commit once on release, Escape cancels them, and
Undo/Redo restores the entire edit and its selection. Selection persists in the
atomic local document; scene JSON remains version 1 with optional trim/fade fields.

Preview and WAV use the same sample-clock source windows and linear fade envelope.
Raw PCM stays cached across timing and fade edits. Audio scheduling initializes a
clip's gain before its automation events, avoiding a default-gain sample when a
source begins just before a fractional timestamp. Waveforms show only the visible
source segment; the envelope is drawn over the waveform. The stale hints excluding
LFO from finite exports were corrected to match the preceding implementation.

The bounded English review includes changed menus, handles, tooltips, properties,
shortcuts, validation errors and README instructions. Desktop and 390 px layouts
were visually inspected. This is not a review of imported engine documentation or
translations. The editor still places one clip per layer; independent track routing,
free docking and arbitrary DSP programs are outside this change.

Validation adds trim/seek, split phase and fade continuity, malformed project,
selection/history and movement-boundary unit coverage. The browser suite covers
group edits, cancellation and Undo, persistence, actual handle dragging, splitting
inside a fade, sample-identical split WAVs, project round trips and mobile bounds.
Captured AudioBufferSource offsets and gain automation are replayed in an
OfflineAudioContext at three clock positions and compared with exported PCM. The
observed maximum difference is 1 LSB in 16-bit output; a mid-fade seek also preserves
its source offset and gain. This verifies scheduling data and offline audio output,
not physical audio-device latency or a hard real-time guarantee.

Local shader/TypeScript checks, 52 unit tests, production build, global CSS and
scope checks pass. All six browser suites pass, including the existing source/clip
Tone persistence and CPU/WebGPU/device-loss regressions. Clip gestures and their
context menu live in separate components/helpers from the timeline layout.

Production verification of release `40dd573` passes the workspace, state,
interaction, sound-design and timeline browser suites. The offline comparison
pauses the transport and snapshots one scheduling batch before replaying it, so
later drift reschedules cannot be counted twice while the asynchronous render runs.
The deployed preview commands remain within 1 LSB of the exported WAV at all three
clock positions tested.

## Imported audio clips — 2026-11-05

Project → Audio accepts local recordings for Picture compositions. Import adds a
clip at the playhead; dropping a file on a timeline row uses that position. Library
items support audition, drag/drop, a dedicated add button and pointer/keyboard
context menus for WAV export and removal. Imported clips share trim, fade, split,
gain, mute and multiple-selection operations with procedural clips. Their source
duration and waveform come from decoded PCM, and missing audio never falls back to
the cue's compatibility patch. Sound keeps the independent procedural source draft
when an imported clip is selected; Use in Picture adds it as another layer.

Mono/stereo files are limited to 10 ms–30 seconds and 25 MiB. Browser decoding
resamples to 48 kHz and averages stereo to mono; format support depends on the
browser. The library allows 24 distinct sources and 120 seconds total. SHA-256 of
canonical float PCM identifies shared sources. IndexedDB stores samples separately
from the small references in document history. AudioBuffer caching is bounded.
Files are never uploaded. Sound-rack filters/effects, stereo output and sample
oscillator voices are outside this change.

Export project includes each referenced source once as float PCM in version-1 JSON;
video still needs re-selection. Import validates the full bundle and its checksums
before a single storage transaction, then opens the scene only if no newer edit
superseded the request. Files are limited to 40 MiB. Slow audio imports can populate
the library without overwriting newer composition edits. Missing sources can be
restored by importing the original file or opening a bundled project. Decode and
storage failures leave the document unchanged. Removal is disabled for sources in
the current composition, undo/redo history or active gesture checkpoint.

The English review covers the Audio library, file menus, timeline import controls,
clip properties, tooltips, validation/recovery messages and README instructions.
Desktop and 390 px screenshots were inspected for panel layout and overflow. This
is a bounded editor review; imported engine documentation and translations were
not changed. Engine/compiler pins and upstream runtime sources are unchanged.

Unit coverage verifies exact float PCM round trips across base64 chunk boundaries,
content identity, corrupt/oversized data rejection, scene references and independent
source Tone/Undo behavior. A new browser suite imports an actual 44.1 kHz stereo WAV,
checks the 48 kHz mono result, and compares trimmed/faded export against independently
calculated samples (maximum 1 LSB difference in 16-bit WAV). Splitting preserves the
WAV exactly, and these edits start no synthesis workers. Mixed procedural/imported
projects produce identical exports after reload and in an empty browser context.
The suite also checks actual library dragging, damaged and missing source recovery,
duration rejection, delayed decode with intervening edits, simulated storage quota
failure and removal protection across undo history.

Local shader/TypeScript checks, 55 unit tests, production build, CSS/scope checks
and all seven browser suites pass. Existing Tone persistence, CPU/WebGPU rendering,
device-loss recovery, Live processing and timeline preview/WAV checks also pass.
This evidence does not establish hardware audio latency or support for every codec.

## Procedural graph and TypeShade Code nodes — 2026-11-06

New procedural sound opens an editable network in the Sound viewer. Impact and
Tone recipes provide starting points; Parameter, Oscillator, Noise, Code, Gain,
Lowpass, Envelope, Mix and Output nodes can be connected through typed audio and
control ports. The graph supports dragging, zoom/pan/Fit, pointer and keyboard
connections, inspector dropdowns, context menus, bypass, duplication and deletion.
Node dragging is one history edit and Escape cancels it. The lower dock contains
Code, its generated TypeShade source, a code reference and four named parameters.
The central viewer can switch to the existing waveform/spectrum monitor.

Code nodes compile actual scalar TypeShade through the pinned CPU generator in a
lazy dedicated worker. The generated kernel installs as a blob module in the
existing AudioWorklet and finite-render worker. No browser eval or compiler runs
in the callback. Validation bounds code size and topology; generated-code checks
reject fallback, nested kernel calls and allocation expressions. Graphs allow
16 nodes, two Code nodes, four parameters and one Output, without cycles. Each
Code body permits 1800 characters and 350 syntax elements, scalar statements and
the documented math functions. It receives input/time/sampleRate/p0–p3 and four
persistent scalar state values; it writes out. Loops, helper functions, imports,
arrays and host access are unavailable.

Parameter/layout/name changes reuse compilation. Controls smooth over about
12 ms; structural changes retain unchanged node state and crossfade for 10 ms.
Retrigger resets graph state and seeded noise. Compile failure leaves the applied
document and audio intact. A compile result cannot replace newer graph edits.
Unapplied drafts survive node selection within the session; successful code,
layout and parameters persist in the source, saved sounds and portable projects.
Project/patch import compiles graphs before committing the document. Live silences
non-finite samples and reports them; finite rendering rejects such output.

Live, WAV and Picture share CPU graph DSP. A graph owns synthesis/processing for
its source layer; source level, duration, offsets and mute still apply. Ordinary
sound-rack effects/unison do not process graph sources. Output is mono, Lowpass is
one-pole and sharp oscillator shapes are not band-limited. Feedback/delay networks,
subgraphs, sample-player nodes, stereo buses, parameter automation tracks and a
game-runtime graph export remain outside this implementation. Engine/compiler
pins and upstream runtime sources are unchanged.

The bounded English review covers graph menus, ports, node hints/properties,
parameter controls, code reference, compile/recovery messages and README workflow.
Desktop and 390 px screenshots were visually reviewed. It does not extend the
earlier imported-document or translation review.

Unit tests cover typed topology/cycles/limits, actual compiled-kernel block
independence, forbidden code, exact live-sized/finite PCM parity, parameter state
continuity, non-finite containment, state carry across recompilation and a noise
node introduced after playback starts. Browser checks exercise the real compiler,
AudioWorklet and render worker, PCM recording, successful/failed code swaps,
delayed compilation with an intervening edit, node drag/Undo/Escape, pointer and
keyboard connections, context actions, compile reuse, reload and invalid import.
Portable Picture projects render identical WAVs in a fresh browser context.
Canonical connection ordering keeps parameter slots stable when JSON properties
are reordered. Selected-clip graph edits and Undo preserve the independent source.

Local shader/TypeScript checks, 63 unit tests, the production build, CSS/scope
checks and all eight browser suites pass. The existing CPU/WebGPU, device-loss,
Tone persistence, imported-audio and timeline checks remain covered.

The compute benchmark runs the production worklet in Chromium 156 in a dedicated
worker, two trials per scenario, 500 warm-up and 6000 measured 128-frame blocks at
48 kHz. Impact and Tone have p99 costs of 0.1–0.2 ms; the 16-node/two-Code graph is
0.2 ms and four such layers are 0.3 ms. Timer resolution is about 0.1 ms. Across
48000 measured blocks, eight elapsed measurements exceeded the 2.67 ms block
duration; the maximum was 7.3 ms. These include scheduling pauses and are not
measurements of actual AudioWorklet underruns or hardware latency. They establish
bounded tested compute costs, not a hard real-time or arbitrary-program guarantee.

## Atomic Design and responsibility boundaries — 2026-11-06

The editor now separates atoms, molecules, feature organisms, workspace templates
and the Studio page. Each TSX module owns one named component. The former shell
is composed from individual menu, document, transport, tool and status components;
the workspace grid accepts panel slots. Timeline controls/handles, graph nodes,
connections, code editing, tooltips and context menus have individual owners.
Feature stylesheets replace the single workspace stylesheet, preserving cascade
order. The built CSS is byte-identical to the pre-refactor graph implementation.

The former useEditor controller now composes document, audio-session, sound,
Picture, asset, media and project controllers. One document hook owns the reducer,
revision and local persistence. One resource hook owns SoundEngine/SceneTransport
creation and cleanup. Selection, history, document projection and restoration are
separate modules. Playback generations and import/compile revision guards retain
their previous behavior, including independent source/clip Tone and stale-result
protection. No additional copy of the patch or scene was introduced.

Graph types, catalog, creation, recipes, validation, ordering, identity and
parameters are separated from compilation requests, module installation and DSP.
Compiler stages separately validate Code, emit source and call the pinned kernel
generator. The sound domain similarly separates patch definitions, presets,
validation, envelope sampling, delay, reverb, finite output and spectrum analysis.
Consumers import the owning module directly. The audio processing algorithms,
engine/compiler pins, file formats and graph limits are unchanged.

The architecture check runs in the app's check script. It verifies one named
component per TSX file, downward UI dependencies, props-based feature access for
primitives, document/domain isolation from UI, audio resource ownership, compiler
isolation and runtime import cycles. Unit checks exercise accepted type contracts
and rejected boundary violations. The editor architecture guide documents the
folder roles, state/resource owners, style order and extension workflow.

This bounded English review covers that guide, the updated application README and
the retained component labels/tooltips at the extraction boundaries. Existing
workflow instructions and diagnostic wording were retained because behavior is
unchanged. Desktop and 390 px graph/workspace screenshots were inspected. This
does not claim a new review or translation of imported engine documentation.

Shader/TypeScript and architecture checks, 65 unit tests, the production build,
CSS/scope checks and all eight browser suites pass. Browser coverage includes
actual CPU/WebGPU rendering, Live audio, graph compilation, Tone persistence,
context menus/tooltips, resize/drag/Undo, video transport, imported audio and
portable project/WAV round trips. This is behavior-preservation evidence; it adds
no new hardware-latency or real-time guarantee.

## Node workspace editing — 2026-11-06

The graph viewer now supports searching the node catalog, marquee and additive
selection, group movement/duplication/deletion, grid snapping and automatic DAG
layout. Search opens from Add node, empty-space double-click, Tab on the canvas or
Shift+A. Each result explains its purpose and category. Connected searches filter
incompatible nodes and expose capacity limits. New cards are placed near the
requested position without covering existing nodes. Recipes live in the toolbar
and restore a useful initial selection after replacement.

Ports accept pointer and keyboard connections in either direction. An occupied
input retains its applied wire until reconnection succeeds. Compatible targets
are highlighted; signal mismatches and cycles are rejected before compilation.
Dropping a cable on empty space opens a compatible search. Wires have a wider
pointer target, keyboard focus and context actions for disconnecting or inserting
a node. Selection, connection previews and search cancellation do not modify the
applied network. Group copies remap internal connections and retain external
inputs; group deletion protects Output. Each drag, insertion and group edit uses
the existing document history. Escape cancels a gesture. The code panel now
handles an empty selection after deletion or Undo.

Fit all / Home frames the network, Frame / F frames selected nodes, and wheel
zoom keeps the pointer's graph position fixed. Zoom buttons use the viewer center.
Middle-drag, Alt-drag and the Hand tool pan. Resizing and monitor switches retain
the session view, with memory bounded to 32 source owners. Grid density adapts at
low zoom; the responsive viewer has room for its toolbar and help text. Node
headers, connected/empty ports and wire selection have distinct visual states.

The Atomic Design boundaries remain in place. Selection, compilation, viewport,
gestures, connections, keyboard commands and search have separate controllers.
Ports, wires and view controls have individual component files. Pure graph
operations and UI placement are separately tested. The compiler, audio processing
loops, file format, engine/compiler pins, 16-node limit and two-Code limit are
unchanged. Subgraphs, stereo routing and arbitrary feedback remain unimplemented.

The bounded English review covers node search/results, toolbar and wire menus,
selection properties, connection hints, keyboard help, limits and the updated
README/architecture guide. Desktop and 390 px screenshots were inspected. This
does not extend the imported-document or translation review.

Validation includes shader/TypeScript and architecture checks, 72 unit tests and
nine browser suites. New coverage exercises actual pointer/keyboard search,
marquee and group gestures, internal-wire copying, Output protection, wire
selection/context insertion, reconnection cancellation, invalid-target feedback,
connected creation, compilation reuse, history, view retention and mobile bounds.
The existing graph suite verifies real Live/finite/Picture audio and stale compile
protection; the wider suites retain Tone, imported audio, timeline and CPU/WebGPU
regressions. This change makes no new real-time or device-latency claim.
