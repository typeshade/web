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
  const page =
    '<script>if (a<b) {}</script><pre><code>keep</code></pre><svg><code>x</code></svg>' +
    '<p><code>bun run build</code> <code>typeshade/runtime</code> <code>host.ts</code></p>';
  expect(await highlightInlineCodeInHtml(page)).toBe(page);
});

test('a span after a script that holds "<" is still highlighted', async () => {
  const page = await highlightInlineCodeInHtml(
    '<script>if (a<b) {}</script><p><code>const</code></p>',
  );
  expect(page).toContain('ts-inline-code');
});
