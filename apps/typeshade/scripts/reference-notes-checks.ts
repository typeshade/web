// The checks behind bun run check:notes (scripts/check-reference-notes.ts, which says what each
// one holds and runs them). They import the compiler and the site's dictionaries, so the
// command line loads this module only when a note exists; scripts/reference-notes.test.ts
// plants a fault into the fixture note for each of them.
import { execFileSync } from 'node:child_process';
import { Parser } from 'htmlparser2';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { STILLS } from './artifacts.mjs';
import { copyFor, locales, defaultLocale, type Locale } from '../src/i18n/index.ts';
import { assertRuleReadings, ruleByNumber } from '../src/lib/design-rules.ts';
import { facts } from '../src/lib/examples.ts';
import {
  languageEntries,
  languageEntryPage,
  languageEntryPath,
} from '../src/lib/language-reference.ts';
import { links } from '../src/lib/links.ts';
import { liveShader } from '../src/lib/live-shader-emit.ts';
import {
  GENERATED_IDS,
  TOKEN_NAMES,
  compareNote,
  comparisonMessages,
  formatReading,
  isInputKey,
  loadNote,
  noteTranslation,
  parseNote,
  readReading,
  sectionInputs,
  sectionRules,
  sectionSource,
  staleTranslationMessage,
  stamps,
  tokenInput,
  type LoadedNote,
  type NoteComparison,
  type NoteSection,
  type ParsedNote,
} from '../src/lib/reference-notes.ts';
import { noteFile, noteSet, readingFile, type NoteSet } from '../src/lib/reference-notes/index.ts';
import { compile } from '../vendor/shader-dsl/src/index.ts';
import { translationProblems } from '../src/lib/translation-parity.ts';
import { forbiddenSubstitutes } from './korean-tells.ts';
import { GUIDE_TRANSLATIONS_DIR } from '../src/lib/guide-translations.ts';

export interface Report {
  readonly errors: string[];
  readonly warnings: string[];
}

const resolve = (file: string): string => path.resolve(process.cwd(), file);
const at = (file: string, line: number, what: string): string =>
  `[reference-notes] ${file}:${line}: ${what}`;

// ── the note rules ─────────────────────────────────────────────────────────────────────

const TIME_EN = /\b(currently|now|today|yet|as of|latest|new|recently|soon|no longer)\b/i;
const TIME_KO = /현재|지금|아직|이제|최근|최신|요즘|앞으로|더 이상|(?<![가-힣])곧(?![가-힣])/; // i18n-ok
const SPEED_EN =
  /\b(faster|slower|fast|slow|speed|speeds|performance|performant|drivers?|vendors?|browsers?|NVIDIA|AMD|Intel|Apple|Qualcomm|Adreno|Mali|Chrome|Chromium|Firefox|Safari|SwiftShader|most GPUs)\b/i;
const SPEED_KO = /빠르|빠른|느리|느린|성능|드라이버|속도|벤더|브라우저/; // i18n-ok
const SECTION_NUMBER = /§|\bsection\s+\d|\d+(?:\.\d+)*\s*절/i; // i18n-ok
const BEHAVIOUR_EN =
  /\b(TypeShade|compilers?|compiles?|compiled|oracles?|emits?|emitted|refuses?|refused|rejects?|rejected)\b/i;
