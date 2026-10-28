// Every translated string against its English one, before the build (bun run check:copy,
// the start of bun run build). Three things:
//   1. The same numerals, link keys and code spans in both, so a translation cannot drift
//      from a measured fact or point somewhere else.
//   2. A label (an English string of 40 characters or fewer) rendered no wider than about
//      1.35 times the English one, estimated from per-script advance widths, so a
//      translation cannot reflow the header, the buttons or a table. The front page's
//      headline is measured as a whole: its widest line against the widest English line,
//      since a translation may split the two lines differently.
//   3. The translation tells the im-not-ai rulebook (github.com/epoko77-ai/im-not-ai,
//      quick-rules A, C, D, H) makes countable: translationese particles, double passives,
//      signature phrases, stacked sentence-initial conjunctions, commas after connective
//      endings, and five or more sentences in a row on the same ending.
import { codeUiTexts } from '../ec.config.mjs';
import { en } from '../src/i18n/en.ts';
import { copies, defaultLocale, type Locale } from '../src/i18n/index.ts';

const LABEL_MAX_CHARS = 40;
const WIDTH_RATIO_MAX = 1.35;
const SAME_ENDING_STREAK = 5;

type Problem = { path: string; what: string };
const problems: Problem[] = [];

// Advance widths in em, from the site's fonts: Plex Sans latin averages, Plex Sans KR Hangul.
function width(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0xac00 && cp <= 0xd7af) w += 0.92;
    else if (cp >= 0x3130 && cp <= 0x318f) w += 0.92;
    else if (cp >= 0x3000 && cp <= 0x303f) w += 0.5;
    else if (ch === ' ') w += 0.26;
    else if (/[A-Z]/.test(ch)) w += 0.66;
    else if (/[0-9]/.test(ch)) w += 0.58;
    else if (/[a-z]/.test(ch)) w += 0.52;
    else if (/[.,:;'"!()]/.test(ch)) w += 0.3;
    else w += 0.55;
  }
  return w;
}

const numerals = (s: string) =>
  (s.match(/(?<![A-Za-z\d.])\d+(?:\.\d+)*(?![A-Za-z\d])/g) ?? []).sort();
