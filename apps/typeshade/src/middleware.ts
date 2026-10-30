import { defineMiddleware } from 'astro:middleware';
import { highlightInlineCodeInHtml } from './lib/highlight-html.mjs';
import { codeNames } from './lib/code-names.ts';

// Every inline <code> on a page is highlighted as the fenced blocks are (src/lib/highlight-html.mjs).
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const page = await highlightInlineCodeInHtml(await response.text(), codeNames());
  return new Response(page, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});
