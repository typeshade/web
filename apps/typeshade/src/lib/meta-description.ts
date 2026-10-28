// The meta description of a generated reference page, cut to the length the SEO checks want.
// Both references compose their description the same way: a short line the dictionary writes
// in front of a sentence the compiler wrote, which may be one clause or a paragraph. This is
// where that composed text is brought inside 70 to 160 characters.
//
// A cut lands at the end of a sentence (. ! ?) or a clause (, ; :) when one leaves enough
// characters to clear the floor. The search runs twice: first inside the locale's own budget
// (max), which is where almost every description finds its break; a description whose
// punctuation lands a few characters past a tight Korean budget gets a second look up to the
// hard SEO ceiling those pages still have room under (scripts/check-seo.mjs DESCRIPTION_MAX)
// before anything falls to the raw word-boundary cut. This is the fix-round finding that the
// original word-boundary fallback itself still landed mid-clause on 50 of 732 pages (6.8%):
// widening the search to the hard ceiling and adding ':' as a clause mark brought that to 13
// (1.8%), all of them a single continuous clause with no sentence or clause mark anywhere
// inside 160 characters of the composed text, so the word-boundary cut there is the correct
// fallback for a sentence that genuinely has nowhere shorter to break.

/** The floor scripts/check-seo.mjs holds every page to. */
export const META_MIN = 70;
/** The ceiling it holds every page to, which a tight per-locale budget sits under. */
export const META_HARD_MAX = 160;

// The last character of the window is also a valid break: a mark one truncated character
// short of "mark, more words" reads as mid-clause under a strict trailing-space search even
// though the mark itself is the true end of what fits.
function markEnd(window: string, marks: readonly string[]): number {
  let best = -1;
  for (const mark of marks) {
    const withSpace = window.lastIndexOf(`${mark} `);
    if (withSpace >= 0) best = Math.max(best, withSpace + mark.length);
    if (window.endsWith(mark)) best = Math.max(best, window.length);
  }
  return best;
}

function cutAt(text: string, limit: number): string | null {
  const window = text.slice(0, limit);
  const sentenceEnd = markEnd(window, ['.', '!', '?']);
  if (sentenceEnd >= META_MIN) return window.slice(0, sentenceEnd);
  const clauseEnd = markEnd(window, [',', ';', ':']);
  if (clauseEnd >= META_MIN) return `${window.slice(0, clauseEnd - 1)}…`;
  return null;
}

/** The composed text brought inside `max`, at a sentence or a clause where there is one. */
export function fitDescription(text: string, max: number): string {
  if (text.length <= max) return text;
  return (
    cutAt(text, max) ??
    cutAt(text, META_HARD_MAX) ??
    `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
  );
}

/** The places in `tail` where a sentence (. ! ?) or a clause (, ; :) ends, outside any bracket.
 *  A mark counts only before a space or at the end of the text, so `1.5` and `a.b` are not ends,
 *  and only at depth 0, so a cut never leaves `min(max(x,` open. */
function tailEnds(tail: string, marks: string): number[] {
  const ends: number[] = [];
  let depth = 0;
  for (let i = 0; i < tail.length; i++) {
    const c = tail[i]!;
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && marks.includes(c) && (i + 1 === tail.length || tail[i + 1] === ' '))
      ends.push(i + 1);
  }
  return ends;
}

/** The fewest characters of the compiler's sentence worth keeping after a lead. */
const TAIL_MIN = 30;

/** A description made of a line the dictionary writes (`lead`, kept whole) and a sentence the
 *  compiler wrote (`tail`), brought inside `max`. Where fitDescription cuts the composed text,
 *  this cuts only the tail, so the compiler's words about what the name does stay on the page:
 *  at the last sentence end that fits, else at a clause end with `…`, else at a word. */
export function fitLeadAndTail(lead: string, tail: string, max: number): string {
  const full = tail ? `${lead} ${tail}` : lead;
  if (full.length <= max) return full;
  // A lead that leaves no room for a clause of the tail (a GLSL form written out as one long
  // expression) is cut the way any composed text is.
  if (max - lead.length - 1 < TAIL_MIN) return fitDescription(full, max);
  for (const limit of [max, META_HARD_MAX]) {
    const budget = limit - lead.length - 1;
    const fits = (end: number, extra: number) =>
      end + extra <= budget && lead.length + 1 + end >= META_MIN;
    const sentence = tailEnds(tail, '.!?')
      .filter((end) => fits(end, 0))
      .pop();
    if (sentence !== undefined) return `${lead} ${tail.slice(0, sentence)}`;
    // The clause mark itself gives way to the ellipsis.
    const clause = tailEnds(tail, ',;:')
      .filter((end) => fits(end - 1, 1))
      .pop();
    if (clause !== undefined) return `${lead} ${tail.slice(0, clause - 1)}…`;
  }
  const budget = max - lead.length - 1;
  let cut = tail.slice(0, budget - 1).replace(/\s+\S*$/, '');
  // A word cut inside a bracket ends before the bracket instead, so no `(` is left open.
  const open = outerOpen(cut);
  if (open > 0) cut = cut.slice(0, open).trimEnd();
  return `${lead} ${cut}…`;
}

/** Where the outermost bracket still open at the end of `text` starts, or -1. */
function outerOpen(text: string): number {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '(' || c === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
  }
  return depth > 0 ? start : -1;
}
