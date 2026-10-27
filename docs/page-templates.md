# Editing site pages

English and Korean routes select a locale and render the same page template. Change the
template when changing structure, spacing or component placement; change its locale data
when editing wording. Follow [the content policy](content-style.md): review English first,
then translate the same meaning into Korean.

## Page owners

| Site and pages | Layout owner | Copy and examples |
| --- | --- | --- |
| TypeShade home | [`FrontPage.astro`](../apps/typeshade/src/components/pages/FrontPage.astro), with [`HomeIntro`](../apps/typeshade/src/components/home/HomeIntro.astro) and [`HomeSection`](../apps/typeshade/src/components/home/HomeSection.astro) | `front` in [`en.ts`](../apps/typeshade/src/i18n/en.ts) and [`ko.ts`](../apps/typeshade/src/i18n/ko.ts) |
| TypeNN home | [`HomePage.astro`](../apps/typenn/src/components/pages/HomePage.astro) | Locale data in the template; shared samples in [`code-examples.ts`](../apps/typenn/src/content/code-examples.ts) |
| TypeNN guides | [`GuidePage`](../apps/typenn/src/components/pages/GuidePage.astro), [`ExecutionPage`](../apps/typenn/src/components/pages/ExecutionPage.astro), [`TrainingPage`](../apps/typenn/src/components/pages/TrainingPage.astro) | [`guide-copy.ts`](../apps/typenn/src/content/guide-copy.ts) and shared code samples |
| TypeNN API and examples | [`ApiPage`](../apps/typenn/src/components/pages/ApiPage.astro), [`ExamplesPage`](../apps/typenn/src/components/pages/ExamplesPage.astro) | [`api-page.ts`](../apps/typenn/src/content/api-page.ts), [`examples-page.ts`](../apps/typenn/src/content/examples-page.ts) |
| TypeNN lab and playground | [`InteractivePage.astro`](../apps/typenn/src/components/pages/InteractivePage.astro), selected by `kind` | Locale data in the template; each route passes its React island through the slot to keep runtime CSS separate |
| TypeCV home, lab and playground | [`HomePage`](../apps/typecv/src/components/HomePage.astro), [`LabPage`](../apps/typecv/src/components/LabPage.astro), [`PlaygroundPage`](../apps/typecv/src/components/PlaygroundPage.astro) | Locale data in each template; runtime behavior remains in the application |

For example, change TypeShade's hero arrangement in `HomeIntro.astro`, its wording in the
two locale dictionaries, and the order of home sections in `FrontPage.astro`. A change to
a shared button or field belongs in `packages/ui`, where it can be checked in the UI
workbench. Product-specific layouts remain with their application.

Keep route files thin when adding pages. Reuse the template for the second locale and keep
code samples shared unless their actual content differs, such as a translated comment.
Preserve existing fragment IDs, links, accessible names and the DOM hooks used by scripts.
Import route styles from their owning template or component. Global stylesheet entries
continue to contain reset, tokens, theme, fonts and base accessibility only.

## Verification

Run the app's root `check:*` and `build:*` commands, then `pnpm test:ui apps/<site>/dist` and
`pnpm test:styles apps/<site>/dist`. TypeCV also has `pnpm --filter typecv-site test:links`.
Check both locales and mobile widths when changing markup. For a template extraction,
compare rendered text, links, headings and code with the previous build before accepting it.

TypeCV builds through Astro and `scripts/prepare.mjs`; its obsolete static generator has
been removed. Imported documentation follows its own source and translation rules, as
recorded in [the content review](content-review.md).
