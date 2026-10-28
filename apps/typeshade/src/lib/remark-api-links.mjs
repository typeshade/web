// The guide's cross-links into the reference. The first time a page writes a public export's
// name in inline code, that code becomes a link to the export's page, the way MDN links a
// function's first mention. An exact name only, with an optional "()"; inline code only, so a
// code block and a heading are left alone; and once per name per page, so a section reads as
// prose and not as a list of links.
//
// An export that is an IR builder for a builtin of the language (Builtins and Values: `pow`,
// `f32`, `vec4`) links to the language reference instead, since a guide that teaches
// "use typeshade" means the builtin the reader writes: a name written as a call, `f32()`, to
// its function entry first, and a bare name, `f32`, to its type entry first.
//
// Only the guide is linked: the sections rendered from the vendored AUTHORING.md and their
// translations under content/guide/<locale>/, which the loaders name through the fileURL
// option (src/content.config.ts). The reference's own markdown comes through the same
// pipeline with no file and is left as it is.
import { SKIP, visit } from 'unist-util-visit';
import { apiSlugByName, irBuilderSlugByName } from './api-nav.ts';
import { languageEntryPage } from './language-reference.ts';

const GUIDE = 'AUTHORING.md';
const TRANSLATION = /[\\/]content[\\/]guide[\\/][^\\/]+[\\/][^\\/]+\.md$/;

export default function remarkApiLinks() {
  return (tree, file) => {
    const filePath = String(file?.path ?? '');
    if (!filePath.endsWith(GUIDE) && !TRANSLATION.test(filePath)) return;
    const slugs = apiSlugByName();
    const builders = irBuilderSlugByName();
    const linked = new Set();
    /** The page a mention leads to: the language reference for a builtin, the API otherwise. */
    const target = (code) => {
      const name = code.replace(/\(\)$/, '');
      const slug = slugs.get(name);
      if (!slug) return undefined;
      if (builders.has(name)) {
        const order = code.endsWith('()') ? ['function', 'type'] : ['type', 'function'];
        const page = languageEntryPage(order[0], name) ?? languageEntryPage(order[1], name);
        if (page) return page;
      }
      return `/api/${slug}/`;
    };
    // A link into the reference the page already carries counts as the name's one mention:
    // src/lib/remark-package-name.mjs turns a link whose text is an export's name into one,
    // and it runs first. Without this the same name would be linked twice on the page.
    visit(tree, 'link', (node) => {
      if (!/^\/(api|reference)\//.test(node.url ?? '')) return;
      const only =
        node.children.length === 1 && node.children[0].type === 'inlineCode'
          ? node.children[0].value
          : '';
      if (only) linked.add(only.replace(/\(\)$/, ''));
    });
    visit(tree, (node, index, parent) => {
      if (node.type === 'heading' || node.type === 'link' || node.type === 'linkReference')
        return SKIP;
      if (node.type !== 'inlineCode' || !parent || index === null || index === undefined) return;
      const name = node.value.replace(/\(\)$/, '');
      const url = target(node.value);
      if (!url || linked.has(name)) return;
      linked.add(name);
      parent.children[index] = { type: 'link', url, children: [node] };
    });
  };
}
