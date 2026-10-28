# Template and rendering follow-up

Current deployment and repository ownership are recorded in
[repository-migration.md](repository-migration.md). The owner subsequently authorized the
CI/CD cutover; PR #7 and its predecessors are merged, and all three sites are deployed from
this repository. Branch, draft and authorization statements below describe the earlier review
phase, not the current operational state.

The owner asked to continue after the all-site content review. The next slice addresses
remaining duplicated page markup and the code-rendering gaps found during integration.
Baseline: `c62f78e`, branch `fix/typeshade-home-navigation`, draft PR #7.

## Completed implementation

| Area | Luna owner | Scope |
| --- | --- | --- |
| TypeNN page templates | typenn_content | One locale-driven template per paired route family; thin English/Korean routes; preserve reviewed content and runtime behavior |
| TypeCV page templates | typecv_content | Shared home, playground and lab templates; remove confirmed unused legacy build assets |
| Code rendering | shade_lessons | Correct TSX grammar and fence-language handling; reduce duplicate token-rendering logic; retain compatible public APIs |
| Integration | Main agent | Review changes, compare built content, verify browser behavior, update PR and handoff |

Capture built text, headings, links, anchors and code before refactoring. Compare the result
afterward so template extraction cannot silently drop reviewed content. Each application has
one build owner; use the canonical package scripts, with pnpm 10.28.2. Do not run TypeCV's old
static generator over the Astro output.

TypeNN's 16 localized routes now use seven shared page layouts, shared code examples and
explicit locale data. TypeCV's six home/playground/lab routes use three shared layouts.
Interactive islands enter TypeNN's common layout through a slot, so Lab and Playground
retain separate CSS imports. The built stylesheet ownership check now enforces this boundary
for both locales.

Removed TypeCV's unused static generator and its styles/scripts (1,162 lines). Astro and
`scripts/prepare.mjs` remain the canonical build path. The code helper now handles TSX grammar,
fence aliases and language metadata without changing existing inline output.

Use [page-templates.md](page-templates.md) to find the layout, wording and example owner for
each page. Detailed results: [TypeNN](reviews/typenn-templates.md),
[TypeCV](reviews/typecv-templates.md), [highlighting](reviews/code-highlighting-followup.md).

## Validation

- TypeNN and TypeCV application checks/builds pass (17 and 39 pages). TypeCV's three
  documentation link/rendering tests pass.
- TypeCV's 39 pages match the actual `c62f78e` CI artifact using the same browser DOM
  extraction for both builds: visible text, metadata, links, headings/IDs, exact code text,
  controls and island props. TypeNN's extraction also preserves content and code; spaces
  missing beside several inline expressions in the original HTML have been restored.
- Responsive checks cover all 16 TypeNN localized routes at 320/390/1440 pixels and TypeCV's
  home/docs/playground/lab entries in both locales at those widths. Shared browser smoke
  checks cover hydration, persistent themes, accessibility and real CPU playground execution.
- Shared code tests (3), UI type checks and built CSS ownership checks pass. Comparing the
  old and new helpers gives identical HTML for 1,405 unique inline expressions from the
  existing TypeShade build. TypeShade's application and worker TypeScript checks pass.
  No TypeShade page content or runtime code changed in this slice.
- No dependency or vendor pin changed. The TypeNN/TypeCV builds retain their existing Vite
  advisory for chunks over 500 kB; bundle optimization is outside this completed extraction.

The review branch remains a draft PR, stacked on #6. These changes do not authorize a merge
or production deployment. New CI results belong to the follow-up revision, not its baseline.

## Prior revision CI

For `c62f78e`, run [40454514084](https://github.com/typeshade/web/actions/runs/40454514084)
passed all five jobs: controls, scope, TypeShade, TypeNN and TypeCV. These results apply to the
previous revision, not the new template changes.
