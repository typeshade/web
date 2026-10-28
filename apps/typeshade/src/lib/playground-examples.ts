// The Playground's example list, read at build time from the vendored checkout.
//
// `examples/_shade.ts` in the compiler is node-only: it reads the filesystem, so importing it
// from the browser half would pull `node:fs` into the page bundle. The sources are read here
// instead, in Astro's front matter, and travel to the page as JSON.
//
// The ids below are the curated order, the same hand-written half `examples/_order.ts` keeps
// for the compiler's own example registry. An id that names no file, or a file no id names,
// fails the build with both directions reported, so this list cannot drift into a stale copy
// of the directory.
//
// An example can import another shader file (Rule 3.9): `imported-noise` imports
// `lib/noise.shade.ts`, which is not an example of its own, since the scan below reads the
// directory's top level. Each example carries the files it imports, and the page carries their
// text, so the language worker reads them the way `compile()` reads them through `readDocument`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  isRelativeSpecifier,
  resolveRelativeSpecifier,
} from '../../vendor/shader-dsl/src/compiler/ts/specifier.ts';

// Astro bundles this front matter into a chunk under dist/, so the path is resolved from the
// project root the way src/lib/api.ts and src/lib/guide.ts resolve theirs, and not from
// import.meta.url.
const examplesDir = path.resolve(process.cwd(), 'vendor/shader-dsl/examples');

/** Every TypeShade example the Playground offers, in the order the gallery groups them:
 *  cartographic passes, screen-space effects, stages, resources, values and control flow,
 *  classes and generics, imports, several passes, module state and compute, then loops that
 *  run as kernels. The
 *  same order as `SHADE_GROUPS` in src/lib/shade-examples.ts, which is where their words live;
 *  the list is repeated here because this module reads the directory with `fs` alone and
 *  imports nothing of the compiler but the rule a specifier resolves by. */
export const playgroundExampleIds = [
  'hillshade-twin',
  'fp64-deep-zoom-twin',
  'fp64-checker-plane-twin',
  'fp64-loran-twin',
  'fp64-rtc-twin',
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
  'hello',
  'hello-vsout',
  'hello-vsin',
  'bare-position',
  'twin-structs',
  'id-pick',
  'clip-planes',
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
  'ray-class',
  'orbit-inout',
  'particle-step',
  'shape-inheritance',
  'mixin-surface',
  'generic-helpers',
  'generic-class',
  'tuple-and-brand',
  'class-syntax',
  'capsule-corp-namek-class',
  'rng-method',
  'class-builder',
  'class-parts',
  'rt-renderer-class',
  'imported-noise',
  'separable-blur',
  'feedback-trail',
  'private-state',
  'workgroup-scratch',
  'workgroup-reduce',
  'atomic-histogram',
  'gpu-console',
  'compute-sync',
  'compute-reduction-twin',
  'workgroup-tile-2d',
  'workgroup-override',
  'loop-kernel',
  'loop-reduction',
  'loop-struct-array',
  'loop-on-cpu',
  'kernel-array-methods',
  'kernel-push',
  'kernel-set-unique',
  'kernel-image-invert',
] as const;

export type PlaygroundExampleId = (typeof playgroundExampleIds)[number];

/** One example as the page carries it: the id its words are keyed by, its source text, and the
 *  files it imports. */
export interface PlaygroundExample {
  readonly id: PlaygroundExampleId;
  readonly source: string;
  /** The shader files the example imports, directly or through another, by their path in the
   *  examples directory (`lib/noise.shade.ts`), in the order the imports are written. Its
   *  passes and what they import are listed here too, since the page carries them the same way. */
  readonly imports: readonly string[];
  /** The passes drawn before the example's own file each frame, in draw order (compiler change
   *  0026): each pass's name and its file under `passes/`. */
  readonly passes?: readonly { readonly name: string; readonly file: string }[];
}

const fileFor = (id: string): string => path.join(examplesDir, `${id}.shade.ts`);

/** The files of the examples directory `name` imports, directly or through another, each once,
 *  resolved by the compiler's own rule (`resolveRelativeSpecifier`), so the page carries the
 *  file `compile()` would read. TypeScript's pre-processor finds the specifiers, so an import
 *  quoted in a comment or a string is not one. A specifier that names no file throws: the
 *  compiler's registry does not compile such an example either. */
function importsOf(name: string, text: string, seen = new Set<string>()): string[] {
  for (const { fileName: specifier } of ts.preProcessFile(text, true, true).importedFiles) {
    if (!isRelativeSpecifier(specifier)) continue;
    const imported = resolveRelativeSpecifier(name, specifier);
    if (imported === undefined || seen.has(imported)) continue;
    const onDisk = path.join(examplesDir, imported);
    if (!existsSync(onDisk))
      throw new Error(`[playground] ${name} imports "${specifier}", and ${onDisk} is no file`);
    seen.add(imported);
    importsOf(imported, readFileSync(onDisk, 'utf8'), seen);
  }
  return [...seen];
}

/** The passes an example's `@example` block names (compiler change 0026), or undefined. The
 *  compiler's registry has already refused a list of any other shape. */
function passesOf(source: string): { name: string; file: string }[] | undefined {
  const block = /\/\*\s*@example\s*([\s\S]*?)\*\//.exec(source);
  if (!block) return undefined;
  const spec = JSON.parse(block[1] ?? '{}') as { passes?: { name: string; file: string }[] };
  return spec.passes?.map(({ name, file }) => ({ name, file }));
}

/** The examples, in curated order, with their sources. Throws when the list and the directory
 *  disagree, so an example added upstream is noticed at the next pin. */
export function playgroundExamples(): readonly PlaygroundExample[] {
  const onDisk = readdirSync(examplesDir)
    .filter((name) => name.endsWith('.shade.ts'))
    .map((name) => name.slice(0, -'.shade.ts'.length))
    .sort();

  const listed = new Set<string>(playgroundExampleIds);
  const missing = playgroundExampleIds.filter((id) => !onDisk.includes(id));
  const unlisted = onDisk.filter((id) => !listed.has(id));
  if (missing.length > 0 || unlisted.length > 0) {
    const parts = [
      missing.length > 0 ? `named here with no file: ${missing.join(', ')}` : '',
      unlisted.length > 0 ? `in the directory with no id here: ${unlisted.join(', ')}` : '',
    ].filter(Boolean);
    throw new Error(
      `[playground] src/lib/playground-examples.ts and ${examplesDir} disagree (${parts.join('; ')})`,
    );
  }

  return playgroundExampleIds.map((id) => {
    const source = readFileSync(fileFor(id), 'utf8');
    const passes = passesOf(source);
    const seen = new Set<string>(importsOf(`${id}.shade.ts`, source));
    for (const pass of passes ?? []) {
      seen.add(pass.file);
      importsOf(pass.file, readFileSync(path.join(examplesDir, pass.file), 'utf8'), seen);
    }
    return { id, source, imports: [...seen], ...(passes ? { passes } : {}) };
  });
}

/** The text of every file `examples` import, by its path in the examples directory: what the
 *  page hands the language worker to read an import through. */
export function playgroundLibrary(
  examples: readonly Pick<PlaygroundExample, 'imports'>[],
): Readonly<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const name of examples.flatMap((example) => example.imports))
    files[name] ??= readFileSync(path.join(examplesDir, name), 'utf8');
  return files;
}

/** The example the Playground opens with when the URL carries nothing. */
export const defaultPlaygroundExample: PlaygroundExampleId = 'hello';