const BEHAVIOUR_KO = /컴파일러|컴파일|오라클|거부/; // i18n-ok
const PARTICLE_KO = /\}\}(을|를|은|는|이|가|과|와|으로|로)(?![가-힣])/; // i18n-ok
const NUMERAL = /(?<![A-Za-z\d.`_])\d+(?:\.\d+)*(?![A-Za-z\d_])/;
/** The tokens a section can carry as evidence of a behaviour: those with a recorded value, a
 *  rule, a fact and a sample. A link or the pin shows nothing about a behaviour. */
const EVIDENCE = new Set([
  'oracle',
  'compile',
  'accuracy',
  'entry',
  'assert',
  'rule',
  'fact',
  'code',
]);

/** One line of prose a note shows, with where it is. */
interface ProseLine {
  readonly text: string;
  readonly line: number;
  /** A live marker's anchor or exercise, whose code spans N9 holds to the sample. */
  readonly marker?: { readonly id: string; readonly field: string };
}

/** The prose of one section: its heading, its Markdown outside display formulas, and the words
 *  of its live markers. */
function proseLines(s: NoteSection): ProseLine[] {
  const out: ProseLine[] = [{ text: s.heading, line: s.line }];
  for (const c of s.chunks) {
    if (c.kind === 'markdown') {
      // A formula of its own line opens and closes with $$; a one-line $$…$$ does both.
      let display = false;
      c.text.split('\n').forEach((text, i) => {
        const t = text.trim();
        if (t.startsWith('$$')) {
          if (!(t.length > 4 && t.endsWith('$$'))) display = !display;
          return;
        }
        if (!display) out.push({ text, line: c.line + i });
      });
    } else if (c.kind === 'live') {
      const m = c.marker;
      for (const l of m.lines) {
        const field = /^(\w+)/.exec(l.text)?.[1] ?? '';
        const value = l.text.replace(/^[^:]*:\s*/, '');
        out.push({
          text: value,
          line: l.line,
          marker: field === 'anchor' || field === 'exercise' ? { id: m.id, field } : undefined,
        });
      }
    }
  }
  return out;
}

const TOKEN_ANY = /\{\{(?:(?!\}\}).)*\}\}/g;
const withoutCode = (t: string): string => t.replace(/`[^`]*`/g, ' ');
const withoutMath = (t: string): string => t.replace(/(?<!\\)\$[^$]+(?<!\\)\$/g, ' ');
const bare = (t: string): string => withoutMath(withoutCode(t.replace(TOKEN_ANY, ' ')));
const codeSpans = (t: string): string[] =>
  [...t.replace(TOKEN_ANY, ' ').matchAll(/`([^`]+)`/g)].map((m) => m[1]!);

/** The rule words every language names a rule with, for N3. */
function withoutRules(t: string): string {
  const words = [...new Set(locales.map((l) => copyFor(l).docs.rules.entry.heading('').trim()))];
  const lead = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return t.replace(
    new RegExp(
      `(?:${lead})s? \\d{1,2}\\.\\d{1,2}(?:(?:,| and| or| to) \\d{1,2}\\.\\d{1,2})*`,
      'gu',
    ),
    ' ',
  );
}

/** The prose a translation check reads: no comment, no sample line. */
function parityProse(s: NoteSection): string {
  return proseLines(s)
    .map((p) => p.text)
    .join('\n');
}

/** Every rule of one note file, the English (`english` null) or a translation of it. */
function lintFile(
  set: NoteSet,
  note: LoadedNote,
  parsed: ParsedNote,
  locale: Locale,
  english: ParsedNote | null,
): string[] {
  const out: string[] = [];
  const file = parsed.file;
  const korean = locale !== defaultLocale;
  for (const p of parsed.problems) out.push(at(file, p.line, p.what));
  if (parsed.meta.entry !== note.id)
    out.push(
      at(
        file,
        1,
        `the front matter says entry '${parsed.meta.entry ?? ''}'; the file is the note of ${note.id}`,
      ),
    );
  for (const p of parsed.preamble)
    out.push(
      at(
        file,
        p.line,
        'text before the first section; a note is sections, each headed ## Heading {#id}',
      ),
    );
  // N1
  parsed.text.split('\n').forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l))
      out.push(
        at(
          file,
          i + 1,
          'N1: a fenced code block. A note shows code with {{code <id>}}, a sample of its record, which the build compiles.',
        ),
      );
  });
  const sectionIds = new Set([...parsed.sections.map((s) => s.id), ...GENERATED_IDS]);
  for (const s of parsed.sections) {
    // The tokens a section writes.
    for (const t of s.tokens) {
      if (t.name === 'cite' || t.name === 'quote')
        out.push(
          at(
            file,
            t.line,
            `${t.raw}: citing a specification needs the specification pin (content/specs/specs.json), which this site does not have.`,
          ),
        );
      else if (!(TOKEN_NAMES as readonly string[]).includes(t.name))
        out.push(
          at(file, t.line, `${t.raw} is no token the build can draw (${TOKEN_NAMES.join(', ')}).`),
        );
      else if (t.name !== 'pin' && !t.arg) out.push(at(file, t.line, `${t.raw} names nothing.`));
      else if (t.name === 'code' && !note.record.samples[t.arg])
        out.push(at(file, t.line, `${t.raw}: the record has no sample '${t.arg}'.`));
      else if (t.name === 'compile' && !note.record.compile[t.arg])
        out.push(at(file, t.line, `${t.raw}: the record has no compile case '${t.arg}'.`));
      else if (t.name === 'assert' && !note.record.asserts[t.arg])
        out.push(at(file, t.line, `${t.raw}: the record has no assertion '${t.arg}'.`));
      else if (t.precision && t.name !== 'oracle')
        out.push(at(file, t.line, `${t.raw}: only an oracle token picks a precision.`));
    }
    for (const m of s.lives) {
      const live = note.record.live[m.id];
      if (!live)
        out.push(at(file, m.line, `the live marker '${m.id}' has no live example in the record.`));
      for (const u of m.unknown)
        out.push(
          at(
            file,
            u.line,
            `'${u.text}' is no line a live marker knows (title, caption, anchor, exercise, control <field>).`,
          ),
        );
      if (!m.title || !m.caption)
        out.push(at(file, m.line, `the live marker '${m.id}' needs a title: and a caption: line.`));
      for (const field of Object.keys(live?.controls ?? {}))
        if (!m.controls[field])
          out.push(
            at(
              file,
              m.line,
              `the live marker '${m.id}' gives no label to its control '${field}' (control ${field}: <label>).`,
            ),
          );
      for (const field of Object.keys(m.controls))
        if (live && !live.controls?.[field])
          out.push(
            at(file, m.line, `the record gives the live example '${m.id}' no control '${field}'.`),
          );
    }
    if (!korean) {
      // What the section reads.
      if (s.reads === 'none' && s.tokens.some((t) => tokenInput(t) !== null))
        out.push(
          at(
            file,
            s.readsLine,
            `#${s.id} declares <!-- reads: none --> and draws a value the build computes.`,
          ),
        );
      if (Array.isArray(s.reads))
        for (const key of s.reads)
          if (!isInputKey(key))
            out.push(
              at(
                file,
                s.readsLine,
                `'${key}' in <!-- reads: --> is no input the build can compute.`,
              ),
            );
      if (s.reads === null && s.tokens.length === 0 && s.lives.length === 0)
        out.push(
          at(
            file,
            s.line,
            `#${s.id} has no token and declares nothing it reads. A section of mathematics declares <!-- reads: none -->; one that explains a value names it, <!-- reads: entry.summary -->.`,
          ),
        );
    }
    // N8
    if (!korean) {
      const words = proseLines(s)
        .map((p) => bare(p.text))
        .join('\n');
      const said = BEHAVIOUR_EN.exec(words) ?? BEHAVIOUR_KO.exec(words);
      const evidence = s.tokens.some((t) => EVIDENCE.has(t.name)) || Array.isArray(s.reads);
      if (said && !evidence)
        out.push(
          at(
            file,
            s.line,
            `N8: #${s.id} says '${said[0]}' and carries no evidence. Draw the value with a token, or declare what the section reads (<!-- reads: entry.summary -->).`,
          ),
        );
    }
    for (const p of proseLines(s)) {
      const text = withoutCode(p.text.replace(TOKEN_ANY, ' '));
      if (/\{\{|\}\}/.test(text))
        out.push(
          at(
            file,
            p.line,
            'a {{ or }} that opens or closes no token: write {{<token> <argument>}} on one line.',
          ),
        );
      // N2
      if (/https?:\/\/|www\.|<a\s|href=/i.test(text))
        out.push(
          at(
            file,
            p.line,
            'N2: an address. A link names a key of src/lib/links.ts, [text](key), a section, [text](#id), or an entry, {{ref <kind>/<name>}}.',
          ),
        );
      for (const m of p.text.replace(TOKEN_ANY, ' ').matchAll(/\]\(([^)]*)\)/g)) {
        const target = m[1]!;
        const ok = target.startsWith('#')
          ? sectionIds.has(target.slice(1))
          : /^[A-Za-z][A-Za-z0-9]*$/.test(target) && target in links;
        if (!ok)
          out.push(
            at(
              file,
              p.line,
              `N2: the link target '${target}' is no key of src/lib/links.ts and no section of this page.`,
            ),
          );
      }
      if (/\]\[[^\]]*\]|^\s*\[[^\]]+\]:\s/.test(text))
        out.push(at(file, p.line, 'N2: a reference-style link. Write [text](key).'));
      const words = withoutMath(text);
      // N3
      const number = NUMERAL.exec(
        withoutRules(words)
          .replace(/\{#[a-z0-9-]+\}/g, ' ')
          .replace(/\]\([^)]*\)/g, ']'),
      );
      if (number)
        out.push(
          at(
            file,
            p.line,
            `N3: '${number[0]}' is a number outside code, a token or a formula. Draw it with a token, set it as code, or write it as a formula.`,
          ),
        );
      // N5
      const when = TIME_EN.exec(words) ?? TIME_KO.exec(words);
      if (when)
        out.push(
          at(
            file,
            p.line,
            `N5: '${when[0]}' says when, and the page has no date. State the condition, or name the version with {{pin}}.`,
          ),
        );
      // N6
      const speed = SPEED_EN.exec(words) ?? SPEED_KO.exec(words);
      if (speed)
        out.push(
          at(
            file,
            p.line,
            `N6: '${speed[0]}' is a speed, vendor, browser or driver word. A note makes no speed, vendor or browser claim. Rephrase it; for mathematics, write 'more steeply'.`,
          ),
        );
      // N7
      const numbered = SECTION_NUMBER.exec(words);
      if (numbered)
        out.push(
          at(
            file,
            p.line,
            `N7: '${numbered[0]}' names a section by its number. Numbers move between editions; name what the section defines.`,
          ),
        );
      // N9
      if (p.marker) {
        const live = note.record.live[p.marker.id];
        const sample = [live?.code ?? '', ...Object.values(live?.files ?? {})].join('\n');
        for (const span of codeSpans(p.text))
          if (!sample.includes(span) && !(span in note.record.literals))
            out.push(
              at(
                file,
                p.line,
                `N9: the ${p.marker.field} names \`${span}\`, which the sample of '${p.marker.id}' does not hold. Quote the sample, or add the span to literals in the record with a reason.`,
              ),
            );
      }
      // N10
      if (korean) {
        const particle = PARTICLE_KO.exec(p.text);
        if (particle)
          out.push(
            at(
              file,
              p.line,
              `N10: '${particle[0]}': the particle after a token changes with the sound before it, which the token's value decides. Rephrase, "…값은 {{oracle …}}입니다".`,
            ),
          ); // i18n-ok
      }
    }
  }
  // N11
  if (english) {
    const englishIds = english.sections.map((s) => s.id);
    const order = parsed.sections.map((s) => s.id).filter((id) => englishIds.includes(id));
    const expected = englishIds.filter((id) => order.includes(id));
    if (order.join(' ') !== expected.join(' '))
      out.push(
        at(
          file,
          1,
          `N11: the sections run ${order.join(', ')}; the English runs ${expected.join(', ')}.`,
        ),
      );
    for (const s of parsed.sections)
      if (!englishIds.includes(s.id))
        out.push(at(file, s.line, `N11: the English has no section '${s.id}'.`));
  }
  return out;
}

