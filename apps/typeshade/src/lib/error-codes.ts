// The data behind /reference/errors/: one page per diagnostic code the compiler can report,
// from its two registries at the pinned commit. Nothing about a code is typed here.
//
//   TS_CODES  vendor/shader-dsl/src/compiler/ts/codes.ts, the "use typeshade" front end's
//             codes. The file is parsed, since the package does not export it: the constant
//             name, the code, the JSDoc paragraph above it, and the header comment that
//             explains the numbering and names the retired numbers.
//   CODES     vendor/shader-dsl/src/core/diagnostics/codes.ts, the core's SD codes, imported
//             from typeshade/dev, which exports it: the summary and the hint are the
//             registry's own, with the comments the file writes on an entry.
//
// The text goes through the prose rules the API reference applies to the same compiler's
// JSDoc: the release name, no issue numbers, no aside that names a consumer.
//
// Where each code is raised is read from the compiler's source the same way, so a page can
// send a reader to the line.
//
// A code's example is a whole "use typeshade" program, compiled here at build time against
// the pin, with the fix beside it, compiled too. The program has to produce the code and the
// fix has to compile clean, or the build stops naming the code: a pin move that changes a
// rule stops here, the way src/lib/typescript-lowering.ts stops on a construct row. An SD
// code reaches a "use typeshade" file three ways, and the page says which one it took:
//   compile   compile() reports it, on its own or inside a BACKEND (TS8015) diagnostic;
//   backend   compile() reports a BACKEND diagnostic whose text lost the code, and the
//             emitter compile() ran throws an error carrying it when run again on the module;
//   diagnose  compile() says nothing, and diagnose() from typeshade/dev, which runs the lint
//             rules compile() does not, reports it on the module compile() returned.
// A code no program here raises says why on its page: the front end catches the mistake
// first under its own code (shown with a program that proves it), the core layer only the
// fn() builder calls raises it, or the registry marks it an internal invariant.
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { compile } from '../../vendor/shader-dsl/src/index.ts';
import { CODES, diagnose } from '../../vendor/shader-dsl/src/dev.ts';
import { emitModule } from '../../vendor/shader-dsl/src/core/backends/wgsl.ts';
import { emitGlslStages } from '../../vendor/shader-dsl/src/core/backends/glsl.ts';
import { referenceProse } from './api.ts';

const ROOT = 'vendor/shader-dsl';
const TS_FILE = 'src/compiler/ts/codes.ts';
const SD_FILE = 'src/core/diagnostics/codes.ts';

export type ErrorFamily = 'ts' | 'sd';

/** What a code is about. The index groups the codes of each family under these, in order. */
export type ErrorGroup =
  | 'file'
  | 'types'
  | 'functions'
  | 'controlFlow'
  | 'entries'
  | 'resources'
  | 'f64'
  | 'targets'
  | 'builder'
  | 'lint'
  | 'portable'
  | 'retired'
  | 'other';

export const TS_GROUPS: readonly ErrorGroup[] = [
  'file',
  'types',
  'functions',
  'controlFlow',
  'entries',
  'resources',
  'f64',
  'targets',
  'retired',
  'other',
];
export const SD_GROUPS: readonly ErrorGroup[] = [
  'types',
  'builder',
  'resources',
  'targets',
  'f64',
  'lint',
  'portable',
  'other',
];

// Which group a code sits in. A code the pin adds and this table does not name lands in
// 'other' and its page still builds; the counts in src/lib/examples.ts stop the build for it.
const GROUP_OF: Readonly<Record<string, ErrorGroup>> = {
  MISSING_DIRECTIVE: 'file',
  SYNTAX: 'file',
  TOP_LEVEL: 'file',
  IMPORT: 'file',
  HOST_STMT: 'file',
  ENABLE_NAME: 'file',
  UNSUPPORTED: 'file',
  UNKNOWN_TYPE: 'types',
  TYPE_MISMATCH: 'types',
  UNKNOWN_NAME: 'types',
  DUPLICATE_SYMBOL: 'types',
  CONST_ASSIGN: 'types',
  ASSIGN_TARGET: 'types',
  UNASSIGNED_READ: 'types',
  INDEX_OOB: 'types',
  STRUCT_FIELD: 'types',
  INT_LITERAL_DEPRECATION: 'types',
  UNKNOWN_FN: 'functions',
  ARITY_MISMATCH: 'functions',
  FUNCTION_SHAPE: 'functions',
  RETURN_SHAPE: 'functions',
  RECURSION: 'functions',
  CLASS_MEMBER: 'functions',
  MATH_ARGUMENT: 'functions',
  LOOP_BOUND: 'controlFlow',
  LOOP_INFINITE: 'controlFlow',
  LOOP_INDUCTION: 'controlFlow',
  BREAK_OUTSIDE: 'controlFlow',
  SWITCH_CASE: 'controlFlow',
  UNIFORMITY: 'controlFlow',
  BARRIER_PLACEMENT: 'controlFlow',
  BUILTIN_NAME: 'entries',
  BUILTIN_STAGE: 'entries',
  WORKGROUP_SHAPE: 'entries',
  ATTRIBUTE_NAME: 'entries',
  STRUCT_FIELD_MISSING_ATTR: 'entries',
  WORKGROUP_ARG: 'entries',
  UNSIZED_ARRAY_LENGTH: 'resources',
  MODULE_VAR: 'resources',
  TEXTURE_ARGUMENT: 'resources',
  LAYOUT: 'resources',
  MAT_UNSUPPORTED: 'f64',
  F64_ENTRY_IO: 'f64',
  BACKEND: 'targets',
  RESERVED_NAME: 'types',
  SD0001: 'types',
  SD0002: 'types',
  SD0003: 'types',
  SD0004: 'types',
  SD0005: 'types',
  SD0006: 'types',
  SD0007: 'types',
  SD0008: 'types',
  SD0009: 'types',
  SD0010: 'types',
  SD0011: 'types',
  SD0015: 'types',
  SD0116: 'types',
  SD0117: 'types',
  SD0012: 'builder',
  SD0013: 'builder',
  SD0113: 'builder',
  SD0115: 'builder',
  SD0014: 'resources',
  SD0016: 'resources',
  SD0114: 'resources',
  SD0017: 'targets',
  SD0020: 'targets',
  SD0030: 'targets',
  SD0040: 'f64',
  SD0041: 'f64',
  SD0042: 'f64',
  SD0043: 'f64',
  SD0044: 'f64',
  SD0107: 'lint',
  SD0108: 'lint',
  SD0109: 'lint',
  SD0112: 'lint',
  SD0110: 'portable',
  SD0111: 'portable',
};

