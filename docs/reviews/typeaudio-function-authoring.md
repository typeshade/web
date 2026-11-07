# TypeAudio function authoring in the existing editor

Status: historical E2b checkpoint, implemented and locally verified on 2026-11-07.
The later [composition continuation](typeaudio-composition-editing.md) adds Network source and connected-input rename to Web PR #47.
Application checkpoint: `6c9f0838f297cbcea684fbe1b8577624f879dee2`.
Previous Web baseline: `63216066bb8a2109d0c7e5b6286500b04ab39cb0`.
Engine: TypeAudio `346efb4cbe7d0c288b919c6155e96ffd9bda292d`, PR #30.
Compiler: unchanged `87af4eb0d9d15f02b66b8341b72cab0944290472`.

## Delivered behavior

The existing studio opens agent-authored function graphs, composes reusable instances,
edits complete TypeShade modules, auditions the result and saves/reopens source and drafts.
TypeShade owns language types and import resolution. TypeAudio owns audio metadata, connections and execution.
The editor uses their descriptors rather than introducing another processing language.

**New function sound** opens excitation → resonator → gain in the existing Sound workspace.
**New function** creates a complete module with an initializer, private instance state, time and sample-rate context.
Users can replace its processing body with synthesis code and choose it as the output.
The function list adds reusable instances. Each instance owns separate state and shares its source definition.

The canvas supports pointer connections, strict pin compatibility, duplicate/delete, context menus,
keyboard movement, pan/zoom, framing, drag cancellation and Undo/Redo.
The inspector selects constants, named controls or compatible node outputs.
Pin settings edit role, update rate and units for every instance of a definition.
Deleting a source disconnects its dependents; the current output requires choosing another output first.

Source tabs contain full modules, including imported helpers. Monaco provides TypeShade diagnostics,
completion and navigation across those files. The existing command palette includes modules and source actions.
Apply source prepares all edited files together. New scalar arguments become typed control pins.
Existing names keep stable IDs and authored metadata. Removing wired or exposed parameters fails before replacement.
State/context mappings and entry names remain explicit; automatic connected-parameter rename is not implemented.

The same source enters Live, finite rendering, layers and Picture composition editing.
Compilation runs in a Worker before generated modules are installed. Named control updates retain instance state.
Function source changes use the existing replacement crossfade. The source adapter ramps output gain and applies the existing source taper.
Canvas positions do not change audio identity, send Live updates or invalidate a rendered sound.

## Preservation and ownership

Applied source and incomplete drafts remain separate on the existing document store.
Failed preparation preserves the applied sound. Late results check source ownership, document epoch and current graph identity.
Operations that also replace layout check its revision. Source-only operations preserve newer canvas positions.
Typing during preparation retains the newer buffer. Undo conflicts require an explicit keep/revert choice.

Project version 3 includes function source, instance bindings, named values, node positions and module drafts.
Legacy projects retain their source semantics and version 2. The importer still accepts older scene/version-1 formats.
Raw engine `typeaudio.function-graph` documents use the protected project import flow.
The bundled example is also available through `?project=function-impact`.
Function sound files use version 2. Local browser envelopes use version 2 and do not update legacy mirrors for function documents.
Saved project files remain the portable recovery mechanism.

Audio domain modules live in `website/functions/`. Feature controllers live in `editor/hooks/functions/`.
Scalar fields are atoms; pins, bindings and edges are molecules; the canvas, inspector and code dock are organisms.
One TSX file owns one component. The architecture check also prevents compiler imports in editor/audio runtime modules.
The engine source-edit API and its registry refresh fix are in TypeAudio PR #30.

## Verification

The [machine-readable receipt](typeaudio-function-authoring-verification.json) records exact commands and results.
At the application checkpoint, compiler/type/architecture checks and 102 unit tests passed.
The architecture check covers 223 modules and the compiler-pair guard passes.
The production build and all 16 browser suites passed at that same application checkpoint.
Existing CPU fallback, Bun moduleSuffixes and bundle-size warnings remain.

The new browser suite checks real AudioWorklet progress during named control edits,
node movement/Undo, instance reuse, wiring and cycle rejection, full source edits,
new reflected pins, helper definition navigation and completion, and synthesis from a fresh module.
It injects an invalid draft and delayed compilation, verifies recovery after reload and file reopen,
and compares the regenerated edited WAV hash. It also tests contextual Picture editing,
raw engine import and 320/390-pixel mobile task panels with visible playback.
CI stores desktop/mobile screenshots and a JSON receipt under the function-authoring artifact directory.

The engine continuation passes 110 unit tests and all eight CI jobs at `346efb4`.
Actual AudioWorklet output still matches host PCM over 16,384 frames, with maximum error zero.
The earlier benchmark receipt is historical; no new device-performance claim is made here.

## Remaining scope

This delivers E2b and the source-edit/draft/file-preservation portion of E2c.
Graph-wide composition code, reusable subgraphs, explicit connected-port rename/migration operations,
event scheduling and native/Unreal integration remain separate work.
The first function profile has scalar pins/state and mono CPU output. GPU function processing and aggregate/stereo pins are not implemented.
Controls do not receive automatic smoothing; authors can implement smoothing in function state.
Composition playback still prepares audio before playback. Hardware deadlines, physical-phone behavior,
listening approval and independent-user observation remain unverified.

No merge or production deployment is included. Review the existing Web and engine PR stacks before publication.
After authorized publication, repeat the same workflow on `audio.typeshade.dev`.
