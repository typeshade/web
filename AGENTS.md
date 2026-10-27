# Website workspace instructions

## Current owner direction

This repository manages the TypeShade, TypeNN and TypeCV websites and their shared UI.
**All published content on all sites is in editorial review scope.** Do not limit the work to
home pages or the last example the owner pointed out. Include documentation, imported and
generated reference, example descriptions, UI controls, errors, accessibility labels and SEO
metadata.

The owner rejects artificial paired slogans and prose that sounds machine-written, even when
it is factually accurate. Do not respond by making everything terse, noun-only or encyclopedic.

1. Use the official Blend2D, React, Vue, MapLibre and Mapbox sites as English writing references.
   Read [docs/content-style.md](docs/content-style.md) for the source links and practical criteria.
2. Write and review **English first**. Introduce the product, explain what developers can do,
   and connect explanations with concrete APIs or examples. Task headings, reader questions and
   direct instructions are allowed where they serve the content.
3. Korean is a **translation of the reviewed English**, with the same meaning, tone, examples,
   qualifications, claims and calls to action. Use natural Korean grammar, but do not invent
   separate Korean slogans, explanations or product positioning.
4. Preserve API names, code behavior, numerical results, support limits, links and existing
   section anchors. Verify technical changes against the pinned implementation. Do not turn
   planned functionality or one experiment into a general guarantee.
5. Automated checks do not establish writing quality. Review the actual prose and translated
   meaning, then verify layout and links where content changes affect them.
6. Imported documentation and generated API descriptions are not exempt. Preserve provenance;
   do not silently edit vendored runtime code or dependency pins for a wording change.

These owner instructions supersede older local advice that mandates noun-only headings,
Wikipedia-like prose, separate Korean authoring, arbitrary sentence lengths or numerical
patterns. Align conflicting local guidance with these instructions.

## Work and handoff

- Read [docs/content-review.md](docs/content-review.md) for the active scope, assignments,
  completed review, validation and remaining work. Update it with concrete evidence. Do not
  claim all content was reviewed if a subset only received a pattern scan.
- The owner explicitly requested **Luna subagents** for this editorial review. Use
  `gpt-6-luna` for delegated review tasks, with separate file ownership. The main agent
  integrates and verifies their results. This records the current task preference; future
  explicit owner directions take precedence.
- Keep changes reviewable. Do not merge or deploy solely because the editorial checks pass.
  Continue the existing review branch/PR unless the owner changes the workflow.
- Tailwind and shared components are the established frontend approach. Frontend libraries
  are permitted when useful; this editorial work does not require replacing the stack.