/** One place in the compiler's source that raises a code. */
export interface ErrorSite {
  /** The file, relative to the compiler's root. */
  readonly file: string;
  /** The one-based line of the first site in that file. */
  readonly line: number;
  /** How many sites that file has. */
  readonly count: number;
}

/** One diagnostic as the compiler reported it. */
export interface ReportedDiagnostic {
  readonly code: string;
  readonly severity: string;
  /** One-based, in the program shown. Zero where the report has no line. */
  readonly line: number;
  readonly message: string;
}

/** How an example's code reached the page; see the head of this file. */
export type ErrorChannel = 'compile' | 'backend' | 'diagnose';

export interface ErrorExample {
  readonly trigger: string;
  readonly fix: string;
  readonly channel: ErrorChannel;
  /** What compile() reported for the trigger. For the diagnose channel, what diagnose() did. */
  readonly diagnostics: readonly ReportedDiagnostic[];
  /** For the backend channel: the error the emitter threw, code and message. */
  readonly thrown: ReportedDiagnostic | null;
  /** The compile() option the example needs, where it needs one. */
  readonly deprecations: boolean;
  /** Compiled with `{ console: 'gpu' }`, the option under which the WGSL records console calls. */
  readonly consoleGpu: boolean;
  /** The other files of the program the fix imports from, in the order the page shows them. */
  readonly files: readonly { readonly name: string; readonly text: string }[];
}

/** A front-end code that stops the same mistake before the core check can see it. */
export interface ErrorCounterpart {
  readonly code: string;
  readonly program: string;
  readonly diagnostics: readonly ReportedDiagnostic[];
}

/** Why a code has no example. */
export type ErrorGap = 'retired' | 'frontEnd' | 'builder' | 'internal' | 'unwritten';

export interface ErrorCodeEntry {
  readonly code: string;
  /** The last path segment of its page. */
  readonly slug: string;
  readonly family: ErrorFamily;
  /** The TS_CODES constant, `STRUCT_FIELD`. Null for an SD code and for a retired number. */
  readonly name: string | null;
  readonly group: ErrorGroup;
  /** The registry's own documentation, one Markdown paragraph per item. For a TS code it is
   *  the JSDoc above the constant, or the header's sentences about it where the constant has
   *  none; for an SD code the summary. Empty where the registry says nothing. */
  readonly docs: readonly string[];
  /** The first sentence of the docs, the line the index and the page lead with. Empty where
   *  the registry documents nothing, and the page takes the dictionary's line instead. */
  readonly line: string;
  /** The SD registry's one-line fix. */
  readonly hint: string;
  readonly sites: readonly ErrorSite[];
  readonly example: ErrorExample | null;
  readonly counterpart: ErrorCounterpart | null;
  readonly gap: ErrorGap | null;
  /** Other codes the page points to: the ones its docs name, its counterpart, the codes its
   *  example's report carries, and the ones that name it as their counterpart. */
  readonly related: readonly string[];
  /** Inline code spans in the docs and hint, for the page to match against the language
   *  reference. */
  readonly spans: readonly string[];
}

// ── the registries ─────────────────────────────────────────────────────────────────────

interface RawCode {
  readonly code: string;
  readonly name: string | null;
  readonly docs: readonly string[];
  readonly hint: string;
  readonly family: ErrorFamily;
}

/** A `/** … *\/` comment as paragraphs of Markdown: the stars off, the lines of one paragraph
 *  joined with a space. */
function jsdocParagraphs(comment: string): string[] {
  const lines = comment
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*? ?/, '').trimEnd());
  const out: string[] = [];
  let current: string[] = [];
  for (const l of lines) {
    if (l.trim() === '') {
      if (current.length > 0) out.push(current.join(' ').replace(/\s+/g, ' ').trim());
      current = [];
    } else current.push(l.trim());
  }
  if (current.length > 0) out.push(current.join(' ').replace(/\s+/g, ' ').trim());
  return out.filter((p) => p.length > 0);
}

/** The file's leading `//` comment, as paragraphs. */
function headerParagraphs(text: string): string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.startsWith('//')) break;
    const l = raw.replace(/^\/\/ ?/, '').trimEnd();
    if (l.trim() === '') {
      if (current.length > 0) out.push(current.join(' '));
      current = [];
    } else current.push(l.trim());
  }
  if (current.length > 0) out.push(current.join(' '));
  return out;
}

/** Sentences, split at a stop followed by a capital or a code span. */
const sentences = (paragraph: string): string[] =>
  paragraph
    .split(/(?<=[.!?])\s+(?=[A-Z`"])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

/** The first sentence of a paragraph, the lead a row and a page carry. A stop inside a code
 *  span or an `e.g.` is not the end of it. */
export function firstSentence(text: string): string {
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '`') inCode = !inCode;
    if (inCode || c !== '.') continue;
    const next = text[i + 1];
    if (next !== undefined && next !== ' ') continue;
    if (/\b(?:e\.g|i\.e|vs)$/.test(text.slice(0, i))) continue;
    return text.slice(0, i + 1);
  }
  return text;
}

interface TsRegistry {
  readonly codes: readonly RawCode[];
  readonly header: readonly string[];
  readonly retired: readonly string[];
}

let tsCache: TsRegistry | null = null;

function readTsRegistry(): TsRegistry {
  if (tsCache) return tsCache;
  const file = path.resolve(ROOT, TS_FILE);
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  let literal: ts.ObjectLiteralExpression | undefined;
  sf.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const d of node.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== 'TS_CODES' || !d.initializer) continue;
      let init: ts.Expression = d.initializer;
      while (
        ts.isAsExpression(init) ||
        ts.isSatisfiesExpression(init) ||
        ts.isParenthesizedExpression(init)
      )
        init = init.expression;
      if (ts.isObjectLiteralExpression(init)) literal = init;
    }
  });
  if (!literal)
    throw new Error(`[error-codes] ${TS_FILE} no longer declares TS_CODES as an object literal`);

  const header = headerParagraphs(text);
  const codes: RawCode[] = [];
  for (const prop of literal.properties) {
    if (
      !ts.isPropertyAssignment(prop) ||
      !ts.isIdentifier(prop.name) ||
      !ts.isStringLiteral(prop.initializer)
    ) {
      throw new Error(
        `[error-codes] TS_CODES has a member this reader does not know how to read: ${prop.getText(sf).slice(0, 60)}`,
      );
    }
    const name = prop.name.text;
    const code = prop.initializer.text;
    const ranges = ts.getLeadingCommentRanges(text, prop.pos) ?? [];
    const doc = [...ranges].reverse().find((r) => text.slice(r.pos, r.pos + 3) === '/**');
    let docs = doc ? jsdocParagraphs(text.slice(doc.pos, doc.end)) : [];
    // A constant with no JSDoc may still be what the header explains: TS8099 is.
    if (docs.length === 0) {
      const about = header
        .flatMap(sentences)
        .filter((s) => s.includes(`\`${name}\``) || s.includes(code));
      docs = about.length > 0 ? [about.join(' ')] : [];
    }
    codes.push({ code, name, docs, hint: '', family: 'ts' });
  }

  // A retired number is one the header says is retired. It is never reused, and it has a page
  // that says so, since a reader who meets it in an old log has nowhere else to look.
  const numbers = new Set(codes.map((c) => c.code));
  // "8011 is retired", and "8011 and 8012 are retired" once there are two.
  const retired = [
    ...new Set(
      [
        ...header
          .join(' ')
          .matchAll(/\b((?:\d{4}(?:,\s*|\s+and\s+))*\d{4})\s+(?:is|are)\s+retired\b/g),
      ]
        .flatMap((m) => m[1]!.match(/\d{4}/g) ?? [])
        .map((digits) => `TS${digits}`),
    ),
  ];
  for (const code of retired) {
    if (numbers.has(code))
      throw new Error(
        `[error-codes] the header of ${TS_FILE} calls ${code} retired, and TS_CODES still carries it`,
      );
    const digits = code.slice(2);
    const about = header.flatMap(sentences).filter((s) => s.includes(digits));
    codes.push({
      code,
      name: null,
      docs: about.length > 0 ? [about.join(' ')] : [],
      hint: '',
      family: 'ts',
    });
  }
  codes.sort((a, b) => a.code.localeCompare(b.code));
  tsCache = { codes, header, retired };
  return tsCache;
}

