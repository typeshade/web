// The `.shade.ts` corpus, as the site reads it. These are the compiler's `"use typeshade"`
// examples: one TypeScript file each, compiled by `compile()` from the file's own bytes. They
// are the only examples a reader sees. The compiler's other corpus, the `fn()` registry in
// `examples/index.ts`, is read only where a file here borrows from the example it is the
// source twin of (src/lib/examples.ts, src/lib/hero-shader.ts); its own pages redirect to the
// twin (src/lib/retired-examples.mjs). The gallery groups these files by what each one is
// there to show, and the Playground opens any of them in the editor.
//
// Why the registry is read and not imported. `examples/_shade.ts` finds its own directory
// through `import.meta.url` and reads the files from there. Vite bundles a module the site
// imports into a chunk under dist/, where that URL is the chunk's, so the read misses. Every
// other build-time read here resolves from the site root instead (src/lib/api.ts,
// src/lib/guide.ts, src/lib/playground-examples.ts all say so), and this one does the same.
// Each file registers itself: the hand-written half of its registration (title, blurb,
// renderable, twinOf) is a JSON block in a comment after the directive, `/* @example {…} */`,
// and the registry is every file in the directory, sorted by id. This reads the same block
// with the same rules, and each file is compiled from its bytes.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { compile } from '../../vendor/shader-dsl/src/index.ts';
import type { ModuleDecl } from '../../vendor/shader-dsl/src/core/ir/nodes.ts';
import { shortBlurb } from './blurb.ts';

const EXT = '.shade.ts';
const examplesDir = path.resolve(process.cwd(), 'vendor/shader-dsl/examples');
const REGISTRY = 'vendor/shader-dsl/examples/_shade.ts';
/** The block every file carries, matched the way the registry matches it: the first one wins. */
const EXAMPLE_BLOCK = /\/\*\s*@example\s*([\s\S]*?)\*\//;

/** One `.shade.ts` example as a page shows it. */
export interface ShadeExample {
  readonly id: string;
  /** The registry's own title, in English. Every other language writes its own. */
  readonly title: string;
  /** The registry's own sentence about it, in English. */
  readonly blurb: string;
  readonly file: string;
  /** Has a GLSL ES 3.00 form, so a browser with no WebGPU can still draw it. */
  readonly renderable: boolean;
  /** The `fn()` registry example this file is the source-language twin of, where it has one.
   *  The site shows the twin in the original's place and under its name. */
  readonly twinOf?: string;
  /** The passes drawn before this file each frame, in draw order (compiler change 0026). */
  readonly passes?: readonly { readonly name: string; readonly file: string }[];
}

function readRegistry(): readonly ShadeExample[] {
  const ids = readdirSync(examplesDir)
    .filter((n) => n.endsWith(EXT))
    .map((n) => n.slice(0, -EXT.length))
    .sort();
  return ids.map((id) => {
    const file = `${id}${EXT}`;
    const block = EXAMPLE_BLOCK.exec(readFileSync(path.join(examplesDir, file), 'utf8'));
    if (!block)
      throw new Error(
        `[shade] ${file} carries no @example block, so ${REGISTRY} does not register it`,
      );
    let spec: Record<string, unknown>;
    try {
      spec = JSON.parse(block[1] ?? '') as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `[shade] ${file}'s @example block is not JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const text = (key: string): string => {
      const value = spec[key];
      if (typeof value !== 'string' || value === '')
        throw new Error(`[shade] ${file}'s @example block has no string '${key}'`);
      return value;
    };
    if (typeof spec.renderable !== 'boolean')
      throw new Error(`[shade] ${file}'s @example block has no boolean 'renderable'`);
    if (spec.twinOf !== undefined && typeof spec.twinOf !== 'string')
      throw new Error(`[shade] ${file}'s 'twinOf' is not a string`);
    const passes = spec.passes;
    if (
      passes !== undefined &&
      (!Array.isArray(passes) ||
        !passes.every(
          (p: unknown) =>
            typeof p === 'object' &&
            p !== null &&
            typeof (p as Record<string, unknown>).name === 'string' &&
            typeof (p as Record<string, unknown>).file === 'string',
        ))
    )
      throw new Error(`[shade] ${file}'s 'passes' is not a list of { name, file }`);
    return {
      id,
      title: text('title'),
      blurb: text('blurb'),
      file,
      renderable: spec.renderable,
      ...(spec.twinOf ? { twinOf: spec.twinOf } : {}),
      ...(passes ? { passes: passes as { name: string; file: string }[] } : {}),
    };
  });
}

