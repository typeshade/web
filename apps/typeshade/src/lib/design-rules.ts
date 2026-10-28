// The data behind /reference/rules/: one page per design rule of the language, from the
// compiler's traceability tree at the pinned commit. Nothing about a rule is typed here.
//
//   reqs/rules/RULE-CCNN.md    one item per **Rule N.M.** of docs/language-design.md (RULE-0405
//                              is Rule 4.5): the rule's text, then its Rationale, Derives from
//                              and Enforced by, under front matter that says how the rule is
//                              verified, which files verify it and the fingerprint Doorstop
//                              keeps of it (`reviewed`).
//   reqs/surface/SURF-NNN.md   one item per section of docs/use-typeshade-surface.md that
//                              explains a rule, linked to those rules.
//   docs/language-design.md    the chapter headings the index groups the rules under, and the
//                              line each rule is written on.
//
// The compiler's reqs/README.md explains the tree. The items are derived from the Markdown by
// the compiler's own script and never edited by hand there, so the site reads them as they are
// and stops on anything it does not know how to read. The text is normative and is printed as
// written: the prose rules the API reference applies to JSDoc (src/lib/api.ts referenceProse)
// drop issue numbers and asides, which here would change what a rule says ("the family #130
// to #139" is the rule's scope). The numbers are the compiler's own tracker's, so the pages
// link them instead (src/lib/remark-package-name.mjs).
//
// Two more things are read here:
//   - which error codes enforce a rule: a code named in the rule's "Enforced by", and a rule
//     named in a code's registry text (src/lib/error-codes.ts). Both ends come from the
//     compiler, and a code or a rule one end names that the other does not carry stops the
//     build;
//   - the drift guard below: a page of this site written by hand that explains a rule records
//     the fingerprint of the rule it was read against, and a pin that changes the rule stops
//     the build and names the page to read again.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { firstSentence, registryTexts, tsCodeNames, writtenExampleCodes } from './error-codes.ts';
import { noteRuleMentions } from './reference-notes/index.ts';

const ROOT = 'vendor/shader-dsl';
const RULES_DIR = 'reqs/rules';
const SURF_DIR = 'reqs/surface';
const DESIGN = 'docs/language-design.md';
const SURFACE = 'docs/use-typeshade-surface.md';

/** How a rule is held, the four values reqs/README.md defines. */
export type Verification = 'test' | 'code' | 'pending' | 'review';
export const VERIFICATIONS: readonly Verification[] = ['test', 'code', 'pending', 'review'];

/** A file that verifies a rule, at the first line that names it. */
export interface RuleFile {
  /** Relative to the compiler's root. */
  readonly file: string;
  /** One-based. */
  readonly line: number;
  /** A path Doorstop cannot see (`evidence` in the item), which the compiler's own test checks. */
  readonly evidence: boolean;
}

/** A section of the surface document that explains a rule. */
export interface RuleSection {
  /** The § number. */
  readonly section: number;
  /** The section's heading in the surface document, without its number. */
  readonly title: string;
  /** The heading's anchor on GitHub's rendering of the file. */
  readonly anchor: string;
  /** False when the section was last checked against another version of the rule: Doorstop
   *  calls the link suspect, and the compiler's CI does not let one merge. */
  readonly current: boolean;
}

export interface DesignRule {
  /** `4.5`. */
  readonly number: string;
  readonly chapter: number;
  /** `RULE-0405`. */
  readonly uid: string;
  /** The last path segment of its page, `4-5`. */
  readonly slug: string;
  /** The fingerprint Doorstop keeps of the rule's text and its verifying files. */
  readonly reviewed: string;
  readonly verification: Verification;
  /** The rule's text, Markdown, without its bold `Rule N.M.` lead. */
  readonly text: string;
  /** Its first sentence, the line the index and the rule's links lead with. */
  readonly line: string;
  /** The three parts the item writes under the text, Markdown. */
  readonly rationale: string;
  readonly derives: string;
  readonly enforced: string;
  readonly files: readonly RuleFile[];
  readonly sections: readonly RuleSection[];
  /** The error codes that enforce it. */
  readonly codes: readonly string[];
  /** Other rules its text, rationale, sources and enforcement name. */
  readonly cites: readonly string[];
  /** The line docs/language-design.md writes it on. */
  readonly sourceLine: number;
}

export interface RuleChapter {
  readonly chapter: number;
  /** The chapter's heading in docs/language-design.md, without its number. */
  readonly title: string;
  readonly rules: readonly DesignRule[];
}

// ── reading the items ──────────────────────────────────────────────────────────────────

const root = (): string => path.resolve(ROOT);

