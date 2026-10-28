// The authoring guide in other languages: content/guide/<locale>/<section>.md, one file per
// section of AUTHORING.md, translated by hand from the English at the pinned commit. A file's
// front matter records the sha256 of the English body it was translated from. When the pin
// moves and a section's English changes, the translation is stale: it describes a compiler
// the site no longer builds against, so it is not served. That section is shown in English on
// that locale, under the note a section with no translation gets, and the build names it
// (staleGuideTranslations) until it is translated again. A stale file does not stop the build,
// because a pin that cannot move until every section is re-translated leaves the whole site on
// the old compiler, and every other page with it. scripts/check-guide-translations.ts checks
// the rest: code blocks, code spans, numerals, links, headings and register.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { guideSections } from './guide.ts';

export const GUIDE_TRANSLATIONS_DIR = 'content/guide';

export interface GuideTranslation {
  readonly id: string;
  readonly locale: string;
  /** The markdown body, without the front matter. */
  readonly body: string;
  /** The sha256 of the English body the translation was made from. */
  readonly source: string;
  readonly sourceLine: number;
  readonly order: number;
  /** The file, relative to the site root. */
  readonly file: string;
  /** The design rules the section explains, each with the fingerprint (Doorstop's `reviewed`)
   *  of the version the translation was read against: front matter
   *  `rules: 8.7 FYpP…=, 7.6 m4mW…=`. src/lib/rule-translations.ts checks them. */
  readonly rules: ReadonlyMap<string, string>;
}

/** `8.7 FYpP…=, 7.6 m4mW…=` as rule number to fingerprint; a fingerprint is base64url, so it
 *  holds no comma and no space. */
function ruleStamps(file: string, raw: string | undefined): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const entry of (raw ?? '').split(',')) {
    const e = entry.trim();
    if (!e) continue;
    const m = /^(\d{1,2}\.\d{1,2}) ([A-Za-z0-9_=-]+)$/.exec(e);
    if (!m) throw new Error(`[guide] ${file}: 'rules' entry '${e}' is not '<rule> <fingerprint>'`);
    out.set(m[1]!, m[2]!);
  }
  return out;
}

const FRONT = /^---\n([\s\S]*?)\n---\n/;

export const englishHash = (body: string): string =>
  createHash('sha256').update(body).digest('hex');

/** The directory one locale's translations live in, relative to the site root. */
export function translationDir(locale: string): string {
  return `${GUIDE_TRANSLATIONS_DIR}/${locale}`;
}

/** A translation made from an English body the pinned AUTHORING.md no longer has. */
export interface StaleGuideTranslation {
  readonly id: string;
  readonly file: string;
  /** The sha256 the front matter records. */
  readonly recorded: string;
  /** The sha256 of the pinned English. */
  readonly pinned: string;
}

/** Every translated section of one locale that is current with the pinned English, keyed by
 *  section id. Empty when the locale has none. A stale file is left out; see
 *  staleGuideTranslations. */
export function guideTranslations(locale: string): ReadonlyMap<string, GuideTranslation> {
  return read(locale).current;
}

/** Every translated section of one locale whose English changed after it was translated. */
export function staleGuideTranslations(locale: string): readonly StaleGuideTranslation[] {
  return read(locale).stale;
}

function read(locale: string): {
  current: ReadonlyMap<string, GuideTranslation>;
  stale: readonly StaleGuideTranslation[];
} {
  const dir = path.resolve(process.cwd(), translationDir(locale));
  const out = new Map<string, GuideTranslation>();
  const stale: StaleGuideTranslation[] = [];
  if (!existsSync(dir)) return { current: out, stale };
  const sections = new Map(guideSections.map((s) => [s.id, s]));
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort()) {
    const file = `${translationDir(locale)}/${name}`;
    const text = readFileSync(path.join(dir, name), 'utf8');
    const m = FRONT.exec(text);
    if (!m) throw new Error(`[guide] ${file} has no front matter (id, source, sourceLine)`);
    const meta: Record<string, string> = {};
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    const id = name.replace(/\.md$/, '');
    if (meta.id !== id)
      throw new Error(
        `[guide] ${file}: the front matter says id '${meta.id}', the file is named '${id}'`,
      );
    const section = sections.get(id);
    if (!section)
      throw new Error(`[guide] ${file}: AUTHORING.md at the pinned commit has no section '${id}'`);
    const hash = englishHash(section.body);
    if (meta.source !== hash) {
      stale.push({ id, file, recorded: String(meta.source), pinned: hash });
      continue;
    }
    out.set(id, {
      id,
      locale,
      body: text.slice(m[0].length),
      source: hash,
      sourceLine: section.sourceLine,
      order: section.order,
      file,
      rules: ruleStamps(file, meta.rules),
    });
  }
  return { current: out, stale };
}

/** The line the build prints for one stale translation. */
export const staleMessage = (t: StaleGuideTranslation): string =>
  `${t.file} was translated from an older '${t.id}' (source ${t.recorded.slice(0, 12)}, the pinned English is ${t.pinned.slice(0, 12)}); ` +
  'it is shown in English until the section is translated again from the pinned AUTHORING.md and the new hash recorded in its front matter';
