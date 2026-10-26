// The code pane on an example's page opens on the shader. Several of the compiler's example
// files begin with a banner comment and a block of imports, and a pane that opened at the
// top would show a reader no shader at all, so the pane is scrolled to the line
// src/lib/example-pages.ts found the first stage declaration on. The file's own text is
// untouched, and scrolling up from there reads the header the way opening the file does.
//
// A fade at the top says there is more above, once there is: the pane starts with only the
// foot faded, and the head fades in as soon as the pane is scrolled off its first line.
//
// The tab bar over the pane is a scroller too, and it gets the same treatment on the inline
// axis: a fade at its trailing edge while the four tabs are wider than the pane, which is
// the phone layout and the widths where the card splits inside a narrow column. The flag is
// measured here and not written into the stylesheet, because the width the tabs want is the
// file name's, and that is different on every example page.

/** Room between the pane's top edge and the line it opens on. */
const AIR = 12;

for (const head of document.querySelectorAll<HTMLElement>('[data-example-tabs]')) {
  const mark = (): void => {
    if (head.scrollWidth - head.clientWidth > 1) head.dataset.overflow = '';
    else delete head.dataset.overflow;
  };
  // The head's own box changes with the window, and a tab's box changes when it is picked,
  // since the selected tab is the one at weight 600.
  const sizes = new ResizeObserver(mark);
  sizes.observe(head);
  for (const tab of head.children) sizes.observe(tab);
  void document.fonts?.ready.then(mark);
  mark();
}

for (const panel of document.querySelectorAll<HTMLElement>('[data-entry-line]')) {
  const scroller = panel.closest<HTMLElement>('[data-example-panels]');
  if (!scroller) continue;

  const mark = (): void => {
    if (scroller.scrollTop > 1) scroller.dataset.scrolled = '';
    else delete scroller.dataset.scrolled;
  };
  scroller.addEventListener('scroll', mark, { passive: true });

  const line = Number(panel.dataset.entryLine);
  // A built pane's lines are Expressive Code's; a pane the Worker filled (worker/index.ts)
  // writes one span per line.
  const rows = panel.querySelectorAll<HTMLElement>('pre > code > .ec-line, pre > .runtime-line');
  const row = Number.isInteger(line) && line > 0 ? rows[line] : undefined;
  if (!row) {
    mark();
    continue;
  }

  // The code font arrives after this runs, and it changes how tall a line is, so the pane is
  // placed again once the fonts have settled. A reader who has already scrolled keeps their
  // place: the second placement only happens while the pane is still where it was put.
  let placed = -1;
  const place = (): void => {
    if (placed >= 0 && Math.abs(scroller.scrollTop - placed) > 1) return;
    const top =
      row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = Math.max(0, top - AIR);
    placed = scroller.scrollTop;
    mark();
  };
  place();
  void document.fonts?.ready.then(place);
}
