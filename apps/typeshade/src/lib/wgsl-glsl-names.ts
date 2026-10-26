// The names that differ between WGSL and GLSL ES 3.00, for /guide/concepts/wgsl-and-glsl/.
// Every cell is the pinned compiler's own text: a type goes through the front end and comes
// back as each backend spells it (src/lib/target-mapping.ts), a builtin variable is read out of
// what a whole file emits, a function is its row in the spelling registry
// (src/lib/builtin-table.ts), and an operator is read out of one emitted fragment shader. A
// name the compiler stops writing changes the table at the next pin, and an id the registry no
// longer holds stops the build.
import { glslEs300Backend, wgslBackend } from '../../vendor/shader-dsl/src/index.ts';
import { builtinGroups, type BuiltinRow } from './builtin-table.ts';
import {
  FRAGCOORD_SNIPPET,
  FRONT_FACING_SNIPPET,
  VERTEX_ID_SNIPPET,
  glslMapping,
} from './glsl-mapping.ts';
import { languageBuiltinPage } from './language-reference.ts';
import {
  emitted,
  pick,
  probe,
  typeRows,
  type MappingRowData,
  type TypeProbe,
} from './target-mapping.ts';

/** One row: the GLSL ES 3.00 cell, the WGSL cell and the TypeShade cell. A GLSL cell with no
 *  form is the compiler's message; a TypeShade cell with a page links to it. */
export type NameCell =
  string | { readonly note: string } | { readonly name: string; readonly href?: string };
export type NameRow = readonly [NameCell, NameCell, NameCell];

export interface WgslGlslNames {
  readonly types: readonly NameRow[];
  readonly variables: readonly NameRow[];
  readonly functions: readonly NameRow[];
  readonly meaning: readonly NameRow[];
}

const TYPES: readonly TypeProbe[] = [
  probe('f32', 'f32'),
  probe('i32', 'i32'),
  probe('u32', 'u32'),
  probe('bool', 'bool', 'private'),
  probe('vec3', 'vec3'),
  probe('vec3i', 'vec3i'),
  probe('vec3u', 'vec3u'),
  probe('vec3b', 'vec3b', 'private'),
  probe('mat4', 'mat4'),
  probe('mat2x3', 'mat2x3', 'private'),
  probe('array', 'array<f32, 4>'),
  probe('texture2d', 'texture_2d<f32>', 'handle'),
  probe('textureCube', 'texture_cube<f32>', 'handle'),
  probe('sampler', 'sampler', 'handle'),
];

/** The builtins whose name or form differs between the two targets, in the order a GLSL
 *  reader meets them. `round` and `mod` are in the last table, where the meaning differs. */
const FUNCTIONS: readonly string[] = [
  'atan2',
  'inverseSqrt',
  'faceForward',
  'dpdx',
  'dpdy',
  'saturate',
  'fma',
  'select',
  'textureSample',
  'textureSampleLevel',
  'textureLoad',
  'textureDimensions',
  'pack2x16float',
  'f32',
];

// One fragment shader for the operators. Each line is picked from both emits by its name.
const OPERATORS = `@fragment
export function fs(@location(0) uv: vec2): vec4 {
  const below: vec2b = uv < vec2(0.5, 0.25)
  const floorMod = mod(uv.x, 0.5)
  const truncMod = uv.x % 0.5
  const even = round(uv.x)
  return vec4(floorMod + f32(below.x), truncMod, even, 1.)
}
`;

/** The right-hand side of an emitted `let name = …;` or `type name = …;` line. */
function valueOf(text: string, name: string, where: string): string {
  const line = pick(text, ` ${name} = `, where);
  return line.slice(line.indexOf(' = ') + 3).replace(/;$/, '');
}

const glslCell = (r: MappingRowData): NameCell => r.target ?? { note: r.message };

function build(): WgslGlslNames {
  const glslTypes = typeRows(glslEs300Backend, TYPES);
  const wgslTypes = typeRows(wgslBackend, TYPES);
  const types = TYPES.map((p, i): NameRow => [
    glslCell(glslTypes[i]!),
    wgslTypes[i]!.target ?? '',
    p.source,
  ]);

  // The WGSL builtin a TypeShade attribute names, as the WGSL emit of a whole file spells it.
  const wgslText = [FRAGCOORD_SNIPPET, VERTEX_ID_SNIPPET, FRONT_FACING_SNIPPET]
    .map((s) => emitted(s).wgsl)
    .join('\n');
  const variables = glslMapping().tables.variables.map((r): NameRow => {
    const name = /@builtin\("([a-z_]+)"\)/.exec(r.source ?? '')?.[1];
    const spelled = name ? new RegExp(`@builtin\\(${name}\\)`).exec(wgslText)?.[0] : undefined;
    if (!spelled)
      throw new Error(`[wgsl-glsl-names] the WGSL emit has no builtin for '${r.source}'`);
    return [glslCell(r), spelled, r.source ?? ''];
  });

  const rows = new Map<string, BuiltinRow>(
    builtinGroups().flatMap((g) => g.rows.map((r) => [r.id, r] as const)),
  );
  const builtin = (id: string): BuiltinRow => {
    const r = rows.get(id);
    if (!r || !r.wgsl || !r.glsl)
      throw new Error(`[wgsl-glsl-names] the registry has no two-target spelling for '${id}'`);
    return r;
  };
  const ops = emitted(OPERATORS);
  const both = (name: string): [string, string] => [
    valueOf(ops.glslFragment, name, 'operator snippet, GLSL'),
    valueOf(ops.wgsl, name, 'operator snippet, WGSL'),
  ];
  const functions: NameRow[] = FUNCTIONS.map((id): NameRow => {
    const r = builtin(id);
    return [r.glsl!, r.wgsl!, { name: r.call, href: languageBuiltinPage(id) }];
  });
  const [lessGlsl, lessWgsl] = both('below');
  functions.push([lessGlsl, lessWgsl, 'uv < vec2(0.5, 0.25)']);

  const meaning: NameRow[] = [
    [...both('floorMod'), 'mod(uv.x, 0.5)'],
    [...both('truncMod'), 'uv.x % 0.5'],
    [...both('even'), 'round(uv.x)'],
  ];
  return { types, variables, functions, meaning };
}

let cache: WgslGlslNames | undefined;

/** The four tables, measured once per build. */
export function wgslGlslNames(): WgslGlslNames {
  if (!cache) cache = build();
  return cache;
}
