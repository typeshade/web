// What changed in the design rules since the previous pin, for the section at the foot of
// /reference/rules/. The compiler has no release yet (package.json 0.0.1, no tags), so a
// version of the language here is a commit this site pinned: the pins are read from this
// repository's own history of the vendor/shader-dsl pointer, and the rules at each one from the
// compiler's reqs/rules at that commit. A rule is added or removed when its item appears or goes
// away, and changed when Doorstop's fingerprint of it (`reviewed`, over the rule's text and its
// verifying files) moved. Nothing here is typed by hand, and a history the build cannot read
// stops the build: an empty list would say that nothing changed.
import { execFileSync } from 'node:child_process';
import legacy from '../../history.json';
import { byNumber, frontMatter, type Verification } from './design-rules.ts';

const SUBMODULE = 'vendor/shader-dsl';
const RULES_DIR = 'reqs/rules';

const git = (args: readonly string[], cwd = '.'): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const compiler = (args: readonly string[]): string => git(args, SUBMODULE);

/** A commit the site pinned the compiler at. */
export interface Pin {
  /** Short. */
  readonly commit: string;
  readonly full: string;
  /** The compiler commit's date, YYYY-MM-DD. */
  readonly date: string;
}

/** One rule as an item at a pin records it. */
export interface RuleAt {
  readonly number: string;
  readonly reviewed: string;
  readonly verification: Verification;
}

export interface RuleChange {
  readonly number: string;
  /** The compiler commits between the two pins that touched the rule's item, newest first. */
  readonly commits: readonly string[];
}
export interface ChangedRule extends RuleChange {
  /** How it was verified at the previous pin, when that differs from now. */
  readonly from?: Verification;
}

export interface RuleHistory {
  readonly current: Pin;
  /** The pin before the current one, from this repository's history; undefined at the first. */
  readonly previous?: Pin;
  /** False when the previous pin predates the compiler's reqs/, so there is nothing to compare. */
  readonly comparable: boolean;
  readonly added: readonly RuleChange[];
  readonly removed: readonly RuleChange[];
  readonly changed: readonly ChangedRule[];
}

function pinOf(full: string): Pin {
  return {
    full,
    commit: compiler(['rev-parse', '--short', full]),
    date: compiler(['log', '-1', '--format=%cs', full]),
  };
}

/** The pin before `current`: the newest pin this repository's history records that is not the
 *  current one, or undefined when the history holds no other. A shallow clone that stops before
 *  it cannot tell the two apart, so it stops the build. */
function previousPin(current: string): string | undefined {
  const histories = [
    { ref: 'HEAD', path: git(['rev-parse', '--show-prefix']) + SUBMODULE },
    { ref: legacy.legacyHead, path: legacy.legacyPath },
  ];
  for (const { ref, path } of histories) {
    const commits = git(['log', '--first-parent', '--format=%H', ref, '--', `:(top)${path}`])
      .split('\n')
      .filter(Boolean);
    for (const c of commits) {
      const entry = git(['ls-tree', '--full-tree', c, path]);
      if (!entry.startsWith('160000 commit ')) continue;
      const pin = entry.split(/\s+/)[2]!;
      if (pin !== current) return pin;
    }
  }
  if (git(['rev-parse', '--is-shallow-repository']) === 'true')
    throw new Error(
      `[rule-history] this clone is shallow and its history records no pin before ${current.slice(0, 7)}; fetch more of it (git fetch --unshallow) to build the rules' changes since the previous pin`,
    );
  return undefined;
}

/** The rules at a compiler commit, or undefined when it has no reqs/rules. */
function rulesAt(full: string): Map<string, RuleAt> | undefined {
  try {
    compiler(['cat-file', '-e', `${full}^{commit}`]);
  } catch {
    throw new Error(
      `[rule-history] the compiler's history in ${SUBMODULE} does not reach ${full.slice(0, 7)}, a pin this site recorded; fetch it (git -C ${SUBMODULE} fetch origin) to build the rules' changes`,
    );
  }
  const names = compiler(['ls-tree', '--name-only', full, `${RULES_DIR}/`])
    .split('\n')
    .filter((p) => /\/RULE-\d{4}\.md$/.test(p));
  if (names.length === 0) return undefined;
  const out = new Map<string, RuleAt>();
  for (const file of names) {
    const { data } = frontMatter(file, compiler(['show', `${full}:${file}`]));
    if (data.get('active') !== true) continue;
    const number = String(data.get('level'));
    out.set(number, {
      number,
      reviewed: String(data.get('reviewed')),
      verification: String(data.get('verification')) as Verification,
    });
  }
  return out;
}

const uidOf = (number: string): string => {
  const [a, b] = number.split('.');
  return `RULE-${a!.padStart(2, '0')}${b!.padStart(2, '0')}`;
};

/** The compiler commits in (from, to] that touched a rule's item, newest first, short. */
function commitsFor(from: string, to: string, number: string): string[] {
  return compiler([
    'log',
    '--format=%h',
    `${from}..${to}`,
    '--',
    `${RULES_DIR}/${uidOf(number)}.md`,
  ])
    .split('\n')
    .filter(Boolean);
}

/** The rules as items record them at one commit: number, fingerprint, verification. */
export type RulesAt = ReadonlyMap<string, RuleAt>;

/** What moved between two sets of rules: the numbers added, removed and changed (fingerprint),
 *  each in the design document's order, a changed rule with its verification before when that
 *  moved too. `commits` gives the commits that touched a rule's item. */
export function diffRules(
  before: RulesAt,
  now: RulesAt,
  commits: (n: string) => readonly string[] = () => [],
): Pick<RuleHistory, 'added' | 'removed' | 'changed'> {
  const sorted = (xs: string[]): string[] => xs.sort(byNumber);
  const change = (n: string): RuleChange => ({ number: n, commits: commits(n) });
  return {
    added: sorted([...now.keys()].filter((n) => !before.has(n))).map(change),
    removed: sorted([...before.keys()].filter((n) => !now.has(n))).map(change),
    changed: sorted(
      [...now.keys()].filter(
        (n) => before.has(n) && before.get(n)!.reviewed !== now.get(n)!.reviewed,
      ),
    ).map((n) => {
      const from = before.get(n)!.verification;
      return { ...change(n), ...(from !== now.get(n)!.verification ? { from } : {}) };
    }),
  };
}

let cache: RuleHistory | null = null;

/** The rules added, removed and changed between the previous pin and the current one. */
export function ruleHistory(): RuleHistory {
  if (cache) return cache;
  const currentFull = compiler(['rev-parse', 'HEAD']);
  const current = pinOf(currentFull);
  const previousFull = previousPin(currentFull);
  const empty = { added: [], removed: [], changed: [] };
  if (!previousFull) return (cache = { current, comparable: false, ...empty });
  const previous = pinOf(previousFull);
  const before = rulesAt(previousFull);
  const now = rulesAt(currentFull);
  if (!now) throw new Error(`[rule-history] the pin ${current.commit} has no ${RULES_DIR}`);
  if (!before) return (cache = { current, previous, comparable: false, ...empty });
  cache = {
    current,
    previous,
    comparable: true,
    ...diffRules(before, now, (n) => commitsFor(previousFull, currentFull, n)),
  };
  return cache;
}

/** The rules at the current pin, as diffRules reads them. */
export function currentRules(): RulesAt {
  return rulesAt(compiler(['rev-parse', 'HEAD']))!;
}
