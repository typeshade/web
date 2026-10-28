// Build-time and editor-time source, reflection and generated-control rules.
// This module is imported directly by compilation and Playground consumers; the runtime
// contract does not re-export it, preserving the initial figure bundle boundary.
import type { ShaderLayout, UniformField } from './shader-runtime.ts';
import type { TextureSpec } from './shader-bindings.ts';
import { isPlotLayout } from './live-shader-contract.ts';
import type {
  ControlKind,
  ControlProp,
  ControlProps,
  LiveControl,
} from './live-shader-contract.ts';
export type {
  ControlKind,
  ControlProp,
  ControlProps,
  LiveControl,
} from './live-shader-contract.ts';

/** The uniform fields the runtime fills every frame. A sample declares the ones it reads and
 *  leaves out the rest; a page shows no control for any of them.
 *
 *  `mouse` here is a `vec2` and is not the `mouse` control of src/lib/shader-runtime.ts, which
 *  is the registry examples' `vec4` of [x, y, down, used]. A registry example routed through
 *  this contract is refused for that reason, and never packed into the wrong bytes.
 *
 *  - `time`: seconds since the canvas mounted, as an `f32`.
 *  - `resolution`: the drawing buffer's size in device pixels, as a `vec2`.
 *  - `mouse`: the pointer over the canvas in 0 to 1, origin at the bottom left, which is the
 *    space the prelude's `uv` is in, so `mouse` and `uv` compare directly and
 *    `mouse * resolution` is the pointer in pixels. A canvas the pointer has not touched
 *    holds (0.5, 0.5), so the first frame is the one a still capture sees.
 *  - `frame`: the frames drawn since the clock started, as a `u32`, 0 on the first. A pass
 *    that reads its own frame before (compiler change 0026) starts from it.
 *  - `timeDelta`: the seconds since the frame before, as an `f32`, 0 on the first.
 *  - `plotCenter`, `plotSpan`: the graph viewport in data units, as `vec2`.
 *  - `plotRotation`: graph yaw/pitch radians, as `vec2`; `plotBlend`: 2D/3D mix, as `f32`.
 */
export const RESERVED_UNIFORMS: Readonly<Record<string, string>> = {
  time: 'f32',
  resolution: 'vec2<f32>',
  mouse: 'vec2<f32>',
  frame: 'u32',
  timeDelta: 'f32',
  plotCenter: 'vec2<f32>',
  plotSpan: 'vec2<f32>',
  plotRotation: 'vec2<f32>',
  plotBlend: 'f32',
};

/** The two fields reserved only at their own type. They came to the contract after examples
 *  already used the names for fields of their own (`rt-renderer-class` passes an `f32`
 *  `frame` to its jitter), and a field of another type stays that module's own, with the
 *  control its type gets. */
const RESERVED_AT_TYPE: ReadonlySet<string> = new Set(['frame', 'timeDelta']);

/** Whether the page fills `field` itself. `type`, where the caller has it, is the field's
 *  WGSL type, which decides for the fields reserved only at their own type. */
export const isReserved = (field: string, type?: string): boolean =>
  field in RESERVED_UNIFORMS &&
  (type === undefined || !RESERVED_AT_TYPE.has(field) || type === RESERVED_UNIFORMS[field]);

/** TypePlot host fields are reserved only inside a graph viewport block. */
export const PLOT_HOST_UNIFORMS: Readonly<Record<string, string>> = {
  rotationBasis: 'vec4<f32>',
  plotPan: 'vec2<f32>',
  appearance: 'vec4<f32>',
  decorations: 'u32',
  labelStyle: 'vec4<f32>',
  decorationOpacity: 'vec3<f32>',
  model: 'mat4x4<f32>',
  inverseModel: 'mat4x4<f32>',
  axesModel: 'mat4x4<f32>',
  inverseAxesModel: 'mat4x4<f32>',
  sceneOpacity: 'vec2<f32>',
  cameraLens: 'vec2<f32>',
  plotCenterZ: 'f32',
  parameterFocusSeed: 'f32',
  parameterBounds: 'vec2<f32>',
  parameterMode: 'u32',
  curveQuality: 'vec2<u32>',
  curvePattern: 'vec4<f32>',
  curveTiles: 'vec4<u32>',
  surfaceBounds: 'vec4<f32>',
  surfaceDomainMode: 'u32',
  surfaceRange: 'vec2<f32>',
  surfaceHeight: 'vec2<f32>',
  surfaceDepth: 'vec2<f32>',
  surfaceRender: 'vec4<f32>',
  surfaceFlags: 'u32',
};

