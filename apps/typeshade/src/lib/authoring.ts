// The compiler's AUTHORING.md, cut into the sections the site gives a page each. The text in
// front of the first '## ' heading is the overview; every '## ' heading after it opens a
// section. A heading is also where a page gets its title, its id and its line in the file, so
// a page can link to the same line on GitHub.
//
// The package name is rewritten here the way src/lib/remark-package-name.mjs rewrites it in
// the rendered body: the pinned commit still carries the pre-release scope.
import { slugify } from './slug.ts';

const FROM = '@xgis/shader-dsl';
const TO = 'typeshade';
// A heading reads "4. SoT helpers <dash> declare a layout once" or "9. GLSL float precision
// <dash> floatPrecision (#1673)". The title is the part in front of the dash and the issue.
const DASH = '\u2014';
const ISSUE = /\s*\(#\d+\)/g;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;

export interface AuthoringSection {
  /** The route segment, from the heading: 'control-flow', 'raw-statements'. */
  readonly id: string;
  readonly title: string;
  readonly order: number;
  /** The 1-based line the section opens on in AUTHORING.md. */
  readonly sourceLine: number;
  readonly body: string;
  /** The opening sentences as plain text, for the page description. */
  readonly description?: string;
}

/** The heading text without its number, its issue reference and its subtitle. */
export function titleOf(heading: string): string {
  const front =
    heading
      .replace(/^#+\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(ISSUE, '')
      .split(DASH)[0] ?? '';
  return front.replace(/`/g, '').split(FROM).join(TO).trim();
}

/** Markdown to one line of prose: no code marks, no links, no asides, no dashes. */
export function plain(markdown: string): string {
  return (
    markdown
      // Odd parts are code spans, where brackets, parentheses and stars are part of the code:
      // `Math.*` keeps its star, and only the prose around it loses its emphasis marks.
      .split(/(`[^`]*`)/)
      .map((part, i) =>
        i % 2 === 1
          ? part.replace(/`/g, '')
          : part
              .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
              .replace(/[[\]]/g, '')
              .replace(/\*+/g, ''),
      )
      .join('')
      .replace(ISSUE, '')
      .replace(/\s+/g, ' ')
      // An aside the sentence reads without: a pair of dashes, or brackets around more than a
      // token. A short bracket is part of the code it follows, as in Var(...).
      .replace(/\s\u2014\s[^\u2014().!?]{10,}?\s\u2014\s/g, ' ')
      .replace(/\s*\u2014\s*/g, ', ')
      .replace(/\s*\([^()]{10,}\)/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/([;:,])\./g, '.')
      .split(FROM)
      .join(TO)
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const skippable = (block: string): boolean =>
  /^[#>|+*-]/.test(block) || /^\d+[.)]\s/.test(block) || /^\*\*[^*]+\*\*$/.test(block);

/** The first sentences of a section's prose, between 70 and 160 characters. */
export function describe(markdown: string): string | undefined {
  const blocks = markdown.replace(/```[\s\S]*?```/g, '\n\n').split(/\n{2,}/);
  let out = '';
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || skippable(trimmed)) continue;
    const text = plain(trimmed);
    if (!text) continue;
    for (const sentence of text.split(/(?<=[.?!])\s+(?=[A-ZÀ-ſ§"'\d])/)) {
      if (out.length >= DESCRIPTION_MIN) break;
      out = out ? `${out} ${sentence}` : sentence;
    }
    if (out.length >= DESCRIPTION_MIN) break;
  }
  out = out.replace(/[,;:]$/, '.').trim();
  if (out.length > DESCRIPTION_MAX) {
    // Cut at the last clause that still leaves a description long enough to keep.
    const head = out.slice(0, DESCRIPTION_MAX - 1);
    const comma = head.lastIndexOf(', ');
    const cut =
      comma >= DESCRIPTION_MIN ? head.slice(0, comma) : head.slice(0, head.lastIndexOf(' '));
    out = `${cut.replace(/[,;:.]$/, '')}…`;
  }
  return out.length >= DESCRIPTION_MIN ? out : undefined;
}

const SUBHEADING = /^(#{3,6})(\s.*)$/;

/** Every heading in a section's body, outside code fences, promoted one level: '### ' becomes
 *  '## ', '#### ' becomes '### '. AUTHORING.md nests its subheadings under the '## ' the site
 *  cuts off into the page's own h1, so a body rendered as-is skips straight from h1 to h3. Both
 *  the content loader for English (src/content.config.ts, the `authoring` loader) and the one
 *  for a translation (the `translated` loader) call this on the body right before rendering it,
 *  so the two languages keep the same outline. The stored `body` itself is left alone: it is
 *  what the translation hash and /llms-full.txt use, and both already read AUTHORING.md's own
 *  levels correctly (the hash is a fingerprint, and llms-full.txt writes its own '## ' title in
 *  front of the section, so the body's '### ' is already one level under it). */
export function promoteHeadings(markdown: string): string {
  let fenced = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('```')) fenced = !fenced;
      if (fenced) return line;
      const m = SUBHEADING.exec(line);
      return m ? `${m[1].slice(1)}${m[2]}` : line;
    })
    .join('\n');
}

/** AUTHORING.md as an overview and one entry per top-level section, in the file's order. */
export function authoringSections(markdown: string): AuthoringSection[] {
  const lines = markdown.split('\n');
  const sections: AuthoringSection[] = [];
  let heading = '';
  let start = 1;
  let held: string[] = [];
  let fenced = false;

  const close = (): void => {
    // Sections 1 to 6 end with a rule before the next heading; the page does not need it.
    const body = held
      .join('\n')
      .trim()
      .replace(/\n\s*-{3,}$/, '')
      .trim();
    if (!body) return;
    const title = titleOf(heading || (lines.find((l) => l.startsWith('# ')) ?? ''));
    sections.push({
      id: heading ? slugify(title) : 'overview',
      title,
      order: sections.length,
      sourceLine: start,
      body,
      description: describe(body),
    });
  };

  lines.forEach((line, i) => {
    if (line.startsWith('```')) fenced = !fenced;
    if (!fenced && line.startsWith('## ')) {
      close();
      heading = line;
      start = i + 1;
      held = [];
      return;
    }
    held.push(line);
  });
  close();

  const ids = new Set(sections.map((s) => s.id));
  if (ids.size !== sections.length)
    throw new Error('[guide] two sections of AUTHORING.md share an id');
  return sections;
}
