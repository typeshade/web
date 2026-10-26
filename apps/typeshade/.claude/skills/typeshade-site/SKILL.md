---
name: typeshade-site
description: How typeshade.dev is written, laid out, translated and checked. Load this before changing copy, layout, the Korean dictionary or the header and footer, and before reviewing a page for "does this look and read like a normal library site". Covers the voice rules, the layout conventions the site follows (vuejs.org, VitePress), meaning-first Korean with a term list, the length budget for labels, and the review procedure with the exact commands.
---

# typeshade.dev

The site is an Astro static site for a TypeScript shader compiler. Everything measurable on it
is read at build time from the compiler vendored at `vendor/shader-dsl`; the words live in
`src/i18n/en.ts` (the source) and `src/i18n/ko.ts` (typed against it). `DESIGN.md` is the
one design document; this skill is the working procedure on top of it.

## What "normal" means here

The site follows the shapes readers already know, and nothing else:

- **Front page**: vuejs.org, with react.dev's headline: the category line (A shader language
  built around the TypeScript experience), the name in the accent colour, a one-line subtitle,
  the tagline, five buttons (Quick Start, Write in the Playground, Why TypeShade, Learn the
  language, Explore examples), the live shader, the authored file beside the WGSL it emits,
  four concept cards, three short points. No lists of features, no long prose.
- **Shell**: every page is laid out in one 1600px measure, the header, the footer, the front
  page, the documentation grid and the Playground alike. Under 1600 it is the viewport behind
  the gutter; above it, it is centred on the same white field, with no grey band beside it. A new full-width surface reads `--container` too; a
  width written into one page puts that page out of line with the header over it.
- **Header**: VitePress. Name on the left; Docs, Playground, Language, Reference and
  Examples; then a language menu (globe icon, current language, list of the others), a
  dark-mode switch (sun or moon), GitHub as an icon. Under 64rem, a menu button and a panel
  with the same items.
- **Docs**: VitePress. Sidebar on the left in six groups (Get started, Language, Concepts,
  Examples, Reference, Project), the document in the middle at 996px from 1600 (prose at 700px), an outline of the page's
  own headings on the right on wide screens, an "Edit this page" link beside a "Report an
  issue" link and previous and next at the bottom, which follow the sidebar's order. Under 64rem the sidebar is a bar under the
  header that names the current page. Every guide page lives under `/guide/` and is written in
  the dictionaries, except the compiler internals under `/guide/internals/`, one page per
  section of AUTHORING.md. The reference lives under `/api/`; its sidebar group closes with
  Compiler internals, whose sections open one level in only on their own pages, and Language
  service.
