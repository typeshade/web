import { highlightTypeScriptInline } from '@typeshade/site-ui/code/highlight';

// Markdown inline code has no language field. Highlight expressions with visible TypeScript
// syntax, while leaving standalone export names, paths and product terms in their code face.
export default function remarkInlineCodeHighlight() {
  return async (tree) => {
    const nodes = [];
    const collect = (node) => {
      // Headings keep plain inline code so their text, IDs and table-of-contents labels remain
      // independent of syntax markup.
      if (node.type === 'heading') return;
      if (node.type === 'inlineCode') nodes.push(node);
      for (const child of node.children ?? []) collect(child);
    };
    collect(tree);
    for (const node of nodes) {
      const html = await highlightTypeScriptInline(node.value);
      if (html) {
        node.type = 'html';
        node.value = html;
      }
    }
  };
}