/** The pinned commit, for the message that says reqs/ is missing. */
function pinnedShort(): string {
  try {
    return execSync(`git -C ${ROOT} rev-parse --short HEAD`, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

type Scalar = string | boolean;
type Field = Scalar | readonly string[] | readonly Record<string, string>[];

/** The front matter Doorstop writes, which is a small part of YAML: a scalar per key, a list
 *  of scalars, a list of one-key maps (`links`) or a list of maps (`references`). Anything
 *  else stops the build, naming the file, since a shape this reader does not know is a
 *  shape it would read wrong. */
export function frontMatter(
  file: string,
  text: string,
): { data: Map<string, Field>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`[design-rules] ${file} has no front matter`);
  const lines = m[1]!.split('\n');
  const data = new Map<string, Field>();
  const scalar = (raw: string): Scalar => {
    const v = raw.trim();
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    if (/^".*"$/.test(v)) return v.slice(1, -1);
    return v;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const key = /^([a-z_]+):(.*)$/.exec(line);
    if (!key) throw new Error(`[design-rules] ${file}: front matter line not understood: ${line}`);
    const [, name, rest] = key as unknown as [string, string, string];
    if (rest.trim() === '[]') {
      data.set(name, []);
      continue;
    }
    if (rest.trim() !== '') {
      data.set(name, scalar(rest));
      continue;
    }
    // A list follows, one `- ` item per entry, a map's further keys indented under it.
    const items: (string | Record<string, string>)[] = [];
    while (i + 1 < lines.length && /^(- |  )/.test(lines[i + 1]!)) {
      const next = lines[++i]!;
      if (next.startsWith('- ')) {
        const entry = next.slice(2);
        const pair = /^([A-Za-z0-9_-]+): (.*)$/.exec(entry);
        items.push(pair ? { [pair[1]!]: String(scalar(pair[2]!)) } : String(scalar(entry)));
      } else {
        const last = items[items.length - 1];
        const pair = /^ {2}([A-Za-z0-9_-]+): (.*)$/.exec(next);
        if (!pair || typeof last !== 'object')
          throw new Error(`[design-rules] ${file}: front matter line not understood: ${next}`);
        last[pair[1]!] = String(scalar(pair[2]!));
      }
    }
    if (items.every((x) => typeof x === 'string')) data.set(name, items as string[]);
    else if (items.every((x) => typeof x === 'object'))
      data.set(name, items as Record<string, string>[]);
    else throw new Error(`[design-rules] ${file}: the list '${name}' mixes scalars and maps`);
  }
  return { data, body: m[2]! };
}

const str = (file: string, data: Map<string, Field>, key: string): string => {
  const v = data.get(key);
  if (typeof v !== 'string') throw new Error(`[design-rules] ${file}: '${key}' is not a string`);
  return v;
};
const flag = (file: string, data: Map<string, Field>, key: string): boolean => {
  const v = data.get(key);
  if (typeof v !== 'boolean') throw new Error(`[design-rules] ${file}: '${key}' is not a boolean`);
  return v;
};
const list = (data: Map<string, Field>, key: string): readonly unknown[] => {
  const v = data.get(key);
  return Array.isArray(v) ? v : [];
};

/** The body's text and the three labelled parts under it. A part runs from its `- Label:`
 *  line to the next one, its nested lines brought back to the margin. */
function bodyParts(
  file: string,
  number: string,
  body: string,
): { text: string; rationale: string; derives: string; enforced: string } {
  const lead = `**Rule ${number}.**`;
  const trimmed = body.trim();
  if (!trimmed.startsWith(lead))
    throw new Error(`[design-rules] ${file} does not open with ${lead}`);
  const LABELS = ['Rationale', 'Derives from', 'Enforced by'] as const;
  const at = new RegExp(`^- (${LABELS.join('|')}):`, 'gm');
  const marks = [...trimmed.matchAll(at)];
  const labels = marks.map((m) => m[1]);
  if (labels.join('|') !== LABELS.join('|'))
    throw new Error(
      `[design-rules] ${file}: the parts under the rule are ${labels.join(', ') || 'missing'}; this reader knows ${LABELS.join(', ')}, in that order`,
    );
  const text = trimmed.slice(lead.length, marks[0]!.index).trim();
  const part = (i: number): string => {
    const start = marks[i]!.index! + marks[i]![0].length;
    const end = i + 1 < marks.length ? marks[i + 1]!.index! : trimmed.length;
    const lines = trimmed.slice(start, end).replace(/^ /, '').split('\n');
    return lines
      .map((l) => l.replace(/^ {2}/, ''))
      .join('\n')
      .trim();
  };
  return { text, rationale: part(0), derives: part(1), enforced: part(2) };
}

// ── rule mentions ──────────────────────────────────────────────────────────────────────

const NUMBER = String.raw`\d{1,2}\.\d{1,2}(?![\d]|\.\d)`;
/** "Rule 4.8", "Rules 7.2, 7.5", "Rules 8.9 and 8.13", "Rules 8.11 to 8.14": a mention in prose,
 *  led by the word each language names a rule with (`docs.rules.entry.heading` in every
 *  dictionary, "Rule" and its Korean), which the caller hands in. */
const mentionPatterns = new Map<string, RegExp>();
function mentionPattern(words: readonly string[]): RegExp {
  const key = words.join('|');
  let re = mentionPatterns.get(key);
  if (!re) {
    const lead = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    re = new RegExp(
      String.raw`(?<![\p{L}\p{N}_])(?:${lead})s? (${NUMBER})((?:(?:,| and| or| to|, and|, or) ${NUMBER})*)`,
      'gu',
    );
    mentionPatterns.set(key, re);
  }
  return re;
}

export type MentionPart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'rule'; readonly value: string; readonly number: string };

/** A piece of prose cut at every rule it names: "Rules 7.2, 7.5" is a mention written
 *  "Rules 7.2" for 7.2, the text ", ", and a mention written "7.5" for 7.5. The words stay as
 *  written. A number no rule carries stays text. */
export function mentionParts(
  text: string,
  known: (n: string) => boolean,
  words: readonly string[] = ['Rule'],
): MentionPart[] {
  const out: MentionPart[] = [];
  let last = 0;
  const push = (value: string): void => {
    if (value === '') return;
    const prev = out[out.length - 1];
    if (prev?.kind === 'text') out[out.length - 1] = { kind: 'text', value: prev.value + value };
    else out.push({ kind: 'text', value });
  };
  for (const m of text.matchAll(mentionPattern(words))) {
    push(text.slice(last, m.index));
    const whole = m[0];
    const first = m[1]!;
    const head = whole.slice(0, whole.indexOf(first) + first.length);
    if (known(first)) out.push({ kind: 'rule', value: head, number: first });
    else push(head);
    const rest = whole.slice(head.length);
    let at = 0;
    for (const n of rest.matchAll(new RegExp(NUMBER, 'g'))) {
      push(rest.slice(at, n.index));
      if (known(n[0])) out.push({ kind: 'rule', value: n[0], number: n[0] });
      else push(n[0]);
      at = n.index! + n[0].length;
    }
    push(rest.slice(at));
    last = m.index! + whole.length;
  }
  push(text.slice(last));
  return out;
}

/** Every rule number a text names, in English. */
export const mentioned = (text: string): string[] =>
  mentionParts(text, () => true)
    .filter((p) => p.kind === 'rule')
    .map((p) => (p as { number: string }).number);

// ── the surface document and the design document ──────────────────────────────────────

/** GitHub's anchor for a heading of a rendered Markdown file (github-slugger): lower case,
 *  punctuation dropped, each space a hyphen. */
function githubAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Mark}\p{Number}\p{Connector_Punctuation} -]/gu, '')
    .replace(/ /g, '-');
}