- **Reference**: MDN. `/api/` lists the categories, `/api/<category>/` the exports in one of
  them, `/api/<export>/` is the page for one export. A page keeps MDN's order and leaves out
  a section it has nothing for: Syntax, Parameters, Return value, Exceptions, Description,
  Examples, Targets (MDN's compatibility table), Constructor, Instance properties, Instance
  methods, In the guide, See also, Source. Nothing on the English pages is written by hand: the
  text is the compiler's own JSDoc at the pinned commit, read by `src/lib/api.ts`. A wrong
  sentence is fixed upstream and arrives at the next pin, never by editing the site. The
  Korean pages read a translation of that JSDoc (The Korean API reference, below). What the site does
  write is the words around it, `docs.api` in every dictionary, including a name and a
  sentence for every category (`docs.api.categories`, keyed by the extractor's slug).
- **Footer**: vuejs.org. A site map in three groups spread across the shell, Documentation's
  links down two columns 32px apart, then the licence, the copyright and the commit the page
  was built from. Project closes with the products built on TypeShade, one link each by name.
- **Search**: Pagefind, the way VitePress sites carry a search box. `bun run build` writes the
  index into `dist/pagefind/` after Astro, so search works on the built site and not on `astro
  dev`. The `data-pagefind-body` and `data-pagefind-ignore` attributes in `Base.astro` and
  `Docs.astro` are part of the layout: the document is indexed, the chrome is not.

If a change would give the site a shape none of those references has, it is wrong; find the
reference first. If a page can show something, it shows it; it never sends the reader to a
Markdown file on GitHub for it (the authoring guide is rendered from the vendored file).

## Voice (English)

Plain sentences by the maintainer to other developers. No em dashes, no "X, not Y"
contrasts, no "rather than", no uppercase for emphasis, no self-praise words, no headings
with a colon. Headings are single nouns or short noun phrases. Every number on the site comes
from `facts` in `src/lib/examples.ts`; a number that is not measured is not on the page.
`scripts/check-style.mjs` enforces the patterns and runs at the start of every build.

## Korean writing

Load `../readable-korean/SKILL.md` for Korean wording, register and terminology. The owner's
2026-10-23 preference governs official published pages: neutral Wikipedia-like explanations,
clear sentences, polite formal endings such as `~입니다` and `~합니다`, and terms readers
actually use. Published explanations and procedures use consistent polite formal endings.

Prefer familiar Korean technical terms. Keep established English terms, API names and
technical explanations in English when that is clearer. Explain unfamiliar concepts briefly
and keep the reader's context accessible. Distinguish an intentional English passage or
quotation from an incomplete translation. Preserve the source's technical conditions,
code, numbers and links.

Use concise headings such as 활용, 예제 and 주의사항 when they describe the content. Review
the actual paragraph before choosing a label. The glossary supports consistent terminology;
an awkward prescribed rendering is a wording decision to review, not a reason to force it
into the page. Do not invent Korean terms or change endings solely to satisfy a heuristic.

Translation checks continue to protect factual and source parity. Review a style heuristic
against this writing policy before treating its result as an editorial decision. This policy
update does not request a bulk rewrite of published text.

## The Korean guide

The authoring guide's Korean is not in the dictionary: it is `content/guide/ko/<section>.md`,
one file per section of the pinned AUTHORING.md, with front matter `id`, `source` (the sha256
of the English body it was translated from) and `sourceLine`. A file whose `source` is not the
pinned section's hash is stale: the build leaves it out, serves that section in English under
the untranslated note, and names it as a warning, so a stale translation never holds the pin
back. Moving the pin means translating the changed sections again and recording the new hash;
the pull request `.github/workflows/pin-compiler.yml` opens lists the ones it leaves stale.
`bun run check:guide` checks the rest: the fenced
code blocks byte for byte, every inline code span the same number of times, the numerals, the
link targets, the heading count, and the Korean rules above. Translate meaning first with
`content/guide/GLOSSARY.md` as the term list, and add to the glossary any term you decide on.
The language reference's generated body is not translated; a Korean language reference page is
Korean chrome around the compiler's own declarations and sentences. A language reference note is
the exception: it is translated section by section (DESIGN.md, Reference notes).

## The Korean API reference

The reference's JSDoc is translated too (owner decision, 2026-10-12: a Korean page with an
English body is a near-duplicate of the English page to a search engine). The store is
`content/api/<locale>/<slug>.json`, one file per export, keyed by the export's slug:

```json
{ "slug": "lift", "source": "<sha256>", "texts": { "summary": "…", "description": "…" } }
```

`texts` holds every non-empty English text of the export under the key
`apiSourceTexts()` in `src/lib/api-translations.ts` gives it: `summary`, `description`,
`parameters.<name>`, `returns`, `exceptions.<name>`, `examples.<n>`, `targets.<target>`,
`members.<name>` (a repeated name takes `#2`). `source` is the sha256 of those English texts.
When a pin changes one, the file is stale: the Korean page shows the English JSDoc again under
the untranslated note, and `bun run check:api-ko` (part of `bun run build`) fails and names
it. To translate or refresh one export:

1. Run `bun scripts/check-api-translations.ts --source <slug>`.
2. Translate each text under its key, meaning first, with `content/guide/GLOSSARY.md`.
3. Keep every code span, fenced block, link target and numeral of the English.
4. Write the printed `source` hash into the file.
5. Run `bun run check:api-ko`.

The summary is the page's lead, the category page's line and the tail of the meta
description, so it stays one sentence or two short ones.

A translation that explains a design rule also records the rule it was read against, by the
rule's fingerprint (`reviewed` in the compiler's `reqs/rules/RULE-xxxx.md`). A section does it in
its front matter, `rules: 8.7 FYpP…=`, for every rule its English section names or enforces
through an error code it names. The Korean words in the dictionary do it in
`content/guide/ko/rules.json`, one fingerprint per rule, for the pages `ruleExplanations()` in
`src/lib/design-rules.ts` lists. When a pin changes one of those rules, `bun run check:guide`
fails and names the Korean section or dictionary key to translate again, even when the English
section did not change. Read the Korean against the rule's page, fix what no longer holds, then
write the fingerprint the message gives (`src/lib/rule-translations.ts`).

