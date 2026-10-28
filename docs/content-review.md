# All-site content review

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
