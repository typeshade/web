// The rows behind /guide/language/from-wgsl/ and /guide/language/from-glsl/. A row pairs a
// construct in the target language with the TypeShade spelling of it, and neither column is
// typed here as prose: the TypeShade column is source text that the pinned compiler is asked
// to accept, and the target column is what that compiler then writes for it. A spelling the
// compiler stops writing therefore reaches the page at the next pin as a changed row or as a
// stopped build, the way src/lib/builtin-table.ts already works for the builtin table.
//
// Three ways a row is measured, in rising cost:
//   typeRows()    the front end maps a TypeShade type annotation to an IR type, and each
//                 backend's `typeName` spells it. A backend with no form for it throws, and
//                 the row carries that message.
//   lineRows()    a whole `"use typeshade"` file is compiled and one line of the emitted
//                 shader is picked out by a marker. This is how a declaration, an entry
//                 signature or a statement gets its target text.
//   the registry  src/core/intrinsics.ts, read through src/lib/builtin-table.ts, for the
//                 function-name rows on the GLSL page.
import { compile } from '../../vendor/shader-dsl/src/index.ts';
import { compileTsSource } from '../../vendor/shader-dsl/src/compiler/ts/source-file.ts';
import { wgslBackend } from '../../vendor/shader-dsl/src/index.ts';
// The declare-once tables are `typeshade/core/ir` only since Rule 11.19 (change 0060).
import {
  WGSL_BUILTIN_NAMES,
  WGSL_BUILTIN_TYPES,
} from '../../vendor/shader-dsl/src/core/ir/index.ts';
import type { Backend } from '../../vendor/shader-dsl/src/core/backend.ts';
import type { ShaderType } from '../../vendor/shader-dsl/src/core/ir/types.ts';

/** One line of a mapping table. `target` is what the target language writes, `source` the
 *  TypeShade spelling of it, and `id` the key the page's copy carries the note under. A
 *  `target` of null means the target has no form for the row, and `message` is then the
 *  compiler's own words for that. */
export interface MappingRowData {
  readonly id: string;
  readonly target: string | null;
  readonly source: string | null;
  readonly message: string;
}

export const row = (
  id: string,
  target: string | null,
  source: string | null,
  message = '',
): MappingRowData => ({
  id,
  target,
  source,
  message,
});

// ── the compiler, asked one question at a time ──

/** The IR type behind each `declare`d name in a `"use typeshade"` file. The front end runs
 *  with no emit, since only the types are wanted, and a file that does not compile stops the
 *  build with the diagnostics the author would have seen. */
function declaredTypes(source: string): ReadonlyMap<string, ShaderType> {
  const result = compileTsSource(`"use typeshade"\n${source}\n`, {
    fileName: 'mapping.shade.ts',
    requireDirective: true,
    emit: false,
  });
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    throw new Error(
      `[target-mapping] a type probe failed: ${errors.map((e) => e.message).join('; ')}`,
    );
  }
  return new Map([...result.bindings, ...result.vars].map((b) => [b.name, b.type]));
}

/** What one backend writes for a type, or null with the reason when it has none. The message
 *  loses its target prefix, since the column heading already names the target. */
export function spell(
  backend: Backend,
  type: ShaderType,
): { text: string | null; message: string } {
  try {
    return { text: backend.typeName(type), message: '' };
  } catch (error) {
    const text = error instanceof Error ? error.message.replace(/^glsl-es300:\s*/, '') : '';
    return { text: null, message: text };
  }
}

export interface Emitted {
  readonly wgsl: string;
  readonly glslVertex: string;
  readonly glslFragment: string;
  readonly warnings: readonly string[];
}

const emitCache = new Map<string, Emitted>();

/** A whole `"use typeshade"` file through the compiler, both targets. A front-end error stops
 *  the build; a backend refusal arrives as a warning and is handed back, because a row whose
 *  point is the refusal wants the compiler's wording for it. */
