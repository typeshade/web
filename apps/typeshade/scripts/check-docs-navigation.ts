// Audit the rendered navigation on every document. The full tree stays visible without
// disclosure controls; an optional prior build checks destinations and pager order.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'htmlparser2';
import type { AnyNode, Element } from 'domhandler';
const root = process.cwd();
const dist = path.resolve(root, process.env.NAVIGATION_DIST ?? 'dist');
const baseline = process.env.NAVIGATION_BASELINE;
const hasClass = (node: AnyNode, name: string): node is Element =>
  'attribs' in node && (node.attribs.class ?? '').split(/\s+/).includes(name);
function find(node: AnyNode, test: (node: AnyNode) => boolean): Element | undefined {
  if ('attribs' in node && test(node)) return node;
  if ('children' in node)
    for (const child of node.children) {
      const result = find(child, test);
      if (result) return result;
    }
}
function elements(node: AnyNode, test: (node: Element) => boolean): Element[] {
  return [
    ...('attribs' in node && test(node) ? [node] : []),
    ...('children' in node ? node.children.flatMap((child) => elements(child, test)) : []),
  ];
}
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory()
      ? files(path.join(dir, item.name))
      : item.name === 'index.html'
        ? [path.join(dir, item.name)]
        : [],
  );
}
const hrefs = (node: AnyNode | undefined): string[] =>
  node ? elements(node, (e) => e.name === 'a').map((e) => e.attribs.href) : [];
const unique = (values: readonly string[]) => [...new Set(values)].sort();
let count = 0,
  preserved = 0;
for (const file of files(dist)) {
  const document = parseDocument(readFileSync(file, 'utf8'));
  const nav = find(document, (node) => hasClass(node, 'docs-sidebar-in'));
  if (!nav) continue;
  const relative = path.relative(dist, file);
  const route = `/${relative
    .replace(/index\.html$/, '')
    .split(path.sep)
    .join('/')}`;
  const context = find(nav, (node) => 'attribs' in node && 'data-sidebar-context' in node.attribs);
  assert(context, `${route}: no current-page context`);
  const current = elements(context, (e) => e.attribs['aria-current'] === 'page');
  assert.equal(current.length, 1, `${route}: ambiguous current page`);
  assert.equal(current[0].attribs.href, route, `${route}: wrong current page`);
  const sections = find(nav, (node) => hasClass(node, 'sidebar-sections'));
  assert(sections, `${route}: no full documentation tree`);
  const groups = elements(sections, (e) => 'data-sidebar-section' in e.attribs);
  assert.equal(groups.length, 6, `${route}: missing documentation group`);
  assert(
    groups.every((e) => e.name === 'section'),
    `${route}: group is still collapsible`,
  );
  assert(
    elements(sections, (e) => e.name === 'details' || e.name === 'summary').length === 0,
    `${route}: sidebar tree still has disclosure controls`,
  );
  const related = elements(context, (e) => hasClass(e, 'sidebar-related'));
  assert(related.length <= 6, `${route}: unrelated menu growth`);
  for (const href of hrefs(context)) {
    const target = new URL(href, 'https://typeshade.dev');
    const targetFile = path.join(dist, decodeURIComponent(target.pathname), 'index.html');
    assert(existsSync(targetFile), `${route}: missing context destination ${href}`);
    if (target.hash)
      assert(
        readFileSync(targetFile, 'utf8').includes(`id="${target.hash.slice(1)}"`),
        `${route}: missing context anchor ${href}`,
      );
  }
  if (baseline) {
    const before = parseDocument(readFileSync(path.join(root, baseline, relative), 'utf8'));
    const oldNav = find(before, (node) => hasClass(node, 'docs-sidebar-in'));
    assert(oldNav, `${route}: missing baseline sidebar`);
    assert.deepEqual(
      unique(hrefs(sections)),
      unique(hrefs(oldNav)),
      `${route}: lost sidebar destination`,
    );
    assert.deepEqual(
      hrefs(find(document, (node) => hasClass(node, 'docs-pager'))),
      hrefs(find(before, (node) => hasClass(node, 'docs-pager'))),
      `${route}: pager order changed`,
    );
    preserved++;
  }
  count++;
}
assert(count > 0, 'no document pages were audited');
console.log(
  `[docs-navigation] ${count} document contexts, visible groups and destinations passed; ${preserved} baseline sidebars and pagers preserved`,
);
