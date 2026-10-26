// Colouring for text the reader has just typed into a live example.
//
// The block on the page was rendered by Expressive Code at build time, and Shiki, the
// highlighter behind it, is a build-time dependency the page does not carry. So an edited
// line is coloured here instead, into the markup Expressive Code produced, with the same two
// custom properties its stylesheet reads: `--0` for the light theme and `--1` for the dark
// one. A block keeps one stylesheet and one set of metrics whether its text came from the
// build or from the reader.
//
// The seven pairs below are github-light and github-dark, the two themes ec.config.mjs names.

const TOKENS = {
  plain: '--0:#24292E;--1:#E1E4E8',
  keyword: '--0:#BF3441;--1:#F97583',
  number: '--0:#005CC5;--1:#79B8FF',
  name: '--0:#6F42C1;--1:#B392F0',
  string: '--0:#032F62;--1:#9ECBFF',
  comment: '--0:#616972;--1:#99A0A6',
  binding: '--0:#AE4B07;--1:#FFAB70',
} as const;

type Token = keyof typeof TOKENS;

const KEYWORDS = new Set([
  'class',
  'const',
  'let',
  'var',
  'function',
  'export',
  'import',
  'from',
  'declare',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'break',
  'continue',
  'switch',
  'case',
  'default',
  'type',
  'interface',
  'new',
  'true',
  'false',
  'in',
  'of',
  'as',
  'void',
  // The emitted panes under the canvas are coloured by the same function, so the two words
  // WGSL and GLSL spell a declaration with are here beside the TypeScript ones.
  'fn',
  'struct',
]);

/** The GPU types and the resource spellings, which Expressive Code's own TypeShade grammar
 *  colours as names (src/lib/typeshade-syntax.mjs). */
const GPU =
  /^(?:f(?:16|32|64)|i(?:8|16|32|64)|u(?:8|16|32|64)|vec[234](?:[fiu]|f16|f32|f64|i8|i16|i32|i64|u8|u16|u32|u64)?|mat[234](?:x[234])?|bool|uniform|storage|array)$/;

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (token: Token, text: string): string =>
  `<span style="${TOKENS[token]}">${escape(text)}</span>`;

/** One line split into coloured runs. The grammar is small on purpose: comments, strings,
 *  numbers, decorators, the keywords above and the GPU types. Everything else is body text,
 *  which is what the theme's plain colour is. */
function line(text: string): string {
  if (text.length === 0) return '\n';
  const indent = /^[ \t]+/.exec(text)?.[0] ?? '';
  const rest = text.slice(indent.length);
  let out = indent ? `<span class="indent">${span('plain', indent)}</span>` : '';
  const re =
    /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\d[\d._eE+-]*)|(@[A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)|(\s+)|([^\s\w$])/g;
  for (const m of rest.matchAll(re)) {
    const [all, comment, str, num, decorator, word, space, punct] = m;
    if (comment !== undefined) out += span('comment', comment);
    else if (str !== undefined) out += span('string', str);
    else if (num !== undefined) out += span('number', num);
    else if (decorator !== undefined) out += span('plain', '@') + span('name', decorator.slice(1));
    else if (word !== undefined) {
      const after = rest.slice(m.index + all.length);
      const token: Token = KEYWORDS.has(word)
        ? 'keyword'
        : GPU.test(word) || /^\s*\(/.test(after)
          ? 'name'
          : /^\s*:/.test(after)
            ? 'binding'
            : 'plain';
      out += span(token, word);
    } else if (space !== undefined) out += span('plain', space);
    else out += span('plain', punct ?? all);
  }
  return out;
}

/** The lines of `source` as the markup Expressive Code renders: one row per line, each row a
 *  code cell of coloured runs. An empty line carries a newline, the way the build's own
 *  output does, so the row keeps its height. */
export function highlight(source: string): string {
  return source
    .split('\n')
    .map((text) => `<div class="ec-line"><div class="code">${line(text)}</div></div>`)
    .join('');
}
