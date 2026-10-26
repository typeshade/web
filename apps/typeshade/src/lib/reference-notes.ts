// The reference notes (DESIGN.md, Reference notes): the parser for a note's prose, the tokens
// that draw a computed value into it, the probes that compute each value at the pinned
// compiler, the comparison with the reading a person recorded, the stamps a translated section
// carries, and the page's view of a note. scripts/check-reference-notes.ts runs every check
// over these; the entry page calls assertNoteReading(), since a build can skip that script
// (capture:stills runs Astro alone).
//
// A note's prose is Markdown cut into sections, each headed `## Heading {#id}`. Inside a
// section:
//   {{oracle pow(-2.0, 3.0)}}   the CPU oracle's answer, at f64 and f32 (`oracle@f32` picks one)
//   {{compile <case>}}          a compile case's diagnostic, or the WGSL line it emits
//   {{accuracy <op>}}           accuracyOf(op): its kind and its bound
//   {{entry <field>}}           a field of the entry's LanguageEntry, `spelling.glsl`
//   {{assert <id>}}             nothing on the page; the record's assertion holds at the pin
//   {{fact <key>}}              a value of `facts` (src/lib/examples.ts)
//   {{rule 9.4}}                a link to the rule's page
//   {{ref function/exp2}}       a link to another entry's page
//   {{pin}}                     the pinned commit, linked
//   {{code <id>}}               on a line of its own: a sample of the record, in a code frame
//   <!-- reads: none -->        the section is mathematics and reads nothing; or the inputs it
//                               explains without drawing them, `<!-- reads: entry.summary -->`
//   <!-- live: <id> ... -->     a live example, its code in the record and its words here
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Loader } from 'astro/loaders';
import { accuracyOf, compile, compileModule } from '../../vendor/shader-dsl/src/index.ts';
import { createTypeshadeLanguageService } from '../../vendor/shader-dsl/src/language-service/index.ts';
import { copyFor, defaultLocale, localePath, locales, type Locale } from '../i18n/index.ts';
import { mentioned, ruleByNumber, rulePath } from './design-rules.ts';
import { facts } from './examples.ts';
import {
  LANGUAGE_KINDS,
  languageEntry,
  languageEntryPage,
  languageEntryPath,
  type LanguageKind,
} from './language-reference.ts';
import { links } from './links.ts';
import type { ControlProps } from './live-shader-contract.ts';
import {
  noteFile,
  noteFileName,
  noteSet,
  readingFile,
  type NoteRecord,
  type NoteSet,
} from './reference-notes/index.ts';

/** The ids the entry page gives its own sections; a note's section takes none of them. */
export const GENERATED_IDS = [
  'syntax',
  'parameters',
  'return-value',
  'description',
  'targets',
  'examples',
  'see-also',
];

/** The tokens a note may write. `cite` and `quote` wait on the specification pin. */
export const TOKEN_NAMES = [
  'oracle',
  'compile',
  'accuracy',
  'entry',
  'assert',
  'fact',
  'rule',
  'ref',
  'pin',
  'code',
] as const;
export type TokenName = (typeof TOKEN_NAMES)[number];

/** The tokens whose value a reading records. */
const READ_TOKENS: ReadonlySet<string> = new Set([
  'oracle',
  'compile',
  'accuracy',
  'entry',
  'assert',
]);

/** A value longer than this is recorded as its hash and its first characters. */
const VALUE_MAX = 160;

export interface NoteToken {
  readonly raw: string;
  readonly name: string;
  readonly precision?: 'f32' | 'f64';
  readonly arg: string;
  /** 1-based line in the file. */
  readonly line: number;
}

export interface NoteLiveMarker {
  readonly id: string;
  readonly line: number;
  readonly title?: string;
  readonly caption?: string;
  readonly anchor?: string;
  readonly exercises: readonly string[];
  /** Field name to label. */
  readonly controls: Readonly<Record<string, string>>;
  /** Every line of the marker after its first, as written. */
  readonly lines: readonly { readonly text: string; readonly line: number }[];
  /** A line whose key the marker does not know. */
  readonly unknown: readonly { readonly text: string; readonly line: number }[];
}

export type NoteChunk =
  | { readonly kind: 'markdown'; readonly text: string; readonly line: number }
  | { readonly kind: 'code'; readonly id: string; readonly line: number }
  | { readonly kind: 'live'; readonly marker: NoteLiveMarker };

export interface NoteSection {
  readonly id: string;
  /** The heading's text, without its `{#id}`. */
  readonly heading: string;
  /** 1-based line of the heading. */
  readonly line: number;
  /** The section as written, from its heading to its last non-blank line. */
  readonly raw: string;
  /** What `<!-- reads: -->` declares: 'none', the inputs it names, or nothing. */
  readonly reads: 'none' | readonly string[] | null;
  readonly readsLine: number;
  readonly chunks: readonly NoteChunk[];
  /** Every token in the section's Markdown and its `{{code}}` lines, in order. */
  readonly tokens: readonly NoteToken[];
  readonly lives: readonly NoteLiveMarker[];
}

export interface ParsedNote {
  /** The file, as the run names it. */
  readonly file: string;
  readonly text: string;
  readonly meta: Readonly<Record<string, string>>;
  /** Lines between the front matter and the first heading that hold text. */
  readonly preamble: readonly { readonly text: string; readonly line: number }[];
  readonly sections: readonly NoteSection[];
  /** What the parser could not read. */
  readonly problems: readonly { readonly line: number; readonly what: string }[];
}

