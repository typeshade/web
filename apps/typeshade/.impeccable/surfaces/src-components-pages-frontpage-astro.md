---
version: 1
slug: "src-components-pages-frontpage-astro"
primary_target: "src/components/pages/FrontPage.astro"
related_targets: ["src/styles/global.css","src/components/SiteHeader.astro","src/components/SiteFooter.astro","src/components/LiveShader.astro"]
---

# Front page (`/`, `/ko/`)

Scope: the front page, and the visual system it sets for every other page (header, footer,
tokens, code frames, canvases, docs chrome). Visitor mode: Persuade. Audience: TypeScript
developers who have not written a shader; job: see that a shader came out of TypeScript,
change a line, open the Playground. Proof on hand: the compiler's own examples running live,
the emitted WGSL and GLSL beside their source, the build-time counts. Constraints: two
locales, every string in the dictionaries, every number from `src/lib/examples.ts`, no
pictures except shaders, pre-release (no npm).

## Direction contract

THESIS: A product site in Ant Design's language, whose showcase is a live editor: the file
and the picture it draws sit side by side inside one elevated card, and every control on the
page is an Ant control. It refuses the earlier ink-on-paper rendition (full-bleed canvas with
a panel hung over it) and the category default (centred name, row of five buttons, framed
demo, four cards).

OWN-WORLD: Ant Design v5 default tokens as CSS custom properties, no React: primary
#1677ff (hover #4096ff, active #0958d9), text at 0.88 / 0.65 / 0.45 alpha on white, borders
#d9d9d9 and #f0f0f0, layout ground #f5f5f5, container white, 6px radius on controls and 8px
on cards and code frames, Ant's three-layer elevation shadow on the showcase card and on
hovered tiles, 14px UI text with 16px prose, headings 38/30/24/20/16 at 600, buttons 32px
(40px large) with Ant's default and primary faces, Ant Menu for the docs sidebar, Ant Card
for tiles, Ant Table lines for tables. Dark follows Ant's dark algorithm (#141414 ground,
#1f1f1f elevated, #424242 borders, primary #1668dc). IBM Plex Sans and Mono stay the
typefaces (self-hosted, Korean cut); everything else is Ant.

STORY: A visitor reads a headline and one sentence, sees the showcase card with the file on
the left and the running shader on the right, edits a line or moves a slider and sees the
picture follow, then reads the same idea at the compiler's scale (one file, two targets),
browses nine live tiles, reads the four TypeScript mappings, sees the two backends draw the
same pass, and copies the install command. Primary action: Open the Playground, top and end.

FIRST VIEWPORT (1440 x 900): the 64px white header with a #f0f0f0 rule. A two-column hero in
the 1200px container: left 5/12, the headline at 48px/600, the lede at 16px in secondary
text, a large primary button (Open the Playground) beside a large default button (Quick
start); right 7/12, the showcase card (8px radius, #f0f0f0 border, elevation shadow): a
head bar with the file name as an active tab and Edit / Reset as small default buttons, a
body split into the code pane (left) and the canvas (right, 4:3), the controls under the
panes as Ant sliders and colour swatches, the caption in tertiary text. Under 64rem the
columns stack and the card's panes stack, canvas first.

FORM: Ant Design's product-landing grammar, pinned by the maintainer on 2026-09-21 (a
user-pinned direction beats the roll; seed key a19495d6 recorded the earlier round).

Signature interaction: editing the file or moving a control re-renders the canvas in the
card within a frame. Motion grammar: Ant's 0.2s cubic-bezier(0.645, 0.045, 0.355, 1) on
hover and press; the shaders move, the chrome does not.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Whether to switch the typeface to Ant's system stack later (one line in global.css).
