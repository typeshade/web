// /llms-full.txt: the authoring guide and the full API reference in one file, for a model
// with more context than /llms.txt fits. Both halves are read from the records the pages
// themselves render from (src/lib/guide.ts, src/lib/api.ts), so this file cannot drift from
// the site. English only, the way /llms.txt is: the reference's body stays English on every
// locale (see DESIGN.md, Languages), so a Korean edition would only translate chrome around
// text that is still English underneath it.
import type { APIRoute } from 'astro';
import { apiEntries } from '../lib/api.ts';
import type { ApiEntry } from '../lib/api-types.ts';
import { facts } from '../lib/examples.ts';
import { guideSections } from '../lib/guide.ts';

// The same substitution src/lib/remark-package-name.mjs makes when it renders the guide: the
// pinned commit still carries the pre-release scope, and the site imports it by the release
// name everywhere else. Kept local instead of imported: the remark version also touches an
// mdast tree this file has no use for.
const FROM = '@xgis/shader-dsl';
const TO = 'typeshade';
const ISSUE_TAG = /\s*\(#\d+[^)]{0,20}\)/g;
const ISSUE_BARE = /\s*#\d+\b/g;

const releaseName = (text: string): string =>
  text.split(FROM).join(TO).replace(ISSUE_TAG, '').replace(ISSUE_BARE, '');

// The overview's body carries its own top heading, the way AuthoringPage.astro leaves it to:
// every other section's heading was cut off into `title` when src/lib/authoring.ts split the
// file, so only those need one written back here.
const guide = guideSections
  .map((section) =>
    section.id === 'overview'
      ? releaseName(section.body)
      : `## ${releaseName(section.title)}\n\n${releaseName(section.body)}`,
  )
  .join('\n\n');

const sourceHref = (entry: ApiEntry): string =>
  `${facts.mirrorUrl}/blob/${facts.pinnedCommit}/${entry.source.file}#L${entry.source.line}`;

const reference = apiEntries()
  .map((entry) => {
    const signature =
      entry.signatures.length > 0
        ? entry.signatures.map((s) => s.text).join('\n')
        : entry.declaration;
    return [
      `## ${entry.name} (${entry.kind})`,
      '',
      `Category: ${entry.category.name}`,
      `Import from: ${entry.modules.join(', ')}`,
      `Summary: ${entry.summary}`,
      'Signature:',
      signature,
      `Source: ${sourceHref(entry)}`,
    ].join('\n');
  })
  .join('\n\n');

const body = `# TypeShade, full reference

> This file concatenates the authoring guide and the API reference typeshade.dev renders, one
> section and one export each, generated at build time from the same records the pages use.
> The compiler pinned at ${facts.pinnedCommit}. Shorter overview: /llms.txt.

# Guide

${guide}

# API reference

${reference}
`;

export const GET: APIRoute = () =>
  new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
