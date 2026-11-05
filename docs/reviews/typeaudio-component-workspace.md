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
adapter/browser metadata and phase timings; hardware GPU mode is the default,
and forcing software requires `TYPEAUDIO_BENCH_SOFTWARE_GPU=1`.

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