## Live examples

A guide or concept page can carry a shader the reader edits, the way The Book of Shaders does:
`<LiveShader>` (`src/components/LiveShader.astro`). DESIGN.md "Live examples" is the contract;
this is the working procedure.

1. Write the sample in the page component, beside the other code samples. Code is not copy,
   and neither is `file`, the name over the block. Write a whole file, short enough to read at
   a glance: a `Uniforms` class, one `declare const u: uniform<Uniforms>`, and one entry,
   `@fragment export function main(@location(0) uv: vec2): vec4`. Leave out the `@vertex`
   entry and the component supplies the fullscreen triangle behind it. Reusable shader code
   belongs in imported TypeShade modules passed through `files`; show each imported file
   and carry it into Playground links. Use function-typed callbacks for shared graph rendering. `uv` is 0 to 1 with the
   origin at the bottom left on both backends; do not read the fragment position builtin,
   whose y axis points the other way on the two targets.
2. Name the uniform fields the runtime fills as `time` (`f32`), `resolution` (`vec2`) and
   `mouse` (`vec2`, 0 to 1 from the bottom left). They get no control, and a sample that does
   not need one leaves it out. Give the sample two or three fields of its own; more than that
   turns the page into a control panel. A reader who came for `sin` should see the line with
   `sin` in it without scrolling.
3. Give each of those fields a `controls` entry with a range, a step, a default and a `label`
   from the dictionary. A prop for a field the module has no uniform for fails the build, and
   so does a field type no control covers. An `f32` is a slider, an `i32` or `u32` a stepper
   (`toggle: true` for a checkbox), a `vec2` a pad, a `vec3` or `vec4` a colour picker with
   `color: true`. There is no `bool` control: WGSL forbids `bool` in a uniform block.
4. Put `title`, `caption`, `anchor` and `exercises` in both dictionaries, and add the example's
   heading to the page's `headings` array so the outline on the right lists it. The `anchor` is
   one line saying what the reader is looking at, precise enough to check by eye, and it names
   no number the page does not already show. The `exercises` are two or three things to try,
   each one edit or one control, each with its outcome stated before the reader runs it. A live
   example nobody is asked to touch is a picture.
   Numbers in that copy come from the sample or the control props, never typed twice: write
   "the top of its range" where you mean the control's maximum.
5. Add `{ id: '<id>', live: true, page: '<route>' }` to `STILLS` in `scripts/artifacts.mjs`,
   then `bun run capture:stills` and commit the `.webp` and its `.sha256`. The still is what a
   browser with no WebGPU and no WebGL2 shows, and the build refuses a still whose hash moved.
6. `bun run build`, then `bun run check:live`. It opens the page on WebGPU and again with
   `?forcegl2=1`, because the WebGL2 half is a second emitted program and a page that only
   ever ran on WebGPU can ship one that does not link. The check needs a browser:
   `PLAYWRIGHT_CHROMIUM` points at one outside the project, and `LIVE_GPU_OPTIONAL=1` lets a
   runner with no software rasteriser pass on the checks that need no frame.
7. Screenshot the page at 390 and 1440 in both languages and both themes, with one control
   moved. A Korean control label that wraps to a second line is a label to shorten. Look at
   the canvas too: a frame that is mostly black reads as a broken canvas, so mix two colours
   instead of fading one to nothing.

Leave `src/lib/live-shader-contract.ts` alone unless the contract itself is changing: the
Playground's live canvas reads it too, and DESIGN.md restates it.

## Length budget

A translated label may render no wider than about 1.35 times the English label, so a
translation cannot reflow the header, the buttons, a table or the sidebar.
`scripts/check-copy.ts` estimates widths from the fonts' advance widths and fails the build;
if it fails, shorten the Korean (왜 TypeShade인가 rather than TypeShade를 쓰는 이유), never
widen the layout.

## Procedure for any change to copy or layout

1. Every user-facing string lives in the dictionaries and a component reads it through `copyFor(locale)`.
   Edit `en.ts` first, then `ko.ts`. Add every new key to both; `bun run check:types` fails on a missing one.
   Every locale-dependent URL is built with `localePath(locale, links.<key>.href)`. Route files are one-liners
   that pass locale to a component; a page never imports another page.
