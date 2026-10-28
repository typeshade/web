// The data behind /reference/, the reference for the language a file that starts with
// "use typeshade" is written in. Nothing here is typed by hand. The documented surface is
// the compiler's own: the six `*_DOCS` tables in vendor/shader-dsl/src/language-service/
// docs.ts hold one Markdown sentence per name, and `SHADE_DTS` in ambient.ts is the ambient
// `.d.ts` the editor loads, which carries the declaration of every one of them. Both are
// public through the compiler's ./language-service subpath, and the same pair feeds hover
// and completion in the Playground, so a reference page and an editor tooltip cannot say
// two different things.
//
// The tables are imported. api.ts and builtin-table.ts transpile a compiler file and run it
// in a bare module object instead, because they read tables out of modules the barrel does
// not export; the language service's index does export these, and its import chain
// (docs.ts -> compiler/ts/type-map.ts -> typescript) resolves the same way the rest of the
// site's vendor imports already do (src/lib/concepts-emit.ts, src/lib/examples.ts).
//
// What an entry carries: the name, the declaration lifted out of SHADE_DTS, the parameters
// and return types parsed out of that same declaration, the sentence from its table, what
// the CPU oracle does with the name, and for a builtin function the WGSL and GLSL ES 3.00
// text the spelling registry writes (src/lib/builtin-table.ts, which already runs those
// templates). A documented name with no declaration, or a declaration with no documented
// name, stops the build and is named in the message.
//
// Each entry has a page of its own at /reference/<kind>/<name>/, the shape /api/ already
// uses. The kind is a path segment, so the 58 names two tables document at once keep the
// spelling their table gives them: /reference/types/f32/ and /reference/functions/f32/ are
// two paths and neither carries a suffix. The six /reference/<kind>/ pages are the indexes
// over those pages, and languageEntryPaths() is what the two route files build from.
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ATTRIBUTE_DOCS,
  BUILTIN_DOCS,
  CONSTANT_DOCS,
  FUNCTION_DOCS,
  MATH_MEMBER_DOCS,
  SHADE_DTS,
  TYPE_DOCS,
  WGSL_BUILTIN_NAMES,
} from '../../vendor/shader-dsl/src/language-service/index.ts';
import { typeKey } from '../../vendor/shader-dsl/src/index.ts';
// The declare-once tables are `typeshade/core/ir` only since Rule 11.19 (change 0060).
import { WGSL_BUILTIN_TYPES } from '../../vendor/shader-dsl/src/core/ir/index.ts';
import { builtinGroups, type BuiltinFamily, type BuiltinRow } from './builtin-table.ts';

const ROOT = 'vendor/shader-dsl';

/** The six tables, in the order the reference lists them. */
export type LanguageKind = 'type' | 'attribute' | 'builtin' | 'function' | 'constant' | 'math';
export const LANGUAGE_KINDS: readonly LanguageKind[] = [
  'type',
  'attribute',
  'builtin',
  'function',
  'constant',
  'math',
];

/** The route segment each kind sits under. `builtin-values` keeps the `@builtin(...)` ids
 *  apart from the builtin functions, which the guide's builtin table also calls builtins. */
export const LANGUAGE_SLUGS: Readonly<Record<LanguageKind, string>> = {
  type: 'types',
  attribute: 'attributes',
  builtin: 'builtin-values',
  function: 'functions',
  constant: 'constants',
  math: 'math',
};

/** The sections the functions page is cut into. The first ten are the families the builtin
 *  table already groups the spelling registry by (src/lib/builtin-table.ts); the last two
 *  hold the names the registry has no id for, which the front end lowers itself. */
export type LanguageFamily = BuiltinFamily | 'constructors' | 'resources';
export const LANGUAGE_FAMILIES: readonly LanguageFamily[] = [
  'maths',
  'geometry',
  'derivatives',
  'bits',
  'packing',
  'casts',
  'textures',
  'atomics',
  'barriers',
  'f64',
  'constructors',
  'resources',
];

// The families of the documented functions the spelling registry carries no id for: the
// vector and matrix constructors, the array and binding declarators, and the five maths
// names the CPU oracle and the front end lower without an intrinsic. A documented function
// in neither the registry nor this table stops the build in build().
const FAMILY_OF: Readonly<Record<string, LanguageFamily>> = {
  bool: 'casts',
  bitcast: 'casts',
  log10: 'maths',
  log1p: 'maths',
  expm1: 'maths',
  cbrt: 'maths',
  hypot: 'maths',
  random: 'maths',
  // The array operations of compiler #195 (language-design §9.3, "operations"). Their siblings
  // that fold an array (`any`, `all`, `min`, `max`) are maths in the registry, so these are too.
  none: 'maths',
  sum: 'maths',
  zip: 'maths',
  vec2: 'constructors',
  vec3: 'constructors',
  vec4: 'constructors',
  vec2f: 'constructors',
  vec3f: 'constructors',
  vec4f: 'constructors',
  vec2i: 'constructors',
  vec3i: 'constructors',
  vec4i: 'constructors',
  vec2u: 'constructors',
  vec3u: 'constructors',
  vec4u: 'constructors',
  vec2b: 'constructors',
  vec3b: 'constructors',
  vec4b: 'constructors',
  vec2f64: 'constructors',
  vec3f64: 'constructors',
  vec4f64: 'constructors',
  mat2: 'constructors',
  mat2x2: 'constructors',
  mat2x3: 'constructors',
  mat2x4: 'constructors',
  mat3: 'constructors',
  mat3x2: 'constructors',
  mat3x3: 'constructors',
  mat3x4: 'constructors',
  mat4: 'constructors',
  mat4x2: 'constructors',
  mat4x3: 'constructors',
  mat4x4: 'constructors',
  mat2x2f: 'constructors',
  mat2x3f: 'constructors',
  mat2x4f: 'constructors',
  mat3x2f: 'constructors',
  mat3x3f: 'constructors',
  mat3x4f: 'constructors',
  mat4x2f: 'constructors',
  mat4x3f: 'constructors',
  mat4x4f: 'constructors',
  array: 'resources',
  fill: 'resources',
  uniform: 'resources',
  storage: 'resources',
};