/** N11 for one translated section that is current with its English. */
function paritySection(
  file: string,
  en: NoteSection,
  tr: NoteSection,
  korean: boolean,
  forbidden: readonly string[],
): string[] {
  const out: string[] = [];
  const tokens = (s: NoteSection) =>
    s.tokens
      .map((t) => t.raw.replace(/\s+/g, ' '))
      .sort()
      .join(' | ');
  if (tokens(en) !== tokens(tr))
    out.push(
      at(file, tr.line, `N11: #${tr.id} draws [${tokens(tr)}]; the English draws [${tokens(en)}].`),
    );
  const lives = (s: NoteSection) => s.lives.map((m) => m.id).join(' ');
  if (lives(en) !== lives(tr))
    out.push(
      at(
        file,
        tr.line,
        `N11: #${tr.id} carries the live examples [${lives(tr)}]; the English carries [${lives(en)}].`,
      ),
    );
  for (const what of translationProblems(parityProse(en), parityProse(tr), korean, forbidden))
    out.push(at(file, tr.line, `N11: #${tr.id}: ${what}`));
  return out;
}

const FORBIDDEN = (): string[] =>
  forbiddenSubstitutes(path.resolve(process.cwd(), GUIDE_TRANSLATIONS_DIR, 'GLOSSARY.md'));

