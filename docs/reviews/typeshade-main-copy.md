# TypeShade main dictionary review

## Scope read

Read the English and Korean main dictionaries from beginning to end, including metadata, navigation, home and quick start, motivation, guides and reference tables, playground controls, examples, diagnostics, benchmarks, galleries, issue reporting, MNIST walkthrough and results, and not-found copy:

- `apps/typeshade/src/i18n/en.ts`
- `apps/typeshade/src/i18n/ko.ts`

Also read `/workspace/web/AGENTS.md`, `docs/content-style.md`, and `docs/content-review.md`. Compared Korean strings with their English counterparts and checked surrounding consumers where headings or links could affect routes.

For generated language-reference pages, read the compiler source at `apps/typeshade/vendor/shader-dsl/src/language-service/docs.ts` and traced output through `src/lib/languageService.ts`, `src/pages/reference/[kind]/index.astro`, and `src/pages/reference/[kind]/[slug].astro`. The tables render compiler-authored entry names, signatures, and descriptions as English in both locales; the Korean dictionary now discloses this and translates the site-authored grouping and explanatory copy. Read generated example descriptions for all 98 `.shade.ts` entries, all 9 host entries, and the twin blurbs, along with the source registries.

## Changes

Preserved the English-first entry-page revision already present in the shared worktree and its Korean translation. Edited selected English API and language-reference audience/introduction copy, the WGSL import introduction, and a benchmark description to use direct developer-facing wording and clarify the measured task. Removed the obsolete `front.targets.count` keys after their rendered paragraph was removed during integration.

Corrected Korean grammar and translation alignment in API and language-reference descriptions, constant/backend and error text, WGSL/GLSL notes, playground labels, example guidance, API mapping descriptions, and technical explanations. Repaired malformed particle combinations and endings (`kind이입니다`, `레지스트리이입니다`), aligned selected Korean examples and references with English claims, and localized example-guide labels without changing identifiers or links. Updated the API source note in both locales to describe reviewed compiler documentation and editorial corrections in reader-facing language. Kept intro tuple slugs, API/code tokens, dynamic facts, numerical claims, support limits, and behavior intact.

Added an app-owned exact-match adapter in `apps/typeshade/src/lib/example-copy.ts` for selected cryptic generated tile blurbs and unlinked compiler-internal citations in host blurbs. Compiler/example source data remains unchanged; the adapter fails on source drift so changed wording is reviewed at the next pin. Korean copies match the displayed English wording. Changed two curly apostrophes to ASCII apostrophes in English operation-lesson strings because the Korean font verifier scans that module; no meaning changed.

## Retained content

Retained clear compiler, target, resource, support-limit, benchmark-condition, and MNIST statements; dynamic facts, code examples, stable tuple anchors, and links. Existing concise UI labels and error wording were retained. Generated reference descriptions remain compiler-authored English on both locales (`lang="en"` in `ReferenceEntryPage.astro` and `ReferenceKindPage.astro`). This is explicitly disclosed; a full translation of the generated compiler table is outside the source-preserving adapter change.

## Verification

From `apps/typeshade`:

- `PATH=/tmp/site-tools/node_modules/.bin:$PATH npm run check:copy` — 3,333 translated strings, no problems.
- `PATH=/tmp/site-tools/node_modules/.bin:$PATH npm run check:i18n` — 375 files clean, 128 route files thin, route parity ok.
- `PATH=/tmp/site-tools/node_modules/.bin:$PATH npm run build` — completed static generation and Pagefind indexing (2 languages, 2,486 pages). Pre-build checks passed, including style, guide translations, 25 page samples, reference notes, and all 518 current compiler API translations.
- `node scripts/check-seo.mjs dist` — passed: 2,606 pages, 2,486 sitemap entries. The revised Why TypeShade description is 153 characters; the Korean diagnostics, IR, and types category descriptions are 81, 78, and 84 characters.

The build emitted existing Astro Markdown deprecation, duplicate compiler instance, Rollup comment-annotation, and large-chunk warnings. Pagefind listed fragment routes without `<html>` elements and noted that Korean stemming is unavailable. None stopped generation. Font regeneration was not needed after the punctuation-only correction.

## Remaining issues

Some generated reference descriptions remain dense because they describe detailed compiler behavior. The example adapter deliberately fails if a pinned source string changes, prompting review at the next compiler pin. Imported documentation and separate lesson/API/content modules were reviewed by their assigned owners. The home repository-count paragraph and unused translations were removed during integration.