// The tables whose bare `number` is the GPU scalar slot. An attribute's `number` is a
// decorator argument the host file writes (`@location(0)`, `@compute([64])`), an ordinary
// JavaScript number and no shader value, so that page says nothing about it. A kind listed
// here whose signatures stop writing `number` stops the build.
const SCALAR_SLOT_KINDS: ReadonlySet<LanguageKind> = new Set<LanguageKind>([
  'type',
  'function',
  'constant',
  'math',
]);

/** Which stage and direction a `@builtin(...)` id is valid in, as the compiler's front end
 *  checks it. An id with no rule is unconstrained. */
export interface BuiltinStageRule {
  readonly stage: string;
  readonly direction: string;
}

/** What the two backends write for a builtin function, from the spelling registry. */
export interface LanguageSpelling {
  readonly wgsl: string | null;
  readonly glsl: string | null;
  /** The registry's own message when GLSL ES 3.00 has no form, with its target prefix gone. */
  readonly glslMessage: string;
  readonly preEmit: boolean;
  /** The family the builtin table groups this id under, for the link back to that table. */
  readonly family: BuiltinFamily;
}

/** One parameter of one overload, as the ambient file declares it. */
export interface LanguageParameter {
  readonly name: string;
  readonly optional: boolean;
  readonly rest: boolean;
  /** The declared type, collapsed to one line. Empty when the declaration writes none. */
  readonly type: string;
}

/** One overload of a declaration: what it takes and what it gives back. A type alias has one
 *  of these too, whose parameters are the alias's type parameters. */
export interface LanguageOverload {
  readonly parameters: readonly LanguageParameter[];
  readonly returns: string | null;
}

/** One row of the Parameters section: the same slot across every overload. The declarations
 *  disagree about a slot's name (a generated `a0` in one overload, `uv` in another) and about
 *  its type (`texture_2d<f32>` and `texture_cube<f32>`), so a row carries every type the
 *  overloads write for it and is marked optional where an overload leaves it out. */
export interface LanguageParameterRow {
  readonly name: string;
  readonly optional: boolean;
  readonly rest: boolean;
  readonly types: readonly string[];
}

/** Another entry of the reference, named from this one: the `Math` spelling of a function,
 *  or the function a `Math` member routes to. */
export interface LanguageAlias {
  readonly kind: LanguageKind;
  readonly name: string;
  /** How that entry heads itself, `Math.abs` or `f32`. */
  readonly title: string;
}

/** What the CPU oracle does with a name: run it in f64, or stand in for it. A name the
 *  oracle's two tables do not hold is null, and the page says nothing about it. */
export type LanguageOracle = 'evaluates' | 'stubs';

/** One documented name. */
export interface LanguageEntry {
  readonly kind: LanguageKind;
  /** The name the table carries it under, which is also its own page's last path segment. */
  readonly name: string;
  /** What the entry is headed with: `@vertex` for an attribute, `Math.abs` for a member. */
  readonly title: string;
  /** The declaration, lifted out of SHADE_DTS. Every overload, one per line. */
  readonly signature: string;
  /** The compiler's own sentence, Markdown with inline code. */
  readonly summary: string;
  /** The first sentence of it, which is the lead a row of the kind's index carries and the
   *  lead an entry page opens with. */
  readonly line: string;
  /** What is left of the sentence after that lead, which is the Description section. Empty
   *  where the compiler wrote one sentence and the lead is the whole of it. */
  readonly rest: string;
  readonly family: LanguageFamily;
  /** Every overload of the declaration, in the order the ambient file writes them. */
  readonly overloads: readonly LanguageOverload[];
  /** Those overloads' parameters merged into one list, in call order. */
  readonly parameters: readonly LanguageParameterRow[];
  /** Every type the overloads return, in the order they appear. */
  readonly returns: readonly string[];
  /** A parameter row above carries a name the ambient file generated from its position. */
  readonly positional: boolean;
  /** A decorator an author writes on its own, with no argument list. `@vertex` has only
   *  that form; `@compute` has it beside the form that takes a workgroup size. */
  readonly bareForm: boolean;
  /** The declaration also names what the TypeScript decorator runtime hands a decorator,
   *  which is no part of what a call writes. */
  readonly protocol: boolean;
  /** This signature writes a bare `number`, which is the scalar slot and not a width an
   *  author declares. The page says so where this is true. */
  readonly showsNumber: boolean;
  /** The undocumented helper types this signature names, in the order they are declared. */
  readonly helpers: readonly LanguageHelper[];
  /** How many swizzle members the signature folds into its `…` line. A vector type declares
   *  every one of them (`xy`, `zyx`, `rgba`), hundreds on a four-component vector, and the
   *  page prints the rest of the interface and says what the line stands for. Zero on every
   *  other entry. */
  readonly elided: number;
  /** The two target spellings, for a function the spelling registry has an id for. */
  readonly spelling: LanguageSpelling | null;
  /** Where a `@builtin(...)` id may be used. Empty means the compiler constrains it nowhere. */
  readonly stages: readonly BuiltinStageRule[];
  /** The same call under its other name, where the surface has two for it. */
  readonly alias: LanguageAlias | null;
  /** What the CPU oracle does with this name, where its tables name it. */
  readonly oracle: LanguageOracle | null;
}