export const shadeExampleList: readonly ShadeExample[] = readRegistry();

/** Every id, in the registry's own order. */
export const shadeExampleIds: readonly string[] = shadeExampleList.map((e) => e.id);

/** What the copy counts: the corpus, and how much of it has a second target. */
export const shadeCounts = {
  total: shadeExampleList.length,
  renderable: shadeExampleList.filter((e) => e.renderable).length,
};

/** A file of the examples directory, by its path relative to it, or `undefined` when there is
 *  none: what `compile()` reads an example's imports through, as the registry's `readHere`. */
function readExampleFile(name: string): string | undefined {
  try {
    return readFileSync(path.join(examplesDir, name), 'utf8');
  } catch {
    return undefined;
  }
}

/** One example's compiled module, from the file's own bytes, the way the registry compiles
 *  it. A file that imports another is one program with it, read from the same directory:
 *  `imported-noise` reads `lib/noise.shade.ts`, which is not an example of its own. An error
 *  diagnostic throws, so a file that stopped being a program cannot reach a page as an empty
 *  module. */
export function shadeModule(id: string): ModuleDecl {
  const example = shadeExampleList.find((e) => e.id === id);
  if (!example) throw new Error(`[shade] no example '${id}' in ${REGISTRY}`);
  return shadeFileModule(example.file);
}

/** The module one file of the examples directory compiles to: an example, or a pass of one. */
export function shadeFileModule(file: string): ModuleDecl {
  const example = { file };
  const { diagnostics, module } = compile(
    readFileSync(path.join(examplesDir, example.file), 'utf8'),
    { fileName: example.file, readDocument: readExampleFile },
  );
  const errors = diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    throw new Error(
      `[shade] ${example.file} does not compile: ${errors.map((d) => `${d.line}:${d.character} ${d.message}`).join('; ')}`,
    );
  }
  if (!module) throw new Error(`[shade] ${example.file} compiled to no module`);
  return module;
}

/** The groups the gallery and the Playground's picker show, by what each file is there for.
 *  The compiler files them all under one category, `source`, because to it they are one
 *  corpus written on the other authoring surface; a reader looking for inheritance or for a
 *  texture wants them apart. The first two groups hold the source twins of the registry's
 *  cartographic and screen-space examples, which the gallery listed first, so a reader finds
 *  each one where its original was; the registry's compute example has its twin in `compute`.
 *  Each group's heading is copy and lives in the dictionaries under `examples.shade.groups`. */
export const SHADE_GROUPS = [
  {
    key: 'cartographic',
    ids: [
      'hillshade-twin',
      'fp64-deep-zoom-twin',
      'fp64-checker-plane-twin',
      'fp64-loran-twin',
      'fp64-rtc-twin',
    ],
  },
  {
    key: 'screen',
    ids: [
      'plasma-twin',
      'voronoi-twin',
      'julia-twin',
      'mandelbrot-twin',
      'domain-warp-twin',
      'tunnel-twin',
      'ocean-twin',
      'starfield-twin',
      'kaleidoscope-twin',
      'fp64-julia-twin',
      'fp64-burning-ship-twin',
      'fp64-newton-twin',
      'fp64-mandelbrot-de-twin',
      'fp64-clock-twin',
      'fp64-cancellation-twin',
      'fp64-sine-sweep-twin',
      'gradient-twin',
    ],
  },
  {
    key: 'stages',
    ids: [
      'hello',
      'hello-vsout',
      'hello-vsin',
      'bare-position',
      'twin-structs',
      'id-pick',
      'clip-planes',
    ],
  },
  {
    key: 'resources',
    ids: [
      'hello-uniform',
      'hello-uniform-struct',
      'hello-camera',
      'textured-quad',
      'array-length',
      'storage-texture',
      'shadow-compare',
      'cube-env',
      'cube-array-gather',
      'msaa-resolve',
      'uniform-array',
      'sample-branch',
    ],
  },
  {
    key: 'values',
    ids: [
      'module-const',
      'palette-const',
      'array-literal-ramp',
      'convert-grid',
      'normal-matrix',
      'fp64-lane-stripes',
      'bitfield-bands',
      'block-scope',
      'pick-composite',
      'cutout',
      'default-args',
      'reference-parameters',
      'bit-bump',
      'bool-select',
      'integer-math',
      'packing-bitcast',
      'packed-bytes',
      'closures',
      'higher-order',
      'inferred-returns',
      'array-methods',
      'loops-over-data',
      'path-tracer',
    ],
  },
  {
    key: 'classes',
    ids: [
      'capsule-corp-namek-class',
      'ray-class',
      'orbit-inout',
      'particle-step',
      'shape-inheritance',
      'mixin-surface',
      'generic-helpers',
      'generic-class',
      'tuple-and-brand',
      'class-syntax',
      'rng-method',
      'class-builder',
      'class-parts',
      'rt-renderer-class',
    ],
  },
  {
    key: 'imports',
    ids: ['imported-noise'],
  },
  {
    key: 'passes',
    ids: ['separable-blur', 'feedback-trail'],
  },
  {
    key: 'compute',
    ids: [
      'private-state',
      'workgroup-scratch',
      'workgroup-reduce',
      'atomic-histogram',
      'gpu-console',
      'compute-sync',
      'compute-reduction-twin',
      'workgroup-tile-2d',
      'workgroup-override',
    ],
  },
  {
    key: 'kernels',
    ids: [
      'loop-kernel',
      'loop-reduction',
      'loop-struct-array',
      'loop-on-cpu',
      'kernel-array-methods',
      'kernel-push',
      'kernel-set-unique',
      'kernel-image-invert',
    ],
  },
] as const;