export const isPlotHostField = (
  layout: Pick<ShaderLayout, 'fields'>,
  field: Pick<UniformField, 'name' | 'type'>,
): boolean => isPlotLayout(layout) && PLOT_HOST_UNIFORMS[field.name] === field.type;

/** The versioned package's base atlas is copied unchanged by sync-typeplot-assets.mjs. */
export function plotFontResource(binding: {
  readonly name: string;
  readonly group: number;
  readonly binding: number;
}): TextureSpec {
  return {
    kind: 'texture',
    name: binding.name,
    group: binding.group,
    binding: binding.binding,
    dim: '2d',
    sample: 'float',
    width: 1,
    height: 1,
    layers: 1,
    texels: [],
    imageUrl: '/vendor/typeplot/font-base.png',
  };
}

// ── The shape of a sample ───────────────────────────────────────────────────
//
// A live sample is a complete file the reader could paste into a project, the way every
// Book of Shaders page shows a whole `.frag` and every MDN example shows something that runs.
// The page supplies a fullscreen vertex triangle and its uv. Imported TypeShade modules
// are shown alongside the entry and carried into the Playground with it.
//
// The fragment half then reads the way a GLSL or WGSL author expects:
//
//   uniform vec2 u_resolution;      class Uniforms { resolution: vec2 }
//                                   declare const u: uniform<Uniforms>
//   void main() {                   @fragment
//                                   export function main(@location(0) uv: vec2): vec4 {
//     vec2 st = gl_FragCoord.xy       // uv is already 0 to 1
//               / u_resolution;
//     gl_FragColor = vec4(c, 1.);     return vec4(c, 1.)
//   }                               }
//
// `uv` arrives as a `@location(0)` parameter instead of the fragment position, because the
// two backends disagree about the position builtin: WGSL counts y down from the top and
// GLSL's `gl_FragCoord` counts it up from the bottom, so a shader that read it would render
// upside down on one of them. The varying is written once in the vertex half and linked by
// name on both.

export type SampleShape = 'fragment' | 'module';

/** The source with comments and string bodies blanked, for a test that reads code alone. A
 *  sample that says `// the @vertex half is written for you` is still a fragment sample.
 *  Exported for the Playground, which reads the source for the same kind of test. */
