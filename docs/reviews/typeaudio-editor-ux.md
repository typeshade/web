# TypeAudio editor: first-milestone UX review

Reviewed 2026-11-07 against Web PR #47, implementation `fad1cd07fb516d7eb1b2dc949c617606d4cdad45`.
Scope: fresh entry, opening an agent project, finding/editing a layer, audition context,
project export, switching candidates and desktop/mobile layout in the local production build.
This is a browser walkthrough and source review, not a study with independent users or a production-site audit.
No application behavior was changed during this review.

The workflow needs correction before UX acceptance. Previous functional checks established
that operations can run. They did not establish that users can find the controls, reach them
with normal pointer scrolling or understand what is saved and what they are hearing.

## Reproduced findings

| ID | Priority | Observation | User consequence | Required correction |
| --- | --- | --- | --- | --- |
| U01 | P0 | At 1680×1050, the selected clip's Properties panel is 503px high with 1574px of content and hidden overflow. Its body has visible overflow. The enclosing inspector has no scroll range. An 800px wheel input does not move either container. | `Edit sound`, source position and further controls are clipped. A pointer user cannot reach the main editing action through ordinary scrolling. | Give the Properties content one real scroll owner. Keep the selected layer's name and Edit sound action visible. Collapse secondary timing/trim sections. |
| U02 | P0 | Open red A, rename its first layer, then open red B. The name is replaced without a dialog, Undo is disabled and the renamed value is absent from local storage. | Trying another candidate can discard the current edited copy. A/B labels encourage exploration without protecting that work. | Checkpoint the current editable copy before switching; provide recovery. Previewing a candidate must not replace the working project. |
| U03 | P0 | Change a Code node without Apply, then File → Export project. The download omits the draft and the notice says `Project exported.` No export-specific prompt appears. A draft warning exists in the code panel. | Users can mistake saving the project for saving everything they typed. The current saved-in-browser indicator does not explain this distinction. | Persist applied source and drafts as distinct project state, or explicitly resolve/include pending drafts during export. Keep project save separate from applying audio code and exporting WAV. |
| U04 | P1 | Fresh entry opens the Warm lead synth. Projects is a small tab; at 390×844 it begins at page Y=886, outside the first viewport. | A user arriving to inspect agent output is sent into a synth setup and must discover the project entry point. | Offer Open project and recent/agent projects at entry. A project link should enter its composition directly. Keep New sound as a separate entry action. |
| U05 | P1 | A red project occupies 3535px vertically at 390×844. `Edit sound` is near page Y=2172. After opening the project the page remains scrolled and the transport is outside the viewport. | Users repeatedly scroll between listening, choosing a layer and editing. Fitting the page width does not make this an effective mobile editor. | Keep transport and project identity fixed. Use mobile panels for Listen, Layers and Edit, with one active detail panel and deliberate focus/scroll restoration. |
| U06 | P1 | Composition playback, Edit sound, Sound live preview and returning to Picture are distributed across different workspaces and control locations. The source/project relationship appears in small labels. | Users lose the scene context and can be unsure which layer or nested source they are modifying. | Preserve a visible project → layer → source breadcrumb and composition transport. Open detailed node/code editing as a contextual view with an explicit return path. |
| U07 | P1 | Single-layer Audition plays the dry source; Picture playback uses the room mix. The dry distinction appears in a status notice. | The same source can sound different between editing and composition playback without a prominent explanation. | Label audition scope beside playback: selected layer or full composition, with room enabled or dry. Show pending preview state beside the transport. |
| U08 | P1 | Project cards offer Open A and Open B with the same passage description. The variant's design description appears only after opening it. | Users cannot predict which candidate they want or audition them safely before replacing work. | Show a short sound-character description for each candidate; add non-destructive preview and an explicit Open editable copy action. |
| U09 | P2 | Save sound, Export, Export edited project, File → Export project, Export WAV and a saved-in-browser dot coexist. | The save destination and whether the action covers a source, project or rendered audio require interpretation. | Use explicit scopes: Save project, Export audio and Save source preset. Show saved location, pending drafts and unsaved changes in one document-status area. |
| U10 | P2 | The initial desktop contains dense technical controls while the large center is an empty monitor/reference. Common labels are 9–11px; mobile transport buttons are about 26px high. The mobile node network initially fits into very small cards. | Visual emphasis does not follow the first task. Small targets and labels increase touch and reading effort. | Make the current task and selection prominent. Show a small set of useful sound controls first; place node/code detail behind an explicit action. Increase mobile touch targets and primary-label sizes. This is not a formal accessibility conformance finding. |

