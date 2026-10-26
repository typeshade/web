// Markdown's formulas: remark-math marks `$…$` and `$$…$$` as code elements with the classes
// math-inline and math-display, and this plugin replaces each with the MathML that
// src/lib/math.mjs writes for it.
import { renderMath } from './math.mjs';

function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(textOf).join('');
}

function classes(node) {
  const value = node.properties?.className;
  return Array.isArray(value) ? value : typeof value === 'string' ? value.split(' ') : [];
}

export default function rehypeMath() {
  return (tree) => {
    const visit = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type !== 'element') return child;
        // $$…$$ arrives as <pre><code class="language-math math-display">.
        const inner =
          child.tagName === 'pre' && child.children?.length === 1 ? child.children[0] : null;
        if (inner?.type === 'element' && classes(inner).includes('math-display'))
          return { type: 'raw', value: renderMath(textOf(inner), true) };
        if (child.tagName === 'code' && classes(child).includes('math-display'))
          return { type: 'raw', value: renderMath(textOf(child), true) };
        if (child.tagName === 'code' && classes(child).includes('math-inline'))
          return { type: 'raw', value: renderMath(textOf(child), false) };
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}
