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

| Area                                                               | Owner                                           | Status                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| TypeNN pages, UI, errors and metadata                              | Luna: typenn_content                            | [Reviewed and verified](reviews/typenn-content.md)                                                |
| TypeCV pages, UI, errors, metadata and imported documentation      | Luna: typecv_content                            | [Reviewed and verified](reviews/typecv-content.md), including source-revision guards              |
| TypeShade main English/Korean dictionaries                         | Luna: shade_main_copy                           | [Reviewed](reviews/typeshade-main-copy.md), including generated language and example descriptions |
| TypeShade concept/function/operation/precision lesson dictionaries | Luna: shade_lessons                             | [Reviewed](reviews/typeshade-lessons.md)                                                          |
| TypeShade generated API English and Korean translations            | Luna: shade_api, shade_documents, shade_lessons | All 518 entries reviewed in three ranges; source corrections integrated                           |
| TypeShade guide/reference documents and other published copy       | Luna: shade_documents                           | [Reviewed](reviews/typeshade-documents.md), including 89 diagnostics and 124 design rules         |
| Shared UI, policy, inventory, integration and verification         | Main agent                                      | Complete                                                                                          |

The linked reports record the files/surfaces actually read, changes, retained content and
its rationale, validation and language boundaries. Future updates must provide the same
evidence; a pattern search alone is not a completed prose review.

The separate [TypeAudio editor UX review](reviews/typeaudio-editor-ux.md), dated 2026-11-07,
covers the editable-project flow on Web PR #47. It records browser reproductions, interaction
and label findings, unresolved release blockers and a proposed task flow. It is not a new
all-site editorial pass, translation review or study with independent users.

The owner subsequently approved the [Frieren editable-study publication](reviews/typeaudio-frieren-publication.md).
That record covers the six passage projects, their release boundary, a reproduced
shared-tooltip defect, and the production verification; it is not a full-scene mix approval.

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

The composition continuation reviews the English Network tab, call-location action, input rename form,
source-conflict recovery and version-mismatch messages. Wording distinguishes static composition calls
from full processing bodies and explains the effect of keeping a conflicting draft.
The [bounded review](reviews/typeaudio-composition-editing.md) records actual browser and source-preservation checks.
This does not extend the earlier site-wide editorial scope or claim translation, listening or physical-device acceptance.

