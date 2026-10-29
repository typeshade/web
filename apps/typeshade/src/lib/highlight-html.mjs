import { highlightInlineCode } from '@typeshade/site-ui/code/highlight';
import { gpuTypesSyntax, typeshadeInjection } from './typeshade-syntax.mjs';

// Fenced blocks go through Expressive Code with the TypeShade grammar (ec.config.mjs). An inline
// span gets the same themes and the same grammar here, so a name has the same tokens in a
// sentence, a table cell, a link and a block. This runs on the finished page, so a component
// that writes <code> needs no highlighting call of its own.
const langs = [gpuTypesSyntax, typeshadeInjection];
const cache = new Map();

const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (text) =>
  text.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (entity, hex, dec, name) =>
    hex || dec
      ? String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10))
      : (named[name.toLowerCase()] ?? entity),
  );

function highlight(text) {
  let html = cache.get(text);
  if (!html) {
    html = highlightInlineCode(text, { langs });
    cache.set(text, html);
  }
  return html;
}

// Elements whose content is not inline text: a fenced block, a script, a style sheet, a figure.
const SKIP = new Set(['pre', 'script', 'style', 'textarea', 'title', 'svg', 'template']);
const TAG = /<(\/?)([a-z][a-z0-9-]*)\b([^>]*)>/gi;

/**
 * Replace every plain inline `<code>text</code>` in a page with the highlighted span the fenced
 * blocks would give it. A command, a path or a file name keeps its code face (isInlineSourceCode).
 */
export async function highlightInlineCodeInHtml(page) {
  const edits = [];
  const lower = page.toLowerCase();
  TAG.lastIndex = 0;
  for (let m = TAG.exec(page); m; m = TAG.exec(page)) {
    const [tag, closing, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    if (SKIP.has(name)) {
      // Jump to the closing tag: a script body can hold "<" that is not a tag.
      if (!closing && !tag.endsWith('/>')) {
        const close = lower.indexOf(`</${name}`, TAG.lastIndex);
        TAG.lastIndex = close < 0 ? page.length : close;
      }
      continue;
    }
    if (name !== 'code' || closing) continue;
    const end = page.indexOf('<', TAG.lastIndex);
    if (end < 0 || !page.startsWith('</code>', end)) continue;
    edits.push({
      start: m.index,
      end: end + '</code>'.length,
      attrs,
      text: decode(page.slice(TAG.lastIndex, end)),
    });
  }
  if (!edits.length) return page;
  const done = await Promise.all(edits.map((e) => highlight(e.text)));
  let out = '';
  let at = 0;
  edits.forEach((e, i) => {
    const html = done[i];
    out += page.slice(at, e.start);
    // Keep the attributes the component wrote, such as lang="en".
    out += html ? html.replace('<code ', `<code${e.attrs} `) : page.slice(e.start, e.end);
    at = e.end;
  });
  return out + page.slice(at);
}
