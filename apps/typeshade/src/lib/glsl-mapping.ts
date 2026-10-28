// The rows behind /guide/language/from-glsl/. Same method as src/lib/target-mapping.ts, whose
// helpers this file uses: a type annotation goes through the front end and comes back as the
// GLSL ES 3.00 spelling the backend writes for it, or as the message the backend throws where
// that target has no form; a declaration, a varying and a builtin variable are read out of the
// GLSL text a whole `"use typeshade"` file emits; and the function names come from the
// spelling registry through src/lib/builtin-table.ts.
import { glslEs300Backend, wgslBackend } from '../../vendor/shader-dsl/src/index.ts';
import { builtinGroups } from './builtin-table.ts';
import {
  emitted,
  pick,
  pickBlock,
  probe,
  row,
  typeRows,
  type MappingRowData,
  type TypeProbe,
} from './target-mapping.ts';

/** The table ids the GLSL page shows, in the order it shows them. */
export const GLSL_TABLES = [
  'scalars',
  'vectors',
  'matrices',
  'arrays',
  'samplers',
  'noForm',
  'uniforms',
  'varyings',
  'capabilities',
  'variables',
  'absentVariables',
  'functions',
  'operators',
] as const;

export type GlslTableId = (typeof GLSL_TABLES)[number];

export interface GlslMapping {
  readonly tables: Readonly<Record<GlslTableId, readonly MappingRowData[]>>;
  /** How many rows the GLSL capability profile holds, for the copy that counts them. */
  readonly capabilityCount: number;
}

const GLSL_SCALARS: readonly TypeProbe[] = [
  probe('f32', 'f32'),
  probe('i32', 'i32'),
  probe('u32', 'u32'),
  probe('bool', 'bool', 'private'),
];

const GLSL_VECTORS: readonly TypeProbe[] = [
  probe('vec3f', 'vec3'),
  probe('vec3i', 'vec3i'),
  probe('vec3u', 'vec3u'),
  probe('vec3b', 'vec3b', 'private'),
];

const GLSL_MATRICES: readonly TypeProbe[] = [
  probe('mat4', 'mat4'),
  probe('mat3', 'mat3'),
  probe('mat2x3', 'mat2x3'),
];

const GLSL_ARRAYS: readonly TypeProbe[] = [
  probe('sized', 'array<f32, 4>'),
  probe('tuple', '[f32, f32]'),
];

const GLSL_SAMPLERS: readonly TypeProbe[] = [
  probe('sampler2D', 'texture_2d<f32>', 'handle'),
  probe('usampler2D', 'texture_2d<u32>', 'handle'),
  probe('isampler2D', 'texture_2d<i32>', 'handle'),
  probe('sampler2DArray', 'texture_2d_array<f32>', 'handle'),
  probe('samplerCube', 'texture_cube<f32>', 'handle'),
  probe('sampler3D', 'texture_3d<f32>', 'handle'),
];

// The two handles this target has no type of its own for. They are not a refusal in a whole
// module: the binding emit drops each one and the texture it belongs to carries it, which is
// what the message says, so they sit with the samplers and not with the types below.
const GLSL_FUSED: readonly TypeProbe[] = [
  probe('sampler', 'sampler', 'handle'),
  probe('samplerComparison', 'sampler_comparison', 'handle'),
];

// Each of these throws in the GLSL type speller, and the row carries the compiler's own
// sentence for it.
const GLSL_NO_FORM: readonly TypeProbe[] = [
  probe('texture1d', 'texture_1d<f32>', 'handle'),
  probe('textureCubeArray', 'texture_cube_array<f32>', 'handle'),
  probe('textureMs', 'texture_multisampled_2d<f32>', 'handle'),
  probe('storageTexture', 'texture_storage_2d<"rgba8unorm", "write">', 'handle'),
  probe('atomic', 'atomic<u32>', 'storage'),
];

const UBO_SNIPPET = `class Block { scale: f32; tint: vec3 }
declare const u: uniform<Block>

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(uv * u.scale, u.tint.x, 1.)
}
`;

const LOOSE_UNIFORM_SNIPPET = `declare const scale: uniform<f32>

@fragment
export function fs(): vec4 {
  return vec4(scale, 0., 0., 1.)
}
`;

const STORAGE_READ_SNIPPET = `declare const src: storage<array<f32>>

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(src[i32(uv.x)], 0., 0., 1.)
}
`;

const OVERRIDE_SNIPPET = `const tint: override<f32> = 0.85

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(uv * tint, 0., 1.)
}
`;

const VARYING_SNIPPET = `class VsOut { @builtin("position") pos: vec4; @location(0) uv: vec2 }

@vertex
export function vs(@builtin("vertex_index") vi: u32): VsOut {
  return { pos: vec4(f32(vi), 0., 0., 1.), uv: vec2(f32(vi), 0.) }
}

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(uv, 0., 1.)
}
`;

