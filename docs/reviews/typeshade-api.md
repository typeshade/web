# TypeShade generated API review

## Scope

Reviewed the canonical English source and Korean translation for API worklist entries 1–200, in order, from `compile` through `FieldSpec`. These entries contain 763 text fields (169,079 source characters), including summaries, descriptions, members, parameters, returns, targets, examples and exceptions. Canonical source and source hashes came from `PATH=/tmp/site-tools/node_modules/.bin:$PATH bun scripts/check-api-translations.ts --worklist /tmp/api-ko-worklist.json --locale ko` and `apiSourceTexts` in `src/lib/api-translations.ts`.

The paired review covered the first 200 of 518 current entries; entries 201–359 and 360–518 are being reviewed in separate notes by `shade_documents` and `shade_lessons`. This note does not claim those ranges were reviewed here.

## Korean edits

Changed 75 text fields across 46 Korean JSON files in this range. Most edits remove a duplicated copula after a code identifier (`undefined`이입니다 → `undefined`입니다, `error`이입니다 → `error`입니다). I checked each context and retained legitimate nouns such as `길이입니다`. Other targeted fixes address visible grammar slips (`방식는`) and inconsistent informal sentence endings. JSON keys, source hashes, examples, code fences, code spans, numerals and link targets remain intact.

Retained the detailed compile and emit explanations, their qualifications and examples. The explanations are long because the generated API documents target-specific behavior; I did not shorten them in ways that could lose conditions or support limits. Korean translations track those distinctions, including CPU versus GPU behavior, optional fields, unsupported targets and numeric precision.

## App-owned source corrections

The English API is generated from the pinned compiler, so corrections live in `src/lib/api.ts` and `src/lib/guide.ts`, never in the vendored checkout. `src/lib/editorial-source.ts` requires each original passage to occur exactly once; `scripts/editorial-source.test.ts` checks replacement, missing-source and duplicate-source behavior. The corrections run before API translation hashes are calculated. Korean text was checked against each corrected source before the affected hashes were restamped.

- `Pack.members.emit` (`vendor/shader-dsl/src/core/manifest-types.ts`) has “One the build did not give is absent and stands for its default …”. The site display now says “Each option the build did not provide is absent and uses its default …”. The Korean field describes each absent option and its default.
- `DiagnosticDirective.summary` (`vendor/shader-dsl/src/core/ir/nodes.ts`) had a code-span stripping artifact, “One WGSL diagnostic; directive.” The display restores the full `diagnostic(severity, rule);` spelling; Korean preserves the same code span.
- `Fp64Guard.description` (`vendor/shader-dsl/src/core/fp64/df64-lib.ts`) claimed “No compiler treats a texel as a compile-time constant.” The display now states the implementation-specific fact that the emitted shader reads `_fp64` from a bound texture rather than embedding its texel value as a constant. Korean mirrors that narrower claim. This does not promise how every downstream compiler optimizes it.
- `log.description` (`vendor/shader-dsl/src/core/math.ts`) says “floor the argument with `max`,” although `max` supplies a lower bound. The display now says “set a lower bound with `max`.” Korean meaning remains unchanged.
- `createRuntime.summary` (`vendor/shader-dsl/src/runtime/runtime.ts`) had malformed grammar around the first preferred tier and repeated “limits.” The display names the first available `prefer` tier and explicitly distinguishes program feature requirements from limits requested by programs and the `limits` option. Korean was updated to retain that distinction and the code spans.
- `Frame.members.submit` (`vendor/shader-dsl/src/runtime/runtime.ts`) said output was delivered “to what their buffers held,” and called `lines` the calls, though the returned field is a count. The display now describes the result object and `lines` as the number of kept calls; Korean is aligned.
- `AUTHORING.md` § “The CPU oracle” said `worst` marks “where the two part.” The guide display says “where the results differ.” The existing Korean translation already conveys that meaning; its source hash was refreshed.

The apparent `CpuValue` / `CpuPrecision` mismatch is resolved by the implementation. `CpuValue` describes JavaScript representation: numeric CPU values are JS `number`s (double precision). `CpuPrecision` describes arithmetic: `precision: 'f32'` runs the f32-rounding pass, which wraps computed f32-typed expressions in `__fround` after each operation (`vendor/shader-dsl/src/core/passes/precision.ts`, called by `src/core/oracle.ts`). The claims address representation and arithmetic respectively, so both were retained in English and Korean.

## Verification

The 1–200 Korean review changed 75 fields across 46 files. Entries 201–359 are documented in `docs/reviews/typeshade-api-documents-range.md`; entries 360–518 are documented in `docs/reviews/typeshade-api-lessons-range.md`. Source corrections changed six API translation hashes and the corrected CPU-oracle guide section hash. Verification: `check:api-ko` passes all 518 translations; `check:api` passes; `check:types` passes; `scripts/editorial-source.test.ts` passes both tests. The two obsolete Korean rule stamps (8.10 and 8.24) were removed after reviewing their remaining explanations; the integrated `check:guide` now passes all 15 translated sections.
