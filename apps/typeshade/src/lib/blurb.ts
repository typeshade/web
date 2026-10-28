// One example's description, from the sentence the compiler's registry writes for it.
// Both corpora go through here: src/lib/examples.ts for the `fn()` registry and
// src/lib/shade-examples.ts for the `.shade.ts` files, so the two read the same on a page.

// Acronyms an example's blurb may keep in capitals. Anything else in capitals is the
// upstream file emphasising a word, which this site sets in ordinary type.
const ACRONYMS = new Set([
  'WGSL',
  'GLSL',
  'ES',
  'GPU',
  'CPU',
  'RGB',
  'LOD',
  'SDF',
  'API',
  'LORAN',
  'IO',
  'MSAA',
]);

// A reference a blurb carries for the compiler's own readers: an issue in its tracker, with
// or without the project in front of the number ("(#923)", "(X-GIS #923)"), and a section of
// the surface document ("(§26)", "(§26/T5)"). The site has neither to send a reader to, and
// a numeral with nothing behind it would have to be matched in every translation.
const REFERENCE = /\s*\((?:[A-Za-z][\w-]*\s+)?#\d+\)|\s*\(§[\d./A-Za-z]+\)/g;

const EM_DASH = '\u2014';

/** The first clause of a blurb: up to an em dash, a colon or the first full stop that is not
 *  inside a code span. A separator inside backticks belongs to the code it is part of
 *  (`declare const scale: uniform<f32>`), and cutting there leaves half a declaration. */
function firstClause(text: string): string {
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '`') {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (c === EM_DASH && text[i - 1] === ' ' && text[i + 1] === ' ') return text.slice(0, i - 1);
    if (c === ':' && text[i + 1] === ' ') return text.slice(0, i);
    if (c === '.' && /\s/.test(text[i + 1] ?? ' ')) return text.slice(0, i + 1);
  }
  return text;
}

/** One example's blurb, shortened to its first clause. The blurbs are written in the
 *  compiler's repository, so they are trimmed to this site's typography. */
export function shortBlurb(text: string): string {
  const clause = firstClause(text).replace(REFERENCE, '').trim();
  // An ellipsis character in a code span stands for a body left out. The Korean font here is
  // a subset of the syllables the copy uses, and a translation carries the same code span
  // byte for byte, so the three dots a keyboard has are written instead.
  const plain = clause
    .replace(/…/g, '...')
    .replace(/\b[A-Z]{2,}\b/g, (w) => (ACRONYMS.has(w) ? w : w.toLowerCase()));
  return `${plain.replace(/[.,;:]$/, '')}.`;
}
