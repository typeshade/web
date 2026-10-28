# Benchmark regressions

## Request and baseline

The owner approved this change on 2026-10-22 UTC. The benchmark must show how
compiler and runtime changes affect the same application. Site baseline is
`02aa4ea9838024aa50c278a1c2d73c674cc4fbf8`. The documentation pin at that baseline was
`94203d3cab6433065bbe111c3b93f66a4058828e`. The compiler-pin follow-up below records its
subsequent update.

Implementation is tracked in [PR #216](https://github.com/typeshade/typeshade.github.io/pull/216).
It merged as `13786f8` and deployed on 2026-10-22 UTC. The unified instrument in PR #217
supersedes the separate controls described here; see [benchmark-unification.md](benchmark-unification.md).

## Compiler-pin follow-up

[PR #218](https://github.com/typeshade/typeshade.github.io/pull/218) pins the documentation
compiler at `c5fd951c81ca6efe62c7dadf91b1e27ac07daa52` for compute-entry constants and the
complete host example. The regression catalog must advance with that pin. The assistant
regenerated it with `bun@1.4.3 scripts/regression-catalog.ts --new`, then reproduced it with
`bun@1.4.3 run check:regression-catalog` on 2026-10-22 UTC.

The current comparison is `94203d3c` against `c5fd951c`. Workload and measurement identity
remain unchanged. The catalog registry retains every prior comparison, and the old runtime
artifacts remain available for earlier reports. The new runtime artifact has digest
`702f7fd1f55fdd6e0cfa55ec4448f2e945eba6629c2507adeb003a22f77df65c` and is 440,704 bytes.
Regeneration proves reproducibility of the artifacts; browser correctness and instrument
checks are recorded in PR #218 separately. No hardware performance gain is inferred from it.

### Integration with site main

On 2026-10-23 UTC, PR #218 integrates site main `6f2985d` (#205) and advances the compiler
pin to `3b40e065e17fd4d6929d4c30ab45656da73f0fcd`. The current comparison is
`85b803f9` against `3b40e065`, using main's `applications-3` workload and `unified-2` instrument.
This retains actual input-projection measurements and runtime/device information. The older
comparison above remains in the registry with every other committed catalog and artifact.
The current candidate artifact has digest `929c4cf9583b6825c4f9b18b90caced11be4abfb7941e33b59a22ec147a39d1c`
and is 466,973 bytes. It was generated with Bun 1.4.3. Reproduction, browser
execution and deployment results are recorded in PR #218. This update makes no native
performance claim.

The first integration run exposed a collector assumption: every baseline used the full
input layout. This comparison's baseline already projects its inputs. The generator now
records `inputProjection` from the generated host face for each exact build. The collector
uses that source-specific capability, including for retained catalogs of the same revision.
Historical catalogs without capability data keep their original contract. Regression tests
accept both projected builds and reject incorrect input sizes, while preserving the earlier
full-input baseline. The real browser checks the measured bytes against the generated catalog.

## Scope

- Retain the first catalog and its collector contract for existing reports.
- Separate fixed workload identity from compiler, runtime and measurement identity.
- Compare two exact TypeShade revisions in one run, with alternating execution order.
- Measure compiled compute programs and complete TypeShade host calls, including
  first calls, repeated calls and repeated work on resident data.
- Include object arrays, image processing, reductions and collection aggregation.
- Record correctness, raw timing samples, bounded dispatch batches and attributable memory counts.
- Exclude warmup timestamps from measured-sample validity. Bound repeated work to avoid long GPU passes.
- Preserve voluntary sending, local inspection, private D1 records and the existing rate limits.
- Report paired ratios and variability without treating runs as independent devices.

## Verification

Run the site build, format and document checks before pushing. Validate both the legacy
and new collector contracts. Exercise actual WebGPU execution in Chromium, including
incorrect-output probes, absent timestamps, cancellation and both localized pages.
Record the exact commands and observed results before marking the pull request ready.
Software execution validates the instrument; physical-device observations determine
performance conclusions.

## Open items

PR #216 is merged and deployed after green CI. The benchmark does not implement proposal 0082. Proposal 0081 deviation D1 remains open. Compiler proposal 0083 was accepted in
PR #735 and merged as `dab37659`; its implementation is PR #736. This change does not
move the documentation pin or depend on that pending implementation.

## Protocol

Workload `applications-1` fixes the source and deterministic inputs independently of the
compiler. Instrument `paired-1` fixes timing and validation. A catalog digest identifies
both exact compiler commits, generated shader bytes, bundled runtime bytes, workload hash and measurement-source hash.
The first comparison uses `82d7ba527e72975df15c35eb16d27239401ea3eb` and
`94203d3cab6433065bbe111c3b93f66a4058828e`. These are comparison controls, not a speedup claim.

Each version runs in a separate worker with its own GPUDevice and runtime. The workers run
on the same page, and every sample alternates their execution order. Both adapter snapshots
are retained. The analyzer and page exclude ratios when reported WebGPU adapters differ. Cohorts also retain the calibrated dispatch count.
Counts describe runs; metadata does not establish unique physical devices.

There are ten compiled cases and five application cases per size and build. Compiled cases
cover scalar AoS/SoA projection, integer arithmetic and reduction. Application cases cover
image inversion, particle object updates with cold fields, peak reduction, Map/Set collection
and a `Device.fuse()` chain of sixteen resident image calls. Map and Set writes use separate loops because
these compiler revisions cannot lower two collection pushes in one loop. GPU-only preference
makes an unsupported GPU call fail. Submission counts provide additional execution evidence.
They do not attribute every internal operation to a backend.

The same compiled case uses the same batch size for both builds. Calibration seeks a device
interval of two milliseconds, with at most 256 dispatches. A calibration pass over fifty wall
milliseconds stops further growth. The visitor can stop, and existing profile deadlines apply.
Stopping prevents further submissions; already submitted GPU work can finish. Calibration,
warmup and correctness checks are excluded from measured device-sample validity. An unresolved
measured interval leaves the device-time series null. Device time is per dispatch.

First-call time includes case preparation and its first execution. Artifact fetching,
integrity checking, runtime import and device opening have separate `loadMs` observations.
The first call of a workload can share library initialization with earlier workloads; it is
not a fresh browser process. Application wall time includes TypeShade validation, packing,
submission and copyback. Fixture construction and oracle comparisons are outside that time.
Resident wall time includes the fixed call chain and completion fence. Its explicit readback
has a separate sample series. Every application sample is checked against an independent
reference. Compiled cases check outputs and unchanged inputs before and after measurements.
All cases reject a modified result. Incorrect or incomplete runs do not enter paired analysis.

Memory counts track API buffer allocation sizes and explicit destruction on the actual
GPUDevice. Peak live bytes, allocation count and submission count are retained. These counts
exclude textures, driver allocations and JavaScript memory; they are not physical GPU memory
usage. Logical fixture bytes are recorded separately. Pipeline caches and runtime state remain
in the version worker until the run ends.

The TypeScript compiler does not ship to the browser. Run
`bun scripts/benchmark-compiler-performance.ts` for separate local compile and host-generation
latency observations in `.cache/compiler-performance.json`. Local host timings are not mixed
with visitor GPU measurements or treated as controlled cross-machine results.

## Updating builds

The pin workflow regenerates the current comparison when it moves the documentation pin.
It uses the prior candidate as the new baseline. Run `bun scripts/regression-catalog.ts --new`
after a manual pin change. The generator extracts committed trees with `git archive`, compiles
the fixed sources and bundles each runtime with Bun 1.4.3. It appends the previous comparison
to the retained registry, and writes content-addressed runtime artifacts. A later candidate
therefore changes the tested compiler and runtime while preserving the application workload.
Read the diff and run the browser instrument before merging a pin update.

`bun run check:regression-catalog` regenerates the active artifacts from source and checks
exact bytes. The catalog also hashes the measurement, fixture, metadata and validation sources.
A measurement-code edit changes provenance even when the shader and runtime bytes remain equal. CI pins the bundler version. The original catalog check regenerates its original
compiler commit rather than applying a new compiler to old provenance. Prior contracts and
artifacts remain in the registry. A workload or measurement-protocol change requires its own
revision and corresponding retained validation contract before deployment.

## Reporting

The reporting design follows TypeCV main `6c90d02`, especially
`website/src/lib/send-record.ts`, `run-record.ts` and `website/worker.mjs`. TypeShade provides its
own shared sender, `src/lib/benchmarks/send-record.ts`. It validates
the complete record and consent before making a same-origin request. D1 retains the record.
The response carries a stable run ID and server receipt time. Identical retries return that
receipt. A failed send leaves the local record available for inspection, download and retry.

In the original PR #216 UI, consent started unchecked. With consent selected,
a completed, stopped or failed run sent its record. PR #217 replaces this checkbox with
a disclosure below Run and automatic submission. No run or request starts on page load.
The existing hourly/global limits, private export and ninety-day retention remain in force.
The schema-1 collector remains available beside schema 2, so earlier device reports stay readable.
No network or telemetry behavior is added to the TypeShade compiler/runtime package.

## Validation record

Observed on 2026-10-22 UTC for PR #216, against site baseline `02aa4ea` and unchanged
compiler pin `94203d3c`. Tools: Bun 1.4.3, Node 24.19.0, Chromium 154.0.8037.57 and
Wrangler 4.142.0. Chromium used SwiftShader. These results validate the instrument;
they do not select an optimization for physical devices.

| Command                                                                                                                                                                                                                | Observed result                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run build`                                                                                                                                                                                                        | Passed for both localized routes.                                                                                                                                                                                                  |
| `bun run format:check`                                                                                                                                                                                                 | Passed.                                                                                                                                                                                                                            |
| `bun run check:style`                                                                                                                                                                                                  | Passed.                                                                                                                                                                                                                            |
| `bun run check:copy`                                                                                                                                                                                                   | Passed; 2,523 translated strings.                                                                                                                                                                                                  |
| `bun run check:i18n`                                                                                                                                                                                                   | Passed; route parity and thin routes retained.                                                                                                                                                                                     |
| `bun run check:notes:lint`                                                                                                                                                                                             | Passed.                                                                                                                                                                                                                            |
| `bun vendor/shader-dsl/scripts/downstream-impact.ts --repo typeshade.github.io --submodule vendor/shader-dsl --base origin/main --check`                                                                               | Passed; no pin movement or removed references.                                                                                                                                                                                     |
| `TYPESHADE_DOCS_ROOT=$PWD bun vendor/shader-dsl/scripts/ifchange.ts --base origin/main`                                                                                                                                | Passed.                                                                                                                                                                                                                            |
| `bun run check:types`                                                                                                                                                                                                  | Passed for site and Worker.                                                                                                                                                                                                        |
| `bun run check:benchmark-catalog`                                                                                                                                                                                      | Passed; all 22 legacy fixtures match their original compiler.                                                                                                                                                                      |
| `bun run check:regression-catalog`                                                                                                                                                                                     | Passed; both exact compiler/runtime builds reproduce their committed bytes.                                                                                                                                                        |
| `bun test scripts/benchmarks.test.ts scripts/playground-diagnostics.test.ts scripts/playground-host-default.test.ts scripts/compiler-authoring.test.ts scripts/compute-runtime.test.ts scripts/render-runtime.test.ts` | Passed; 44 tests across six files.                                                                                                                                                                                                 |
| `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium bun run check:benchmarks`                                                                                                                                                       | Passed; legacy quick/extended, paired quick 30 and extended 90 cases, application calls, resident fusion, consent, receipts, failure reporting, output corruption, artifact integrity, absent adapter/timestamps and cancellation. |
| `bun scripts/benchmark-data.ts analyze shots/benchmarks/paired-quick.json`                                                                                                                                             | Passed; 15 paired cases and separated metric cohorts.                                                                                                                                                                              |
| `bun scripts/benchmark-compiler-performance.ts`                                                                                                                                                                        | Passed; separate local compiler observations saved outside version control.                                                                                                                                                        |
| `bun run qa:seo`                                                                                                                                                                                                       | Passed; 2,596 pages and 2,476 sitemap entries.                                                                                                                                                                                     |
| `bun run qa:worker-routes`                                                                                                                                                                                             | Passed; eight prefixes shadow no built page.                                                                                                                                                                                       |
| `bun run qa:openseo`                                                                                                                                                                                                   | Passed; no warning or critical issue.                                                                                                                                                                                              |
| `NODE_USE_ENV_PROXY=1 bun run qa:links`                                                                                                                                                                                | Passed; 1,784 resolved, one access warning and zero broken destinations.                                                                                                                                                           |
| `bunx wrangler deploy --dry-run --outdir /tmp/typeshade-benchmark-worker`                                                                                                                                              | Passed; existing bindings. Worker 874.60 KiB, gzip 132.81 KiB. No deployment.                                                                                                                                                      |
| `prepare_monolith_input.py`, `verify_change_rate.py`, `verify_gates.py`                                                                                                                                                | Passed; Korean copy used the low-risk route and passed structural gates. The audited draft needed no further wording changes.                                                                                                      |

All 30 quick cases and 90 extended cases passed correctness checks. Device timestamps were
available for all 20 quick and 60 extended compiled rows. The 10 quick and 30 extended
application rows use complete-call wall time, with resident readbacks measured separately.
The new runtime artifacts are 439,080 and 439,332 bytes. They are fetched only when a run starts.
The Worker increased from 805.10 KiB/gzip 128.63 KiB to 874.60 KiB/gzip 132.81 KiB.
No compiler bundle budget or compiler source changed.

Screenshots were inspected in both languages, both themes, at 390 and 1440 pixels, with menus
open and closed and both result tables populated. The comparison controls and table regions
are 358 pixels wide at 390 and 836 at 1440. Document scroll width equals viewport width.
Headers remain 65 pixels tall. To check shell invariants, the browser hides only the added
comparison section, measures header/footer/legacy controls, then restores it. Their dimensions
remain equal. The footer retains its three groups; no global container or grid count changed.

Local screenshots, software-only instrument records, measurements and compiler timings stay
in ignored directories. CI retains the software instrument evidence for three days. The
physical-device report is private and is not included in those artifacts. PR #216 has not
been merged or deployed. Owner review, CI and a physical-device rerun remain open.

The source-identity follow-up retains the first implementation catalog from `23ad4bf`.
It adds the measurement-source hash to the current catalog and keeps both collector contracts.
A negative probe changed `timing.ts` temporarily: the catalog check rejected it, then passed
after the source was restored. A regression test also accepts the retained catalog.
A changed timing or validation implementation therefore cannot enter an existing measurement
cohort silently. Changing only compiler/runtime artifacts keeps the fixed workload identity.
