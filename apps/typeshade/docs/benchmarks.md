# Performance benchmarks

## Request and baseline

The owner requested a general performance benchmark on 2026-10-22 UTC. Visitors can run
several experiments on their own device and voluntarily send the result. The first suite
includes proposal 0082's layout comparison. This is a site feature, not an implementation
of the proposed compiler optimizer.

Implementation starts from site main at `6876351`, with compiler pin `94203d3c`.
The page and collector are implemented in site PR #215. Local validation passed against
implementation commit `04dbb9e`. PR #215 merged as `02aa4ea` and deployed on 2026-10-22 UTC. Migration `0008_benchmarks.sql` was applied.
The follow-up comparison instrument is tracked in PR #216 and `docs/benchmark-regressions.md`.
PR #216 merged as `13786f8` and deployed on 2026-10-22 UTC. PR #217 replaces the separate
controls with one unified workload and four section charts. Its protocol and validation are
recorded in [benchmark-unification.md](benchmark-unification.md). The original protocol and
validation below describe the retained schema-1 reports.

## Scope

- Versioned experiment definitions, compiled shader fixtures and independent result checks.
- Layout, transfer, memory access, arithmetic, reduction, atomic contention, workgroup size
  and submission experiments, with bounded workload profiles and repetitions.
- WebGPU timing where timestamps are supported, host wall timing and pipeline setup costs.
- WebGPU adapter metadata and separately attributed WebGL renderer information, including
  the optional debug-renderer extension. Missing or redacted values remain unavailable.
- A browser worker with progress, cancellation and partial-result retention.
- English and Korean pages with local results, record inspection, download and explicit
  sending consent. No benchmark starts or sends a record on page load.
- A bounded same-origin collector using the site's existing D1 binding and a migration.
- Private maintainer export and paired-comparison analysis. No public raw-record listing.

## Evidence

Each record identifies the benchmark revision, compiler pin, shader fixtures, workload,
adapter information, browser, repetitions, samples and correctness outcomes. Known software
renderers remain distinguishable. WebGL renderer strings do not identify the WebGPU adapter.
The collector validates shape and provenance; submissions remain untrusted observations.
They do not automatically change compiler policy.

## Validation plan

Check schema rejection, absent timings, consent, cancellation, duplicate submissions, rate
limits and storage failures. Run every experiment in Chromium with real WebGPU execution,
including known-bad output probes. Software execution validates the instrument and does not
establish physical-device performance. Build and audit both locales, then inspect screenshots
at desktop and mobile widths in both themes. Record actual outcomes before requesting review.

The site change follows the existing compiler pin. Public compiler APIs, exposed buffer
layouts and proposal 0081's open deviation D1 remain unchanged.

## Original instrument protocol

Catalog `2026-10-22.1` contains 22 cases. Its compiler is `94203d3c`, with emit level `O1`.
`scripts/benchmark-catalog.ts` compiles TypeShade at build-check time. The committed catalog
contains each source, WGSL, binding map and SHA-256. Its digest is
`016e717e5f9e53f0275dfc6b6b0238133b67e19ea9341720365c5c52bc64fa88`.
The browser ships these fixtures and the runner; it does not load the compiler.
The generator refuses to overwrite a changed revision. A future workload change needs a
new catalog and a retained validation contract for earlier records.

- Quick runs use 16,384 elements, one warmup and three samples.
- Standard runs use 16,384 and 65,536 elements, two warmups and seven samples.
- Extended runs add 262,144 elements, three warmups and fifteen samples.
- Profiles stop after 60, 180 and 600 seconds respectively. The visitor can stop sooner.
- A group holds alternatives for one suite and size. Their starting order rotates each
  round from a recorded random seed. Completed groups survive cancellation.
- Each case checks every output before and after timing. A bit flip must fail comparison.
  Input buffers must retain their original bytes. A failure names the active case.
- Fixtures use exact dyadic floats or unsigned integers. They do not need a tolerance.
- Setup includes allocation, pipeline creation and initial upload. Fixture construction,
  validation and setup stay outside timed dispatches.
- Host timing covers encoding, submission and completion, divided by dispatch count.
  Upload timing covers `writeBuffer` through completion. Readback also includes staging
  allocation, GPU copy, mapping and the host copy.
- Device timing covers a compute pass and divides by dispatch count. Missing timestamp
  support and unresolved or zero intervals produce `null`. Separate submits have no device
  interval. They can be compared by host time.