/** The note rules over one note, its English and every translation present. */
export function lintNote(set: NoteSet, note: LoadedNote): string[] {
  const out = lintFile(set, note, note.english, defaultLocale, null);
  const forbidden = FORBIDDEN();
  for (const locale of locales) {
    if (locale === defaultLocale) continue;
    const translation = noteTranslation(set, note, locale);
    if (!translation.parsed) continue;
    out.push(...lintFile(set, note, translation.parsed, locale, note.english));
    const ko = new Map(translation.parsed.sections.map((s) => [s.id, s]));
    for (const en of note.english.sections) {
      const state = translation.states.get(en.id);
      if (state?.state === 'current')
        out.push(
          ...paritySection(translation.file, en, ko.get(en.id)!, locale === 'ko', forbidden),
        );
    }
  }
  return out;
}

// ── the full check ─────────────────────────────────────────────────────────────────────

/** The note files under one language's directory, as note ids. */
function filesOf(set: NoteSet, locale: string): string[] {
  const dir = resolve(path.join(set.root, locale));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .map((n) => n.replace(/\.md$/, '').replace('-', '/'));
}

/** Registered notes and the files on disk, held to each other (check 1). */
function registryProblems(set: NoteSet): string[] {
  const out: string[] = [];
  const ids = Object.keys(set.notes);
  for (const id of ids) {
    const [kind, name] = id.split('/') as [never, string];
    if (!existsSync(resolve(noteFile(set, 'en', id))))
      out.push(
        `[reference-notes] ${id} is registered and has no English note at ${noteFile(set, 'en', id)}.`,
      );
    else if (!name || !languageEntryPage(kind, name))
      out.push(
        `[reference-notes] ${noteFile(set, 'en', id)}: the reference at the pin has no entry ${id}.`,
      );
  }
  for (const locale of locales)
    for (const id of filesOf(set, locale))
      if (!set.notes[id])
        out.push(
          `[reference-notes] ${noteFile(set, locale, id)} is not registered in src/lib/reference-notes/index.ts.`,
        );
  const readings = resolve(path.join(set.root, 'readings'));
  if (existsSync(readings))
    for (const n of readdirSync(readings).filter((n) => n.endsWith('.json'))) {
      const id = n.replace(/\.json$/, '').replace('-', '/');
      if (!set.notes[id])
        out.push(
          `[reference-notes] ${path.join(set.root, 'readings', n)} is the reading of no registered note.`,
        );
    }
  return out;
}