const FRONT = /^---\n([\s\S]*?)\n---\n/;
const HEADING = /^## (.+?)\s*\{#([a-z][a-z0-9-]*)\}\s*$/;
const TOKEN = /\{\{\s*([a-z]+)(?:@(f32|f64))?(?:\s+((?:(?!\}\}).)*?))?\s*\}\}/g;
const CODE_LINE = /^\{\{\s*code\s+([\w-]+)\s*\}\}\s*$/;
const READS = /^<!--\s*reads:\s*(.*?)\s*-->\s*$/;
const LIVE_OPEN = /^<!--\s*live:\s*([a-z0-9-]+)\s*$/;
const MARKER_LINE = /^(title|caption|anchor|exercise|control\s+([A-Za-z_]\w*)):\s*(.+)$/;

/** The inputs a `reads:` list names: commas split them, except inside a call's parentheses. */
function splitReads(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let at = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      out.push(list.slice(at, i).trim());
      at = i + 1;
    }
  }
  out.push(list.slice(at).trim());
  return out.filter(Boolean);
}

/** The tokens of one line. */
function tokensOf(text: string, line: number): NoteToken[] {
  return [...text.matchAll(TOKEN)].map((m) => ({
    raw: m[0],
    name: m[1]!,
    precision: m[2] as 'f32' | 'f64' | undefined,
    arg: (m[3] ?? '').replace(/\s+/g, ' ').trim(),
    line,
  }));
}

/** One note file, read into its sections. */
export function parseNote(file: string, text: string): ParsedNote {
  const problems: { line: number; what: string }[] = [];
  const meta: Record<string, string> = {};
  const front = FRONT.exec(text);
  let offset = 0;
  if (front) {
    for (const l of front[1]!.split('\n')) {
      const i = l.indexOf(':');
      if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    }
    offset = front[0].split('\n').length - 1;
  } else problems.push({ line: 1, what: 'no front matter (---, entry: <kind>/<name>, ---)' });
  const lines = text.slice(front ? front[0].length : 0).split('\n');
  const preamble: { text: string; line: number }[] = [];
  const sections: NoteSection[] = [];

  type Draft = {
    id: string;
    heading: string;
    line: number;
    rawLines: string[];
    reads: 'none' | string[] | null;
    readsLine: number;
    chunks: NoteChunk[];
    tokens: NoteToken[];
    lives: NoteLiveMarker[];
    md: { lines: string[]; line: number } | null;
  };
  let current: Draft | null = null;
  const flush = (d: Draft): void => {
    if (d.md && d.md.lines.join('\n').trim())
      d.chunks.push({ kind: 'markdown', text: d.md.lines.join('\n').trim(), line: d.md.line });
    d.md = null;
  };
  const close = (): void => {
    if (!current) return;
    flush(current);
    while (current.rawLines.length && !current.rawLines[current.rawLines.length - 1]!.trim())
      current.rawLines.pop();
    sections.push({
      id: current.id,
      heading: current.heading,
      line: current.line,
      raw: current.rawLines.join('\n'),
      reads: current.reads,
      readsLine: current.readsLine,
      chunks: current.chunks,
      tokens: current.tokens,
      lives: current.lives,
    });
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]!;
    const line = offset + i + 1;
    if (/^## /.test(text)) {
      close();
      const h = HEADING.exec(text);
      if (!h) {
        problems.push({ line, what: `the heading '${text}' has no {#id}` });
        continue;
      }
      current = {
        id: h[2]!,
        heading: h[1]!.trim(),
        line,
        rawLines: [text],
        reads: null,
        readsLine: 0,
        chunks: [],
        tokens: tokensOf(h[1]!, line),
        lives: [],
        md: null,
      };
      continue;
    }
    if (!current) {
      if (text.trim()) preamble.push({ text, line });
      continue;
    }
    const d: Draft = current;
    d.rawLines.push(text);
    const reads = READS.exec(text);
    if (reads) {
      flush(d);
      if (d.reads !== null)
        problems.push({ line, what: 'a second <!-- reads: --> in one section' });
      d.reads = reads[1]!.trim() === 'none' ? 'none' : splitReads(reads[1]!);
      d.readsLine = line;
      continue;
    }
    const live = LIVE_OPEN.exec(text);
    if (live) {
      flush(d);
      const markerLines: { text: string; line: number }[] = [];
      let closed = false;
      while (++i < lines.length) {
        const l = lines[i]!;
        d.rawLines.push(l);
        if (/^\s*-->\s*$/.test(l)) {
          closed = true;
          break;
        }
        if (l.trim()) markerLines.push({ text: l.trim(), line: offset + i + 1 });
      }
      if (!closed)
        problems.push({ line, what: `the live marker '${live[1]}' is not closed with -->` });
      const fields: {
        title?: string;
        caption?: string;
        anchor?: string;
        exercises: string[];
        controls: Record<string, string>;
      } = { exercises: [], controls: {} };
      const unknown: { text: string; line: number }[] = [];
      for (const ml of markerLines) {
        const m = MARKER_LINE.exec(ml.text);
        if (!m) {
          unknown.push(ml);
          continue;
        }
        const value = m[3]!.trim();
        if (m[2]) fields.controls[m[2]] = value;
        else if (m[1] === 'exercise') fields.exercises.push(value);
        else if (m[1] === 'title') fields.title = value;
        else if (m[1] === 'caption') fields.caption = value;
        else if (m[1] === 'anchor') fields.anchor = value;
      }
      const marker: NoteLiveMarker = { id: live[1]!, line, lines: markerLines, unknown, ...fields };
      d.lives.push(marker);
      d.chunks.push({ kind: 'live', marker });
      continue;
    }
    const code = CODE_LINE.exec(text.trim());
    if (code) {
      flush(d);
      d.chunks.push({ kind: 'code', id: code[1]!, line });
      d.tokens.push({ raw: text.trim(), name: 'code', arg: code[1]!, line });
      continue;
    }
    if (!d.md) d.md = { lines: [], line };
    d.md.lines.push(text);
    for (const t of tokensOf(text, line)) {
      if (t.name === 'code') problems.push({ line, what: `${t.raw} is not on a line of its own` });
      d.tokens.push(t);
    }
  }
  close();
  const seen = new Set<string>();
  for (const s of sections) {
    if (seen.has(s.id))
      problems.push({ line: s.line, what: `a second section with the id '${s.id}'` });
    seen.add(s.id);
    if (GENERATED_IDS.includes(s.id))
      problems.push({ line: s.line, what: `'${s.id}' is the id of a section the page generates` });
  }
  return { file, text, meta, preamble, sections, problems };
}

