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

The complete serial `test:website` run did not finish with a TAP summary: the execution stream disconnected during the real multi-video dense reconstruction in Chromium SwiftShader after about 40 minutes. It is recorded as incomplete, not as a pass. Before disconnecting, it also reported failures in dense-activity visualization, the run-options browser baseline comparison, and a result-file-card browser wait. The CI workflow retains these tests and the real GPU case across four shards.

The shorter migrated-test/site-guard run passed 43 of 44 tests with Chromium configured. The initial browser result exposed missing `modelBatches` and `controlWords` diagnostics in the app's playground; the exact upstream instrumentation is now restored, and Chromium's 28 compute submissions pass the upstream batching and readback assertions. The next focused run reached the actual lab route and found that the old site test expected a file input while the migrated lab keeps it inside a closed input drawer; the browser test is being adapted to open that drawer. The initial run without `TYPESHADE_CHROMIUM` could not launch because this environment has no Playwright-managed browser.

Focused browser revalidation cleared the CSS import failures. The GPU-preparation harness initially omitted `sfm-lab.css`; it now loads both the shared and app lab styles, and the graph surface renders at 260 px. Its strict graph-generation check still finds a disconnected graph element after the mocked multi-video run changes; the mobile layout assertion also needs a final rerun. The frame-navigation browser test still times out when expecting camera 22 to enter the viewport after zooming out. These browser failures remain visible for CI follow-up. The shared UI browser smoke passed after increasing the advanced focal switch target to 44 × 24 px: axe found no violations, and English/Korean desktop/mobile routes, focal editing, theme persistence, and browser error checks passed. TypeCV CSS ownership passed all four routes.

The canonical `apps/typecv/dist` output contains the latest successful 131-page build; the temporary `dist-new` directory was removed. No real Cloudflare namespace, secret, bucket, deployment, or other external resource was changed during validation. No commit or deployment was made.
