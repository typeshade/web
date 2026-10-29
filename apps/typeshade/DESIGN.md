---
name: TypeShade
description: A shader language you write in TypeScript, documented in Ant Design v5's language as plain CSS tokens.
colors:
  primary: "#1677ff"
  primary-hover: "#4096ff"
  primary-active: "#0958d9"
  primary-bg: "#e6f4ff"
  primary-border: "#91caff"
  primary-text-hover: "#69b1ff"
  ground: "#ffffff"
  container: "#ffffff"
  elevated: "#ffffff"
  surface-1: "#fafafa"
  surface-2: "#f0f0f0"
  surface-3: "#e6e6e6"
  line-1: "#f0f0f0"
  line-2: "#d9d9d9"
  text-1: "rgb(0 0 0 / 0.88)"
  text-2: "rgb(0 0 0 / 0.65)"
  text-3: "rgb(0 0 0 / 0.45)"
  text-4: "rgb(0 0 0 / 0.25)"
  diagnostic: "#ff4d4f"
  selection: "#bae0ff"
  dark-ground: "#141414"
  dark-container: "#141414"
  dark-elevated: "#1f1f1f"
  dark-surface-2: "#262626"
  dark-line-1: "#303030"
  dark-line-2: "#424242"
  dark-primary: "#1668dc"
  dark-primary-hover: "#3c89e8"
  dark-primary-active: "#1554ad"
  dark-primary-bg: "#111a2c"
  dark-accent: "#3c89e8"
  dark-diagnostic: "#e87d7f"
  dark-text-1: "rgb(255 255 255 / 0.85)"
typography:
  display:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5.4vw, 5rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.055em"
  h1:
    fontSize: "2.375rem"
    fontWeight: 600
    lineHeight: 1.21
    letterSpacing: "-0.02em"
  h2:
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  h3:
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3333
  h4:
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  h5:
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  prose:
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5714
  meta:
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6667
  code:
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  control: "6px"
  card: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  base: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
  front: "64px"
  footer: "96px"
components:
  button:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text-1}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "4px 15px"
    height: "32px"
  button-hover:
    textColor: "{colors.primary-hover}"
  button-active:
    textColor: "{colors.primary-active}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "4px 15px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
  button-lg:
    typography: "{typography.h5}"
    rounded: "{rounded.card}"
    padding: "7px 15px"
    height: "40px"
  card:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.text-1}"
    rounded: "{rounded.card}"
    padding: "16px"
  card-cover:
    backgroundColor: "{colors.surface-2}"
    rounded: "0"
  menu-item:
    textColor: "{colors.text-2}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  menu-item-active:
    backgroundColor: "{colors.primary-bg}"
    textColor: "{colors.primary}"
  tag:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-2}"
    typography: "{typography.meta}"
    rounded: "{rounded.sm}"
    padding: "0 7px"
  search-pill:
    backgroundColor: "rgb(0 0 0 / 0.02)"
    textColor: "{colors.text-3}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  showcase-card:
    backgroundColor: "{colors.elevated}"
    rounded: "{rounded.card}"
    height: "56px"
  code-frame:
    backgroundColor: "{colors.ground}"
    typography: "{typography.code}"
    rounded: "{rounded.card}"
    padding: "0.75rem 1rem"
---

# How typeshade.dev is written and designed

One page. Anyone editing the site, including an agent, reads this first. `bun run check:style`
enforces the parts that can be checked mechanically and runs at the start of every build.

## Voice

[Website content](../../docs/content-style.md) governs writing and translation. English is the
source. Draft it using the owner's Blend2D, React, Vue, MapLibre and Mapbox references, then
translate it into Korean with the same meaning and tone.

Introduce the product and what developers can do with it. Use task headings and direct
instructions where useful. Keep explanations connected and tied to examples. A heading can
be a noun, question or action; it does not have to fit a fixed sentence pattern or display
line count. Keep technical limitations and measured claims accurate. Numbers that describe
the compiler come from `src/lib/examples.ts`.

The copy and style scripts check specific patterns and consistency. Editorial review still
judges each passage in context. Comments in code explain implementation decisions briefly.

## The system

Ant Design v5's language, written as plain CSS custom properties in `src/styles/tokens.css`.
There is no React and no antd package: the tokens at the top of that file are the whole
system, and every component style in the site is built from them. Ant supplies the palette,
the neutral scale, the radii, the elevation, the control heights and the button, card, list,
menu, anchor and table shapes. IBM Plex supplies the letterforms, because it is self-hosted
and has a matching Korean cut.

## Shared implementation

The primitive palette, spacing, radius and motion values live in
`../../packages/ui/styles/tokens.css`. Site-specific semantic roles and theme
choices live in `src/styles/tokens.css`. `src/styles/global.css` imports the
stylesheets in cascade order. The style checker covers every CSS file in that
directory. Shared Astro components come from `@typeshade/site-ui/astro/*`;
they render native HTML without a React runtime. Package update instructions
are in `../../packages/ui/README.md`.

## Styling

A page or a component is styled with Tailwind utilities on its own markup, and the utilities
read the tokens: the `@theme` block in `src/styles/tokens.css` maps the site's
colours, radii, type sizes and faces, so `bg-surface-1`, `text-text-2`, `border-line-1`,
`rounded-md`, `text-ui` and `font-mono` are the site's own values, and a token outside
`@theme` is read by name, `bg-(--color-elevated)` or `max-inline-(--content)`. The logical
utilities (`mbs-*`, `pbe-*`, `border-be`, `inline-*`, `ms-*`) keep the logical properties
the rest of the file uses. A `hover:` utility applies wherever the pointer is, the way a
`:hover` rule does, and a transition utility runs Ant's 0.2s curve; both are set in `@theme`.
Dark mode needs nothing of its own: it redefines the token variables and the utilities follow.

What utilities say badly goes into that component's scoped `<style>`: a container query,
`:has()`, a mask, a pseudo-element with content, a state that crosses elements (a tile's hover
scaling its cover), a reach into what Rich, Expressive Code or another component renders
(`:global()`), a `max-width` query whose bound has to include its own width, and a margin or
size that has to outrank the document column's own `.doc p`, `.doc li` or `.doc h3`. Tailwind
puts utilities in `@layer utilities`, and unlayered CSS beats every layer, so a utility loses to
any rule left in `global.css` that matches the same element whatever its specificity; the
scoped style is unlayered too, and its attribute outranks the global rule. Check the computed
style, not only that the class is on the element.

`global.css` assembles reset, tokens, fonts, theme, base element rules and base
accessibility. Shared components import their own CSS. Header, footer and search
styles live beside those components; `Docs.astro` imports its grid and Markdown
prose styles. Expressive Code, figures, tabs and API reference vocabulary are
imported by their consumers. Responsive and forced-color rules stay with their
owner. Shared component styles should use their root class as a boundary.

`bun run check:style` rejects feature classes in `src/styles/`. At the repository
root, `pnpm test:styles apps/typeshade/dist` also checks the global import graph
and ensures built home, playground and API routes exclude unrelated CSS.

## Type

- Text: IBM Plex Sans (variable), self-hosted, latin subset. Korean: IBM Plex Sans KR 400 and 600.
- Code and identifiers: IBM Plex Mono 400 and 500.
- The frontmatter carries the ramp. Interface text is 14px at 1.5714, which is the site's body
  default; prose in a document column is 16px at 1.5; code is 13px at 1.6; the small label a
  menu group, a footer legal line or a tag carries is 12px at 1.6667. Headings run 38, 30, 24,
  20 and 16px, each at weight 600. The front page's own headline is the one size outside the
  ramp: it scales from 40px to 80px inside the home introduction template.
