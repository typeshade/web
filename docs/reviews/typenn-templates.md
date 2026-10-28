# TypeNN locale page templates

Refactored the eight English/Korean route families into shared app-owned Astro templates with locale-specific copy data. The 16 route modules are now 92 lines total, down from 1,931 lines of paired page markup and inline snippets. Shared structure, IDs, classes, links, and interactive props live in the page components; English and Korean copy remains explicit in locale dictionaries. Repeated code examples now have one source in `src/content/code-examples.ts`.

## Reviewed and changed files

All paired route modules:

- `apps/typenn/src/pages/index.astro` and `apps/typenn/src/pages/ko/index.astro`
- `apps/typenn/src/pages/guide/index.astro` and `apps/typenn/src/pages/ko/guide/index.astro`
- `apps/typenn/src/pages/guide/execution.astro` and `apps/typenn/src/pages/ko/guide/execution.astro`
- `apps/typenn/src/pages/guide/training.astro` and `apps/typenn/src/pages/ko/guide/training.astro`
- `apps/typenn/src/pages/api/index.astro` and `apps/typenn/src/pages/ko/api/index.astro`
- `apps/typenn/src/pages/examples/index.astro` and `apps/typenn/src/pages/ko/examples/index.astro`
- `apps/typenn/src/pages/lab/index.astro` and `apps/typenn/src/pages/ko/lab/index.astro`
- `apps/typenn/src/pages/playground/index.astro` and `apps/typenn/src/pages/ko/playground/index.astro`

Shared templates and copy/data modules:

- `apps/typenn/src/components/pages/HomePage.astro`
- `apps/typenn/src/components/pages/InteractivePage.astro`
- `apps/typenn/src/components/pages/GuidePage.astro`
- `apps/typenn/src/components/pages/ExecutionPage.astro`
- `apps/typenn/src/components/pages/TrainingPage.astro`
- `apps/typenn/src/components/pages/ApiPage.astro`
- `apps/typenn/src/components/pages/ExamplesPage.astro`
- `apps/typenn/src/content/locale.ts`
- `apps/typenn/src/content/code-examples.ts`
- `apps/typenn/src/content/guide-copy.ts`
- `apps/typenn/src/content/api-page.ts`
- `apps/typenn/src/content/examples-page.ts`

The home and interactive-page copy is colocated with its shared component. `InteractivePage.astro` is runtime-agnostic and renders a slot; each Lab/Playground route imports and hydrates only its own React island with the original `locale` and `client:load` props. This keeps Lab and Playground component CSS route-specific. The final build reports 43,074 bytes of route CSS for Lab and 43,978 bytes for Playground. Lab loads the 5,349-byte graph stylesheet; Playground loads its own 4,139-byte stylesheet plus that graph stylesheet. Neither route bundles the other island's stylesheet. The `docs.css` imports moved with the Guide, Execution, Training, API, and Examples templates. The site shell and shared UI package were not changed.

## Content and implementation verification

Captured a semantic snapshot from the existing TypeNN `dist` before rebuilding. It included route metadata, rendered prose, headings, links and attributes, IDs, code contents, interactive element attributes, and the visible DOM tree with classes. The final snapshot reported zero differences on all 16 routes. A separate CI comparison identified and fixed missing spaces before decorative arrows in Home and Examples CTA text. Browser checks of built link `textContent` confirm the English and Korean CTA labels retain the space before each decorative arrow. Spaces around inline code in guide descriptions were normalized for correct sentence rendering. The comparison also verifies that the moved code samples, anchors, routes, and user-visible claims match the reviewed pages.

Reviewed the existing TypeNN examples and page implementations while consolidating repeated samples. `homeQuickStart`, `firstOperation`, `executionExample(comment)`, `trainingLoop`, `mnistModel`, and `apiLifecycle` are shared exports. The execution example accepts only its existing localized code comment; all other duplicated snippets are stored once without changing their code.

Rendered browser checks covered all 16 routes at viewport widths 320, 390, and 1440 pixels. All 48 route/width cases returned HTTP 200 with no document or body overflow, empty headings, missing in-page anchors, or page exceptions. 390-pixel full-page screenshots for both home routes, both guide-index routes, both Lab routes, and both Playground routes are in `/tmp/typenn-viewport-screenshots/`.

## Validation

- `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter typenn-site check` — passed.
- `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter typenn-site build` — passed; 17 static pages generated.
- `git diff --check -- apps/typenn` — passed.
- Baseline comparison — 16 routes, zero semantic differences.
- Responsive browser check — 48 cases, zero reported issues.
- Root shared browser smoke — passed EN/KO desktop/mobile, hydration, persistent themes,
  accessibility and CPU Playground execution with the slot-based island layout.
- Built CSS ownership — passed, including new EN/KO assertions preventing Lab styles on
  Playground and matrix-editor styles on Lab.

The build emitted the existing chunk-size advisory for bundles above 500 kB. It did not fail the build. No unresolved TypeNN template or content issue was found.
