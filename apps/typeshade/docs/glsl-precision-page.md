# GLSL precision learning page

## Request

Answer searches for `precision highp float;` with an explanation useful without TypeShade.

## Outcome

Create an English and Korean concept page at `/guide/concepts/glsl-precision/`. Explain the
statement and its scope, stage and version defaults, precision choices, practical failure
modes, and capability inspection before the optional compiler-specific section.

Use a compact numerical rounding model with explicit assumptions. Keep device-reported
capabilities separate from simulated arithmetic. Preserve the existing compiler-derived
internals and link readers between the learning page and emit-option documentation.

## Review

Check normative claims against Khronos specifications and MDN. Review both languages at
1440 and 390 in both themes. Check native fallback, model controls, browser capability
queries, internal discovery, Pagefind search, metadata, links, and existing navigation.

## Source clarification

The pinned compiler's AUTHORING.md and its Korean translation contain four overstatements:

- A missing implicit float precision applies to the fragment stage, not the vertex stage.
- A float default does not override explicit qualifiers or rewrite earlier declarations.
- The fragment int default is mediump; the compiler's explicit highp int line requests
  the range its generated integer work needs.
- Mediump is a specification tier with minimum requirements, not a universal binary16
  storage and arithmetic promise.

The new article states the language rules and links primary specifications. An authored
clarification above the generated internals supplies the corrected reading. The generated
source and compiler pin are unchanged. Upstream AUTHORING.md correction remains a separate
documentation follow-up at compiler pin `94203d3cab6433065bbe111c3b93f66a4058828e`.

## Verification

The learning page is implemented in both languages. Two independent reviews covered
specification accuracy and the reading path without TypeShade knowledge.

Local checks on 2026-10-23 passed with Bun 1.4.3 and Chromium using SwiftShader:

- Production build, type checks, formatting, Korean copy gates, and font coverage.
- SEO for 2,598 pages, worker routes, OpenSEO, and 2,476 documentation navigation contexts.
- Eight language, viewport, and theme combinations with 56 captured views.
- Numerical rounding cases, explicit WebGL 1 and 2 queries, six Pagefind searches,
  two script-free fallbacks, and three unavailable or unsupported query cases.
- A compact mobile capability table with visible headers and a height regression check.
- External links: 1,789 resolved, no broken destinations, and one transport warning for
  the existing STIX font licence URL at `http://scripts.sil.org/OFL`.

This branch is stacked on the contextual documentation sidebar change. Deployment waits for
the pull requests to merge.
