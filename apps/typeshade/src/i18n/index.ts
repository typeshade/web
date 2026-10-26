// Locales, and the two things every page needs from them: the copy and the path.
// English is the source text; every other locale is a translation of it, typed against it
// so a missing string is a build error.
import { API_CATEGORIES } from '../lib/api.ts';
import { guideSectionIds } from '../lib/guide.ts';
import { en } from './en.ts';
import { ko } from './ko.ts';

import { locales, type Locale } from './locales.ts';

export { locales, type Locale };
export const defaultLocale: Locale = 'en';

/** Locale behaviour that is not copy: the things a page needs to know about a locale beyond
 *  its strings, so no file but this one names a locale literal to decide how it behaves. */
export interface LocaleSettings {
  /** og:locale and og:locale:alternate. */
  readonly ogLocale: string;
  /** Extra fonts this locale's pages preload, beyond the Latin font every page preloads. */
  readonly fontPreloads: readonly string[];
  /** The meta description's character budget (src/components/pages/ApiReferencePage.astro). */
  readonly metaDescriptionMax: number;
  /** The content collection (src/content.config.ts) this locale's guide translation lives in,
   *  when it has one. A locale with no collection shows the English guide body. */
  readonly guideCollection?: 'guideKo';
}

export const localeSettings: Record<Locale, LocaleSettings> = {
  en: { ogLocale: 'en_US', fontPreloads: [], metaDescriptionMax: 160 },
  ko: {
    ogLocale: 'ko_KR',
    fontPreloads: ['/fonts/ibm-plex-sans-kr-400.woff2'],
    metaDescriptionMax: 140,
    guideCollection: 'guideKo',
  },
};

export type Copy = typeof en;

export const copies: Record<Locale, Copy> = { en, ko };

/** The word each language names a design rule with ("Rule", and its translations), read off
 *  the heading of a rule's page, so a mention of a rule in any language links to its page. */
export const ruleWords = (): string[] => [
  ...new Set(Object.values(copies).map((c) => c.docs.rules.entry.heading('').trim())),
];

export const copyFor = (locale: Locale): Copy => copies[locale];

/** The path of a locale-neutral route ('/', '/checks/') in a given locale. */
export function localePath(locale: Locale, path: string): string {
  // A URL with a scheme is not a page of this site (the examples directory on GitHub, say); it
  // has no locale to carry.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  // Pages end in a slash, which is the URL the host serves them at; files keep their name.
  const p = path.endsWith('/') || /\.[a-z0-9]+$/i.test(path) ? path : `${path}/`;
  return locale === defaultLocale ? p : `/${locale}${p}`;
}

/** Absolute URL for hreflang and canonical links. */
export function localeUrl(site: URL, locale: Locale, path: string): string {
  return new URL(localePath(locale, path), site).toString();
}

/** One guide section's title and description in one language. */
export function guideSection(locale: Locale, id: string): { title: string; description: string } {
  const entry = copyFor(locale).guide.sections[id];
  if (!entry) throw new Error(`[guide] src/i18n/${locale}.ts has no guide.sections['${id}']`);
  return entry;
}

/** Every section of the guide is named in every language, and no language names a section the
 *  guide no longer has. The pages that render the guide call this at build time. */
export function assertGuideSections(): void {
  for (const locale of locales) {
    const map = copies[locale].guide.sections;
    for (const id of guideSectionIds) {
      if (!map[id]) throw new Error(`[guide] src/i18n/${locale}.ts has no guide.sections['${id}']`);
    }
    for (const id of Object.keys(map)) {
      if (!guideSectionIds.includes(id))
        throw new Error(
          `[guide] src/i18n/${locale}.ts still names the section '${id}', which the guide no longer has`,
        );
    }
  }
}

/** One category of the API reference, named in one language. */
export function apiCategoryCopy(locale: Locale, slug: string): { name: string; summary: string } {
  const named = copyFor(locale).docs.api.categories[slug];
  if (!named) throw new Error(`[api] src/i18n/${locale}.ts has no docs.api.categories['${slug}']`);
  return named;
}

/** Every category of the reference is named in every language, and no language names one the
 *  reference no longer has. The reference's pages call this at build time. */
export function assertApiCategories(): void {
  for (const locale of locales) {
    const map = copies[locale].docs.api.categories;
    for (const { slug } of API_CATEGORIES) {
      const named = map[slug];
      if (!named?.name)
        throw new Error(`[api] src/i18n/${locale}.ts has no name for the category '${slug}'`);
      if (!named.summary)
        throw new Error(`[api] src/i18n/${locale}.ts has no summary for the category '${slug}'`);
    }
    for (const slug of Object.keys(map)) {
      if (!API_CATEGORIES.some((c) => c.slug === slug)) {
        throw new Error(
          `[api] src/i18n/${locale}.ts still names the category '${slug}', which the reference no longer has`,
        );
      }
    }
  }
}
