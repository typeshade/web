# TypeCV upstream website migration

The web app now carries the website through TypeCV revision `715fd1b694508014315e1a505aa2c970051a7f3a`, including the dense and multi-video lab, sample and result catalogs, record collection, the triangulation probe, and the new hardware-check flow. English and Korean tool routes use shared Astro page templates and the shared eyebrow/reading-surface components. The lab keeps its upstream behavior while Ant controls now use the shared UI theme provider and semantic tokens.

The deployment and record-export tools live in `apps/typecv/scripts`. The record setup reuses the existing KV namespace, creates one only after a valid list confirms it is absent, and stops on a failed or malformed list. The exported run-record docs are pinned as a website override because the upstream snapshot still describes the old 503 fallback and workflow paths. The source revision and source-file hash are recorded in `apps/typecv/docs-overrides/manifest.json`.

Sample preparation scripts whose outputs are hosted by the web app are copied into `apps/typecv/scripts`, with their requirements and required COLMAP preparation chain. The offline record-analysis package and its tests also live there because they consume files exported by the web record workflows. Global descriptor training remains a TypeCV library tool because it writes the canonical vocabulary under the library source tree.

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

The complete serial `test:website` run did not finish with a TAP summary: the execution stream disconnected during the real multi-video dense reconstruction in Chromium SwiftShader after about 40 minutes. It is recorded as incomplete, not as a pass. The run had also reported dense-activity, run-options baseline, and result-file-card failures. Focused reruns now pass: dense activity 1/1 after bringing the paused viewer into view before reading its retained map, run-options 1/1 after fixing the esbuild CSS harness (the canonical baseline stayed unchanged), and result-page 1/1 after the harness brings the viewer into view before asserting the loaded map.

The public UI browser test passes against the current build after restoring the upstream `modelBatches` and `controlWords` diagnostics. Chromium reports 28 compute submissions, and its batching, readback, quality, and error assertions pass. The CPU/WebGPU route, consent stub, layout, and unavailable-GPU checks all pass. The test now focuses those route and runtime checks; the old duplicate 8-frame reconstruction flow is covered by `upstream-site.test.mjs` and the shared UI smoke. The initial run without `TYPESHADE_CHROMIUM` could not launch because this environment has no Playwright-managed browser.

Focused browser revalidation cleared the CSS import failures. The frame-navigation browser test passes 1/1 with assertions for camera selection, desktop alignment, and mobile layout. The app gives both desktop video/map headers a shared minimum height to align their viewports. The GPU-preparation browser test passes 2/2 on the final canonical build, covering current graph generation/canvas identity, mobile overflow, stop interaction, node selection, edge updates, texture reuse, cancellation, errors and readiness. The active lab workspace styles now live in the route-owned stylesheet and use shared theme tokens, including the drawer portals; unrelated document, home and global reset rules were removed. The shared UI browser smoke passes with no axe violations across English/Korean desktop/mobile routes, focal editing, theme persistence, and browser error checks. TypeCV CSS ownership passed all four routes.

The canonical `apps/typecv/dist` output contains the latest successful 131-page build; the temporary `dist-new` directory was removed. Migration baseline commit `cdb5eda` was pushed to PR 7; the final focused CSS and browser-test follow-ups are ready for review. No real Cloudflare namespace, secret, bucket, production deployment, or other external resource was changed during validation.
