# Initial TypePlot v0.1.1 integration record

This document records the original adoption. See [the v0.2.1 update](typeplot-v0.2.1-update.md) for the current dependency and compatibility work.

## Scope

- Baseline: `2ea4efff78e7fab08346e1610e1f0edc05e19ea1` (site main).
- Compiler pin: `91c2fe31de045ebf0e5f2c333ac98b95cc460280`, unchanged.
- Annotated release tag object: `0747e33ffbe0f7777242892f2360f92ecc0f238e` (recorded by Bun); peeled commit below.
- TypePlot release dependency: `github:typeshade/typeplot#v0.1.1`, targeting `f5eceac674c77af7f3805da0c7b5709dea4174fd`.
- Initial review implementation: `typeshade/typeplot#1`, commit `099c252cc3257ead0bedc22d41e4412cb9e9ec51`; shader and interaction behavior are unchanged in the release.
- Install the independent package from its stable Git release tag.
- Import the shared shader documents and plot interaction controller through package subpaths.
- Keep the site's renderer, lazy compiler, controls, source editor and Playground project transport.
- Remove the duplicated local shader and interaction controller.
- Preserve current article copy, dimensions, navigation and visual behavior.

## Verification

The site now consumes only `typeplot/shaders` and `typeplot/interaction`. The imported shader is byte-identical to the removed local module. No library renderer or compiler enters the site browser bundle.

- Formatting, site/worker TypeScript and IfChange checks passed.
- All 47 catalogue graphs and three Pow examples passed initial/edit WGSL and GLSL output parity.
- A spatial callback and diagnostics from imported source passed.
- Production build passed: 2,606 pages and 2,486 sitemap entries.
- SEO, eight worker route prefixes and OpenSEO (50 URLs, no warning or critical issues) passed.
- External links passed: 1,805 URLs, 1,771 resolved, 34 transport warnings (including upstream W3C HTTP 503 responses), zero broken links.
- All nine existing live routes passed WebGPU/WebGL2 rendering, editing and controls. Initial JavaScript is 118,037 bytes (120,000-byte budget); the compiler remains lazy.
- InverseSqrt passed 16 combinations: both backends, EN/KO, 390/1440 widths and light/dark themes. Slider values `4 → 3.981 → 4` retain identical rail widths.
- Article widths remain 836/358 pixels and canvas widths 350/320.1875 pixels; no page overflow. Screenshots include 2D/3D views and open menus.
- Editing an imported sin graph and opening its complete Playground project passed.
- Both backends passed a genuine x/y/z callback and orbit at DPR 2. Both shared Pow examples passed zoom and pixel-identical reset.
- The release shader and interaction source/output are byte-identical to the reviewed implementation. The final release-tag production build, TypeScript, formatting and 50-example compiler parity passed. SEO, worker routes and OpenSEO passed again.

Browser screenshots and measurements: `/workspace/shared/typeplot-package-integration`. Final release-tag browser smoke passed inverseSqrt on both backends, including the 118,037-byte script budget, stable slider, zoom and reset. All temporary browsers and servers were stopped. Temporary helpers live outside the repository. No test files were added.

TypePlot PRs 1, 2 and 3 are merged. The site installs the `v0.1.1` Git release. The npm package is not published yet; replacing this Git dependency with a registry version follows its first publication. The owner authorized continuing the integration after review on 2026-10-23. Merge requires the current required checks to pass and PR 231 to land first.

## Release 0.1.1 integration

The site now targets TypePlot `v0.1.1`. Its `dist/interaction.js`, `dist/shaders.js` and
`shaders/plot.shade.ts` are byte-identical to the installed `v0.1.0` files. Accessibility
and Vite changes in the high-level renderer do not enter this site bundle.

PR 231's navigation and current-sidebar verification updates are integrated before the final
site checks. This branch must not merge before PR 231. The compiler pin and page dimensions
remain unchanged.