/** Check 3: the samples, the live examples and their stills. */
function sampleProblems(set: NoteSet, note: LoadedNote): string[] {
  const out: string[] = [];
  const file = note.english.file;
  const used = new Set(
    note.english.sections.flatMap((s) =>
      s.tokens.filter((t) => t.name === 'code').map((t) => t.arg),
    ),
  );
  for (const id of used) {
    const sample = note.record.samples[id];
    if (!sample) continue;
    let errors: string[];
    try {
      errors = compile(sample.code)
        .diagnostics.filter((d) => d.category === 'error')
        .map((d) => `${d.code} ${d.message} (line ${d.line})`);
    } catch (e) {
      errors = [e instanceof Error ? e.message : String(e)];
    }
    if (errors.length)
      out.push(
        `[reference-notes] ${file}: the sample '${id}' does not compile: ${errors.join('; ')}`,
      );
  }
  const page = languageEntryPath(note.kind, note.name);
  const stills = [...(STILLS as { id: string; live?: boolean; page: string }[]), ...set.stills];
  for (const m of note.english.sections.flatMap((s) => s.lives)) {
    const live = note.record.live[m.id];
    if (!live) continue;
    const controls = Object.fromEntries(
      Object.entries(live.controls ?? {}).map(([f, range]) => [
        f,
        { ...range, label: m.controls[f] ?? f },
      ]),
    );
    try {
      liveShader(m.id, m.title ?? m.id, live.code, controls as never, {
        fileName: live.file,
        files: live.files,
      });
    } catch (e) {
      out.push(
        `[reference-notes] ${file}:${m.line}: the live example '${m.id}' does not build: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (!stills.some((s) => s.id === m.id && s.live && s.page === page))
      out.push(
        `[reference-notes] ${file}:${m.line}: the live example '${m.id}' has no still. Add { id: '${m.id}', live: true, page: '${page}' } to STILLS in scripts/artifacts.mjs, then run bun run capture:stills.`,
      );
  }
  return out;
}

/** Check 4, N4: the English's code spans. */
function spanProblems(note: LoadedNote): string[] {
  const out: string[] = [];
  const file = note.english.file;
  const titles = new Set(languageEntries().map((e) => e.title));
  const where = new Map<string, number>();
  for (const s of note.english.sections)
    for (const p of proseLines(s)) {
      if (p.marker) continue;
      for (const span of codeSpans(p.text)) if (!where.has(span)) where.set(span, p.line);
    }
  const candidates = [...where.keys()].filter(
    (s) => !titles.has(s) && !(s in note.record.literals),
  );
  if (!candidates.length) return out;
  const module = (list: string[]): string =>
    `"use typeshade"\n\nexport function noteSpans(${note.record.scope}): f32 {\n${list.map((s, i) => `  const s${i} = ${s}`).join('\n')}\n  return 0.0\n}\n`;
  const failing = (list: string[]): Set<number> => {
    const bad = new Set<number>();
    try {
      for (const d of compile(module(list)).diagnostics)
        if (d.category === 'error') {
          const i = d.line - 4;
          bad.add(i >= 0 && i < list.length ? i : -1);
        }
    } catch {
      bad.add(-1);
    }
    return bad;
  };
  // One module first; where it fails, each span alone, since the compiler may stop at the first
  // error and leave a later span unread.
  let bad = failing(candidates);
  if (bad.size) bad = new Set(candidates.flatMap((s, i) => (failing([s]).size ? [i] : [])));
  for (const i of [...bad].sort((a, b) => a - b)) {
    const span = candidates[i]!;
    out.push(
      at(
        file,
        where.get(span)!,
        `N4: code span \`${span}\` names no language entry, does not compile in scope '${note.record.scope}', and is no literal of the record. Draw it with a token, or add it to literals in src/lib/reference-notes/ with a reason.`,
      ),
    );
  }
  return out;
}