function numberedHeadings(
  file: string,
  depth: number,
): Map<number, { title: string; line: number; full: string }> {
  const out = new Map<number, { title: string; line: number; full: string }>();
  const hashes = '#'.repeat(depth);
  readFileSync(path.join(root(), file), 'utf8')
    .split('\n')
    .forEach((l, i) => {
      const m = new RegExp(`^${hashes} (\\d+)\\. (.+)$`).exec(l);
      if (m) out.set(Number(m[1]), { title: m[2]!.trim(), line: i + 1, full: l.slice(depth + 1) });
    });
  return out;
}

/** The line of every `**Rule N.M.**` in the design document. */
function ruleLines(): Map<string, number> {
  const out = new Map<string, number>();
  readFileSync(path.join(root(), DESIGN), 'utf8')
    .split('\n')
    .forEach((l, i) => {
      for (const m of l.matchAll(/\*\*Rule (\d+\.\d+)\.\*\*/g)) out.set(m[1]!, i + 1);
    });
  return out;
}

/** The first line of a file that names the rule, the way Doorstop's keyword search finds it. */
function keywordLine(file: string, keyword: string): number {
  const full = path.join(root(), file);
  if (!existsSync(full)) return 0;
  const re = new RegExp(`${keyword.replace(/\./g, '\\.')}(?!\\d)`);
  const at = readFileSync(full, 'utf8')
    .split('\n')
    .findIndex((l) => re.test(l));
  return at + 1;
}

// ── building the rules ─────────────────────────────────────────────────────────────────

const slugOf = (number: string): string => number.replace('.', '-');
const uidOf = (number: string): string => {
  const [a, b] = number.split('.');
  return `RULE-${a!.padStart(2, '0')}${b!.padStart(2, '0')}`;
};
/** Two rule numbers in the design document's order. */
export const byNumber = (a: string, b: string): number => {
  const [a1, a2] = a.split('.').map(Number) as [number, number];
  const [b1, b2] = b.split('.').map(Number) as [number, number];
  return a1 - b1 || a2 - b2;
};

interface Built {
  readonly rules: readonly DesignRule[];
  readonly chapters: readonly RuleChapter[];
  readonly surfaceItems: number;
}

let cache: Built | null = null;