/** A type `SHADE_DTS` declares for its own use, which a signature on a page names and no
 *  `*_DOCS` table documents. The page prints the declaration itself, so the explanation of
 *  one is the compiler's own text. */
export interface LanguageHelper {
  readonly name: string;
  /** The declaration with its line breaks collapsed, so it sets as one wrapped line. */
  readonly declaration: string;
}

export interface LanguageGroup {
  readonly family: LanguageFamily;
  readonly entries: readonly LanguageEntry[];
}

export interface LanguageSection {
  readonly kind: LanguageKind;
  readonly slug: string;
  readonly entries: readonly LanguageEntry[];
  /** The functions index runs in family sections; the other five are one list. */
  readonly groups: readonly LanguageGroup[];
}

// ── SHADE_DTS, parsed once ────────────────────────────────────────────────────────────────

interface Declarations {
  /** The ambient file's own node for each overload, so the signature and the parameter list
   *  below it come off the same parse. */
  readonly functions: ReadonlyMap<string, readonly ts.FunctionDeclaration[]>;
  readonly types: ReadonlyMap<string, ts.TypeAliasDeclaration>;
  /** The types the ambient file declares as interfaces, every declaration of each. The vector
   *  types are among them: a component and a swizzle are members there, so the editor
   *  completes `v.xy` and types it. */
  readonly interfaces: ReadonlyMap<string, readonly ts.InterfaceDeclaration[]>;
  readonly values: ReadonlyMap<string, string>;
  readonly mathMembers: ReadonlyMap<string, ts.TypeElement>;
  /** Every type alias again, each one collapsed to a single line. */
  readonly oneLiners: ReadonlyMap<string, string>;
  /** The `unique symbol` tags the ambient file brands its opaque handles with. */
  readonly brandTags: ReadonlySet<string>;
  readonly source: ts.SourceFile;
}

function declarations(): Declarations {
  const source = ts.createSourceFile('shade.d.ts', SHADE_DTS, ts.ScriptTarget.ES2022, true);
  // A declaration set as one wrapped line: the ambient file breaks a long union and a
  // conditional type over many lines for its own readability, and a leading `|` after the
  // equals sign is part of that formatting.
  const oneLine = (text: string): string =>
    text
      .replace(/\s+/g, ' ')
      .replace(/=\s*\|\s*/, '= ')
      .trim();
  const functions = new Map<string, ts.FunctionDeclaration[]>();
  const types = new Map<string, ts.TypeAliasDeclaration>();
  const interfaces = new Map<string, ts.InterfaceDeclaration[]>();
  const values = new Map<string, string>();
  const oneLiners = new Map<string, string>();
  const brandTags = new Set<string>();
  const mathMembers = new Map<string, ts.TypeElement>();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const overloads = functions.get(statement.name.text) ?? [];
      overloads.push(statement);
      functions.set(statement.name.text, overloads);
    } else if (ts.isTypeAliasDeclaration(statement)) {
      types.set(statement.name.text, statement);
      oneLiners.set(statement.name.text, oneLine(statement.getText(source)));
    } else if (ts.isVariableStatement(statement)) {
      for (const d of statement.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        values.set(d.name.text, statement.getText(source));
        // `declare const vecTag: unique symbol`, the brand behind an opaque handle type.
        if (
          d.type &&
          ts.isTypeOperatorNode(d.type) &&
          d.type.operator === ts.SyntaxKind.UniqueKeyword
        ) {
          brandTags.add(d.name.text);
        }
      }
    } else if (ts.isInterfaceDeclaration(statement)) {
      interfaces.set(statement.name.text, [
        ...(interfaces.get(statement.name.text) ?? []),
        statement,
      ]);
      if (statement.name.text !== 'MathObject') continue;
      for (const member of statement.members) {
        const name = member.name;
        if (!name || !(ts.isIdentifier(name) || ts.isStringLiteral(name))) continue;
        mathMembers.set(name.text, member);
      }
    }
  }
  if (mathMembers.size === 0)
    throw new Error('[language-reference] SHADE_DTS no longer declares a MathObject interface');
  if (brandTags.size === 0)
    throw new Error('[language-reference] SHADE_DTS declares no unique symbol brands any more');
  return { functions, types, interfaces, values, mathMembers, oneLiners, brandTags, source };
}

// ── the parameters and the return type, off the same parse ────────────────────────────────

/** A parameter name the ambient file generated from its position. A call never writes one,
 *  so a page that shows such a row says where the name came from. */
const GENERATED = /^a\d+$/;

/** A type as a row shows it: one line, whatever the ambient file's own line breaks were. */
const flat = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** One overload's parameters and return type. A type alias and an interface go through the
 *  same function: their parameters are their type parameters, and they return nothing. */