/** Check 7: the rules the notes name, through READ_AGAINST. */
function ruleProblems(): string[] {
  try {
    assertRuleReadings(copyFor('en'));
    return [];
  } catch (e) {
    return [e instanceof Error ? e.message : String(e)];
  }
}

/** Check 8: the translations, as warnings. */
function translationWarnings(set: NoteSet, note: LoadedNote): string[] {
  const out: string[] = [];
  for (const locale of locales) {
    if (locale === defaultLocale) continue;
    const t = noteTranslation(set, note, locale);
    for (const [id, state] of t.states)
      if (state.state !== 'current')
        out.push(staleTranslationMessage(note, locale, t.file, id, state));
  }
  return out;
}

/** Every check over a set of notes. `lint` keeps to the note rules. */
export function checkNotes(
  set: NoteSet,
  options: { lint?: boolean } = {},
): Report & { notes: number; inputs: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let inputs = 0;
  if (!options.lint) errors.push(...registryProblems(set));
  for (const id of Object.keys(set.notes)) {
    const note = loadNote(set, id);
    if (typeof note === 'string') {
      if (options.lint) errors.push(`[reference-notes] ${note}`);
      continue;
    }
    errors.push(...lintNote(set, note));
    // A note whose entry the pin does not have is named above, and has nothing to read.
    if (options.lint || !languageEntryPage(note.kind, note.name)) continue;
    errors.push(...sampleProblems(set, note));
    errors.push(...spanProblems(note));
    const c = compareNote(set, note);
    inputs += c.values.size;
    errors.push(...comparisonMessages(set, c));
    warnings.push(...translationWarnings(set, note));
  }
  if (!options.lint) errors.push(...ruleProblems());
  return { errors, warnings, notes: Object.keys(set.notes).length, inputs };
}

// ── --read and --read-ko ───────────────────────────────────────────────────────────────

const today = (): string => new Date().toISOString().slice(0, 10);

/** Records the pin's value of every input a note reads. Refuses while one cannot be computed. */
export function readNote(set: NoteSet, id: string): Report {
  const note = loadNote(set, id);
  if (typeof note === 'string') return { errors: [`[reference-notes] ${note}`], warnings: [] };
  const c = compareNote(set, note);
  if (c.errors.length)
    return { errors: c.errors.map((e) => `[reference-notes] ${id}: ${e}`), warnings: [] };
  const inputs: Record<string, string> = {};
  for (const [key, r] of c.values) if (r.ok) inputs[key] = r.probe.value;
  const before = readReading(set, id);
  const reading = { note: id, read: { pin: facts.pinnedCommit, reviewed: today() }, inputs };
  writeFileSync(resolve(readingFile(set, id)), formatReading(reading));
  const lines: string[] = [];
  for (const [key, value] of Object.entries(inputs)) {
    const old = before?.inputs[key];
    if (old === undefined) lines.push(`  + ${key}: ${value}`);
    else if (old !== value) lines.push(`  ~ ${key}: ${old} -> ${value}`);
  }
  for (const key of Object.keys(before?.inputs ?? {}))
    if (!(key in inputs)) lines.push(`  - ${key}`);
  const after = translationWarnings(set, note);
  return {
    errors: [],
    warnings: [
      `[reference-notes] wrote ${readingFile(set, id)} at pin ${facts.pinnedCommit}${lines.length ? `:\n${lines.join('\n')}` : ', with no value changed.'}`,
      ...after,
    ],
  };
}

/** Rewrites one front matter line, or adds it before the closing ---. */
function setFrontMatter(text: string, key: string, value: string): string {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!front) throw new Error('[reference-notes] the translation has no front matter');
  const lines = front[1]!.split('\n');
  const at = lines.findIndex((l) => l.startsWith(`${key}:`));
  const line = value ? `${key}: ${value}` : `${key}:`;
  if (at >= 0) lines[at] = line;
  else lines.push(line);
  return `---\n${lines.join('\n')}\n---\n${text.slice(front[0].length)}`;
}