const SHADOW_SNIPPET = `declare const shadowMap: texture_depth_2d
declare const shadowSmp: sampler_comparison

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return vec4(textureSampleCompare(shadowMap, shadowSmp, uv, 0.5), 0., 0., 1.)
}
`;

export const FRAGCOORD_SNIPPET = `@fragment
export function fs(@builtin("position") p: vec4): vec4 {
  return p
}
`;

export const VERTEX_ID_SNIPPET = `@vertex
export function vs(@builtin("vertex_index") vi: u32, @builtin("instance_index") ii: u32): vec4 {
  return vec4(f32(vi), f32(ii), 0., 1.)
}

@fragment
export function fs(): vec4 {
  return vec4(1., 0., 0., 1.)
}
`;

export const FRONT_FACING_SNIPPET = `class Out { @builtin("frag_depth") depth: f32; @location(0) color: vec4 }

@fragment
export function fs(@builtin("front_facing") facing: bool): Out {
  return { depth: 0.5, color: vec4(f32(facing), 0., 0., 1.) }
}
`;

const OPERATOR_SNIPPET = `@fragment
export function fs(@location(0) uv: vec2): vec4 {
  const floorMod = mod(uv.x, 0.5)
  const truncMod = uv.x % 0.5
  const below: vec2b = uv < vec2(0.5, 0.25)
  const same: vec2b = uv === vec2(0.75, 0.125)
  const picked = select(uv.x, uv.y, below.x)
  const blended = select(vec2(0., 0.), vec2(1., 1.), below)
  return vec4(floorMod + blended.x, truncMod + blended.y, picked, f32(below.y) + f32(same.x))
}
`;

/** The GLSL text the registry writes for one builtin, with placeholder arguments. */
function registryGlsl(id: string): { call: string; glsl: string } {
  for (const group of builtinGroups()) {
    for (const entry of group.rows) {
      if (entry.id !== id) continue;
      if (!entry.glsl) {
        throw new Error(`[glsl-mapping] '${id}' has no GLSL form any more: ${entry.glslMessage}`);
      }
      return { call: entry.call, glsl: entry.glsl };
    }
  }
  throw new Error(`[glsl-mapping] the registry no longer holds a builtin called '${id}'`);
}

const fnRow = (id: string): MappingRowData => {
  const entry = registryGlsl(id);
  return row(id, entry.glsl, entry.call);
};

/** The compiler's own remedy for a `@builtin(...)` name neither writer takes, read off the
 *  WGSL backend's denylist. The trailing pointer at a file in another repository is cut,
 *  since the reference names no product built on TypeShade. */
function remedyFor(name: string): string {
  const remedy = wgslBackend.absentBuiltins?.get(name);
  if (!remedy) throw new Error(`[glsl-mapping] the WGSL backend no longer refuses '${name}'`);
  return remedy.split(' (see ')[0]!;
}

/** A name the emitted GLSL has to hold, handed back so a cell can show the name alone while
 *  the compiler's own output still decides whether the row is true. */
function nameIn(text: string, name: string, where: string): string {
  if (!text.includes(name))
    throw new Error(`[glsl-mapping] the ${where} no longer writes '${name}'`);
  return name;
}

let cache: GlslMapping | null = null;