function overloadOf(
  node: ts.SignatureDeclarationBase | ts.TypeAliasDeclaration | ts.InterfaceDeclaration,
  source: ts.SourceFile,
): LanguageOverload {
  if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
    return {
      parameters: (node.typeParameters ?? []).map((p) => ({
        name: p.name.text,
        optional: p.default !== undefined,
        rest: false,
        type: p.constraint ? flat(p.constraint.getText(source)) : '',
      })),
      returns: null,
    };
  }
  return {
    parameters: node.parameters.map((p) => ({
      name: p.name.getText(source),
      optional: p.questionToken !== undefined || p.initializer !== undefined,
      rest: p.dotDotDotToken !== undefined,
      type: p.type ? flat(p.type.getText(source)) : '',
    })),
    returns: node.type ? flat(node.type.getText(source)) : null,
  };
}

/** The overloads' parameters as one list. The overloads that carry real names settle the
 *  rows: a slot sits at the earliest position any of them writes it at, and two slots that
 *  share a position (`uv` on a 2d texture, `dir` on a cube) keep the order the overloads
 *  introduced them in. An overload the ambient file named by position has no names to add,
 *  so its types are folded onto the rows by position instead, and where every overload is
 *  like that the longest of them names the rows. A slot an overload leaves out is one a
 *  call may leave out, so the row is marked optional. */
function mergeParameters(overloads: readonly LanguageOverload[]): LanguageParameterRow[] {
  const generated = (o: LanguageOverload): boolean =>
    o.parameters.some((p) => GENERATED.test(p.name));
  const named = overloads.filter((o) => !generated(o));
  const naming =
    named.length > 0
      ? named
      : [...overloads].sort((a, b) => b.parameters.length - a.parameters.length).slice(0, 1);
  interface Slot {
    name: string;
    at: number;
    seq: number;
    optional: boolean;
    rest: boolean;
    types: string[];
  }
  const slots = new Map<string, Slot>();
  for (const o of naming) {
    o.parameters.forEach((p, i) => {
      const slot = slots.get(p.name);
      if (slot) slot.at = Math.min(slot.at, i);
      else
        slots.set(p.name, {
          name: p.name,
          at: i,
          seq: slots.size,
          optional: false,
          rest: false,
          types: [],
        });
    });
  }
  const rows = [...slots.values()].sort((a, b) => a.at - b.at || a.seq - b.seq);
  for (const o of overloads) {
    const byPosition = generated(o);
    const filled = new Set<Slot>();
    o.parameters.forEach((p, i) => {
      let row = byPosition ? rows[i] : rows.find((r) => r.name === p.name);
      if (!row) {
        row = { name: p.name, at: i, seq: rows.length, optional: true, rest: false, types: [] };
        rows.push(row);
      }
      filled.add(row);
      if (p.optional) row.optional = true;
      if (p.rest) row.rest = true;
      if (p.type.length > 0 && !row.types.includes(p.type)) row.types.push(p.type);
    });
    for (const row of rows) if (!filled.has(row)) row.optional = true;
  }
  return rows.map(({ name, optional, rest, types }) => ({ name, optional, rest, types }));
}

// ── the CPU oracle's two tables ───────────────────────────────────────────────────────────

/** `BUILTINS` and `GPU_STUBS` in src/core/cpu-runtime.ts: the builtin ids the oracle runs in
 *  f64, and the GPU-only ones it stands in for. src/lib/api.ts reads the same pair as
 *  `oracleBuiltins` and `oracleStubs` for its Targets table; they are read again here rather
 *  than imported from it, for the reason src/lib/builtin-table.ts gives for repeating its own
 *  dozen lines: scripts/patch-api-categories.mjs rewrites that file during the build, and a
 *  page's data should not come out of a patched module. Both tables are object literals with
 *  identifier keys, so the names come off the AST with nothing evaluated. */
function oracleTables(): { builtins: ReadonlySet<string>; stubs: ReadonlySet<string> } {
  const file = 'src/core/cpu-runtime.ts';
  const abs = path.resolve(process.cwd(), ROOT, file);
  const source = ts.createSourceFile(file, readFileSync(abs, 'utf8'), ts.ScriptTarget.ES2022, true);
  const out = new Map<string, Set<string>>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      (node.name.text === 'BUILTINS' || node.name.text === 'GPU_STUBS') &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const names = new Set<string>();
      for (const p of node.initializer.properties) {
        if (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)))
          names.add(p.name.text);
      }
      out.set(node.name.text, names);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const builtins = out.get('BUILTINS');
  const stubs = out.get('GPU_STUBS');
  if (!builtins?.size || !stubs?.size) {
    throw new Error(
      `[language-reference] ${file} no longer keeps the oracle's names in BUILTINS and GPU_STUBS`,
    );
  }
  return { builtins, stubs };
}

/** The compiler's sentence cut at its first full stop, for a row of a kind's index. A full
 *  stop inside a code span belongs to the code (`fract(sin(dot(seed, k)) * s)`), and so does
 *  one inside `Math.abs`, so the cut only lands where whitespace follows. */
export function firstSentence(text: string): string {
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '`') inCode = !inCode;
    else if (!inCode && c === '.' && /\s/.test(text[i + 1] ?? ' ')) return text.slice(0, i + 1);
  }
  return text;
}

// ── the stage rules, read off the front end's own table ───────────────────────────────────

/** `BUILTIN_STAGE_RULES` in src/compiler/ts/builtin-check.ts, which the compiler keeps as a
 *  module-level `const` and does not export, so it is read from the AST of the file it lives
 *  in. The stage and the direction are string literals, so the table needs no evaluation. */
