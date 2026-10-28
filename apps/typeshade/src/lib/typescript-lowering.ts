// The data behind /guide/language/from-typescript/: one TypeScript construct per row, with
// the shader text the pinned compiler writes for it. Nothing in the third column is typed by
// hand. Each row carries a whole `"use typeshade"` program, which goes through
// `compileTsSource` the way src/lib/concepts-emit.ts compiles the front page's sample, and
// the row keeps the part of the emit it is about, sliced out of the module by name.
//
// A row whose construct the language refuses carries the compiler's own diagnostic instead,
// code and message as the compiler wrote them. Such a row states what it expects, so a
// program that stops being refused, and one that stops compiling, both fail the build here.
// A sentence the compiler no longer agrees with never reaches the page.
import { compileTsSource } from '../../vendor/shader-dsl/src/compiler/ts/source-file.ts';

/** The sections the page runs in, in order. */
export type LoweringSectionKey =
  'declarations' | 'functions' | 'classes' | 'controlFlow' | 'expressions' | 'double';

export const LOWERING_SECTIONS: readonly LoweringSectionKey[] = [
  'declarations',
  'functions',
  'classes',
  'controlFlow',
  'expressions',
  'double',
];

/** One row as the page prints it. */
export interface LoweringRow {
  /** The key the copy writes this row's middle column under. */
  readonly id: string;
  /** The TypeScript the row is about, which is part of the program that was compiled. */
  readonly ts: string;
  /** The emitted WGSL this row is about, sliced out of the module by name. Null on a row the
   *  compiler refuses. */
  readonly wgsl: string | null;
  /** The compiler's own refusal, on a row that has one. */
  readonly diagnostic: LoweringDiagnostic | null;
}

export interface LoweringDiagnostic {
  /** The diagnostic code, `TS8014` and the like. Empty when the compiler gave none. */
  readonly code: string;
  readonly message: string;
}

/** A run of rows a section page prints under one h2, so the page's outline lists the runs. */
export interface LoweringGroup {
  /** The key the copy writes the group's heading under (`fromTypescript.groups`). */
  readonly key: string;
  readonly rows: readonly LoweringRow[];
}

export interface LoweringSection {
  readonly key: LoweringSectionKey;
  readonly rows: readonly LoweringRow[];
  /** The same rows, in the same order, cut into the runs under one heading each. */
  readonly groups: readonly LoweringGroup[];
}

/** A row's source: the construct itself, and whatever has to stand around it to compile. */
interface RowSpec {
  readonly id: string;
  /** The lines the TypeScript column shows. They are part of the compiled program. */
  readonly ts: string;
  /** Lines the program needs before the construct, which the page does not show. */
  readonly before?: string;
  /** Lines the program needs after it. */
  readonly after?: string;
  /** The emitted declarations this row keeps, by name, in the order they are shown. A `fn`,
   *  a `struct`, a `const`, an `override` or a module `var` are each found by their name. */
  readonly pick?: readonly string[];
  /** A row the compiler refuses: the emit is a diagnostic. */
  readonly refused?: true;
}

const DIRECTIVE = '"use typeshade"';

const sourceOf = (spec: RowSpec): string =>
  [DIRECTIVE, spec.before, spec.ts, spec.after]
    .filter((part) => part !== undefined && part.length > 0)
    .join('\n\n') + '\n';

/** One emitted declaration, from the line its name is on to the line that closes it. A
 *  declaration the emit does not carry is a row that has stopped being true, so the name that
 *  is not there stops the build. */