export function emitted(source: string): Emitted {
  const cached = emitCache.get(source);
  if (cached) return cached;
  const result = compile(`"use typeshade"\n${source}\n`, { fileName: 'mapping.shade.ts' });
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    throw new Error(
      `[target-mapping] a snippet failed: ${errors.map((e) => e.message).join('; ')}`,
    );
  }
  if (!result.wgsl) throw new Error('[target-mapping] a snippet emitted no WGSL');
  const value: Emitted = {
    wgsl: result.wgsl,
    glslVertex: result.glsl?.vertex ?? '',
    glslFragment: result.glsl?.fragment ?? '',
    warnings: result.diagnostics.filter((d) => d.category === 'warning').map((d) => d.message),
  };
  emitCache.set(source, value);
  return value;
}

/** The one emitted line holding `marker`, trimmed. A marker that matches nothing stops the
 *  build, so a row cannot quietly lose the text it was written to show. */
export function pick(text: string, marker: string, where: string): string {
  const hit = text.split('\n').find((line) => line.includes(marker));
  if (hit === undefined)
    throw new Error(`[target-mapping] no line holding '${marker}' in the ${where}`);
  return hit.trim();
}

/** The return part of an emitted signature line, `-> @builtin(position) vec4<f32>`, without
 *  the parameter list in front of it or the brace after it. */
