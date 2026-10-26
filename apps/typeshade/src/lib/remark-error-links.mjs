// A diagnostic code named in inline code, `TS8028` or `SD0030`, becomes a link to that
// code's page at /reference/errors/, the way remark-api-links.mjs links an export's name.
// Inline code that is exactly a code the compiler's registries carry, and only its first
// mention in a document, so a paragraph that lists codes reads as prose. A heading, a code
// block and a link are left alone. It runs over every Markdown document the site renders:
// the guide's sections, their translations, and the reference's JSDoc.
import { SKIP, visit } from 'unist-util-visit';
import { errorCodePath } from './error-codes.ts';

const CODE = /^(?:TS8\d{3}|SD\d{4})$/;

export default function remarkErrorLinks() {
  return (tree) => {
    const linked = new Set();
    visit(tree, (node, index, parent) => {
      if (node.type === 'heading' || node.type === 'link' || node.type === 'linkReference')
        return SKIP;
      if (node.type !== 'inlineCode' || !parent || index === null || index === undefined) return;
      if (!CODE.test(node.value) || linked.has(node.value)) return;
      const url = errorCodePath(node.value);
      if (!url) return;
      linked.add(node.value);
      parent.children[index] = { type: 'link', url, children: [node] };
    });
  };
}
