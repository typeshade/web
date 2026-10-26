// The countable Korean translation tells, shared by the checks of the translations kept as
// files: the guide (scripts/check-guide-translations.ts) and the API reference
// (scripts/check-api-translations.ts). Each is a pattern and how many one text may carry; the
// list is the im-not-ai rulebook's (github.com/epoko77-ai/im-not-ai) countable rules plus the
// two words this site's glossary rules out.
import { existsSync, readFileSync } from 'node:fs';

export const KO_TELLS: Array<{ name: string; re: RegExp; max: number }> = [
  // "statement" as a bare predicate (문입니다) reads as 門 or 文 to a Korean developer; write
  // 문(statement) at first use, then a qualified 문 (if 문, raw 문) or 문장.
  {
    name: 'bare 문 as a predicate (write 문(statement) at first use, then if 문 / raw 문 / 문장)',
    re: /(?:^|[^가-힣A-Za-z`])문(?:입니다|이며|이고|이라|이었)/g,
    max: 0,
  },
  // "native return" mapped word for word; Korean says whose return it is: TypeScript의 return.
  { name: '네이티브 (write TypeScript의 or 자바스크립트의)', re: /네이티브/g, max: 0 },
  { name: 'A-1 "~에 대해" three or more times', re: /에 대해/g, max: 2 },
  { name: 'A-2 "~를 통해" three or more times', re: /[를을] 통해/g, max: 2 },
  { name: 'A-3 "~에 있어"', re: /에 있어/g, max: 0 },
  { name: 'A-7 "가지고 있"', re: /가지고 있/g, max: 0 },
  { name: 'A-8 double passive', re: /되어지|지게 된/g, max: 0 },
  { name: 'A-9 "~에 의해"', re: /에 의해/g, max: 0 },
  { name: 'A-19 double particle', re: /에서의|으로의|에로의|에의 /g, max: 0 },
  {
    name: 'D signature phrase',
    re: /결론적으로|시사하는 바|주목할 만|다음과 같은|크게 .{1,3} 가지/g,
    max: 0,
  },
  {
    name: 'H-1 sentence-initial conjunction, three or more',
    re: /(?:^|\. )(?:또한|따라서|즉|나아가|아울러|게다가|더욱이)\b/g,
    max: 2,
  },
  { name: 'H-3 "이는" opening, three or more', re: /(?:^|\. )이는 /g, max: 2 },
];

export function sameEndingStreak(prose: string): number {
  const sentences = prose
    .split(/(?<=[.!?])\s+/)
    .map((t) => t.trim().replace(/[.!?]$/, ''))
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

/** The words the glossary's "영어로 두는 낱말" table rules out (its third column): a Korean
 *  substitute for a word Korean developers say in English. */
export function forbiddenSubstitutes(glossary: string): string[] {
  if (!existsSync(glossary)) return [];
  const text = readFileSync(glossary, 'utf8');
  const start = text.indexOf('## 영어로 두는 낱말');
  if (start < 0) return [];
  const rest = text.slice(start);
  const end = rest.indexOf('\n## ', 1);
  const section = end < 0 ? rest : rest.slice(0, end);
  const rows = section
    .split('\n')
    .filter((l) => /^\|.*\|\s*$/.test(l) && !/^\|[\s:|-]+\|\s*$/.test(l))
    .map((l) =>
      l
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );
  const out: string[] = [];
  for (const row of rows.slice(1)) {
    const cell = row[2] ?? '';
    for (const raw of cell.split(/[,、·]/)) {
      const w = raw.replace(/\([^)]*\)/g, '').trim();
      if (w) out.push(w);
    }
  }
  return out;
}
