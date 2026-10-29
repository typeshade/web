import { expect, test } from 'bun:test';
import { highlightInlineCodeInHtml } from '../src/lib/highlight-html.mjs';

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

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