function build(): Built {
  const rulesDir = path.join(root(), RULES_DIR);
  const surfDir = path.join(root(), SURF_DIR);
  if (!existsSync(rulesDir) || !existsSync(surfDir)) {
    throw new Error(
      `[design-rules] reqs/ not found at the pin (${ROOT} at ${pinnedShort()}). The design rules reference is generated from the compiler's reqs/rules and reqs/surface, which it has from eb0dde6 (typeshade/typeshade#219) on; move the pin to eb0dde6 or later.`,
    );
  }
  const problems: string[] = [];
  const lines = ruleLines();
  const chapterHeadings = numberedHeadings(DESIGN, 2);
  const surfaceHeadings = numberedHeadings(SURFACE, 2);

  // The surface sections, by the rules they explain.
  const sectionsOf = new Map<string, { section: number; stamp: string }[]>();
  let surfaceItems = 0;
  for (const name of readdirSync(surfDir)
    .filter((f) => /^SURF-\d+\.md$/.test(f))
    .sort()) {
    const file = `${SURF_DIR}/${name}`;
    const { data } = frontMatter(file, readFileSync(path.join(surfDir, name), 'utf8'));
    if (!flag(file, data, 'active')) continue;
    surfaceItems++;
    const section = Number(/^SURF-(\d+)\.md$/.exec(name)![1]);
    const source = str(file, data, 'source');
    if (source !== `${SURFACE} §${section}`)
      problems.push(
        `${file} names its source '${source}'; this reader expects '${SURFACE} §${section}'`,
      );
    if (!surfaceHeadings.has(section))
      problems.push(`${file} is surface §${section}, which ${SURFACE} has no heading for`);
    for (const link of list(data, 'links')) {
      const [uid, stamp] = Object.entries(link as Record<string, string>)[0] ?? [];
      if (!uid || !stamp) {
        problems.push(`${file}: a link this reader does not know how to read`);
        continue;
      }
      const m = /^RULE-(\d{2})(\d{2})$/.exec(uid);
      if (!m) {
        problems.push(`${file} links to ${uid}, which is not a RULE item`);
        continue;
      }
      const number = `${Number(m[1])}.${Number(m[2])}`;
      sectionsOf.set(number, [...(sectionsOf.get(number) ?? []), { section, stamp }]);
    }
  }

  // The error codes each rule names in its Enforced by, and the rules each code's registry
  // text names.
  const registry = registryTexts();
  const citedBy = new Map<string, Set<string>>();
  for (const [code, text] of registry) {
    for (const n of mentioned(text)) citedBy.set(n, new Set([...(citedBy.get(n) ?? []), code]));
  }

  const rules: DesignRule[] = [];
  for (const name of readdirSync(rulesDir)
    .filter((f) => /^RULE-\d{4}\.md$/.test(f))
    .sort()) {
    const file = `${RULES_DIR}/${name}`;
    const { data, body } = frontMatter(file, readFileSync(path.join(rulesDir, name), 'utf8'));
    if (!flag(file, data, 'active')) continue;
    const number = str(file, data, 'level');
    if (uidOf(number) !== name.replace(/\.md$/, ''))
      problems.push(`${file} carries level ${number}, which is ${uidOf(number)}`);
    const verification = str(file, data, 'verification') as Verification;
    if (!VERIFICATIONS.includes(verification))
      problems.push(
        `${file}: verification '${verification}' is none of ${VERIFICATIONS.join(', ')}`,
      );
    const reviewed = str(file, data, 'reviewed');
    const parts = bodyParts(file, number, body);

    const files: RuleFile[] = [];
    for (const ref of list(data, 'references')) {
      const r = ref as Record<string, string>;
      if (r.type !== 'file' || !r.path || r.keyword !== `Rule ${number}`) {
        problems.push(
          `${file}: a reference this reader does not know how to read (${JSON.stringify(r)})`,
        );
        continue;
      }
      files.push({ file: r.path, line: keywordLine(r.path, r.keyword), evidence: false });
    }
    for (const ev of list(data, 'evidence')) {
      if (typeof ev !== 'string') {
        problems.push(`${file}: an evidence entry that is not a path`);
        continue;
      }
      files.push({ file: ev, line: keywordLine(ev, `Rule ${number}`), evidence: true });
    }
    for (const f of files)
      if (f.line === 0) problems.push(`${file}: ${f.file} does not name Rule ${number} at the pin`);

    const stamps = sectionsOf.get(number) ?? [];
    const sections = stamps
      .map(({ section, stamp }) => {
        const h = surfaceHeadings.get(section);
        return {
          section,
          title: h?.title ?? '',
          anchor: h ? githubAnchor(h.full) : '',
          current: stamp === reviewed,
        };
      })
      .sort((a, b) => a.section - b.section);

    const codes = new Set<string>();
    for (const m of parts.enforced.matchAll(/\b(TS8\d{3}|SD\d{4})\b/g)) codes.add(m[1]!);
    for (const code of citedBy.get(number) ?? []) codes.add(code);
    for (const code of codes)
      if (!registry.has(code))
        problems.push(
          `Rule ${number} is enforced by ${code}, which neither registry carries at the pin`,
        );

    const all = [parts.text, parts.rationale, parts.derives, parts.enforced].join('\n');
    const cites = [...new Set(mentioned(all))].filter((n) => n !== number).sort(byNumber);

    const sourceLine = lines.get(number) ?? 0;
    if (sourceLine === 0) problems.push(`Rule ${number} is not written in ${DESIGN} at the pin`);
    const chapter = Number(number.split('.')[0]);
    if (!chapterHeadings.has(chapter))
      problems.push(`Rule ${number} is in chapter ${chapter}, which ${DESIGN} has no heading for`);

    rules.push({
      number,
      chapter,
      uid: uidOf(number),
      slug: slugOf(number),
      reviewed,
      verification,
      text: parts.text,
      line: firstSentence(parts.text.split('\n')[0]!),
      rationale: parts.rationale,
      derives: parts.derives,
      enforced: parts.enforced,
      files,
      sections,
      codes: [...codes].filter((c) => registry.has(c)).sort(),
      cites,
      sourceLine,
    });
  }
  rules.sort((a, b) => byNumber(a.number, b.number));

  const known = new Set(rules.map((r) => r.number));
  for (const r of rules)
    for (const n of r.cites)
      if (!known.has(n))
        problems.push(`Rule ${r.number} names Rule ${n}, which reqs/ does not carry`);
  for (const [n, codes] of citedBy)
    if (!known.has(n))
      problems.push(`${[...codes].join(', ')} name Rule ${n}, which reqs/ does not carry`);
  for (const n of sectionsOf.keys())
    if (!known.has(n))
      problems.push(`a surface section links to Rule ${n}, which reqs/ does not carry`);
  for (const n of lines.keys())
    if (!known.has(n)) problems.push(`${DESIGN} writes Rule ${n}, which reqs/ has no item for`);

  if (problems.length > 0) throw new Error(`[design-rules] ${problems.join('\n')}`);

  const chapters = [...new Set(rules.map((r) => r.chapter))].map((chapter) => ({
    chapter,
    title: chapterHeadings.get(chapter)!.title,
    rules: rules.filter((r) => r.chapter === chapter),
  }));
  return { rules, chapters, surfaceItems };
}

function built(): Built {
  if (!cache) cache = build();
  return cache;
}

// ── what the pages read ────────────────────────────────────────────────────────────────

