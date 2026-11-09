# TypeShade composition editing

Status: implemented and locally verified, 2026-11-07. Continues Web PR #47 and engine PR #30.
Application checkpoint: `479fb60dae42e06411406d0063a7fc8f21d65c20`.
Engine source: `5489ac494e69b5eb2dfae63546cc7643ecfea0f0`.
Compiler pin: unchanged `87af4eb0d9d15f02b66b8341b72cab0944290472`.
Previous handoff: Web `bc38b0160e4cad7986ae241da085924cf35d5a67`.

## Delivered behavior

The existing Network source tab contains genuine TypeShade imports, explicit state/context arguments,
typed function calls and a returned output. Each call corresponds to an instance on the canvas.
Opening the tab reveals the selected call. The node context menu also locates a call in its composition.
Go to Definition opens its processing module. Completion and diagnostics use the same TypeShade language service.

Editing a call can change connections, constants, instances or the output. Visual edits project back into applied source.
Stable annotations keep node identity separate from local variable names. The engine validates syntax, language types,
state ownership and audio connection metadata before the graph and composition enter one document transaction.
The source view supports static `const` calls and a final return; full processing loops and conditions remain in function modules.

Projection preserves unrelated helpers and comments. Comments inside replaced arguments or deleted managed declarations
can move beside their enclosing statements. State classes used in the composition signature must be exported.
Private state classes remain valid for ordinary node playback. The editor explains when composition projection is unavailable.

Pin settings include **Source parameter** and **Rename input**. TypeShade symbol edits update the parameter and its references.
The definition keeps its stable pin ID and every instance's bindings. Compatible state survives preparation.
Unapplied drafts must be applied or reverted before this separate rename operation.

## State and persistence

Empty and unsupported composition edits stay in drafts. Failed preparation retains the applied sound.
Dirty drafts survive visual projection and Undo. A source conflict requires **Keep this draft** or **Revert file**.
Keeping a draft adopts the latest comparison base; applying it then applies the connections written in that draft.
Late results still check document ownership, epoch, graph, composition and any layout they replace.
Newer typing survives preparation. Named-control changes cannot be rolled back by an older result.

Comment-only composition changes retain the original graph bindings and node order.
`audioPatch` excludes composition text and canvas layout, so these edits do not invalidate rendered audio or update Live.
Automatic draft rebasing uses `reconcileDrafts`, separately from newer user typing and document edits.
It can follow applied source without cancelling an in-flight project import. Actual user edits retain the stale-import guard.

Composition text is authoring data in `Patch.functionComposition`. The engine function-graph format remains version 1.
Projects with composition source or drafts use version 4. Composition sound files use version 3; browser envelopes use version 3.
Function projects without composition keep version 3; earlier projects retain their source semantics.
Import validates that applied composition describes the same graph before replacing the current document.

## Verification and review

At the application checkpoint, compiler/type/architecture checks and 108 unit tests across 21 files passed.
The architecture check covers 226 modules and the compiler-pair guard passes.
The production build and all 17 browser suites passed at the same application checkpoint.
The [machine-readable receipt](typeaudio-composition-verification.json) records exact versions, commands, PCM hashes and screenshots.

The composition suite checks code/node changes, comments/helpers, connected rename and Undo/Redo,
TypeShade completion/definition navigation, comment-only Live continuity, empty/invalid drafts,
conflict resolution, newer typing/controls during delayed preparation, version-4 save/reopen and browser reload.
The regenerated WAV matches the applied revision exactly, despite an invalid saved draft.
A mismatched applied composition is rejected before replacing current work.
Mobile checks cover 320/390-pixel viewports, Network access and visible transport.

The browser harness copies the actual Monaco selection through the clipboard; its hidden textarea abbreviates long selections.
It pastes whole modules as one edit to avoid repeated typing indentation. No test-only editor API is exposed by the product.

The bounded English review covers the Network entry, call-location action, rename form, conflict instructions and format errors.
Screenshots are inspected at desktop and emulated mobile widths. This is not site-wide editorial or translation acceptance.
The engine passes 119 tests and actual AudioWorklet comparison over 16,384 frames with maximum PCM error zero.
Existing CPU fallback, Bun moduleSuffixes and bundle-size warnings remain.

## Remaining scope

Reusable subgraph packaging, event scheduling through E2d/R1, native/Unreal execution and GPU function processing remain open.
This first function profile has mono CPU output and scalar pins/state. Individual controls are not automatically smoothed.
Composition playback still prepares audio. Physical-device deadlines, phone hardware behavior and listening acceptance remain unverified.
No merge or production deployment is included. Review the existing stacked PRs before authorized publication.
