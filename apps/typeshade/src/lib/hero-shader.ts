// Build-time shader emission. Runs in Astro frontmatter only. It takes one `.shade.ts`
// example and produces what shader-runtime.ts renders, including the uniform layout as
// reflect() recovers it. An example the runtime cannot render fails the build. The `fn()`
// registry is read for one thing: a source twin's uniform values, which are its original's
// controls (shadeControls below).

import { examples } from '../../vendor/shader-dsl/examples/index.ts';
import { shadeExampleList, shadeFileModule, shadeModule } from './shade-examples.ts';
import {
  emitModule,
  emitGlslModule,
  reflect,
  packModule,
} from '../../vendor/shader-dsl/src/index.ts';
import type { Control as MirrorControl } from '../../vendor/shader-dsl/examples/_shared.ts';
import type { Control, ShaderData, ShaderLayout, ShaderPassData } from './shader-runtime.ts';
import type { ResourceSpec } from './shader-bindings.ts';
import { isReserved } from './live-shader-compile-contract.ts';

/** Translate the registry's `Control` union into the runtime's. Throws on a kind the packer
 *  has no case for. */
function toRuntimeControl(id: string, field: string, c: MirrorControl): Control {
  switch (c.kind) {
    case 'time':
    case 'resolution':
    case 'mouse':
      return { kind: c.kind };
    case 'const':
      return { kind: 'const', value: [...c.value] };
    case 'slider':
      return { kind: 'slider', value: c.value };
    case 'toggle':
      return { kind: 'toggle', value: c.value };
    case 'logmag1d':
      return { kind: 'logmag1d', magField: c.magField, base: c.base, offset: c.offset };
    case 'pan2d':
      return { kind: 'pan2d', value: [c.value[0], c.value[1]] };
    case 'logmag2d':
      return {
        kind: 'logmag2d',
        magField: c.magField,
        base: [c.base[0], c.base[1]],
        offset: [c.offset[0], c.offset[1]],
      };
    default:
      throw new Error(
        `[hero-shader] example '${id}' field '${field}' uses control kind '${(c as { kind: string }).kind}', ` +
          `which src/lib/shader-runtime.ts has no packer for. Add the case there first`,
      );
  }
}

// The three uniform-field names the runtime fills by itself, the same three the live blocks
// reserve (src/lib/live-shader-compile-contract.ts states the contract).
const RESERVED: Readonly<Record<string, MirrorControl>> = {
  time: { kind: 'time' },
  resolution: { kind: 'resolution' },
  mouse: { kind: 'mouse' },
};

const IDENTITY4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/** An f64 as its two f32 words, the way the host packs one (splitF64 in shader-runtime.ts). */
const f64Words = (x: number): number[] => [Math.fround(x), Math.fround(x - Math.fround(x))];

/** The value of each uniform field the three runtime names and a source twin's controls leave
 *  uncovered, for the `.shade.ts` files that declare their own. Each value is written the way
 *  the field's std140 slot holds it: a matrix by column, a `mat3` column padded to four words,
 *  an array element padded to sixteen bytes where the type is under that. They are the frame
 *  the example's own comments describe, so the still and the gallery tile show the picture the
 *  file is about. */