P0 blocks the first milestone's safe, reachable editing flow. P1 disrupts the main workflow.
P2 improves clarity and comfort after the blocking behavior is corrected.

## Evidence and reproduction

The [observation receipt](typeaudio-editor-ux-observations.json) records viewport dimensions,
element positions, natural-scroll results and the two state/export reproductions.
Chromium was headless, version 154.0.8037.57 on Debian 13. The mobile viewport used touch/mobile
emulation; no physical-phone or screen-reader testing was performed.

For U01, open Projects → Red containment → Open A at 1680×1050. Place the pointer over
Properties and wheel down. Check the actual scroll offsets and rendered visibility.
Playwright's `locator.click()` automatically scrolls hidden-overflow ancestors when necessary;
its success did not establish that ordinary pointer scrolling could reveal this button.
The Project browser itself does scroll normally; the reproduced defect concerns the clip inspector.

For U02, rename the active layer to `MY EDITED LAYER`, then Open B. Inspect the layer,
Undo availability and the stored document. Do this in an isolated browser profile.

For U03, add a unique comment to the material Code node and leave it unapplied.
Export the project through File. Search the JSON for the comment. The existing before-unload
guard protects navigation with dirty drafts; it does not include those drafts in project export.

Relevant implementation:

- Inspector sizing and overflow: `apps/typeaudio/website/editor/styles/layout/panels.css` and `styles/molecules/panel.css`.
- Project replacement: `editor/hooks/project/useProjectFiles.ts` and `editor/state/documentReducer.ts`.
- Saved-state display and actual persistence: `editor/components/molecules/chrome/DocumentBar.tsx` and `editor/hooks/document/useEditorDocument.ts`.
- Code draft ownership: `editor/hooks/code/useCodeDocuments.ts` and `components/organisms/graph/GraphCodeEditor.tsx`.
- Mobile layout: `editor/styles/layout/responsive.css` and `editor/templates/WorkspaceGrid.tsx`.
- Audition and composition preparation: `editor/hooks/picture/useSceneSession.ts`.

The root for abbreviated paths above is `apps/typeaudio/website/`.

## Proposed user flow

1. Open an agent project and land in its composition, with project identity and saved state visible.
2. Play the authored range using a persistent transport.
3. Select a layer in the timeline and adjust its primary sound controls beside the composition.
4. Open nodes/code only when deeper editing is needed; retain the selected layer and playback context.
5. Hear the edited range with an explicit audition scope and preview-update status.
6. Save the editable project, including draft work. Export audio through a separate action.

Desktop should retain the composition and timeline as the working context. A selected layer's
essential controls belong at the top of the inspector. Nodes and code can occupy a dock or
expanded contextual view. The existing resizable panels and shared source model are useful
foundations; this review does not require a new website or a replacement sound engine.

Mobile should expose the same project through task panels, with transport always reachable.
Do not simply stack every desktop panel. Tooltips can explain optional details; essential
action meanings, ownership and save status must remain visible without hover.

## Order of work and acceptance

1. Fix U01–U03: reachable editing, recoverable candidate switching and explicit draft/save semantics.
2. Fix U04–U08: project-first entry, persistent playback, contextual layer editing and safe A/B preview.
3. Address U09–U10: consistent save vocabulary, visual hierarchy, readable labels and touch targets.

Verify the complete task using ordinary clicks, wheel/touch scrolling and keyboard access.
Do not use programmatic scrolling to establish reachability. Ensure candidate preview/replacement
cannot silently lose edits, and reopening a saved project restores applied source and retained drafts.
The mobile user must reach play/pause and return to the selected layer without traversing the full page.

Then observe independent users opening a supplied project, finding a named layer, changing its
sound, comparing the result and saving/reopening it. Record completion, wrong turns and points
where an explanation was needed. No such user-study result is claimed here.

## Release status at the audit checkpoint

