# Unified benchmark

## Request and baseline

The owner requested one benchmark that includes every existing experiment and correctness
check, with one run control, progress indicator, result ID and reporting flow. Site baseline
was `13786f8cfab945084b6b5dac891adce1466248bc`. The initial compiler pin was
`94203d3cab6433065bbe111c3b93f66a4058828e`.

The original implementation is tracked in [PR #217](https://github.com/typeshade/typeshade.github.io/pull/217).

## Scope

- Combine every device experiment and application case in one versioned workload.
- Run each case against both exact compiler/runtime builds, with alternating samples.
- Merge overlapping cases so each case appears once per size and build.
- Check outputs and unchanged inputs, and reject deliberately corrupted results.
- Provide one profile selector, run/stop control and progress indicator.
- Show four section charts with horizontal bars, raw values and sample variability.
- Give each section a distinct chart color, as the owner requested.
- Offer timing and buffer-memory views, with explicit unavailable values and JSON inspection.
- Keep one result ID, Run action, JSON download, report request and receipt.
- Keep older reports readable and separate incompatible measurement cohorts.
- Disclose automatic reporting below Run; preserve private D1 storage, retention and rate limits.

## Validation

Build and audit both localized pages. Check artifact reproducibility and retained report
contracts. Run the complete workload in Chromium with WebGPU, including transfer, atomics,
submission patterns, application calls and resident calls. Check negative GPU outputs,
cancellation, missing timing support, consent, retries and local D1 collection. Inspect both
languages and themes at 390 and 1440 pixels, including menus and populated results.

## Original protocol

Workload `applications-2` and instrument `unified-1` combine all 22 original device experiments
with five application workloads. Each case runs against both exact compiler/runtime builds,
with alternating samples. A case appears once per size and build. Quick runs check 54 rows;
extended runs check 162 rows across three input sizes. Every output and unchanged input is
checked against an independent reference. A deliberately modified result must be rejected.

The workload uses one worker coordinator and two isolated version workers. The page has one
profile, run/stop control, progress indicator, UUID and report request. The old
standalone device runner is removed. Earlier schema-1 and schema-2 reports remain accepted;
catalog provenance keeps their workloads and measurement protocols apart from this one.

Ordinary compute cases use bounded calibration and a common dispatch count across builds.
Atomic cases use one dispatch and reset output outside each measured interval. Transfer
cases measure one complete upload or readback. Submission cases retain sixteen dispatches,
batched or submitted separately. Transfers and separate submissions have no device interval.
Application, resident, buffer-allocation and first-call observations retain the definitions
from [benchmark-regressions.md](benchmark-regressions.md).

The report has four grouped horizontal charts: application workloads, data and memory,
computation, and execution. Each chart contains all its cases for the selected input size
and metric. Every baseline is 100; sections have independent labelled scales. Raw values and
units stay visible. The visitor can select elapsed time, device time, peak buffer memory,
first call or resident readback without creating more charts.

Repeated-sample ranges use linearly interpolated percentiles 10 and 90. Overlapping ranges
are counted separately from observed decreases and increases. They are descriptive ranges,
not confidence intervals. First calls have one observation. Buffer counts are deterministic
observations. A stopped, failed or mismatched-adapter run produces no comparison claims.
Unavailable metrics have text and no bar. JSON retains all rows and samples for all sizes.

The owner requested distinct colors for the four sections. The report uses component-scoped
blue, purple, teal and orange, with a grey baseline and text labels in every section. The
shared site palette, container and grid remain unchanged. This is an intentional exception
to the site's single-blue convention for this report's data marks.

One visitor-initiated run consumes one collector record and one receipt. D1 bindings, migrations,
body limits, rate limits and retention do not change. No production test reports are sent.

## Run and automatic submission

Owner feedback on 2026-10-22 UTC replaces the separate checkbox with the Run action. The
button remains labelled Run. A 14-pixel notice directly below it explains that results and
device information are sent automatically, with a link to the collection details. Run and
Stop have touch targets at least 44 pixels tall.

The visitor's Run action authorizes that run's report. Completion, failure, unsupported
WebGPU and cancellation each attempt one submission. The collector still requires the
`consent: true` envelope. No work or report request starts on page load. Successful delivery
shows a stable receipt; failed delivery enables Retry sending with the same record ID.
JSON inspection and download remain available.

Bulk fault and screenshot checks intercept report requests locally. The primary success,
cancellation and retry checks use a temporary Wrangler D1 database. Preview verification
intercepts submissions to avoid synthetic reports in the shared database.

## Status

PR #217 merged as `1b44abbe25b4b822165a771a003308a0024cab1c` and deployed.
The protocol and validation below record that original instrument.
PR #205 adds the [private input projection cohort](benchmark-projection.md) and shared runtime information.
Its compiler pin, measurements and pending validation are recorded separately. Proposal 0081 deviation D1 remains open.

## Validation record

Observed on 2026-10-22 UTC, on this branch against baseline `13786f8`, with unchanged
compiler pin `94203d3c`. Bun 1.4.3, Chromium 154.0.8037.57 and Wrangler 4.142.0 were used.
Chromium ran SwiftShader. These checks validate the instrument and presentation; physical
device observations remain necessary for performance decisions.

| Command                                                                                                                                                                                                                | Observed result                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run build`                                                                                                                                                                                                        | Passed; both localized routes, copy, style, guide, sample and API checks.                                                                                                                           |
| `bun run format:check`                                                                                                                                                                                                 | Passed.                                                                                                                                                                                             |
| `bun run check:types`                                                                                                                                                                                                  | Passed for the site and collector.                                                                                                                                                                  |
| `bun run check:regression-catalog`                                                                                                                                                                                     | Passed; all 22 device cases reproduce on both exact builds, with unchanged runtime artifacts.                                                                                                       |
| `bun run check:benchmark-catalog`                                                                                                                                                                                      | Passed; retained original fixtures still reproduce on their compiler.                                                                                                                               |
| `bun test scripts/playground-diagnostics.test.ts scripts/playground-host-default.test.ts scripts/compiler-authoring.test.ts scripts/compute-runtime.test.ts scripts/render-runtime.test.ts scripts/benchmarks.test.ts` | Passed; 47 tests and 452 assertions.                                                                                                                                                                |
| `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium bun run check:benchmarks`                                                                                                                                                       | Passed; 54 quick and 162 extended checks, four charts, missing timing/renderer metadata, corrupt output and runtime artifacts, consent, single reports, receipts, retry, cancellation and download. |
| `bun scripts/benchmark-data.ts analyze shots/benchmarks/unified-extended.json`                                                                                                                                         | Passed; 81 case pairs, with measurement cohorts kept separate.                                                                                                                                      |
| `bun run qa:seo`                                                                                                                                                                                                       | Passed; 2,596 pages and 2,476 sitemap entries.                                                                                                                                                      |
| `bun run qa:openseo`                                                                                                                                                                                                   | Passed; no warning or critical issue.                                                                                                                                                               |
| `bun run qa:worker-routes`                                                                                                                                                                                             | Passed; eight prefixes shadow no built page.                                                                                                                                                        |
| `NODE_USE_ENV_PROXY=1 bun run qa:links`                                                                                                                                                                                | Passed; 1,784 resolved, one access warning, zero broken destinations.                                                                                                                               |
| `bunx wrangler deploy --dry-run --outdir /tmp/typeshade-unified-worker`                                                                                                                                                | Passed; existing bindings. Worker 935.62 KiB / gzip 134.69 KiB, compared with 874.60 KiB / gzip 132.81 KiB at baseline. No deployment.                                                              |
| `bun vendor/shader-dsl/scripts/downstream-impact.ts --repo typeshade.github.io --submodule vendor/shader-dsl --base origin/main --check`                                                                               | Passed; compiler pin unchanged.                                                                                                                                                                     |
| `TYPESHADE_DOCS_ROOT=$PWD bun vendor/shader-dsl/scripts/ifchange.ts --base origin/main`                                                                                                                                | Passed.                                                                                                                                                                                             |
| `prepare_monolith_input.py`, `verify_change_rate.py`, `verify_gates.py`                                                                                                                                                | Passed; Korean copy used the low-risk route, with no further polishing after the wording audit.                                                                                                     |

The final catalog digest is `3f1859a17048ac2eccaa0737294522f0207ed547fa0e5bc0d1d9b1d0a43322cf`.
The extended run reported 114 rows with available device samples and 48 rows with unsupported
device timing for transfers, separate submissions and application calls. No row had unresolved timing.
Its complete consent envelope was 121,531 bytes, below the unchanged 256 KiB limit.

The owner's two private records were queried read-only through authenticated D1 access and
parsed with the new validator: schema 2 with 90 rows and schema 1 with 66 rows. Neither record
was modified or included in the repository or CI artifacts. No synthetic report went to production.

English and Korean screenshots were inspected at 390 and 1440 pixels in both themes, with
menus open and closed and populated results. Existing header and footer dimensions match
all eight baseline measurements. The header stays 65 pixels tall; document width matches the
viewport. Run controls and chart containers are 358 pixels wide on mobile and 836 on desktop.
Both original run controls become one control set. No shared container or grid changes.

The requested section colors are scoped to this page and checked under both explicit themes
and the system dark preference. Percentage labels round without a negative zero.
A missing measurement has no bar;
incomplete or mismatched-adapter runs have no version comparison. Every metric and input-size
view uses the same four figures. Raw samples remain available through JSON inspection and download.

### Automatic-submission follow-up

Observed on 2026-10-22 UTC against prior PR head `83fe3d9`, with the same tools and compiler pin:

- `bun run check:types`, `bun run build` and the manual commit gates passed.
- `bun test scripts/*.test.ts` passed 90 tests with 515 assertions across seven files.
- `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium bun run check:benchmarks` passed 54 quick and 162 extended checks.
- The first Run sent one report without another action. Failure, unsupported WebGPU and cancellation also sent one report each.
- Page load sent nothing. Local D1 receipt, duplicate retry, failed-send retry, download and private GET rejection passed.
- English and Korean at 390/1440 pixels passed both themes, system dark mode, populated charts and open menus.
- The notice is 14 pixels and directly below Run. It occupies two lines on mobile and one on desktop.
- Run changed from 40.375 to 44 pixels tall in English; Korean remains 45.172 pixels tall.
- Header, footer, profile controls and document widths match all eight preceding captures. No horizontal overflow occurs.
- Korean wording gates passed with no further polishing. No synthetic report was sent to the shared database.

The removed checkbox had shrunk to 3.563 pixels wide in English and 4.672 in Korean at 390 pixels.
Its label occupied 120 and 86.391 pixels respectively. The explicit Run action removes that control.
These measurements explain the mobile feedback; they do not establish device performance.