const SHADE_FIELD_VALUES: Readonly<Record<string, Readonly<Record<string, readonly number[]>>>> = {
  'hello-uniform-struct': { tint: [0.2, 0.6, 1, 1], gain: [1] },
  'bit-bump': { m: IDENTITY4 },
  'normal-matrix': {
    model: [1.5, 0, 0, 0, 0, 0.75, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    tint: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
  },
  'fp64-lane-stripes': { origin: f64Words(4_000_000.0625), span: [0.5] },
  'integer-math': { origin: [32, 32], span: [64, 64] },
  'uniform-array': {
    count: [4],
    weights: [0.4, 0, 0, 0, 0.3, 0, 0, 0, 0.2, 0, 0, 0, 0.1, 0, 0, 0],
    stops: [0.9, 0.3, 0.1, 1, 0.1, 0.4, 0.9, 1],
  },
  'loops-over-data': { steps: [16], depth: [4] },
  'path-tracer': { frame: [0], camPos: [0, 0.5, 1] },
  // `frame` is an f32 here, which the runtime does not own (its own are integers), so it holds
  // the first frame's seed.
  'rt-renderer-class': { frame: [0] },
};

/** How a `.shade.ts` example's uniform fields are filled. The registration has no `controls`
 *  field, so there is nothing to read: the three names above fill themselves, and a source
 *  twin borrows what its `fn()` original declares, since the two are the same uniform block.
 *  A field neither covers has no value the page could invent, so the example gets no still
 *  and the gallery shows it with the plain tile. */
function shadeControls(
  id: string,
  twinOf: string | undefined,
  module: Parameters<typeof reflect>[0],
): Record<string, MirrorControl> {
  const twin = twinOf ? examples.find((e) => e.id === twinOf) : undefined;
  const out: Record<string, MirrorControl> = {};
  for (const field of reflect(module).uniforms[0]?.fields ?? []) {
    // The frame count and its step are the runtime's own (see heroShader).
    if (
      isReserved(field.name, field.type) &&
      (field.name === 'frame' || field.name === 'timeDelta')
    )
      continue;
    const own = SHADE_FIELD_VALUES[id]?.[field.name];
    const control =
      twin?.controls?.[field.name] ??
      RESERVED[field.name] ??
      (own ? ({ kind: 'const', value: own } as const) : undefined);
    if (!control) {
      throw new Error(
        `[hero-shader] '${id}' declares the uniform field '${field.name}', which the page has no value for; ` +
          'take it out of SHADE_STILL_EXAMPLES in scripts/artifacts.mjs',
      );
    }
    out[field.name] = control;
  }
  // A log sweep reads its exponent from a slider of its own (`magField`), which the original
  // declares as a control with no uniform field behind it. Without it the sweep reads 0 and a
  // twin draws its frame at 10^0 where the original draws it at the slider's value.
  for (const control of Object.values(out)) {
    if (control.kind !== 'logmag1d' && control.kind !== 'logmag2d') continue;
    const mag = twin?.controls?.[control.magField];
    if (mag && !(control.magField in out)) out[control.magField] = mag;
  }
  return out;
}

/** The value each uniform field starts at in the Playground's bindings panel, for a source
 *  twin: what its `fn()` original gives the field, which is the frame the gallery's still
 *  shows. A field the original drives from a slider starts at the slider's default; a log
 *  sweep or a pan starts at the coordinate it computes there. The three fields the page fills
 *  itself are left out, and a file with no twin starts from the panel's own defaults. */
export function twinUniformDefaults(twinOf: string | undefined): Record<string, number[]> {
  const twin = twinOf ? examples.find((e) => e.id === twinOf) : undefined;
  const controls = twin?.controls ?? {};
  const sliderValue = (field: string): number => {
    const c = controls[field];
    return c?.kind === 'slider' ? c.value : c?.kind === 'toggle' ? (c.value ? 1 : 0) : 0;
  };
  const out: Record<string, number[]> = {};
  for (const [field, c] of Object.entries(controls)) {
    switch (c.kind) {
      case 'const':
        out[field] = [...c.value];
        break;
      case 'slider':
        out[field] = [c.value];
        break;
      case 'toggle':
        out[field] = [c.value ? 1 : 0];
        break;
      case 'pan2d':
        out[field] = [...c.value];
        break;
      case 'logmag1d':
        out[field] = [c.base * Math.pow(10, sliderValue(c.magField)) + c.offset];
        break;
      case 'logmag2d':
        out[field] = c.base.map(
          (b, i) => b * Math.pow(10, sliderValue(c.magField)) + (c.offset[i] ?? 0),
        );
        break;
    }
  }
  return out;
}

/** The reflected interface of one module, reduced to what the runtime binds against. */
function layoutOf(
  id: string,
  module: Parameters<typeof reflect>[0],
  passes: readonly string[] = [],
): ShaderLayout {
  const r = reflect(module);
  const group = r.bindGroups[0];
  const uniformEntry = group?.entries.find((e) => e.resourceKind === 'uniform-buffer');
  const block = r.uniforms[0];
  // A module may bind nothing at all: a `.shade.ts` example that draws from `vertex_index`
  // and constants has no uniform block, and the runtime already reads `size: 0` as "no
  // buffer, no bind group". A uniform binding whose block the reflection does not carry is
  // the broken half of the pair, and still stops the build.
  if (Boolean(uniformEntry) !== Boolean(block)) {
    throw new Error(`[hero-shader] '${id}' binds a uniform the reflection has no block for`);
  }

  // A texture named like a pass reads that pass's output (compiler change 0026), and the
  // sampler it is read through is supplied beside it: linear, clamped to the edge.
  const resources: ResourceSpec[] = [];
  for (const e of group?.entries ?? []) {
    if (e.resourceKind === 'texture' && passes.includes(e.name))
      resources.push({
        kind: 'texture',
        name: e.name,
        group: 0,
        binding: e.binding,
        dim: '2d',
        sample: 'float',
        width: 0,
        height: 0,
        layers: 1,
        texels: [],
        pass: e.name,
      });
    if (e.resourceKind === 'sampler' && passes.length > 0)
      resources.push({
        kind: 'sampler',
        name: e.name,
        group: 0,
        binding: e.binding,
        comparison: false,
        filter: 'linear',
        address: 'clamp-to-edge',
      });
  }
  const textures = (group?.entries ?? [])
    .filter((e) => e.resourceKind === 'texture' && !passes.includes(e.name))
    .map((e) => {
      // The runtime only supplies the compiler's fp64 guard texture (a 1x1 white texel).
      if (e.name !== '_fp64') {
        throw new Error(
          `[hero-shader] '${id}' declares texture '${e.name}'; the runtime only supplies the ` +
            `fp64 guard (_fp64) and would bind a white 1x1 texel to it`,
        );
      }
      return { name: e.name, binding: e.binding };
    });

  const entry = (stage: 'vertex' | 'fragment'): string => {
    const e = r.entries.find((x) => x.stage === stage);
    if (!e) throw new Error(`[hero-shader] '${id}' has no @${stage} entry point`);
    return e.name;
  };

  return {
    size: block?.size ?? 0,
    block: block?.name ?? '',
    group: uniformEntry?.group ?? 0,
    binding: uniformEntry?.binding ?? 0,
    fields: (block?.fields ?? []).map((f) => ({ name: f.name, type: f.type, offset: f.offset })),
    vertexEntry: entry('vertex'),
    fragmentEntry: entry('fragment'),
    textures,
    ...(resources.length > 0 ? { resources } : {}),
  };
}

/** The runtime's own values for the two fields a pass graph steps by, where the module has
 *  them: the frame count and the seconds since the frame before. */
function clockControls(module: Parameters<typeof reflect>[0]): Record<string, Control> {
  const out: Record<string, Control> = {};
  for (const field of reflect(module).uniforms[0]?.fields ?? []) {
    if (!isReserved(field.name, field.type)) continue;
    if (field.name === 'frame') out[field.name] = { kind: 'frame' };
    if (field.name === 'timeDelta') out[field.name] = { kind: 'timeDelta' };
  }
  return out;
}

/** Emit one `.shade.ts` example as the runtime's payload: both targets plus the reflected
 *  layout. The registry's `blurb` is left out: nothing reads it, and it would ship prose the
 *  page never renders into every inlined payload. */
export function heroShader(id: string): ShaderData {
  // The registration has no module in it, so the module is compiled from the file's own bytes.
  const shade = shadeExampleList.find((e) => e.id === id);
  if (!shade) throw new Error(`[hero-shader] no example '${id}' in the .shade.ts corpus`);
  const module = shadeModule(id);
  const ex = { ...shade, module, controls: shadeControls(id, shade.twinOf, module) };
  if (!ex.renderable) throw new Error(`[hero-shader] example '${id}' is not renderable (compute)`);

  const controls: Record<string, Control> = { ...clockControls(ex.module) };
  for (const [field, c] of Object.entries(ex.controls ?? {})) {
    controls[field] = toRuntimeControl(id, field, c);
  }

  // An example drawn in several passes (compiler change 0026) carries each pass's program,
  // bound the same way: a texture named like a pass reads it.
  const passNames = (shade.passes ?? []).map((p) => p.name);
  const passes: ShaderPassData[] = (shade.passes ?? []).map((p) => {
    const module = shadeFileModule(p.file);
    const passControls: Record<string, Control> = { ...clockControls(module) };
    for (const [field, c] of Object.entries(shadeControls(`${id}.${p.name}`, undefined, module)))
      passControls[field] = toRuntimeControl(id, field, c);
    return {
      id: `${id}.${p.name}`,
      name: p.name,
      title: p.name,
      wgsl: emitModule(module),
      manifest: packModule(module),
      vertex: emitGlslModule(module, 'vertex'),
      fragment: emitGlslModule(module, 'fragment'),
      layout: layoutOf(`${id}.${p.name}`, module, passNames),
      controls: passControls,
    };
  });

  return {
    id: ex.id,
    title: ex.title,
    wgsl: emitModule(ex.module),
    manifest: packModule(ex.module),
    vertex: emitGlslModule(ex.module, 'vertex'),
    fragment: emitGlslModule(ex.module, 'fragment'),
    layout: layoutOf(id, ex.module, passNames),
    controls,
    ...(passes.length > 0 ? { passes } : {}),
  };
}

/** The exact bytes ShaderCanvas.astro inlines for one example, with `<` escaped so a
 *  `</script` inside the JSON cannot close the block early. */
export function heroPayload(id: string): string {
  return JSON.stringify(heroShader(id)).replace(/</g, '\\u003c');
}
