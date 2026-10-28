// The reference's navigation: the categories, the members in each of them, and the order the
// index pages, the sidebar and the pager read them in. A category's members are alphabetical,
// so previous and next walk a category the way its index page lists it. Everything here comes
// from apiEntries() (src/lib/api.ts), which is read once per build.
import { API_CATEGORIES, apiEntries } from './api.ts';
import type { ApiCategory, ApiKind } from './api-types.ts';

/** One member of a category, as the index pages and the sidebar show it. */
export interface ApiNavEntry {
  readonly name: string;
  readonly slug: string;
  readonly kind: ApiKind;
  readonly summary: string;
}

export interface ApiNavCategory {
  readonly category: ApiCategory;
  readonly members: readonly ApiNavEntry[];
}

let cache: readonly ApiNavCategory[] | null = null;

/** Every category with its members, in the order API_CATEGORIES lists the categories. */
export function apiCategories(): readonly ApiNavCategory[] {
  if (cache) return cache;
  const byCategory = new Map<string, ApiNavEntry[]>();
  for (const entry of apiEntries()) {
    const list = byCategory.get(entry.category.slug) ?? [];
    list.push({ name: entry.name, slug: entry.slug, kind: entry.kind, summary: entry.summary });
    byCategory.set(entry.category.slug, list);
  }
  cache = API_CATEGORIES.map((category) => ({
    category,
    members: (byCategory.get(category.slug) ?? []).sort(byName),
  }));
  return cache;
}

// Alphabetical, with case ignored first, so abs sits beside Abs and not in a block of its own.
const byName = (a: ApiNavEntry, b: ApiNavEntry): number =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en') ||
  a.name.localeCompare(b.name, 'en');

/** One category by its slug. A slug the reference does not have fails the build. */
export function apiCategory(slug: string): ApiNavCategory {
  const found = apiCategories().find((c) => c.category.slug === slug);
  if (!found) throw new Error(`[api] no category '${slug}' in the reference`);
  return found;
}

/** The page before and after an export's page: its category, alphabetically, then the next
 *  category's index page, so the pager walks the reference from end to end. */
export function apiSiblings(slug: string): {
  previous?: ApiNavEntry;
  next?: ApiNavEntry;
  category: ApiNavCategory;
  nextCategory?: ApiNavCategory;
} {
  const categories = apiCategories();
  const index = categories.findIndex((c) => c.members.some((m) => m.slug === slug));
  if (index < 0) throw new Error(`[api] no export with the slug '${slug}'`);
  const category = categories[index]!;
  const at = category.members.findIndex((m) => m.slug === slug);
  return {
    previous: at > 0 ? category.members[at - 1] : undefined,
    next: at < category.members.length - 1 ? category.members[at + 1] : undefined,
    category,
    nextCategory: categories[index + 1],
  };
}

/** Every public export's name and the page it is documented on, for the guide's cross-links. */
export function apiSlugByName(): ReadonlyMap<string, string> {
  return new Map(apiEntries().map((entry) => [entry.name, entry.slug]));
}

/** The categories whose exports are IR builders for a builtin a `"use typeshade"` file calls by
 *  the same name (`pow`, `vec3`). Another export that shares a name with a language entry is
 *  something else: `reflect` the module reflection, `location` a layout helper. */
const BUILDER_CATEGORIES: ReadonlySet<string> = new Set(['builtins', 'values']);

/** The IR builders by name, for the language reference's link to the builder of its builtin. */
export function irBuilderSlugByName(): ReadonlyMap<string, string> {
  return new Map(
    apiEntries()
      .filter((entry) => BUILDER_CATEGORIES.has(entry.category.slug))
      .map((entry) => [entry.name, entry.slug]),
  );
}

/** Whether an export is an IR builder for a builtin of the language. */
export const isIrBuilder = (entry: { readonly category: { readonly slug: string } }): boolean =>
  BUILDER_CATEGORIES.has(entry.category.slug);
