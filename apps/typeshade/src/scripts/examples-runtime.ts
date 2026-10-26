// The gallery's last section (src/components/pages/ExamplesPage.astro): a tile for each
// example the current release has and this build does not, so an example the compiler merged
// today is on the page before the next build. Each tile links to the example's page, which the
// Worker fills in from the same data (worker/index.ts).
import { fetchIndex, inlineNodes, pageLocale } from './example-data-client.ts';

async function fill(section: HTMLElement): Promise<void> {
  const index = await fetchIndex();
  const grid = section.querySelector('[data-runtime-grid]');
  const template = section.querySelector('template[data-runtime-tile]');
  if (!index || !grid || !(template instanceof HTMLTemplateElement)) return;

  // What the build already shows: every tile links to its example's page.
  const built = new Set(
    [...document.querySelectorAll<HTMLAnchorElement>('.example-grid a[href]')]
      .map((a) => /\/guide\/examples\/([^/]+)\/$/.exec(new URL(a.href).pathname)?.[1])
      .filter((id): id is string => id !== undefined),
  );
  // A release published before the `fn()` registry left the site still lists its examples;
  // their pages redirect, so they get no tile.
  const fresh = index.examples.filter((x) => x.corpus === 'shade' && !built.has(x.id));
  if (fresh.length === 0) return;

  const locale = pageLocale();
  // English is at the root and every other language under its own prefix (astro.config.mjs).
  const localized = location.pathname.startsWith(`/${locale}/`) ? `/${locale}` : '';
  for (const x of fresh) {
    const tile = template.content.cloneNode(true) as DocumentFragment;
    tile.querySelector('a')?.setAttribute('href', `${localized}/guide/examples/${x.id}/`);
    const still = tile.querySelector<HTMLImageElement>('[data-tile-still]');
    const empty = tile.querySelector('[data-tile-empty]');
    if (x.still) {
      still?.setAttribute('src', `/stills/${x.id}.webp`);
      empty?.remove();
    } else still?.remove();
    const title = tile.querySelector('[data-tile-title]');
    if (title) title.textContent = x.title[locale];
    if (x.renderable) tile.querySelector('[data-tile-wgsl]')?.remove();
    tile.querySelector('[data-tile-blurb]')?.append(...inlineNodes(x.blurb[locale]));
    grid.append(tile);
  }
  section.hidden = false;
}

const section = document.querySelector<HTMLElement>('[data-examples-runtime]');
if (section) void fill(section);
