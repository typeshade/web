// Every translated guide section against its English source, before the build (bun run
// check:guide, part of bun run build). The reader (src/lib/guide-translations.ts) has already
// left out a file whose recorded hash is not the pinned section's; this script names each one,
// as a warning, since that section is served in English until it is translated again. It then
// checks what a current translation must keep and what it must not carry:
//   1. The fenced code blocks, byte for byte and in the same order; every inline code span of
//      the English present the same number of times; the same numerals; the same link targets;
//      the same number of headings.
//   2. Korean prose in 합쇼체 with no exclamation marks, none of the countable translation
//      tells the im-not-ai rulebook lists, and no five sentences in a row on the same ending.
//   3. No prose paragraph left in English.
//   4. A translation and the design rules it explains: each translated section, and the
//      locale's dictionary pages, record the fingerprint of every rule they explain, and a pin
//      that changes one names the translation to translate again (src/lib/rule-translations.ts).
// The first three are translationProblems() in src/lib/translation-parity.ts, which the reference
// notes' check holds a translated note to as well; the Korean rules are scripts/korean-tells.ts.
import { guideSections } from '../src/lib/guide.ts';
import {
  guideTranslations,
  staleGuideTranslations,
  staleMessage,
  GUIDE_TRANSLATIONS_DIR,
} from '../src/lib/guide-translations.ts';
import { existsSync, readdirSync } from 'node:fs';
import { ruleTranslationProblems } from '../src/lib/rule-translations.ts';
import { copyFor } from '../src/i18n/index.ts';
import path from 'node:path';
import { forbiddenSubstitutes } from './korean-tells.ts';
import { translationProblems } from '../src/lib/translation-parity.ts';

type Problem = { file: string; what: string };
const problems: Problem[] = [];

const FORBIDDEN = forbiddenSubstitutes(
  path.resolve(process.cwd(), GUIDE_TRANSLATIONS_DIR, 'GLOSSARY.md'),
);

const english = new Map(guideSections.map((s) => [s.id, s.body]));
const root = path.resolve(process.cwd(), GUIDE_TRANSLATIONS_DIR);
const locales = existsSync(root)
  ? readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];
let files = 0;
let staleFiles = 0;
for (const locale of locales) {
  for (const t of staleGuideTranslations(locale)) {
    staleFiles += 1;
    console.warn(`  stale: ${staleMessage(t)}`);
  }
  for (const t of guideTranslations(locale).values()) {
    files += 1;
    const en = english.get(t.id)!;
    for (const what of translationProblems(en, t.body, locale === 'ko', FORBIDDEN))
      problems.push({ file: t.file, what });
  }
}
let ruleProblems = 0;
for (const locale of locales)
  for (const p of ruleTranslationProblems(locale, copyFor('en'))) {
    ruleProblems += 1;
    problems.push(p);
  }
if (problems.length) {
  for (const p of problems) console.error(`  ${p.file}: ${p.what}`);
  console.error(`check-guide-translations: ${problems.length} problem(s)`);
  process.exit(1);
}
const staleNote = staleFiles ? `; ${staleFiles} stale section(s) shown in English` : '';
console.log(
  `check-guide-translations: ${files} translated section(s) in ${locales.length} language(s), no problems${staleNote}; every translation that explains a design rule was read against the rule at the pin`,
);
