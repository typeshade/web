// The `rules` content collection: one entry per design rule, with its text and the three parts
// under it rendered to HTML through the project's markdown pipeline, so a code span, a table,
// a WGSL specification link, an error code and a rule named in passing come out the way the
// rest of the reference prints them. The rules come from src/lib/design-rules.ts, read from the
// compiler's reqs/ at the pinned commit. Each part is rendered as the item's own file, which
// is how src/lib/remark-package-name.mjs knows to link its issue numbers and
// src/lib/remark-rule-links.mjs knows not to link the rule to itself.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Loader } from 'astro/loaders';
import { designRules } from './design-rules.ts';

export interface RuleHtml {
  readonly text: string;
  /** The first sentence, one paragraph's content with no <p> around it. */
  readonly line: string;
  readonly rationale: string;
  readonly derives: string;
  readonly enforced: string;
}

/** A single paragraph's HTML without the <p> around it, for a line that sits inside a row. */
const inline = (html: string): string => {
  const m = /^<p>([\s\S]*)<\/p>\s*$/.exec(html.trim());
  return m && !m[1]!.includes('<p>') ? m[1]! : html;
};

export function rulesLoader(): Loader {
  return {
    name: 'typeshade-rules',
    async load({ store, renderMarkdown, logger }) {
      store.clear();
      for (const rule of designRules()) {
        const fileURL = pathToFileURL(
          path.resolve(process.cwd(), `vendor/shader-dsl/reqs/rules/${rule.uid}.md`),
        );
        const md = async (text: string): Promise<string> =>
          text ? (await renderMarkdown(text, { fileURL })).html : '';
        const html: RuleHtml = {
          text: await md(rule.text),
          line: inline(await md(rule.line)),
          rationale: await md(rule.rationale),
          derives: await md(rule.derives),
          enforced: await md(rule.enforced),
        };
        store.set({ id: rule.slug, data: { number: rule.number, html } });
      }
      logger.info(`${store.keys().length} design rules`);
    },
  };
}