function stageRules(): ReadonlyMap<string, readonly BuiltinStageRule[]> {
  const file = 'src/compiler/ts/builtin-check.ts';
  const abs = path.resolve(process.cwd(), ROOT, file);
  const source = ts.createSourceFile(file, readFileSync(abs, 'utf8'), ts.ScriptTarget.ES2022, true);
  const out = new Map<string, readonly BuiltinStageRule[]>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'BUILTIN_STAGE_RULES' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        if (
          !property.name ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        )
          continue;
        if (!ts.isArrayLiteralExpression(property.initializer)) continue;
        const rules: BuiltinStageRule[] = [];
        for (const element of property.initializer.elements) {
          if (!ts.isObjectLiteralExpression(element)) continue;
          const read = (key: string): string | undefined => {
            for (const p of element.properties) {
              if (
                ts.isPropertyAssignment(p) &&
                p.name &&
                ts.isIdentifier(p.name) &&
                p.name.text === key &&
                ts.isStringLiteral(p.initializer)
              ) {
                return p.initializer.text;
              }
            }
            return undefined;
          };
          const stage = read('stage');
          const direction = read('direction');
          if (stage && direction) rules.push({ stage, direction });
        }
        out.set(property.name.text, rules);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (out.size === 0)
    throw new Error(
      `[language-reference] ${file} no longer keeps its stage rules in BUILTIN_STAGE_RULES`,
    );
  return out;
}

// ── the entries ───────────────────────────────────────────────────────────────────────────

let cache: readonly LanguageSection[] | null = null;

