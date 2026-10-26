// The data behind /guide/language/builtins/: every builtin the compiler can spell, with the
// WGSL and the GLSL ES 3.00 text its own registry writes for it. Nothing here is typed by
// hand. The registry (vendor/shader-dsl/src/core/intrinsics.ts) holds two functions per id,
// one per target, and this file runs them over placeholder arguments, which is what the API
// reference's Targets table already does one export at a time (src/lib/api.ts targetsOf).
//
// The registry is evaluated from its own source instead of imported, the way api.ts does it:
// it imports nothing, so transpiling the file and running it in a bare module object gives
// the spelling templates with no compiler barrel behind them. The evaluator is repeated here
// instead of imported from api.ts because scripts/patch-api-categories.mjs rewrites that file
// during the build, and a page's data should not depend on a patched module; the two copies
// are a dozen lines each and neither reads anything the other writes.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = 'vendor/shader-dsl';
const abs = (file: string): string => path.resolve(ROOT, file);

/** One column of the registry: the source text a target writes for a call. A column that has
 *  no form on its target throws, which is how the registry says "this target cannot". */
type Spelling = {
  wgsl: (a: readonly string[]) => string;
  glsl: (a: readonly string[]) => string;
};

/** A module of the pinned compiler, transpiled and run with no imports resolved. Every table
 *  read below is a plain object or set built at module scope, so an unresolved import only
 *  matters to a function this file never calls. */
