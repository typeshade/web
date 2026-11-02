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

- Four fixed WGSL cases join the unified benchmark's compiled cases
  (`src/lib/benchmarks/subgroups.ts`). TypeShade does not author subgroup built-ins, so they
  are written by hand in the compiled cases' layout and run unchanged on both builds:
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
- Workload `applications-4`, instrument `unified-3`. The comparison stays `a21f7024` against
  `3e1e8420`; the catalog digest, the workload hash and the measurement hash move. Retained
  catalogs and their records are unchanged.
- The page's device section shows the probe. The method section explains the cases. The
  compute chart gains the four rows. Both locales.
- `bun scripts/benchmark-data.ts analyze` adds `subgroupSummary`: each fixed case's median
  against its reference's, within one build, one size and one run, for elapsed and GPU time.
  A value above 1 means the subgroup fold took less time on that device.

Out of scope: any compiler change, a new section or chart, a new collector endpoint, a move of
the compiler pin.

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

## Validation

To be recorded before the pull request is marked ready: the commands, the configuration and the
observed results.
