# All-site content review

Current deployment and repository ownership are recorded in
[repository-migration.md](repository-migration.md). The owner subsequently authorized the
CI/CD cutover; PR #7 and its predecessors are merged, and all three sites are deployed from
this repository. Branch, draft and authorization statements below describe the earlier review
phase, not the current operational state.

## Owner request

Review every published surface of TypeShade, TypeNN, TypeCV and the shared UI. Establish English
copy using Blend2D, React, Vue, MapLibre and Mapbox as references, then translate into Korean.
See [AGENTS.md](../AGENTS.md) and [content-style.md](content-style.md).

The owner specifically requested Luna subagents. This all-site review and local validation
are complete. The coverage and existing language boundaries below distinguish this work
from the earlier narrow TypeShade home/entry-page revisions.

The subsequent template and rendering work is recorded in
[maintenance-followup.md](maintenance-followup.md). Page layout and copy ownership is mapped
in [page-templates.md](page-templates.md).

## Working state

- Repository: `typeshade/web`.
- Branch: `fix/typeshade-home-navigation`.
- Existing draft: [PR #7](https://github.com/typeshade/web/pull/7), stacked on #6.
- Last committed revision before this pass: `bec5d19`.
- Current work includes English-first copy across all three sites, Korean translations,
  shared editorial policy, code highlighting and corrections to imported documentation.
  Integrated local validation is complete; GitHub checks for the new revision are not yet verified.
- No merge or production deployment is authorized by this review alone.

## Assigned scope

| Area | Owner | Status |
| --- | --- | --- |
| TypeNN pages, UI, errors and metadata | Luna: typenn_content | [Reviewed and verified](reviews/typenn-content.md) |
| TypeCV pages, UI, errors, metadata and imported documentation | Luna: typecv_content | [Reviewed and verified](reviews/typecv-content.md), including source-revision guards |
| TypeShade main English/Korean dictionaries | Luna: shade_main_copy | [Reviewed](reviews/typeshade-main-copy.md), including generated language and example descriptions |
| TypeShade concept/function/operation/precision lesson dictionaries | Luna: shade_lessons | [Reviewed](reviews/typeshade-lessons.md) |
| TypeShade generated API English and Korean translations | Luna: shade_api, shade_documents, shade_lessons | All 518 entries reviewed in three ranges; source corrections integrated |
| TypeShade guide/reference documents and other published copy | Luna: shade_documents | [Reviewed](reviews/typeshade-documents.md), including 89 diagnostics and 124 design rules |
| Shared UI, policy, inventory, integration and verification | Main agent | Complete |

The linked reports record the files/surfaces actually read, changes, retained content and
its rationale, validation and language boundaries. Future updates must provide the same
evidence; a pattern search alone is not a completed prose review.

The separate [TypeAudio editor UX review](reviews/typeaudio-editor-ux.md), dated 2026-11-07,
covers the editable-project flow on Web PR #47. It records browser reproductions, interaction
and label findings, unresolved release blockers and a proposed task flow. It is not a new
all-site editorial pass, translation review or study with independent users.

API range evidence: [1–200](reviews/typeshade-api.md),
[201–359](reviews/typeshade-api-documents-range.md),
[360–518](reviews/typeshade-api-lessons-range.md).
Shared UI evidence: [review](reviews/shared-ui.md).

## Additional owner request

Backtick-delimited code must receive appropriate TypeScript highlighting. Luna `shade_lessons`
owns the rendering investigation and shared implementation, coordinating with the TypeCV
documentation loader. Check inline code and fenced blocks, light/dark themes, escaping,
and preservation of other explicitly declared languages. The implementation covers the
TypeShade `Rich.astro` dictionary renderer as well as Markdown, TypeCV's Astro documentation
renderer and TypeNN inline expressions. See the [independent integration review](reviews/highlighting-integration-review.md).

## Existing language boundaries

TypeCV's imported documentation has been reviewed, including 16 Markdown documents and 14
JSON evidence records. Its Korean documentation entry currently links to explicitly identified
English documents; this pass does not claim those documents were translated. Browser/runtime
exception details retain their original diagnostic wording beneath localized UI messages.
TypeShade compiler-generated language-reference excerpts, diagnostic registry and design rules
also retain explicitly identified English source text; their surrounding site copy is translated.

## Validation of the editorial revision

The following results describe the completed editorial revision, not the later upstream
source reconciliation. The newer pins, imported TypeCV lab features and migration checks
are tracked in [repository-migration.md](repository-migration.md).

The editorial revision `c62f78e` also passed all five jobs in GitHub Actions run
[40454514084](https://github.com/typeshade/web/actions/runs/40454514084): controls, scope,
TypeShade, TypeNN and TypeCV. Follow-up revision checks are recorded separately.

- Shared UI: `pnpm check:ui`, `pnpm build:ui`, `pnpm test:controls`,
  `pnpm test:patterns` and `pnpm test:styles` passed on this working tree. Browser tests
  cover keyboard/focus behavior, forms, disclosures, tooltips, themes, accessibility,
  reduced motion, forced colors and widths from 320 to 1440 pixels.
- TypeNN and TypeCV application checks and builds passed (17 and 39 pages). TypeCV's three
  link/rendering tests passed. TypeNN's 8 dataset and 12 graph tests passed.
- Root `pnpm test:ui apps/typenn/dist apps/typecv/dist` passed with final rendered copy and
  highlighting: EN/KO, desktop/mobile, hydration, persisted themes and accessibility.
  Built stylesheet ownership checks also passed for both sites.
- Shared `pnpm test:code` passed; the TypeCV Marked integration test verifies real token HTML
  and selectable text rather than Promise output.
- TypeShade full build completed and Pagefind indexed 2,486 pages in two languages. Root
  browser smoke, built stylesheet ownership and 16 entry-route checks at 320/390/1440 pixels
  passed, including preserved introduction anchors, inline-code theme colors and the corrected
  SD0030 guide link. Screenshots were inspected. Worker routing and the 50-page OpenSEO crawl
  passed. After correcting four metadata lengths, the final full build and SEO check passed:
  2,606 HTML pages and 2,486 sitemap entries. The rendered reference-note check also passed.
- TypeShade: 94 compiler/runtime/reference/editorial tests and 11 Playground boundary tests
  passed, as did the benchmark/regression catalogs and final TypeScript check.
- No vendor source or dependency pin was changed. The shared Shiki dependency was added
  explicitly, and installation passed with pnpm 10.28.2 and the frozen lockfile.

## TypeAudio studio addition

The new TypeAudio application has a bounded English UI review and local audio/browser
validation recorded in [TypeAudio studio integration](reviews/typeaudio-studio.md).
The original three-site review and production ownership above are unchanged.

The video scene studio follow-up has a separate bounded English UI review and
actual local-video/PCM browser checks in the same TypeAudio review record. No
new translated or full imported-document review is claimed by this addition.

The subsequent [component workspace review](reviews/typeaudio-component-workspace.md)
records the owner-directed Photoshop/After Effects layout and interaction redesign,
its component boundaries, reviewed English surfaces and validation scope.

The same record now includes the Live CPU kernel and measured computation changes,
with the distinction between worker benchmarks and device/game real-time behavior.

Its finite-render follow-up records resident output batching, worker/device reuse,
timing definitions and explicitly identified software-GPU comparisons.

The component record also covers the editor interaction pass: shared context menus
and tooltips, direct numeric editing, gesture history, persistent panel sizes and
timeline manipulation. Its English review is limited to those changed surfaces.

The procedural sound pass adds reviewed English for source layers, FM/noise/custom
waves, automation, live recording and the CPU render boundary. Its component review
record identifies implemented behavior, synthesis limits and compute-only evidence.

The timeline editing follow-up records source trim/fade controls, split continuity,
multiple selection, context actions and shortcuts. Its bounded English review and
preview/WAV validation are in the same component workspace record.

The audio-file follow-up covers the Audio library, imported clip properties,
portable project files and recovery messages. Its bounded English review and real
file/storage/PCM checks are recorded in the component workspace review.

The node-graph follow-up adds reviewed English for procedural graph editing,
TypeShade Code nodes, exposed parameters, compile/recovery messages and the
in-editor code reference. The same component record describes the implemented
limits, actual browser audio checks and measured graph computation.

The Atomic Design refactor has a bounded review in that same record. It covers
the editor architecture guide and revised README, retained UI wording, component
and controller boundaries, unchanged compiled CSS and browser regression evidence.

The node workspace follow-up adds a bounded English review for searchable node
creation, multi-selection, connection editing, framing and keyboard help. Its
component review records pure edit-operation tests and real browser gesture,
audio and persistence coverage.

The code workspace follow-up adds a bounded English review for Monaco Code
node documents, draft/conflict recovery, split layouts and command/quick-open
search. The component record documents the scalar-language and session-only
draft limits, resource boundaries and real editor/audio regression coverage.


The cross-repository feedback follow-up moves graph execution into TypeAudio and
adds one English File command, **Export graph reproduction…**, plus its result
message. The wording names an applied graph snapshot and excludes layer mixing,
prior edits and playback timing. No translation or broader imported-content review
is claimed. The TypeAudio README records reproduction and compiler proposal limits.

The TypeAudio language-editor follow-up reviews the English Sample code context,
input/state descriptions, live Problems panel, analysis retry and Focus code action.
The wording distinguishes TypeShade language diagnostics from the narrower audio-node
execution contract and explains when drafts reach playback. Browser coverage checks
completion, live errors, navigation/rename, stale results and continued AudioWorklet
progress. This is a bounded studio UI review, not a broader site or translation review.


The approved TypeAudio UX follow-up reviews the English project entry, Saved copies,
variant preview, contextual source breadcrumb, playback scope, browser-save status
and mobile task labels. Project save includes unapplied drafts; Apply code and WAV
export remain separate actions. The bounded implementation and its actual browser
verification are recorded in [the editor UX review](reviews/typeaudio-editor-ux.md).
No site-wide, translation, physical-device or independent-user acceptance is claimed.

The subsequent [node/code relationship review](reviews/typeaudio-node-code.md) covers
selection-linked sample documents, built-in settings, actual connection/parameter
descriptions and read-only generated output. The bounded English review names the
per-sample execution contract and avoids implying whole-graph TypeScript authoring.
The default example uses meaningful local names while retaining identical rendered PCM.

The function-authoring continuation reviews the English function/network/source panels,
New function sound entry, named controls, typed pin settings and compiler-failure messages.
The wording distinguishes complete modules from the legacy per-sample Code node.
Apply source compiles all edited modules together; project save preserves incomplete drafts.
The labels identify the mono CPU profile and independent instance state.
This is a bounded English studio review. It does not claim site-wide, translation,
physical-device or independent-user acceptance.
