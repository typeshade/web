# Private input projection benchmark

## Configuration

Site PR #205 updates the compiler pin from `94203d3c` to `85b803f974b8e78a36ef831a9f8c2f475ef6da87`.
The candidate integrates runtime-information PR #736 with input-projection PR #738.
The site review baseline is main `1b44abbe25b4b822165a771a003308a0024cab1c`.
Git records the implementation revision. No release version or physical-device performance result is assigned.

The owner authorized continuation and task-related merges on 2026-10-22 UTC.
A Codex agent implements and validates this follow-up. The accepted compiler proposals are 0082 and 0083.
Proposal 0082 remains accepted pending controlled physical-device whole-call evidence. Proposal 0081 deviation D1 remains open.

PR #218 advances the comparison to `85b803f9` against `3b40e065`. Both builds project the
eligible inputs and expose runtime information. The generator records each exact build's
`inputProjection` capability. Record validation checks actual per-build input sizes and
preserves the earlier full-input comparison below.

## Workload

Workload `applications-3`, instrument `unified-2`, retains every experiment from the unified benchmark.
It adds three ordinary kernel calls over read-only objects with eight scalar fields.
The calls read one, four or all eight fields into a separate output array.
The same authored source and compiler options are built at each exact compiler revision.

The existing application module retains `fuse: true`. The new module omits that option because it disables input projection.
Both modules share one runtime within each version worker. The two compiler builds remain isolated in separate workers.
The baseline uses the full input layout. The candidate projects the one-field and four-field cases.
The eight-field case provides a full-layout control. Host objects remain complete in every case.

There are 30 cases, each run against both builds. Quick runs have 60 result rows; extended runs have 180 rows.
Four grouped charts remain. The three added cases appear under data and memory.
No table, extra Run action, report UUID or submission is added.

## Measurements

Elapsed time covers the actual host call, including validation, packing, upload, execution and output readback.
Input generation, reference calculation and result checks are outside that interval.
Each call checks every output and every unchanged input field against the independent reference.
An altered output must fail comparison. An invalid last input field must throw `TypeError`, even when the GPU omits it.
A missing GPU pass fails the new cases; fallback cannot produce a passing GPU observation.

Validation and packing are separate CPU probes using each build's real checker and packer.
They run before the actual call and can warm JavaScript data and caches.
They are diagnostic observations, not additive subdivisions of elapsed time.
Packing retains complete logical validation and property reads, including omitted fields.
The record includes packed input bytes and every measured call's actual `writeBuffer` bytes.

When enabled, one compute pass receives timestamp writes. Query resolution and copies are encoded into that call's command buffer.
Reading the query result occurs after the elapsed-time interval. Both builds have the same instrumentation overhead.
Instrument query buffers are excluded from tracked workload buffer memory.
Unavailable or unresolved timestamps stay unavailable; they do not become zero-time measurements.

First-call, resident-chain, repeated compiled-dispatch and buffer-memory definitions remain those of the unified instrument.
The report adds validation, packing and upload views to the same four charts.
Raw samples and all sizes remain in the downloadable JSON.

## Provenance and reports

The candidate's actual device owner supplies `Device.info` through proposal 0083's shared API.
Its build revision is `null`: the benchmark bundles unstamped source archives.
Exact compiler pins, runtime artifact hashes, workload hashes and instrument hashes provide separate provenance.
The older baseline has no shared information API. Its adapter observations remain attributed to its own creation adapter.
A separate WebGL probe stays separate from the actual WebGPU device snapshot.
The snapshot describes the opened device, not each call's effective tier.

Historical catalogs and runtime artifacts remain retained. Legacy records use their own application lists and row counts.
A new cohort cannot reinterpret an older report as containing the added projection cases.
The collector's body limit, private D1 storage, retention and rate limits remain unchanged.
Run still authorizes one automatic report, as disclosed immediately below the button.
Tests use local D1 or intercept submissions; they send no synthetic production reports.

## Validation status

A Codex agent completed local functional validation and document review on 2026-10-22 UTC.
The tested compiler pin is `85b803f9`, based on site main `1b44abbe`.
Bun 1.4.3, Node 24.19.0, Chromium 154.0.8037.57 and Wrangler 4.142.0 were used.
Git identifies the containing implementation commit; PR #205 records final-head CI separately.

| Command or review                                                     | Observed result                                                                                                                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bun run build`                                                       | Passed; both locales, 518 translated API entries and the pinned guide/rule checks.                                                                                                               |
| `bun run check:types`, `bun run format:check`                         | Passed.                                                                                                                                                                                          |
| `bun test scripts/*.test.ts`                                          | 91 tests passed across seven files. The final benchmark suite passed 16 tests after the retained-row-count assertion was added.                                                                  |
| `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium bun run check:benchmarks`      | Passed: 60 quick and 180 extended rows, real GPU calls, correctness/corruption probes, actual-device information, absent timing, cancellation, automatic reports, local D1 receipts and retries. |
| `bun run check:benchmark-catalog`, `bun run check:regression-catalog` | Passed: 22 retained original fixtures and reproducible artifacts from both exact builds.                                                                                                         |
| `bun run qa:seo`, `bun run qa:worker-routes`, `bun run qa:openseo`    | Passed: 2,602 pages, no route shadowing and zero OpenSEO issues.                                                                                                                                 |
| `NODE_USE_ENV_PROXY=1 bun run qa:links`                               | Passed: 1,775 resolved URLs, 17 transport/service warnings, zero broken destinations. The direct-network attempt was stopped; Node needs the session proxy.                                      |
| `bun scripts/check-reference-notes.ts --dist`                         | Passed in both locales.                                                                                                                                                                          |
| Downstream-impact, IfChange and manual commit gates                   | Passed. Proposals 0082 and 0083 are recorded in `compiler-changes.md`.                                                                                                                           |
| Korean wording gates                                                  | Passed. The first authored Korean wording needed no additional polish.                                                                                                                           |
| Browser document review                                               | 56 captures across seven API/guide routes, both locales, 390/1440 pixels and both themes; zero horizontal overflow.                                                                              |
| Benchmark visual review                                               | Eight locale/width/theme cases, populated charts and open menus passed. Four section colors, no table and one Run action remain.                                                                 |

At 16,384 rows, one-field input packing decreased from 524,288 to 65,536 bytes.
Its actual upload decreased from 589,840 to 131,088 bytes. Four-field input packing was 262,144 bytes;
eight-field input packing stayed 524,288 bytes in both builds. Every field case checked 147,456 values.
These are instrument and byte-count observations on software WebGPU, not physical-device speed evidence.

The header remains 65 pixels tall. Benchmark controls remain 358 pixels wide at 390 and 836 at 1440.
Run remains 44 pixels tall in English and 45.172 in Korean. The notice remains 14 pixels directly below Run.
No container width or grid column definition changed. The data chart adds three field-read workload rows.

Compiler PR #736 merged as `72049d09`, and editor PR #59 merged as `82b4f2ef` before this site pin.
Site merge/deployment and controlled physical-device reproduction remain separate pending actions.
Container GPU checks use SwiftShader. They validate behavior and instrumentation, not physical-device speed.
Visitor observations require controlled reproduction before a general layout policy or completed 0082 status is claimed.
