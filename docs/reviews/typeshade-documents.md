# TypeShade documents and embedded copy review

## Scope reviewed

- English source for the 15 imported authoring-guide pages: `apps/typeshade/vendor/shader-dsl/AUTHORING.md` (overview plus the 14 `##` sections), as cut into pages by `src/lib/guide.ts` and `src/lib/authoring.ts`.
- All 15 Korean translations under `apps/typeshade/content/guide/ko/`: `overview.md`, `your-first-shader.md`, `values-and-mutation.md`, `functions-and-entry-points.md`, `control-flow.md`, `layouts-and-resources.md`, `emitting-and-reflection.md`, `the-cpu-oracle.md`, `diagnostics.md`, `conditional-programs.md`, `capabilities-extensions.md`, `fp64.md`, `glsl-float-precision.md`, `production-emit.md`, and `migrating-a-glsl-shader.md`.
- `apps/typeshade/content/guide/GLOSSARY.md` and `apps/typeshade/src/lib/guide-translations.ts` for terminology and source-hash behavior.
- Both authored pages for the function reference note, `content/reference/en/function-pow.md` and `content/reference/ko/function-pow.md`, plus its computed reading record `content/reference/readings/function-pow.json`.
- Embedded copy surfaces: `src/layouts/Base.astro`, `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`, and the TypeShade component/script sources that render the dictionary-backed controls, diagnostics, and accessible labels. `Base.astro` takes metadata and Open Graph text from the locale dictionaries; the two LLM files deliberately publish English text and are generated from the same guide/API records used by the site.
- Generated English diagnostics: all 89 entries rendered by `src/lib/error-codes.ts` from the pinned TypeScript and SD registries, including their summaries, hints, source notes, and the prose transformations used by the public reference pages.
- All 124 English design-rule texts from the canonical rule pages across Chapters 1–13, including their examples and published guidance. Korean rule stamp records were checked against the currently explained pages.

## Changes

Fixed Korean sentence endings where an extra `이` had been inserted before `입니다` (for example, `` `f32`이입니다 ``), and brought a few plain-form endings in otherwise formal guide prose into the established `-습니다` register. This affected Korean guide files and the Korean `pow` reference note. No code examples, API identifiers, numbers, claims, links, headings, anchors, or source fingerprints changed.

## Retained content and provenance

The imported English guide remains based on the pinned vendor `AUTHORING.md`; I did not edit that source, compiler code, or dependency pins. A site-owned, exact-match display adapter in `src/lib/guide.ts` now corrects the incomplete `gradCheck` sentence while preserving the vendor source. Korean section hashes are checked against the adapted English display text. The guide's other prose describes version-specific runtime behavior and detailed compiler limits. The `pow` reference's technical claims are tied to its pinned reading record and source notes; no measured values or readings were changed. Glossary terms and established GPU/API identifiers were retained.

The pinned English source has one visible source-copy defect in the CPU-oracle guide: `AUTHORING.md` line 1645 says, “`worst` names the parameter, the point and the components where the two part.” The sentence is incomplete. The site-owned adapter in `src/lib/guide.ts` now displays “where the results differ”; the vendored file remains unchanged. This correction is limited to the guide presentation.

The generated diagnostic prose is technically appropriate overall. One user-visible broken reference was corrected: the SD0030 hint points to `AUTHORING.md#capabilities--extensions`. `referenceProse()` does not remove that raw path, the pinned authoring file has no matching heading, and the public capabilities guide is at `/guide/authoring/capabilities-extensions/`. The site now replaces the exact obsolete fragment with a locale-aware guide link through `error-codes.ts` and `links.ts`; an exact-source guard detects upstream changes. The compiler diagnostic itself remains unchanged. The remaining diagnostics preserve technical limits and actionable context. The design-rule prose was reviewed in full; no additional wording defect was found. The apparent CPU precision inconsistency in Rules 4.4/11.7 and `CpuValue`/`CpuPrecision` was resolved by source inspection: JavaScript values use double representation, while f32 precision wraps each typed operation with `__fround`. Rule 8.24 no longer has a published explanation after example blurbs stopped citing it, so its obsolete Korean stamp and `READ_AGAINST` record were removed; Rule 8.10 remains recorded because the TS8035 page still explains it.

An independent highlighter integration review is recorded in `docs/reviews/highlighting-integration-review.md`. The TypeCV Marked renderer and generated-page checks passed; the final canonical TypeCV build and all three link/rendering tests passed. Integrated TypeShade validation is recorded in the review ledger.

## Verification

With `PATH=/tmp/site-tools/node_modules/.bin:$PATH` from `apps/typeshade`:

- `bun run check:guide` — 15 Korean sections current, no translation problems; reviewed design-rule stamps match the pin.
- `bun run check:notes:lint` — one reference note passes its structural rules.
- `bun run check:i18n` — 372 files clean; route parity passes.

These were run while other reviewers were editing shared dictionaries. Their results are transient for the whole branch and should be rerun after integration.
