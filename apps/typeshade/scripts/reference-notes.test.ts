// Proves the reference notes' checks (scripts/check-reference-notes.ts): each runs once on the
// fixture note as it is committed, which passes, and once more for every fault below, planted
// into a copy of the fixture, where it fails with its own message. A check that cannot fail
// guards nothing. Run: bun test scripts/reference-notes.test.ts
import { describe, expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  FIXTURE_NOTES,
  FIXTURE_ROOT,
  type NoteRecord,
  type NoteSet,
} from '../src/lib/reference-notes/index.ts';
import { FIXTURE_STILLS } from '../src/lib/reference-notes/fixture.ts';
import { assertNoteReading, noteView } from '../src/lib/reference-notes.ts';
import {
  checkNotes,
  distProblems,
  readKorean,
  readNote,
  trailerProblems,
} from './reference-notes-checks.ts';

const ID = 'function/exp2';
const record = FIXTURE_NOTES[ID]!;
const roots: string[] = [];

/** A copy of the fixture with `plant` applied to its files and `change` to its record. */
function fixture(
  plant: (
    file: (rel: string, edit: (text: string) => string) => void,
    dir: string,
  ) => void = () => {},
  change: (r: NoteRecord) => NoteRecord = (r) => r,
  stills = FIXTURE_STILLS,
): NoteSet {
  const dir = mkdtempSync(path.join(tmpdir(), 'reference-notes-'));
  roots.push(dir);
  cpSync(path.resolve(FIXTURE_ROOT), dir, { recursive: true });
  plant((rel, edit) => {
    const file = path.join(dir, rel);
    const before = readFileSync(file, 'utf8');
    const after = edit(before);
    if (after === before) throw new Error(`the fault planted nothing in ${rel}`);
    writeFileSync(file, after);
  }, dir);
  return { root: dir, notes: { [ID]: change({ ...record }) }, stills, fixture: true };
}

const EN = 'en/function-exp2.md';
const KO = 'ko/function-exp2.md';
const READING = 'readings/function-exp2.json';
const replace = (from: string, to: string) => (text: string) => text.replace(from, to);
const append = (line: string) => (text: string) =>
  text.replace(/\n{{code doubled}}/, `${line}\n\n{{code doubled}}`);

/** The first problem a run reports that holds `expected`, printed for the record. */
function expectProblem(name: string, problems: readonly string[], expected: string): void {
  const hit = problems.find((p) => p.includes(expected));
  if (hit) console.log(`[${name}] ${hit.split('\n').join('\n    ')}`);
  else console.log(`[${name}] MISSING '${expected}' in:\n${problems.join('\n')}`);
  expect(hit).toBeDefined();
}

describe('the fixture as committed', () => {
  test('passes every check', () => {
    const report = checkNotes(fixture());
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.notes).toBe(1);
  });
});