const linkKeys = (s: string) => [...s.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]).sort();
const codeSpans = (s: string) => [...s.matchAll(/`([^`]*)`/g)].map((m) => m[1]).sort();
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// Korean tells the rulebook counts. Each is a pattern and how many are allowed in one string.
const KO_TELLS: Array<{ name: string; re: RegExp; max: number }> = [
  { name: 'A-1 "~에 대해" three or more times', re: /에 대해/g, max: 2 },
  { name: 'A-2 "~를 통해" three or more times', re: /[를을] 통해/g, max: 2 },
  { name: 'A-3 "~에 있어"', re: /에 있어/g, max: 0 },
  { name: 'A-7 "가지고 있"', re: /가지고 있/g, max: 0 },
  { name: 'A-8 double passive', re: /되어지|지게 된/g, max: 0 },
  { name: 'A-9 "~에 의해"', re: /에 의해/g, max: 0 },
  { name: 'A-19 double particle', re: /에서의|으로의|에로의|에의 /g, max: 0 },
  {
    name: 'D-1 to D-3 signature phrase',
    re: /결론적으로|시사하는 바|주목할 만|다음과 같은|크게 .{1,3} 가지/g,
    max: 0,
  },
  {
    name: 'C-11 comma after a connective ending, six or more',
    re: /(고|며|지만|면서|아서|어서), /g,
    max: 5,
  },
  {
    name: 'H-1 sentence-initial conjunction, three or more',
    re: /(?:^|\. )(?:또한|따라서|즉|나아가|아울러|게다가|더욱이)\b/g,
    max: 2,
  },
  { name: 'H-3 "이는" opening, three or more', re: /(?:^|\. )이는 /g, max: 2 },
];

// The headline is set in lines of its own (front.hero.before, accent, after), and Korean
// puts the head noun last, so the lines split differently. The rule is the widest line.
const HERO_LINE = /^front\.hero\.(before|accent|after)$/;
function heroWidth(a: Record<string, unknown>, b: Record<string, unknown>, locale: Locale): void {
  const widest = (o: Record<string, unknown>) =>
    Math.max(
      ...['before', 'accent', 'after'].map((k) =>
        typeof o[k] === 'string' ? width(o[k] as string) : 0,
      ),
    );
  const enW = widest(a),
    otherW = widest(b);
  if (otherW / enW > WIDTH_RATIO_MAX && otherW - enW > 2)
    problems.push({
      path: 'front.hero',
      what: `headline line about ${(otherW / enW).toFixed(2)} times as wide as the widest English line (${locale})`,
    });
}

function sameEndingStreak(s: string): number {
  const sentences = s
    .split(/[.!?]\s+/)
    .map((t) => t.trim())
    .filter((t) => /[가-힣]$/.test(t));
  let best = 0,
    run = 0,
    last = '';
  for (const t of sentences) {
    const end = t.slice(-3);
    run = end === last ? run + 1 : 1;
    last = end;
    best = Math.max(best, run);
  }
  return best;
}

function walk(a: unknown, b: unknown, locale: Locale, path: string): void {
  if (typeof a === 'string') {
    if (typeof b !== 'string') return;
    const s = b.replace(/`[^`]*`|\[[^\]]*\]\([^)]+\)/g, (m) => m); // links and code stay as written
    if (!same(numerals(a), numerals(b)))
      problems.push({
        path,
        what: `numerals differ: en ${numerals(a).join(' ')} / ${locale} ${numerals(b).join(' ')}`,
      });
    if (!same(linkKeys(a), linkKeys(b)))
      problems.push({
        path,
        what: `link keys differ: en ${linkKeys(a).join(' ')} / ${locale} ${linkKeys(b).join(' ')}`,
      });
    if (!same(codeSpans(a), codeSpans(b)))
      problems.push({
        path,
        what: `code spans differ: en ${codeSpans(a).join(' ')} / ${locale} ${codeSpans(b).join(' ')}`,
      });
    if (a.length <= LABEL_MAX_CHARS && a.length > 0 && !HERO_LINE.test(path)) {
      const ratio = width(b) / width(a);
      if (ratio > WIDTH_RATIO_MAX && width(b) - width(a) > 2)
        problems.push({
          path,
          what: `label about ${ratio.toFixed(2)} times as wide as the English "${a}": "${b}"`,
        });
    }
    if (locale === 'ko') {
      const plain = s.replace(/`[^`]*`/g, '').replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
      for (const tell of KO_TELLS) {
        const n = (plain.match(tell.re) ?? []).length;
        if (n > tell.max) problems.push({ path, what: `${tell.name} (${n})` });
      }
      const streak = sameEndingStreak(plain);
      if (streak >= SAME_ENDING_STREAK)
        problems.push({ path, what: `E-2 ${streak} sentences in a row end the same way` });
    }
    return;
  }
  if (typeof a === 'function') return;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length)
      problems.push({ path, what: `${a.length} items in en, ${b.length} in ${locale}` });
    a.forEach((item, i) => walk(item, b[i], locale, `${path}[${i}]`));
    return;
  }
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    if (path === 'front.hero')
      heroWidth(a as Record<string, unknown>, b as Record<string, unknown>, locale);
    for (const key of Object.keys(a))
      walk(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        locale,
        path ? `${path}.${key}` : key,
      );
  }
}

// The copy button's words are set in ec.config.mjs, which Node loads and which cannot read a
// dictionary written in TypeScript. This is where the two are held to the same text.
for (const locale of Object.keys(copies) as Locale[]) {
  const texts = (codeUiTexts as Record<string, { copy: string; copied: string } | undefined>)[
    locale
  ];
  const dictionary = copies[locale].code;
  if (!texts)
    problems.push({ path: 'code', what: `ec.config.mjs has no copy button text for ${locale}` });
  else if (texts.copy !== dictionary.copy || texts.copied !== dictionary.copied) {
    problems.push({
      path: 'code',
      what: `ec.config.mjs says "${texts.copy}" / "${texts.copied}" where the ${locale} dictionary says "${dictionary.copy}" / "${dictionary.copied}"`,
    });
  }
}

let strings = 0;
const count = (v: unknown): void => {
  if (typeof v === 'string') strings++;
  else if (Array.isArray(v)) v.forEach(count);
  else if (v && typeof v === 'object') Object.values(v).forEach(count);
};
for (const locale of Object.keys(copies) as Locale[]) {
  if (locale === defaultLocale) continue;
  count(copies[locale]);
  walk(en, copies[locale], locale, '');
}
if (problems.length) {
  for (const p of problems) console.error(`  ${p.path}: ${p.what}`);
  console.error(`check-copy: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`check-copy: ${strings} translated strings, no problems`);