PR #47 remains a draft and has not been deployed. The latest observed studio CI run,
[42316613497](https://github.com/typeshade/web/actions/runs/42316613497), failed the code-language
rename assertion at the implementation head. The root cause is not established by this UX review.
Earlier local functional passes remain local evidence; they do not mean the current CI is green.
Resolve that failure and the P0 findings before treating the first milestone as ready for release.


## Approved implementation follow-up, 2026-11-07

The owner approved the corrections. Web PR #47 now contains them in the existing
application. Application build `554cd538ee25b5cf9a32ebf706dd78bfd839550e` is the local
verification baseline. The [verification receipt](typeaudio-editor-ux-verification.json)
separates that build from earlier regression runs and records the remaining limits.

| Finding | Implemented correction | Verification |
| --- | --- | --- |
| U01 | Properties has a scrollable body. The selected layer and Edit sound stay in the panel header; mobile property headers stick during scrolling. | An actual wheel input moved the 465px body through 1602px of overflow. The editing action remained inside the viewport. |
| U02 | Opening another project first saves a recoverable copy. Saved copies is near the project entry actions. A failed checkpoint blocks replacement; referenced imported audio is protected from deletion. | Edited A → B → recovered A retained both applied source and its draft. Injected quota failure left current work intact. |
| U03 | Project version 2 retains applied sounds, independent source, selection and unapplied Code buffers. Ctrl/Cmd+S saves that file; Ctrl/Cmd+Enter applies code. | An incomplete draft survived file export, a fresh browser context, reload and candidate recovery without changing executable code. File save also rescued current edits while browser storage was blocked. |
| U04 | Projects is the initial browser tab, with visible Open project, Save project and New procedural sound actions. Allowlisted `?project=` links enter their composition through the same protected import path. | Fresh entry exposes Open project; a direct red-A link opened Picture with its authored layers. |
| U05 | Listen, Layers, Edit and Projects replace the narrow-screen page stack. Project identity and playback stay outside the panel scroller. | Every task at 320×844 and 390×844 kept a 44px Play target visible; document dimensions matched the viewport. |
| U06 | Source editing opens inside Picture with a layer/source breadcrumb, an explicit return, and the composition transport and timeline retained. Primary parameters are also available directly in layer properties. | Parameter/code edits, selected-layer identity, timeline visibility and contextual node framing passed. |
| U07 | Transport labels identify composition/room playback, dry-source audition and pending mix preparation. Candidate preview has its own visible preparing/playing state and Stop action. | Preview, full composition and dry-source actions retain separate scheduling paths; ordinary playback and prepared stereo tests passed. |
| U08 | Each A/B candidate has a sound-character description, disposable preview resources and a separate Open copy action. | Playing or stopping a preview changed neither the document nor saved copies. Cancelling pending preparation did not start it later. |
| U09 | Save project file, Save preset, Save sound file and Export mix/sound WAV name their scope. The document bar reflects actual browser writes and pending drafts. | Ctrl/Cmd+S from both code and a name field downloaded a project; blocked browser writes showed Not saved. |
| U10 | Primary property labels are larger; mobile playback, property, asset and task controls have larger targets. Essential sound controls precede deeper node/code editing. | Screenshots were inspected; native inspector scrolling and contextual node bounds passed. This is not a complete accessibility audit. |

The previous CI rename assertion read the editor immediately after the rename box
closed. The language worker can still be resolving the rename at that point. The
browser test now injects 500ms of worker latency and waits for the exact resulting
draft before asserting the renamed text. It retains the exact-text assertion and
checks that analysis has not modified applied source. The local language suite passed.

Local checks passed: compiler/type/architecture checks, 92 tests in 18 files,
production build, all 13 existing browser suites and the new UX suite. The receipt
records which checks used `57b0492` and which reran after the UI refinements at
`554cd53`. Initial legacy-test failures expected Sound after Edit sound or assumed
the Sounds browser tab remained open after reload; tests now follow the explicit
contextual editing and Projects entry flow. Audio/state assertions were retained.

Remaining review concerns are independent-user task observation, physical-phone
keyboard/audio behavior and broader accessibility coverage. Secondary controls and
advanced node editing still need that usability feedback. The six passages remain
subject to listening review. The implementation has not been merged or deployed;
check the PR's current CI, reconcile its stack, and obtain publication authorization
before treating the production site as updated.