/** Every rule, in the design document's order. */
export function designRules(): readonly DesignRule[] {
  return built().rules;
}

export function designRule(slug: string): DesignRule {
  const found = designRules().find((r) => r.slug === slug);
  if (!found) throw new Error(`[design-rules] no rule with the page '${slug}'`);
  return found;
}

/** The rules under the chapters of the design document that hold them, in order. */
export function ruleChapters(): readonly RuleChapter[] {
  return built().chapters;
}

/** The page of a rule, `/reference/rules/4-5/`, or undefined for a number no rule carries.
 *  The site links a rule wherever it names one through this. */
export function rulePath(number: string): string | undefined {
  return designRules().some((r) => r.number === number)
    ? `/reference/rules/${slugOf(number)}/`
    : undefined;
}

/** The rules a code enforces, in order. */
export function rulesForCode(code: string): readonly DesignRule[] {
  return designRules().filter((r) => r.codes.includes(code));
}

/** The rule a number names, or undefined for a number no rule carries. */
export function ruleByNumber(number: string): DesignRule | undefined {
  return designRules().find((r) => r.number === number);
}

/** The ways of holding a rule that leave it open: nothing in the compiler checks the rule yet.
 *  A guide page that names one of these rules says so beside the name (src/components/Rich.astro). */
export const OPEN_VERIFICATIONS: readonly Verification[] = ['pending', 'code'];

/** Every rule, grouped by how it is verified, in the order reqs/README.md defines the four
 *  values, each group in the design document's order. /reference/rules/guarantees/ lists
 *  them, a group under an anchor named for its value. */
export function rulesByVerification(): readonly {
  readonly verification: Verification;
  readonly rules: readonly DesignRule[];
}[] {
  return VERIFICATIONS.map((verification) => ({
    verification,
    rules: designRules().filter((r) => r.verification === verification),
  }));
}

export function rulePaths(): { params: { rule: string }; props: { slug: string } }[] {
  return designRules().map((r) => ({ params: { rule: r.slug }, props: { slug: r.slug } }));
}

/** How many rules the pin carries, by how each is verified, and how many surface sections
 *  explain one, for `facts`. */
export function ruleCounts(): {
  readonly total: number;
  readonly test: number;
  readonly code: number;
  readonly pending: number;
  readonly review: number;
  readonly surfaceSections: number;
  readonly codeLinks: number;
} {
  const { rules, surfaceItems } = built();
  const of = (v: Verification): number => rules.filter((r) => r.verification === v).length;
  return {
    total: rules.length,
    test: of('test'),
    code: of('code'),
    pending: of('pending'),
    review: of('review'),
    surfaceSections: surfaceItems,
    codeLinks: rules.reduce((n, r) => n + r.codes.length, 0),
  };
}

// ── the drift guard ────────────────────────────────────────────────────────────────────
//
// A page written by hand that explains a rule was read against one version of it. Doorstop
// keeps a fingerprint of every rule (`reviewed`), and the table below records, per rule, the
// fingerprint the pages that explain it were last read against. When the pin carries another
// one, the build stops, names the rule and the pages, and says how to clear it: read each page
// against the rule's new text, fix what no longer holds, then write the new fingerprint here.
// It is the site's end of what Doorstop calls a suspect link.
//
// Three kinds of page explain a rule:
//   - the error code pages whose program is written by hand (EXAMPLES and COUNTERPARTS in
//     src/lib/error-codes.ts), for every code the rule is enforced by. These are derived: a
//     pin that links a rule to such a code asks for the rule's fingerprint here;
//   - the copy that names a rule, "Rule 7.6" anywhere in the dictionary, which is derived too:
//     a string that names a rule states something about it, and Rich links the name;
//   - the pages in EXPLAINERS, whose copy or generator states what a rule says without
//     naming it.

/** Pages whose copy or generator states a rule without naming it, beyond the error code pages. */
const EXPLAINERS: readonly {
  readonly page: string;
  readonly source: string;
  readonly rules: readonly string[];
}[] = [
  {
    page: '/guide/language/control-flow/',
    source: 'language.topics.controlFlow.kernelLayoutP in src/i18n',
    rules: ['8.21', '8.23'],
  },
  {
    page: '/guide/language/string-keys-record/',
    source: 'language.topics.stringKeys in src/i18n',
    rules: ['4.1', '7.8', '8.21'],
  },
  {
    page: '/guide/language/types/',
    source: 'language.topics.types.boundaryItems in src/i18n',
    rules: ['8.9', '8.21'],
  },
  {
    page: '/guide/language/from-typescript/classes/',
    source:
      'the fieldlessClass and baseValue rows in src/lib/typescript-lowering.ts and their copy in src/i18n',
    rules: ['8.9', '8.21'],
  },
  {
    page: '/guide/language/functions/',
    source: 'language.topics.functions.paramsP and scopeP in src/i18n',
    rules: ['3.2', '3.3', '3.4', '8.8'],
  },
  {
    page: '/guide/language/from-typescript/expressions/',
    source: 'the integerLiteral row in src/lib/typescript-lowering.ts and its copy in src/i18n',
    rules: ['5.1'],
  },
  {
    page: '/guide/language/from-wgsl/types/',
    source:
      'src/lib/target-mapping.ts, MATRICES: the two-row shapes are declared outside a uniform',
    rules: ['4.8'],
  },
  {
    page: '/guide/language/from-wgsl/statements/',
    source:
      "language.mapping.fromWgsl.notes in src/i18n, 'statements.for', 'statements.while' and 'statements.switch'",
    rules: ['7.3', '7.5'],
  },
  {
    page: '/guide/language/from-typescript/functions/',
    source:
      'the lexicalShadow, localFunction, closure and recursion rows of src/lib/typescript-lowering.ts and their lines in src/i18n',
    rules: ['3.2', '8.4', '8.8', '8.17'],
  },
  {
    page: '/guide/language/from-typescript/control-flow/',
    source:
      'the forRow, forRuntime, whileRow and switchRow rows of src/lib/typescript-lowering.ts and their lines in src/i18n',
    rules: ['7.2', '7.3', '7.5'],
  },
  {
    page: '/guide/concepts/cpu-and-gpu/',
    source: 'concepts.cpuAndGpu in src/i18n: callsP, callsRule, loopsP and loopsRule',
    rules: ['7.5', '8.4'],
  },
  {
    page: '/guide/concepts/webgpu-and-webgl2/',
    source: 'concepts.webgpuAndWebgl2 load paragraphs in src/i18n and ConceptsWebgpuPage',
    rules: ['11.10', '11.11'],
  },
];

