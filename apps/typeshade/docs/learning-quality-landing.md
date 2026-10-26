# Approved learning quality release

Owner approval: 2026-10-23, following PR #228.

Consolidate the approved dependent changes #219 through #228 into #228 targeting main:
Pow sizing, the function template and remaining lessons, contextual navigation, precision
and standalone search-entry articles, title spacing, Korean headings and the writing skill,
and the complete Korean prose pass. The earlier change records retain their measurements
and individual review evidence. PR #129 is unrelated and is not included.

Integration baseline: main `c5ce2d2`, compiler `3b40e065e17fd4d6929d4c30ab45656da73f0fcd`.
Preserve the newly published override, runtime-info and input-projection changes. Resolve
six Korean translation conflicts with the new source hashes and technical content intact.
Keep main as the integration commit's first parent: rule-history computes the previous
compiler pin from first-parent history, so this matches the final squash landing on main.
No compiler pointer differs from main in the consolidated pull request.

Layout review: retain the existing shell and document maximum widths. Pow's canvas is
capped at 32rem, with 90% inline size, and square controls at 22rem. Added worked diagrams
have a 352px maximum. New model grids describe their data; no existing page grid gained
columns. Title-to-body spacing is 24px. Original measurements and browser evidence are in
the individual change records. CI and deployment results are recorded on PR #228.

## Integration verification

2026-10-23, Node 24.19.0, Bun 1.4.3, Chromium with SwiftShader; compiler pin above.

- Production build, format, TypeScript, source/rule parity, IfChange and downstream-impact
  checks pass. All 518 current API translations and 15 guide sections pass source checks.
- SEO: 2,604 HTML pages and 2,484 sitemap entries pass. OpenSEO reports no issues;
  all eight worker prefixes pass route checks.
- Off-site links: 1,799 checked, 1,794 resolved, five transport warnings (the font license
  URL and four GitHub 503 responses), no broken links.
- Integration browser review: 120 EN/KO views at 1440/390 in light/dark, covering affected
  concepts, examples, guides and APIs; no horizontal overflow.
- Pow: all three live figures run on WebGPU in all eight configurations, with moved inputs.
  Square frames are 352px at 1440 and 322.1875px at 390; specular frames are 512x256px and
  322.1875x161.09375px. Document widths remain 836/358px, title gap 24px, and controls start
  13px below the rendered canvas. The original square display was 836px/358px before #219.
- The three newly integrated API metadata pages were checked in generated HTML for the
  final neutral Korean strings. No source key, code, number or link exception was added.

Evidence: `/workspace/shared/learning-quality-release/`,
`/workspace/shared/learning-quality-live/local/measurements.json`, and `/tmp/landing-*.log`.
The four previously recorded compiler-source wording/fact follow-ups remain separate.

PR #228 targets main and consolidates #219–#227. Those precursor PRs are closed only after
the consolidated release lands. PR #129 remains outside this release.
