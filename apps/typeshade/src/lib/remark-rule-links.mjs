// A design rule named in prose, "Rule 4.8" or "Rules 7.2, 7.5" or the Korean for it, becomes
// a link to that rule's page at /reference/rules/, the way remark-error-links.mjs links a
// diagnostic code. The words stay as written: "Rules 7.2" links to 7.2 and the "7.5" after it
// to 7.5. Only the first mention of each rule in a document is linked, and a number no rule
// carries stays text. A heading, inline code, a code block and a link are left alone. It runs
// over every Markdown document the site renders: the guide's sections, their translations,
// the reference's JSDoc, and the design rules' own items, where a rule does not link to
// itself.
import { SKIP, visit } from 'unist-util-visit';
import { mentionParts, rulePath } from './design-rules.ts';
import { ruleWords } from '../i18n/index.ts';

const OWN = /[\\/]reqs[\\/]rules[\\/]RULE-(\d{2})(\d{2})\.md$/;

export default function remarkRuleLinks() {
  return (tree, file) => {
    const own = OWN.exec(String(file?.path ?? ''));
    const self = own ? `${Number(own[1])}.${Number(own[2])}` : null;
    const linked = new Set(self ? [self] : []);
    const words = ruleWords();
    visit(tree, (node, index, parent) => {
      if (node.type === 'heading' || node.type === 'link' || node.type === 'linkReference')
        return SKIP;
      if (node.type !== 'text' || !parent || index === null || index === undefined) return;
      const parts = mentionParts(node.value, (n) => rulePath(n) !== undefined, words);
      if (!parts.some((p) => p.kind === 'rule' && !linked.has(p.number))) return;
      const nodes = [];
      for (const p of parts) {
        const last = nodes[nodes.length - 1];
        if (p.kind === 'rule' && !linked.has(p.number)) {
          linked.add(p.number);
          nodes.push({
            type: 'link',
            url: rulePath(p.number),
            children: [{ type: 'text', value: p.value }],
          });
        } else if (last?.type === 'text') last.value += p.value;
        else nodes.push({ type: 'text', value: p.value });
      }
      parent.children.splice(index, 1, ...nodes);
      return index + nodes.length;
    });
  };
}
