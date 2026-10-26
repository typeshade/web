// The title and the meta description of one example's page, in one language. The static page
// (src/components/pages/ExamplePage.astro) and the example data the Worker serves for an
// example newer than the build (scripts/publish-examples.ts) compose them here, so a page the
// Worker fills reads the way a built one does.
import { copyFor, localeSettings, type Locale } from '../i18n/index.ts';

export const META_MIN = 70;
const HARD_MAX = 160;

/** A meta description is plain text, so the code marks and links a line carries come off. */
export const plain = (text: string): string =>
  text.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$1');

// The same cut the reference makes: at the end of a sentence, else at a clause, else at a
// word. A short registry line leaves the description under the floor the SEO checks want, so
// the dictionary's own sentence about the page fills it out.
const markEnd = (window: string, marks: readonly string[]): number => {
  let best = -1;
  for (const mark of marks) {
    const withSpace = window.lastIndexOf(`${mark} `);
    if (withSpace >= 0) best = Math.max(best, withSpace + mark.length);
    if (window.endsWith(mark)) best = Math.max(best, window.length);
  }
  return best;
};
const cutAt = (text: string, limit: number): string | null => {
  const window = text.slice(0, limit);
  const sentenceEnd = markEnd(window, ['.', '!', '?']);
  if (sentenceEnd >= META_MIN) return window.slice(0, sentenceEnd);
  const clauseEnd = markEnd(window, [',', ';', ':']);
  if (clauseEnd >= META_MIN) return `${window.slice(0, clauseEnd - 1)}…`;
  return null;
};
const truncate = (text: string, max: number): string =>
  text.length <= max
    ? text
    : (cutAt(text, max) ??
      cutAt(text, HARD_MAX) ??
      `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);

/** The page's title and description, for an example named `name` whose line is `blurb`. */
export function exampleMeta(
  locale: Locale,
  name: string,
  blurb: string,
): { title: string; description: string } {
  const p = copyFor(locale).examples.page;
  const composed = plain(p.description(name, blurb));
  const description = truncate(
    composed.length < META_MIN ? `${composed} ${plain(p.descriptionPad)}` : composed,
    localeSettings[locale].metaDescriptionMax,
  );
  return { title: p.title(name), description };
}