describe('each fault fails its check', () => {
  const faults: [string, () => NoteSet, string][] = [
    // 2. the note rules
    ['N1 fenced code', () => fixture((f) => f(EN, append('```ts\nexp2(x)\n```'))), 'N1:'],
    [
      'N2 an address',
      () => fixture((f) => f(EN, append('See https://www.w3.org/TR/WGSL/ for more.'))),
      'N2: an address',
    ],
    [
      'N2 an unknown link key',
      () => fixture((f) => f(EN, append('See [the spec](wgslNowhere).'))),
      "N2: the link target 'wgslNowhere'",
    ],
    [
      'N3 a bare number',
      () => fixture((f) => f(EN, append('The curve doubles 3 times.'))),
      "N3: '3'",
    ],
    [
      'N5 a time word',
      () => fixture((f) => f(EN, append('The compiler currently keeps the call.'))),
      "N5: 'currently'",
    ],
    [
      'N6 a speed word',
      () => fixture((f) => f(EN, append('The call is faster on a vector.'))),
      "N6: 'faster'",
    ],
    [
      'N7 a section number',
      () => fixture((f) => f(EN, append('WGSL defines it in §17.5.'))),
      'N7:',
    ],
    [
      'N8 a behaviour without evidence',
      () =>
        fixture((f) =>
          f(EN, replace('`exp2(x)` is $2^x$.', '`exp2(x)` is $2^x$, and the compiler emits it.')),
        ),
      'N8: #what-it-computes',
    ],
    [
      'N9 an anchor span the sample lacks',
      () => fixture((f) => f(EN, replace('`exp2(u.k * uv.x)`', '`exp2(u.rate * uv.x)`'))),
      'N9:',
    ],
    [
      'N10 a particle after a token',
      () => fixture((f) => f(KO, replace('{{oracle exp2(3.0)}},', '{{oracle exp2(3.0)}}를,'))),
      'N10:',
    ],
    [
      'N11 a token the translation drops',
      () => fixture((f) => f(KO, replace(' {{assert oracleIsPowerOfTwo}}', ''))),
      'N11: #in-typeshade draws',
    ],
    [
      'N11 the Korean register',
      () => fixture((f) => f(KO, replace('계산합니다.', '계산해요.'))),
      'N11: #in-typeshade: 해요체 in prose',
    ],
    [
      'a token the build cannot draw',
      () => fixture((f) => f(EN, append('WGSL defines it {{cite wgsl#exp2-builtin}}.'))),
      'citing a specification needs the specification pin',
    ],
    [
      'a token left open',
      () => fixture((f) => f(EN, append('At two it is {{oracle exp2(2.0).'))),
      'opens or closes no token',
    ],
    [
      'a section with no evidence and no reads',
      () => fixture((f) => f(EN, replace('<!-- reads: none -->\n\n', ''))),
      'has no token and declares nothing',
    ],
    [
      'a heading with no id',
      () =>
        fixture((f) =>
          f(EN, replace('## What exp2 computes {#what-it-computes}', '## What exp2 computes')),
        ),
      'has no {#id}',
    ],
    // 3. the samples, the live example and its still
    [
      'a sample that does not compile',
      () =>
        fixture(undefined, (r) => ({
          ...r,
          samples: {
            doubled: {
              code: '"use typeshade"\n\nexport function doubled(x: f32): f32 {\n  return exp2(x, x)\n}\n',
            },
          },
        })),
      "the sample 'doubled' does not compile",
    ],
    [
      'a live example that does not build',
      () =>
        fixture(undefined, (r) => ({
          ...r,
          live: {
            'reference-fixture-exp2': {
              ...r.live['reference-fixture-exp2']!,
              code: r.live['reference-fixture-exp2']!.code.replace('step(uv.y, y)', 'step(uv.y)'),
            },
          },
        })),
      "the live example 'reference-fixture-exp2' does not build",
    ],
    ['a live example with no still', () => fixture(undefined, undefined, []), 'has no still'],
    // 4. N4
    [
      'N4 a span that is no entry and does not compile',
      () => fixture((f) => f(EN, append('It is `exp2(rate)` again.'))),
      'N4: code span `exp2(rate)`',
    ],
    // 5. the values, held to the reading
    [
      'a value the pin moved',
      () => fixture((f) => f(READING, replace('"8 | 8"', '"9 | 9"'))),
      'oracle:exp2(3.0)   read: 9 | 9   pin: 8 | 8',
    ],
    [
      'an assertion that stops holding',
      () => fixture(undefined, (r) => ({ ...r, asserts: { oracleIsPowerOfTwo: () => false } })),
      'assert:oracleIsPowerOfTwo   read: true   pin: false',
    ],
    [
      'a compile case whose halves disagree',
      () =>
        fixture(undefined, (r) => ({
          ...r,
          compile: {
            ...r.compile,
            'int-argument': {
              source:
                '"use typeshade"\nimport { g } from "./missing.shade.ts"\n\nexport function f(x: f32): f32 {\n  return g(x)\n}\n',
            },
          },
        })),
      'the two halves disagree',
    ],
    [
      'an oracle value the two precisions disagree on',
      () => fixture((f) => f(EN, append('At a tenth it is {{oracle exp2(0.1)}}.'))),
      'Pick one with {{oracle@f64',
    ],
    // 6. what the reading holds and what it leaves out
    [
      'an input the reading does not record',
      () => fixture((f) => f(EN, append('At two it is {{oracle exp2(2.0)}}.'))),
      'the reading records no value for oracle:exp2(2.0)',
    ],
    [
      'a value no section reads',
      () =>
        fixture((f) =>
          f(READING, replace('"inputs": {', '"inputs": {\n    "oracle:exp2(5.0)": "32 | 32",')),
        ),
      'which no section of',
    ],
  ];
  for (const [name, set, expected] of faults) {
    test(name, () => expectProblem(name, checkNotes(set()).errors, expected));
  }

  test('no such entry', () => {
    const s = fixture((_f, dir) => {
      cpSync(path.join(dir, EN), path.join(dir, 'en/function-noSuchName.md'));
    });
    const set: NoteSet = { ...s, notes: { 'function/noSuchName': record } };
    expectProblem(
      'no such entry',
      checkNotes(set).errors,
      'the reference at the pin has no entry function/noSuchName',
    );
  });

  test('a note file nobody registered', () => {
    const set = fixture((_f, dir) =>
      cpSync(path.join(dir, EN), path.join(dir, 'en/function-sin.md')),
    );
    expectProblem(
      'an unregistered note file',
      checkNotes(set).errors,
      'function-sin.md is not registered',
    );
  });
});