/** The `//` comments the SD registry writes about each entry: above it, and inside its object
 *  above a field. A line between box-drawing dashes is a section heading of the file; it is
 *  kept only where a comment under it explains the entry, since alone it names a group and
 *  says nothing about the one entry it happens to sit above. A comment that says what another
 *  entry is (`SD0111 is the SHAPE gate`) is that entry's documentation too. */
function sdComments(): ReadonlyMap<string, string[]> {
  const file = path.resolve(ROOT, SD_FILE);
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  let literal: ts.ObjectLiteralExpression | undefined;
  sf.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const d of node.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== 'CODES' || !d.initializer) continue;
      let init: ts.Expression = d.initializer;
      while (
        ts.isAsExpression(init) ||
        ts.isSatisfiesExpression(init) ||
        ts.isParenthesizedExpression(init)
      )
        init = init.expression;
      if (ts.isObjectLiteralExpression(init)) literal = init;
    }
  });
  if (!literal)
    throw new Error(`[error-codes] ${SD_FILE} no longer declares CODES as an object literal`);
  const lineComments = (pos: number): string[] => {
    const paragraphs: string[] = [];
    let heading = '';
    let current: string[] = [];
    const close = (): void => {
      if (current.length > 0)
        paragraphs.push(...(heading ? [`${heading}.`] : []), current.join(' '));
      current = [];
    };
    for (const r of ts.getLeadingCommentRanges(text, pos) ?? []) {
      const raw = text.slice(r.pos, r.end);
      if (!raw.startsWith('//')) continue;
      const l = raw.replace(/^\/\/ ?/, '').trim();
      if (/^──/.test(l)) {
        close();
        heading = l.replace(/^─+\s*|\s*─+$/g, '');
        continue;
      }
      current.push(l);
    }
    close();
    return paragraphs.filter((p) => p.length > 0);
  };
  const out = new Map<string, string[]>();
  for (const prop of literal.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
    const own = lineComments(prop.pos);
    const inner = ts.isObjectLiteralExpression(prop.initializer)
      ? prop.initializer.properties.flatMap((p) => lineComments(p.pos))
      : [];
    out.set(prop.name.text, [...own, ...inner]);
  }
  for (const [code, paragraphs] of [...out]) {
    for (const p of paragraphs) {
      for (const m of p.matchAll(/\b(SD\d{4}) is\b/g)) {
        const other = out.get(m[1]!);
        if (other && m[1] !== code && !other.includes(p)) other.push(p);
      }
    }
  }
  return out;
}

function readSdRegistry(): RawCode[] {
  const comments = sdComments();
  return Object.values(CODES).map((def) => {
    const d = def as { code: string; summary: string; hint?: string };
    return {
      code: d.code,
      name: null,
      docs: [d.summary, ...(comments.get(d.code) ?? [])],
      hint: d.hint ?? '',
      family: 'sd' as const,
    };
  });
}

/** A registry's text as the pages print it, through the prose rules the API reference already
 *  applies to the same compiler's JSDoc (src/lib/api.ts referenceProse). A paragraph with
 *  nothing left is dropped. */
function printable(code: RawCode): RawCode {
  // The package's pre-release name, written bare, reads as the release name the way the live
  // examples already print it (src/scripts/live-shader-compile.ts).
  const prose = (text: string): string =>
    referenceProse(text).replace(/\bshader-dsl\b/g, 'typeshade');
  return {
    ...code,
    docs: code.docs.map(prose).filter((p) => p.length > 0),
    hint: code.hint ? prose(code.hint) : '',
  };
}

/** The TS_CODES header, paragraph by paragraph, for the index's note on numbering. */
export function tsRegistryHeader(): readonly string[] {
  return readTsRegistry().header;
}

/** How many codes of each kind the pin carries, for `facts`. Cheap: nothing is compiled. */
export function errorCodeCounts(): {
  readonly ts: number;
  readonly sd: number;
  readonly retired: number;
} {
  const reg = readTsRegistry();
  return {
    ts: reg.codes.length - reg.retired.length,
    sd: readSdRegistry().length,
    retired: reg.retired.length,
  };
}

/** Every code's registry text as the compiler writes it, docs and hint together. Cheap:
 *  nothing is compiled. src/lib/design-rules.ts reads the rules a code's text names here. */
export function registryTexts(): ReadonlyMap<string, string> {
  return new Map(
    [...readTsRegistry().codes, ...readSdRegistry()].map((c) => [
      c.code,
      [...c.docs, c.hint].join(' '),
    ]),
  );
}

/** The front end's codes by constant name, `LAYOUT` to `TS8051`. */
export function tsCodeNames(): ReadonlyMap<string, string> {
  return new Map(
    readTsRegistry()
      .codes.filter((c) => c.name)
      .map((c) => [c.name!, c.code]),
  );
}

const slugOf = (code: string): string => code.toLowerCase();

