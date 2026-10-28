// Every translated API reference entry against the compiler's English JSDoc, before the build
// (bun run check:api-ko, part of bun run build). The translations are content/api/<locale>/
// <slug>.json, read by src/lib/api-translations.ts. The check fails, naming each slug, when:
//   1. A translation is stale: the English it was translated from (the `source` hash) is not
//      the pinned JSDoc. A pin that changes a JSDoc text holds the build until that text is
//      translated again. An export with no translation at all is listed too, and fails the
//      check once MISSING_FAILS is true (below); until the store is filled it is a warning.
//   2. A file names no export at the pinned commit.
//   3. A translation lacks a key the English has, or has one it lacks.
//   4. A text changes what must not be translated: the inline code spans (the same multiset),
//      the fenced code blocks (byte for byte) and the link targets; or drops a numeral of the
//      English (a translation may add one: "zero-based" reads 0부터 세는).
//   5. A text is left in English, or breaks the Korean register the guide is held to: 해요체, an
//      exclamation mark, the countable translation tells (scripts/korean-tells.ts), a word the
//      glossary keeps in English.
//
// Usage:
//   bun scripts/check-api-translations.ts                  check every locale
//   bun scripts/check-api-translations.ts --source <slug>  print the English texts of one
//     export under their keys, and the hash a translation of them records as `source`
//   bun scripts/check-api-translations.ts --worklist <file> [--locale ko]  write, for every
//     export, the file its translation goes to, its status (current, stale, missing), the
//     English texts under their keys and the hash to record, as one JSON array
import path from 'node:path';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { apiEntries } from '../src/lib/api.ts';
import {
  API_TRANSLATIONS_DIR,
  apiSourceHash,
  apiSourceTexts,
  apiTranslationDir,
  apiTranslationStatus,
  staleApiMessage,
} from '../src/lib/api-translations.ts';
import { KO_TELLS, forbiddenSubstitutes, sameEndingStreak } from './korean-tells.ts';

const SAME_ENDING_STREAK = 6;
// An export with no translation fails the check when this is true, and is a warning when it
// is false. It is false while the store is being filled for the first time.
const MISSING_FAILS = true;
const entries = apiEntries();

const sourceAt = process.argv.indexOf('--source');
if (sourceAt >= 0) {
  const slug = process.argv[sourceAt + 1];
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) {
    console.error(`no export has the slug '${slug}'`);
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      { slug, source: apiSourceHash(entry), texts: Object.fromEntries(apiSourceTexts(entry)) },
      null,
      2,
    ),
  );
  process.exit(0);
}

const worklistAt = process.argv.indexOf('--worklist');
if (worklistAt >= 0) {
  const out = process.argv[worklistAt + 1];
  const localeAt = process.argv.indexOf('--locale');
  const locale = localeAt >= 0 ? process.argv[localeAt + 1]! : 'ko';
  if (!out) {
    console.error('usage: --worklist <file> [--locale <locale>]');
    process.exit(1);
  }
  const status = apiTranslationStatus(locale, entries);
  const stale = new Set(status.stale.map((t) => t.slug));
  const list = entries.map((e) => ({
    slug: e.slug,
    name: e.name,
    kind: e.kind,
    category: e.category.slug,
    file: `${apiTranslationDir(locale)}/${e.slug}.json`,
    status: status.current.has(e.slug) ? 'current' : stale.has(e.slug) ? 'stale' : 'missing',
    source: apiSourceHash(e),
    texts: Object.fromEntries(apiSourceTexts(e)),
  }));
  writeFileSync(out, `${JSON.stringify(list, null, 2)}\n`);
  const count = (s: string) => list.filter((x) => x.status === s).length;
  console.log(
    `${out}: ${list.length} exports (${count('current')} current, ${count('stale')} stale, ${count('missing')} missing)`,
  );
  process.exit(0);
}

const FORBIDDEN = forbiddenSubstitutes(path.resolve(process.cwd(), 'content/guide/GLOSSARY.md'));
const FENCE = /```[\s\S]*?```/g;
const blocks = (s: string): string[] => [...s.matchAll(FENCE)].map((m) => m[0].trim());
const strip = (s: string): string => s.replace(FENCE, '');
const spans = (s: string): string[] =>
  [...strip(s).matchAll(/`([^`]+)`/g)].map((m) => m[1]!.replace(/\s+/g, ' ').trim()).sort();
const numerals = (s: string): string[] =>
  (
    strip(s)
      .replace(/`[^`]*`/g, '')
      .match(/(?<![A-Za-z\d.])\d+(?:\.\d+)*(?![A-Za-z\d])/g) ?? []
  ).sort();