describe('the rules a note names', () => {
  // READ_AGAINST is read once per process, so this fault runs in a process of its own.
  test('a rule no page was read against', () => {
    const set = fixture((f) => f(EN, replace('{{rule 12.7}}', '{{rule 9.4}}')));
    const run = spawnSync('bun', ['scripts/check-reference-notes.ts'], {
      env: { ...process.env, REFERENCE_NOTES_FIXTURE: set.root },
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expectProblem(
      'a rule no page was read against',
      run.stderr.split('\n'),
      'Rule 9.4 is explained by the reference note',
    );
  }, 120_000);
});

describe('a translation that is not current', () => {
  test('a section translated from an older English is shown in English, as a warning', () => {
    const set = fixture((f) =>
      f(KO, (t) => t.replace(/what-it-computes [0-9a-f]{12}/, 'what-it-computes 000000000000')),
    );
    const report = checkNotes(set);
    expect(report.errors).toEqual([]);
    expectProblem(
      'a stale translated section',
      report.warnings,
      'was translated from an older English',
    );
    const { view } = noteView(set, ID, 'ko');
    expect(view.sections.find((s) => s.id === 'what-it-computes')!.fallback).toBe(true);
    expect(view.sections.find((s) => s.id === 'in-typeshade')!.fallback).toBe(false);
  });
  test('a section translated against an older rule is shown in English, as a warning', () => {
    const set = fixture((f) =>
      f(KO, (t) => t.replace(/^rules: 12\.7 .*$/m, 'rules: 12.7 AAAAAAAAAAAA')),
    );
    const report = checkNotes(set);
    expect(report.errors).toEqual([]);
    expectProblem(
      'a translated section read against an older rule',
      report.warnings,
      'was translated against Rule 12.7',
    );
    expect(
      noteView(set, ID, 'ko').view.sections.find((s) => s.id === 'in-typeshade')!.fallback,
    ).toBe(true);
  });
});

describe('the page', () => {
  test('the note draws its values and its links in each language', () => {
    const md = (locale: 'en' | 'ko') =>
      noteView(fixture(), ID, locale)
        .view.sections.flatMap((s) => s.chunks)
        .map((c) => (c.kind === 'markdown' ? c.text : ''))
        .join('\n');
    const en = md('en');
    expect(en).toContain('answers `8` for `exp2(3.0)`');
    expect(en).toContain('<a href="/reference/functions/pow/"><code>pow</code></a>');
    expect(en).toContain('`TS8036` exp2 takes an f32');
    // The diagnostic's own full stop gives way to the sentence's.
    expect(en).toContain('got i32</span>. A float argument');
    expect(en).not.toContain('{{');
    const ko = md('ko');
    expect(ko).toContain('<a href="/ko/reference/functions/pow/"><code>pow</code></a>');
    expect(ko).toContain('<a href="/ko/reference/rules/12-7/">');
  });
  test('an entry page whose note is stale stops the build', () => {
    const set = fixture((f) => f(READING, replace('"8 | 8"', '"9 | 9"')));
    const before = process.env.REFERENCE_NOTES_FIXTURE;
    process.env.REFERENCE_NOTES_FIXTURE = set.root;
    try {
      let message = '';
      try {
        assertNoteReading('function', 'exp2');
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      expectProblem(
        'the entry page',
        message.split('\n'),
        'was read against values the pin no longer has',
      );
    } finally {
      if (before === undefined) delete process.env.REFERENCE_NOTES_FIXTURE;
      else process.env.REFERENCE_NOTES_FIXTURE = before;
    }
  });
});

describe('--read and --read-ko', () => {
  test('--read refuses while an input cannot be computed', () => {
    const set = fixture((f) => f(EN, append('At a tenth it is {{oracle exp2(0.1)}}.')));
    expectProblem('--read refuses', readNote(set, ID).errors, 'Pick one with {{oracle@f64');
  });
  test('--read records the pin, and the check passes after it', () => {
    const set = fixture((f) => f(READING, replace('"8 | 8"', '"9 | 9"')));
    expect(checkNotes(set).errors.length).toBeGreaterThan(0);
    const read = readNote(set, ID);
    expect(read.errors).toEqual([]);
    expect(read.warnings.join('\n')).toContain('~ oracle:exp2(3.0): 9 | 9 -> 8 | 8');
    expect(checkNotes(set).errors).toEqual([]);
  });
  test('--read-ko refuses while the English is stale', () => {
    const set = fixture((f) => f(READING, replace('"8 | 8"', '"9 | 9"')));
    expectProblem(
      '--read-ko refuses',
      readKorean(set, ID, ['in-typeshade']).errors,
      'which the reading does not hold at the pin',
    );
  });
  test('--read-ko stamps a section again', () => {
    const set = fixture((f) =>
      f(KO, (t) => t.replace(/in-typeshade [0-9a-f]{12}/, 'in-typeshade 000000000000')),
    );
    expect(checkNotes(set).warnings.length).toBe(1);
    expect(readKorean(set, ID, ['in-typeshade']).errors).toEqual([]);
    expect(checkNotes(set).warnings).toEqual([]);
  });
});

describe('--dist', () => {
  const page = (sections: string) =>
    `<html><body><article><h1>exp2</h1>${sections}<h2 id="targets">Targets</h2></article></body></html>`;
  const section = (id: string, body = '<p>text</p>') =>
    `<section data-reference-note="function/exp2" data-note-section="${id}" lang="en"><h2 id="${id}">H</h2>${body}</section>`;
  const dist = (en: string, ko = en, other = '<html></html>') => {
    const dir = mkdtempSync(path.join(tmpdir(), 'reference-notes-dist-'));
    roots.push(dir);
    for (const [route, html] of [
      ['reference/functions/exp2', en],
      ['ko/reference/functions/exp2', ko],
      ['reference/functions/exp', other],
    ] as const) {
      mkdirSync(path.join(dir, route), { recursive: true });
      writeFileSync(path.join(dir, route, 'index.html'), html);
    }
    return dir;
  };
  const both = section('what-it-computes') + section('in-typeshade');
  test('the built pages pass', () => {
    expect(distProblems(fixture(), dist(page(both)))).toEqual([]);
  });
  test('a section missing from a page fails', () => {
    expectProblem(
      '--dist a missing section',
      distProblems(fixture(), dist(page(both), page(section('what-it-computes')))),
      'carries no section #in-typeshade',
    );
  });
  test('a token left on a page fails', () => {
    const left =
      section('what-it-computes') + section('in-typeshade', '<p>{{oracle exp2(3.0)}}</p>');
    expectProblem(
      '--dist a token left',
      distProblems(fixture(), dist(page(left))),
      "'{{' reached the page",
    );
  });
  test('a note section on a page with no note fails', () => {
    expectProblem(
      '--dist a stray note',
      distProblems(fixture(), dist(page(both), page(both), page(both))),
      'and no note is registered for it',
    );
  });
});

describe('--trailers', () => {
  test('a commit that changes a reading names its note', () => {
    const set = fixture();
    const git = (...args: string[]) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd: set.root,
        encoding: 'utf8',
      });
    git('init', '-q');
    git('add', '.');
    git('commit', '-q', '-m', 'base');
    const base = git('rev-parse', 'HEAD').trim();
    const reading = path.join(set.root, READING);
    writeFileSync(reading, readFileSync(reading, 'utf8').replace('"2026', '"2027'));
    git('commit', '-q', '-am', 'read again without the line');
    const relative: NoteSet = { ...set, root: '.' };
    expectProblem(
      '--trailers',
      trailerProblems(relative, base, 'HEAD', set.root),
      "has no line 'Read-Against: function/exp2'",
    );
    git('commit', '-q', '--amend', '-m', 'read again\n\nRead-Against: function/exp2');
    expect(trailerProblems(relative, base, 'HEAD', set.root)).toEqual([]);
  });
});

process.on('exit', () => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});