export type ShadeGroupKey = (typeof SHADE_GROUPS)[number]['key'];

// Every id in exactly one group, checked against the registry in both directions, so a file
// added upstream stops the build here instead of going missing from the gallery.
{
  const grouped = SHADE_GROUPS.flatMap((g) => g.ids as readonly string[]);
  const seen = new Set<string>();
  const twice = grouped.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
  const ungrouped = shadeExampleIds.filter((id) => !seen.has(id));
  const unknown = grouped.filter((id) => !shadeExampleIds.includes(id));
  const parts = [
    twice.length > 0 ? `in two groups: ${twice.join(', ')}` : '',
    ungrouped.length > 0 ? `registered with no group: ${ungrouped.join(', ')}` : '',
    unknown.length > 0 ? `in a group with no registration: ${unknown.join(', ')}` : '',
  ].filter(Boolean);
  if (parts.length > 0)
    throw new Error(`[shade] SHADE_GROUPS and ${REGISTRY} disagree (${parts.join('; ')})`);
}

/** What the compiler appends to a source twin's title. The site shows a twin in the place of
 *  its original and under the original's name, so the suffix comes off. */
const TWIN_SUFFIX = ' (source twin)';

/** The English title of every `.shade.ts` example, keyed by id. English is the compiler's own
 *  wording; every other language writes its own line against the same keys, in src/i18n. A
 *  twin's title loses the suffix above, and a twin registered without it stops the build, since
 *  the title would then no longer be the original's. */
export function shadeTitles(): Record<string, string> {
  return Object.fromEntries(
    shadeExampleList.map((e) => {
      if (!e.twinOf) return [e.id, e.title];
      if (!e.title.endsWith(TWIN_SUFFIX))
        throw new Error(
          `[shade] the twin ${e.file} is titled '${e.title}', without '${TWIN_SUFFIX}'`,
        );
      return [e.id, e.title.slice(0, -TWIN_SUFFIX.length)];
    }),
  );
}

/** The English description of every one, shortened to its first clause the way the registry
 *  table's are. */
export function shadeDescriptions(): Record<string, string> {
  return Object.fromEntries(shadeExampleList.map((e) => [e.id, shortBlurb(e.blurb)]));
}

/** One locale's words for the corpus, checked against the registry, so an example added
 *  upstream cannot reach a page without a line in each language. */
export function checkedShade(what: string, words: Record<string, string>): Record<string, string> {
  const missing = shadeExampleIds.filter((id) => !words[id]);
  const extra = Object.keys(words).filter((id) => !shadeExampleIds.includes(id));
  if (missing.length > 0) throw new Error(`[shade] no ${what} for ${missing.join(', ')}`);
  if (extra.length > 0)
    throw new Error(`[shade] ${what} for ${extra.join(', ')}, which the corpus has no file for`);
  return words;
}