function evaluate(file: string): Record<string, unknown> {
  const js = ts.transpileModule(readFileSync(abs(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod: Record<string, unknown> = {};
  new Function('exports', 'require', js)(mod, () => ({}));
  return mod;
}

/** The family a builtin is grouped under on the page. */
export type BuiltinFamily =
  | 'maths'
  | 'geometry'
  | 'derivatives'
  | 'bits'
  | 'packing'
  | 'casts'
  | 'textures'
  | 'atomics'
  | 'barriers'
  | 'f64';

/** The order the page's sections run in. */
export const BUILTIN_FAMILIES: readonly BuiltinFamily[] = [
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
];

// Which family each id belongs to. Every id in the three registries must appear here, or
// builtinGroups() stops the build: a builtin added upstream reaches the page as a decision to
// make and not as a row that quietly went missing.
const FAMILY_OF: Readonly<Record<string, BuiltinFamily>> = {
  // maths
  atan2: 'maths',
  round: 'maths',
  saturate: 'maths',
  inverseSqrt: 'maths',
  fma: 'maths',
  mod: 'maths',
  ldexp: 'maths',
  select: 'maths',
  sin: 'maths',
  cos: 'maths',
  tan: 'maths',
  asin: 'maths',
  acos: 'maths',
  atan: 'maths',
  sinh: 'maths',
  cosh: 'maths',
  tanh: 'maths',
  asinh: 'maths',
  acosh: 'maths',
  atanh: 'maths',
  exp: 'maths',
  log: 'maths',
  log2: 'maths',
  exp2: 'maths',
  floor: 'maths',
  ceil: 'maths',
  abs: 'maths',
  sqrt: 'maths',
  fract: 'maths',
  trunc: 'maths',
  sign: 'maths',
  radians: 'maths',
  degrees: 'maths',
  min: 'maths',
  max: 'maths',
  pow: 'maths',
  clamp: 'maths',
  mix: 'maths',
  smoothstep: 'maths',
  step: 'maths',
  any: 'maths',
  all: 'maths',
  absU: 'maths',
  quantizeToF16: 'maths',
  quantizeToF16Vec2: 'maths',
  quantizeToF16Vec3: 'maths',
  quantizeToF16Vec4: 'maths',
  // geometry
  faceForward: 'geometry',
  reflect: 'geometry',
  refract: 'geometry',
  normalize: 'geometry',
  length: 'geometry',
  dot: 'geometry',
  distance: 'geometry',
  cross: 'geometry',
  transpose: 'geometry',
  determinant: 'geometry',
  dotI: 'geometry',
  dotU: 'geometry',
  // derivatives
  dpdx: 'derivatives',
  dpdy: 'derivatives',
  fwidth: 'derivatives',
  dpdxCoarse: 'derivatives',
  dpdxFine: 'derivatives',
  dpdyCoarse: 'derivatives',
  dpdyFine: 'derivatives',
  fwidthCoarse: 'derivatives',
  fwidthFine: 'derivatives',
  // bit operations
  countOneBits: 'bits',
  reverseBits: 'bits',
  countLeadingZeros: 'bits',
  countTrailingZeros: 'bits',
  firstLeadingBit: 'bits',
  firstTrailingBit: 'bits',
  extractBits: 'bits',
  insertBits: 'bits',
  dot4U8Packed: 'bits',
  dot4I8Packed: 'bits',
  // packing
  pack2x16float: 'packing',
  unpack2x16float: 'packing',
  pack2x16unorm: 'packing',
  unpack2x16unorm: 'packing',
  pack2x16snorm: 'packing',
  unpack2x16snorm: 'packing',
  pack4x8unorm: 'packing',
  unpack4x8unorm: 'packing',
  pack4x8snorm: 'packing',
  unpack4x8snorm: 'packing',
  pack4xU8: 'packing',
  pack4xI8: 'packing',
  pack4xU8Clamp: 'packing',
  pack4xI8Clamp: 'packing',
  unpack4xU8: 'packing',
  unpack4xI8: 'packing',
  // casts
  f32: 'casts',
  i32: 'casts',
  u32: 'casts',
  bitcastU32: 'casts',
  bitcastF32: 'casts',
  bitcastVec2U32: 'casts',
  bitcastVec3U32: 'casts',
  bitcastVec4U32: 'casts',
  bitcastVec2F32: 'casts',
  bitcastVec3F32: 'casts',
  bitcastVec4F32: 'casts',
  // textures and storage
  textureSample: 'textures',
  textureSampleLevel: 'textures',
  textureSampleArray: 'textures',
  textureSampleLevelArray: 'textures',
  textureSampleBias: 'textures',
  textureSampleBiasArray: 'textures',
  textureSampleGrad: 'textures',
  textureSampleGradArray: 'textures',
  textureSampleCubeArray: 'textures',
  textureSampleLevelCubeArray: 'textures',
  textureSampleBiasCubeArray: 'textures',
  textureSampleGradCubeArray: 'textures',
  textureSampleCompareCubeArray: 'textures',
  textureSampleCompareLevelCubeArray: 'textures',
  textureSampleCompare: 'textures',
  textureSampleCompareArray: 'textures',
  textureSampleCompareLevel: 'textures',
  textureSampleCompareLevelArray: 'textures',
  textureSampleCompareCube: 'textures',
  textureSampleCompareLevelCube: 'textures',
  textureGather: 'textures',
  textureGatherArray: 'textures',
  textureGatherDepth: 'textures',
  textureGatherDepthArray: 'textures',
  textureGatherCompare: 'textures',
  textureGatherCompareArray: 'textures',
  textureLoad: 'textures',
  textureLoadArray: 'textures',
  textureLoadMs: 'textures',
  textureLoadDepthMs: 'textures',
  textureStore: 'textures',
  textureDimensions: 'textures',
  textureDimensions1d: 'textures',
  textureDimensions3d: 'textures',
  textureDimensionsMs: 'textures',
  textureNumLayers: 'textures',
  textureNumSamples: 'textures',
  arrayLength: 'textures',
  textureLoadU: 'textures',
  textureLoadArrayU: 'textures',
  textureLoad3dU: 'textures',
  textureNumLayersStorage: 'textures',
  storageFetchF32: 'textures',
  storageFetchU32: 'textures',
  storageFetchI32: 'textures',
  // barriers. The atomics are not listed: the compiler keeps its own list of them in
  // ATOMIC_INTRINSICS, and familyOf() reads the family off that.
  workgroupBarrier: 'barriers',
  storageBarrier: 'barriers',
  textureBarrier: 'barriers',
  workgroupUniformLoad: 'barriers',
  // f64
  f64: 'f64',
  f64FromParts: 'f64',
  f64Parts: 'f64',
  f64Guard: 'f64',
};

// How many arguments each spelling is shown with. The compiler states the count for the
// atomics (ATOMIC_INTRINSICS) and for every builtin the Math surface routes (MATH_FN_ARITY),
// and both are read below; these are the rest, taken from each entry's own argument order in
// the registry. An id with no count anywhere stops the build, so a call is never printed with
// the wrong number of slots.
const ARITY_OF: Readonly<Record<string, number>> = {
  select: 3,
  i32: 1,
  u32: 1,
  any: 1,
  all: 1,
  bitcastU32: 1,
  bitcastF32: 1,
  bitcastVec2U32: 1,
  bitcastVec3U32: 1,
  bitcastVec4U32: 1,
  bitcastVec2F32: 1,
  bitcastVec3F32: 1,
  bitcastVec4F32: 1,
  pack2x16float: 1,
  unpack2x16float: 1,
  pack2x16unorm: 1,
  unpack2x16unorm: 1,
  pack2x16snorm: 1,
  unpack2x16snorm: 1,
  pack4x8unorm: 1,
  unpack4x8unorm: 1,
  pack4x8snorm: 1,
  unpack4x8snorm: 1,
  pack4xU8: 1,
  pack4xI8: 1,
  pack4xU8Clamp: 1,
  pack4xI8Clamp: 1,
  unpack4xU8: 1,
  unpack4xI8: 1,
  dot4U8Packed: 2,
  dot4I8Packed: 2,
  absU: 1,
  dotI: 2,
  dotU: 2,
  quantizeToF16: 1,
  quantizeToF16Vec2: 1,
  quantizeToF16Vec3: 1,
  quantizeToF16Vec4: 1,
  // A sampled read takes the texture, the sampler, the coordinate, and then whatever the
  // form adds: a level, a bias, a pair of gradients, a layer, a depth reference.
  textureSample: 3,
  textureSampleLevel: 4,
  textureSampleBias: 4,
  textureSampleGrad: 5,
  textureSampleArray: 4,
  textureSampleLevelArray: 5,
  textureSampleBiasArray: 5,
  textureSampleGradArray: 6,
  textureSampleCubeArray: 4,
  textureSampleLevelCubeArray: 5,
  textureSampleBiasCubeArray: 5,
  textureSampleGradCubeArray: 6,
  textureSampleCompareCubeArray: 5,
  textureSampleCompareLevelCubeArray: 5,
  textureSampleCompare: 4,
  textureSampleCompareArray: 5,
  textureSampleCompareLevel: 4,
  textureSampleCompareLevelArray: 5,
  textureSampleCompareCube: 4,
  textureSampleCompareLevelCube: 4,
  // The gather forms take the channel first on a colour texture and none on a depth one.
  textureGather: 4,
  textureGatherArray: 5,
  textureGatherDepth: 3,
  textureGatherDepthArray: 4,
  textureGatherCompare: 4,
  textureGatherCompareArray: 5,
  textureLoad: 3,
  textureLoadArray: 4,
  textureLoadMs: 3,
  textureLoadDepthMs: 3,
  textureLoadU: 3,
  textureLoadArrayU: 4,
  textureLoad3dU: 3,
  textureStore: 3,
  textureDimensions: 1,
  textureDimensions1d: 1,
  textureDimensions3d: 1,
  textureDimensionsMs: 1,
  textureNumLayers: 1,
  textureNumSamples: 1,
  textureNumLayersStorage: 1,
  arrayLength: 1,
  storageFetchF32: 2,
  storageFetchU32: 2,
  storageFetchI32: 2,
  workgroupBarrier: 0,
  storageBarrier: 0,
  textureBarrier: 0,
  workgroupUniformLoad: 1,
  f64: 1,
  f64FromParts: 2,
  f64Parts: 1,
  f64Guard: 0,
};

const PLACEHOLDERS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** One builtin as the page prints it. */
export interface BuiltinRow {
  /** The id the compiler carries the call under, which is also the name an author writes for
   *  every builtin the authoring surface names. */
  readonly id: string;
  /** The call with placeholder arguments, `id(a, b)`. */
  readonly call: string;
  /** What the WGSL backend writes, or null for an id no backend ever sees. */
  readonly wgsl: string | null;
  /** What the GLSL ES 3.00 backend writes, or null when that target has no form for it. */
  readonly glsl: string | null;
  /** The compiler's own message when `glsl` is null, with its target prefix removed. Empty
   *  when the message is too long to print in a table cell. */
  readonly glslMessage: string;
  /** `Math.round` and the like, where the `Math.*` surface routes a name to this id. */
  readonly math: string | null;
  /** True for an id a pre-emit pass consumes, which reaches no backend at all. */
  readonly preEmit: boolean;
  /** True for an id spelled the same way on both targets. */
  readonly portable: boolean;
}

export interface BuiltinGroup {
  readonly family: BuiltinFamily;
  readonly rows: readonly BuiltinRow[];
}

/** The GLSL helper functions a spelling calls and the writer defines, from the compiler's own
 *  INTRINSIC_HELPERS, keyed by the id whose GLSL column calls them. */
export interface BuiltinHelper {
  readonly id: string;
  readonly fn: string;
}

interface Tables {
  readonly groups: readonly BuiltinGroup[];
  readonly helpers: readonly BuiltinHelper[];
  readonly bitHelpers: readonly string[];
  readonly counts: BuiltinCounts;
}

/** The counts the page states, measured from the registry. */
export interface BuiltinCounts {
  /** Every id the three registries hold. */
  readonly total: number;
  /** The ids spelled identically on both targets. */
  readonly portable: number;
  /** The ids GLSL ES 3.00 has no form for. */
  readonly noGlsl: number;
  /** The ids the `Math.*` surface has a name for. */
  readonly aliased: number;
}

// The GLSL writer's bit polyfills: the helper name each bit builtin's GLSL column calls.
// Taken from the spellings themselves, so a renamed helper arrives with the next pin.
const BIT_FAMILY: BuiltinFamily = 'bits';

let cache: Tables | null = null;

function build(): Tables {
  const registry = evaluate('src/core/intrinsics.ts');
  const mathAlias = evaluate('src/compiler/ts/math-alias.ts');

  const intrinsics = registry.INTRINSICS as Record<string, Spelling> | undefined;
  const portable = registry.PORTABLE_INTRINSICS as ReadonlySet<string> | undefined;
  const preEmit = registry.PRE_EMIT_INTRINSICS as ReadonlySet<string> | undefined;
  const atomics = registry.ATOMIC_INTRINSICS as Record<string, { arity: number }> | undefined;
  const helperTable = registry.INTRINSIC_HELPERS as Record<string, { fn: string }> | undefined;
  if (!intrinsics || !portable || !preEmit || !atomics || !helperTable) {
    throw new Error(
      '[builtin-table] src/core/intrinsics.ts no longer exports the registries this page is built from',
    );
  }
  const alias = mathAlias.MATH_FN_ALIAS as Record<string, string> | undefined;
  const arity = mathAlias.MATH_FN_ARITY as Record<string, number> | undefined;
  if (!alias || !arity)
    throw new Error(
      '[builtin-table] src/compiler/ts/math-alias.ts no longer exports MATH_FN_ALIAS and MATH_FN_ARITY',
    );

  // The Math name that reaches each id. Math.fround is the one name whose id is not its own.
  const mathNameOf = new Map<string, string>();
  for (const [jsName, id] of Object.entries(alias))
    if (!mathNameOf.has(id)) mathNameOf.set(id, `Math.${jsName}`);

  // The registry also holds the operators that are spelt as a prefix on both targets and not
  // as a call (`~`, the bitwise complement). An author writes them as operators, so they are
  // not builtins and the page lists none of them: an id that is not a name is an operator.
  const ids = [...new Set([...Object.keys(intrinsics), ...portable, ...preEmit])]
    .filter((id) => /^[A-Za-z_]/.test(id))
    .sort(
      (a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en') || a.localeCompare(b, 'en'),
    );

  const argsFor = (id: string): readonly string[] => {
    const n = atomics[id]?.arity ?? ARITY_OF[id] ?? arity[id];
    if (n === undefined)
      throw new Error(
        `[builtin-table] no argument count for the builtin '${id}'; add one to ARITY_OF`,
      );
    if (n > PLACEHOLDERS.length)
      throw new Error(
        `[builtin-table] '${id}' takes ${n} arguments and there are only ${PLACEHOLDERS.length} placeholders`,
      );
    return PLACEHOLDERS.slice(0, n);
  };

  const familyOf = (id: string): BuiltinFamily | undefined =>
    Object.prototype.hasOwnProperty.call(atomics, id) ? 'atomics' : FAMILY_OF[id];

  const rows: BuiltinRow[] = [];
  for (const id of ids) {
    const family = familyOf(id);
    if (!family)
      throw new Error(
        `[builtin-table] the builtin '${id}' belongs to no family; add one to FAMILY_OF`,
      );
    const args = argsFor(id);
    const call = `${id}(${args.join(', ')})`;
    if (preEmit.has(id)) {
      rows.push({
        id,
        call,
        wgsl: null,
        glsl: null,
        glslMessage: '',
        math: mathNameOf.get(id) ?? null,
        preEmit: true,
        portable: false,
      });
      continue;
    }
    const entry = intrinsics[id];
    const wgsl = entry ? entry.wgsl(args) : call;
    let glsl: string | null = null;
    let glslMessage = '';
    try {
      glsl = entry ? entry.glsl(args) : call;
    } catch (error) {
      // The registry says "no form on this target" by throwing. Its message already names the
      // reason, so the cell prints the message and invents none. The target prefix goes: the
      // column heading already says which target this is.
      const text = error instanceof Error ? error.message.replace(/^glsl-es300:\s*/, '') : '';
      glslMessage = text.length > 0 && text.length <= 160 ? text : '';
    }
    rows.push({
      id,
      call,
      wgsl,
      glsl,
      glslMessage,
      math: mathNameOf.get(id) ?? null,
      preEmit: false,
      portable: portable.has(id),
    });
  }

  const groups = BUILTIN_FAMILIES.map((family) => ({
    family,
    rows: rows.filter((r) => familyOf(r.id) === family),
  }));
  const placed = groups.reduce((n, g) => n + g.rows.length, 0);
  if (placed !== rows.length)
    throw new Error(`[builtin-table] ${rows.length} builtins, ${placed} placed in a family`);
  const empty = groups.filter((g) => g.rows.length === 0).map((g) => g.family);
  if (empty.length > 0)
    throw new Error(
      `[builtin-table] no builtin is in the ${empty.join(', ')} family; the page would show an empty section`,
    );

  const helpers = Object.entries(helperTable).map(([id, h]) => ({ id, fn: h.fn }));
  // The bit builtins' GLSL columns call a helper the writer defines too; the name is the
  // leading identifier of the spelling, read off the column instead of being repeated here.
  const bitHelpers = rows
    .filter((r) => familyOf(r.id) === BIT_FAMILY && r.glsl)
    .map((r) => /^([A-Za-z_]\w*)\(/.exec(r.glsl!)?.[1] ?? '')
    .filter((fn) => fn.startsWith('_'));
  if (bitHelpers.length === 0)
    throw new Error('[builtin-table] no bit builtin spells a GLSL helper any more');

  const counts: BuiltinCounts = {
    total: rows.length,
    portable: portable.size,
    noGlsl: rows.filter((r) => !r.preEmit && r.glsl === null).length,
    aliased: rows.filter((r) => r.math !== null).length,
  };
  return { groups, helpers, bitHelpers, counts };
}

function tables(): Tables {
  if (!cache) cache = build();
  return cache;
}

/** Every builtin, grouped into the sections the page shows, in BUILTIN_FAMILIES order. */
export const builtinGroups = (): readonly BuiltinGroup[] => tables().groups;
/** The GLSL helper functions the storage-fetch spellings call, from INTRINSIC_HELPERS. */
export const builtinHelpers = (): readonly BuiltinHelper[] => tables().helpers;
/** The GLSL helper functions the bit builtins' spellings call, in the order the rows run. */
export const bitPolyfills = (): readonly string[] => tables().bitHelpers;
/** The counts the copy states, so no number on the page is typed. */
export const builtinCounts = (): BuiltinCounts => tables().counts;
