// The API reference in other languages: content/api/<locale>/<slug>.json, one file per public
// export, keyed by the export's slug, translated by hand from the English JSDoc at the pinned
// commit. A file holds:
//
//   { "slug": "lift", "source": "<sha256>", "texts": { "summary": "…", "description": "…" } }
//
// `texts` has one entry per non-empty English text of the export, under the key
// apiSourceTexts() gives it: summary, description, parameters.<name>, returns,
// exceptions.<name>, examples.<n>, targets.<target> and members.<name> (a name the export
// carries twice takes #2, #3). `source` is the sha256 of those English texts at the time of the
// translation (apiSourceHash). When the pin moves and any of them changes, the translation is
// stale: it describes a compiler the site no longer builds against, so the Korean page falls
// back to the English JSDoc, the way a page with no translation does, and
// scripts/check-api-translations.ts (bun run check:api-ko, part of bun run build) names it until
// it is translated again. That script also checks what a current translation must keep: the
// same keys, the same code spans, fenced code blocks, link targets and numerals.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ApiEntry } from './api-types.ts';

export const API_TRANSLATIONS_DIR = 'content/api';

/** The directory one locale's translations live in, relative to the site root. */
export const apiTranslationDir = (locale: string): string => `${API_TRANSLATIONS_DIR}/${locale}`;

/** Every English text of an entry a page shows as prose, in page order, under a stable key.
 *  Empty texts are left out: there is nothing to translate. */
export function apiSourceTexts(entry: ApiEntry): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  const put = (key: string, text: string | undefined): void => {
    if (!text) return;
    let k = key;
    for (let n = 2; out.has(k); n += 1) k = `${key}#${n}`;
    out.set(k, text);
  };
  put('summary', entry.summary);
  put('description', entry.description);
  for (const p of entry.parameters) put(`parameters.${p.name}`, p.description);
  put('returns', entry.returns?.description);
  for (const e of entry.exceptions) put(`exceptions.${e.name}`, e.description);
  entry.examples.forEach((e, i) => put(`examples.${i + 1}`, e.description));
  for (const t of entry.targets) put(`targets.${t.target}`, t.note);
  for (const m of entry.members) put(`members.${m.name}`, m.description);
  return out;
}

/** The sha256 a translation records: of the keys and the English texts together, so a text
 *  that changes, appears or goes away makes the translation stale. */
export const apiSourceHash = (entry: ApiEntry): string =>
  createHash('sha256')
    .update(JSON.stringify([...apiSourceTexts(entry)]))
    .digest('hex');

export interface ApiTranslation {
  readonly slug: string;
  readonly locale: string;
  /** The file, relative to the site root. */
  readonly file: string;
  /** The translated texts, under the keys apiSourceTexts() gives the English. */
  readonly texts: ReadonlyMap<string, string>;
}

export interface StaleApiTranslation {
  readonly slug: string;
  readonly file: string;
  /** The sha256 the file records. */
  readonly recorded: string;
  /** The sha256 of the pinned English. */
  readonly pinned: string;
}

export interface ApiTranslationStatus {
  /** Current translations, by slug. */
  readonly current: ReadonlyMap<string, ApiTranslation>;
  readonly stale: readonly StaleApiTranslation[];
  /** Slugs of exports with no file. */
  readonly missing: readonly string[];
  /** Files whose slug is no export at the pinned commit. */
  readonly orphans: readonly string[];
}

const cache = new Map<string, ApiTranslationStatus>();

/** Read one locale's translations against the entries of the pinned compiler. */
export function apiTranslationStatus(
  locale: string,
  entries: readonly ApiEntry[],
): ApiTranslationStatus {
  const hit = cache.get(locale);
  if (hit) return hit;
  const dir = path.resolve(process.cwd(), apiTranslationDir(locale));
  const current = new Map<string, ApiTranslation>();
  const stale: StaleApiTranslation[] = [];
  const orphans: string[] = [];
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const seen = new Set<string>();
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)
      .filter((n) => n.endsWith('.json'))
      .sort()) {
      const file = `${apiTranslationDir(locale)}/${name}`;
      const slug = name.replace(/\.json$/, '');
      const raw = JSON.parse(readFileSync(path.join(dir, name), 'utf8')) as {
        slug?: unknown;
        source?: unknown;
        texts?: unknown;
      };
      if (raw.slug !== slug)
        throw new Error(
          `[api] ${file}: the file says slug '${String(raw.slug)}', the file is named '${slug}'`,
        );
      if (typeof raw.source !== 'string' || typeof raw.texts !== 'object' || raw.texts === null)
        throw new Error(`[api] ${file}: expected { "slug", "source", "texts" }`);
      const entry = bySlug.get(slug);
      if (!entry) {
        orphans.push(file);
        continue;
      }
      seen.add(slug);
      const pinned = apiSourceHash(entry);
      if (raw.source !== pinned) {
        stale.push({ slug, file, recorded: raw.source, pinned });
        continue;
      }
      const texts = new Map<string, string>();
      for (const [k, v] of Object.entries(raw.texts as Record<string, unknown>))
        if (typeof v === 'string') texts.set(k, v);
      current.set(slug, { slug, locale, file, texts });
    }
  }
  const missing = entries.filter((e) => !seen.has(e.slug)).map((e) => e.slug);
  const status = { current, stale, missing, orphans };
  cache.set(locale, status);
  return status;
}

/** The entry with every translated text in place of its English, or null when the locale has
 *  no current translation of it (the page then shows the English). A key the translation
 *  lacks keeps its English; scripts/check-api-translations.ts fails on one. */
export function translateEntry(entry: ApiEntry, t: ApiTranslation | undefined): ApiEntry | null {
  if (!t) return null;
  // Texts are swapped field by field, numbering a repeated name the way apiSourceTexts() does.
  const at = t.texts;
  const used = new Map<string, number>();
  const key = (base: string): string => {
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  };
  const tr = (base: string, text: string): string => (text ? (at.get(key(base)) ?? text) : text);
  return {
    ...entry,
    summary: tr('summary', entry.summary),
    description: tr('description', entry.description),
    parameters: entry.parameters.map((p) => ({
      ...p,
      description: tr(`parameters.${p.name}`, p.description),
    })),
    returns: entry.returns
      ? { ...entry.returns, description: tr('returns', entry.returns.description) }
      : null,
    exceptions: entry.exceptions.map((e) => ({
      ...e,
      description: tr(`exceptions.${e.name}`, e.description),
    })),
    examples: entry.examples.map((e, i) => ({
      ...e,
      description: tr(`examples.${i + 1}`, e.description),
    })),
    targets: entry.targets.map((s) => ({ ...s, note: tr(`targets.${s.target}`, s.note) })),
    members: entry.members.map((m) => ({
      ...m,
      description: tr(`members.${m.name}`, m.description),
    })),
  };
}

/** The line the build prints for one stale translation. */
export const staleApiMessage = (t: StaleApiTranslation): string =>
  `${t.file} was translated from older English (source ${t.recorded.slice(0, 12)}, the pinned JSDoc is ${t.pinned.slice(0, 12)})`;
