// The translations against the design rules they explain. A translated guide section is held to
// the English it was translated from by a hash (src/lib/guide-translations.ts); that hash does not
// move when a rule the section explains changes and the English stays as it was. This holds the
// translation to the rule itself: the translated text states the rule in its own words, and a
// new version of the rule is a reason to read those words again even when the English did not
// change. It is the translation's end of the drift guard in src/lib/design-rules.ts, which does
// the same for the English pages.
//
// Two records, one per kind of translated text:
//   - a translated guide section (content/guide/<locale>/<section>.md) records in its front
//     matter, `rules: 8.7 FYpP…=`, the fingerprint of every rule its English section explains:
//     the rules the section names ("Rule 8.7") and the rules the error codes it names enforce
//     (`SD0111` enforces Rule 8.7). Both are derived from the English at the pin, so a pin that
//     brings a new mention or a new code asks for the new rule's fingerprint;
//   - the pages whose words live in the dictionary (src/i18n/<locale>.ts) and explain a rule,
//     the ones ruleExplanations() lists with translated words, record per rule in
//     content/guide/<locale>/rules.json.
// A fingerprint is Doorstop's `reviewed` for the rule, read from reqs/rules at the pin.
// scripts/check-guide-translations.ts reports every problem, and fails, naming the translated
// section or page to translate again.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  designRules,
  mentioned,
  readAgainst,
  ruleExplanations,
  rulesForCode,
  type DesignRule,
  type GuardedCopy,
} from './design-rules.ts';
import { guideSections } from './guide.ts';
import { guideTranslations, translationDir } from './guide-translations.ts';

/** The record of a locale's dictionary pages, beside its guide sections. */
export const RULES_RECORD = 'rules.json';

export interface RuleTranslationProblem {
  readonly file: string;
  readonly what: string;
}

/** The rules an English guide section explains, each with why: the section names the rule, or
 *  names an error code that enforces it. */
export function sectionRules(body: string): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const n of mentioned(body)) out.set(n, `the section names Rule ${n}`);
  for (const m of body.matchAll(/\b(TS8\d{3}|SD\d{4})\b/g))
    for (const r of rulesForCode(m[1]!))
      if (!out.has(r.number)) out.set(r.number, `the section names ${m[1]}, which enforces it`);
  return out;
}

const short = (fingerprint: string): string => fingerprint.slice(0, 12);
const rulePage = (locale: string, rule: DesignRule): string =>
  `/${locale}/reference/rules/${rule.slug}/`;

/** Every translated guide section and dictionary page of `locale` whose record of a rule is
 *  missing, stale, or names a rule it no longer explains. */
export function ruleTranslationProblems(
  locale: string,
  english: GuardedCopy,
): RuleTranslationProblem[] {
  const problems: RuleTranslationProblem[] = [];
  const byNumber = new Map(designRules().map((r) => [r.number, r]));
  const bodies = new Map(guideSections.map((s) => [s.id, s.body]));

  // The guide sections: only the ones current with the pinned English. A stale one is already
  // named, and shown in English, until it is translated again, when its rules are recorded anew.
  for (const t of guideTranslations(locale).values()) {
    const explains = sectionRules(bodies.get(t.id) ?? '');
    const push = (what: string): void => {
      problems.push({ file: t.file, what });
    };
    for (const [n, why] of explains) {
      const rule = byNumber.get(n)!;
      const recorded = t.rules.get(n);
      if (recorded === undefined) {
        push(
          `explains Rule ${n} (${why}) and records no fingerprint for it. Read the translation against the rule (${rulePage(locale, rule)}), then add '${n} ${rule.reviewed}' to 'rules:' in its front matter.`,
        );
      } else if (recorded !== rule.reviewed) {
        push(
          `was translated against Rule ${n} at ${short(recorded)}, and the pin changes the rule to ${short(rule.reviewed)} (${why}). The English section did not change, so the translation is still served; translate it again where it states the rule differently from ${rulePage(locale, rule)}, then set '${n} ${rule.reviewed}' in 'rules:' in its front matter.`,
        );
      }
    }
    for (const n of t.rules.keys())
      if (!explains.has(n))
        push(
          `records Rule ${n}, which the English section at the pin no longer explains; drop it from 'rules:'.`,
        );
  }

  // The dictionary pages.
  const file = `${translationDir(locale)}/${RULES_RECORD}`;
  const full = path.resolve(process.cwd(), file);
  const record: Record<string, string> = existsSync(full)
    ? (JSON.parse(readFileSync(full, 'utf8')) as Record<string, string>)
    : {};
  const explained = new Map(
    [...ruleExplanations(english)]
      .map(([n, list]) => [n, list.flatMap((e) => (e.translated ? [e.translated(locale)] : []))])
      .filter(([, places]) => places.length > 0) as [string, string[]][],
  );
  for (const [n, places] of explained) {
    const rule = byNumber.get(n);
    const recorded = record[n];
    const where = places.join('; ');
    if (!rule) {
      problems.push({
        file,
        what: `Rule ${n} is gone from reqs/ at the pin. Translate again: ${where}. Then drop it here.`,
      });
      continue;
    }
    const english =
      readAgainst(n) === rule.reviewed
        ? ''
        : ' The English pages were read against another version too; the build asks for them after this, by READ_AGAINST in src/lib/design-rules.ts.';
    if (recorded === undefined) {
      problems.push({
        file,
        what: `Rule ${n} is explained by ${where}, and no fingerprint is recorded for the translation. Read each against the rule (${rulePage(locale, rule)}), then add "${n}": "${rule.reviewed}".${english}`,
      });
    } else if (recorded !== rule.reviewed) {
      problems.push({
        file,
        what: `Rule ${n} changed at the pin (${short(rule.reviewed)}; the ${locale} pages were translated against ${short(recorded)}). Translate again: ${where}. When each one states the rule at ${rulePage(locale, rule)}, set "${n}": "${rule.reviewed}".${english}`,
      });
    }
  }
  for (const n of Object.keys(record))
    if (!explained.has(n))
      problems.push({
        file,
        what: `records Rule ${n}, which no ${locale} page explains any longer; drop it.`,
      });
  return problems;
}
