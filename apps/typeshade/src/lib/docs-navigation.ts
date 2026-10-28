// Local context and a collapsible site tree share the existing sidebar destinations.
// Pager order remains the flat order returned by links.sidebar().
import type { SidebarGroup, SidebarItem, Destination } from './links.ts';
import { copyFor, localePath, type Locale } from '../i18n/index.ts';
import { languageEntry } from './language-reference.ts';
import { relatedDemos } from './function-demos.ts';
import { operationModel } from './operation-models.ts';

export interface SidebarNode extends SidebarItem {
  children: SidebarNode[];
}
export function sidebarNodes(items: readonly SidebarItem[]): SidebarNode[] {
  const roots: SidebarNode[] = [],
    stack: { depth: number; node: SidebarNode }[] = [];
  for (const item of items) {
    const depth = item.depth ?? 0;
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const node: SidebarNode = { ...item, children: [] };
    const parent = stack[stack.length - 1]?.node;
    (parent ? parent.children : roots).push(node);
    stack.push({ depth, node });
  }
  return roots;
}
export function containsPage(node: SidebarNode, here: string): boolean {
  return node.href === here || node.children.some((child) => containsPage(child, here));
}
export interface NavigationContext {
  parents: readonly Destination[];
  current: Destination;
  related: readonly Destination[];
}
export function navigationContext(
  locale: Locale,
  path: string,
  label: string,
  groups: readonly SidebarGroup[],
  breadcrumbs: readonly { name: string; href: string }[] = [],
): NavigationContext {
  const here = localePath(locale, path);
  const flat = groups.flatMap((g) => g.items);
  const current = { label, href: here };
  const match = /^\/reference\/functions\/([^/]+)\/$/.exec(path);
  if (match) {
    const name = match[1],
      entry = languageEntry('function', name);
    const r = copyFor(locale).docs.reference;
    const related = (operationModel(name)?.related ?? relatedDemos(name))
      .filter((other) => other !== name)
      .slice(0, 6);
    return {
      parents: [
        { label: r.kinds.function.name, href: localePath(locale, '/reference/functions/') },
        {
          label: r.families[entry.family],
          href: `${localePath(locale, '/reference/functions/')}#${entry.family}`,
        },
      ],
      current,
      related: related.map((other) => ({
        label: other,
        href: localePath(locale, `/reference/functions/${other}/`),
      })),
    };
  }
  const parents = breadcrumbs
    .filter((b) => b.href !== path && b.href !== '/')
    .slice(-2)
    .map((b) => ({ label: b.name, href: localePath(locale, b.href) }));
  if (!parents.length) {
    const parent = flat
      .filter((i) => here.startsWith(i.href) && i.href !== here)
      .sort((a, b) => b.href.length - a.href.length)[0];
    if (parent) parents.push(parent);
  }
  return { parents, current, related: [] };
}
