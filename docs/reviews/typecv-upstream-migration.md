# TypeCV upstream website migration

The web app now carries the website through TypeCV revision `715fd1b694508014315e1a505aa2c970051a7f3a`, including the dense and multi-video lab, sample and result catalogs, record collection, the triangulation probe, and the new hardware-check flow. English and Korean tool routes use shared Astro page templates and the shared eyebrow/reading-surface components. The lab keeps its upstream behavior while Ant controls now use the shared UI theme provider and semantic tokens.

The deployment and record-export tools live in `apps/typecv/scripts`. The record setup reuses the existing KV namespace, creates one only after a valid list confirms it is absent, and stops on a failed or malformed list. The exported run-record docs are pinned as a website override because the upstream snapshot still describes the old 503 fallback and workflow paths. The source revision and source-file hash are recorded in `apps/typecv/docs-overrides/manifest.json`.

Sample preparation scripts whose outputs are hosted by the web app are copied into `apps/typecv/scripts`, with their requirements and required COLMAP preparation chain. The offline record-analysis package and its tests also live there because they consume files exported by the web record workflows. Global descriptor training remains a TypeCV library tool because it writes the canonical vocabulary under the library source tree.

The utility ownership audit also retained the lab-operated helpers in `apps/typecv/scripts`: the KLT lab gate, decoder-agreement, keyframe-gate and KLT-agreement measurements, their OpenCV analyzer, ORB benchmark and phase-preparation timer. Their imports now target the app lab modules and `dist`; the KLT GPU measurement uses the pinned TypeCV browser harness and runtime. The benchmark-focal-directions-samples, RGB rotation-tracking and RGB structure-quality programs, plus the offline vanishing-point focal probe, remain library tools because they measure library algorithms or write canonical library research artifacts. The source cleanup restores their dependencies and fixtures rather than moving those workflows into the site.

`pnpm --filter typecv-site build` completed from the 715fd TypeCV source pin and generated 131 pages, including English and Korean hardware-check routes. Public version metadata identifies the web commit and records the source commit separately; runtime metadata also carries the pinned TypeShade revision. `astro check` reported zero errors, zero warnings, and two hints. The build still reports the existing `sfm-video.ts` dynamic/static import warning and a chunk above 500 kB.

Focused app verification passed:

- Migrated record export, fetch, multipart recovery, video parsing, runtime assets, and KV guard tests: 25/25.
- Weak-side reconstruction against the COLMAP reference: 1/1.
- Source-video and remote-sample behavior: 14/14.
- Generated-page, docs-guard, and link checks: 3/3.
- 715fd lab-helper and working-budget tests: 11/11.
- Hardware-check CPU digests, flavor history, comparison, record export, and browser worker coverage: 24/24.
- Site/runtime repository and revision metadata check: 1/1.
- App-side sample preparation Python scripts compile without writing bytecode.
- Migrated lab utilities pass `node --check`, Python compile, and all six CLI `--help` checks. The keyframe gate completed a 32-frame VP9 fixture run; decoder-agreement completed a page/worker parity run with 33 frames and zero differing keys. GPU lab benchmarks were syntax/import checked but not run as research measurements.

The complete serial `test:website` run did not finish with a TAP summary: the execution stream disconnected during the real multi-video dense reconstruction in Chromium SwiftShader after about 40 minutes. It is recorded as incomplete, not as a pass. The run had also reported dense-activity, run-options baseline, and result-file-card failures. Focused reruns now pass: dense activity 1/1 after bringing the paused viewer into view before reading its retained map, run-options 1/1 after fixing the esbuild CSS harness (the canonical baseline stayed unchanged), and result-page 1/1 after the harness brings the viewer into view before asserting the loaded map.

The public UI browser test passes against the current build after restoring the upstream `modelBatches` and `controlWords` diagnostics. Chromium reports 28 compute submissions, and its batching, readback, quality, and error assertions pass. The CPU/WebGPU route, consent stub, layout, and unavailable-GPU checks all pass. The test now focuses those route and runtime checks; the obsolete 8-frame fixture flow was removed. Current video/reconstruction coverage lives in `upstream-site.test.mjs`, while shared UI smoke checks the current lab controls. The initial run without `TYPESHADE_CHROMIUM` could not launch because this environment has no Playwright-managed browser.

Focused browser revalidation cleared the CSS import failures. The frame-navigation browser test passes 1/1 with assertions for camera selection, desktop alignment, and mobile layout. The app gives both desktop video/map headers a shared minimum height to align their viewports. The GPU-preparation browser test passes 2/2 on the final canonical build, covering current graph generation/canvas identity, mobile overflow, stop interaction, node selection, edge updates, texture reuse, cancellation, errors and readiness. The active lab workspace styles now live in the route-owned stylesheet and use shared theme tokens, including the drawer portals; unrelated document, home and global reset rules were removed. The shared UI browser smoke passes with no axe violations across English/Korean desktop/mobile routes, focal editing, theme persistence, and browser error checks. TypeCV CSS ownership passed all four routes.

The canonical `apps/typecv/dist` output contains the latest successful 131-page build; the temporary `dist-new` directory was removed. Migration baseline commit `cdb5eda` was pushed to PR 7; the final focused CSS and browser-test follow-ups are ready for review. No real Cloudflare namespace, secret, bucket, production deployment, or other external resource was changed during validation.

## Visual verification during cutover preparation

On 2026-10-28, inspection of the built desktop lab found additional omissions from the
stylesheet extraction: the empty-video text inherited the page color on a dark stage, pipeline
labels and counts ran together, and several timeline/overlay/diagnostic controls lacked their
source styles. Restored the relevant rules from pinned TypeCV `715fd1b` to `sfm-lab.css`,
including responsive rules. Existing shared theme aliases, the 0.8fr/1fr desktop columns,
46px header alignment and 44×24px focal switch remain. Generic legacy buttons are scoped
under `.lab-main`; no rules were added to `global.css`.

A comparison of component class tokens and pinned source selectors also checked multi-video
rows, result information, record consent/details, placement and viewer diagnostics. This is
an ownership check, not proof that every dynamic state was visually inspected. Desktop English
and mobile Korean initial-state screenshots were inspected after restoration. The lab page's
English description and Korean translation now describe video/prepared-sample input, matching
the actual input picker, and preserve a space after the diagnostic link.

Added built-page regression checks for empty-state bounds, pipeline labels/counts and column
layout, and media-panel text contrast at 1440/390px in both locales. The old build failed the
empty-state assertion; the restored build passes the complete shared site smoke and axe
checks. The 131-page build and all four stylesheet-ownership routes pass. Focused final-CSS
frame-navigation (1/1, 93.3s) and GPU-preparation (2/2, 31.9s) checks pass. A preceding partial
upstream browser run passed public CPU/WebGPU, desktop panel geometry and mobile checks,
but was stopped during Dense processing to rebuild these styles; it is not a full suite pass.
The final remote CI revision is tracked in PR #7.