let pathCache: ReadonlyMap<string, string> | null = null;

/** The page of a code, `/reference/errors/ts8022/`, or undefined for a code neither registry
 *  holds. The site links a code wherever it prints one through this. */
export function errorCodePath(code: string): string | undefined {
  if (!pathCache) {
    const all = [...readTsRegistry().codes, ...readSdRegistry()];
    pathCache = new Map(all.map((c) => [c.code, `/reference/errors/${slugOf(c.code)}/`]));
  }
  return pathCache.get(code);
}

// ── where the compiler raises each code ────────────────────────────────────────────────

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts'))
      out.push(full);
  }
  return out;
}

let sitesCache: ReadonlyMap<string, ErrorSite[]> | null = null;

/** Every non-comment line of the compiler's source that names a code: `TS_CODES.NAME` for the
 *  front end, a quoted `'SD0000'` for the core. The two registries themselves are left out. */
function raiseSites(): ReadonlyMap<string, ErrorSite[]> {
  if (sitesCache) return sitesCache;
  const byName = new Map(
    readTsRegistry()
      .codes.filter((c) => c.name)
      .map((c) => [c.name!, c.code]),
  );
  const root = path.resolve(ROOT);
  const hits = new Map<string, Map<string, { line: number; count: number }>>();
  const add = (code: string, file: string, line: number): void => {
    const files = hits.get(code) ?? new Map<string, { line: number; count: number }>();
    const at = files.get(file);
    if (at) at.count++;
    else files.set(file, { line, count: 1 });
    hits.set(code, files);
  };
  for (const full of sourceFiles(path.join(root, 'src'))) {
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (rel === TS_FILE || rel === SD_FILE) continue;
    const lines = readFileSync(full, 'utf8').split('\n');
    lines.forEach((text, i) => {
      const t = text.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      for (const m of text.matchAll(/\bTS_CODES\.([A-Z0-9_]+)\b/g)) {
        const code = byName.get(m[1]!);
        if (code) add(code, rel, i + 1);
      }
      for (const m of text.matchAll(/'(SD\d{4})'/g)) add(m[1]!, rel, i + 1);
    });
  }
  sitesCache = new Map(
    [...hits].map(([code, files]) => [
      code,
      [...files]
        .map(([file, at]) => ({ file, line: at.line, count: at.count }))
        .sort((a, b) => a.file.localeCompare(b.file)),
    ]),
  );
  return sitesCache;
}

// ── the examples ───────────────────────────────────────────────────────────────────────

interface ExampleSpec {
  readonly trigger: string;
  readonly fix: string;
  /** The other files of the program, by name. A trigger or a fix that imports one reads it
   *  through `compile()`'s `readDocument` (Rule 3.9), and the page shows each under the fix. */
  readonly files?: Readonly<Record<string, string>>;
  readonly deprecations?: true;
  readonly consoleGpu?: true;
}

interface CounterpartSpec {
  readonly code: string;
  readonly program: string;
}

// Every program is a whole "use typeshade" file, the shape a reader pastes into the
// Playground. Most are one fragment entry with the mistake in it; the fix changes the least
// it can. The trigger is held to producing its code and the fix to compiling clean, below.
const EXAMPLES: Readonly<Record<string, ExampleSpec>> = {
  TS8001: {
    trigger: `@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8002: {
    trigger: `"use typeshade"

function shade(x: float): f32 {
  return x * 0.5
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x), 1.)
}
`,
    fix: `"use typeshade"

function shade(x: f32): f32 {
  return x * 0.5
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x), 1.)
}
`,
  },
  TS8003: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv + vec3(0.5, 0.5, 0.5), 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(vec3(uv, 0.) + vec3(0.5, 0.5, 0.5), 1.)
}
`,
  },
  TS8004: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, brightness(uv), 1.)
}
`,
    fix: `"use typeshade"
import { brightness } from "./brightness.shade.ts"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, brightness(uv), 1.)
}
`,
    files: {
      'brightness.shade.ts': `"use typeshade"

export function brightness(uv: vec2): f32 {
  return (uv.x + uv.y) * 0.5
}
`,
    },
  },
  TS8005: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const g = uv.x
  g = g * 2.
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = uv.x
  g = g * 2.
  return vec4(g, g, g, 1.)
}
`,
  },
  TS8006: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.
  let n: i32 = 8
  for (let i = 0; i < n; i++) {
    n -= 1
    g += 0.1
  }
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.
  let n: i32 = 8
  const count = n
  for (let i = 0; i < count; i++) {
    n -= 1
    g += 0.1
  }
  return vec4(g, g, g, 1.)
}
`,
  },
  TS8007: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = uv.x
  while (true) {
    g = g * 0.5
  }
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = uv.x
  for (let i = 0; i < 4; i++) {
    g = g * 0.5
  }
  return vec4(g, g, g, 1.)
}
`,
  },
  TS8008: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.
  for (let t: f32 = 0.; t < 1.; t += 0.25) {
    g += t * uv.x
  }
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.
  for (let i = 0; i < 4; i++) {
    g += f32(i) * 0.25 * uv.x
  }
  return vec4(g, g, g, 1.)
}
`,
  },
  TS8009: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  if (uv.x > 0.5) {
    break
  }
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  if (uv.x > 0.5) {
    return vec4(0., 0., 0., 1.)
  }
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8010: {
    trigger: `"use typeshade"

class Tint {
  rgb: vec3
  alpha: f32
}

function tint(uv: vec2): Tint {
  return { rgb: vec3(uv, 0.) }
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(tint(uv).rgb, 1.)
}
`,
    fix: `"use typeshade"

class Tint {
  rgb: vec3
  alpha: f32
}

function tint(uv: vec2): Tint {
  return { rgb: vec3(uv, 0.), alpha: 1. }
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(tint(uv).rgb, 1.)
}
`,
  },
  TS8013: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  try {
    return vec4(uv, 0., 1.)
  } catch (e) {
    return vec4(0., 0., 0., 1.)
  }
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8014: {
    trigger: `"use typeshade"

let frame = 0
frame++

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

class Uniforms {
  frame: f32
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, fract(u.frame / 60.), 1.)
}
`,
  },
  TS8015: {
    trigger: `"use typeshade"

declare const data: storage<array<f32>, "read_write">
declare const k: uniform<f32>

@compute([64])
export function double(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, k, 1.)
}
`,
    fix: `"use typeshade"

declare const data: storage<array<f32>, "read_write">