/** Stamps translated sections as read against the English and the values it reads, and
 *  against the rules each one names. */
export function readKorean(
  set: NoteSet,
  id: string,
  sectionIds: readonly string[],
  locale = 'ko',
): Report {
  const note = loadNote(set, id);
  if (typeof note === 'string') return { errors: [`[reference-notes] ${note}`], warnings: [] };
  if (!sectionIds.length)
    return {
      errors: [
        '[reference-notes] --read-ko names the note and each section it read: --read-ko function/pow negative-base',
      ],
      warnings: [],
    };
  const c = compareNote(set, note);
  const english = new Map(note.english.sections.map((s) => [s.id, s]));
  const file = noteFile(set, locale, id);
  if (!existsSync(resolve(file)))
    return { errors: [`[reference-notes] ${file} does not exist`], warnings: [] };
  let text = readFileSync(resolve(file), 'utf8');
  const parsed = parseNote(file, text);
  const translated = new Set(parsed.sections.map((s) => s.id));
  const sources = stamps(parsed.meta.sources);
  const rules = stamps(parsed.meta.rules);
  const errors: string[] = [];
  for (const sid of sectionIds) {
    const s = english.get(sid);
    if (!s || !translated.has(sid)) {
      errors.push(`[reference-notes] ${!s ? note.english.file : file} has no section '${sid}'`);
      continue;
    }
    const owed = sectionInputs(s).filter(
      (k) => c.stale.some((x) => x.key === k) || c.unrecorded.includes(k),
    );
    if (owed.length) {
      errors.push(
        `[reference-notes] #${sid} reads ${owed.join(', ')}, which the reading does not hold at the pin. Read the English again first: bun run check:notes --read ${id}`,
      );
      continue;
    }
    sources.set(sid, sectionSource(s, c.reading));
    for (const n of sectionRules(s)) {
      const rule = ruleByNumber(n);
      if (rule) rules.set(n, rule.reviewed);
    }
  }
  if (errors.length) return { errors, warnings: [] };
  const order = note.english.sections.map((s) => s.id);
  const sourceLine = [...sources]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  const ruleLine = [...rules]
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  text = setFrontMatter(setFrontMatter(text, 'sources', sourceLine), 'rules', ruleLine);
  writeFileSync(resolve(file), text);
  return { errors: [], warnings: [`[reference-notes] stamped ${file}: ${sectionIds.join(', ')}`] };
}

// ── --stale ────────────────────────────────────────────────────────────────────────────

/** The notes the pin leaves stale, and the translated sections it leaves in English. */
export function staleNotes(set: NoteSet, markdown: boolean): { text: string; stale: boolean } {
  const english: string[] = [];
  const translated: string[] = [];
  for (const id of Object.keys(set.notes)) {
    const note = loadNote(set, id);
    if (typeof note === 'string') {
      english.push(markdown ? `- \`${id}\`: ${note}` : `${id}: ${note}`);
      continue;
    }
    const c: NoteComparison = compareNote(set, note);
    if (c.stale.length || c.errors.length || c.unrecorded.length) {
      const sections = [...new Set(c.stale.flatMap((s) => s.sections))].map((s) => `#${s.id}`);
      const head = markdown
        ? `- \`${id}\` (\`${note.english.file}\`): read again ${sections.join(', ') || 'the sections that read the values below'}`
        : `${id} (${note.english.file}): read again ${sections.join(', ')}`;
      english.push(head);
      for (const s of c.stale)
        english.push(
          markdown
            ? `  - \`${s.key}\`: read \`${s.read}\`, pin \`${s.pin}\``
            : `  ${s.key}: read ${s.read}, pin ${s.pin}`,
        );
      for (const k of c.unrecorded)
        english.push(markdown ? `  - \`${k}\`: not recorded` : `  ${k}: not recorded`);
      for (const e of c.errors)
        english.push(markdown ? `  - ${e.split('\n')[0]}` : `  ${e.split('\n')[0]}`);
    }
    for (const locale of locales) {
      if (locale === defaultLocale) continue;
      const t = noteTranslation(set, note, locale);
      for (const [sid, state] of t.states)
        if (state.state !== 'current')
          translated.push(
            markdown
              ? `- \`${id}\` #${sid} in \`${t.file}\`: ${state.state === 'stale' ? state.why : 'not translated'}`
              : `${t.file} #${sid}: ${state.state === 'stale' ? state.why : 'not translated'}`,
          );
    }
  }
  if (!markdown)
    return {
      text:
        [...english, ...translated.map((t) => `shown in English: ${t}`)].join('\n') ||
        'No reference note is stale at the pin.',
      stale: english.length > 0,
    };
  const text = [
    english.length ? english.join('\n') : 'None.',
    '',
    'Translated sections shown in English until they are translated or read again:',
    '',
    translated.length ? translated.join('\n') : 'None.',
  ].join('\n');
  return { text, stale: english.length > 0 };
}

