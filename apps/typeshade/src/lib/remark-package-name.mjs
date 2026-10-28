// The guide is rendered from the pinned commit, where the package still carries its
// pre-release scope. The site imports it by its release name everywhere, so the rendered
// guide does too, in prose, inline code and code blocks alike. Links into the repository
// become permalinks at that commit; a link to the upstream API site, which does not exist
// here, keeps its text and loses its link. An environment variable the compiler reads keeps
// the name it is spelt with at that commit, since that is the name that works.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { visit } from 'unist-util-visit';
import { apiSlugByName } from './api-nav.ts';

const FROM = '@xgis/shader-dsl';
const TO = 'typeshade';
// Every section landed with an issue in the compiler's tracker, and its number is written
// into headings, prose and code comments alike. The site has no tracker to send a reader
// to, so the number goes wherever it appears, on its own or with the short tag the compiler
// files it under ("(#763 H7)"). The reference does the same in src/lib/api.ts.
const ISSUE = /\s*\(#\d+[^)]{0,20}\)/g;

const mirror = /url\s*=\s*(\S+)/
  .exec(readFileSync('.gitmodules', 'utf8'))?.[1]
  ?.replace(/\.git$/, '');
const pin = execSync('git -C vendor/shader-dsl rev-parse --short HEAD', {
  encoding: 'utf8',
}).trim();
if (!mirror || !/^[0-9a-f]{7,40}$/.test(pin))
  throw new Error('[guide] no mirror url or pinned commit');

// The reference's slugs, read on the first link that needs one: the extractor reads the
// compiler, so calling it at module load would run it for every markdown file.
let byName = null;
const slugs = () => (byName ??= apiSlugByName());

// The design rules' traceability items (src/lib/design-rules.ts) are the one text written
// against the compiler's own tracker, typeshade/typeshade, where every number they name is an
// issue or a pull request. Their text is normative, so a number stays and links there:
// dropping it would change what a rule says ("the family #130 to #139").
const REQS = /[\\/]reqs[\\/](?:rules|surface)[\\/][^\\/]+\.md$/;

/** A text node cut at every issue number, each number a link into the compiler's tracker. */
function issueLinks(value) {
  const out = [];
  let last = 0;
  for (const m of value.matchAll(/(?<![\w&/])#(\d+)\b/g)) {
    if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
    out.push({
      type: 'link',
      url: `${mirror}/issues/${m[1]}`,
      children: [{ type: 'text', value: m[0] }],
    });
    last = m.index + m[0].length;
  }
  if (out.length === 0) return null;
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

export default function remarkPackageName() {
  return (tree, file) => {
    const reqs = REQS.test(String(file?.path ?? ''));
    // One link per export name per page, the rule src/lib/remark-api-links.mjs follows: a
    // later link to a page already linked above unwraps to the code it was written as.
    const linked = new Set();
    visit(tree, (node, index, parent) => {
      if (reqs) {
        if (node.type !== 'text' || parent?.type === 'link') return;
        const parts = issueLinks(node.value);
        if (!parts) return;
        parent.children.splice(index, 1, ...parts);
        return index + parts.length;
      }
      if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') {
        node.value = node.value.split(FROM).join(TO).replace(ISSUE, '');
      }
      // A number the sentence names on its own ("(SD0109, #1654)") goes too, with the comma
      // it leaves behind. Prose only: a code block writes its own hashes.
      if (node.type === 'text')
        node.value = node.value.replace(/\s*#\d+\b/g, '').replace(/[,;]\s*\)/g, ')');
      if (node.type === 'link' && !/^(https?:|#|mailto:)/.test(node.url)) {
        if (node.url.startsWith('/')) {
          // A reference page of this site stays a link: the API reference writes its
          // {@link} targets as /api/<name>/. Any other absolute path is the upstream API
          // site's, which does not exist here, so it unwraps to the link's text.
          if (/^\/api\/[a-z0-9-]+\/$/.test(node.url)) return;
          parent.children.splice(index, 1, ...node.children);
          return index;
        }
        // A link into the compiler's source whose text is one export's name goes to that
        // export's reference page, which shows the signature the reader was being sent for.
        const only =
          node.children.length === 1 && node.children[0].type === 'inlineCode'
            ? node.children[0].value
            : '';
        const name = only.replace(/\(\)$/, '');
        const slug = only ? slugs().get(name) : undefined;
        if (slug && linked.has(name)) {
          parent.children.splice(index, 1, ...node.children);
          return index;
        }
        if (slug) linked.add(name);
        node.url = slug
          ? `/api/${slug}/`
          : `${mirror}/blob/${pin}/${node.url.replace(/^\.\//, '')}`;
      }
    });
  };
}