@compute([64])
export function double(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
  },
  TS8016: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const w = array<f32, 3>(0.2, 0.5, 0.3)
  return vec4(uv, w[3], 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const w = array<f32, 3>(0.2, 0.5, 0.3)
  return vec4(uv, w[2], 1.)
}
`,
  },
  TS8017: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.
  switch (i32(uv.x * 4.)) {
    case 0: g = 0.25; break
    case 0: g = 0.5; break
    default: g = 1.
  }
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.
  switch (i32(uv.x * 4.)) {
    case 0: g = 0.25; break
    case 1: g = 0.5; break
    default: g = 1.
  }
  return vec4(g, g, g, 1.)
}
`,
  },
  TS8018: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  vec2(uv).x = 1.
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let st = uv
  st.x = 1.
  return vec4(st, 0., 1.)
}
`,
  },
  TS8019: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8020: {
    trigger: `"use typeshade"

function shade(x?: f32): f32 {
  return 0.5
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x), 1.)
}
`,
    fix: `"use typeshade"

function shade(x: f32 = 0.5): f32 {
  return x
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x), 1.)
}
`,
  },
  TS8021: {
    trigger: `"use typeshade"

function shade(x: f32): f32 {
  if (x > 0.5) {
    return
  }
  return x * 0.5
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x), 1.)
}
`,
    fix: `"use typeshade"

function shade(x: f32): f32 {
  if (x > 0.5) {
    return 1.
  }
  return x * 0.5
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x), 1.)
}
`,
  },
  TS8022: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, gain, 1.)
}
`,
    fix: `"use typeshade"

const gain = 0.5

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, gain, 1.)
}
`,
  },
  TS8023: {
    trigger: `"use typeshade"

function shade(x: f32): f32 {
  return x * 0.5
}

function shade(x: f32): f32 {
  return x * 0.25
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x), 1.)
}
`,
    fix: `"use typeshade"

function shade(x: f32): f32 {
  return x * 0.5
}

function shadeQuarter(x: f32): f32 {
  return x * 0.25
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, shade(uv.x) + shadeQuarter(uv.y), 1.)
}
`,
  },
  TS8024: {
    trigger: `"use typeshade"

@fragment
export function main(@builtin("frag_coord") p: vec4): vec4 {
  return vec4(p.xy / 512., 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@builtin("position") p: vec4): vec4 {
  return vec4(p.xy / 512., 0., 1.)
}
`,
  },
  TS8025: {
    trigger: `"use typeshade"

@fragment
export function main(@builtin("vertex_index") i: u32): vec4 {
  return vec4(f32(i), 0., 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@builtin("position") p: vec4): vec4 {
  return vec4(p.x / 512., 0., 0., 1.)
}
`,
  },
  TS8026: {
    trigger: `"use typeshade"

declare const data: storage<array<f32>, "read_write">

@compute([32, 16, 1])
export function main(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
    fix: `"use typeshade"

declare const data: storage<array<f32>, "read_write">

@compute([16, 16, 1])
export function main(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
  },
  TS8027: {
    trigger: `"use typeshade"

class Uniforms {
  m: mat3x2<f64>
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

class Uniforms {
  m: mat3<f64>
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8028: {
    trigger: `"use typeshade"

@fragmnt
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8029: {
    trigger: `"use typeshade"

class FsIn {
  @builtin("position") pos: vec4
  uv: vec2
}

@fragment
export function main(v: FsIn): vec4 {
  return vec4(v.uv, 0., 1.)
}
`,
    fix: `"use typeshade"

class FsIn {
  @builtin("position") pos: vec4
  @location(0) uv: vec2
}

@fragment
export function main(v: FsIn): vec4 {
  return vec4(v.uv, 0., 1.)
}
`,
  },
  TS8030: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8031: {
    trigger: `"use typeshade"

function fold(x: f32): f32 {
  if (x < 1.) {
    return x
  }
  return fold(x * 0.5)
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, fold(uv.x * 8.), 1.)
}
`,
    fix: `"use typeshade"

function fold(x: f32): f32 {
  let y = x
  for (let i = 0; i < 8; i++) {
    if (y < 1.) {
      break
    }
    y = y * 0.5
  }
  return y
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, fold(uv.x * 8.), 1.)
}
`,
  },
  TS8032: {
    trigger: `"use typeshade"

declare const u: uniform<array<f32>>

function count(): f32 {
  return f32(u.length)
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, count(), 1.)
}
`,
    fix: `"use typeshade"

class UData {
  items: array<f32, 3>
}

declare const u: uniform<UData>

function count(): f32 {
  return f32(u.items.length)
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, count(), 1.)
}
`,
  },
  TS8033: {
    trigger: `"use typeshade"

let tile: workgroup<array<f32, 64>>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, tile[0], 1.)
}
`,
    fix: `"use typeshade"

let tile: array<f32, 64>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, tile[0], 1.)
}
`,
  },
  TS8034: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  workgroupBarrier()
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8035: {
    trigger: `"use typeshade"

class Ray {
  origin: vec3
  static count: f32 = 0.
  static { Ray.count = 1. }
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

class Ray {
  origin: vec3
  static count: f32 = 1.
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8036: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const n = vec3(0., 0., 1.)
  return vec4(uv, dot(n, uv), 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const n = vec3(0., 0., 1.)
  return vec4(uv, dot(n, vec3(uv, 1.)), 1.)
}
`,
  },
  TS8037: {
    trigger: `"use typeshade"

declare const data: storage<array<f32>, "read_write">

@compute(64)
export function main(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
    fix: `"use typeshade"

declare const data: storage<array<f32>, "read_write">

@compute([64])
export function main(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
  },
  TS8038: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2<f64>): vec4 {
  return vec4(f32(uv.x), f32(uv.y), 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv.x, uv.y, 0., 1.)
}
`,
  },
  TS8041: {
    trigger: `"use typeshade"

declare const tex: texture_2d<f32>
declare const smp: sampler

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return textureSample(tex, smp, vec3(uv, 0.))
}
`,
    fix: `"use typeshade"

declare const tex: texture_2d<f32>
declare const smp: sampler

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return textureSample(tex, smp, uv)
}
`,
  },
  TS8050: {
    trigger: `"use typeshade"
"enable f61";

declare const data: storage<array<f32>, "read_write">

@compute([64])
export function main(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
    fix: `"use typeshade"
"enable f16";

declare const data: storage<array<f32>, "read_write">

@compute([64])
export function main(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
  },
  TS8051: {
    trigger: `"use typeshade"

class Uniforms {
  on: bool
  gain: f32
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv * u.gain, 0., 1.)
}
`,
    fix: `"use typeshade"

class Uniforms {
  on: u32
  gain: f32
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv * u.gain, 0., 1.)
}
`,
  },
  TS8052: {
    trigger: `"use typeshade"