function sliceDecl(wgsl: string, name: string, id: string): string {
  const lines = wgsl.split('\n');
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const opens = new RegExp(
    `^(?:fn\\s+${escaped}\\s*\\(|struct\\s+${escaped}\\s|struct\\s+${escaped}\\{)`,
  );
  const single = new RegExp(`^(?:const|alias|override|var(?:<[^>]*>)?)\\s+${escaped}\\s*[:=;]`);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // A binding carries its group and its slot ahead of the keyword; they belong to the line.
    if (single.test(line.replace(/^(?:@\w+\([^)]*\)\s*)+/, ''))) return line;
    if (!opens.test(line)) continue;
    // An entry carries its stage attribute on the line above, and a parameter list that ran
    // long carries one attribute per line; both belong to the declaration the row shows.
    let start = i;
    while (start > 0 && lines[start - 1]!.startsWith('@')) start--;
    for (let j = i; j < lines.length; j++) {
      if (lines[j] === '}') return lines.slice(start, j + 1).join('\n');
    }
    throw new Error(`[typescript-lowering] '${id}': the emitted '${name}' has no closing line`);
  }
  throw new Error(
    `[typescript-lowering] '${id}': the emit carries no declaration called '${name}'`,
  );
}

interface Built {
  readonly row: LoweringRow;
  readonly problem: string | null;
}

function buildRow(spec: RowSpec): Built {
  const source = sourceOf(spec);
  const result = compileTsSource(source, {
    fileName: `${spec.id}.shade.ts`,
    requireDirective: true,
    emit: true,
  });
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  const row = { id: spec.id, ts: spec.ts, wgsl: null, diagnostic: null };

  if (spec.refused) {
    if (errors.length === 0) {
      return {
        row,
        problem: `'${spec.id}': the program compiled with no error; the row says the language refuses it`,
      };
    }
    const first = errors[0]!;
    return {
      row: { ...row, diagnostic: { code: first.code ?? '', message: first.message } },
      problem: null,
    };
  }

  if (errors.length > 0) {
    const shown = errors.map((e) => `${e.code ?? '-'}: ${e.message}`).join('; ');
    return { row, problem: `'${spec.id}': ${shown}` };
  }
  if (!result.wgsl)
    return { row, problem: `'${spec.id}': the program compiled and emitted no WGSL` };
  const names = spec.pick ?? [];
  if (names.length === 0)
    return { row, problem: `'${spec.id}': no declaration named for the emitted column` };
  try {
    const text = names.map((name) => sliceDecl(result.wgsl!, name, spec.id)).join('\n\n');
    return { row: { ...row, wgsl: text }, problem: null };
  } catch (error) {
    return { row, problem: error instanceof Error ? error.message : String(error) };
  }
}

let cache: readonly LoweringSection[] | null = null;

function build(): readonly LoweringSection[] {
  const problems: string[] = [];
  const sections = LOWERING_SECTIONS.map((key) => {
    const rows = SPECS[key].map((spec) => {
      const built = buildRow(spec);
      if (built.problem) problems.push(built.problem);
      return built.row;
    });
    if (rows.length === 0) problems.push(`the ${key} section has no row`);
    const groups = GROUPS[key].map((g) => ({
      key: g.key,
      rows: rows.filter((r) => g.ids.includes(r.id)),
    }));
    const grouped = groups.flatMap((g) => g.rows.map((r) => r.id));
    if (grouped.join() !== rows.map((r) => r.id).join()) {
      problems.push(
        `the ${key} groups do not cover its rows once each, in order: ${grouped.join(', ')}`,
      );
    }
    return { key, rows, groups };
  });
  if (problems.length > 0) {
    throw new Error(
      `[typescript-lowering] ${problems.length} row(s) the pinned compiler no longer agrees with:\n  ${problems.join('\n  ')}`,
    );
  }
  const ids = sections.flatMap((s) => s.rows.map((r) => r.id));
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (twice.length > 0)
    throw new Error(`[typescript-lowering] two rows share an id: ${twice.join(', ')}`);
  return sections;
}

/** Every row, grouped into the page's sections, compiled at the pinned commit. */
export function loweringSections(): readonly LoweringSection[] {
  if (!cache) cache = build();
  return cache;
}

/** How many rows the page carries, for the sentence that counts them. */
export function loweringRowCount(): number {
  return loweringSections().reduce((n, s) => n + s.rows.length, 0);
}

/** The runs each section's rows are printed in. A run is a stretch of the section's rows in
 *  their order, so grouping never moves a card; a row that belongs to no run, or to two, stops
 *  the build. The heading of a run is the dictionary's line under the same key. */