function build(): readonly LanguageSection[] {
  const decl = declarations();
  const rules = stageRules();

  // The spelling registry, keyed by the id a call carries, and the family the builtin table
  // groups it under. A documented function whose name is one of these ids shows both target
  // spellings and links the row of that table it belongs to.
  const spellings = new Map<string, { row: BuiltinRow; family: BuiltinFamily }>();
  for (const group of builtinGroups())
    for (const row of group.rows) spellings.set(row.id, { row, family: group.family });

  // The `Math.*` surface in both directions, off the same registry rows: the Math name the
  // compiler routes to an id (`Math.round` for `round`, `Math.fround` for `f32`), and the id
  // each of those names reaches.
  const mathNameOfId = new Map<string, string>();
  const idOfMathName = new Map<string, string>();
  for (const [id, { row }] of spellings) {
    if (!row.math) continue;
    mathNameOfId.set(id, row.math);
    idOfMathName.set(row.math.replace(/^Math\./, ''), id);
  }
  const oracle = oracleTables();
  const source = decl.source;

  // Every `declare function` in the ambient file belongs to one of the two tables that
  // document a call: the attributes and the functions. A name in neither is an undocumented
  // call the editor would still offer, so it stops the build here.
  const documentedCalls = new Set([...Object.keys(FUNCTION_DOCS), ...Object.keys(ATTRIBUTE_DOCS)]);
  const undocumented = [...decl.functions.keys()].filter((n) => !documentedCalls.has(n));
  if (undocumented.length > 0) {
    throw new Error(
      `[language-reference] SHADE_DTS declares ${undocumented.join(', ')}, which no *_DOCS table documents`,
    );
  }
  const mathUndocumented = [...decl.mathMembers.keys()].filter(
    (n) => !Object.prototype.hasOwnProperty.call(MATH_MEMBER_DOCS, n),
  );
  if (mathUndocumented.length > 0) {
    throw new Error(
      `[language-reference] SHADE_DTS declares Math.${mathUndocumented.join(', Math.')}, which MATH_MEMBER_DOCS does not document`,
    );
  }
  const builtinNames = new Set<string>(WGSL_BUILTIN_NAMES);
  const strayBuiltins = [...builtinNames].filter(
    (n) => !Object.prototype.hasOwnProperty.call(BUILTIN_DOCS, n),
  );
  if (strayBuiltins.length > 0) {
    throw new Error(
      `[language-reference] the compiler knows the builtin id ${strayBuiltins.join(', ')}, which BUILTIN_DOCS does not document`,
    );
  }

  // The attributes the compiler documents and reads off the decorator, with no declaration in
  // SHADE_DTS to read a signature from.
  const DECORATOR_ONLY: ReadonlySet<string> = new Set(['workgroup_size']);
  const missing = (kind: LanguageKind, name: string, where: string): never => {
    throw new Error(`[language-reference] the ${kind} '${name}' is documented and has no ${where}`);
  };

  // Every name any table documents, so a helper is what is left over. A type that keys a
  // property by a brand tag, `{ readonly [textureTag]: ... }`, is an opaque handle (a texture,
  // a sampler, the vector and matrix shapes): its body is the tag and says nothing a reader
  // can use. A helper may read a tag in a condition, `typeof f32Tag extends keyof A`, as
  // `ScalarOf` does, and stays a helper. What is left is the structural helpers, whose body is
  // the vocabulary itself, and an entry carries the ones its own signature reaches for.
  const documented = new Set(
    [
      TYPE_DOCS,
      ATTRIBUTE_DOCS,
      BUILTIN_DOCS,
      FUNCTION_DOCS,
      CONSTANT_DOCS,
      MATH_MEMBER_DOCS,
    ].flatMap((t) => Object.keys(t)),
  );
  const isHandle = (text: string): boolean =>
    [...decl.brandTags].some((tag) => new RegExp(`\\[\\s*${tag}\\s*\\]`).test(text));
  const allHelpers: LanguageHelper[] = [...decl.oneLiners.entries()]
    .filter(([name]) => !documented.has(name))
    .filter(([, text]) => !isHandle(text))
    .map(([name, declaration]) => ({ name, declaration }));
  const helpersIn = (signature: string): LanguageHelper[] =>
    allHelpers.filter((h) => new RegExp(`\\b${h.name}\\b`).test(signature));

  const entriesOf = (kind: LanguageKind, docs: Readonly<Record<string, string>>): LanguageEntry[] =>
    Object.entries(docs).map(([name, summary]) => {
      let title = name;
      let signature: string;
      let family: LanguageFamily = 'constructors';
      let spelling: LanguageSpelling | null = null;
      let stages: readonly BuiltinStageRule[] = [];
      let bareForm = false;
      let protocol = false;
      let elided = 0;
      // The text a bare `number` is looked for in: the signature, except on an interface,
      // where an index signature's key is `number` and is no scalar slot.
      let slots: string | undefined;
      // The overloads the Syntax frame prints, parsed as they are lifted, so the Parameters
      // and Return value sections below read off the same nodes and cannot drift from it.
      let overloads: LanguageOverload[] = [];
      switch (kind) {
        case 'type': {
          const alias = decl.types.get(name);
          if (alias) {
            signature = alias.getText(source);
            overloads = [overloadOf(alias, source)];
            break;
          }
          // An interface: the vector types, whose members are the components and the
          // swizzles. The swizzles are read off the interface itself. Its one-letter members
          // are the components, and a longer member spelled only in those letters is a
          // swizzle, so the page keeps whatever else a pin adds to the interface.
          const declared =
            decl.interfaces.get(name) ??
            missing(kind, name, 'type alias or interface in SHADE_DTS');
          // Two declarations of one interface merge in TypeScript, and a page that printed one
          // of them would leave the other's members out.
          if (declared.length !== 1)
            throw new Error(
              `[language-reference] SHADE_DTS declares the interface ${name} ${declared.length} times; the page prints one declaration`,
            );
          const iface = declared[0]!;
          const letterOf = (member: ts.TypeElement): string | null =>
            ts.isPropertySignature(member) && ts.isIdentifier(member.name)
              ? member.name.text
              : null;
          const components = new Set(
            iface.members.map(letterOf).filter((n): n is string => n?.length === 1),
          );
          const isSwizzle = (member: ts.TypeElement): boolean => {
            const letters = letterOf(member);
            return (
              letters !== null &&
              letters.length > 1 &&
              [...letters].every((letter) => components.has(letter))
            );
          };
          const shown = iface.members.filter((member) => !isSwizzle(member));
          elided = iface.members.length - shown.length;
          const head = iface.getText(source).slice(0, iface.members.pos - iface.getStart(source));
          signature = [
            head.trimEnd(),
            ...shown.map((member) => `  ${member.getText(source)}`),
            ...(elided > 0 ? ['  …'] : []),
            '}',
          ].join('\n');
          slots = shown
            .map((member) =>
              ts.isIndexSignatureDeclaration(member)
                ? member.type.getText(source)
                : member.getText(source),
            )
            .join('\n');
          overloads = [overloadOf(iface, source)];
          break;
        }
        case 'attribute': {
          title = `@${name}`;
          // `@workgroup_size` on a kernel function (compiler change 0067) is read by the front end
          // off the decorator itself, and the ambient file declares no function for it: its page
          // shows the attribute as written, with no overload to list.
          const nodes =
            decl.functions.get(name) ??
            (DECORATOR_ONLY.has(name) ? [] : missing(kind, name, 'declaration in SHADE_DTS'));
          signature =
            nodes.length > 0 ? nodes.map((n) => n.getText(source)).join('\n') : `${title}([n])`;
          // A decorator's declaration comes in two shapes and only one of them lists what an
          // author writes. A factory returns the decorator, so its own parameters are the
          // ones the call site passes (`@location(0)`, `@builtin("position")`). A bare
          // decorator is the decorator, so its parameters are the two values the TypeScript
          // decorator runtime hands it and `@vertex` passes neither. The shape is read off
          // the return type, so a pin that changes these declarations changes the page.
          const factories = nodes.filter(
            (n) => n.type !== undefined && ts.isFunctionTypeNode(n.type),
          );
          // What a factory returns is the decorator the runtime calls, and no value the call
          // site receives, so an attribute has no Return value either.
          overloads = factories.map((n) => ({ ...overloadOf(n, source), returns: null }));
          bareForm = factories.length < nodes.length;
          const runtimeArgs = (n: ts.FunctionDeclaration): boolean =>
            n.parameters.some((param) => param.name.getText(source) === 'target') ||
            (n.type !== undefined &&
              ts.isFunctionTypeNode(n.type) &&
              n.type.parameters.some((param) => param.name.getText(source) === 'target'));
          protocol = nodes.some(runtimeArgs);
          break;
        }
        case 'builtin': {
          if (!builtinNames.has(name))
            missing(kind, name, "id in the compiler's WGSL_BUILTIN_NAMES");
          title = `@builtin("${name}")`;
          // The ambient file types the decorator's argument as a string, so a builtin id has
          // no declaration of its own. What it does have is the type WGSL fixes for it, in
          // the compiler's WGSL_BUILTIN_TYPES, and the stage rules the front end checks it
          // against. `clip_distances` is the one id whose type the author picks, so its line
          // stops at the attribute.
          const fixed = (
            WGSL_BUILTIN_TYPES as Readonly<Record<string, Parameters<typeof typeKey>[0]>>
          )[name];
          signature = fixed ? `${title}: ${typeKey(fixed)}` : title;
          stages = rules.get(name) ?? [];
          break;
        }
        case 'function': {
          const nodes = decl.functions.get(name) ?? missing(kind, name, 'declaration in SHADE_DTS');
          signature = nodes.map((n) => n.getText(source)).join('\n');
          overloads = nodes.map((n) => overloadOf(n, source));
          const known = spellings.get(name);
          if (known) {
            family = known.family;
            spelling = {
              wgsl: known.row.wgsl,
              glsl: known.row.glsl,
              glslMessage: known.row.glslMessage,
              preEmit: known.row.preEmit,
              family: known.family,
            };
          } else {
            const own = FAMILY_OF[name];
            if (!own)
              throw new Error(
                `[language-reference] the function '${name}' is in no family; the spelling registry has no id for it, so add one to FAMILY_OF`,
              );
            family = own;
          }
          break;
        }
        case 'constant':
          signature = decl.values.get(name) ?? missing(kind, name, 'declaration in SHADE_DTS');
          break;
        case 'math': {
          const member =
            decl.mathMembers.get(name) ?? missing(kind, name, 'member of MathObject in SHADE_DTS');
          title = `Math.${name}`;
          // The member's own text with `Math.` in front of it, so the line reads the way the
          // call is written. A value member is declared `readonly`, which the qualified name
          // makes redundant.
          signature = `Math.${member.getText(source).replace(/^readonly\s+/, '')}`;
          if (ts.isMethodSignature(member)) overloads = [overloadOf(member, source)];
          break;
        }
      }
      // The same call under its other name. A function carries the `Math` spelling the
      // compiler's alias table routes to its id; a `Math` member carries the function or the
      // constant that name reaches. A name with no second spelling gets no See also row.
      const aliasName =
        kind === 'function' ? mathNameOfId.get(name)?.replace(/^Math\./, '') : undefined;
      const alias: LanguageAlias | null =
        kind === 'function'
          ? aliasName && Object.prototype.hasOwnProperty.call(MATH_MEMBER_DOCS, aliasName)
            ? { kind: 'math', name: aliasName, title: `Math.${aliasName}` }
            : Object.prototype.hasOwnProperty.call(MATH_MEMBER_DOCS, name)
              ? { kind: 'math', name, title: `Math.${name}` }
              : null
          : kind === 'math'
            ? routeOfMath(name)
            : kind === 'constant' && Object.prototype.hasOwnProperty.call(MATH_MEMBER_DOCS, name)
              ? { kind: 'math', name, title: `Math.${name}` }
              : null;
      // The id the oracle's tables would hold for this name: a function's own name, and for a
      // `Math` member the id the alias table routes it to. Nothing else reaches the oracle
      // under a name of its own.
      const oracleId =
        kind === 'function' ? name : kind === 'math' ? (idOfMathName.get(name) ?? name) : null;
      const parameters = mergeParameters(overloads);
      const returns = [...new Set(overloads.flatMap((o) => (o.returns ? [o.returns] : [])))];
      return {
        kind,
        name,
        title,
        signature,
        summary,
        line: firstSentence(summary),
        rest: summary.slice(firstSentence(summary).length).trim(),
        family,
        overloads,
        parameters,
        returns,
        positional: parameters.some((p) => GENERATED.test(p.name)),
        bareForm,
        protocol,
        showsNumber: SCALAR_SLOT_KINDS.has(kind) && /\bnumber\b/.test(slots ?? signature),
        helpers: helpersIn(signature),
        elided,
        spelling,
        stages,
        alias,
        oracle:
          oracleId === null
            ? null
            : oracle.builtins.has(oracleId)
              ? 'evaluates'
              : oracle.stubs.has(oracleId)
                ? 'stubs'
                : null,
      };
    });

  /** Where a `Math` member goes: the function the alias table routes it to, the function of
   *  the same name, or the constant of the same name. `Math.SQRT2` reaches none of the three
   *  and gets no row. */
  function routeOfMath(name: string): LanguageAlias | null {
    const routed = idOfMathName.get(name);
    const fn =
      routed && Object.prototype.hasOwnProperty.call(FUNCTION_DOCS, routed) ? routed : undefined;
    const own = Object.prototype.hasOwnProperty.call(FUNCTION_DOCS, name) ? name : undefined;
    const target = fn ?? own;
    if (target) return { kind: 'function', name: target, title: target };
    if (Object.prototype.hasOwnProperty.call(CONSTANT_DOCS, name))
      return { kind: 'constant', name, title: name };
    return null;
  }

  const tables: Readonly<Record<LanguageKind, Readonly<Record<string, string>>>> = {
    type: TYPE_DOCS,
    attribute: ATTRIBUTE_DOCS,
    builtin: BUILTIN_DOCS,
    function: FUNCTION_DOCS,
    constant: CONSTANT_DOCS,
    math: MATH_MEMBER_DOCS,
  };

  return LANGUAGE_KINDS.map((kind) => {
    const entries = entriesOf(kind, tables[kind]);
    if (entries.length === 0)
      throw new Error(
        `[language-reference] the ${kind} table is empty; the page would have nothing on it`,
      );
    const anchors = new Set(entries.map((e) => e.name));
    if (anchors.size !== entries.length)
      throw new Error(`[language-reference] two ${kind} entries share an anchor`);
    const groups =
      kind === 'function'
        ? LANGUAGE_FAMILIES.map((family) => ({
            family,
            entries: entries.filter((e) => e.family === family),
          })).filter((g) => g.entries.length > 0)
        : [];
    if (kind === 'function') {
      const placed = groups.reduce((n, g) => n + g.entries.length, 0);
      if (placed !== entries.length)
        throw new Error(
          `[language-reference] ${entries.length} functions, ${placed} placed in a family`,
        );
    }
    // A kind listed as carrying the scalar slot whose signatures have stopped writing a bare
    // `number` no longer needs the note its entry pages print, so the list is checked here
    // instead of going stale.
    if (SCALAR_SLOT_KINDS.has(kind) && !entries.some((e) => e.showsNumber)) {
      throw new Error(
        `[language-reference] no ${kind} signature writes a bare 'number' any more; drop the kind from SCALAR_SLOT_KINDS`,
      );
    }
    return { kind, slug: LANGUAGE_SLUGS[kind], entries, groups };
  });
}