declare const tex: texture_2d<f32>
declare const smp: sampler

@fragment
export function main(@location(0) uv: vec2): vec4 {
  if (uv.x > 0.5) {
    return textureSample(tex, smp, uv)
  }
  return vec4(0., 0., 0., 1.)
}
`,
    fix: `"use typeshade"

declare const tex: texture_2d<f32>
declare const smp: sampler

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const c = textureSample(tex, smp, uv)
  if (uv.x > 0.5) {
    return c
  }
  return vec4(0., 0., 0., 1.)
}
`,
  },
  TS8053: {
    deprecations: true,
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const k = 2
  return vec4(uv * k, 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const k = 2.
  return vec4(uv * k, 0., 1.)
}
`,
  },
  TS8068: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const arguments = uv.x * 0.5
  return vec4(uv * arguments, 0., 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const w = uv.x * 0.5
  return vec4(uv * w, 0., 1.)
}
`,
  },
  TS8069: {
    trigger: `const width = 640

"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

const width = 640

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  TS8071: {
    consoleGpu: true,
    trigger: `"use typeshade"

function lift(x: f32): f32 {
  console.log("x =", x)
  return x
}

@vertex
export function vs(@builtin("vertex_index") vi: u32): vec4 {
  return vec4(lift(f32(vi)), 0., 0., 1.)
}

@fragment
export function fs(@builtin("position") p: vec4): vec4 {
  return vec4(p.x, 0., 0., 1.)
}
`,
    fix: `"use typeshade"

function lift(x: f32): f32 {
  return x
}

@vertex
export function vs(@builtin("vertex_index") vi: u32): vec4 {
  return vec4(lift(f32(vi)), 0., 0., 1.)
}

@fragment
export function fs(@builtin("position") p: vec4): vec4 {
  console.log("x =", p.x)
  return vec4(p.x, 0., 0., 1.)
}
`,
  },
  TS8072: {
    trigger: `"use typeshade"
import { wave } from "./wav.shade.ts"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, wave(uv), 1.)
}
`,
    fix: `"use typeshade"
import { wave } from "./wave.shade.ts"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, wave(uv), 1.)
}
`,
    files: {
      'wave.shade.ts': `"use typeshade"

export function wave(p: vec2): f32 {
  return sin(p.x * 6.) * cos(p.y * 6.) * 0.5 + 0.5
}
`,
    },
  },
  TS8075: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g: f32
  if (uv.x > 0.5) {
    g = 1.
  }
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g: f32
  if (uv.x > 0.5) {
    g = 1.
  } else {
    g = 0.25
  }
  return vec4(g, g, g, 1.)
}
`,
  },
  TS8077: {
    trigger: `"use typeshade"

@workgroup_size([128])
export function total(xs: array<f32>): f32 {
  let s = 0.
  for (let i: u32 = 0; i < xs.length; i++) {
    s += xs[i]
  }
  return s
}
`,
    fix: `"use typeshade"

export function total(xs: array<f32>): f32 {
  let s = 0.
  for (let i: u32 = 0; i < xs.length; i++) {
    s += xs[i]
  }
  return s
}
`,
  },
  TS8099: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.
  do {
    g += 0.5
  } while (g < 1.)
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  let g = 0.5
  while (g < 1.) {
    g += 0.5
  }
  return vec4(g, g, g, 1.)
}
`,
  },
  SD0030: {
    trigger: `"use typeshade"

declare const data: storage<array<f32>, "read_write">

@compute([64])
export function double(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
    fix: `"use typeshade"

declare const data: storage<array<f32>, "read_write">

@compute([64])
export function double(@builtin("global_invocation_id") id: vec3u): void {
  data[id.x] = data[id.x] * 2.
}
`,
  },
  SD0043: {
    trigger: `"use typeshade"

class Uniforms {
  x: f64
}

declare const u: uniform<Uniforms>

function df64_add(a: f32, b: f32): f32 {
  return a + b
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, df64_add(f32(u.x * u.x), 0.), 1.)
}
`,
    fix: `"use typeshade"

class Uniforms {
  x: f64
}

declare const u: uniform<Uniforms>

function addNarrow(a: f32, b: f32): f32 {
  return a + b
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, addNarrow(f32(u.x * u.x), 0.), 1.)
}
`,
  },
  SD0108: {
    trigger: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const g = smoothstep(0.8, 0.2, uv.x)
  return vec4(g, g, g, 1.)
}
`,
    fix: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const g = 1. - smoothstep(0.2, 0.8, uv.x)
  return vec4(g, g, g, 1.)
}
`,
  },
};

// The SD codes a "use typeshade" file cannot reach because the front end refuses the same
// mistake first, under its own code. The program is held to producing that code and to not
// producing the SD one, so the sentence the page builds from this cannot drift from the pin.
const COUNTERPARTS: Readonly<Record<string, CounterpartSpec>> = {
  SD0001: {
    code: 'TS8003',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const m = mat3(1., 0., 0., 0., 1., 0., 0., 0., 1.)
  return vec4(m * uv, 1.)
}
`,
  },
  SD0002: {
    code: 'TS8003',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(vec3(1., 0., 0.) + uv, 1.)
}
`,
  },
  SD0003: {
    code: 'TS8003',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const b = uv.x > 0.5
  return vec4(uv, b + 1., 1.)
}
`,
  },
  SD0004: {
    code: 'TS8003',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const m = mat2(1., 0., 0., 1.)
  const k = m + 1.
  return vec4(uv, 0., 1.)
}
`,
  },
  SD0006: {
    code: 'TS8022',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const s = uv.x
  return vec4(s.x, 0., 0., 1.)
}
`,
  },
  SD0007: {
    code: 'TS8022',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv.x, uv.y, uv.z, 1.)
}
`,
  },
  SD0008: {
    code: 'TS8022',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const s = uv.x
  return vec4(s.xy, 0., 1.)
}
`,
  },
  SD0009: {
    code: 'TS8003',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, select(0., 1., uv.x), 1.)
}
`,
  },
  SD0010: {
    code: 'TS8003',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, uv.x > 0.5 ? uv : 1., 1.)
}
`,
  },
  SD0014: {
    code: 'TS8014',
    program: `"use typeshade"

declare const tint: override<vec3>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  SD0015: {
    code: 'TS8041',
    program: `"use typeshade"

declare const tex: texture_2d_array<f32>
declare const smp: sampler

@fragment
export function main(@location(0) uv: vec2): vec4 {
  return textureSample(tex, smp, uv, 1.5)
}
`,
  },
  SD0017: {
    code: 'TS8003',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const k: i32 = 3000000000
  return vec4(uv, f32(k), 1.)
}
`,
  },
  SD0020: {
    code: 'TS8010',
    program: `"use typeshade"

class VsOut {
  @builtin("position") pos: vec4
  @location(0) uv: vec2
}

@vertex
export function vs(@builtin("vertex_index") i: u32): VsOut {
  return { pos: vec4(0., 0., 0., 1.), uv: vec2(0., 0.) }
}

@fragment
export function fs(@location(1) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`,
  },
  // A matrix of doubles has a df64 body for `*` alone. Since proposal 0008 the front end refuses
  // `+`, `-` and their compound forms on one by the operands' kind (Rule 7.1), naming the
  // matrix's own declaration as the remedy, before the fp64 pass could raise SD0041.
  SD0041: {
    code: 'TS8003',
    program: `"use typeshade"

class Uniforms {
  m: mat3<f64>
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const k = u.m + u.m
  return vec4(uv, 0., 1.)
}
`,
  },
  SD0044: {
    code: 'TS8038',
    program: `"use typeshade"

@fragment
export function main(@location(0) d: f64): vec4 {
  return vec4(f32(d), 0., 0., 1.)
}
`,
  },
  SD0107: {
    code: 'TS8005',
    program: `"use typeshade"

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const g = uv.x
  g = g * 2.
  return vec4(g, g, g, 1.)
}
`,
  },
  SD0109: {
    code: 'TS8099',
    program: `"use typeshade"

class VsOut {
  @builtin("position") pos: vec4
  @location(0) uv: vec2
}

@vertex
export function vs(@builtin("vertex_index") i: u32): VsOut {
  const x = f32(i)
  return { pos: vec4(x, dpdx(x), 0., 1.), uv: vec2(0., 0.) }
}

@fragment
export function fs(v: VsOut): vec4 {
  return vec4(v.uv, 0., 1.)
}
`,
  },
};