const GROUPS: Record<
  LoweringSectionKey,
  readonly { readonly key: string; readonly ids: readonly string[] }[]
> = {
  declarations: [
    {
      key: 'constantsAndVariables',
      ids: ['constScalar', 'constVector', 'letNoInit', 'unassignedRead', 'moduleLet', 'varRefused'],
    },
    {
      key: 'typeDeclarations',
      ids: ['enumRow', 'constEnum', 'typeAlias', 'interfaceRow', 'classStruct', 'namespaceRow'],
    },
  ],
  functions: [
    {
      key: 'parametersAndNames',
      ids: [
        'lexicalShadow',
        'mutableParameter',
        'referenceParameter',
        'outParameter',
        'referenceAlias',
      ],
    },
    {
      key: 'kindsOfFunction',
      ids: [
        'topFunction',
        'localFunction',
        'closure',
        'defaultArgs',
        'optionalValue',
        'overloads',
        'recursion',
      ],
    },
    { key: 'calls', ids: ['callStatement', 'phonyAssign', 'mathAlias'] },
  ],
  classes: [
    { key: 'fieldsAndConstructors', ids: ['baseValue', 'fieldlessClass', 'constructorNew'] },
    { key: 'methods', ids: ['method', 'staticFn', 'thisAssign'] },
    { key: 'inheritance', ids: ['extendsSuper', 'abstractRow', 'implementsRow'] },
    { key: 'accessors', ids: ['accessModifiers', 'getter'] },
    { key: 'mixinsAndGenerics', ids: ['mixin', 'genericFunction', 'genericClass'] },
  ],
  controlFlow: [
    { key: 'conditionsAndLoops', ids: ['ifRow', 'forRow', 'forRuntime', 'whileRow', 'switchRow'] },
    { key: 'choosingAValue', ids: ['ternaryScalar', 'ternaryStruct'] },
    { key: 'leavingEarly', ids: ['breakRow', 'continueRow', 'discardRow'] },
  ],
  expressions: [
    { key: 'builtValues', ids: ['destructuring', 'spread', 'arrayLiteral', 'tuple'] },
    { key: 'claims', ids: ['literalUnion', 'brand', 'typeClaims'] },
    { key: 'operators', ids: ['power', 'logicalScalar', 'logicalVector', 'optionalMember'] },
    {
      key: 'primitives',
      ids: ['stringValue', 'numberType', 'booleanType', 'integerLiteral', 'increment'],
    },
  ],
  double: [
    { key: 'writingDoubles', ids: ['f64Scalar', 'f64Literal', 'f64Vector', 'f64Builtin'] },
    { key: 'whereItStops', ids: ['f64Refused', 'f64Guard', 'f64Varying'] },
  ],
};