2. Style new UI with Tailwind utilities on the `@theme` tokens, in the markup of the component
   that draws it (`bg-surface-1`, `text-text-2`, `border-be border-be-line-1`, `rounded-md`,
   `text-ui`, `mbs-6`). What utilities say badly (a container query, `:has()`, a mask, a
   pseudo-element, a hover that crosses elements, a reach into Rich's or Expressive Code's
   output with `:global()`, a margin that has to beat `.doc p`) goes into that component's
   scoped `<style>`. `src/styles/global.css` holds only tokens, fonts, base rules, dark mode,
   the shared chrome and rules for markup the site does not author; `check-style` fails on any
   other class there (DESIGN.md, Styling). A utility sits in a cascade layer and loses to any
   unlayered rule on the same element, so read the computed style in the browser, not only
   the class list.
3. `bun run build`. It runs, in order: `check-style` (voice, and the classes global.css may name), `check-copy` (numerals, links and
   code spans equal in both languages; label widths; the im-not-ai translation tells),
   `check-i18n` (copy in the dictionaries, URLs through `localePath`, no Hangul or locale literal
   outside `src/i18n/`, route parity, one-line route files), `check-guide`, the artifact hashes,
   the Korean font coverage, then Astro.
4. `bun run qa:seo`, `bun run qa:links`, `bun run qa:openseo` over `dist/`.
5. Screenshots at 390 and 1440 of every page you touched, in both languages, light and dark,
   with the menus open. Compare the same element in both languages: a Korean line count or
   width that differs from the English one by more than a line is a translation to shorten,
   never a layout to change.
6. For a Korean change of more than a few words, run the im-not-ai gates
   (`github.com/epoko77-ai/im-not-ai`, clone it): `scripts/prepare_monolith_input.py` on the
   Korean strings for the route hint, then `scripts/verify_change_rate.py` and
   `scripts/verify_gates.py` before and after. Change rate over 30% is too much for a
   polish pass.
7. Commit with the reason in the body. The PR body lists what was verified and how.

## Files

Site structure and i18n:
- `src/i18n/en.ts`, `src/i18n/ko.ts`, `src/i18n/index.ts`: dictionaries (source and translation), `copyFor(locale)`,
  `localePath(locale, path)`, and `localeSettings` for locale behaviour not involving copy.
- `src/pages`, `src/pages/ko`: one-line route files per locale, each rendering a component from `src/components/pages`
  with a locale prop.
- `src/lib/links.ts`: every destination, `navLinks`, `sidebar`.

Layout and page structure:
- `src/layouts/Base.astro`: head, header, footer, the dark-mode scripts.
- `src/layouts/Docs.astro`: sidebar, document, outline, pager.
- `src/components/SiteHeader.astro`, `SiteFooter.astro`.
- `src/styles/global.css`: the `@theme` tokens, fonts, base rules, dark mode, the shared chrome
  and the rules for Expressive Code, Pagefind and the rendered Markdown. A page's own styling
  is utilities in its markup and its scoped `<style>`.

Reference and guide data:
- `src/lib/api.ts`, `src/lib/api-types.ts`, `src/lib/api-nav.ts`, `src/lib/api-loader.ts`: the
  reference's data, its contract, its categories and pager order, and the content collection.
  `bun run check:api` prints the categories and their counts and fails on a missing
  description or a slug two exports share.
- `src/lib/api-translations.ts`, `content/api/<locale>/`, `scripts/check-api-translations.ts`:
  the reference's translations, their staleness and their check (`bun run check:api-ko`).
- `src/lib/remark-api-links.mjs`: the first mention of an export's name in inline code on a
  guide page, as a link to its reference page.
- `src/components/pages/ApiReferencePage.astro`, `ApiIndexPage.astro`, `ApiCategoryPage.astro`.
- `src/lib/guide.ts`, `src/content.config.ts`: AUTHORING.md cut into sections. Each section's
  title and description live in `guide.sections` in every dictionary; English derives them
  from the file, Korean writes them.
- `src/lib/remark-package-name.mjs`: the guide's package name and links. An environment
  variable keeps the name the pinned compiler reads.

Checks and tools:
- `scripts/check-style.mjs`, `scripts/check-copy.ts`, `scripts/check-i18n.mjs`, `scripts/check-seo.mjs`,
  `scripts/openseo-audit.mts`.
- `scripts/check-playground.mjs` and `scripts/check-live.mjs`: the two pages whose worth is that
  they run, opened in Chromium against `dist/`.