/** The ambient file's own declaration of a GPU scalar, which is what a `number` in a
 *  signature stands for. Lifted out of SHADE_DTS so the page quotes the compiler. */
export function scalarBrand(): string {
  const decl = declarations();
  const node = decl.types.get('f32');
  if (!node) throw new Error('[language-reference] SHADE_DTS no longer declares f32');
  return node.getText(decl.source);
}

function sections(): readonly LanguageSection[] {
  if (!cache) cache = build();
  return cache;
}

/** Every section, in the order the index and the sidebar list them. */
export const languageSections = (): readonly LanguageSection[] => sections();

/** One section by kind. */
export function languageSection(kind: LanguageKind): LanguageSection {
  const found = sections().find((s) => s.kind === kind);
  if (!found) throw new Error(`[language-reference] no section for '${kind}'`);
  return found;
}

/** How many names each table documents, and how many in all, so no count is typed. */
export function languageCounts(): Readonly<Record<LanguageKind, number>> & {
  readonly total: number;
} {
  const per = Object.fromEntries(sections().map((s) => [s.kind, s.entries.length])) as Record<
    LanguageKind,
    number
  >;
  return { ...per, total: sections().reduce((n, s) => n + s.entries.length, 0) };
}

/** Every entry of every kind, in the order the kinds and their tables run. */
export function languageEntries(): readonly LanguageEntry[] {
  return sections().flatMap((s) => s.entries);
}

