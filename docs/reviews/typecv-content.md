# TypeCV content review

Review completed 2026-10-27 for the TypeCV website assignment. English was
reviewed first; Korean page copy was checked against that English for meaning,
claims, examples and tone, then read for natural wording. The house criteria are
in [content-style.md](../content-style.md). No TypeCV submodule files were
changed.

## Website surfaces reviewed

- `apps/typecv/content.mjs`: all English and Korean navigation, overview,
  feature, experiment, setup and playground strings.
- `apps/typecv/src/pages/index.astro` and `src/pages/ko/index.astro`: headings,
  descriptions, code example context, feature links, experiment qualification,
  local-video call to action and metadata.
- `src/pages/lab.astro` and `src/pages/ko/lab.astro`; `src/components/SfmLab.tsx`;
  `src/hooks/useSfmLab.ts`; `src/components/SfmViewer.tsx`;
  `src/workers/sfm.worker.ts`; `src/lib/sfm-input.ts`: controls, defaults,
  calibration help, privacy statements, progress and error states, results,
  accessibility labels, viewer guidance, exports and validation messages.
- `src/pages/playground.astro`, `src/pages/ko/playground.astro` and
  `playground.mjs`: headings, controls, empty/running/error states, generated
  metrics, result labels and rejection explanations.
- `src/layouts/SiteLayout.astro`, `src/pages/404.astro`, both documentation route
  templates, `site.mjs`, `PRODUCT.md` and `README.md`: navigation, skip link,
  theme labels, footer, language links, page metadata, documentation fallback,
  provenance links and product/setup descriptions. `DESIGN.md` was already being
  edited by the primary reviewer and was left untouched.

The overview now identifies TypeCV as a TypeScript computer vision library,
states the current geometry and sparse-reconstruction APIs, and marks image
processing, optical flow and learned-vision integration as planned. It describes
single-scale TypeShade FAST/BRIEF extraction and matching as experimental, which
matches the lab. The lab now explains the eight-frame limit, assumed focal
length and scene-dependent result. The former paired slogans were replaced by
direct task/product headings. Korean follows the reviewed English meaning and
keeps the same limits. Playground and lab labels, common validation errors,
geometry rejection reasons and the 3D viewer accessible label now have Korean
text.

Korean documentation routes still state that the project documents are in
English and link to the corresponding English route. The imported Markdown is
not represented as translated Korean.

## Imported documentation reviewed

The published source tree contains **30 files: 16 Markdown pages and 14 JSON
evidence records**. The Markdown pages are rendered by the website. JSON files
are linked evidence data, not rendered prose. All pages and data records were
read for wording, technical-state claims, linked routes, result qualifications
and provenance.

Markdown pages:

- `sources/typecv/docs/README.md`
- `sources/typecv/docs/architecture.md`
- `sources/typecv/docs/typeshade-capabilities.md`
- `sources/typecv/docs/gpu-geometry.md`
- `sources/typecv/docs/gpu-initialization.md`
- `sources/typecv/docs/gpu-features.md`
- `sources/typecv/docs/incremental-sfm.md`
- `sources/typecv/docs/gpu-sfm.md`
- `sources/typecv/docs/gpu-sfm-scaling.md`
- `sources/typecv/docs/gpu-sfm-research.md`
- `sources/typecv/docs/roadmap.md`
- `sources/typecv/docs/sfm-quickstart.md`
- `sources/typecv/docs/sfm-roadmap.md`
- `sources/typecv/docs/sfm.md`
- `sources/typecv/docs/experiments/pyramid-8134952/README.md`
- `sources/typecv/docs/experiments/incremental-pyramid/README.md`

Evidence records:

- `sources/typecv/docs/experiments/pyramid-8134952/results.json`
- `sources/typecv/docs/experiments/incremental-pyramid/comparison.json`
- `sources/typecv/docs/experiments/incremental-pyramid/typecv-summary.json`
- `sources/typecv/docs/experiments/incremental-pyramid/colmap-summary.json`
- `sources/typecv/docs/experiments/gpu/pyramid-software.json`
- `sources/typecv/docs/experiments/gpu/p3p-pyramid-software.json`
- `sources/typecv/docs/experiments/gpu/incremental-geometry-software.json`
- `sources/typecv/docs/experiments/gpu/incremental-initialization-software.json`
- `sources/typecv/docs/experiments/gpu/resident-pair-verification-software.json`
- `sources/typecv/docs/experiments/gpu/typeshade-capabilities.json`
- `sources/typecv/docs/experiments/gpu/sfm-scaling-rtx2080.json`
- `sources/typecv/docs/experiments/gpu/sfm-resident-cg-rtx2080.json`
- `sources/typecv/docs/experiments/gpu/sfm-cg-chunks-rtx2080.json`
- `sources/typecv/docs/experiments/gpu/sfm-local-schur-cache-rtx2080.json`

