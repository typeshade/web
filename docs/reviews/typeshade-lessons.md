# TypeShade lesson dictionary review

## Scope read

Read all prose in these assigned dictionaries, including labels, examples, cautions, dynamic
labels, and the precision guide's tables, questions, source notes, and correction text:

- `apps/typeshade/src/i18n/concept-lessons-en.ts`
- `apps/typeshade/src/i18n/concept-lessons-ko.ts`
- `apps/typeshade/src/i18n/function-lessons-en.ts`
- `apps/typeshade/src/i18n/function-lessons-ko.ts`
- `apps/typeshade/src/i18n/operation-lessons-en.ts`
- `apps/typeshade/src/i18n/operation-lessons-ko.ts`
- `apps/typeshade/src/i18n/precision-guide-en.ts`
- `apps/typeshade/src/i18n/precision-guide-ko.ts`

Read `/workspace/web/AGENTS.md`, `docs/content-style.md`, and `docs/content-review.md` before
editing. The lesson copy generally gives concrete operations and conditions. The main quality
problem was a repeated operation prompt that said only to compare an input and result and look
for a boundary, even for operations with no boundary.

## Changes

Replaced the generic prompts in the operation dictionary with instructions tied to each worked
model: texture dimensions, array layers and samples, buffer length, texture stores, boolean
reductions, array operations, conversions, bit casts, random-number illustration, uniform and
storage access. Wrote English first, then aligned the Korean prompts to the same examples and
claims. Also made the English exponential lessons more direct (`e` and `2` instead of “natural”
and “binary” bases) and corrected an awkward Korean typo. No headings, anchors, API names, code,
or numerical examples changed.

Checked the model-specific prompts against `apps/typeshade/src/lib/operation-models.ts`; checked
texture dimensions/layer semantics against `apps/typeshade/vendor/shader-dsl/src/core/ir/node.ts`;
and checked the precision guide's TypeShade option claim against
`apps/typeshade/vendor/shader-dsl/src/core/backends/glsl.ts` (`GlslEmitOptions.floatPrecision`
and the emitted float precision line). The pinned emitter defaults to `highp` and accepts
`mediump` as the stage's float precision option.

## Retained content

Kept the concept and function explanations, operation definitions and cautions, and the precision
guide's detailed limitations. They preserve useful distinctions such as fragment derivative
requirements, WebGPU-only support, CPU illustration versus GPU execution, device-reported
capabilities versus measurements, and emulated `f64` versus native hardware double precision.
The existing Korean prose is specific and readable; where it gives a more concrete view of a
worked operation, the English now carries that same detail so the Korean remains a translation.

## Verification

`PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm check:typeshade` passed. The broader page
render and link checks belong to the integrated review because this assignment changes lesson
text but no routes or anchors.

After the integrated copy checker flagged `bitcast.try` because English said “hexadecimal” while
Korean spelled out `16`, changed the English to “an unsigned integer in base 16.” The strings now
state the same representation. `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter
typeshade-site check:copy` passed: 3,334 translated strings, no problems.

## Remaining issues

None found in the assigned dictionaries. This note covers only the eight lesson dictionaries;
it does not claim a review of other TypeShade surfaces.