- Storage bytes count the input and output buffers. Uniform, query, staging and workgroup
  memory are additional. The largest layout group holds approximately 40 MiB of storage.

The layout cases cover scalar `f32` fields, full versus projected buffers, and reading one
or all fields. The single-field projected AoS and SoA programs also serve as a noise control.
They do not establish results for mixed types, vector alignment, writes or the full host
object pack/validation/copyback path. The prior 0082 instrument covers that host path.
This page measures WebGPU compute. WebGL supplies attributed renderer metadata in this
revision; WebGL render timings are a future suite.

## Collection and retention

The page starts no experiment or POST on load. The visitor selects Run to start work and
send its record automatically. A small notice below Run explains this action and links to
the collection details. Completion, failure, unsupported WebGPU and cancellation each attempt
one submission. A failed send can retry the same record ID. Switching tabs cancels active
work. JSON inspection and download remain available. Each run gets a new random UUID; no
persistent device identifier is used. The original checkbox flow was replaced in PR #217.

The record includes the user agent, separately attributed WebGPU and WebGL information,
reported capabilities, workload provenance, status, raw samples and checks. Missing renderer
information remains `null` or empty as reported. WebGL's debug extension can be unavailable.
Its presence does not prove that WebGPU chose the same adapter. Reported software is labelled;
other adapters remain unclassified. Client reports cannot prove independent device counts.

The collector accepts same-origin JSON with explicit consent, up to 256 KiB. It validates
fields, profile sizes, fixture provenance, sample counts, checked-value counts and unique
rows. Identical UUID retries are idempotent; conflicting content returns `409`. It accepts
partial records, which analysis excludes. Submitted values and correctness claims remain
untrusted even after schema validation.

The server allows six new records per address per hour, 2,000 globally per day and at most
10,000 retained records. Rate increments and capacity insertion use atomic SQL statements.
The address is hashed with the current hour and is not stored in records. Temporary rate
entries expire at the end of their period. Records expire after 90 days. The daily cron
deletes expired rows. Export excludes expired rows even before that cleanup runs.
Cloudflare's existing request logs remain governed by the site's infrastructure settings.
No new binding, secret, account login or public raw-record endpoint is required.

## Maintainer commands

Run the collector locally with D1 migration `0008_benchmarks.sql`. `check:benchmarks` applies
all migrations to a temporary local database, starts Wrangler, then removes that database.
It does not submit to production.

1. Run `bun run build`.
2. Run `PLAYWRIGHT_CHROMIUM=/path/to/chromium bun run check:benchmarks`.
3. Authenticate Wrangler using the existing maintainer access when exporting production data.
4. Run `bun scripts/benchmark-data.ts export .cache/benchmark-records.json`.
5. Run `bun scripts/benchmark-data.ts analyze .cache/benchmark-records.json`.

Export uses authenticated D1 access, an expiry filter, a server-time cutoff and UUID paging.
Add `--local` to export the default local D1 database. Analysis also accepts a downloaded
record or an array of records. Keep exported device records outside version control.

Analysis deduplicates run UUIDs and computes baseline/candidate median ratios within each
complete, correct run. It groups by catalog, compiler, profile, size, reported adapter and
browser. It reports run counts, median and p10/p90 ratios, with software separated. These
percentiles describe the submitted runs; they are not confidence intervals or device counts.
Controlled reproduction remains necessary before compiler policy changes.

## Validation record

Observed on 2026-10-22 UTC against implementation `04dbb9e`, site baseline `6876351`
and compiler pin `94203d3c`. Tools: Bun 1.4.3, Node 24.19.0, Chromium 154.0.8037.57,
Wrangler 4.142.0. Chromium used SwiftShader, with reported fallback status and separately
recorded WebGL renderer strings. These results validate the instrument, not hardware policy.