// ── inputs ─────────────────────────────────────────────────────────────────────────────

/** The key a token's value is recorded under, or null for a token whose value is guarded
 *  elsewhere (a fact, a rule, a link, the pin, a sample). */
export function tokenInput(t: NoteToken): string | null {
  if (!READ_TOKENS.has(t.name)) return null;
  if (t.name === 'entry') return `entry.${t.arg}`;
  if (t.name === 'oracle') return `oracle${t.precision ? `@${t.precision}` : ''}:${t.arg}`;
  return `${t.name}:${t.arg}`;
}

const INPUT_KEY =
  /^(?:entry\.[A-Za-z][\w.]*|accuracy:\S+|oracle(?:@f32|@f64)?:\S.*|compile:[\w-]+|assert:[\w-]+)$/;

/** Whether a `reads:` entry names an input the build can compute. */
export const isInputKey = (key: string): boolean => INPUT_KEY.test(key);

/** Every input one section reads: its tokens' and its `reads:` list's. */
export function sectionInputs(s: NoteSection): string[] {
  const keys = s.tokens.map(tokenInput).filter((k): k is string => k !== null);
  if (Array.isArray(s.reads)) keys.push(...s.reads);
  return [...new Set(keys)];
}

/** Every input the note reads, with the sections that read it. */
export function noteInputs(note: ParsedNote): Map<string, NoteSection[]> {
  const out = new Map<string, NoteSection[]>();
  for (const s of note.sections)
    for (const k of sectionInputs(s)) out.set(k, [...(out.get(k) ?? []), s]);
  return out;
}

// ── probes ─────────────────────────────────────────────────────────────────────────────

/** What one input is at the pin. `value` is what a reading records; the rest is what a token
 *  draws. */
export type Probe =
  | { readonly kind: 'oracle'; readonly value: string; readonly f64: string; readonly f32: string }
  | {
      readonly kind: 'compile';
      readonly value: string;
      readonly code?: string;
      readonly message?: string;
      readonly line?: string;
    }
  | {
      readonly kind: 'accuracy';
      readonly value: string;
      readonly accuracy: string;
      readonly bound?: string;
    }
  | { readonly kind: 'entry'; readonly value: string; readonly field: string }
  | { readonly kind: 'assert'; readonly value: string };

export type ProbeResult =
  { readonly ok: true; readonly probe: Probe } | { readonly ok: false; readonly error: string };

/** A number the way a reading writes it: `-0` keeps its sign. */
const num = (v: unknown): string => (Object.is(v, -0) ? '-0' : String(v));

/** A value as a reading records it: as written up to VALUE_MAX characters, past that its
 *  sha256 and its first 60 characters. */
export function recordable(value: string): string {
  if (value.length <= VALUE_MAX) return value;
  return `sha256:${createHash('sha256').update(value).digest('hex')} ${value.slice(0, 60)}…`;
}

let service: ReturnType<typeof createTypeshadeLanguageService> | undefined;
let documents = 0;

/** The language service's errors on one program, as the editor reports them. */
function editorErrors(source: string): { code: string; message: string }[] {
  service ??= createTypeshadeLanguageService();
  const uri = `/reference-notes/case-${documents++}.shade.ts`;
  service.openDocument(uri, source);
  try {
    return service
      .getDiagnostics(uri)
      .filter((d) => d.severity === 'error')
      .map((d) => ({ code: String(d.code), message: d.message }));
  } finally {
    service.closeDocument(uri);
  }
}

/** compile()'s errors on one program, and its WGSL and GLSL. */
function compilerErrors(source: string): {
  errors: { code: string; message: string }[];
  wgsl?: string;
  glsl?: string;
  threw?: string;
} {
  try {
    const r = compile(source);
    return {
      errors: r.diagnostics
        .filter((d) => d.category === 'error')
        .map((d) => ({ code: String(d.code), message: d.message })),
      wgsl: r.wgsl,
      glsl: r.glsl ? `${r.glsl.vertex ?? ''}\n${r.glsl.fragment ?? ''}` : undefined,
    };
  } catch (e) {
    return { errors: [], threw: e instanceof Error ? e.message : String(e) };
  }
}

/** A call written with literal arguments, `pow(-2.0, 3.0)`, as its callee and its numbers. */
function parseCall(call: string): { callee: string; args: number[] } | string {
  const m = /^([A-Za-z_][\w.]*)\((.*)\)$/.exec(call.trim());
  if (!m) return `'${call}' is not a call with literal arguments`;
  const args: number[] = [];
  for (const raw of m[2]!.trim() ? m[2]!.split(',') : []) {
    const text = raw.trim();
    const v =
      text === 'NaN'
        ? NaN
        : /^-?Infinity$/.test(text)
          ? Number(text)
          : /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)
            ? Number(text)
            : undefined;
    if (v === undefined) return `the argument '${text}' of '${call}' is not a number`;
    args.push(v);
  }
  return { callee: m[1]!, args };
}