// ── --dist ─────────────────────────────────────────────────────────────────────────────

/** The text a reader reads in a piece of built HTML, and its comments. A code frame, a live
 *  example and a script are left out: their code and their data may hold braces of their own. */
function proseOf(html: string): { text: string; comments: string[] } {
  const skip = new Set(['pre', 'code', 'script', 'style', 'template', 'textarea']);
  const stack: boolean[] = [];
  let text = '';
  const comments: string[] = [];
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        stack.push(skip.has(name) || 'data-live-shader' in attributes || (stack.at(-1) ?? false));
      },
      onclosetag() {
        stack.pop();
      },
      ontext(data) {
        if (!stack.at(-1)) text += data;
      },
      oncomment(data) {
        comments.push(data);
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  return { text, comments };
}

/** Every note section on its built page in every language, and nothing of the prose syntax
 *  left in it; and no note section on a page that has no note. */
export function distProblems(set: NoteSet, dist: string): string[] {
  const out: string[] = [];
  const pages = new Set<string>();
  for (const id of Object.keys(set.notes)) {
    const note = loadNote(set, id);
    if (typeof note === 'string') {
      out.push(`[reference-notes] ${note}`);
      continue;
    }
    for (const locale of locales) {
      const route = `${locale === defaultLocale ? '' : `${locale}/`}${languageEntryPath(note.kind, note.name).slice(1)}`;
      const file = path.join(dist, route, 'index.html');
      pages.add(path.resolve(file));
      if (!existsSync(file)) {
        out.push(`[reference-notes] ${file} does not exist; the page of ${id} was not built.`);
        continue;
      }
      const html = readFileSync(file, 'utf8');
      for (const s of note.english.sections) {
        const m = new RegExp(
          `<section[^>]*data-note-section="${s.id}"[^>]*>([\\s\\S]*?)</section>`,
        ).exec(html);
        if (!m || !html.includes(`id="${s.id}"`)) {
          out.push(`[reference-notes] ${file} carries no section #${s.id} of ${id}.`);
          continue;
        }
        const { text, comments } = proseOf(m[1]!);
        const left = /\{\{|\}\}/.exec(text) ?? /^\s*(?:reads|live):/.exec(comments.join('\n'));
        if (left)
          out.push(
            `[reference-notes] ${file}, section #${s.id}: '${left[0]}' reached the page; a token or a marker was not drawn.`,
          );
      }
    }
  }
  const walk = (dir: string): string[] =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory()
            ? walk(path.join(dir, e.name))
            : e.name === 'index.html'
              ? [path.join(dir, e.name)]
              : [],
        )
      : [];
  for (const prefix of ['', ...locales.filter((l) => l !== defaultLocale).map((l) => `${l}/`)])
    for (const file of walk(path.join(dist, prefix, 'reference')))
      if (
        !pages.has(path.resolve(file)) &&
        readFileSync(file, 'utf8').includes('data-reference-note=')
      )
        out.push(
          `[reference-notes] ${file} carries a note section, and no note is registered for it.`,
        );
  return out;
}

// ── --trailers ─────────────────────────────────────────────────────────────────────────

/** Each commit after `base` that changes a reading names the note, `Read-Against: <note>`. */
export function trailerProblems(
  set: NoteSet,
  base: string,
  head = 'HEAD',
  cwd = process.cwd(),
): string[] {
  const out: string[] = [];
  const dir = path.join(set.root, 'readings');
  const git = (...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' });
  for (const sha of git('rev-list', '--reverse', `${base}..${head}`).split('\n').filter(Boolean)) {
    const changed = git(
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      '--root',
      sha,
      '--',
      dir,
    )
      .split('\n')
      .filter((f) => f.endsWith('.json'));
    if (!changed.length) continue;
    const body = git('log', '-1', '--format=%B', sha);
    const named = new Set([...body.matchAll(/^Read-Against:\s*(\S+)/gm)].map((m) => m[1]!));
    for (const f of changed) {
      const id = path.basename(f, '.json').replace('-', '/');
      if (!named.has(id))
        out.push(
          `[reference-notes] commit ${sha.slice(0, 12)} changes ${f} and has no line 'Read-Against: ${id}'. The line says a person read the sections against the values recorded; add it with git commit --amend after reading.`,
        );
    }
  }
  return out;
}
