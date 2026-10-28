# Documentation title spacing

## Request

Give page titles more separation from the first paragraph. Keep document widths, type sizes,
sidebar structure and example dimensions unchanged.

## Baseline and change

Base: `feat/standalone-learning-coverage` at `d5623784d30de1b93c4073aa2fff8286f6ad07ca`.
The shared documentation h1 ends with a 12px margin. A hidden reference-kind paragraph can
make the reference summary's effective gap 16px. Use a consistent 24px title separation.

## Review

Measure title and first visible paragraph boundaries before and after at 1440 and 390 in both
languages and themes. Review concept, precision and function pages. Keep the article width
and title size unchanged. Run the repository formatting, build and documentation checks.

## Verification

Reviewed on 2026-10-23 with Bun 1.4.3 and Chromium/SwiftShader. Twenty-four built-page views
covered concept, precision and function pages in EN/KO, light/dark, at 1440 and 390 pixels.
All title-to-lead gaps measured 24px. Document widths stayed 836px and 358px, respectively;
heading font sizes stayed unchanged. Captures and before/after measurements are available in
`/workspace/shared/docs-title-spacing/` for this session.

Formatting, the production build, SEO, OpenSEO, worker routes, downstream impact, IfChange
and documentation navigation passed. The pull request records the external-link result.
This change is stacked on the standalone learning PR and is not deployed by this task.