const memo = new WeakMap<NoteRecord, Map<string, ProbeResult>>();

/** One input of one note, computed at the pinned compiler, once per record and key. */
export function probeInput(id: string, record: NoteRecord, key: string): ProbeResult {
  let known = memo.get(record);
  if (!known) memo.set(record, (known = new Map()));
  const hit = known.get(key);
  if (hit) return hit;
  const result = probe(id, record, key);
  known.set(key, result);
  return result;
}

function probe(id: string, record: NoteRecord, key: string): ProbeResult {
  const fail = (error: string): ProbeResult => ({ ok: false, error });
  const [kind, name] = id.split('/') as [LanguageKind, string];
  if (key.startsWith('entry.')) {
    const field = key.slice('entry.'.length);
    let value: unknown = languageEntry(kind, name);
    for (const part of field.split('.')) {
      if (value === null || typeof value !== 'object' || !(part in value))
        return fail(`the entry ${id} has no field '${field}'`);
      value = (value as Record<string, unknown>)[part];
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return { ok: true, probe: { kind: 'entry', value: recordable(text), field: text } };
  }
  if (key.startsWith('accuracy:')) {
    const op = key.slice('accuracy:'.length);
    const a = accuracyOf(op);
    if (!a) return fail(`accuracyOf('${op}') knows no such operation`);
    const value =
      a.kind === 'exact'
        ? `exact${a.note ? ` (${a.note})` : ''}`
        : `${a.kind}: ${a.bound}${a.note ? ` (${a.note})` : ''}`;
    return {
      ok: true,
      probe: {
        kind: 'accuracy',
        value,
        accuracy: a.kind,
        bound: a.kind === 'exact' ? undefined : a.bound,
      },
    };
  }
  const oracle = /^oracle(?:@(f32|f64))?:(.+)$/.exec(key);
  if (oracle) {
    const call = parseCall(oracle[2]!);
    if (typeof call === 'string') return fail(call);
    const params = call.args.map((_, i) => `a${i}: f32`).join(', ');
    const args = call.args.map((_, i) => `a${i}`).join(', ');
    const source = `"use typeshade"\n\nexport function probe(${params}): f32 {\n  return ${call.callee}(${args})\n}\n`;
    const c = compilerErrors(source);
    if (c.threw || c.errors.length)
      return fail(
        `the oracle cannot run ${oracle[2]}: ${c.threw ?? c.errors.map((e) => `${e.code} ${e.message}`).join('; ')}`,
      );
    const module = compile(source).module;
    const f64 = num(compileModule(module).fns.probe!(...call.args));
    const f32 = num(compileModule(module, { precision: 'f32' }).fns.probe!(...call.args));
    const precision = oracle[1];
    if (!precision && f64 !== f32)
      return fail(
        `the oracle answers ${oracle[2]} with ${f64} at f64 and ${f32} at f32. Pick one with {{oracle@f64 …}} or {{oracle@f32 …}}, or choose arguments whose result is exact in both.`,
      );
    const value = precision === 'f32' ? f32 : precision === 'f64' ? f64 : `${f64} | ${f32}`;
    return { ok: true, probe: { kind: 'oracle', value, f64, f32 } };
  }
  if (key.startsWith('compile:')) {
    const name = key.slice('compile:'.length);
    const c = record.compile[name];
    if (!c) return fail(`the record has no compile case '${name}'`);
    const compiler = compilerErrors(c.source);
    const editor = editorErrors(c.source);
    if (compiler.threw)
      return fail(`compile:${name}: compile() threw instead of reporting: ${compiler.threw}`);
    const first = compiler.errors[0];
    const seen = editor[0];
    if (first || seen) {
      if (!first || !seen || first.code !== seen.code || first.message !== seen.message)
        return fail(
          `compile:${name}: the two halves disagree.\n` +
            `  compile()         ${first ? `${first.code} ${first.message}` : 'no diagnostic'}\n` +
            `  language service  ${seen ? `${seen.code} ${seen.message}` : 'no diagnostic'}\n` +
            'File an issue on typeshade/typeshade (Rule 12.7). Do not record this value; remove the token until both halves agree.',
        );
      return {
        ok: true,
        probe: {
          kind: 'compile',
          value: recordable(`${first.code}: ${first.message} | editor: same`),
          code: first.code,
          message: first.message,
        },
      };
    }
    const target = c.wgsl !== undefined ? 'wgsl' : c.glsl !== undefined ? 'glsl' : null;
    if (!target) return { ok: true, probe: { kind: 'compile', value: 'ok' } };
    const holds = target === 'wgsl' ? c.wgsl! : c.glsl!;
    const line = ((target === 'wgsl' ? compiler.wgsl : compiler.glsl) ?? '')
      .split('\n')
      .find((l) => l.includes(holds))
      ?.trim();
    if (!line)
      return fail(`compile:${name}: no line of the ${target.toUpperCase()} holds '${holds}'`);
    return {
      ok: true,
      probe: { kind: 'compile', value: recordable(`ok; ${target}: ${line}`), line },
    };
  }
  if (key.startsWith('assert:')) {
    const name = key.slice('assert:'.length);
    const fn = record.asserts[name];
    if (!fn) return fail(`the record has no assertion '${name}'`);
    let value: string;
    try {
      value = fn() ? 'true' : 'false';
    } catch (e) {
      value = `throws: ${e instanceof Error ? e.message : String(e)}`;
    }
    return { ok: true, probe: { kind: 'assert', value: recordable(value) } };
  }
  return fail(`'${key}' names no input the build can compute`);
}

// ── readings ───────────────────────────────────────────────────────────────────────────

export interface Reading {
  readonly note: string;
  readonly read: { readonly pin: string; readonly reviewed: string };
  readonly inputs: Readonly<Record<string, string>>;
}

const resolve = (file: string): string => path.resolve(process.cwd(), file);

/** A note's reading, or null where it has none. */
export function readReading(set: NoteSet, id: string): Reading | null {
  const file = resolve(readingFile(set, id));
  if (!existsSync(file)) return null;
  const r = JSON.parse(readFileSync(file, 'utf8')) as Reading;
  if (r.note !== id || typeof r.inputs !== 'object')
    throw new Error(`[reference-notes] ${readingFile(set, id)} is not the reading of ${id}`);
  return r;
}

/** A reading as the file holds it: objects and strings only, which Prettier leaves as written. */
export function formatReading(r: Reading): string {
  const inputs = Object.fromEntries(Object.entries(r.inputs).sort(([a], [b]) => (a < b ? -1 : 1)));
  return `${JSON.stringify({ note: r.note, read: r.read, inputs }, null, 2)}\n`;
}

/** A note of the set, parsed, with its record. */
export interface LoadedNote {
  readonly id: string;
  readonly kind: LanguageKind;
  readonly name: string;
  readonly record: NoteRecord;
  readonly english: ParsedNote;
}

/** One note's English, or a problem naming what is missing. */
export function loadNote(set: NoteSet, id: string): LoadedNote | string {
  const record = set.notes[id];
  if (!record) return `${id} is not registered in src/lib/reference-notes/index.ts`;
  const [kind, name] = id.split('/') as [LanguageKind, string];
  if (!LANGUAGE_KINDS.includes(kind) || !name) return `'${id}' is not <kind>/<name>`;
  const file = noteFile(set, 'en', id);
  if (!existsSync(resolve(file))) return `${id} has no English note at ${file}`;
  return { id, kind, name, record, english: parseNote(file, readFileSync(resolve(file), 'utf8')) };
}

/** An input whose recorded value is not the pin's. */
export interface StaleInput {
  readonly key: string;
  readonly read: string;
  readonly pin: string;
  readonly sections: readonly NoteSection[];
}

/** One note against its reading. */
export interface NoteComparison {
  readonly note: LoadedNote;
  readonly reading: Reading | null;
  /** The pin's value of every input, or why it could not be computed. */
  readonly values: ReadonlyMap<string, ProbeResult>;
  readonly stale: readonly StaleInput[];
  /** Inputs the note reads that the reading does not record. */
  readonly unrecorded: readonly string[];
  /** Values the reading records that no section reads. */
  readonly unused: readonly string[];
  readonly errors: readonly string[];
}

/** Every input of one note computed at the pin and held to the reading. */
export function compareNote(set: NoteSet, note: LoadedNote): NoteComparison {
  const reading = readReading(set, note.id);
  const inputs = noteInputs(note.english);
  const values = new Map<string, ProbeResult>();
  const stale: StaleInput[] = [];
  const unrecorded: string[] = [];
  const errors: string[] = [];
  for (const [key, sections] of inputs) {
    const r = probeInput(note.id, note.record, key);
    values.set(key, r);
    if (!r.ok) {
      errors.push(r.error);
      continue;
    }
    const read = reading?.inputs[key];
    if (read === undefined) unrecorded.push(key);
    else if (read !== r.probe.value) stale.push({ key, read, pin: r.probe.value, sections });
  }
  const unused = reading ? Object.keys(reading.inputs).filter((k) => !inputs.has(k)) : [];
  return { note, reading, values, stale, unrecorded, unused, errors };
}

const pagePath = (n: LoadedNote): string => languageEntryPath(n.kind, n.name);
const sectionName = (s: NoteSection): string => `"${s.heading.replace(/`/g, '')}" (#${s.id})`;

