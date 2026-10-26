// What a translation must keep from its English source, and the Korean rules its prose is
// held to. scripts/check-guide-translations.ts holds each translated guide section to these;
// the reference notes' check (scripts/check-reference-notes.ts) holds each translated note
// section to the same ones. A translation keeps the English's code blocks byte for byte, every
// inline code span as many times, the same numerals, the same link targets, the same number of
// headings and the cells of a table that are only code. Korean prose is 합쇼체 with no
// exclamation marks, none of the countable translation tells the im-not-ai rulebook lists, and
// no five sentences in a row on the same ending. A line that spells a Korean pattern ends in
// i18n-ok, so scripts/check-i18n.mjs reads it as a rule a check applies and passes it.
// The Korean rules themselves live in scripts/korean-tells.ts, which the API reference's check
// reads too.
import { KO_TELLS, sameEndingStreak } from '../../scripts/korean-tells.ts';

/** A code span longer than this is not compared: a long span is a sentence of code, and its
 *  translation may break it differently. */
export const SPAN_MAX = 120;
/** This many sentences in a row on the same ending is a translation tell. */
export const SAME_ENDING_STREAK = 6;

/** The fenced code blocks, in order. */
export const blocks = (s: string): string[] =>
  [...s.matchAll(/```[\s\S]*?```/g)].map((m) => m[0].trim());
/** The text without its fenced code blocks. */
export const strip = (s: string): string => s.replace(/```[\s\S]*?```/g, '');
/** Every inline code span, with how many times it occurs. */
export const spans = (s: string): Map<string, number> => {
  const m = new Map<string, number>();
  for (const x of strip(s)
    .replace(/\n(?!\n)/g, ' ')
    .matchAll(/`([^`]+)`/g)) {
    const key = x[1]!.replace(/\s+/g, ' ');
    if (key.length > SPAN_MAX) continue;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
};
/** The numerals outside code blocks and identifiers, sorted, as one string. */
export const numerals = (s: string): string =>
  (strip(s).match(/(?<![A-Za-z\d.`])\d+(?:\.\d+)*(?![A-Za-z\d])/g) ?? []).sort().join(' ');
/** The link targets, sorted, as one string. */
export const linkTargets = (s: string): string =>
  [...strip(s).matchAll(/\]\(([^)]+)\)/g)]
    .map((m) => m[1]!)
    .sort()
    .join(' ');
/** How many headings of level 2 to 6. */
export const headings = (s: string): number => (strip(s).match(/^#{2,6}\s/gm) ?? []).length;
/** The rows of every table, each as its trimmed cells, separator rows left out. */
export const tableRows = (s: string): string[][] =>
  strip(s)
    .split('\n')
    .filter((l) => /^\|.*\|\s*$/.test(l) && !/^\|[\s:|-]+\|\s*$/.test(l))
    .map((l) =>
      l
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );
/** A table cell that holds code and nothing else, which a translation keeps as it is. */
export const CODE_ONLY_CELL = /^(?:`[^`]+`(?:\s*(?:,|\/|and|or)\s*)?)+$/;

/** Everything a translation `translated` of the English `en` fails to keep, in the order the
 *  checks run. `korean` applies the Korean rules; `forbidden` is forbiddenSubstitutes() of
 *  scripts/korean-tells.ts. */
export function translationProblems(
  en: string,
  translated: string,
  korean: boolean,
  forbidden: readonly string[],
): string[] {
  const problems: string[] = [];
  const push = (what: string) => problems.push(what);
  const ko = translated;
  const eb = blocks(en),
    kb = blocks(ko);
  if (eb.length !== kb.length)
    push(`code blocks: ${eb.length} in English, ${kb.length} in the translation`);
  else
    eb.forEach((b, i) => {
      if (b !== kb[i]) push(`code block ${i + 1} differs from the English`);
    });
  const es = spans(en),
    ks = spans(ko);
  for (const [k, n] of es)
    if ((ks.get(k) ?? 0) < n)
      push(
        `code span \`${k}\` appears ${n} time(s) in English, ${ks.get(k) ?? 0} in the translation`,
      );
  if (numerals(en) !== numerals(ko))
    push(`numerals differ: English [${numerals(en)}], translation [${numerals(ko)}]`);
  if (linkTargets(en) !== linkTargets(ko))
    push(`link targets differ: English [${linkTargets(en)}], translation [${linkTargets(ko)}]`);
  if (headings(en) !== headings(ko))
    push(`headings: ${headings(en)} in English, ${headings(ko)} in the translation`);
  const prose = strip(ko).replace(/`[^`\n]*`/g, '');
  if (korean) {
    for (const tell of KO_TELLS) {
      const n = (prose.match(tell.re) ?? []).length;
      if (n > tell.max) push(`${tell.name} (${n})`);
    }
    const streak = sameEndingStreak(prose);
    if (streak >= SAME_ENDING_STREAK) push(`E-2 ${streak} sentences in a row end the same way`);
    if (/해요|어요|예요/.test(prose)) push('해요체 in prose'); // i18n-ok
  }
  if (/!/.test(prose.replace(/!=/g, ''))) push('an exclamation mark in prose');
  const marks = strip(ko);
  const badClose = marks.match(/\*\*[^*\n]+[^\p{L}\p{N}\s]\*\*(?=[\p{L}\p{N}])/gu) ?? [];
  const badOpen = marks.match(/[\p{L}\p{N}]\*\*`[^`\n]+`\*\*/gu) ?? [];
  if (badClose.length || badOpen.length)
    push(
      `bold markers CommonMark cannot parse: ${[...badClose, ...badOpen].slice(0, 3).join(' | ')}`,
    );
  const er = tableRows(en);
  const kr = tableRows(ko);
  if (er.length !== kr.length) {
    push(`table rows: ${er.length} in English, ${kr.length} in the translation`);
  } else {
    er.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (CODE_ONLY_CELL.test(cell) && kr[i]![j] !== cell) {
          push(
            `table cell ${cell} (row ${i + 1}) must stay as it is; the translation has ${kr[i]![j] ?? '(nothing)'}`,
          );
        }
      });
    });
  }
  if (korean)
    for (const w of forbidden)
      if (prose.includes(w))
        push(
          `"${w}" replaces a word the glossary keeps in English (GLOSSARY.md, 영어로 두는 낱말)`, // i18n-ok
        );
  const latin = prose.split(/\n\s*\n/).filter(
    (p) =>
      p.trim() &&
      !/^[#>|+*-]/.test(p.trim()) &&
      !/[가-힣]/.test(p) && // i18n-ok
      (p.match(/[A-Za-z]{3,}/g) ?? []).length >= 4,
  );
  if (latin.length)
    push(`${latin.length} prose paragraph(s) left in English: ${latin[0]!.trim().slice(0, 60)}`);
  return problems;
}