| Command                                                                                                                                                                                                                | Observed result                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run build`                                                                                                                                                                                                        | Passed. Both localized benchmark routes were built.                                                                                                                                                                 |
| `bun run format:check`                                                                                                                                                                                                 | Passed, including component semicolons.                                                                                                                                                                             |
| `bun run check:style`                                                                                                                                                                                                  | Passed.                                                                                                                                                                                                             |
| `bun run check:copy`                                                                                                                                                                                                   | Passed; 2,506 translated strings.                                                                                                                                                                                   |
| `bun run check:i18n`                                                                                                                                                                                                   | Passed; route parity and dictionary checks.                                                                                                                                                                         |
| `bun run check:notes:lint`                                                                                                                                                                                             | Passed.                                                                                                                                                                                                             |
| `TYPESHADE_DOCS_ROOT=$PWD bun vendor/shader-dsl/scripts/ifchange.ts`                                                                                                                                                   | Passed.                                                                                                                                                                                                             |
| `bun run check:types`                                                                                                                                                                                                  | Passed for site and Worker.                                                                                                                                                                                         |
| `bun run check:benchmark-catalog`                                                                                                                                                                                      | All 22 compiled fixtures match the pin and digest.                                                                                                                                                                  |
| `bun test scripts/benchmarks.test.ts scripts/playground-diagnostics.test.ts scripts/playground-host-default.test.ts scripts/compiler-authoring.test.ts scripts/compute-runtime.test.ts scripts/render-runtime.test.ts` | 39 tests passed, including seven new benchmark/collector/analysis tests.                                                                                                                                            |
| `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium bun run check:benchmarks`                                                                                                                                                       | Passed: 22 quick and 66 extended GPU cases, corrupt-output rejection, missing timestamps/debug extension, no adapter, cancellation, consent, local D1 storage/retry/rejection, JSON download and localized layouts. |
| `bun run qa:seo`                                                                                                                                                                                                       | Passed; 2,596 pages and 2,476 sitemap entries.                                                                                                                                                                      |
| `bun run qa:worker-routes`                                                                                                                                                                                             | Passed; eight prefixes shadow no built page.                                                                                                                                                                        |
| `bun run qa:openseo`                                                                                                                                                                                                   | Passed; no warning or critical issue.                                                                                                                                                                               |
| `NODE_USE_ENV_PROXY=1 bun run qa:links`                                                                                                                                                                                | Passed; 1,666 resolved, 119 transport/access warnings, zero broken destinations.                                                                                                                                    |
| `bunx wrangler deploy --dry-run --outdir /tmp/benchmark-worker-build`                                                                                                                                                  | Passed; existing bindings only. Bundle 805.10 KiB, gzip 128.63 KiB. No deployment.                                                                                                                                  |
| `prepare_monolith_input.py`, `verify_change_rate.py`, `verify_gates.py` from `im-not-ai`                                                                                                                               | Passed; low-risk route, 2.5% draft-to-final change, structural gates passed.                                                                                                                                        |

The browser check writes local screenshots and measurements under ignored `shots/benchmarks/`.
CI retains them as `benchmark-instrument-evidence` for three days.
Both languages were inspected at 390 and 1440 pixels, in both themes, with menus closed and open.
The header remains 65 pixels tall. Document scroll width equals viewport width. The results
retain table headers and cells on phones and scroll inside their own container.

For the footer baseline, the browser temporarily removes only the added benchmark link,
measures the same DOM, then restores it. This reconstructs the unchanged footer structure.
At 390 pixels, the footer grows from 1098.53 to 1126.52 pixels in English and from 1131.81 to
1160.91 in Korean. At 1440 pixels, heights stay 448.83 and 461.03 respectively. The footer
keeps its three groups and existing container. Controls measure 358 pixels wide on phones
and 836 pixels on desktop. No global container or grid count changed.

Development checks found a short Korean SEO title/description and the shared mobile Markdown
table stacking rule. The copy was expanded, and the benchmark table gained its own scrolling
layout. The final build, SEO and browser checks above passed after those fixes.

## Open work

- PR #215 and PR #216 are merged and deployed. PR #217 unifies the experiments and report UI; its status is recorded in `docs/benchmark-unification.md`.
- Physical-device submissions include retained schema-1 and schema-2 reports. Controlled hardware reproduction remains necessary before compiler policy changes.
- WebGL render and mixed/vector layouts remain future suites. PR #216 adds class-array writes and full TypeShade host-call measurements.
- The owner's follow-up asks TypeShade itself to expose shared build/device information. Proposal 0083 was accepted in [compiler PR #735](https://github.com/typeshade/typeshade/pull/735), merged as `dab37659`. Its implementation is [compiler PR #736](https://github.com/typeshade/typeshade/pull/736). The current pin does not implement that API.
- Proposal 0082 remains a draft. Proposal 0081 deviation D1 remains open.