/** What a comparison owes, as the lines the build prints; empty when the note holds. */
export function comparisonMessages(set: NoteSet, c: NoteComparison): string[] {
  const out: string[] = [];
  const file = c.note.english.file;
  const command = `bun run check:notes --read ${c.note.id}`;
  for (const e of c.errors) out.push(`[reference-notes] ${c.note.id}: ${e}`);
  if (!c.reading && (c.unrecorded.length || c.stale.length)) {
    out.push(
      `[reference-notes] ${c.note.id} has no reading (${readingFile(set, c.note.id)}). Read each section of ${file} against the values the pin gives, then run: ${command}`,
    );
    return out;
  }
  if (c.stale.length) {
    const width = Math.max(...c.stale.map((s) => s.key.length));
    const sections = [...new Set(c.stale.flatMap((s) => s.sections))];
    out.push(
      [
        `[reference-notes] ${pagePath(c.note)} was read against values the pin no longer has.`,
        ...c.stale.map((s) => `  ${s.key.padEnd(width)}   read: ${s.read}   pin: ${s.pin}`),
        `Read again in ${file}: ${sections.map(sectionName).join(', ')}.`,
        `The reading was taken at pin ${c.reading!.read.pin}: git -C vendor/shader-dsl log --oneline ${c.reading!.read.pin}..HEAD`,
        `When each section holds for the new values, run: ${command}`,
      ].join('\n'),
    );
  }
  if (c.unrecorded.length)
    out.push(
      `[reference-notes] ${c.note.id}: the reading records no value for ${c.unrecorded.join(', ')}, which ${file} reads. Read the sections that use ${c.unrecorded.length > 1 ? 'them' : 'it'}, then run: ${command}`,
    );
  if (c.unused.length)
    out.push(
      `[reference-notes] ${c.note.id}: the reading records ${c.unused.join(', ')}, which no section of ${file} reads. Run: ${command}`,
    );
  return out;
}

