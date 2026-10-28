# TypeCV route template follow-up

The English and Korean home, playground, and SfM lab routes now share locale-driven Astro
templates in `apps/typecv/src/components/HomePage.astro`, `PlaygroundPage.astro`, and
`LabPage.astro`. The six route files pass only their locale. The templates retain the
reviewed localized copy, titles, descriptions, links, IDs, classes, code, form defaults, and
island/runtime props. The SfM lab still receives `locale` through `client:load`; the
playground still loads `/runtime/playground.js` and preserves its existing form and canvas
IDs.

Before the refactor, a semantic snapshot of all 39 canonical generated routes was saved at
`/tmp/typecv-semantic-baseline.json`. The comparison script at
`/tmp/compare-typecv-html.mjs` reads the final Astro output and applies the same extraction
to both: it strips scripts and styles, replaces HTML tags with spaces, decodes entities,
and collapses whitespace for body and `<pre>` text. It also compares raw `href`, `id`, and
`class` attributes, plus document language, title, and description. All 39 routes matched
with zero field differences.

The main agent also downloaded the successful `c62f78e` CI artifact (run `40454514084`) and
compared it directly with the final output using the same Chromium DOM extraction on both.
All 39 pages matched in visible text, metadata, links, headings/IDs, exact `<pre>.textContent`,
form controls and serialized island props. This independent check preserves code whitespace
instead of inserting spaces between syntax-highlight spans.

Removed the unused app-owned legacy `apps/typecv/build.mjs`, `site.css`, and `site.mjs`.
Repository search found no production, runtime, or application references outside the legacy
generator itself; the live `apps/typecv/playground.mjs` remains and still imports
`content.mjs`. Updated `apps/typecv/AGENTS.md` to document Astro as the build entry point.

Validation from the workspace root with the pinned tool path:

- `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter typecv-site check`: passed,
  0 errors, warnings, or hints.
- `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter typecv-site build`: passed,
  39 pages generated. Vite reported its existing chunk-size advisory (>500 kB).
- `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter typecv-site test:links`:
  passed, 3/3 tests.

Post-refactor browser validation passed with
`PATH=/tmp/site-tools/node_modules/.bin:$PATH UI_CHROMIUM=/usr/bin/chromium node
packages/ui/scripts/smoke-sites.mjs apps/typecv/dist`. It checked English/Korean home,
documentation, playground, and lab at 390 and 1440 pixels, hydration and theme persistence,
and the CPU playground calculation. A separate 320-pixel Chromium pass checked all eight
home/docs/playground/lab locale routes; every route loaded with an `h1` and no horizontal
overflow.