const linkTargets = (s: string): string[] =>
  [...strip(s).matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]!).sort();
const same = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);
const diff = (a: string[], b: string[]): string => {
  const left = [...a];
  const extra: string[] = [];
  for (const x of b) {
    const i = left.indexOf(x);
    if (i >= 0) left.splice(i, 1);
    else extra.push(x);
  }
  return [
    left.length ? `missing ${left.map((x) => `\`${x}\``).join(', ')}` : '',
    extra.length ? `extra ${extra.map((x) => `\`${x}\``).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
};
// Prose with the code taken out, which is what must read as Korean.
const prose = (s: string): string =>
  strip(s)
    .replace(/`[^`\n]*`/g, '')
    .replace(/\]\([^)]*\)/g, ']');
const latinWords = (s: string): number => (prose(s).match(/[A-Za-z]{3,}/g) ?? []).length;

const problems: string[] = [];
const warnings: string[] = [];
const root = path.resolve(process.cwd(), API_TRANSLATIONS_DIR);
const locales = existsSync(root)
  ? readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];
let translated = 0;
for (const locale of locales) {
  const status = apiTranslationStatus(locale, entries);
  const dir = apiTranslationDir(locale);
  if (status.missing.length)
    (MISSING_FAILS ? problems : warnings).push(
      `${dir}: ${status.missing.length} export(s) have no translation: ${status.missing.join(', ')}. ` +
        `Print each one's English and the hash to record with \`bun scripts/check-api-translations.ts --source <slug>\`, ` +
        `then write ${dir}/<slug>.json with that slug, that source and the translated texts under the same keys.`,
    );
  for (const t of status.stale)
    problems.push(
      `${staleApiMessage(t)}. Run \`bun scripts/check-api-translations.ts --source ${t.slug}\`, ` +
        'translate the texts that changed and record the new source hash.',
    );
  for (const file of status.orphans)
    problems.push(
      `${file}: no export of the pinned compiler has this slug; delete the file or rename it to the export's new slug`,
    );
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  for (const t of status.current.values()) {
    translated += 1;
    const english = apiSourceTexts(bySlug.get(t.slug)!);
    const push = (key: string, what: string) => problems.push(`${t.file} [${key}]: ${what}`);
    for (const key of english.keys())
      if (!t.texts.has(key)) push(key, 'no translation of this text');
    for (const key of t.texts.keys())
      if (!english.has(key)) push(key, 'the English has no text under this key');
    for (const [key, en] of english) {
      const tr = t.texts.get(key);
      if (tr === undefined) continue;
      if (!tr.trim()) {
        push(key, 'empty');
        continue;
      }
      const eb = blocks(en),
        kb = blocks(tr);
      if (!same(eb, kb)) push(key, 'the fenced code blocks differ from the English');
      const es = spans(en),
        ks = spans(tr);
      if (!same(es, ks)) push(key, `code spans differ from the English: ${diff(es, ks)}`);
      const el = linkTargets(en),
        kl = linkTargets(tr);
      if (!same(el, kl)) push(key, `link targets differ from the English: ${diff(el, kl)}`);
      const dropped = diff(numerals(en), numerals(tr)).match(/missing [^;]*/)?.[0];
      if (dropped) push(key, `numerals of the English ${dropped.replace(/`/g, '')}`);
      if (locale !== 'en') {
        const p = prose(tr);
        if (latinWords(en) >= 3 && !/[가-힣]/.test(p)) push(key, 'left in English');
        if (/!/.test(p.replace(/!=/g, ''))) push(key, 'an exclamation mark in prose');
      }
      if (locale === 'ko') {
        const p = prose(tr);
        if (/해요|어요|예요/.test(p)) push(key, '해요체 in prose');
        for (const tell of KO_TELLS) {
          const n = (p.match(tell.re) ?? []).length;
          if (n > tell.max) push(key, `${tell.name} (${n})`);
        }
        const streak = sameEndingStreak(p);
        if (streak >= SAME_ENDING_STREAK)
          push(key, `E-2 ${streak} sentences in a row end the same way`);
        for (const w of FORBIDDEN)
          if (p.includes(w))
            push(
              key,
              `"${w}" replaces a word the glossary keeps in English (GLOSSARY.md, 영어로 두는 낱말)`,
            );
      }
    }
  }
}
for (const w of warnings) console.warn(`  warning: ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`  ${p}`);
  console.error(`check-api-translations: ${problems.length} problem(s)`);
  process.exit(1);
}
const untranslated = warnings.length
  ? ', some exports untranslated (warning above)'
  : ', every export of the pinned compiler translated';
console.log(
  `check-api-translations: ${translated} current translated reference entries in ${locales.length} language(s)${untranslated}, no problems`,
);
