// The showcase card's box and its file tab, as Tailwind utilities. The front page's hero
// (src/components/LiveShader.astro) draws both, an example's own page draws the card
// (src/components/pages/ExamplePage.astro) and the front page's "one file, two targets" head
// draws the tab, so the three read off one string each and cannot drift apart. The class
// names at the front carry no style: they name the part for a reader of the markup.

/** Ant's card, raised: a 1px rule, the 8px radius, the elevated ground and its shadow. */
export const cardClass =
  'live-card flex flex-col overflow-hidden rounded-md border border-line-1 bg-(--color-elevated) [box-shadow:var(--shadow-elevated)]';

/** A file name as the active tab over the panes: the 2px primary underline an Ant tab has. */
export const fileClass =
  'live-file me-auto inline-flex items-center text-(length:--text-ui) font-semibold text-text-1 [box-shadow:inset_0_-2px_0_var(--color-accent)]';