- Weight is 400 or 600. 500 appears in code (the mono face's second weight) and in the
  phone panel's links. Korean pushes a 500 label to 600, because Plex Sans KR ships two weights.
- Document headings use -0.02em tracking on h1 and -0.01em on h2. The home headline
  uses -0.055em, relaxed to -0.045em in Korean. Korean prose keeps a 1.8 line height
  with `word-break: keep-all`.
- Running text in a document stops at 700px. Its longest line on the introduction is 99
  characters of English at 16px and 73 of Korean. The measure was 620px until the shell grew
  to 1600px, when a page with 300px of grey on each side of a 1920 screen read as cramped. The
  column around the text is wider: 676px at a 1280 viewport, 836px at 1440 and 996px from
  1600, where the shell's cap holds it. Home section headings stop at 18ch, their introductions
  at 36ch, and the hero description at 44ch. Topic body text stops at 60ch.
- No uppercase labels, no tracked "eyebrow" lines above headings, no single-word labels <!-- ok -->
  under blocks, no "a · b · c" metadata strings. <!-- ok -->

**The Two Families Rule.** Plex Sans carries interface and prose; Plex Mono carries code,
identifiers, diagnostics, the header's version, the layout table and a uniform's own field name.
A word that names something the compiler reads is set in the mono face wherever it appears.

**Formulas.** A formula is written in LaTeX and set in STIX Two Math (2.12, OFL 1.1, from CTAN's
stix2-otf, `public/fonts/stix-two-math-regular-2.12.woff2`). It is the one face outside the two
families: a formula is not prose and not code. The build turns the LaTeX into MathML
(`src/lib/math.mjs`, Temml), so the page carries no script for it, and a browser fetches the face
only for a page that shows a formula.

- In Markdown: `$x^y$` in a sentence, and `$$` on the lines above and below a formula of its own.
- In copy, through `<Rich>`: `$x^y$`. A dollar sign that is not a formula is written `\$`.
- In a component: `<Formula tex="x^y" />` sets a formula on its own line; `inline` keeps it in the
  sentence.
- A formula is not copy: it reads the same in every language, so the Korean copy carries the
  same LaTeX.
- Write the formula a reader would write on paper. An identifier the compiler reads stays in
  `code`, not in a formula: `pow(x, y)` is code, $x^y$ is mathematics.

## Colour

- Light by default; dark follows `prefers-color-scheme`, or the switch in the header, which
  is remembered in `localStorage`. Both palettes live in `src/styles/tokens.css` and nowhere
  else; the code themes follow through `ec.config.mjs`, which resolves its own light and dark
  surfaces to the same values because Expressive Code parses them and cannot parse a `var()`.
- One accent, Ant's blue. It fills the page's primary button, marks the current item in the
  sidebar and the outline, underlines the active tab on the showcase card, colours a link, a
  focus ring and a slider, and nothing else. A red carries diagnostics and the "not supported"
  badge. There are no colour gradients, no glows and no coloured card borders; the colour on a
  page comes from the shaders.
- Text is four alphas over the container: 0.88 for body and headings, 0.65 for secondary
  prose, every caption and every note, 0.45 for a chevron, a list marker, a placeholder and a
  disabled affordance, 0.25 for a heading's permalink at rest. A sentence never sits at 0.45:
  it reads 3.2:1 on white, under the 4.5:1 body text needs.
- Lines are two greys: the hairline `#f0f0f0` that separates a card from its cover, a row from
  the next row and the header from the page, and the heavier `#d9d9d9` that draws a control's
  own border.
- The page field is the container white `#ffffff` (`--color-ground`), set on `html` and
  `body`, so the page reads as one surface from edge to edge. Every container on it is the
  same white: the header, the showcase card, the gallery and examples tiles, the code frames,
  the docs column with its sidebar and outline, the Playground's region, the footer above its
  `#f0f0f0` top rule, the search dialog and the dropdowns. A hairline or a border sets each
  one apart. Dark sets the field and the containers in the same `#141414`. The grey layout
  ground `#f5f5f5` (`#000000` in dark) that filled the page beside the shell is retired: it
  boxed the shell in, and the page read as cramped.
- Surfaces are three greys over the container: `#fafafa` under a table head, a code frame's
  tab bar, the docs bar on a phone and a tag; `#f0f0f0` behind a canvas before it draws;
  `#e6e6e6` above that.
- Hover and press are fills, not colour changes: 0.02, 0.04 and 0.06 black over the container.
- Dark is Ant's dark algorithm: `#141414` ground, `#1f1f1f` elevated, `#303030` and `#424242`
  lines, primary `#1668dc`. The link and rail blue is lifted one step to `#3c89e8`, because
  Ant's dark primary does not clear 4.5:1 on the `#141414` ground; the solid fill keeps
  `#1668dc`. The same tokens are written twice, under `[data-theme='dark']` and under the
  media query, since plain CSS cannot share a block between the two selectors.

**The Single Blue Rule.** The page has one blue and one red. A new state finds its colour in
the primary's own wash (`#e6f4ff`), border (`#91caff`) or text hover (`#69b1ff`) before it
introduces a hue.

## Depth

The site is flat until something is a card. A card at rest is a 1px `#f0f0f0` border on the
container's white, with no shadow. Three shadows exist, all Ant's:

- **Elevation** (`0 6px 16px 0 rgb(0 0 0 / 0.08), 0 3px 6px -4px rgb(0 0 0 / 0.12), 0 9px 28px 8px rgb(0 0 0 / 0.05)`):
  an interactive showcase card, a hovered tile, the dropdown panels, the search dialog
  and the skip link. On hover the border goes transparent as the shadow arrives, so the tile
  gains depth without gaining weight.
- **Secondary** (`0 1px 2px 0 rgb(0 0 0 / 0.03), 0 1px 6px -1px rgb(0 0 0 / 0.02), 0 2px 4px 0 rgb(0 0 0 / 0.02)`):
  a hovered pager card in the documentation.
- **Control** (`0 2px 0 rgb(0 0 0 / 0.02)`, and `0 2px 0 rgb(5 145 255 / 0.1)` on the primary
  face): the resting shadow Ant's own buttons carry. Dark raises both to `0 2px 0 rgb(0 0 0 / 0.15)`.

The focus ring is a 4px wash of the primary (`0 0 0 4px rgb(5 145 255 / 0.1)`) plus a 2px
outline in the accent, so a keyboard reader still sees a ring on a ground the wash disappears
into. Motion is Ant's single curve, 0.2s `cubic-bezier(0.645, 0.045, 0.355, 1)`, on colour,
border, background and shadow. The shaders move; the chrome does not. Under
`prefers-reduced-motion: reduce` every transition drops to 1ms.

**The Resting Flat Rule.** A surface earns its shadow from state or from being the one thing
the page is about. The showcase card is elevated at rest because it is the page's subject; a
tile, a pager and a table row are flat until the pointer is on them.

## Shapes

Three radii. 4px on a tag, a swatch, a small button and a marked search hit. 6px on a control:
a button, a menu row, a dropdown item, the search pill, a colour input. 8px on a card, a code
frame, a dropdown panel, the search dialog and the large button. A canvas inside a card loses
its own radius and keeps a bottom hairline instead, so the cover meets the card's corners. No
element is fully round except the two-axis pad's dot.

## Layout

- A full-width header bar (64px, one `#f0f0f0` rule under it) and a full-width footer on
  `#fafafa` frame every page. Under 64rem the header's links, the version menu, the language
  menu and the dark-mode switch sit in a full-screen panel behind a menu button; the magnifier
  stays outside it, one tap away. The bar appears at 64rem because that is the width it lays
  out at: it needs about 1004px in English and 892px in Korean, and no item in it shrinks or
  wraps. It is the width the documentation grid opens its sidebar at, so the two chrome
  layouts change together.
- The shell stops at 1600px. The header, the footer, the documentation grid,
  the examples gallery and the Playground all take that measure, so every page has one left
  edge and one right edge. Under 1600 the shell is the viewport, held off it by the gutter
  alone: 16px, 24px from 40rem. Above it the shell is centred and the margin grows: 160px at
  1920, 480px at 2560. Two measures work inside that shell. Running text stops at 700px. A
  block that shows one thing stops at the wide measure, 1040px: a figure, a
  pair of figures, a table, the builtin table, a code frame the document itself carries, and
  a code comparison. A grid of cards takes the whole column and adapts its column count
  to the available width.
- The front page uses a narrower 1280px measure inside the site shell. Its introductory
  heading and actions form two columns from 64rem. Topic sections use a one-third heading
  column and two-thirds content column, with hairline separators and 40px to 56px vertical
  padding. Narrow screens stack each heading above its content.
- The documentation grid is one column under 64rem, `240px / 1fr` from 64rem with a 48px gap,
  and `240px / 1fr / 220px` from 80rem, where the outline joins on the right. The document
  column is what that leaves: 676px at a 1280 viewport, 836px at 1440, then 996px at 1600 and
  at every width above it, since the shell stops growing there. A page with no headings keeps
  the two-column form, and its column is 944px at 1280, 1104px at 1440 and 1264px from 1600.
  Under 64rem the sidebar is a bar
  under the header that names the current page, with the page's own headings folded under it.
- Sections inside a document are 48px apart, 56px from 40rem. The footer starts 96px below the
  content.
- The Playground is one heading over the tool. The heading, its sentence and its links sit
  on the tool's own content edge, 15px in from the region, so they line up with the file name
  in the toolbar under them, and the heading keeps the 40px a documentation page's h1 has under
  the header, 32px under 64rem.
- Breakpoints are 40rem, 48rem, 64rem and 80rem, plus 45rem where a table becomes
  a stack of rows.
- The home uses build-time shader stills. Runtime rendering belongs on example and
  Playground pages, where the reader chooses to run or edit a program.
- Every canvas in a figure has a still image underneath it, captured at build time
  (`bun run capture:stills`), so the page never shows an empty frame. The still goes the
  moment a backend takes the canvas, since it is the fallback for a browser with no GPU API,
  a reader with no script and a social preview, and it comes back on its own where a mount
  dies, because `degrade()` puts `data-backend` back to `none`. The Playground on an
  example's page shows that example's still until the reader's program has drawn a frame,
  and drops it for good at the first keystroke, since from then on it is a picture of a
  file the editor no longer holds.
- A table sits at the wide measure inside the document column, scrolls inside itself, and
  stacks into labelled rows below 45rem. The layout table keeps its natural width and a
  caption above it.

**The Container Rule.** Every page is laid out in the same 1600px shell: edge to edge behind
the gutter under that width, centred above it on the same white field. Running text is laid
out in the 700px measure and a figure, a table or a code frame in the 1040px one. A grid of
cards takes the column. A third measure needs a reason.

## Components

- **Buttons.** Ant's two faces. The default is a 32px box with a `#d9d9d9` border on the
  ground; hover and press move the text and the border to the primary's hover and active
  blues, and the background stays. The primary face fills with the blue and keeps white text
  through both states. The page's own action uses the large size: 40px, 16px text, 8px radius.
  An arrow glyph inside a button slides 2px on hover. There are no ghost, dashed or text
  variants.
- **Cards.** A 1px `#f0f0f0` border, 8px radius, the elevated white inside, and 16px of
  padding in the body. A card whose subject is a picture gives the picture the full top edge
  as a cover on `#f0f0f0`, with a hairline under it, and puts its name and sentence below.
  Hovering a linked card drops the border and raises the elevation shadow; the cover's image
  scales 1.03 over 400ms where the pointer is fine.
- **Menu.** The documentation sidebar is an Ant Menu: a 40px row, 6px radius, secondary text,
  the 0.04 fill on hover, and the current page in the primary at weight 600 over its wash. A
  group title is a 12px secondary label. A row is padded 12px, the same distance the header's
  own content sits from the gutter. A child sits at 28px of inset, and a child that names an
  export is set in the mono face.
- **Anchor.** The page outline is an Ant Anchor: a 2px `#f0f0f0` rail down the left, and a
  primary segment beside the heading in view.
- **Table.** Ant's lines: no vertical rules, a `#fafafa` head at weight 600, 12px by 16px
  cells, a `#f0f0f0` rule under every row, tabular figures, and the whole table scrollable
  inside the wide measure.
- **Tag.** A 12px chip with a 4px radius, a `#d9d9d9` border and the `#fafafa` fill: an
  optional parameter, a target's support state, the one example that emits a single target.
  The target state that reads "not supported" swaps the border and text to the red.
- **Inline code.** Identifiers in document prose use Plex Mono at weight 400, as the code
  frames do, on a surface-2 fill with a line-2 border and a 4px radius. Small internal padding
  separates the text from its frame. Wrapped calls repeat the decoration on each line. Long
  identifiers wrap within the reading column. Both themes use the shared tokens.
  Every span gets the tokens of a code frame: the same GitHub themes, the same TypeShade
  grammar and the same 5.5:1 colour floor, so a word has one colour in a sentence and in a
  frame. `src/middleware.ts` applies this to the finished page (`src/lib/highlight-html.mjs`),
  so a component only writes `<code>`. A command, a path, a module specifier, a file name, a
  URL, a flag and a sentence keep the plain code face (`isInlineSourceCode`).
- **Code frames.** Expressive Code in the same shape as a card: 8px radius, a 1px `#f0f0f0`
  border, a `#fafafa` tab bar, white code at 13px, no shadow. The copy button is the one piece
  of chrome the plugin draws itself, and it carries the page's language.
- **Figure.** `.figure-frame` is a 1px `#f0f0f0` box with an 8px radius on `#f0f0f0`, holding
  the still and the canvas over it at the same size. Its caption is 14px secondary text under
  the frame. Two frames of the same pass sit side by side from 40rem, at 3:1 where the subject
  is a flat gradient, so the pair costs a band and not half a screen.
- **Alert.** `.alert.alert-info`: a 1px `#91caff` rule over the primary's `#e6f4ff` wash, 8px
  radius, 12px by 16px of padding, and Ant's 16px info-circle in the primary at the left. It
  carries the pre-release note on the front page and on Quick start. Dark uses the same two
  tokens, `#15325b` and `#111a2c`.
- **Tabs.** `.tabs-head` is an Ant Tabs head: a 40px row of buttons 16px apart over a
  `#f0f0f0` rule, the active one in the primary at weight 600 with a 2px primary underline,
  the rest in secondary text. Every panel stays in the page, so the search index and a reader
  with no script get all of them stacked; the head appears and the inactive panel folds away
  once the script has run. Left and Right walk the head.
- **Empty.** A tile whose example has nothing the page can draw shows Ant's Empty instead of a
  bare grey frame: a 40px outlined mark at one 1.5px stroke in tertiary text, and one 12px
  secondary sentence under it saying why there is no picture.
- **Issue dialog.** Every "Report a problem" link opens it on the page it is on, the way the
  search dialog opens: Ant's Modal, a 520px elevated card over the dimmed page, 10vh down on a
  wide screen and a gutter down on a phone. It holds a title, a description the reader may
  leave empty, and one box under it that takes images from a button, a paste or a drop, shown
  as 46px thumbnails a reader can take out; then one line saying that anyone can read the
  report, and Cancel and Send at the foot. The page's address and, on a page that holds a
  Playground, its program go along; the program shows as a chip that comes out the same way.
  Sent, the dialog thanks the reader and keeps only Close. Its words are about the report
  alone. The Worker files the report on GitHub as an issue; where it cannot, the link is
  followed to GitHub's own form and no dialog opens (docs/cloudflare.md, Issues).
- **Dropdowns.** The version menu, the language menu and the mobile panel are `details`
  elements. The version's summary is one of the header's 32px controls, with the row's radius
  and its 0.04 hover fill; it keeps the mono face and tabular figures at the row's 14px,
  because the digits name a release. An open panel is an 8px card with 4px of padding, the
  elevation shadow, and 6px rows; the current choice is the primary over its wash at weight 600.
- **The showcase card.** The optional split live editor, `<LiveShader variant="hero">`: an 8px
  card with the elevation shadow, a 56px head bar carrying the file name as an active tab (a
  2px inset accent underline) with Edit and Reset as 24px buttons on the right, then a body
  split into the code pane on the left and the canvas on the right from 48rem, the controls
  under both panes behind a hairline with the reserved-field note as that group's last row,
  and the caption as the one 12px secondary line at the foot. Under 48rem the panes stack with
  the canvas first and the code pane fixed at 260px. The code pane is a window over the block:
  its content is taken out of flow so the picture sets the row's height and keeps its aspect,
  and the pane scrolls inside behind a 32px fade at its foot, since the pane's height rarely
  lands on a whole line and a cut glyph reads as a defect.
- **The Playground.** `src/components/Playground.astro`: one region on the page field. A
  link that names nothing (no `example`, `code` or `blank` in its fragment) opens it on the
  gallery: the examples the picker holds as tiles in the gallery's groups, each its build-time
  still over its name and line, under a heading with a Blank file button that opens a fragment
  shader reading three of the reserved fields. A tile opens the tool on that example as a new history entry, so Back
  returns to the tiles, and All examples in the toolbar goes back to them with the editor kept
  as it was. An inline script picks the view before the first paint. The gallery holds the
  compiler's own examples only. The tool is a toolbar naming the file over the emit options,
  then two columns from 48rem of the region's own width. The left column is the Monaco editor over its diagnostics. The right one is a
  single Ant tab strip over a single panel, Result first and then WGSL, GLSL vertex, GLSL
  fragment, Reflection and Console, with the controls the selected tab owns at the right of that same
  row. Result holds the canvas, which takes the width of its column at 4:3 the way a
  Shadertoy pane does, and under it the transport: pause and play, restart, the shader clock,
  the frame rate, and full screen. The transport moves the clock the GPU canvas draws at; a
  check's held clock wins over it. A picture dropped on the canvas binds to the module's first
  2D texture, which the line under the transport names. A picker beside the tabs chooses what draws it: the GPU in the
  runtime's own order, WebGPU alone, WebGL2 alone, or the CPU oracle's rasteriser. The GPU
  half goes through `src/lib/shader-runtime.ts`, the adapter every figure on the site draws
  through. Its WebGPU path loads a compiled manifest into `typeshade/runtime`; the site keeps
  its WebGL2 path. A backend the browser lacks, or a WebGPU feature the module needs and the GPU does
  not offer, is said by name on the canvas, and the pick joins the share link. The GPU is
  handed one frame at a time, and a program too heavy for it draws at fewer pixels, down to
  an eighth of the box's side, so the page keeps its own frames. The rasteriser runs the
  oracle at f32, the precision the GPU computes in, so the two engines draw one picture; the
  reflection's return values stay at the oracle's full double precision. Under the canvas is the bindings panel: a row for every binding and override
  the module declares, headed by its slot and name in code, with what the reader supplies it
  with. A uniform field gets a slider, a colour picker where the contract calls it a colour,
  or a matrix with presets; a texture a built-in picture or the reader's own image; a
  sampler its filter and address mode; a storage buffer a fill pattern and a length; an
  override its value. A module whose only entry is `@compute` is dispatched, and the canvas
  plots what it wrote while the panel lists it under its buffer. Its `console` calls fill the
  Console tab: on the CPU from the oracle's sink, on WebGPU from the program runtime's
  sink over the recorded manifest. `Frame.submit()` supplies the dropped-call count so the
  tab reports calls that did not fit in the recording buffer. A line says where it ran the way a host's printed
  console line does (compiler surface §66): the tier that ran it as a tag, GPU in the accent's
  wash or CPU in a neutral one, the file and line of the call as the editor numbers them, then
  the invocation that made it. A tab switch shows a panel
  and compiles nothing: every panel holds what the last compile put in it. Under 48rem the
  columns stack with the editor first. A page that names its example passes `seed`, which
  fills the editor from that file and drops the picker, and `still`, the example's
  build-time still. The editor holds a workspace: the file the canvas runs, and a tab for
  each file beside it, the files the example imports (`imported-noise` imports
  `lib/noise.shade.ts`) and any the reader adds with the New file button at the end of the
  tabs. A new file is a `.shade.ts` path relative to the main file, and it opens on an
  exported function the main file can import. The main file has the name of the example's own
  file (`plasma-twin.shade.ts`), and `main.shade.ts` where no example is behind it. A double
  click on a tab, or F2 on it, turns the tab into a field for the stem; the `.shade.ts` ending
  stays. An empty name, a name another tab has and a path the + refuses are refused, and the
  main file stays at the root. The imports of a renamed file in the other tabs are rewritten
  to the new name, and the line under the bar names those tabs. The buttons after the tabs
  (New file, Download, Open in VS Code) draw the header's 24-unit stroke icons at 16px. Every file is an open document in the language worker, so the service
  and the compile read an import through the text the reader sees, the way `compile()` reads
  one through `readDocument`, and an edit to any file recompiles the program. Hover,
  completion, go to definition, rename and the colouring answer in every tab; the list under
  the editor is the program's, and a file beside it carries its own markers. The link carries
  the main file as `code` and, when the files beside it are other than the example's own, all
  of them as `files`. A line under the emit options, beside the note on the fullscreen
  triangle, names each file the example imports, linked to it at the pinned commit.
- **host.ts** (compiler change 0062). The tab after the main file holds `host.ts`, the
  TypeScript an application writes around the module. It keeps its name: no rename, no close.
  The language worker checks it with a TypeScript service of its own, against the DOM, the
  declarations of `typeshade/runtime`, `typeshade/runtime/internal` and `typeshade/fuse`, and
  the host view `hostFace()` writes for each `.shade.ts` file it imports. Those declarations
  are one JSON asset (`scripts/playground-host-types.mjs`) fetched the first time host.ts is
  shown, so a reader who never opens it never downloads them. Hover and completion answer in
  it, and its diagnostics are markers on its model and red on its tab. A host example opens
  with its own `host.ts`. Any other file gets a starter written from its host face the first
  time host.ts is shown, run or downloaded (`src/scripts/playground-host-default.ts`): a
  full-screen `@fragment` entry drawn in `animate(canvas)`, else a `@compute` entry dispatched
  once in `run()`, else an image kernel taking a sampled image, an RGBA8 storage texture,
  width and height called in `device.fuse()` by `run(canvas)`. That starter processes a generated
  gradient and draws the result, using WebGPU or the CPU tier. Other modules get `run()`
  opening the program runtime and listing the program's entries.
  Run host.ts, the button after the tabs, is the only way it runs: never on a keystroke and
  never from a link. In a file bar under 32rem it is its icon alone, a 24px box like the three
  beside it, so the tabs keep their room. The worker turns it and each module it imports into CommonJS, and the
  page puts an `<iframe sandbox="allow-scripts">` over the canvas that loads the runtime bundle
  (`src/scripts/playground-host-frame.ts`) and runs them. The frame calls `animate(canvas)`
  when host.ts exports it, else `run()`, with the inputs `examples/hosts/_drive.ts` gives a
  host example and the canvas for any other. Its console lines, its errors and what `run()`
  returned fill the Console tab with the line of host.ts each came from, and a line under the
  transport says the frame is up. A second click, another example or the gallery removes the
  frame. The examples picker and the gallery hold the host examples in a group of their own.
- **Passes** (compiler change 0026). A file beside the main one can be drawn as a pass: the
  Pass toggle on its tab turns it on, and the toggle then names the pass, the file's stem as
  an identifier. Passes draw in tab order before the main file, each into a texture the size of
  the canvas, `rgba16float`, or `rgba8` on WebGL2 without `EXT_color_buffer_float`, which the
  note under the canvas says. A `texture_2d<f32>` named like a pass reads it: this frame's
  output of an earlier pass, the frame before's of itself or a later one, zeroes on the first
  frame. The bindings panel shows such a texture as the pass's output. An example whose
  `@example` block names passes opens with them on. The WGSL and GLSL tabs show the module of
  the file in the editor, a pass's own when its tab is open. Restart drops every pass's output
  and takes `frame` back to 0. Pause holds the frame with the clock: the canvas draws that
  frame again, with its `frame` and from the same frame before, so a pass that reads its frame
  before stands still until Play. The link carries the graph as `passes`, `name:path` pairs, with
  the files. The CPU oracle draws the passes in order at the grid's size, keeping each pass's
  colour as floats, at frame 0. A still of an example with passes is the frame after a second
  of them at 1/60 s apart.
- **The link and the folder.** The link is a format another program reads too, the VS Code
  extension (vscode-typeshade `docs/playground-bridge.md`), so it changes only on purpose. Its
  fragment is URL search parameters. One names what the editor holds: `example`, an example
  as it ships, `blank`, or `code`, the main file, which `files`, a JSON object of the other
  files by path, `passes`, `name:path` pairs in draw order, `name`, the main file's name, and
  `host`, host.ts, go with. `name` is written only when it is not the name the link opens
  under without it: the example's whose text `code` is, else `main.shade.ts`. `host` is
  written only when host.ts is other than the one the link opens with without it, and a link
  with no `host` opens as it did before host.ts existed. The emit options and
  the backend pick follow (`opt`, `parens`, `minify`, `numbers`, `obfuscate`, `fp64`,
  `precision`, `backend`), each only when it is not the default. `code` and `files` are
  `encodeSource` (`src/scripts/source-link.ts`): a `z` then the UTF-8 bytes `deflate-raw`
  compressed in base64url, or a `u` then the bytes uncompressed where the browser has no
  `CompressionStream`. Share stores the fragment with the Worker behind `/s/<id>`, which
  redirects to the Playground with it. The download button beside + writes the same workspace
  as a zip of a folder VS Code opens: the files at their paths with the main file and host.ts
  at the root,
  `typeshade.json` naming the main file and the passes in the `{ name, file }` shape of the
  `@example` block, a `tsconfig.json` over `**/*.shade.ts`, and `.vscode/extensions.json`
  recommending the extension (`src/scripts/workspace-folder.ts`). It is stored without
  compression and every entry carries one fixed time, so a workspace gives the same bytes
  each time.
  The button after it, Open in VS Code, takes the link Share would copy, the Worker's short
  one or the page's own URL where there is none, and hands the editor
  `vscode://typeshade.vscode-typeshade/open?link=<the link, percent-encoded twice>` by an
  anchor click, so the page stays where it is. VS Code decodes the query once before the
  extension's uri handler (vscode-typeshade `packages/vscode-typeshade/src/bridge.ts`) reads
  `link` with `URLSearchParams`, so a link with `&` in it, the page's own URL, arrives whole
  only when it was encoded twice.

## Structure of the site

The front page answers "what is it" in about 350 words, the length of comparable library
front pages (htmx, esbuild, wgpu, TypeGPU are 250 to 350). Everything that explains how or
why lives on its own page.

- `/`: an editorial home at a 1280px measure. `HomeIntro` owns the headline and action
  layout; `HomeSection` gives each topic the same heading/content columns, spacing and
  separators. The hero introduces the language with two actions and a link to its rationale.
  A compact strip names the authoring language and output targets. Three language concepts
  lead into a native disclosure containing the complete source and generated-code tabs.
  Verification uses small build-time stills, followed by three example previews and the
  install command. The home ships no shader runtime. Both locales share these templates.
  Primary navigation stays beside the brand, with search and preferences at the far edge.
- `/guide/…`: the documentation, on the layout every documentation site uses (VitePress,
  Docusaurus): a sidebar on the left with eight groups (Getting Started, Coming from, Language, Concepts,
  Examples, Language reference, Compiler API, Project), the document in the middle, and on a
  wide screen an outline of the page on the right. Under 64rem the sidebar is a bar under the
  header that names the current page. Every page carries its own headings in that outline,
  and closes with a link to the file it is written in ("Edit this page", the VitePress
  convention), a link to report a problem with the page (MDN's "Report a problem with this
  content"), and previous and next, which follow the sidebar's order.
  - Get started: `/guide/introduction/` (the language boundary, what stays familiar from
    TypeScript, what the compiler produces), `/guide/why/` (the authoring workflow, shared
    shader source, verification and adoption constraints), `/guide/quick-start/` (the npm Git installation command,
    the authored file, the WGSL it emits, the host code, the release state), `/playground/`
    and `/guide/editor/` (the VS Code extension: where to install it, what it gives a shader
    file on the desktop and in VS Code for the Web with the two conditions the web build
    has, the round trip with the Playground, and the MCP server for coding agents; every
    claim is one the extension's own README makes). The Playground points to it from Open in
    VS Code: the button's tooltip says it needs the extension, and a click opens a line under
    the file bar, hidden until then, that links to the page, since a browser says nothing when
    no editor answers the `vscode:` address.
  - Language: `/guide/language/`, the language guide's overview, and one page per topic under
    it (types, functions, control flow, GPU types, resources, shader stages), written in the
    dictionaries.
  - Concepts: `/guide/typescript-and-webgpu/`, how TypeScript types, functions and modules map
    to GPU values, entry points and shader modules, and where WebGPU begins.
  - Examples: `/guide/examples/`, the gallery of every `.shade.ts` example, grouped by what
    each file is there to show, each tile linking to that example's own page at
    `/guide/examples/<id>/`. The examples are `"use typeshade"` files, which is what the
    Playground's editor compiles, so their page carries the Playground itself, seeded with
    that file and with the picker gone, since the page already names the example. One line
    under the tool says the editor holds the example's own file, that the program is that file
    and any file it imports, and that an edit recompiles it in the reader's browser. The first
    two groups hold the source twins of the compiler's `fn()` registry examples, under the
    original's name and line, so a reader finds each where the original was. The registry
    itself is not shown: the page of a registry example redirects to its twin's page, or to
    `/guide/examples/` where it has none (`src/lib/retired-examples.mjs`). The template the
    Worker fills (`docs/cloudflare.md`) keeps the card an `fn()` example's page once had, laid
    out the way ShaderToy lays one out: one card split down the middle, the shader running
    over its build-time still on the left and its text on the right, and nothing else in
    either pane. The card uses the shared `.live-card` structure. Its right pane carries its own Ant tab bar over one of four texts, the
    source file first and then every target the compiler emits, the WGSL and the two GLSL ES
    3.00 stages it baked into `examples/__emit-goldens__/` at the pinned commit; it opens on
    the line the shader starts at, since several of those files begin with a banner comment. A
    GLSL tab reads `GLSL vertex` and `GLSL fragment`: the head is 470px at a 1280 viewport,
    490px at 1320, 550px at 1440 and 630px from 1600, and the full target name put the four
    tabs at 569px in English and 573px in Korean, so the last tab was cut off at a 1280, a 1320
    and a 1440 viewport alike. The full name is in
    the line under the card and in the pane's own accessible name. The head is a scroller
    wherever it is under about 450px, which is the phone layout and the widths where the card
    splits inside a narrow column, and it carries there the 32px fade on its trailing edge
    that the panels carry at their foot. The file is the tab that gives way when the four ask
    for more than the head has, down to 16 characters, since the file name is the one tab
    text the site does not choose. Which backend drew the frame, or why nothing did, and where
    the emitted text comes from are written under the card, because a label inside a pane
    makes that pane read as a figure. The card is its own container, so the panes go side by side
    once the card is wide enough and stack with the picture first when it is not. Under it
    the page closes with the file on GitHub and previous and next inside its own group. An
    example the page cannot draw says in one sentence why, from the reason
    `scripts/artifacts.mjs` records for it.
  - Reference: the API reference (`/api/…`, below), then Compiler internals, then Language
    service. Compiler internals is the compiler's AUTHORING.md, rendered from the vendored
    checkout at the pinned commit. A custom content loader (`src/content.config.ts`) cuts the
    file at its top-level headings and stores one entry per section, so it is one page per
    section: `/guide/internals/` is the overview and `/guide/internals/<section>/` the rest,
    in the file's order, which the sidebar and the pager follow; the sidebar lists the
    sections one level in only while the reader is on one of those pages. The package name
    is shown as its release name; an environment variable keeps its real name, the one the
    pinned compiler reads. No page sends a reader to GitHub for something the site can show;
    the edit link points at the section's line in AUTHORING.md. `/guide/language-service/`
    describes the compiler's editor-neutral language service: what it answers, how a host
    opens documents on it, its coordinate conventions and its one peer dependency, with a
    link to the design document at the pinned commit.
  - Project: `/guide/checks/` (the oracle, the compile gate, the golden files, the same pass
    on both backends, the typed diagnostic).
- `/api/…`: the API reference, on the same documentation layout. `/api/` lists the categories with
  the number of exports in each and one line on what each holds; `/api/<category>/` lists that
  category's exports alphabetically with the sentence each opens with; `/api/<export>/` is one
  page per public export. A category's slug and an export's slug share the space under `/api/`,
  so the build asserts that no category takes a page an export needs (the Reflection category
  is `/api/reflection-api/`, because the compiler exports an interface called Reflection).
  Previous and next walk a category alphabetically and carry on into the next category.
- `/examples/…`: the gallery, one tile per example, grouped by category, each tile a link to
  that example's own page with its build-time still as the cover.
- The first routes (`/motivation/`, `/checks/`, `/examples/`, `/guide/`) redirect, and so does
  `/guide/authoring/…`, the internals' first address, to `/guide/internals/…`.

Search is Pagefind. The build runs it over `dist/` after Astro, so `dist/pagefind/` holds the
index and the search UI, and nothing about them is committed. The index is built from the
document itself: the article on a documentation page and the main element on the front page
carry `data-pagefind-body`, and the header, the footer, the sidebar, the docs bar, the
outline, the pager and the edit link carry `data-pagefind-ignore`. Pagefind keeps one index
per `html lang`, so a Korean page is searched in Korean. The magnifier in the header opens a
dialog that loads the index on its first open, and Pagefind's UI is dressed in the site's
tokens through the CSS variables its stylesheet reads.

Navigation uses short destination names such as Docs, Getting Started and Quick Start in both locales.
Page descriptions explain the content; menu labels name the destination.

The header is the one every library site has: the name on the left; Docs, Playground,
Language, Reference and Examples; then search, a language menu, a dark-mode switch and GitHub as icons. The footer is a site map in three
groups (Docs, Project, Languages) across the shell, then the licence, the copyright
and the commit the page was built from. Project closes with the products built on TypeShade,
each a link under its own name (Radiance, TypeNN), so a new product adds a row to that group and no
group to the footer. Documentation carries 20 links and runs them down two
columns 32px apart, and the three groups spread to the shell's two edges: 120px between one
group and the next at a 768 viewport and 396px from 1440 up in English, 148px and 424px in
Korean, with 64px as the floor. The space that grows is the space between groups, so the wider
gap tells a reader where a group ends. Navigation labels name destinations. Page and section
headings follow the shared content guide: use a topic, task or reader question that fits the
content, without imposing a noun-only pattern.

## Versions

The header carries the repository's version as a menu (v0.0.1: Releases, Changelog, the pinned
commit), the way VitePress sites do. The site documents one version, the one vendored at the
pinned commit, and every number on it is measured there. When 0.1.0 ships and a later version
diverges, older documentation moves under a path prefix (`/v0.1/guide/…`, the convention
PixiJS uses with `/8.x/`), the unprefixed path stays the latest, and the version menu lists the
versions. Vue's separate host per major (v2.vuejs.org) needs a domain per version and is not the
plan.

## Reference pages

`/api/…` is the API reference, one page per public export of the compiler, generated at build
time from the source at the pinned commit (`src/lib/api.ts`) and rendered by
`src/components/pages/ApiReferencePage.astro`. Nothing on these pages is hand-written; a
wrong sentence is fixed upstream in the compiler's JSDoc and arrives at the next pin.

A page follows MDN's reference page, section by section, and leaves out a section with
nothing to show:

| MDN                                                | Here                                                                                                                                         | Where it comes from                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Breadcrumb                                         | Reference › category › name                                                                                                                  | the category map in `src/lib/api.ts`               |
| Title                                              | the export's name in code, `name()` for a callable                                                                                           | the export                                         |
| First paragraph                                    | one plain sentence                                                                                                                           | the first sentence of the JSDoc                    |
| Syntax                                             | the signatures, one per overload; a declaration block for an interface, type or class                                                        | the declaration                                    |
| Parameters                                         | name, type, optional, description                                                                                                            | the signature and `@param`                         |
| Return value                                       | type and description                                                                                                                         | the signature and `@returns`                       |
| Exceptions                                         | the error class or code and when it is thrown                                                                                                | `@throws` and the diagnostics registry             |
| Description                                        | the rest of the JSDoc as markdown, `{@link X}` as links to other pages                                                                       | the JSDoc                                          |
| Examples                                           | an h3 and a code block each                                                                                                                  | `@example`                                         |
| Browser compatibility                              | Targets: WGSL, GLSL ES 3.00, CPU oracle, each Supported, Emulated, Stub, Not supported or Does not apply, with the spelling the target emits | the intrinsics registry and the oracle's stub list |
| Instance properties, Instance methods, Constructor | the members of an interface or class with their JSDoc                                                                                        | the declaration                                    |
| See also                                           | other reference pages; an IR builder in Builtins or Values lists the language reference's function of its name first                         | `{@link}` targets and `@see`                       |
| Specifications                                     | In the guide: the guide sections that mention the name                                                                                       | `src/lib/authoring.ts`                             |
| Source                                             | file, line and commit on GitHub                                                                                                              | the declaration                                    |

Under the summary every page prints the line a reader imports the export with, built from the
barrel and the release name (`import { emitModule } from 'typeshade'`), and a type is imported
as a type. An IR builder in Builtins or Values (`pow` from `typeshade/core/ir`) adds a line under it that
names the builtin a `"use typeshade"` file calls, linked to its language reference page, and that
page's See also links back to the builder. No other export with a language entry's name links to
it: `reflect` and `location` name something else. A parameter, a return value and a property show their type as a link to the page of
every name in it that has one.

The sidebar's Compiler API group opens with the API's own index and then lists the category
index pages; on a page of one category, that category's members follow it one level in. The
Language reference group opens with the reference's own index, and its kinds open the same way,
on an entry's own page. A function opens
its family only (maths, packing, textures). The other kinds stay closed. Compiler internals and Language service close the Compiler API group, and the
internals' sections open under their overview the same way, only on their own pages, so the
sidebar never carries every page of the reference at once, and the page a reader is on is
scrolled into view inside the sidebar's own scroller. The guide links into the reference the way MDN links a function's first mention: the
first inline code on a guide page that is exactly a public export's name becomes a link to
that export's page (`src/lib/remark-api-links.mjs`, over the guide's markdown only). A name
that is also a builtin of the language, an IR builder in Builtins or Values, links to the
language reference instead: a call (`f32()`) to its function entry, a bare name (`f32`) to its
type entry, each falling back to the other. A
reference page records its kind for the search index, so a result reads "abs (function)". On a
Korean page the chrome is Korean and the body English; the note above the
body says so. The contract between the generator and the page is `src/lib/api-types.ts`, and
the words around it are `docs.api` in every dictionary, with a name and a sentence for every
category the extractor defines.

A page of the language reference for a builtin with a form on both targets prints the two
forms on one line under its summary, the way the API page prints its import line there, each
form after its target's name: WGSL `pow(a, b)`, then GLSL ES 3.00 `pow(a, b)`. Targets keeps the same two cells. A builtin with
no form on one target leaves the line out, and Targets says why.

### Reference notes

A page of the language reference, `/reference/<kind>/<name>/`, is generated from the compiler
at the pinned commit the way an API page is. A note is the one part of such a page a person
writes: a few sections that explain the name, set after Description and before Targets. A page
without a note shows nothing there. A note has to stay true while the pin moves under it, so
this section fixes what it may say, and the build holds it to that.

A note holds two kinds of text: the sentences a person wrote, and the values the build fills in
when it renders the page.

A person may write:

- Mathematics, which does not change: `pow(x, y)` is $x^y$. A formula is LaTeX (Formulas).
- What a specification defines, with that specification cited in the same section.
- What a design rule says, with the rule named by its number, "Rule 9.4".
- When to use the name and what to use beside it. Such advice rests on the mathematics, on a
  cited specification or on a value the build computes, and on nothing else.

The build computes, and nobody copies by hand:

- What the compiler emits: an output line, a diagnostic's code and text, a spelling, an alias,
  an accuracy bound.
- What the CPU oracle returns.
- A value from `facts`, and the pinned commit.
- A specification's text, its address and its edition.
- Every code block. A code block in a note is a sample the build compiles.

A note never states what nothing can check again:

- A value a GPU, a driver or a browser returns, a speed, or a vendor. A live example shows the
  reader the value their own GPU returns; a table of values measured on one GPU is not part of
  a note.
- A word that points at a time, such as currently, yet, soon or latest. A page carries no date,
  so the sentence states the condition the claim holds under.
- A section number of a specification. The number moves between editions and the anchor id
  stays.

Each section a person wrote is bound to a reading. The reading records the value of every input
the section reads, at the moment a person read the section: the oracle's answer to a call, a
diagnostic, an accuracy bound, the compiler's sentence under the name. The build computes the
same inputs again from the pinned compiler. When one differs, the build stops, names each
section that reads it, and prints the recorded value beside the new one. The person reads those
sections against the new value, fixes what no longer holds, and records the reading again.

The build compares values. A pin that leaves every value a note reads as it was passes, whatever
else it changed. Over the 20 moves of the pin measured when this rule was written, no value the
`pow` page would read changed, so a build that compared commits would have stopped 20 times for
nothing. The build reads a behaviour by calling the compiler's public exports, and hashes no
source file.

A prose file holds no computed value. A token in the text draws each value when the page is
built, so a pin that moves a value changes no byte of the prose.

A fact lives in one place. A design rule's fingerprint is in `READ_AGAINST`
(`src/lib/design-rules.ts`), a note's reading is in its reading file, a specification's edition
is in the specification pin, and its address is a key in `src/lib/links.ts`.

A section that says what TypeShade, its compiler or its oracle does carries the evidence: a
token, or the inputs it reads declared beside it. The build stops on a section with neither.

A note is translated, and its English is the source. A translated section records the English
section and the values it was translated from. When either one changes, the build names that
section in a warning, and the page shows it in English under the untranslated note until it is
translated or read again. A stale English section stops the build, since re-reading a named
section is short work and a page that states a value the compiler no longer has is wrong. What
the compiler writes stays English on every locale: a diagnostic, an accuracy bound and the
sentence under the name.

A note is three files and one record, named for its entry, `function/pow`:

- `content/reference/en/function-pow.md`, the English: sections headed `## Heading {#id}`,
  whose id is the anchor and the key a translation is matched by.
- `content/reference/ko/function-pow.md`, the translation. Its front matter records a stamp per
  section (`sources:`) and the fingerprint of each rule the English names (`rules:`).
- `content/reference/readings/function-pow.json`, the reading. `--read` writes it; nobody edits
  it by hand.
- The record in `src/lib/reference-notes/`, registered in its `index.ts`: the samples, the
  compile cases, the scope the note's code spans compile in, its assertions and its literals.

A section draws each computed value with a token: `{{oracle pow(-2.0, 3.0)}}` (the oracle's
answer at f64 and f32), `{{compile <case>}}` (both halves' diagnostic, or the WGSL line),
`{{accuracy pow}}`, `{{entry spelling.glsl}}`, `{{assert <id>}}` (draws nothing),
`{{fact glslTarget}}`, `{{rule 9.4}}`, `{{ref function/exp2}}`, `{{pin}}`, and `{{code <id>}}`
on a line of its own. `<!-- reads: none -->` marks a section of mathematics; `<!-- reads: entry.summary -->`
names an input a section explains without drawing it. `<!-- live: <id>` opens a live example,
with its `title:`, `caption:`, `anchor:`, `exercise:` and `control <field>:` lines, and `-->`
closes it; its code and ranges are in the record. `src/lib/reference-notes.ts` reads all of it,
and `src/components/ReferenceNotes.astro` draws it.

`bun run check:notes` (`scripts/check-reference-notes.ts`, in the build) holds a note to these
rules and to its reading; the comment at its top lists every check. `--read <note>` records a
reading, `--read-ko <note> <id>` stamps a translated section read again, `--stale` lists what a
pin leaves stale for the pin's pull request, and `--dist` reads the built pages. A commit that
changes a reading carries a line `Read-Against: <note>`, which CI checks. The fixture note under
`scripts/fixtures/reference-notes/` is published nowhere: `scripts/reference-notes.test.ts`
plants a fault into a copy of it for each check and sees the check fail, and
`REFERENCE_NOTES_FIXTURE=1` runs the checks, or a build, on it.

### Mathematical function lessons

Mathematical function pages also serve readers who use other languages. Start with the
function's mathematical meaning, a compact interactive example, a practical use, and input
limits. Put TypeShade signatures and compiler-specific details after this material.
Resource and execution functions use compact worked models with explicit assumptions.
Native example disclosures keep these comparisons usable without JavaScript. Models show
texels, stored and returned atomic values, memory scope, bits, or matrix components as
appropriate. They state that they do not execute GPU work.

`src/lib/function-demo-catalog.mjs` supplies bounded input and output ranges and the actual
expression each example draws. `src/lib/function-demos.ts` creates its TypeShade program.
`src/i18n/function-lessons-en.ts` and its Korean translation explain each function independently
of TypeShade. Mathematics and general uses are authored; shader semantics cite the language
specifications, and compiler-specific descriptions remain generated from the pin.

Full source starts closed in compact figures. Edit opens it before focusing the editor.
Numeric plot labels identify the displayed window. A selected input is marked on the curve.
The same program supplies both GPU backends and its captured fallback image.

## Documentation navigation

Show the current page and its parent topic at the top of the sidebar. Function pages also
show a short set of related functions. Put the six site-wide groups below this context,
closed by default. Native disclosures reveal their hierarchy and keep navigation usable
without JavaScript. Desktop and the mobile documentation drawer use the same data.
Changing this menu must preserve the article measure, grid, destinations, and pager order.

## Live examples

A guide or concept page can carry a shader the reader edits. The model is
[The Book of Shaders](https://thebookofshaders.com/): working code, a canvas that renders it,
and a control for every number behind it, so the prose explains what the reader is looking at.
`<LiveShader>` (`src/components/LiveShader.astro`) is that block. The Playground stays the
place to write a whole file; a live example is one sample on one page.

Putting one on a page:

```astro
<LiveShader
  locale={locale}
  id="quick-start-stripes"
  title={q.live.title}
  code={stripes}
  caption={q.live.caption}
  file="stripes.shade.ts"
  aspect="3/1"
  controls={{
    speed: { label: q.live.speed, min: 0, max: 4, step: 0.01, value: 1 },
    tint: { label: q.live.tint, color: true, value: [0.19, 0.47, 0.78] },
  }}
/>
```

- `id` names the example. It is the id of its still (`public/stills/<id>.webp`, listed in
  `scripts/artifacts.mjs`) and of its inlined payload, so it is unique across the site.
- `title` and `caption` are copy and live in the dictionaries. The sample's code is not copy:
  it sits in the page component, the way the other code samples on a language page do, and so
  is `file`, the name over the block.
- `controls` gives one uniform field a range, a step, a default and a label. The label is
  copy and comes from the dictionary; the page prints the field's own name in code beside it.
  A prop for a field the module does not declare fails the build.
- `variant` picks the shape. The default, `figure`, is the column a guide page shows: code,
  then canvas, then controls. `variant="hero"` is an optional split showcase, one elevated
  card with the file name as an active tab in a 56px head bar, the code pane and the canvas
  side by side from 48rem, and the controls under both.
- `compact` limits a figure's result and controls to 90% of the available width, capped at
  22rem for square results and 32rem for other aspects. It centres both and places the
  controls directly below the canvas. The Pow reference note uses this setting.
- The build compiles the sample (`src/lib/live-shader-emit.ts`) and inlines the WGSL, both
  GLSL ES 3.00 stages, the compiled program manifest, the reflected layout and the controls. A sample the compiler reports
  an error on fails the build.

Runtime uniform field names are reserved and filled by the host, so they get no
control. `frame` and `timeDelta` are reserved only at the type below, since examples already used
the names for fields of their own: an `f32` `frame` stays a field with its control. A sample declares the ones it reads and leaves out the rest, and the note under the
controls names the ones it declared:

| Field        | Type   | What it holds                                                                                                                                             |
| ------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `time`       | `f32`  | seconds since the canvas started                                                                                                                          |
| `resolution` | `vec2` | the drawing buffer in device pixels                                                                                                                       |
| `mouse`      | `vec2` | the pointer over the canvas, 0 to 1, origin at the bottom left, the space the `uv` parameter is in. A canvas the pointer has not touched holds (0.5, 0.5) |
| `frame`      | `u32`  | the frames drawn since the clock started, 0 on the first; Restart takes it back to 0                                                                      |
| `timeDelta`  | `f32`  | the seconds since the frame before, 0 on the first                                                                                                        |

Every other uniform field becomes one control, by its type:

| Field type               | Control                                                         | Default range      |
| ------------------------ | --------------------------------------------------------------- | ------------------ |
| `f32`                    | slider                                                          | 0 to 1, step 0.002 |
| `i32`, `u32`             | stepper, or a checkbox with `toggle: true`                      | 0 to 16, step 1    |
| `vec2<f32>`              | two-axis pad                                                    | 0 to 1 per axis    |
| `vec3<f32>`, `vec4<f32>` | one slider per component, or a colour picker with `color: true` | 0 to 1 per channel |

A field of any other type stops the build, so a page cannot ship a uniform it leaves at zero
without saying so. `bool` is one of them: WGSL forbids it in the uniform address space, so a
flag is a `u32` with `toggle: true`.

The independent `typeplot` package owns the function plot shader documents (`typeplot/shaders`)
and viewport interaction controller (`typeplot/interaction`). The site imports those subpaths,
keeps its existing renderer and lazy compiler, and includes the imported shader source in the
editor and Playground project. The root TypePlot renderer is not part of the site bundle.

Function plots also reserve `plotCenter` (`vec2`, data coordinates), `plotSpan` (`vec2`, visible
extent), `plotRotation` (`vec2`, yaw/pitch radians) and `plotBlend` (`f32`, 2D/3D transition).
Their controller supplies these fields during interaction. A Playground link carries its
viewport snapshot through the existing controls payload. Plots redraw on input and during a
bounded transition; reduced motion applies the target view immediately.

A still is captured for every drawable `.shade.ts` example, not for the live blocks alone.
`SHADE_STILL_EXAMPLES` in `scripts/artifacts.mjs` lists them, `src/pages/capture-stills.astro` is a
build-only route that draws all of them at the tile aspect, `scripts/capture-stills.ts`
photographs it, and `astro.config.mjs` removes the route from `dist/`, so it is never served.
Each file lands in `public/stills/<id>.webp` beside a committed sha256, and the build asserts
the hashes. The gallery and the home page's three previews use those stills.

The build refuses a sample whose emitted GLSL reads the uniform block and declares none. The
compiler dropped that declaration for a module built by the TypeScript front end until the pin
this is written against, and the failure was silent: the shader did not link, the canvas stayed
empty, and the page told the reader their browser has no WebGL2. `check-live` opens a page with
`?forcegl2=1` so the fallback is exercised on every run.

A sample includes its complete entry file and any imported TypeShade modules. Imported files
are visible in the source disclosure and travel with the entry to the Playground. The build
and editor use the compiler import resolver with the same source documents. Function graphs
share a shader module whose callbacks evaluate 2D functions and 3D trajectories. The host
supplies plotCenter, plotSpan, plotRotation and plotBlend for pan, zoom and mode transitions. The one thing a page supplies is the vertex half, which is what glslCanvas
supplies there. A sample that declares no `@vertex` entry is compiled behind a fullscreen
triangle and the `uv` it hands the fragment stage; a sample that declares both stages is
compiled as written. A diagnostic's line is moved back into the reader's own text before the
page prints it.

So a fragment sample reads the way a GLSL or WGSL author expects:

| GLSL                                        | TypeShade                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `uniform vec2 u_resolution;`                | `class Uniforms { resolution: vec2 }` and `declare const u: uniform<Uniforms>` |
| `void main() {`                             | `@fragment` and `export function main(@location(0) uv: vec2): vec4 {`          |
| `vec2 st = gl_FragCoord.xy / u_resolution;` | `uv` is already 0 to 1                                                         |
| `gl_FragColor = vec4(c, 1.0);`              | `return vec4(c, 1.)`                                                           |

`uv` arrives as a `@location(0)` parameter and not as the fragment position, because the two
backends disagree about that builtin: WGSL counts y down from the top and GLSL's
`gl_FragCoord` counts it up from the bottom, so a shader that read it would render upside down
on one of them. The varying is written once in the vertex half and linked by name on both.

The prelude, the reserved names, the control table and the packing rules are all in one
module, `src/lib/live-shader-contract.ts`, which imports nothing from the compiler and touches
no DOM. The Playground's live canvas reads the same module, so the two surfaces cannot
disagree about what a uniform field means.

What the page carries and when:

- The compiler is not in a page's initial JavaScript. The block ships the highlighted source
  through Expressive Code, the emitted output under a disclosure, and the program runtime's
  script. The compiler (about a megabyte gzipped, the same chunk the Playground loads) is
  imported on the reader's first edit and shared by every example on the page.
- The editor is a transparent `<textarea>` over the block Expressive Code rendered, and an
  edited line is coloured by `src/scripts/live-shader-highlight.ts` into the same markup. A
  text field is what a phone keyboard and a Korean input method already know, and it costs a
  few kilobytes where CodeMirror 6 measured 133 KB gzipped. Monaco stays in the Playground.
- One WebGPU device serves every canvas on the page. Only a canvas in view draws, and a
  hidden tab draws nothing. Measured with three on one page: one `requestDevice`, one compiler
  chunk, and 90 frames on the canvas in view against 0 on the two out of it over the same
  second and a half.
- A compile with an error keeps the last frame that worked and says so under the canvas.
- Under `prefers-reduced-motion: reduce` there is no frame loop at all: the clock is pinned
  and the canvas draws when a control moves or the box changes size, so a reader who asked for
  less motion still sees their own change and nothing between them.
- Without WebGPU and without WebGL2 the canvas stays empty over its build-time still, and the
  note under it says which browser feature is missing.

A page carries as many live examples as it has ideas to show. The Book of Shaders, the
reference for this block, runs about one editor per 390 words of its own prose. A page where
two examples teach the same thing should have one.

`scripts/check-live.mjs` (`bun run check:live`) opens a page with one in Chromium and checks
the four things: the canvas mounts or the fallback shows, no large script is fetched before
the first edit, an edit recompiles into the canvas or into diagnostics, and a moved control
reaches both the packed uniform bytes and the rendered frame.

## Korean prose

Translate the reviewed English according to [Website content](../../docs/content-style.md).
Keep its explanation, tone, examples and calls to action. Use natural Korean word order and
polite endings; retain established API and technical names. The local
`.claude/skills/readable-korean/SKILL.md` provides translation guidance. Do not independently
rewrite the Korean into an encyclopedic or promotional voice.

## Languages

Each language lives under a path prefix (`/ko/…`), the convention MDN, MS Learn, the Astro docs
and VitePress sites use; English, the source, has none. The header's language menu (globe
icon, the current language, the others in a list) switches to the same page in the other
language, and every page declares its alternates with `hreflang`. A host per language
(ko.vuejs.org) needs DNS per language and is not the plan.

- Every user-facing string lives in the two dictionaries (`src/i18n/en.ts` and `src/i18n/ko.ts`)
  and a component reads it through `copyFor(locale)` from `src/i18n/index.ts`. No `locale === 'ko'`
  branches in components; no inline copy. Every locale-dependent URL is built with `localePath(locale, links.<key>.href)`;
  no string literal that starts with `/ko/`. Locale behaviour that is not copy (fonts, description
  length, the guide collection, the og locale) lives in `localeSettings` in `src/i18n/index.ts`.
  `bun run check:i18n` (in the build after check-copy) fails on a missing twin route file, Hangul outside
  src/i18n, or a locale literal outside the dictionaries.
- English lives at `/`, other languages under their code (`/ko/`). Route files in
  `src/pages` and `src/pages/ko` are one line each; the page itself is a component in
  `src/components/pages` that takes a locale. A page never imports another page.
- English is the source text in `src/i18n/en.ts`. Every other language is a translation of it:
  `src/i18n/ko.ts` is typed against the English object, so a string missing in one language fails
  the type check.
- The authoring guide is translated by hand, one file per section of AUTHORING.md under
  `content/guide/<locale>/`, from the English at the pinned commit. Each file's front matter
  records the sha256 of the English body it was translated from; when the pin moves and a
  section changes, the build stops and names the section, so a translation cannot fall behind
  its source unnoticed. `scripts/check-guide-translations.ts` holds a translation to the
  English's code blocks, code spans, numerals, links and headings, with mechanical Korean
  copy checks. `content/guide/GLOSSARY.md` records terminology decisions. Use the Korean prose
  policy above when a rendering needs review. A section without a current file is shown in
  English under a note identifying its translation status. This fallback differs from a
  deliberate English term, explanation or attributed quotation within a readable localized
  article. Keep English when it improves clarity, with sufficient context for the audience.
  Code, identifiers and option values keep their exact spelling. The language reference's
  generated body stays English on every locale: the declarations, the compiler's sentences and its messages. A
  language reference note is translated, section by section (Reference notes). The API
  reference's JSDoc is translated the same way the guide is, one file per export under
  `content/api/<locale>/` that records the hash of the English it was made from; an export with
  no current file is shown in English under the note.
- Inline links in copy are written `[text](key)`, inline code in backticks; `Rich.astro`
  renders them. `key` is a record in `src/lib/links.ts` or a page name, which the locale
  prefixes.
- Numbers are interpolated from `facts` in every language. Captions, accessible names, table
  headers and code-frame labels are in the dictionary too.
- Every page links its other languages in the header and carries `hreflang` alternates.
  `/llms.txt` and the social card are English only. The host serves one 404 page, in
  English; a missing path under `/ko/` is sent on to `/ko/404/`, a Korean page with Korean
  chrome. Both are noindex and out of the sitemap.
- Korean text is set in IBM Plex Sans KR, the Korean companion to Plex Sans, at 400 and 600,
  subset to the 2,350 KS X 1001 syllables plus every character the copy uses (about 110 KB a
  weight, loaded on Korean pages only). `bun run build:fonts` regenerates the subset and its
  sidecar; the build fails if the copy uses a character the subset lacks. Line height 1.8,
  `word-break: keep-all`, headings without negative tracking. Adding a language: add `src/i18n/<code>.ts`, the code to `locales`
  in `src/i18n/index.ts` and `astro.config.mjs`, and a `src/pages/<code>/` directory with
  the four one-line route files.

## Things the build checks

- `scripts/check-style.mjs`: the voice rules above, over `src/`, `scripts/`, the English of the
  reference notes and the two Markdown files, and that global stylesheets contain only base layout/accessibility
  classes (Styling).
- `src/lib/math.mjs`: a formula Temml cannot read stops the build, with the formula in the
  message (Type, Formulas).
- `src/lib/examples.ts`: every number, and that the pinned compiler still matches the copy.
- `src/pages/llms.txt.ts`: every numeral in `/llms.txt` exists in `facts`.
- `scripts/artifacts.mjs`: og.png, the icons and the stills match their committed hashes.
- `scripts/check-reference-notes.ts` (`bun run check:notes`): every reference note against its
  rules and its reading at the pin; after the build, `--dist` over the pages (Reference notes).
- `scripts/check-api.ts` (`bun run check:api`): the reference data read from the compiler, before it
  reaches a page. A missing description, a slug two exports share, an export with no category, or a
  text that names a consumer fails; a `{@link}` target the barrel does not export is a warning.
- `scripts/check-api-translations.ts` (`bun run check:api-ko`): the reference's translations
  under `content/api/<locale>/`, one JSON file per export, against the pinned JSDoc. A stale
  translation, a file for no export, a missing or extra key, a code span, code block or link
  target that differs from the English, a dropped numeral, or an English-only prose paragraph fails the mechanical check. Review intentional English
  passages under the Korean prose policy and align their markup or validation accordingly.
  `--source <slug>` prints an export's English and the hash to record; `--worklist <file>`
  writes every export's status, English and hash as one JSON list.
- `scripts/check-live.mjs` (`bun run check:live`), after the build: a live example in a real browser (Live examples).
- `scripts/check-playground.mjs` (`bun run check:playground`), after the build: the Playground
  in a real browser. It selects every example in the picker in turn, photographs the Result
  tab's canvas and counts the colours in it, and fails where fewer of them paint than the
  floor in the file, which is what was measured when it was written. It then types into the
  editor and asserts the emitted WGSL and the canvas both moved, picks each backend by name,
  and moves a control of every kind the bindings panel has and asserts the frame followed.
  For every example the GPU paints, the CPU backend has to paint it too, and a dozen pixels
  of one frame, held at three seconds, have to agree between the two engines; both counts
  are floors in the file, and the examples under them are listed by name. It opens a bare
  link on the gallery, picks a tile, edits the imported file and adds one the main file
  imports, and asserts the WGSL followed, the link carries the files, the transport holds and
  restarts the clock, and Back returns to the tiles. It opens both examples drawn in passes: the trail builds up over frames and Restart clears it, feedback-trail draws on WebGPU, WebGL2 and the CPU oracle and separable-blur on WebGPU and the CPU oracle, and the link carries the graph. A runner with no
  route to the Monaco CDN is reported on its own.
- `scripts/check-seo.mjs` and `scripts/openseo-audit.mts`, after the build: the metadata every page carries, and OpenSEO's audit over the built site (README, Checks).

### Reading order of the guide

The sidebar order is the reading order, and the "Next" link at the foot of a Language page
follows it. Getting Started comes first. Coming from holds the three mapping sets (TypeScript,
WGSL, GLSL) for a reader who arrives with another language. The Language group reads Types,
GPU types, Functions, Control flow, Resources, Shader stages, String keys and Record,
Algorithms, Random numbers and Builtin functions: the GPU types come before the pages whose
examples use `f32` and `vec3`. A change to this order changes `sidebar()` in `src/lib/links.ts`
and the `next` link of each page in the same commit, since previous and next at the bottom of a
page walk the sidebar.
