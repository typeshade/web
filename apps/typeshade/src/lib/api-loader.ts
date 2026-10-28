// The `api` content collection: one entry per public export, with every markdown field
// rendered to HTML through the project's markdown pipeline (the same fences, code spans and
// package-name rewrite the guide gets). The entries come from src/lib/api.ts, read from the
// compiler's own source at the pinned commit. An entry also carries, per locale, its current
// translation (src/lib/api-translations.ts) rendered the same way; a locale with no current
// translation of an entry has none there, and its page shows the English.
import type { Loader } from 'astro/loaders';
import type { ApiEntry, ApiEntryHtml, ApiTranslated } from './api-types.ts';
import { apiEntries } from './api.ts';
import { apiTranslationStatus, staleApiMessage, translateEntry } from './api-translations.ts';
import { locales } from '../i18n/locales.ts';

export function apiLoader(): Loader {
  return {
    name: 'typeshade-api',
    async load({ store, renderMarkdown, logger }) {
      store.clear();
      const md = async (text: string) => (text ? (await renderMarkdown(text)).html : '');
      const render = async (entry: ApiEntry): Promise<ApiEntryHtml> => ({
        description: await md(entry.description),
        parameters: await Promise.all(entry.parameters.map((p) => md(p.description))),
        returns: await md(entry.returns?.description ?? ''),
        exceptions: await Promise.all(entry.exceptions.map((e) => md(e.description))),
        examples: await Promise.all(entry.examples.map((e) => md(e.description))),
        targets: await Promise.all(entry.targets.map((s) => md(s.note))),
        members: await Promise.all(entry.members.map((m) => md(m.description))),
      });
      const entries = apiEntries();
      const translatedLocales = locales.filter((l) => l !== 'en');
      const status = new Map(translatedLocales.map((l) => [l, apiTranslationStatus(l, entries)]));
      for (const entry of entries) {
        const translations: Record<string, ApiTranslated> = {};
        for (const [locale, s] of status) {
          const t = translateEntry(entry, s.current.get(entry.slug));
          if (t) translations[locale] = { summary: t.summary, html: await render(t) };
        }
        store.set({ id: entry.slug, data: { ...entry, html: await render(entry), translations } });
      }
      for (const [locale, s] of status) {
        for (const t of s.stale) logger.warn(`stale: ${staleApiMessage(t)}`);
        if (s.missing.length)
          logger.warn(
            `${locale}: ${s.missing.length} export(s) without a translation, shown in English`,
          );
        logger.info(`${locale}: ${s.current.size} translated reference entries`);
      }
      logger.info(`${store.keys().length} reference entries`);
    },
  };
}