const assertedNotes = new Set<string>();

/** Stops the page build when the entry's note no longer holds at the pin: a value it read
 *  moved, a value it reads is not recorded, or one cannot be computed. A page without a note
 *  passes. */
export function assertNoteReading(kind: LanguageKind, name: string): void {
  const set = noteSet();
  const id = `${kind}/${name}`;
  if (!set.notes[id] || assertedNotes.has(id)) return;
  const note = loadNote(set, id);
  if (typeof note === 'string') throw new Error(`[reference-notes] ${note}`);
  const problems = comparisonMessages(set, compareNote(set, note));
  if (problems.length) throw new Error(problems.join('\n'));
  assertedNotes.add(id);
}

// ── translations ───────────────────────────────────────────────────────────────────────

/** The rules one English section names, by token or in prose. */
export function sectionRules(s: NoteSection): string[] {
  return [
    ...new Set([
      ...s.tokens.filter((t) => t.name === 'rule').map((t) => t.arg),
      ...mentioned(s.raw.replace(TOKEN, ' ')),
    ]),
  ];
}

/** The stamp a translated section records: the English section as written and the values its
 *  inputs had when the English was read. A change to either is a reason to read the
 *  translation again. */
export function sectionSource(s: NoteSection, reading: Reading | null): string {
  const values = sectionInputs(s)
    .sort()
    .map((k) => `${k}=${reading?.inputs[k] ?? ''}`)
    .join('\n');
  return createHash('sha256').update(`${s.raw}\n${values}`).digest('hex').slice(0, 12);
}

/** `id hash, id hash` and `9.4 fingerprint, 12.7 fingerprint` as maps. */
export function stamps(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (raw ?? '').split(',')) {
    const [key, value] = part.trim().split(/\s+/);
    if (key && value) out.set(key, value);
  }
  return out;
}

/** Whether one English section's translation in one language is served. */
export type TranslationState =
  | { readonly state: 'current'; readonly section: NoteSection }
  | { readonly state: 'missing' }
  | { readonly state: 'stale'; readonly why: string; readonly section: NoteSection };

/** A note's translation into one language, section by section. */
export interface NoteTranslation {
  readonly file: string;
  readonly parsed: ParsedNote | null;
  readonly states: ReadonlyMap<string, TranslationState>;
}

/** Which sections of a note's translation are current: the stamp a section records is the
 *  English section and its values at the reading, and every rule the English section names
 *  carries the fingerprint the pin gives it. */
export function noteTranslation(set: NoteSet, note: LoadedNote, locale: string): NoteTranslation {
  const file = noteFile(set, locale, note.id);
  const states = new Map<string, TranslationState>();
  if (!existsSync(resolve(file))) {
    for (const s of note.english.sections) states.set(s.id, { state: 'missing' });
    return { file, parsed: null, states };
  }
  const parsed = parseNote(file, readFileSync(resolve(file), 'utf8'));
  const reading = readReading(set, note.id);
  const sources = stamps(parsed.meta.sources);
  const rules = stamps(parsed.meta.rules);
  const translated = new Map(parsed.sections.map((s) => [s.id, s]));
  for (const s of note.english.sections) {
    const t = translated.get(s.id);
    if (!t) {
      states.set(s.id, { state: 'missing' });
      continue;
    }
    const want = sectionSource(s, reading);
    const have = sources.get(s.id);
    if (have !== want) {
      states.set(s.id, {
        state: 'stale',
        section: t,
        why: have
          ? `was translated from an older English section, or one read against older values (source ${have}, now ${want})`
          : `records no source for the English it was translated from (now ${want})`,
      });
      continue;
    }
    const moved = sectionRules(s).find((n) => rules.get(n) !== ruleByNumber(n)?.reviewed);
    if (moved) {
      const pinned = ruleByNumber(moved)?.reviewed;
      states.set(s.id, {
        state: 'stale',
        section: t,
        why: !pinned
          ? `names Rule ${moved}, which the pin does not have`
          : rules.has(moved)
            ? `was translated against Rule ${moved} at ${rules.get(moved)!.slice(0, 12)}, and the pin changes the rule to ${pinned.slice(0, 12)}`
            : `names Rule ${moved} and records no fingerprint for it`,
      });
      continue;
    }
    states.set(s.id, { state: 'current', section: t });
  }
  return { file, parsed, states };
}

/** The warning for a translated section the page shows in English. */
export function staleTranslationMessage(
  note: LoadedNote,
  locale: string,
  file: string,
  sectionId: string,
  state: TranslationState,
): string {
  const page = localePath(locale as Locale, languageEntryPath(note.kind, note.name));
  if (state.state === 'missing')
    return `[reference-notes] warning: ${file} has no section ${sectionId}; ${page} shows it in English until it is translated.`;
  if (state.state !== 'stale') return '';
  return [
    `[reference-notes] warning: ${file}, section ${sectionId}, ${state.why}.`,
    `${page} shows that section in English until it is translated or read again.`,
    `If the translation still holds for the English and its values, run: bun run check:notes --read-ko ${note.id} ${sectionId}`,
  ].join('\n');
}

// ── the page ───────────────────────────────────────────────────────────────────────────

