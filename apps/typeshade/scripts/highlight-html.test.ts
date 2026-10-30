import { expect, test } from 'bun:test';
import { highlightInlineCodeInHtml } from '../src/lib/highlight-html.mjs';

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"');

test('every plain inline code span gets the tokens of a block', async () => {
  const page = await highlightInlineCodeInHtml(
    '<p><code>push</code> and <code lang="en">f32</code> and <code>uniform&#x3C;T></code></p>',
  );
  expect(page.match(/class="ts-inline-code"/g)?.length).toBe(3);
  expect(page).toContain('lang="en" class="ts-inline-code"');
  expect(text(page)).toBe('push and f32 and uniform<T>');
});

test('a command, a path, a file name, a block and a script stay as written', async () => {
  // The tags are joined so check-style does not read this file as a raw code block.
  const tag = (name: string, body: string) => `<${name}>${body}</${name}>`;
  const page =
    tag('script', 'if (a<b) {}') +
    tag('pre', tag('code', 'keep')) +
    tag('svg', tag('code', 'x')) +
    tag(
      'p',
      [tag('code', 'bun run build'), tag('code', 'typeshade/runtime'), tag('code', 'host.ts')].join(
        ' ',
      ),
    );
  expect(await highlightInlineCodeInHtml(page)).toBe(page);
});

test('a span after a script that holds "<" is still highlighted', async () => {
  const page = await highlightInlineCodeInHtml(
    '<script>if (a<b) {}</script><p><code>const</code></p>',
  );
  expect(page).toContain('ts-inline-code');
});

const names = {
  always: new Set(['f32', 'vec3', 'global_invocation_id']),
  attributes: new Set(['vertex', 'builtin']),
  calls: new Set(['dot']),
};
// The tags are joined so check-style does not read this file as a raw code block.
const tag = (name: string, body: string) => `<${name}>${body}</${name}>`;

test('a name of the language in plain text becomes code, with its arguments and generics', async () => {
  const page = await highlightInlineCodeInHtml(
    tag(
      'p',
      'A f32 and a vec3&lt;f32&gt;, @vertex and @builtin("position"), dot(a, b) and global_invocation_id.',
    ),
    names,
  );
  const spans = [...page.matchAll(/<code[^>]*>(.*?)<\/code>/g)].map((m) => text(m[1]!));
  expect(spans).toEqual([
    'f32',
    'vec3<f32>',
    '@vertex',
    '@builtin("position")',
    'dot(a, b)',
    'global_invocation_id',
  ]);
});

test('a word that is also an ordinary word is code only as a call', async () => {
  const page = await highlightInlineCodeInHtml(
    tag('p', 'A dot is small. Call dot(a, b) twice.'),
    names,
  );
  expect([...page.matchAll(/<code[^>]*>(.*?)<\/code>/g)].map((m) => text(m[1]!))).toEqual([
    'dot(a, b)',
  ]);
});

test('a link, a control, navigation and a script keep their text', async () => {
  const page =
    tag('a', 'f32') +
    tag('option', 'f32') +
    tag('nav', tag('p', 'f32')) +
    tag('script', 'var a = "f32 <b"') +
    '<div data-props="a > f32"></div>';
  expect(await highlightInlineCodeInHtml(page, names)).toBe(page);
});

test('a name a code block of the page declares is code in the sentences around it', async () => {
  const page = await highlightInlineCodeInHtml(
    tag('pre', tag('code', 'function addBias(x: f32) {}')) +
      tag('p', 'Call addBias once; a bias stays.'),
    names,
  );
  expect(page).toContain('<code class="ts-inline-code" data-language="typescript"><span');
  expect(text(page.slice(page.indexOf('</pre>')))).toBe('Call addBias once; a bias stays.');
  expect(
    [...page.slice(page.indexOf('</pre>')).matchAll(/<code[^>]*>(.*?)<\/code>/g)].map((m) =>
      text(m[1]!),
    ),
  ).toEqual(['addBias']);
});