The imported docs generally explain API behavior with concrete contracts and
keep synthetic, software-WebGPU and physical-GPU evidence qualified. Their
code, routes, anchors, benchmark values and source data remain intact. Two
outdated statements were corrected in app-owned copies: the quickstart described
GPU two-view refinement and incremental BA as CPU work, and the GPU SfM guide
called a previous bounded-submission lab configuration current. Overrides live
at `apps/typecv/docs-overrides/sfm-quickstart.md` and
`apps/typecv/docs-overrides/gpu-sfm.md`. Each records the TypeCV source revision
(`e40c878809370719faef7dac3e34b80a92c4ce3d`) and correction rationale;
`docs-overrides/manifest.json` pins the source SHA-256 for each override, and
`docs-overrides/NOTES.md` documents the maintenance rule. The source package
remains unchanged.

The documentation renderer also linked relative JSON evidence to an incorrect
repository path and routed a repository-root Markdown link through the site.
Those links now point to the right TypeCV source, and the documentation sidebar
uses `/docs/` for its index link. Override selection verifies each source file's
SHA-256 against the manifest and fails the build if an overridden file changes.
The build also checks that the pinned TypeCV submodule revision matches the
manifest's reviewed revision, so links for the rest of the docs cannot silently
drift to a different source commit. Only a missing override (`ENOENT`) falls
back to the source; other file errors surface. Generated upstream links use the
pinned TypeCV source revision. Edited pages identify themselves and offer a link
to compare with the upstream source. The generated-page test covers stale file
hashes and source revisions, missing and unreadable overrides, repository-root
links and edited-page source labels.

## Validation

Ran from `apps/typecv` with
`PATH=/tmp/site-tools/node_modules/.bin:$PATH`:

- `npm run check` — 0 errors, 0 warnings, 0 hints.
- `npm run build` — 39 pages built. Vite reported the existing large-chunk
  warning.
- `npm run test:links` — passed 3 checks: highlighted-code rendering,
  documentation override/source URL regression coverage, and generated-page
  link coverage.

No copy-mirror tests were added. No submodule source, API behavior, benchmark
value, route, or section anchor was changed.

## Render review

After the canonical Astro build, inspected the generated documentation pages,
including English TypeScript fences and the Korean English-only fallback. There
were no `[object Promise]` artifacts. Playwright checked the English and Korean
home, documentation, playground and lab routes at 320, 390 and 1440 CSS pixels:
all 24 route/viewport combinations fit their viewport without horizontal page/body overflow. The
highlighted TypeScript token and code-block backgrounds switch between the
light theme (`rgb(255, 255, 255)`, token `rgb(215, 58, 73)`) and dark theme
(`rgb(36, 41, 46)`, token `rgb(249, 117, 131)`).

The viewport screenshots (900px high) are in
[`typecv-rendering/screenshots`](../../artifacts/ui/typecv-rendering/screenshots/):

| Surface | 320 px (EN / KO) | 390 px (EN / KO) | 1440 px (EN / KO) |
| --- | --- | --- | --- |
| Home | [EN](../../artifacts/ui/typecv-rendering/screenshots/home-en-320-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/home-ko-320-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/home-en-390-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/home-ko-390-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/home-en-1440-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/home-ko-1440-light.png) |
| Docs: SfM quickstart | [EN](../../artifacts/ui/typecv-rendering/screenshots/docs-en-320-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/docs-ko-320-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/docs-en-390-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/docs-ko-390-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/docs-en-1440-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/docs-ko-1440-light.png) |
| Playground | [EN](../../artifacts/ui/typecv-rendering/screenshots/playground-en-320-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/playground-ko-320-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/playground-en-390-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/playground-ko-390-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/playground-en-1440-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/playground-ko-1440-light.png) |
| SfM lab | [EN](../../artifacts/ui/typecv-rendering/screenshots/lab-en-320-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/lab-ko-320-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/lab-en-390-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/lab-ko-390-light.png) | [EN](../../artifacts/ui/typecv-rendering/screenshots/lab-en-1440-light.png) / [KO](../../artifacts/ui/typecv-rendering/screenshots/lab-ko-1440-light.png) |

The same English quickstart at 1440px is also captured in [dark mode](../../artifacts/ui/typecv-rendering/screenshots/docs-en-1440-dark.png). These are first-viewport screenshots; the fit check measured the full document width.
