# Subgroup cases in the unified benchmark

## Request and baseline

The owner asked on 2026-11-02 for the subgroup measurement to run on the site, so that any
visitor with a WebGPU device can contribute a result. The measurement itself was first written
as a script in the compiler repository (`scripts/bench-subgroup-reduce.ts`, compiler PR #903),
which needs a development machine; the owner's hardware adapter is not available for it.

Site baseline: `main` at `2bd140dced0c180ff34a30e8be583c76535decb7`. Compiler pin:
`3e1e8420a5313e045beb175131148920bfdc2d07`, unchanged. The compiler's roadmap places subgroup
operations after 1.0, and compiler issue #536 asks for them with one use in view: a subgroup
fold before `atomicAdd`. This change measures; it decides nothing about the compiler.

## Scope

- Four subgroup cases join the unified benchmark's compiled cases
  (`src/lib/benchmarks/subgroups.ts`). They are TypeShade programs in the compiled cases'
  layout, and each build of the comparison compiles them like every other case. Since
  compiler change 0117 (pin `cdb12dc`) an author writes the subgroup built-in functions; a
  build whose compiler predates the change refuses the three programs that call them, the
  catalog records the refusal on that build (`refused`) instead of a program, and the
  instrument reports their rows there as `failed` with the reason `refused`, nothing measured.
  The run still completes, and the candidate build runs all four:
  - `reduction-subgroup`: one `subgroupAdd` per subgroup, lane 0 sums the `num_subgroups`
    partials. Right on any assignment of lanes to subgroups.
  - `reduction-subgroup-levels`: a second `subgroupAdd` level over the partials. Right only
    where a subgroup's lanes are consecutive; a device that assigns them otherwise fails the
    value check.
  - `atomics-bins-1-subgroup`: a subgroup fold, then one `atomicAdd` per subgroup into one bin.
  - `atomics-bins-1-workgroup`: the workgroup tree, then one `atomicAdd` per workgroup. No
    extension; the alternative the compiler could emit today.
- Their references are the existing `reduction-workgroup` and `atomics-bins-1` cases, with the
  same inputs, output length and dispatch calibration.
- The version worker requests the `subgroups` feature where the adapter has it, and runs one
  probe workgroup of 64 lanes before the instrument counts buffers. The record's
  `metadata.subgroups` holds the adapter's size range, the `subgroup_size` and `num_subgroups`
  the probe saw, and whether its lanes were consecutive; `null` on a device without the feature.
- A device without the feature skips the three cases that need it. Their rows are `failed` with
  the reason `unsupported`, nothing measured, and the run still completes. A passed row for such
  a case on such a device is rejected, and so is an unsupported row on a device that has it.
- Workload `applications-5`, instrument `unified-4`. The comparison is `8c088df7` (refuses the
  three subgroup programs) against `cdb12dc0` (compiles all four); the catalog digest, the
  workload hash and the measurement hash move. Retained catalogs and their records are
  unchanged.
- A `refused` row is accepted only where the catalog records the refusal on that build, and a
  passed or measured row for such a case on such a build is rejected.
- The page's device section shows the probe. The method section explains the cases. The
  compute chart gains the four rows. Both locales.
- `bun scripts/benchmark-data.ts analyze` adds `subgroupSummary`: each subgroup case's median
  against its reference's, within one build, one size and one run, for elapsed and GPU time.
  A value above 1 means the subgroup fold took less time on that device. A build that refused
  the case contributes no ratio for it.

Out of scope: any compiler change, a new section or chart, a new collector endpoint, a move of
the compiler pin (the pin moved to `cdb12dc` in PR #14, before this change was rebased on it).

## What a record answers

For one device, the `compute` chart and `subgroupSummary` give three ratios:

| Pair                                             | What it decides                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `reduction-subgroup` over `reduction-workgroup`  | The saving a subgroup pre-fold of an integer reduction would bring. An integer sum has one value in any order. |
| `atomics-bins-1-subgroup` over `atomics-bins-1`  | Compiler issue #536's use: a subgroup fold before an atomic accumulation.                                      |
| `atomics-bins-1-workgroup` over `atomics-bins-1` | The same saving with no extension, which any device runs.                                                      |

The probe says what the compiler would have to assume: the subgroup size range a device
reports, and whether a subgroup holds consecutive lanes, which `reduction-subgroup-levels`
depends on. A float reduction is not measured here: its result depends on the fold order, which
the compiler's Rule 7.2 fixes, and a subgroup fold would need that rule amended first.

Reports are voluntary and unverified. Maintainers export them with
`bun scripts/benchmark-data.ts export` and read `subgroupSummary` per adapter. A software
renderer (SwiftShader) runs a barrier as a thread switch and says nothing about a GPU.

## Validation record

Observed on 2026-11-02 UTC on branch `claude/benchmark-subgroups` at `de6a75d`, base `main`
`2bd140d`, compiler pin `3e1e8420` unchanged. Node 24.22.1, pnpm 10.28.2, Bun 1.4.3 for the
catalog and 1.4.4 for the tests, Chrome for Testing 153.0.8010.12 on SwiftShader, Wrangler from
the lockfile with a temporary local D1. The Astro build ran with `--max-old-space-size=12288`;
the default heap ran out in this container. These checks validate the instrument and the
presentation; a software device establishes no GPU performance.

| Command                                                                | Observed result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run check:types`                                                  | Passed for the site and the Worker.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `bun test scripts/benchmarks.test.ts`                                  | Passed; 18 tests, one added for the unsupported rows and the fixed-case pairing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `bun run test:playground-boundaries`                                   | Passed; 11 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `check:style`, `check:copy`, `check:i18n`, the build's checks          | Passed; 3,397 translated strings, route parity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `bun@1.4.3 scripts/regression-catalog.ts --new`, then `--check`        | Reproduced; two builds `a21f7024` and `3e1e8420`, 26 cases each, workload `d0c12750…`; runtime artifacts unchanged. The first catalog, generated before the measurement sources were formatted, did not reproduce and was replaced (`a8d91b0`).                                                                                                                                                                                                                                                                                                                        |
| `bun run check:benchmark-catalog`                                      | Passed; the 22 retained fixtures reproduce on `94203d3c`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `astro build`, `pagefind`                                              | Passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `bun run qa:seo`, `qa:worker-routes`, `qa:openseo`                     | Passed; 2,614 pages, 2,494 sitemap entries; 8 prefixes shadow no page; no warning or critical issue.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm test:styles apps/typeshade/dist`, `check-reference-notes --dist` | Passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `PLAYWRIGHT_CHROMIUM=… node scripts/check-benchmarks.mjs`              | Passed: 68 quick and 204 extended rows, every row passed with its corruption probe; the probe saw size 4, 16 subgroups per workgroup of 64, consecutive lanes; the four fixed cases passed on both builds; with the feature hidden, the three cases that need it were skipped as `unsupported` (6 rows), the run completed and the collector accepted it; receipts, retry, cancellation, corrupt artifact and corrupt program checks as before; both locales and themes at 390 and 1440. The first run stalled in the fault test, which hid `has()` alone (`de6a75d`). |

Layout, from `shots/benchmarks/measurements.json`: the header stays 65 pixels tall; the document
width equals the viewport; the run control is 44 pixels tall; the controls and every chart are 836
pixels wide at 1440 and 358 at 390, as before this change. The compute chart holds ten rows.

Medians of the device time on this software adapter, extended profile, 262,144 elements, in
milliseconds per dispatch, baseline build then candidate build:

| Case                        | Baseline | Candidate |
| --------------------------- | -------- | --------- |
| `reduction-workgroup`       | 87.49    | 85.48     |
| `reduction-subgroup`        | 44.93    | 44.68     |
| `reduction-subgroup-levels` | 64.24    | 66.53     |
| `atomics-bins-1`            | 15.10    | 12.63     |
| `atomics-bins-1-subgroup`   | 6.60     | 8.04      |
| `atomics-bins-1-workgroup`  | 103.86   | 101.19    |

The two builds run the same bytes for these cases, so their difference is the run's noise. On this
device the subgroup reduction took about half the workgroup tree's time and the subgroup fold
before one atomic about half the per-lane atomics' time; the workgroup tree before one atomic took
seven times the per-lane atomics' time. SwiftShader runs a barrier as a thread switch, which is why
the tree is slow here. None of this is a GPU result.

Not run: a hardware adapter; the production collector (the check uses a local D1 and intercepts
submissions for the repeated runs).

## Revision of 2026-11-02: TypeShade source

The cases were first fixed WGSL programs that both builds ran unchanged, because the pinned
compiler (`3e1e8420`) did not author the subgroup built-in functions. On the owner's decision
of 2026-11-02, compiler proposal 0117 made them authorable (implemented at `cdb12dc`), the pin
moved there (PR #14), and this change was rebased on it: the four cases are now TypeShade
source, compiled by each build, and the `refused` row reason records a build that cannot
compile them. The probe stays fixed WGSL, since it belongs to the instrument and not to a
build under comparison. The validation record above describes the fixed-WGSL revision at
`de6a75d`; the record for this revision is on the pull request.

## Status

In progress: the conversion is on PR #22, waiting on its checks and the owner's go-ahead.