/** One entry's own page, locale-neutral. The kind is a path segment, so the 58 names that
 *  sit in two tables at once need no disambiguating slug: `/reference/types/f32/` and
 *  `/reference/functions/f32/` are two paths and each is spelled the way the table spells
 *  the name. */
export const languageEntryPath = (kind: LanguageKind, name: string): string =>
  `/reference/${LANGUAGE_SLUGS[kind]}/${name}/`;

/** The page for one name of one kind, or undefined when that table has no such name. */
export function languageEntryPage(kind: LanguageKind, name: string): string | undefined {
  return languageSection(kind).entries.some((e) => e.name === name)
    ? languageEntryPath(kind, name)
    : undefined;
}

/** The function page for a builtin the spelling registry has an id for, or undefined for an
 *  id the language surface does not name (the layered texture forms the compiler picks
 *  itself, the storage fetches, the fp64 helpers). The builtin table links each row with it. */
export const languageBuiltinPage = (id: string): string | undefined =>
  languageEntryPage('function', id);

/** One entry by kind and name. A name the table does not carry stops the build. */
export function languageEntry(kind: LanguageKind, name: string): LanguageEntry {
  const found = languageSection(kind).entries.find((e) => e.name === name);
  if (!found) throw new Error(`[language-reference] the ${kind} table has no '${name}'`);
  return found;
}

/** The routes the two entry-page route files build, one per documented name in each
 *  language. The kind goes through as a prop as well as a parameter, so the page component
 *  is handed the kind itself and not the slug it is spelled with in the path. */
export function languageEntryPaths(): {
  params: { kind: string; name: string };
  props: { kind: LanguageKind; name: string };
}[] {
  return sections().flatMap((s) =>
    s.entries.map((e) => ({
      params: { kind: s.slug, name: e.name },
      props: { kind: s.kind, name: e.name },
    })),
  );
}

/** The entry before and after one of them inside its own kind, for the pager. Undefined at
 *  either end, where the page falls back to the kind's index. */
export function languageSiblings(
  kind: LanguageKind,
  name: string,
): { previous?: LanguageEntry; next?: LanguageEntry } {
  const entries = languageSection(kind).entries;
  const at = entries.findIndex((e) => e.name === name);
  if (at < 0) throw new Error(`[language-reference] the ${kind} table has no '${name}'`);
  return { previous: entries[at - 1], next: entries[at + 1] };
}

// Every name has to survive being a path segment of its own, and two names of one kind that
// differ only in case would be one directory on a case-insensitive checkout. Both are
// checked once, here, so a name added upstream stops the build instead of shipping a page
// that overwrites another.
{
  const bad: string[] = [];
  for (const section of sections()) {
    const seen = new Map<string, string>();
    for (const entry of section.entries) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.name))
        bad.push(`'${entry.name}' (${section.kind}) cannot be a path segment`);
      const folded = entry.name.toLowerCase();
      const other = seen.get(folded);
      if (other) bad.push(`'${entry.name}' and '${other}' (${section.kind}) differ only in case`);
      seen.set(folded, entry.name);
    }
  }
  if (bad.length > 0) throw new Error(`[language-reference] ${bad.join('; ')}`);
}
