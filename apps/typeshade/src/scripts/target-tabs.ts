// Ant Tabs over the targets one file emits. Both panels are in the page, so the search index
// and a reader with no script get every one of them, stacked; the head appears and the
// inactive panels fold away once this has run. Left and Right walk the head, the way a
// tablist does.
//
// The front page's "one file, two targets" section carries the first of these, and every
// per-example page carries one over its own emitted output.
for (const group of document.querySelectorAll<HTMLElement>('[data-front-tabs]')) {
  const tabs = [...group.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute('aria-controls') ?? ''),
  );
  if (tabs.length < 2) continue;
  const select = (index: number, move: boolean): void => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
      tab.tabIndex = i === index ? 0 : -1;
      const panel = panels[i];
      if (panel) panel.hidden = i !== index;
    });
    if (move) tabs[index]?.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, false));
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      select((i + step + tabs.length) % tabs.length, true);
    });
  });
  group.dataset.ready = '';
  select(0, false);
}