/** The rule versions the explaining pages were last read against. */
const READ_AGAINST: Readonly<Record<string, string>> = {
  '1.2': 't6OvP1FlcnvK4mIZKbcPULikBSKQ5LJ59oSe_GWWSio=',
  '1.3': 'fcW4P8W5BFQ0loGi6vlLvaa1Is6dCmpQ_g9tbwMsfHM=',
  '2.1': 'l05tfvIh6yqrDrP5O_FPgntb8Kkz9wOg4ebQjpW_4ro=',
  '2.2': 'X0g_aM9dhyo0h4x4klnU_hRQiKqok1jFPsVAbMRIgag=',
  '2.3': 'r7XKZw0j-Hb5AH5VaQM8ueWwC512ZArtkVGU0ccfsOE=',
  '3.1': 'US52ORocEX4MP8jxev-M_GTs0RerZfC5J1QncEFIvss=',
  '3.2': 'DzJmXVOtFiJEQfI2fDqe3HvXBsbRuFWCFC8AtfxQzv8=',
  '3.3': 'TV3uT7F1UcdzUFIa-xMAZm2HHw6PFunetfIWgW0nKVQ=',
  '3.4': 'AP43QRSI5bOoZawyRZe5T9mhZQywwspXav21b4gr47s=',
  '3.9': '3B2rlXJXA0GupXGpH-mhQpicZan-WehN8Xf4nhFST6Q=',
  '4.1': 'AmgGh0CW9YDxPJY5zgEMW7x81knuXtQ9RsVpX787fSU=',
  '4.2': 'MpVj8dEE3vyccKw-6hZlbejYh8Eot8TKjXivzSjJ4KI=',
  '4.6': 'RwdafG75jJiCMgm6Du1X3zVcPigfJdPEwfy6iWlDksU=',
  '4.8': 'ZaXqxS6SImuhTEXg74x7e6A4X5QWcoGarvtV45ZRA4I=',
  '5.1': 'SkLe2O5eC70w0MTm0Km7qQn5ZVeqL5Dnur-Ta3Ue1CI=',
  '5.3': 'AlhLu-cJSNgGl-ltXEFlhL7eWs5_USuUdEImJEf0Eb4=',
  '5.4': 'RphTFmChXNrzoLVIpKED02ndV41w4BSuuRjq3nTUtVM=',
  '6.1': 'bQNdly5Y0zf8TGTekfGvQL67oPOQ8W0hMfIplhb_N2o=',
  '6.2': 'X1TddP_Ob7b4QaR9Qbuoo1UgPCngNA5JdtbbWwd_lOc=',
  '6.3': 'pemg9yKGahUemSQAl6etOjgglWVpRbuBu_W4Sz92xGY=',
  '6.5': 'IucAW33jmMX-HpcJbFN2k5LlbkNZAU9-fwcEgcGinfE=',
  '6.6': 'qXyf0FpXuS4xir_HpHadSIsWFZT2WtMx8M-wm9BvJOE=',
  '6.7': '1zG8BrTbpn9X7I40p9-ShW1Tp_YDVTR85gr_Zqd7oVc=',
  '6.8': 'ACzJof4XG1J3td1gWZabFg6SznMgvkW7eareHD7el_Q=',
  '6.9': 'qi0W6dDsL08MCwIYGCDtMbTulbALP34qs5vuFsoiS0s=',
  '6.10': 'suiaQZS1y-SaWxDmJXHL21Qzp_yYkddUlpCNV8AsLVc=',
  '7.1': 'AFJzu81K-Vqw_MC2Gc-m4fnJAG7BARdj8l_YuG5C368=',
  '7.2': 'onO98E-yRQ3RftA44lVmgPmSW7ZkCd7rYrJGgFS8EI4=',
  '7.3': 'dg4uzav_rg6XoVu7GPWJl1-ldfIExMJUCzfIWZ_t6i0=',
  '7.4': 'Emky1db0T6Mhf0H1_VyxRD8Ub8JLKEB_0DqK59uhD-M=',
  '7.5': '4308LIgSysAnlue51NfkW0VyNcY9-VTAPwyWJ1UyQN4=',
  '7.6': 'kyzs2Ws4Mk2xUgP_v9ZM_z6jm_3zIWP2-BekxmeHpC8=',
  '7.7': 'rVsyjMQJvLpuTdW-wJpX7HLIu1Xi8dgLyl4zp6KiDoE=',
  '7.9': 'I2kb4szrYiKtmhAPhRUfI3BqKOo-DmLFxyCamUwLrCA=',
  '7.8': 'JdxJkbpG31gOdkn_xbvDhjFsXFs0oerIAsbeTv4h9ew=',
  '8.1': 'H1wCXs_NQPF7wMxgl8OGv3K-wybB6bXXiXjf4QV5xhs=',
  '8.3': '8-VNyGyWMJ4PWRrTYIljKv0l0ZT1SwzPno1x1EM6jvY=',
  '8.4': 'b77wiRGwK90RYWjEtfAedxCUcx_TL2CqithFmAw78sE=',
  '8.5': 'eAmMhCcS0QclyFTr3MIjXhcluzKxvIyjwnsDuKbNuTU=',
  '8.6': 'qW_RUaBjL-O-OIZTeHrwOCT5o9siV0waqA7BNLo7WfU=',
  '8.7': '6nXwFhkduvfWc5DgkjOLkznHD8X0n6kYTNs5_bU7BjI=',
  '8.8': 'bP4WZ2eB-YIBDuAev7fwgTxbSNOcF-iRN4LWbz-vDYY=',
  '8.9': 'i3rKqqglyH6ycILo1NnRX1pgWrom7FVlUuiDKjEwPxA=',
  '8.10': 'JcHQYh0JboU0ieAHSdAAsQ6yn6dGJfdSJ2FNy3_x9A4=',
  '8.11': 'R-96aWYlY8u8_m8xXTT-vAbk-BkIB-YjKVzMyW9NKdw=',
  '8.12': 'RdysJL6wG5oIuDDW_XRt1WEtzUwAxtGNOiVfTch2_Mk=',
  '8.13': 'aNXyjNJvi1bR7zPmCgF2WJ0PmaP_Qk6WWqXOOuEbzCg=',
  '8.14': 'SP-Fa9DtpBru_e2Zuh3x8ZUFrqweaTrNrJs-c8RHbE0=',
  '8.15': '0FrSw2QS2IA5gidXWeBTDqS3K7OeMxTUm2tRcR7ZSo0=',
  '8.16': '4o-oQhesBW9n9XwG1L78TuLDzJ4ugP2K2qE8LS2K06E=',
  '8.17': 'iy_UhoCMHYdgpfUXu8eRAllyZo67mQ2c6BRfQtMcIYY=',
  '8.18': 'mn0KFjpCD3UkRdGNJ7uA23DdHWAdwIg9VfMJ20Ag37o=',
  '8.19': 'C4CCOJUbq6DPSVzJtfwTX_uFWxk4Rc_-ISBYsfrtxKk=',
  '8.21': 'wdemiDMBdMwgxi-2Ui626xXtSovV43ngNhpzTLE-Dfo=',
  '8.22': 'Ca5h_etdlFvIPBA1NRya7g-bBPugGzboprLldGAJYDc=',
  '8.23': 'tEL3O53OmRelXPPhf7ltC2nW9uifkPi5I4B3-gDM4Cc=',
  '8.24': '7_T8SKwihYWaXZ9tFJ4jNqL5s_RkQINCIiK9rtlPC2c=',
  '8.25': 'XZRD1So9e-OFRi9VePXRjyCfT2_T_xaPFWQw_Uy0ZrM=',
  '9.2': 'UjdAYZRLzP-1L7XryMHNvYUQDbMNmFmw-YnvSbJL2LU=',
  '10.1': 'd8TWuezE06vSk0zrFfeQ9pKxFXYk_P4q_IC94Ny_CF8=',
  '11.5': 'K5GJo9hNFgdx3uz9sYCSGUVhUfFmjaxdcr223qtGFgE=',
  '11.8': 'BEwpShKarUqIKHnEohYGtTv-EryqbaYBIFHOekBV_IU=',
  '11.9': 'abpvFP8_FeG5Irb_u9A74_sdrqDUWxKV-5gR39Azldg=',
  '11.10': '6n50gvRAqatLpixdrwAN1qDST450zh5As5GXpuBgO9Y=',
  '11.11': '6H0GdVttOnAchqQQQAZ2wh8l3Y-H7VjH8YqkW_jbtHQ=',
  '11.13': 'MjPoEBI9RvGWEN4_WfV0qmxfoSXD8Cgy0df8X1hepjg=',
  '11.20': 'xToEY27JoFqnUJixM5F0Crd92ru3ELEhuwsS0iYlwMw=',
  '12.3': 'CjhXTenX6H0V0STxt5Bka_Sp7X0GVUeCZR9Mt1IqNvA=',
  '12.4': 'BHZ-Neq9i9zSLzX_EHLkq_rZA6ansI2EDMVOVFuqdZk=',
  '12.6': 'kuInDVEKCI_Qu_9zVLzT--W8UeBj0WgdX22sRWA_VNY=',
  '12.7': 'J74H031gQ4FNHTZrIegdYr02_KKNMFFkgQLHhsuICeM=',
};

