# Neutral Korean learning copy

## Request

Apply the approved readable-korean skill to the remaining published learning content.
Use neutral official-page explanations, familiar terminology, and clear factual descriptions.

## Baseline

`docs/readable-korean-skill` at `5a263dee6d0da0040948204c0a40c50f21d538ee`.
Compiler pin `94203d3cab6433065bbe111c3b93f66a4058828e`.

## Scope

Review every authored function lesson, worked operation lesson, constructor explanation,
concept lesson, precision article, Pow reference note, and shared authored Korean page text and lesson UI.
Keep source conditions, links, heading IDs, code and numerical parity. Extend the same review to the 15 compiler guide translations and all 515 API translation records.

## Review

Check factual and translation parity, native Korean wording, static reading, browser layouts,
local discovery and technical SEO. Keep compiler-derived content and its pin unchanged.

## Implementation

- Rewrote all 48 function lesson records and all 127 worked operation/constructor lessons.
  Pow also received a full pass through its eight reference sections and nine live observations.
- Rewrote five standalone concept lessons and the precision article. The shared dictionary
  pass covers the original concept articles, language overview and nine topics, four language
  comparison tables, reference introductions, and authored landing/editor/example/MNIST copy.
- Replaced teaching prompts with the relation an example demonstrates. Preserved domain,
  precision, stage and backend qualifications; clarified that WGSL/GLSL support reassignment
  of a power result rather than TypeScript's exponentiation assignment syntax.
- Kept heading IDs and shared dictionary heading strings to preserve existing fragments.
  Kept code, numerical facts, link keys, compiler pin and runtime behavior.
- Retained appropriate UI status/error messages and actual drawing/input instructions.

## Extended translation pass

The remaining compiler-sourced Korean collections are included: 15 guide section
translations and 515 API translation records. Preserve source hashes, rules manifests,
identifiers, code examples, numerical facts and support qualifications.

The existing compiler precision correction and upstream follow-up still apply. This prose
pass preserves source meaning and does not claim to resolve the pinned AUTHORING source's
factual overstatements. The published correction remains adjacent to that material.

## Verification record

The final production build and generated-site audits pass. The initial SEO
review found five descriptions below the 70-character floor after shortening the register.
Expanded the authoring category summary and three topic descriptions with their actual
scope; this also repairs the module export's composed description. No length gate changed.

A broad static browser review passed 280 page views across both languages, 390/1440 widths
and both themes, including the 15 guide sections, comparison tables, core landing pages and
representative API entries. No horizontal overflow was found. The metadata corrections
passed a further 40-view check after the final rebuild.

The off-site audit checked 1,790 unique URLs: 1,789 resolved, one fetch warning for the
bundled STIX font license's `http://scripts.sil.org/OFL`, and no broken links.

Source verification completed on 2026-10-23 with Node 24.19.0 and Bun 1.4.3:

- TypeScript checks, formatting, source/rule parity and reference-note checks pass.
- All five edited dictionary/lesson modules preserve their property keys.
- All 515 API records preserve source hashes, field keys, fenced examples, inline code,
  links and numerical tokens across 1,959 fields.
- All 15 guide sections preserve their frontmatter, headings, 111 fenced examples,
  1,084 inline code spans, 56 links and 567 numerical tokens.
- The authored-page build passed the 175-function coverage review, 40 concept views,
  14 discovery searches, precision queries/fallbacks, 47 graph layouts and the complete
  127-page worked-model review in both languages, widths and themes.

Korean heuristic audit: core source comparison changed 17.1%; final concept prose 16.0%,
precision 12.2%, representative API prose 4.8%, and representative guide prose 20.9%.
The final concept, precision and API samples pass the structural gates. Raw Markdown
false positives classified code tokens such as `f32)` as footnotes; prose-only guide
extraction passes the factual-token/golden gate. Three guide modality warnings concern
replaced reader-learning prompts and device-measurement wording, which were manually
reviewed. The actual array-bound requirement was restored explicitly after the audit.
No technical parity check was relaxed to accommodate this wording pass.

## Source findings kept separate

The prose audit also found existing claims in pinned compiler JSDoc that need an upstream
technical review. They were not silently changed in translated records:

- `fma.description`: a hardware single-rounding guarantee conflicts with the WGSL accuracy
  allowance. The authored function lesson already preserves the weaker guarantee.
- `GlslEmitOptions.floatPrecision`: binary16 range and mobile-only numerical effects are
  overgeneralized. The published precision correction and standalone article distinguish
  the language requirement from device behavior.
- `f64T`: the claim about all GPU hardware is broader than this DSL's emulated type.
- `reflect.description` and `Reflection.vertex`: the std430 and tightly packed vertex layout
  descriptions need to be reconciled against implementation and upstream English.

Disposition: open compiler-source follow-ups; no compiler pin, generated JSDoc or technical
parity waiver is included in this register change.

## Final generated-site results

- `bun run build`: pass; 2,598 generated pages and 2,478 indexed/sitemap pages.
- `bun run check:types` and `bun run format:check`: pass.
- `bun run qa:seo`: pass for all 2,598 pages; all five repaired descriptions are 71–80
  characters after generation.
- `bun run qa:worker-routes`: pass for eight prefixes.
- `bun run qa:openseo`: zero informational, warning or critical issues.
- `bun run qa:links` with `NODE_USE_ENV_PROXY=1`: pass, with the license fetch warning
  recorded above. The subsequent metadata-only edits do not change any URL.
- Static browser review: 280 broad views plus 40 final metadata views, both languages,
  themes and screen widths; no horizontal overflow. Representative screenshots were
  visually inspected, including the precision table and Korean guide/API prose.
- `ifchange.ts` and `downstream-impact.ts`: pass. Compiler pin remains
  `94203d3cab6433065bbe111c3b93f66a4058828e`.

Artifacts: `/workspace/shared/neutral-korean-docs/`, including `reports.json` and
`metadata-recheck.json`. Supporting logs are `/tmp/neutral-*-complete.log` and
`/tmp/neutral-korean-review/`. These files are review artifacts, not published page content.

Pre-approval delivery: commit `d2ee4ec` on draft PR #228 against `docs/readable-korean-skill`, before merge or rollout. The subsequent owner-approved main integration is recorded in `docs/learning-quality-landing.md`. Existing compiler-source follow-ups remain open as listed above.