/** The codes whose page carries a program written by hand here, an example or a front-end
 *  counterpart. A page like that explains the rules its code enforces, so the drift guard in
 *  src/lib/design-rules.ts asks for those rules' fingerprints. */
export function writtenExampleCodes(): ReadonlySet<string> {
  return new Set([...Object.keys(EXAMPLES), ...Object.keys(COUNTERPARTS)]);
}

// The SD codes the registry itself calls an internal invariant: a program is not meant to
// raise one. The hint says so in the registry's own words, which the page quotes.
const INTERNAL: ReadonlySet<string> = new Set(['SD0040']);

// ── compiling them ─────────────────────────────────────────────────────────────────────

const flat = (message: string): string => message.replace(/\s*\n\s*/g, ' ').trim();

function compiled(
  source: string,
  deprecations: boolean,
  consoleGpu = false,
  files: Readonly<Record<string, string>> = {},
): ReturnType<typeof compile> {
  return compile(source, {
    fileName: 'example.shade.ts',
    readDocument: (name) => files[name],
    ...(deprecations ? { deprecations: true } : {}),
    ...(consoleGpu ? { console: 'gpu' as const } : {}),
  });
}

function reportOf(result: ReturnType<typeof compile>): ReportedDiagnostic[] {
  return result.diagnostics.map((d) => ({
    code: d.code ?? '',
    severity: d.category,
    line: d.line,
    message: flat(d.message),
  }));
}

/** The emitters compile() runs, run again on the module it returned, for the error one of
 *  them threw. compile() keeps only the error's message. */
function thrownBy(result: ReturnType<typeof compile>): { code: string; message: string }[] {
  const out: { code: string; message: string }[] = [];
  // compile() asks GLSL ES 3.00 only for a module with a render entry, since a compute-only
  // module has nothing that target could serve; the same rule holds here.
  const render = result.module.funcs.some((f) => f.stage === 'vertex' || f.stage === 'fragment');
  for (const emit of render ? [emitModule, emitGlslStages] : [emitModule]) {
    try {
      emit(result.module);
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      out.push({
        code: typeof code === 'string' ? code : '',
        message: flat(error instanceof Error ? error.message : String(error)),
      });
    }
  }
  return out;
}

const names = (text: string, code: string): boolean => new RegExp(`\\[${code}\\]`).test(text);

function exampleFor(
  code: string,
  family: ErrorFamily,
  spec: ExampleSpec,
): { example: ErrorExample | null; problem: string | null } {
  const deprecations = spec.deprecations === true;
  const consoleGpu = spec.consoleGpu === true;
  const files = spec.files ?? {};
  const result = compiled(spec.trigger, deprecations, consoleGpu, files);
  const report = reportOf(result);
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  let channel: ErrorChannel | null = null;
  let diagnostics = report;
  let thrown: ReportedDiagnostic | null = null;
  if (report.some((d) => d.code === code || (family === 'sd' && names(d.message, code)))) {
    channel = 'compile';
  } else if (family === 'sd' && errors.length === 0) {
    const hit = thrownBy(result).find((t) => t.code === code);
    if (hit) {
      channel = 'backend';
      thrown = { code: hit.code, severity: 'error', line: 0, message: hit.message };
    } else {
      const found = diagnose(result.module).diagnostics.filter((d) => d.code === code);
      if (found.length > 0) {
        channel = 'diagnose';
        diagnostics = found.map((d) => ({
          code: d.code ?? '',
          severity: d.severity,
          line: 0,
          message: flat(d.message),
        }));
      }
    }
  }
  if (!channel) {
    const shown = report.map((d) => `${d.code || '-'} ${d.message}`).join('; ') || 'nothing';
    return {
      example: null,
      problem: `${code}: the example no longer produces ${code}; the compiler reported ${shown}`,
    };
  }

  const fixed = compiled(spec.fix, deprecations, consoleGpu, files);
  const left = fixed.diagnostics.filter((d) => d.category === 'error' || d.category === 'warning');
  if (left.length > 0) {
    return {
      example: null,
      problem: `${code}: the fix does not compile clean: ${left.map((d) => `${d.code ?? '-'} ${flat(d.message)}`).join('; ')}`,
    };
  }
  if (family === 'sd') {
    const still = thrownBy(fixed).find((t) => t.code === code);
    if (still)
      return { example: null, problem: `${code}: the fix still makes the emitter throw ${code}` };
    if (diagnose(fixed.module).diagnostics.some((d) => d.code === code)) {
      return { example: null, problem: `${code}: diagnose() still reports ${code} on the fix` };
    }
  }
  return {
    example: {
      trigger: spec.trigger,
      fix: spec.fix,
      channel,
      diagnostics,
      thrown,
      deprecations,
      consoleGpu,
      files: Object.entries(files).map(([name, text]) => ({ name, text })),
    },
    problem: null,
  };
}