The compiler pin move to `34cea187` (PR #52, 2026-11-10) changes TypeShade copy in English and
Korean: the stage attribute wording that replaces "stage call", the entry attribute types, the
parameter qualifiers, the loop diagnostics, the fuse report, the host resources section of the
quick start, three paragraphs of the WebGPU and WebGL2 page (host resources, failed `Resident`
contents, the CPU `sin` and `cos`), four attribute lessons, 27 Korean API reference entries, 12
Korean guide sections and the record `apps/typeshade/compiler-changes.md`. The agent that made the
change wrote the English first and translated it, and verified each technical statement against
the pinned compiler.

Editorial review of PR #52. An independent agent of the same session reviewed commit `8fc5577`.
This is a deviation from the Luna review this file names; the owner chose it on 2026-11-10. It
reported 2 blocking findings, 11 should-fix findings and 7 notes. Applied: B1, B2, S1 to S11, N1,
N2, N3 and N7. N4 and N6 are older than this change and stay. The mapping tables now refuse a
source cell that the pinned compiler's `migrateSource` would rewrite
(`apps/typeshade/src/lib/target-mapping.ts`).

- Covered by the reviewer: the changed keys of `en.ts` and `ko.ts`, the quick start, the mapping
  tables, `compiler-changes.md`, the Korean guide sections `control-flow` and
  `functions-and-entry-points` in full, seven other sections in their changed blocks.
- Not covered by the reviewer: `emitting-and-reflection`, `conditional-programs` and
  `production-emit` beyond their code, `content/guide/ko/rules.json`, 22 Korean API entries in
  full, the programs of `src/lib/error-codes.ts`, anchors and layout.
- Covered by the authoring agent after the review: the other ten Korean guide sections, by a
  register pass (plain endings made polite) and a comparison of each Korean sentence that states
  a requirement or an absolute against its English block. This is not a full reading. Three
  Korean sentences state a duty where the English describes or conditions
  (`capabilities-extensions` "두 제한을 고려해야 합니다" and "구별해야 합니다", `fp64` "정해야 합니다"). They
  are older than this change, state nothing false at the pin, and stay for a reviewer.
- Not reviewed by anyone: the four attribute lessons and the text changed after `8fc5577`.
- No person read the Korean for idiom.

Open source problem, in the compiler repository (`typeshade/typeshade`), not edited here:

- The pinned JSDoc of `Device` and `FuseReport` still describes its behaviour with `resident()`
  and `configure({ prefer })`, which change 0138 deprecates, so the Korean API entries do too.

Bilingual reading of the Korean guide (PR #54, 2026-11-10). An independent agent of the session
read the Korean against the English at pin `34cea187`. It is not the model this file names; the
owner chose that deviation on 2026-11-10. The authoring agent read the English block and the
Korean block of each finding again before it changed the Korean.

- Covered, in full: ten guide sections, 364 blocks (`overview`, `your-first-shader`,
  `values-and-mutation`, `layouts-and-resources`, `emitting-and-reflection`,
  `conditional-programs`, `capabilities-extensions`, `fp64`, `production-emit`,
  `migrating-a-glsl-shader`); the four attribute lessons; the quick start's host section; the
  libm paragraph of the WebGPU and WebGL2 page.
- Findings: 3 blocking and 30 should-fix, with notes and a terminology table. Applied: the 3
  blocking findings and every should-fix finding but two. Applied in part: M-1 (the checker holds
  three code-only table cells to the English, "and" included) and F-3 (the numeral check counts
  the digit in "2의 거듭제곱", so the term stays "이진 거듭제곱"; the added example is removed).
- Terms made one across the twelve sections and the lessons: tier, 디바이스, 인자, 하향 변환, 하위
  경로, 언어 표면(surface), 변경 NNNN, prelude against 프리앰블, 드로, "…에 있습니다" for "See …".
- Not read by anyone: the section
  titles and descriptions in `src/i18n/ko.ts` (lines 22 to 79); `content/guide/ko/rules.json`; 22
  Korean API entries in full; `the-cpu-oracle`, which is shown in English.
- Open: `src/i18n/ko.ts` and the guide disagree on some terms, and this change leaves `ko.ts` as
  it is: draw is "그리기" 14 times in `ko.ts` and "드로" in the guide; return is "돌려주다" 44 times
  and "반환하다" 65 times in `ko.ts`; "deprecated" is the label "지원 중단" in `ko.ts`. "zero" stays
  "영" and "power of two" stays "이진 거듭제곱" where the English writes the word, because the
  numeral check compares digits.

Source problems that the compiler fixed. Compiler pull request #1209 corrected three of the
problems this file recorded: "`for` is the counted loop", "the stage functions" and "the shaders
… import the package". They are removed from this file with the pin move to `50234ad6` (PR #55),
and the Korean sections `overview` and `control-flow` follow the corrected English.

The compiler pin move to `50234ad6` (PR #55, 2026-11-10) changes one English paragraph and its
Korean (the CPU math functions of the WebGPU and WebGL2 page) and four Korean guide blocks. No
Luna subagent read them. An independent agent of the same session reviewed commit `eaf3db5`, as for
PR #52 and PR #54: this is the deviation the owner chose on 2026-11-10. It reported no blocking
finding, 6 should-fix findings and 8 notes. Applied: S1 to S6 (the libm paragraph split into
sentences with one topic each, "단조로운 결과" made "결과의 단조성", two `diagnostics` sentences, and
this record). Not applied: N1 (the page states the measurements and not the 1 ULP promise of
0042 decision N9; that stays the owner's choice). Open: the Korean guide mixes "반환" and
"돌려주다", and about ten Korean section intros still describe the page.

In the same pull request the authoring agent read two Korean guide sections in full against the
pinned English, block by block: `diagnostics` (31 blocks) and `glsl-float-precision` (25 blocks).
Fixed: the page intro of `diagnostics` (the Korean described the page instead of saying what the
reader can do after it), five sentences that dropped or weakened a clause ("one problem found in
one program", "one handler catches every coded failure", the reason a branch on a code keeps
working, "safe to call on a module you are about to emit", "as the samples above show"), one
plain ending, "돌려주는" made "반환하는" where the same sentence says "반환해야", and in `glsl-float-precision` an added "반드시", a duty ("측정해야 합니다") where the guide renders an
English imperative as a plain statement, "뿐" that the English does not say, a dropped "only", and "기기" made
"디바이스". The independent review above read these fixes.

The Korean guide section `the-cpu-oracle` is shown in English until it is translated again from
the pinned `AUTHORING.md`; it was already shown in English at `e30bbe57`.

The compiler pin move to `68b57a03` (PR #56, 2026-11-10) changes the same English paragraph and
its Korean (the CPU math functions of the WebGPU and WebGL2 page): all 19 functions are the
compiler's routines, and `pow` keeps ECMAScript's special values (Amendment A4 of change 0042).
The authoring agent wrote the English against the pinned `CHANGELOG.md`, Amendment A4 and
`src/core/cpu-runtime.ts`, then translated it into Korean with the same meaning. Rule 5.3's
fingerprint moved by a test reference only; its text is the same. The authoring agent read the
Korean `values-and-mutation` section and the `TS8003` lines in both locales against it and
recorded the new fingerprint. No Luna subagent read these changes. An independent agent of the
same session reviewed commit `d6fcc75`, as for PR #52, PR #54 and PR #55: this is the deviation
the owner chose on 2026-11-10. It reported no blocking finding, 3 should-fix findings and 5
notes. Applied: S1 (this record and the `TS8003` wording of `compiler-changes.md`), S2 (the
SwiftShader sentence names WebGPU and WebGL2 in Chromium and says the values differ from the
CPU's) and S3 (the first sentence in the active voice). No guide block of the English changed, so
no Korean block was translated again.

The compiler pin move to `42550b11` (PR #61, 2026-11-11) changes the host-resource copy of the
quick start, the WebGPU and WebGL2 page and the control-flow page, in English and in Korean.
Milestone 3 of change 0138 is done at this pin: a call on a `Buffer` or a `Uniform` does not
block, data decides the device of a call, and on WebGL2 a `read()` waits on a fence. The
authoring agent wrote the English against the pinned `CHANGELOG.md`, Rules 6.1, 8.21, 8.24 and
11.8 and the generated host view, then translated it into Korean with the same meaning. The
quick start's host file was run on the CPU tier against the module the pin generates. Six Korean
API entries (`array`, `zeros`, `uniform`, `Uniform`, `Buffer`, `Device`) follow the pinned
JSDoc. Rules 3.9, 6.1, 7.5, 8.21, 8.23, 11.8, 11.13, 12.6 and 12.7 moved; the authoring agent read
the pages that explain them in both locales and recorded the new fingerprints. Only the Korean
algorithms tiers sentence changed, to the polite ending. No Luna subagent read these changes. The
owner chose an editorial review by an independent agent of the session instead; its result is
recorded on PR #61. No guide block of the English changed, so no Korean block was translated
again; `the-cpu-oracle` is still shown in English.