function build(): GlslMapping {
  const g = (probes: readonly TypeProbe[]) => typeRows(glslEs300Backend, probes);

  const ubo = emitted(UBO_SNIPPET).glslFragment;
  const loose = emitted(LOOSE_UNIFORM_SNIPPET);
  const storage = emitted(STORAGE_READ_SNIPPET).glslFragment;
  const override = emitted(OVERRIDE_SNIPPET).glslFragment;
  const varyings = emitted(VARYING_SNIPPET);
  const shadow = emitted(SHADOW_SNIPPET).glslFragment;
  const fragCoord = emitted(FRAGCOORD_SNIPPET).glslFragment;
  const vertexId = emitted(VERTEX_ID_SNIPPET).glslVertex;
  const frontFacing = emitted(FRONT_FACING_SNIPPET).glslFragment;
  const operators = emitted(OPERATOR_SNIPPET).glslFragment;

  // A bare scalar uniform reaches the GLSL writer as a refusal, and the refusal is the row.
  const looseMessage = loose.warnings
    .map((text) => text.replace(/^Backend emit failed:\s*glsl-es300:\s*/, ''))
    .find((text) => text.includes('std140'));
  if (!looseMessage) {
    throw new Error(
      '[glsl-mapping] a bare scalar uniform no longer names the std140 block it wants',
    );
  }

  const profile = glslEs300Backend.capProfile;
  const capabilities = Object.entries(profile).map(([id, support]) =>
    row(
      id,
      support?.directive ? `#extension ${support.directive} : require` : null,
      id,
      support?.hostFeature ?? '',
    ),
  );

  const tables: Record<GlslTableId, readonly MappingRowData[]> = {
    scalars: g(GLSL_SCALARS),
    vectors: g(GLSL_VECTORS),
    matrices: g(GLSL_MATRICES),
    arrays: g(GLSL_ARRAYS),
    samplers: [
      ...g(GLSL_SAMPLERS),
      row(
        'sampler2DShadow',
        pick(shadow, 'sampler2DShadow shadowMap', 'shadow snippet').replace(
          /^uniform\s+(\S+)\s.*$/,
          '$1',
        ),
        'texture_depth_2d',
      ),
      ...g(GLSL_FUSED),
    ],
    noForm: g(GLSL_NO_FORM),
    uniforms: [
      row(
        'block',
        pickBlock(ubo, 'layout(std140) uniform Block {', '} u;', 'uniform snippet'),
        'declare const u: uniform<Block>',
      ),
      row('loose', null, 'declare const scale: uniform<f32>', looseMessage),
      row(
        'storage',
        pick(storage, 'uniform sampler2D src;', 'storage snippet'),
        'declare const src: storage<array<f32>>',
      ),
      row('fetch', pick(storage, 'float _sfetch(', 'storage snippet'), 'src[i32(uv.x)]'),
      row(
        'define',
        pick(override, '#define tint', 'override snippet'),
        'const tint: override<f32> = 0.85',
      ),
      row('precision', pick(ubo, 'precision highp float;', 'uniform snippet'), null),
    ],
    varyings: [
      row(
        'out',
        pick(varyings.glslVertex, 'out vec2 uv;', 'varying snippet'),
        '@location(0) uv: vec2',
      ),
      row(
        'in',
        pick(varyings.glslFragment, 'in vec2 uv;', 'varying snippet'),
        '@location(0) uv: vec2',
      ),
      row('target', pick(varyings.glslFragment, 'out vec4 _ret;', 'varying snippet'), ': vec4'),
    ],
    capabilities,
    variables: [
      row('glPosition', nameIn(vertexId, 'gl_Position', 'vertex snippet'), '@builtin("position")'),
      row(
        'glFragCoord',
        nameIn(fragCoord, 'gl_FragCoord', 'fragment snippet'),
        '@builtin("position")',
      ),
      row(
        'glVertexID',
        nameIn(vertexId, 'uint(gl_VertexID)', 'vertex snippet'),
        '@builtin("vertex_index")',
      ),
      row(
        'glInstanceID',
        nameIn(vertexId, 'uint(gl_InstanceID)', 'vertex snippet'),
        '@builtin("instance_index")',
      ),
      row(
        'glFrontFacing',
        nameIn(frontFacing, 'gl_FrontFacing', 'front facing snippet'),
        '@builtin("front_facing")',
      ),
      row(
        'glFragDepth',
        nameIn(frontFacing, 'gl_FragDepth', 'front facing snippet'),
        '@builtin("frag_depth")',
      ),
    ],
    absentVariables: [
      row('glPointSize', 'gl_PointSize', null, remedyFor('point_size')),
      row('glPointCoord', 'gl_PointCoord', null, remedyFor('point_coord')),
    ],
    functions: [
      fnRow('dpdx'),
      fnRow('dpdy'),
      fnRow('dpdxCoarse'),
      fnRow('dpdyFine'),
      fnRow('mod'),
      fnRow('textureSample'),
      fnRow('textureLoad'),
      fnRow('textureDimensions'),
      fnRow('faceForward'),
      fnRow('inverseSqrt'),
      fnRow('round'),
      fnRow('countOneBits'),
      fnRow('firstLeadingBit'),
    ],
    operators: [
      row(
        'mod',
        pick(operators, 'float floorMod', 'operator snippet'),
        'const floorMod = mod(uv.x, 0.5)',
      ),
      row(
        'remainder',
        pick(operators, 'float truncMod', 'operator snippet'),
        'const truncMod = uv.x % 0.5',
      ),
      row(
        'lessThan',
        pick(operators, 'bvec2 below', 'operator snippet'),
        'const below: vec2b = uv < vec2(0.5, 0.25)',
      ),
      row(
        'equal',
        pick(operators, 'bvec2 same', 'operator snippet'),
        'const same: vec2b = uv === vec2(0.75, 0.125)',
      ),
      row(
        'select',
        pick(operators, 'float picked', 'operator snippet'),
        'const picked = select(uv.x, uv.y, below.x)',
      ),
      row(
        'vectorSelect',
        pick(operators, 'vec2 blended', 'operator snippet'),
        'select(vec2(0., 0.), vec2(1., 1.), below)',
      ),
    ],
  };

  return { tables, capabilityCount: capabilities.length };
}

/** How many capabilities the GLSL profile has a row for, for the copy that counts them. The
 *  profile is a plain object on the backend, so this needs no module compiled. */
export const glslCapabilityCount = (): number => Object.keys(glslEs300Backend.capProfile).length;

/** The GLSL page's rows, measured once per build. */
export function glslMapping(): GlslMapping {
  if (!cache) cache = build();
  return cache;
}