/** Backslash before every ASCII punctuation mark, so a compiler's text reads as written. */
const escapeMarkdown = (s: string): string => s.replace(/[!-/:-@[-`{-~]/g, '\\$&');

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A link written as HTML. src/lib/remark-package-name.mjs unwraps a Markdown link to a page of
 *  this site outside /api/, since the guide's are the upstream site's, so a note writes its own
 *  links past it. */
const anchor = (href: string, html: string): string => `<a href="${escapeHtml(href)}">${html}</a>`;

/** A link's label as HTML: a code span in it in the code face, the rest as text. */
const labelHtml = (label: string): string =>
  label
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((p) => (/^`.+`$/.test(p) ? `<code>${escapeHtml(p.slice(1, -1))}</code>` : escapeHtml(p)))
    .join('');

/** Inline code holding `s` whatever backticks it holds. */
function codeSpan(s: string): string {
  const longest = Math.max(0, ...[...s.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(longest + 1);
  const pad = s.startsWith('`') || s.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${s}${pad}${fence}`;
}

/** The fields of an entry that hold code, which a token sets in the code face. */
const CODE_FIELDS = /^(?:name|title|signature|spelling\.(?:wgsl|glsl))$/;

/** One token as the Markdown the page renders, in one language. */
export function renderToken(note: LoadedNote, t: NoteToken, locale: Locale): string {
  const key = tokenInput(t);
  const probe = (): Probe => {
    const r = probeInput(note.id, note.record, key!);
    if (!r.ok) throw new Error(`[reference-notes] ${note.english.file}:${t.line}: ${r.error}`);
    return r.probe;
  };
  const english = (md: string): string => `<span lang="en">${md}</span>`;
  switch (t.name as TokenName) {
    case 'oracle': {
      const p = probe() as Extract<Probe, { kind: 'oracle' }>;
      return codeSpan(t.precision === 'f32' ? p.f32 : p.f64);
    }
    case 'compile': {
      const p = probe() as Extract<Probe, { kind: 'compile' }>;
      // The sentence around the token carries its own full stop.
      if (p.code)
        return english(`${codeSpan(p.code)} ${escapeMarkdown(p.message!.replace(/\.$/, ''))}`);
      return p.line ? codeSpan(p.line) : '';
    }
    case 'accuracy': {
      const p = probe() as Extract<Probe, { kind: 'accuracy' }>;
      return english(
        p.bound ? `${codeSpan(p.accuracy)}, ${escapeMarkdown(p.bound)}` : codeSpan(p.accuracy),
      );
    }
    case 'entry': {
      const p = probe() as Extract<Probe, { kind: 'entry' }>;
      return CODE_FIELDS.test(t.arg) ? codeSpan(p.field) : english(p.field);
    }
    case 'assert':
      probe();
      return '';
    case 'fact': {
      const value = (facts as Record<string, unknown>)[t.arg];
      if (typeof value !== 'string' && typeof value !== 'number')
        throw new Error(
          `[reference-notes] ${note.english.file}:${t.line}: facts has no value '${t.arg}'`,
        );
      return escapeMarkdown(String(value));
    }
    case 'rule': {
      const href = rulePath(t.arg);
      if (!href)
        throw new Error(
          `[reference-notes] ${note.english.file}:${t.line}: no Rule ${t.arg} at the pin`,
        );
      // A no-break space, so remark-rule-links.mjs does not read the label as a mention and
      // link it a second time inside this link.
      const word = copyFor(locale).docs.rules.entry.heading('').trim();
      return anchor(localePath(locale, href), escapeHtml(`${word}\u00a0${t.arg}`));
    }
    case 'ref': {
      const [kind, name] = t.arg.split('/') as [LanguageKind, string];
      const page =
        LANGUAGE_KINDS.includes(kind) && name ? languageEntryPage(kind, name) : undefined;
      if (!page)
        throw new Error(
          `[reference-notes] ${note.english.file}:${t.line}: ${t.raw} names no entry of the reference`,
        );
      return anchor(localePath(locale, page), labelHtml(`\`${languageEntry(kind, name).title}\``));
    }
    case 'pin':
      return anchor(links.commit.href, labelHtml(`\`${facts.pinnedCommit}\``));
    default:
      throw new Error(
        `[reference-notes] ${note.english.file}:${t.line}: the build cannot draw ${t.raw}`,
      );
  }
}

/** A key of src/lib/links.ts as the address it names, a page of the site in the reader's
 *  language. */
function linkHref(key: string, locale: Locale): string | undefined {
  const href = (links as Record<string, { href: string } | undefined>)[key]?.href;
  if (!href) return undefined;
  return href.startsWith('/') ? localePath(locale, href) : href;
}

/** A Markdown chunk with every token drawn and every link key resolved. */
function renderMarkdown(
  note: LoadedNote,
  file: string,
  text: string,
  line: number,
  locale: Locale,
): string {
  const lines = text.split('\n').map((source, i) => {
    // The link keys first, so a value a token draws is never read as one.
    const l = source.replace(
      /\[([^\]]+)\]\(([A-Za-z][A-Za-z0-9]*)\)/g,
      (whole, label: string, key: string) => {
        const href = linkHref(key, locale);
        if (!href)
          throw new Error(
            `[reference-notes] ${file}:${line + i}: no link key '${key}' in src/lib/links.ts`,
          );
        return anchor(href, labelHtml(label));
      },
    );
    let out = '';
    let at = 0;
    for (const t of tokensOf(l, line + i)) {
      const index = l.indexOf(t.raw, at);
      let before = l.slice(at, index);
      // An assertion draws nothing; the space before it goes with it.
      if (t.name === 'assert') before = before.replace(/\s+$/, '');
      out += before + renderToken(note, t, locale);
      at = index + t.raw.length;
    }
    return out + l.slice(at);
  });
  return lines.join('\n');
}

/** What the page draws for one section. */
export type ViewChunk =
  | { readonly kind: 'markdown'; readonly text: string }
  | { readonly kind: 'html'; readonly html: string }
  | { readonly kind: 'code'; readonly code: string; readonly file?: string }
  | {
      readonly kind: 'live';
      readonly files?: Readonly<Record<string, string>>;
      readonly id: string;
      readonly title: string;
      readonly caption: string;
      readonly anchor?: string;
      readonly exercises: readonly string[];
      readonly code: string;
      readonly file?: string;
      readonly aspect?: '3/1' | '2/1' | '16/9' | '4/3' | '3/2' | '1/1';
      readonly plot?: { x: readonly [number, number]; y: readonly [number, number] };
      readonly controls: ControlProps;
    };

export interface ViewSection {
  readonly id: string;
  readonly heading: string;
  /** The section is shown in English on a page in another language. */
  readonly fallback: boolean;
  readonly chunks: readonly ViewChunk[];
}

export interface NoteView {
  readonly id: string;
  readonly locale: Locale;
  readonly sections: readonly ViewSection[];
}

/** One note as one page draws it: each section in the page's language where its translation
 *  is current, and in English where it is not. */
export function noteView(
  set: NoteSet,
  id: string,
  locale: Locale,
): { view: NoteView; warnings: string[] } {
  const note = loadNote(set, id);
  if (typeof note === 'string') throw new Error(`[reference-notes] ${note}`);
  const warnings: string[] = [];
  const translation = locale === defaultLocale ? null : noteTranslation(set, note, locale);
  const sections = note.english.sections.map((english): ViewSection => {
    const state = translation?.states.get(english.id);
    const current = state?.state === 'current' ? state.section : null;
    if (translation && state && state.state !== 'current')
      warnings.push(staleTranslationMessage(note, locale, translation.file, english.id, state));
    const s = current ?? english;
    const file = current ? translation!.file : note.english.file;
    const chunkLocale = current ? locale : defaultLocale;
    const chunks = s.chunks.map((c): ViewChunk => {
      if (c.kind === 'markdown')
        return { kind: 'markdown', text: renderMarkdown(note, file, c.text, c.line, chunkLocale) };
      if (c.kind === 'code') {
        const sample = note.record.samples[c.id];
        if (!sample)
          throw new Error(
            `[reference-notes] ${file}:${c.line}: the record has no sample '${c.id}'`,
          );
        return { kind: 'code', code: sample.code, file: sample.file };
      }
      const live = note.record.live[c.marker.id];
      if (!live)
        throw new Error(
          `[reference-notes] ${file}:${c.marker.line}: the record has no live example '${c.marker.id}'`,
        );
      if (!c.marker.title || !c.marker.caption)
        throw new Error(
          `[reference-notes] ${file}:${c.marker.line}: the live marker needs a title: and a caption: line`,
        );
      const controls = Object.fromEntries(
        Object.entries(live.controls ?? {}).map(([field, range]) => {
          const label = c.marker.controls[field];
          if (!label)
            throw new Error(
              `[reference-notes] ${file}:${c.marker.line}: no 'control ${field}:' line names the control's label`,
            );
          return [field, { ...range, label }];
        }),
      );
      return {
        kind: 'live',
        id: c.marker.id,
        title: c.marker.title,
        caption: c.marker.caption,
        anchor: c.marker.anchor,
        exercises: c.marker.exercises,
        code: live.code,
        files: live.files,
        file: live.file,
        aspect: live.aspect,
        plot: live.plot,
        controls,
      };
    });
    return { id: english.id, heading: s.heading, fallback: !!translation && !current, chunks };
  });
  return { view: { id, locale, sections }, warnings };
}

/** The `referenceNotes` collection's id of a note in one language. */
export const noteEntryId = (locale: string, id: string): string => `${locale}/${noteFileName(id)}`;

/** The note an entry has, if any. */
export function noteOf(kind: LanguageKind, name: string): string | undefined {
  const id = `${kind}/${name}`;
  return noteSet().notes[id] ? id : undefined;
}

/** The `referenceNotes` collection: every note of the set in every language, each Markdown
 *  chunk rendered through the site's own pipeline. A cross-link a remark plugin adds names an
 *  English page; a page in another language gets its own, the way the guide's does. */
export function referenceNotesLoader(): Loader {
  return {
    name: 'reference-notes',
    async load({ store, renderMarkdown: render, logger }) {
      store.clear();
      const set = noteSet();
      for (const id of Object.keys(set.notes)) {
        for (const locale of locales) {
          const { view, warnings } = noteView(set, id, locale);
          const sections: ViewSection[] = [];
          for (const s of view.sections) {
            const fileURL = pathToFileURL(
              resolve(noteFile(set, s.fallback || locale === defaultLocale ? 'en' : locale, id)),
            );
            const chunks: ViewChunk[] = [];
            for (const c of s.chunks) {
              if (c.kind !== 'markdown') {
                chunks.push(c);
                continue;
              }
              let html = (await render(c.text, { fileURL })).html;
              if (locale !== defaultLocale)
                html = html.replace(
                  /href="\/(api|reference\/errors|reference\/rules)\//g,
                  `href="/${locale}/$1/`,
                );
              chunks.push({ kind: 'html', html });
            }
            sections.push({ ...s, chunks });
          }
          store.set({
            id: noteEntryId(locale, id),
            data: { ...view, sections } as unknown as Record<string, unknown>,
          });
          for (const w of warnings) logger.warn(w);
        }
      }
      logger.info(
        `${Object.keys(set.notes).length} reference note(s)${set.fixture ? ' (the fixture)' : ''}`,
      );
    },
  };
}