function counterpartFor(
  code: string,
  spec: CounterpartSpec,
): { counterpart: ErrorCounterpart | null; problem: string | null } {
  const result = compiled(spec.program, false);
  const report = reportOf(result);
  if (!report.some((d) => d.code === spec.code)) {
    return {
      counterpart: null,
      problem: `${code}: the front-end program no longer produces ${spec.code}; the compiler reported ${report.map((d) => `${d.code} ${d.message}`).join('; ') || 'nothing'}`,
    };
  }
  if (report.some((d) => names(d.message, code))) {
    return {
      counterpart: null,
      problem: `${code}: the front-end program now reaches ${code} itself, so it has an example to write`,
    };
  }
  return {
    counterpart: { code: spec.code, program: spec.program, diagnostics: report },
    problem: null,
  };
}

/** Inline code spans in a piece of registry text. */
const spansOf = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);

let cache: readonly ErrorCodeEntry[] | null = null;

function build(): readonly ErrorCodeEntry[] {
  const reg = readTsRegistry();
  const raw = [...reg.codes, ...readSdRegistry()].map(printable);
  const known = new Set(raw.map((c) => c.code));
  const byName = new Map(reg.codes.filter((c) => c.name).map((c) => [c.name!, c.code]));
  const sites = raiseSites();
  const problems: string[] = [];

  for (const key of [...Object.keys(EXAMPLES), ...Object.keys(COUNTERPARTS), ...INTERNAL]) {
    if (!known.has(key))
      problems.push(`${key}: an example is written for a code neither registry carries at the pin`);
  }

  const entries = raw.map((c) => {
    const retired = c.family === 'ts' && c.name === null;
    const spec = EXAMPLES[c.code];
    let example: ErrorExample | null = null;
    if (spec) {
      const got = exampleFor(c.code, c.family, spec);
      if (got.problem) problems.push(got.problem);
      example = got.example;
    }
    let counterpart: ErrorCounterpart | null = null;
    const cp = COUNTERPARTS[c.code];
    if (cp) {
      const got = counterpartFor(c.code, cp);
      if (got.problem) problems.push(got.problem);
      counterpart = got.counterpart;
    }
    const gap: ErrorGap | null = example
      ? null
      : retired
        ? 'retired'
        : counterpart
          ? 'frontEnd'
          : INTERNAL.has(c.code)
            ? 'internal'
            : c.family === 'sd'
              ? 'builder'
              : 'unwritten';
    const text = [...c.docs, c.hint].join(' ');
    const related = new Set<string>();
    for (const m of text.matchAll(/\b(TS8\d{3}|SD\d{4})\b/g)) related.add(m[1]!);
    for (const span of spansOf(text)) {
      const named = byName.get(span);
      if (named) related.add(named);
    }
    if (counterpart) related.add(counterpart.code);
    for (const d of [
      ...(example?.diagnostics ?? []),
      ...(example?.thrown ? [example.thrown] : []),
    ]) {
      if (d.code) related.add(d.code);
      for (const m of d.message.matchAll(/\[(SD\d{4})\]/g)) related.add(m[1]!);
    }
    if (c.family === 'ts') {
      for (const [sd, p] of Object.entries(COUNTERPARTS)) if (p.code === c.code) related.add(sd);
    }
    related.delete(c.code);
    return {
      code: c.code,
      slug: slugOf(c.code),
      family: c.family,
      name: c.name,
      group: retired ? 'retired' : (GROUP_OF[c.name ?? c.code] ?? 'other'),
      docs: c.docs,
      line: c.docs.length === 0 ? '' : c.family === 'sd' ? c.docs[0]! : firstSentence(c.docs[0]!),
      hint: c.hint,
      sites: sites.get(c.code) ?? [],
      example,
      counterpart,
      gap,
      related: [...related].filter((r) => known.has(r)).sort(),
      spans: [...new Set(spansOf(text))],
    } satisfies ErrorCodeEntry;
  });

  if (problems.length > 0) throw new Error(`[error-codes] ${problems.join('\n')}`);
  return entries;
}

/** Every code, front end first, each family in the registry's own numeric order. */
export function errorCodes(): readonly ErrorCodeEntry[] {
  if (!cache) cache = build();
  return cache;
}

export function errorCode(slug: string): ErrorCodeEntry {
  const found = errorCodes().find((e) => e.slug === slug);
  if (!found) throw new Error(`[error-codes] no code with the page '${slug}'`);
  return found;
}

/** The codes of one family under the groups the index lists them in, empty groups left out. */
export function errorGroups(
  family: ErrorFamily,
): { group: ErrorGroup; entries: ErrorCodeEntry[] }[] {
  const order = family === 'ts' ? TS_GROUPS : SD_GROUPS;
  const all = errorCodes().filter((e) => e.family === family);
  return order
    .map((group) => ({ group, entries: all.filter((e) => e.group === group) }))
    .filter((g) => g.entries.length > 0);
}

/** The order previous and next walk the pages in: the index's own order. */
export function errorPageOrder(): readonly ErrorCodeEntry[] {
  return [...errorGroups('ts'), ...errorGroups('sd')].flatMap((g) => g.entries);
}

export function errorCodePaths(): { params: { code: string }; props: { slug: string } }[] {
  return errorCodes().map((e) => ({ params: { code: e.slug }, props: { slug: e.slug } }));
}

/** A source site as a link at the pinned commit, built by the page from the mirror's URL. */
export const siteHref = (mirror: string, commit: string, site: ErrorSite): string =>
  `${mirror}/blob/${commit}/${site.file}#L${site.line}`;

/** Holds the dictionary's lines for undocumented front-end codes to the registry: every TS
 *  code the registry leaves undocumented needs one, and a code the registry documents now
 *  has its own line, so the dictionary's goes. */
export function assertErrorLines(lines: Readonly<Record<string, string>>): void {
  const problems: string[] = [];
  for (const e of errorCodes()) {
    if (e.family !== 'ts' || !e.name) continue;
    const has = Object.hasOwn(lines, e.name);
    if (e.line === '' && !has)
      problems.push(`${e.code} ${e.name} has no JSDoc and no line in docs.errors.lines`);
    if (e.line !== '' && has)
      problems.push(
        `${e.code} ${e.name} is documented by the registry now; drop its line from docs.errors.lines`,
      );
  }
  const names = new Set(errorCodes().map((e) => e.name));
  for (const key of Object.keys(lines))
    if (!names.has(key))
      problems.push(`docs.errors.lines names ${key}, which TS_CODES no longer carries`);
  if (problems.length > 0) throw new Error(`[error-codes] ${problems.join('\n')}`);
}