export const codeOnly = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/(['"`])(?:[^\\]|\\.)*?\1/g, '""');

/** Which shape a sample is. The test is the `@vertex` decorator, which is how the compiler
 *  finds the entry point too. */
export const sampleShape = (source: string): SampleShape =>
  /@vertex\b/.test(codeOnly(source)) ? 'module' : 'fragment';

/** The vertex half a fragment sample is compiled behind: the fullscreen triangle every Book
 *  of Shaders page draws on, and the varying it hands the fragment stage. Three vertices at
 *  (-1,-1), (3,-1) and (-1,3) cover the clip square with one triangle, and `uv` is that
 *  position in 0 to 1 with the origin at the bottom left.
 *
 *  A fragment sample names none of this. It declares its own uniform block, takes `uv` as a
 *  `@location(0)` parameter and returns a `vec4`. */
export const FRAGMENT_PRELUDE = `class VsOut {
  @builtin("position") pos: vec4
  @location(0) uv: vec2
}

@vertex
export function fullscreen(@builtin("vertex_index") i: u32): VsOut {
  const x = i === 1 ? 3. : -1.
  const y = i === 2 ? 3. : -1.
  return { pos: vec4(x, y, 0., 1.), uv: vec2(x * 0.5 + 0.5, y * 0.5 + 0.5) }
}
`;

const DIRECTIVE = '"use typeshade"';

/** The source the compiler sees, and how many lines were put in front of the reader's first
 *  one. A diagnostic's line is reported against the composed source, so a page subtracts
 *  `offset` to underline the line the reader is looking at. */
export function composeSource(source: string): { readonly text: string; readonly offset: number } {
  const body = source.replace(/^\s*(['"])use typeshade\1[ \t]*;?\s*\n?/, '');
  const head =
    sampleShape(body) === 'module' ? `${DIRECTIVE}\n\n` : `${DIRECTIVE}\n\n${FRAGMENT_PRELUDE}\n`;
  // A sample that carries the directive itself loses those lines here, so the reader's first
  // line sits that much higher in the composed text and a diagnostic has to come back further.
  const dropped = source.split('\n').length - body.split('\n').length;
  return { text: head + body, offset: head.split('\n').length - 1 - dropped };
}

/** The field types a control can be generated for, and what a page gives each one when the
 *  author says nothing. A float runs 0 to 1 in 500 steps, an integer 0 to 16 by one, a pad
 *  sits in the middle of its square and a colour starts white.
 *
 *  `bool` is absent on purpose. WGSL forbids it in the uniform address space, so a module
 *  that declares one compiles here and is refused by the device; a flag is a `u32` with
 *  `toggle: true`, which is what ControlProp.toggle is for. */
const DEFAULTS: Readonly<
  Record<
    string,
    {
      kind: ControlKind;
      scalar: LiveControl['scalar'];
      n: number;
      min: number;
      max: number;
      step: number;
      value: number;
    }
  >
> = {
  f32: { kind: 'slider', scalar: 'f32', n: 1, min: 0, max: 1, step: 0.002, value: 0.5 },
  i32: { kind: 'stepper', scalar: 'i32', n: 1, min: 0, max: 16, step: 1, value: 0 },
  u32: { kind: 'stepper', scalar: 'u32', n: 1, min: 0, max: 16, step: 1, value: 0 },
  'vec2<f32>': { kind: 'pad', scalar: 'f32', n: 2, min: 0, max: 1, step: 0.002, value: 0.5 },
  'vec3<f32>': { kind: 'slider', scalar: 'f32', n: 3, min: 0, max: 1, step: 0.002, value: 0.5 },
  'vec4<f32>': { kind: 'slider', scalar: 'f32', n: 4, min: 0, max: 1, step: 0.002, value: 0.5 },
};

/** A field type this file has no control for is left out of the page and left at zero in the
 *  buffer. `f64` and the matrices are the ones a sample can still declare. */
export const isControllable = (type: string): boolean => type in DEFAULTS;

/** Whether a `vec3` or `vec4` field is a colour by its name, for a surface with no author to
 *  say so: the Playground shows such a field as a colour picker. A live example is told by its
 *  `color` prop and never reads this. */
export const suggestsColour = (name: string): boolean =>
  /colou?r|tint|albedo|rgba?\b|(?:^|_)(?:top|bottom|sky|ground|fog)(?:$|_)/i.test(name);

const spread = (
  v: number | readonly number[] | undefined,
  n: number,
  fallback: number,
): number[] =>
  v === undefined
    ? Array.from({ length: n }, () => fallback)
    : typeof v === 'number'
      ? Array.from({ length: n }, () => v)
      : Array.from({ length: n }, (_, i) => v[i] ?? fallback);

/** One control for one uniform field, or null when the field is reserved or has a type no
 *  control covers. `prop` is what the page's author wrote for this field. */
export function controlFor(field: UniformField, prop: ControlProp = {}): LiveControl | null {
  if (isReserved(field.name, field.type)) return null;
  const base = DEFAULTS[field.type];
  if (!base) return null;
  const numeric = typeof prop.value === 'boolean' ? (prop.value ? 1 : 0) : prop.value;
  const kind: ControlKind =
    prop.color && (field.type === 'vec3<f32>' || field.type === 'vec4<f32>')
      ? 'color'
      : prop.toggle && (field.type === 'u32' || field.type === 'i32')
        ? 'checkbox'
        : base.kind;
  const colourDefault = kind === 'color' ? 1 : base.value;
  return {
    field: field.name,
    kind,
    type: field.type,
    scalar: base.scalar,
    components: base.n,
    offset: field.offset,
    ...(prop.label ? { label: prop.label } : {}),
    min: spread(prop.min, base.n, kind === 'color' ? 0 : base.min),
    max: spread(prop.max, base.n, kind === 'color' ? 1 : base.max),
    step: spread(prop.step, base.n, kind === 'color' ? 1 / 255 : base.step),
    value: spread(numeric, base.n, colourDefault),
  };
}

/** Every control one module's uniform block asks for, in declaration order. */
export function controlsFor(layout: ShaderLayout, props: ControlProps = {}): LiveControl[] {
  const out: LiveControl[] = [];
  for (const field of layout.fields) {
    if (isPlotHostField(layout, field)) continue;
    const control = controlFor(field, props[field.name]);
    if (control) out.push(control);
  }
  return out;
}

/** The field names in `props` that the module has no uniform field for. A page that renames
 *  a field in its sample and forgets its prop would otherwise show the default range for it
 *  and say nothing, so the build stops on this. */
export function strayProps(layout: ShaderLayout, props: ControlProps = {}): string[] {
  const known = new Set(layout.fields.map((f) => f.name));
  return Object.keys(props).filter((name) => !known.has(name));
}

// ── Layout ──────────────────────────────────────────────────────────────────
// The shape of `reflect()`'s answer, restated structurally so this file imports nothing from
// the compiler. The compiler's own Reflection satisfies it, and the build (live-shader-emit.ts)
// and the browser (src/scripts/live-shader-compile.ts) derive a layout through this one
// function, so an edit cannot land on different byte offsets from the first frame.

export interface ReflectedBinding {
  readonly name: string;
  readonly group: number;
  readonly binding: number;
  readonly resourceKind: string;
  readonly structName?: string;
}

export interface ReflectedStruct {
  readonly name: string;
  readonly size: number;
  readonly fields: readonly {
    readonly name: string;
    readonly type: string;
    readonly offset: number;
  }[];
}

export interface ShaderReflection {
  readonly bindGroups: readonly {
    readonly group: number;
    readonly entries: readonly ReflectedBinding[];
  }[];
  readonly uniforms: readonly ReflectedStruct[];
  readonly entries: readonly { readonly name: string; readonly stage: string }[];
}

/** The reflected interface of one live module, as the runtime binds it. A live sample may
 *  bind no uniform block at all, so a size of 0 is a normal answer here. Throws when the
 *  module has no vertex or no fragment entry, or binds a texture the runtime cannot fill. */
export function layoutFor(id: string, reflection: ShaderReflection): ShaderLayout {
  const bindings = reflection.bindGroups.flatMap((group) =>
    group.entries.map((entry) => ({ ...entry, group: group.group })),
  );
  const blocks = bindings
    .filter((entry) => entry.resourceKind === 'uniform-buffer')
    .map((binding) => ({
      binding,
      block: reflection.uniforms.find((block) => block.name === binding.structName),
    }));
  // Reflection lists structs independently from binding order. Prefer the graph/user block
  // over TypePlot's font block and identify each one by its reflected struct name.
  const primary = blocks.find(({ block }) => block && isPlotLayout(block)) ?? blocks[0];
  const uniformEntry = primary?.binding;
  const block = primary?.block;
  const plot = block ? isPlotLayout(block) : false;
  const resources = bindings
    .filter(
      (binding) => plot && binding.name === 'glyphAtlas' && binding.resourceKind === 'texture',
    )
    .map(plotFontResource);
  const textures = bindings
    .filter((entry) => entry.resourceKind === 'texture' && !(plot && entry.name === 'glyphAtlas'))
    .map((entry) => {
      if (entry.name !== '_fp64')
        throw new Error(`[live-shader] '${id}' declares texture '${entry.name}'`);
      return { name: entry.name, binding: entry.binding };
    });

  const entry = (stage: 'vertex' | 'fragment'): string => {
    const e = reflection.entries.find((x) => x.stage === stage);
    if (!e) throw new Error(`[live-shader] '${id}' has no @${stage} entry point`);
    return e.name;
  };

  return {
    size: block?.size ?? 0,
    block: block?.name ?? '',
    group: uniformEntry?.group ?? 0,
    binding: uniformEntry?.binding ?? 0,
    instance: uniformEntry?.name ?? '',
    fields: (block?.fields ?? []).map((f) => ({ name: f.name, type: f.type, offset: f.offset })),
    vertexEntry: entry('vertex'),
    fragmentEntry: entry('fragment'),
    textures,
    ...(resources.length ? { resources } : {}),
    ...(blocks.length > 1
      ? {
          moreBlocks: blocks
            .filter((entry) => entry !== primary && entry.block)
            .map(({ binding, block }) => ({
              size: block!.size,
              block: block!.name,
              group: binding.group,
              binding: binding.binding,
              instance: binding.name,
              fields: block!.fields,
            })),
        }
      : {}),
  };
}