/** The fingerprint the English pages that explain a rule were last read against, if any. */
export const readAgainst = (n: string): string | undefined => READ_AGAINST[n];

let guarded = false;

/** As much of the English dictionary as the guard reads: the front-end codes whose line it
 *  writes, and every string in it, for the rules a string names. */
export interface GuardedCopy {
  readonly docs: { readonly errors: { readonly lines: Readonly<Record<string, string>> } };
}

/** One place that explains a rule: a page, and what on it states the rule. `translated` says
 *  where another language's words for it live, the page and the dictionary key, for the
 *  translation check (src/lib/rule-translations.ts); it is missing where the page has no words
 *  of its own in that language, an error code page whose program is written by hand. */
export interface RuleExplanation {
  readonly where: string;
  readonly translated?: (locale: string) => string;
}

/** Every string of a dictionary with its dotted key, arrays by index. */
function copyStrings(value: unknown, key = ''): [string, string][] {
  if (typeof value === 'string') return [[key, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([k, v]) => copyStrings(v, key ? `${key}.${k}` : k));
}

/** The places that explain each rule, by rule number: the error code pages with words of their
 *  own (the ones whose program is written by hand, and the front-end codes whose line the
 *  dictionary writes, `docs.errors.lines` by constant name), every string of the dictionary
 *  that names the rule, EXPLAINERS, and every reference note that names it. A note's
 *  translation records the rule in its own front matter (src/lib/reference-notes.ts), so it
 *  has no `translated` place here. */
export function ruleExplanations(
  english: GuardedCopy,
): ReadonlyMap<string, readonly RuleExplanation[]> {
  const names = tsCodeNames();
  const written = new Set(writtenExampleCodes());
  // The front-end codes whose line the dictionary writes, by code: the constant name is its key.
  const lined = new Map<string, string>();
  for (const name of Object.keys(english.docs.errors.lines)) {
    const code = names.get(name);
    if (code) {
      written.add(code);
      lined.set(code, name);
    }
  }
  const out = new Map<string, RuleExplanation[]>();
  const add = (n: string, e: RuleExplanation): void => {
    out.set(n, [...(out.get(n) ?? []), e]);
  };
  for (const r of designRules())
    for (const code of r.codes) {
      if (!written.has(code)) continue;
      const page = `/reference/errors/${code.toLowerCase()}/`;
      const name = lined.get(code);
      add(r.number, {
        where: `${page} (its program in src/lib/error-codes.ts, or its line in docs.errors.lines)`,
        translated: name
          ? (locale) => `/${locale}${page} (docs.errors.lines.${name} in src/i18n/${locale}.ts)`
          : undefined,
      });
    }
  for (const [key, text] of copyStrings(english))
    for (const n of new Set(mentioned(text)))
      add(n, {
        where: `the copy at ${key} in src/i18n, which names the rule`,
        translated: (locale) => `the copy at ${key} in src/i18n/${locale}.ts`,
      });
  for (const e of EXPLAINERS)
    for (const n of e.rules)
      add(n, {
        where: `${e.page} (${e.source})`,
        translated: (locale) => `/${locale}${e.page} (${e.source})`,
      });
  for (const m of noteRuleMentions(mentioned)) add(m.number, { where: m.where });
  return out;
}

/** Stops the build when a rule some page explains has changed since the page was read
 *  (ruleExplanations says which pages). The pages that render the rules and the codes hand in
 *  the English dictionary. */
export function assertRuleReadings(english: GuardedCopy): void {
  if (guarded) return;
  const byNumber = new Map(designRules().map((r) => [r.number, r]));
  const pages = new Map(
    [...ruleExplanations(english)].map(([n, list]) => [n, list.map((e) => e.where)]),
  );

  const problems: string[] = [];
  for (const [n, list] of pages) {
    const rule = byNumber.get(n);
    const read = READ_AGAINST[n];
    if (!rule) {
      problems.push(
        `Rule ${n} is gone from reqs/ at the pin. Read again: ${list.join('; ')}. Then drop it from EXPLAINERS, or the mention from the copy.`,
      );
      continue;
    }
    if (read === undefined) {
      problems.push(
        `Rule ${n} is explained by ${list.join('; ')}, and no fingerprint is recorded for it. Read each page against the rule, then add '${n}': '${rule.reviewed}' to READ_AGAINST in src/lib/design-rules.ts.`,
      );
    } else if (read !== rule.reviewed) {
      problems.push(
        `Rule ${n} changed at the pin (reviewed ${rule.reviewed}; the pages were read against ${read}). Read again: ${list.join('; ')}. When each one matches the rule, set READ_AGAINST['${n}'] in src/lib/design-rules.ts to '${rule.reviewed}'.`,
      );
    }
  }
  for (const n of Object.keys(READ_AGAINST))
    if (!pages.has(n))
      problems.push(`READ_AGAINST records Rule ${n}, which no page explains any longer; drop it.`);
  if (problems.length > 0) throw new Error(`[design-rules] ${problems.join('\n')}`);
  guarded = true;
}

/** Holds the dictionaries' chapter names to the design document: English names each chapter
 *  the way its heading does, and every language names the same chapters. */
export function assertRuleChapters(
  english: Readonly<Record<number, string>>,
  local: Readonly<Record<number, string>>,
): void {
  const problems: string[] = [];
  const held = ruleChapters();
  for (const c of held) {
    if (english[c.chapter] !== c.title)
      problems.push(
        `chapter ${c.chapter} is '${c.title}' in ${DESIGN}; docs.rules.chapters in src/i18n/en.ts says '${english[c.chapter] ?? ''}'`,
      );
    if (!local[c.chapter])
      problems.push(`docs.rules.chapters has no name for chapter ${c.chapter}`);
  }
  const numbers = new Set(held.map((c) => c.chapter));
  for (const key of [...Object.keys(english), ...Object.keys(local)])
    if (!numbers.has(Number(key)))
      problems.push(`docs.rules.chapters names chapter ${key}, which holds no rule at the pin`);
  if (problems.length > 0) throw new Error(`[design-rules] ${[...new Set(problems)].join('\n')}`);
}