const SPECS: Record<LoweringSectionKey, readonly RowSpec[]> = {
  declarations: [
    {
      id: 'constScalar',
      ts: 'const GAIN: f32 = 1.5 * 2.',
      after: 'export function boost(x: f32): f32 {\n  return x * GAIN\n}',
      pick: ['GAIN'],
    },
    {
      id: 'constVector',
      ts: 'const TINT: vec3 = vec3(0.2, 0.4, 0.9)',
      after: 'export function tinted(x: f32): vec3 {\n  return TINT * x\n}',
      pick: ['TINT'],
    },
    {
      id: 'letNoInit',
      ts: 'export function band(x: f32): f32 {\n  let w: f32\n  w = x * 2.\n  return w\n}',
      pick: ['band'],
    },
    {
      id: 'unassignedRead',
      ts: 'export function band(x: f32): f32 {\n  let w: f32\n  if (x > 0.) {\n    w = x * 2.\n  }\n  return w\n}',
      refused: true,
    },
    {
      id: 'moduleLet',
      ts: 'let seed: u32 = 7',
      after: 'export function next(): u32 {\n  seed = seed * 1664525\n  return seed\n}',
      pick: ['seed'],
    },
    {
      id: 'varRefused',
      ts: 'var k = 1.',
      after: 'export function scaled(x: f32): f32 {\n  return x\n}',
      refused: true,
    },
    {
      id: 'enumRow',
      ts: 'enum Mode {\n  Flat,\n  Shaded,\n  Wire,\n}',
      after: 'export function isWire(m: i32): bool {\n  return m === Mode.Wire\n}',
      pick: ['Mode_Flat', 'Mode_Shaded', 'Mode_Wire'],
    },
    {
      id: 'constEnum',
      ts: 'const enum Flag {\n  None = 0,\n  Both = 3,\n}',
      after: 'export function both(f: i32): bool {\n  return f === Flag.Both\n}',
      pick: ['Flag_None', 'Flag_Both'],
    },
    {
      id: 'typeAlias',
      ts: 'type Meters = f32',
      after: 'export function deeper(d: Meters): Meters {\n  return d * 2.\n}',
      pick: ['deeper'],
    },
    {
      id: 'interfaceRow',
      ts: 'interface Camera {\n  view: mat4\n  pos: vec3\n}',
      after: 'export function eye(c: Camera): vec3 {\n  return c.pos\n}',
      pick: ['Camera'],
    },
    {
      id: 'classStruct',
      ts: 'class Ray {\n  origin: vec3\n  dir: vec3\n}',
      after: 'export function far(r: Ray): vec3 {\n  return r.origin + r.dir\n}',
      pick: ['Ray'],
    },
    {
      id: 'namespaceRow',
      ts: 'namespace Palette {\n  export const WARM: vec3 = vec3(0.9, 0.6, 0.3)\n  export function tint(x: f32): vec3 {\n    return WARM * x\n  }\n}',
      after: 'export function paint(x: f32): vec3 {\n  return Palette.tint(x)\n}',
      pick: ['Palette_WARM', 'Palette_tint'],
    },
  ],
  functions: [
    {
      id: 'lexicalShadow',
      ts: 'const gain: f32 = 0.25;\nfunction scale(gain: f32): f32 { return gain * 2.; }\nexport function answer(): f32 {\n  const gain: f32 = 1.;\n  return scale(gain);\n}',
      pick: ['scale', 'answer'],
    },
    {
      id: 'mutableParameter',
      ts: 'export function brighter(value: f32): f32 {\n  value += 0.25;\n  return value;\n}',
      pick: ['brighter'],
    },
    {
      id: 'referenceParameter',
      ts: 'function swap(@inout a: f32, @inout b: f32): void {\n  const t = a\n  a = b\n  b = t\n}\nexport function order(x: f32, y: f32): f32 {\n  let lo = x\n  let hi = y\n  if (lo > hi) {\n    swap(lo, hi)\n  }\n  return hi - lo\n}',
      pick: ['swap', 'order'],
    },
    {
      id: 'outParameter',
      ts: 'function add(a: f32, b: f32, @out c: f32): void {\n  c = a + b\n}\nexport function sum(x: f32, y: f32): f32 {\n  let s: f32\n  add(x, y, s)\n  return s\n}',
      pick: ['add', 'sum'],
    },
    {
      id: 'referenceAlias',
      before:
        'function swap(@inout a: f32, @inout b: f32): void {\n  const t = a\n  a = b\n  b = t\n}',
      ts: 'export function twice(x: f32): f32 {\n  let v = x\n  swap(v, v)\n  return v\n}',
      refused: true,
    },
    {
      id: 'topFunction',
      ts: 'export function lum(c: vec3): f32 {\n  return dot(c, vec3(0.2126, 0.7152, 0.0722))\n}',
      pick: ['lum'],
    },
    {
      id: 'localFunction',
      ts: 'export function ramp(x: f32): f32 {\n  const twice = (v: f32): f32 => v * 2.\n  return twice(x)\n}',
      pick: ['ramp_twice', 'ramp'],
    },
    {
      id: 'closure',
      ts: 'export function ramp(x: f32): f32 {\n  const twice = (v: f32): f32 => v * x\n  return twice(x)\n}',
      pick: ['ramp_twice', 'ramp'],
    },
    {
      id: 'defaultArgs',
      ts: 'function vignette(\n  uv: vec2, strength: f32 = 0.8\n): f32 {\n  return 1. - length(uv) * strength\n}',
      after: 'export function shade(uv: vec2): f32 {\n  return vignette(uv)\n}',
      pick: ['vignette', 'shade'],
    },
    {
      id: 'optionalValue',
      ts: 'function root(x: f32): f32 | undefined {\n  if (x < 0.) {\n    return undefined\n  }\n  return sqrt(x)\n}',
      after: 'export function rootOr(x: f32): f32 {\n  return root(x) ?? 1.\n}',
      pick: ['root', 'rootOr'],
    },
    {
      id: 'overloads',
      ts: 'export function lum(c: vec3): f32\nexport function lum(c: vec3): f32 {\n  return dot(c, vec3(0.2126, 0.7152, 0.0722))\n}',
      pick: ['lum'],
    },
    {
      id: 'recursion',
      ts: 'export function fall(x: f32): f32 {\n  return fall(x * 0.5)\n}',
      refused: true,
    },
    {
      id: 'callStatement',
      before:
        'declare const dst: storage<array<f32>, "read_write">\n\nfunction store(i: u32, v: f32): void {\n  dst[i] = v\n}',
      ts: '@compute([64, 1, 1])\nexport function main_k(\n  @builtin("global_invocation_id") gid: vec3u\n): void {\n  store(gid.x, 1.)\n}',
      pick: ['main_k'],
    },
    {
      id: 'phonyAssign',
      before: 'declare const hits: storage<array<atomic<u32>>, "read_write">',
      ts: '@compute([64, 1, 1])\nexport function main_k(\n  @builtin("global_invocation_id") gid: vec3u\n): void {\n  atomicAdd(hits[gid.x], 1)\n}',
      pick: ['main_k'],
    },
    {
      id: 'mathAlias',
      ts: 'export function wave(x: f32): f32 {\n  return Math.sin(x * Math.PI)\n}',
      pick: ['wave'],
    },
  ],
  classes: [
    {
      id: 'baseValue',
      ts: 'class Material {\n  color: f32 = 0.5;\n  response(): f32 { return this.color; }\n}\nclass LeafMaterial extends Material {\n  thickness: f32 = 1.;\n}\nfunction response(material: Material): f32 {\n  return material.response();\n}\nexport function leafResponse(): f32 {\n  const material = new LeafMaterial();\n  return response(material);\n}',
      pick: ['Material', 'LeafMaterial', 'response', 'leafResponse'],
    },
    {
      id: 'fieldlessClass',
      ts: 'class Counter {\n  next(value: f32): f32 { return value + 1.; }\n}\nexport function next(value: f32): f32 {\n  return new Counter().next(value);\n}',
      pick: ['Counter', 'Counter_new', 'Counter_next', 'next'],
    },
    {
      id: 'constructorNew',
      ts: 'class Ray {\n  origin: vec3\n  dir: vec3\n  constructor(origin: vec3, dir: vec3) {\n    this.origin = origin\n    this.dir = dir\n  }\n}',
      after:
        'export function start(o: vec3, d: vec3): vec3 {\n  const r = new Ray(o, d)\n  return r.origin\n}',
      pick: ['Ray_new'],
    },
    {
      id: 'method',
      ts: 'class Ray {\n  origin: vec3\n  dir: vec3\n  at(t: f32): vec3 {\n    return this.origin + this.dir * t\n  }\n}',
      after: 'export function hit(r: Ray): vec3 {\n  return r.at(1.)\n}',
      pick: ['Ray_at', 'hit'],
    },
    {
      id: 'staticFn',
      ts: 'class Ray {\n  origin: vec3\n  dir: vec3\n  static up(): vec3 {\n    return vec3(0., 1., 0.)\n  }\n}',
      after: 'export function sky(r: Ray): vec3 {\n  return Ray.up() * r.dir\n}',
      pick: ['Ray_up'],
    },
    {
      id: 'thisAssign',
      ts: 'class Body {\n  pos: vec3\n  vel: vec3\n  step(dt: f32): void {\n    this.pos = this.pos + this.vel * dt\n  }\n}',
      after:
        'export function moved(p: vec3, v: vec3, dt: f32): vec3 {\n  let b: Body = { pos: p, vel: v }\n  b.step(dt)\n  return b.pos\n}',
      pick: ['Body_step'],
    },
    {
      id: 'extendsSuper',
      before:
        'class Circle {\n  center: vec2\n  radius: f32\n  sdf(p: vec2): f32 {\n    return length(p - this.center) - this.radius\n  }\n}',
      ts: 'class Ring extends Circle {\n  width: f32\n  sdf(p: vec2): f32 {\n    return abs(super.sdf(p)) - this.width\n  }\n}',
      after:
        'export function edge(p: vec2): f32 {\n  const r: Ring = { center: vec2(0.), radius: 0.3, width: 0.05 }\n  return r.sdf(p)\n}',
      pick: ['Ring', 'Ring_sdf'],
    },
    {
      id: 'abstractRow',
      ts: 'abstract class Shape {\n  center: vec2\n  abstract sdf(p: vec2): f32\n  offset(p: vec2): vec2 {\n    return p - this.center\n  }\n}',
      after:
        'class Disc extends Shape {\n  radius: f32\n  sdf(p: vec2): f32 {\n    return length(this.offset(p)) - this.radius\n  }\n}\n\nexport function cover(p: vec2): f32 {\n  const d: Disc = { center: vec2(0.), radius: 0.3 }\n  return d.sdf(p)\n}',
      pick: ['Disc', 'Disc_offset'],
    },
    {
      id: 'implementsRow',
      before: 'interface Placed {\n  center: vec2\n}',
      ts: 'class Disc implements Placed {\n  center: vec2\n  radius: f32\n}',
      after:
        'export function cover(d: Disc, p: vec2): f32 {\n  return length(p - d.center) - d.radius\n}',
      pick: ['Disc'],
    },
    {
      id: 'accessModifiers',
      ts: 'class Sphere {\n  private center: vec3\n  readonly radius: f32\n  public hit(p: vec3): f32 {\n    return length(p - this.center) - this.radius\n  }\n}',
      after: 'export function cover(s: Sphere, p: vec3): f32 {\n  return s.hit(p)\n}',
      pick: ['Sphere', 'Sphere_hit'],
    },
    {
      id: 'getter',
      ts: 'class Disc {\n  radius: f32\n  get area(): f32 {\n    return this.radius * this.radius\n  }\n}',
      after: 'export function cover(d: Disc): f32 {\n  return d.area\n}',
      pick: ['Disc', 'Disc_get_area'],
    },
    {
      id: 'mixin',
      before: 'class Disc {\n  center: vec2\n  radius: f32\n}',
      ts: 'function Tinted<T extends AnyClass>(Base: T) {\n  return class extends Base {\n    tint: vec3\n    lit(cover: f32): vec3 {\n      return this.tint * cover\n    }\n  }\n}\n\nclass TintedDisc extends Tinted(Disc) {\n}',
      after:
        'export function shade(p: vec2): vec3 {\n  const d: TintedDisc = { center: vec2(0.), radius: 0.3, tint: vec3(1., 0.6, 0.2) }\n  return d.lit(length(p))\n}',
      pick: ['TintedDisc', 'TintedDisc_lit'],
    },
    {
      id: 'genericFunction',
      ts: 'function pick<T>(a: T, b: T, c: bool): T {\n  return c ? a : b\n}',
      after:
        'export function both(x: f32, v: vec3): f32 {\n  return pick(x, 1., true) + pick(v, v, false).x\n}',
      pick: ['pick_f32', 'pick_vec3'],
    },
    {
      id: 'genericClass',
      ts: 'class Slot<T> {\n  a: T\n  b: T\n  first(): T {\n    return this.a\n  }\n}',
      after:
        'export function held(x: f32, v: vec3): f32 {\n  const s: Slot<f32> = { a: x, b: 1. }\n  const t: Slot<vec3> = { a: v, b: v }\n  return s.first() + t.first().x\n}',
      pick: ['Slot_f32', 'Slot_vec3'],
    },
  ],
  controlFlow: [
    {
      id: 'ifRow',
      ts: 'export function capped(x: f32): f32 {\n  if (x > 1.) {\n    return 1.\n  }\n  return x\n}',
      pick: ['capped'],
    },
    {
      id: 'forRow',
      ts: 'export function ramp(x: f32): f32 {\n  let acc: f32 = 0.\n  for (let i = 0; i < 4; i += 1) {\n    acc = acc + x * f32(i)\n  }\n  return acc\n}',
      pick: ['ramp'],
    },
    {
      id: 'forRuntime',
      ts: 'export function ramp(x: f32, n: i32): f32 {\n  let acc: f32 = 0.\n  for (let i = 0; i < n; i += 1) {\n    acc = acc + x\n  }\n  return acc\n}',
      pick: ['ramp'],
    },
    {
      id: 'whileRow',
      ts: 'export function halve(x: f32): f32 {\n  let acc: f32 = x\n  let w: i32 = 0\n  while (w < 4) {\n    acc = acc * 0.5\n    w = w + 1\n  }\n  return acc\n}',
      pick: ['halve'],
    },
    {
      id: 'switchRow',
      ts: 'export function band(m: i32): f32 {\n  let v: f32 = 0.\n  switch (m) {\n    case 0:\n      v = 0.25\n      break\n    default:\n      v = 1.\n      break\n  }\n  return v\n}',
      pick: ['band'],
    },
    {
      id: 'ternaryScalar',
      ts: 'export function nearer(a: f32, b: f32): f32 {\n  return a < b ? a : b\n}',
      pick: ['nearer'],
    },
    {
      id: 'ternaryStruct',
      before: 'class Palette {\n  lo: vec3\n  hi: vec3\n}',
      ts: 'export function chosen(\n  warm: Palette, cool: Palette, c: bool\n): vec3 {\n  const shade: Palette = c ? warm : cool\n  return shade.lo\n}',
      pick: ['chosen'],
    },
    {
      id: 'breakRow',
      ts: 'export function escape(x: f32): f32 {\n  let acc: f32 = x\n  for (let i = 0; i < 8; i += 1) {\n    acc = acc * 2.\n    if (acc > 1.) {\n      break\n    }\n  }\n  return acc\n}',
      pick: ['escape'],
    },
    {
      id: 'continueRow',
      ts: 'export function odds(x: f32): f32 {\n  let acc: f32 = 0.\n  for (let i = 0; i < 4; i += 1) {\n    if (i === 2) {\n      continue\n    }\n    acc = acc + x\n  }\n  return acc\n}',
      pick: ['odds'],
    },
    {
      id: 'discardRow',
      ts: '@fragment\nexport function fs(\n  @builtin("position") frag: vec4\n): vec4 {\n  if (frag.x < 0.5) {\n    discard\n  }\n  return vec4(1.)\n}',
      pick: ['fs'],
    },
  ],
  expressions: [
    {
      id: 'destructuring',
      ts: 'export function swapped(v: vec2): vec2 {\n  const { x, y } = v\n  return vec2(y, x)\n}\n\nexport function endpoints(xs: array<f32, 3>): f32 {\n  const [first, , last] = xs\n  return first + last\n}',
      pick: ['swapped', 'endpoints'],
    },
    {
      id: 'spread',
      before: 'class Point {\n  x: f32\n  y: f32\n}',
      ts: 'export function lifted(p: Point): Point {\n  return { ...p, y: 9. }\n}',
      pick: ['lifted'],
    },
    {
      id: 'arrayLiteral',
      ts: 'export function step3(i: i32): f32 {\n  const xs: array<f32, 3> = [0.15, 0.5, 0.9]\n  return xs[i]\n}',
      pick: ['step3'],
    },
    {
      id: 'tuple',
      ts: 'export function bounds(x: f32): [f32, f32] {\n  return [x - 1., x + 1.]\n}',
      pick: ['bounds'],
    },
    {
      id: 'literalUnion',
      ts: 'export function isWire(m: 0 | 1 | 2): bool {\n  return m === 2\n}',
      pick: ['isWire'],
    },
    {
      id: 'brand',
      before: 'declare const m: unique symbol',
      ts: "type Metres = f32 & { readonly [m]: 'metres' }",
      after: 'export function deeper(d: Metres): f32 {\n  return d * 2.\n}',
      pick: ['deeper'],
    },
    {
      id: 'typeClaims',
      ts: 'export function claimed(x: f32): f32 {\n  const a = x as f32\n  const b = (x satisfies f32)!\n  const k = 2. as const\n  return a + b * k\n}',
      pick: ['claimed'],
    },
    {
      id: 'power',
      ts: 'export function curved(x: f32): f32 {\n  return x ** 2.2\n}',
      pick: ['curved'],
    },
    {
      id: 'logicalScalar',
      ts: 'export function both(a: bool, b: bool): bool {\n  return a && b\n}',
      pick: ['both'],
    },
    {
      id: 'logicalVector',
      ts: 'export function both(a: vec2b, b: vec2b): bool {\n  return a && b\n}',
      refused: true,
    },
    {
      id: 'optionalMember',
      ts: 'class Disc {\n  center: vec2\n  radius?: f32\n}',
      after:
        'export function cover(d: Disc, p: vec2): f32 {\n  return length(p - d.center) - (d.radius ?? 1.)\n}',
      pick: ['cover'],
    },
    {
      id: 'stringValue',
      ts: 'export function label(x: f32): f32 {\n  const name = `band ${x}`\n  return x\n}',
      refused: true,
    },
    {
      id: 'numberType',
      ts: 'export function twice(x: number): number {\n  return x * 2\n}',
      refused: true,
    },
    {
      id: 'booleanType',
      ts: 'export function on(x: boolean): f32 {\n  return x ? 1. : 0.\n}',
      refused: true,
    },
    {
      id: 'integerLiteral',
      ts: 'class Hit {\n  constructor(public index: i32) {}\n  offset(value: i32): i32 { return this.index + value; }\n}\nexport function counts(): i32 {\n  let n = -1;\n  const hit = new Hit(n);\n  n = hit.index;\n  return hit.offset(n);\n}',
      pick: ['Hit_new', 'Hit_offset', 'counts'],
    },
    {
      id: 'increment',
      ts: 'export function stepped(x: f32): f32 {\n  let acc: f32 = x\n  acc++\n  acc--\n  return acc\n}',
      pick: ['stepped'],
    },
  ],
  double: [
    {
      id: 'f64Scalar',
      ts: 'export function widened(a: f64, b: f64): f64 {\n  return a * b + a\n}',
      pick: ['widened'],
    },
    {
      id: 'f64Literal',
      ts: 'export function stripe(a: f64): f64 {\n  const width: f64 = 0.125\n  return a * width\n}',
      pick: ['stripe'],
    },
    {
      id: 'f64Vector',
      ts: 'export function narrowed(\n  p: vec3f64, q: vec2d\n): f32 {\n  return f32(p.x) + f32(q.y)\n}',
      pick: ['narrowed'],
    },
    {
      id: 'f64Builtin',
      ts: 'export function rooted(a: f64): f64 {\n  return sqrt(abs(a))\n}',
      pick: ['rooted'],
    },
    {
      id: 'f64Refused',
      ts: 'export function rounded(a: f64): f64 {\n  return ceil(a)\n}',
      refused: true,
    },
    {
      id: 'f64Guard',
      ts: 'class Uniforms {\n  origin: f64\n  span: f32\n}\n\ndeclare const u: uniform<Uniforms>',
      after: 'export function offset(t: f32): f64 {\n  return u.origin * 2.5 + u.span * t\n}',
      pick: ['_fp64'],
    },
    {
      id: 'f64Varying',
      ts: '@fragment\nexport function fs(\n  @location(0) depth: f64\n): vec4 {\n  return vec4(f32(depth))\n}',
      refused: true,
    },
  ],
};