function returnOf(line: string): string {
  const at = line.indexOf('->');
  if (at < 0) throw new Error(`[target-mapping] no return arrow in '${line}'`);
  return line
    .slice(at)
    .replace(/\s*\{$/, '')
    .trim();
}

/** The same, for a run of lines from the one holding `marker` through the one holding `end`. */
export function pickBlock(text: string, marker: string, end: string, where: string): string {
  const lines = text.split('\n');
  const from = lines.findIndex((line) => line.includes(marker));
  if (from < 0) throw new Error(`[target-mapping] no line holding '${marker}' in the ${where}`);
  const to = lines.slice(from).findIndex((line) => line.includes(end));
  if (to < 0)
    throw new Error(`[target-mapping] no line holding '${end}' after '${marker}' in the ${where}`);
  return lines
    .slice(from, from + to + 1)
    .map((line) => line.trimEnd())
    .join('\n');
}

// ── types ──

/** A type probe: the TypeShade annotation, and the declaration that gives it a name to hang
 *  on. A value type needs a `uniform<T>` wrapper, a handle stands bare, and an atomic or a
 *  runtime-sized array lives in storage. A `bool` is no host-shareable type and a two-row
 *  matrix has no std140 layout both targets agree on, so WGSL or the compiler refuses each in a
 *  uniform; those are declared as a top-level `let`, a per-invocation variable, instead. */
export type Space = 'value' | 'handle' | 'storage' | 'private';

export interface TypeProbe {
  readonly id: string;
  readonly source: string;
  readonly space: Space;
}

export const probe = (id: string, source: string, space: Space = 'value'): TypeProbe => ({
  id,
  source,
  space,
});

const declOf = (name: string, p: TypeProbe): string =>
  p.space === 'handle'
    ? `declare const ${name}: ${p.source}`
    : p.space === 'storage'
      ? `declare const ${name}: storage<${p.source}, "read_write">`
      : p.space === 'private'
        ? `let ${name}: ${p.source}`
        : `declare const ${name}: uniform<${p.source}>`;

/** Every probe compiled in one file, then spelled by one backend. */
export function typeRows(
  backend: Backend,
  probes: readonly TypeProbe[],
): readonly MappingRowData[] {
  const names = probes.map((_, i) => `t${i}`);
  const types = declaredTypes(probes.map((p, i) => declOf(names[i]!, p)).join('\n'));
  return probes.map((p, i) => {
    const type = types.get(names[i]!);
    if (!type) throw new Error(`[target-mapping] the probe '${p.source}' declared no binding`);
    const spelled = spell(backend, type);
    return row(p.id, spelled.text, p.source, spelled.message);
  });
}

export const SCALARS: readonly TypeProbe[] = [
  probe('f32', 'f32'),
  probe('i32', 'i32'),
  probe('u32', 'u32'),
  probe('bool', 'bool', 'private'),
];

export const VECTORS: readonly TypeProbe[] = [
  probe('vec3', 'vec3'),
  probe('vec3f', 'vec3f'),
  probe('vec3u', 'vec3u'),
  probe('vec3i', 'vec3i'),
  probe('vec3b', 'vec3b', 'private'),
];

const MATRIX_SHAPES: readonly (readonly [2 | 3 | 4, 2 | 3 | 4])[] = [
  [2, 2],
  [2, 3],
  [2, 4],
  [3, 2],
  [3, 3],
  [3, 4],
  [4, 2],
  [4, 3],
  [4, 4],
];

// A two-row matrix is refused in a uniform (std140 rounds each column to 16 bytes where WGSL
// packs it to 8, Rule 4.8), so the shapes are declared as top-level `let`s: the probe only
// wants the type the compiler spells.
export const MATRICES: readonly TypeProbe[] = MATRIX_SHAPES.map(([cols, rows]) =>
  probe(`mat${cols}x${rows}`, `mat${cols}x${rows}`, 'private'),
);

export const ARRAYS: readonly TypeProbe[] = [
  probe('sized', 'array<f32, 4>'),
  probe('tuple', '[f32, f32]'),
  probe('runtime', 'array<f32>', 'storage'),
  probe('atomicU32', 'atomic<u32>', 'storage'),
  probe('atomicI32', 'atomic<i32>', 'storage'),
];

export const TEXTURES: readonly TypeProbe[] = [
  probe('texture2d', 'texture_2d<f32>', 'handle'),
  probe('texture2dArray', 'texture_2d_array<f32>', 'handle'),
  probe('textureCube', 'texture_cube<f32>', 'handle'),
  probe('texture3d', 'texture_3d<f32>', 'handle'),
  probe('texture1d', 'texture_1d<f32>', 'handle'),
  probe('textureCubeArray', 'texture_cube_array<f32>', 'handle'),
  probe('textureMs', 'texture_multisampled_2d<f32>', 'handle'),
  probe('storage2d', 'texture_storage_2d<"rgba8unorm", "write">', 'handle'),
  probe('storage2dArray', 'texture_storage_2d_array<"rgba8unorm", "write">', 'handle'),
  probe('depth2d', 'texture_depth_2d', 'handle'),
  probe('depth2dArray', 'texture_depth_2d_array', 'handle'),
  probe('depthCube', 'texture_depth_cube', 'handle'),
  probe('depthCubeArray', 'texture_depth_cube_array', 'handle'),
  probe('depthMs', 'texture_depth_multisampled_2d', 'handle'),
  probe('sampler', 'sampler', 'handle'),
  probe('samplerComparison', 'sampler_comparison', 'handle'),
];

export const INTEGER_TEXTURES: readonly TypeProbe[] = [
  probe('utexture2d', 'texture_2d<u32>', 'handle'),
  probe('itexture2d', 'texture_2d<i32>', 'handle'),
];

// ── the snippets the declaration and statement rows are read from ──

const RESOURCE_SNIPPET = `class Camera { view: mat4 }
declare const camera: uniform<Camera>
declare const src: storage<array<f32>>
declare const dst: storage<array<f32>, "read_write">
declare const tex: texture_2d<f32>
declare const smp: sampler
const tint: override<f32> = 0.85
let tile: workgroup<array<f32, 64>>
let seed: u32 = 7

@compute([64, 1, 1])
export function k(@builtin("global_invocation_id") gid: vec3u): void {
  tile[gid.x] = src[gid.x] * camera.view[0].x
  seed = seed * 1664525
  dst[gid.x] = tile[gid.x] + f32(seed) * tint + textureLoad(tex, vec2i(i32(gid.x), 0), 0).x
}
`;

const ENTRY_SNIPPET = `class VsIn { @location(0) pos: vec3 }
class VsOut { @builtin("position") pos: vec4; @location(0) uv: vec2 }

@vertex
export function vs(@builtin("vertex_index") vi: u32, vin: VsIn): VsOut {
  return { pos: vec4(vin.pos, f32(vi)), uv: vin.pos.xy }
}

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`;

const COMPUTE_SNIPPET = `declare const dst: storage<array<f32>, "read_write">

@compute([64, 1, 1])
export function k(@builtin("global_invocation_id") gid: vec3u): void {
  dst[gid.x] = 1.
}
`;

const STATEMENT_SNIPPET = `declare const dst: storage<array<f32>, "read_write">

function bump(i: u32): void {
  dst[i] = dst[i] + 1.
}

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  const a = uv.x * 2.
  let b = uv.y
  b = b + a
  for (let i: i32 = 0; i < 4; i++) {
    b += a
  }
  let w: i32 = 0
  while (w < 4) {
    b += a
    w += 1
  }
  const c = uv.x > 0.5 ? a : b
  switch (i32(b)) {
    case 0:
      b = a
      break
    default:
      b = uv.y
  }
  bump(u32(b))
  if (uv.y < 0.) {
    discard
  }
  return vec4(b, c, 0., 1.)
}
`;

const PHONY_SNIPPET = `declare const counter: storage<atomic<u32>, "read_write">
declare const dst: storage<array<f32>, "read_write">

@compute([64, 1, 1])
export function k(@builtin("global_invocation_id") gid: vec3u): void {
  atomicAdd(counter, 1)
  dst[gid.x] = 1.
}
`;

const F64_SNIPPET = `class U { a: f32 }
declare const u: uniform<U>

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  const d: f64 = f64(uv.x) * f64(u.a)
  return vec4(f32(d), 0., 0., 1.)
}
`;

const SHADOW_SNIPPET = `declare const shadowMap: texture_depth_2d
declare const shadowSmp: sampler_comparison

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(textureSampleCompare(shadowMap, shadowSmp, uv, 0.5), 0., 0., 1.)
}
`;

const LOOSE_UNIFORM_SNIPPET = `declare const s: uniform<f32>

@fragment
export function fs(): vec4 {
  return vec4(s, 0., 0., 1.)
}
`;

const OVERRIDE_SNIPPET = `const tint: override<f32> = 0.85

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(uv * tint, 0., 1.)
}
`;

const STORAGE_READ_SNIPPET = `declare const src: storage<array<f32>>

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(src[i32(uv.x)], 0., 0., 1.)
}
`;

const BARE_VERTEX_SNIPPET = `@vertex
export function vs(@builtin("vertex_index") vi: u32): vec4 {
  return vec4(f32(vi), 0., 0., 1.)
}

@fragment
export function fs(): vec4 {
  return vec4(1., 0., 0., 1.)
}
`;

const FRAGCOORD_SNIPPET = `@fragment
export function fs(@builtin("position") p: vec4): vec4 {
  return p
}
`;

const VERTEX_ID_SNIPPET = `@vertex
export function vs(@builtin("vertex_index") vi: u32, @builtin("instance_index") ii: u32): vec4 {
  return vec4(f32(vi), f32(ii), 0., 1.)
}

@fragment
export function fs(): vec4 {
  return vec4(1., 0., 0., 1.)
}
`;

const FRONT_FACING_SNIPPET = `class Out { @builtin("frag_depth") depth: f32; @location(0) color: vec4 }

@fragment
export function fs(@builtin("front_facing") facing: bool): Out {
  return { depth: 0.5, color: vec4(f32(facing), 0., 0., 1.) }
}
`;

const UBO_SNIPPET = `class Block { scale: f32; tint: vec3 }
declare const u: uniform<Block>

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(uv * u.scale, u.tint.x, 1.)
}
`;

// ── the WGSL page ──

/** The table ids the WGSL page shows, in the order it shows them. */
export const WGSL_TABLES = [
  'scalars',
  'vectors',
  'matrices',
  'arrays',
  'textures',
  'resources',
  'stages',
  'builtinIds',
  'absentBuiltins',
  'statements',
] as const;

export type WgslTableId = (typeof WGSL_TABLES)[number];

/** A `@builtin(...)` id: the WGSL attribute, the TypeShade one, and the type WGSL fixes for
 *  it. `clip_distances` is the one id with no fixed type, and its cell carries a note. */
export interface BuiltinIdRow {
  readonly id: string;
  readonly wgsl: string;
  readonly source: string;
  readonly type: string | null;
}

export interface WgslMapping {
  readonly tables: Readonly<Record<WgslTableId, readonly MappingRowData[]>>;
  readonly builtinIds: readonly BuiltinIdRow[];
  /** The WGSL a double lowers to, for the row that says WGSL has no `f64`. */
  readonly f64Lane: string;
  /** How many `@builtin(...)` ids the vocabulary holds, for the copy that counts them. */
  readonly builtinIdCount: number;
}

let wgslCache: WgslMapping | null = null;

function buildWgsl(): WgslMapping {
  const w = (probes: readonly TypeProbe[]) => typeRows(wgslBackend, probes);

  const resources = emitted(RESOURCE_SNIPPET).wgsl;
  const entries = emitted(ENTRY_SNIPPET).wgsl;
  const bareVertex = emitted(BARE_VERTEX_SNIPPET).wgsl;
  const computeEntry = emitted(COMPUTE_SNIPPET).wgsl;
  const statements = emitted(STATEMENT_SNIPPET).wgsl;
  const phony = emitted(PHONY_SNIPPET).wgsl;
  const f64 = emitted(F64_SNIPPET).wgsl;

  // The three `@builtin(...)` names WGSL has no form for, with the compiler's own remedy for
  // each. The remedy is taken from the backend's denylist, so the page says what the compiler
  // says; the trailing pointer at a file in another repository is cut, since the site names
  // no consumer of the library.
  const denylist = wgslBackend.absentBuiltins;
  if (!denylist || denylist.size === 0) {
    throw new Error('[target-mapping] the WGSL backend no longer carries a builtin denylist');
  }
  const absent = [...denylist].map(([name, remedy]) => [name, remedy.split(' (see ')[0]!] as const);

  // `f16` has no type name in this surface (`"enable f16"` turns the extension on and declares
  // nothing), so its row is written here. The profile is checked against the words the copy uses for it, and a change
  // upstream stops the build instead of leaving a stale sentence on the page.
  const f16 = wgslBackend.capProfile.f16;
  if (f16?.directive !== 'f16' || f16.hostFeature !== 'shader-f16') {
    throw new Error(
      "[target-mapping] the WGSL profile no longer asks for 'enable f16' and 'shader-f16'",
    );
  }

  const tables: Record<WgslTableId, readonly MappingRowData[]> = {
    scalars: [...w(SCALARS), row('f16', 'f16', null), row('f64', null, 'f64')],
    vectors: [...w(VECTORS), row('vec3d', null, 'vec3d')],
    matrices: w(MATRICES),
    arrays: w(ARRAYS),
    textures: w([...TEXTURES, ...INTEGER_TEXTURES]),
    resources: [
      row(
        'uniform',
        pick(resources, 'var<uniform>', 'resource snippet'),
        'declare const camera: uniform<Camera>',
      ),
      row(
        'storageRead',
        pick(resources, 'storage, read>', 'resource snippet'),
        'declare const src: storage<array<f32>>',
      ),
      row(
        'storageWrite',
        pick(resources, 'storage, read_write>', 'resource snippet'),
        'declare const dst: storage<array<f32>, "read_write">',
      ),
      row(
        'texture',
        pick(resources, 'var tex:', 'resource snippet'),
        'declare const tex: texture_2d<f32>',
      ),
      row('sampler', pick(resources, 'var smp:', 'resource snippet'), 'declare const smp: sampler'),
      row(
        'workgroup',
        pick(resources, 'var<workgroup>', 'resource snippet'),
        'let tile: workgroup<array<f32, 64>>',
      ),
      row('private', pick(resources, 'var<private>', 'resource snippet'), 'let seed: u32 = 7'),
      row(
        'override',
        pick(resources, 'override tint', 'resource snippet'),
        'const tint: override<f32> = 0.85',
      ),
    ],
    stages: [
      row('vertex', pick(entries, '@vertex', 'entry snippet'), '@vertex'),
      row('fragment', pick(entries, '@fragment', 'entry snippet'), '@fragment'),
      row('compute', pick(computeEntry, '@compute', 'compute snippet'), '@compute([64, 1, 1])'),
      row(
        'location',
        pick(entries, '@location(0) uv: vec2<f32>,', 'entry snippet').replace(/,$/, ''),
        '@location(0) uv: vec2',
      ),
      row('vertexBare', returnOf(pick(bareVertex, 'fn vs(', 'bare vertex snippet')), ': vec4'),
      row(
        'vertexStruct',
        pick(entries, '@builtin(position) pos:', 'entry snippet').replace(/,$/, ''),
        '@builtin("position") pos: vec4',
      ),
      row('fragmentReturn', returnOf(pick(entries, 'fn fs(', 'entry snippet')), ': vec4'),
    ],
    builtinIds: [],
    absentBuiltins: absent.map(([name, remedy]) => row(name, `@builtin(${name})`, null, remedy)),
    statements: [
      row('let', pick(statements, 'let a =', 'statement snippet'), 'const a = uv.x * 2.'),
      row('var', pick(statements, 'var b:', 'statement snippet'), 'let b = uv.y'),
      row(
        'for',
        pick(statements, 'for (var i:', 'statement snippet'),
        'for (let i: i32 = 0; i < 4; i++)',
      ),
      row('while', pick(statements, 'for (var _w:', 'statement snippet'), 'while (w < 4)'),
      row('switch', pick(statements, 'switch i32(b)', 'statement snippet'), 'switch (i32(b))'),
      row(
        'select',
        pick(statements, 'let c = select', 'statement snippet'),
        'const c = uv.x > 0.5 ? a : b',
      ),
      row('call', pick(statements, '  bump(', 'statement snippet'), 'bump(u32(b))'),
      row('phony', pick(phony, '_ = ', 'phony snippet'), 'atomicAdd(counter, 1)'),
      row('discard', pick(statements, 'discard;', 'statement snippet'), 'discard'),
      row(
        'struct',
        pickBlock(emitted(ENTRY_SNIPPET).wgsl, 'struct VsIn {', '}', 'entry snippet'),
        'class VsIn { @location(0) pos: vec3 }',
      ),
      row('fn', pick(statements, 'fn bump(', 'statement snippet'), 'function bump(i: u32): void'),
    ],
  };

  const builtinIds: BuiltinIdRow[] = WGSL_BUILTIN_NAMES.map((name) => {
    const fixed = (WGSL_BUILTIN_TYPES as Partial<Record<string, ShaderType>>)[name];
    return {
      id: name,
      wgsl: `@builtin(${name})`,
      source: `@builtin("${name}")`,
      type: fixed ? wgslBackend.typeName(fixed) : null,
    };
  });

  return {
    tables,
    builtinIds,
    f64Lane: pick(f64, 'let d = ', 'f64 snippet'),
    builtinIdCount: WGSL_BUILTIN_NAMES.length,
  };
}

/** How many `@builtin(...)` ids the vocabulary holds, for the copy that counts them. Read
 *  from the compiler's own runtime list, with no module compiled. */
export const wgslBuiltinIdCount = (): number => WGSL_BUILTIN_NAMES.length;

/** The WGSL page's rows, measured once per build. */
export function wgslMapping(): WgslMapping {
  if (!wgslCache) wgslCache = buildWgsl();
  return wgslCache;
}
