import { highlightInlineCode } from '@typeshade/site-ui/code/highlight';
import { gpuTypesSyntax, typeshadeInjection } from './typeshade-syntax.mjs';

// Fenced blocks go through Expressive Code with the TypeShade grammar (ec.config.mjs). An inline
// span gets the same themes and the same grammar here, so a name has the same tokens in a
// sentence, a table cell, a link and a block. This runs on the finished page, so a component
// that writes <code> needs no highlighting call of its own.
const langs = [gpuTypesSyntax, typeshadeInjection];
// Where a name in plain text is left as it is: a link keeps its link, a control keeps its label,
// and the navigation (sidebar, outline, header, footer) keeps the names of the pages.
const NO_WRAP = new Set([
  'a',
  'button',
  'option',
  'select',
  'label',
  'textarea',
  'code',
  'head',
  'title',
  'script',
  'style',
  'pre',
  'svg',
  'template',
  'kbd',
  'samp',
  'nav',
  'aside',
  'header',
  'footer',
  'dialog',
  'summary',
]);
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
// A tag with quoted attribute values, which may hold ">" (the props of an island are JSON).
const TAG =
  /<(\/?)([a-z][a-z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi;

/**
 * Replace every plain inline `<code>text</code>` in a page with the highlighted span the fenced
 * blocks would give it. A command, a path or a file name keeps its code face (isInlineSourceCode).
 */
export async function highlightInlineCodeInHtml(page, names) {
  if (names) page = wrapKnownNames(page, names);
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

const escapeText = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A declaration in a code block names an identifier the sentences around it talk about. A name
 *  counts only when it cannot be an ordinary word: a capital after the first letter, an
 *  underscore or a digit. */
function declaredNames(page) {
  const found = new Set();
  const declaration = /\b(?:function|const|let|class|struct|type|interface)\s+([A-Za-z_]\w{3,})/g;
  for (const block of page.matchAll(/<pre\b[\s\S]*?<\/pre>/g)) {
    const text = decode(block[0].replace(/<[^>]+>/g, ''));
    for (const m of text.matchAll(declaration)) {
      if (/[a-z][A-Z0-9]|_/.test(m[1])) found.add(m[1]);
    }
  }
  return found;
}

/**
 * Wrap the names of the language that a sentence writes in plain text in <code>, so they take the
 * tokens of a code block like a name the author put in backticks. The names are the language's
 * own (the registry of the reference pages), the attributes with their arguments, the generic
 * forms (`uniform<T>`), the names a code block of the same page declares, and a call of a function
 * whose name is also a word (`dot(a, b)`). A link, a control and a heading's outline are left alone.
 */
export function wrapKnownNames(page, names) {
  const declared = declaredNames(page);
  const always = [...names.always, ...declared]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  const attributes = [...names.attributes].map(escapeRegExp);
  const calls = [...names.calls].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const generic =
    '(?:array|uniform|storage|workgroup|ptr|atomic|vec[234][a-z0-9]*|mat[234](?:x[234])?)<[^<>\\n]{1,48}>';
  const pattern = new RegExp(
    [
      `@(?:${attributes.join('|')})\\b(?:\\([^()\\n]*\\))?`,
      generic,
      calls.length ? `(?<![\\w.@$-])(?:${calls.join('|')})\\([^()\\n]{0,60}\\)` : '',
      always.length ? `(?<![\\w.@$-])(?:${always.join('|')})(?![\\w$])` : '',
    ]
      .filter(Boolean)
      .join('|'),
    'g',
  );
  let out = '';
  let at = 0;
  let skip = 0;
  const stack = [];
  TAG.lastIndex = 0;
  const lower = page.toLowerCase();
  for (let m = TAG.exec(page); m; m = TAG.exec(page)) {
    const [tag, closing, rawName] = m;
    const name = rawName.toLowerCase();
    // The text between the last tag and this one.
    const text = page.slice(at, m.index);
    out += skip ? text : wrapText(text, pattern);
    out += tag;
    at = m.index + tag.length;
    if (
      tag.endsWith('/>') ||
      ['br', 'img', 'input', 'meta', 'link', 'hr', 'wbr', 'source'].includes(name)
    )
      continue;
    if (SKIP.has(name) && !closing) {
      // Copy the whole element untouched, a script body can hold "<" that is not a tag.
      const close = lower.indexOf(`</${name}`, at);
      const end = close < 0 ? page.length : close;
      out += page.slice(at, end);
      at = end;
      TAG.lastIndex = end;
      continue;
    }
    if (NO_WRAP.has(name)) {
      if (closing) {
        const i = stack.lastIndexOf(name);
        if (i >= 0) {
          stack.length = i;
          skip = stack.length;
        }
      } else {
        stack.push(name);
        skip = stack.length;
      }
    }
  }
  out += skip ? page.slice(at) : wrapText(page.slice(at), pattern);
  return out;
}

function wrapText(text, pattern) {
  if (!text.trim()) return text;
  const plain = decode(text);
  pattern.lastIndex = 0;
  let out = '';
  let at = 0;
  for (let m = pattern.exec(plain); m; m = pattern.exec(plain)) {
    out += escapeText(plain.slice(at, m.index)) + `<code>${escapeText(m[0])}</code>`;
    at = m.index + m[0].length;
  }
  return at === 0 ? text : out + escapeText(plain.slice(at));
}
