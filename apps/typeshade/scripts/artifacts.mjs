// Generated binary files the site ships, each committed with a .sha256 sidecar. The build
// asserts the hashes; the capture scripts set the matching *_REBASELINE variable while they
// regenerate a file.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { FUNCTION_DEMOS } from '../src/lib/function-demo-catalog.mjs';

/** One still per mount, with the page it is captured from. A mount forced onto WebGL2 gets
 * its own file, so the image under it is a frame that backend drew. An entry with `live`
 * names a <LiveShader> instance by its id instead of an example. */
/** The `.shade.ts` examples src/lib/hero-shader.ts can emit for the canvas. The ones with a
 *  GLSL ES 3.00 form that are left out are listed in NO_STILL_REASONS below, with the reason
 *  each one gives. Those keep the gallery's plain tile. A list, because this file is read by
 *  plain Node before the build, where the registry (TypeScript) cannot be imported. */
export const SHADE_STILL_EXAMPLES = [
  'capsule-corp-namek-class',
  'array-literal-ramp',
  'bare-position',
  'bitfield-bands',
  'block-scope',
  'bool-select',
  'convert-grid',
  'cutout',
  'default-args',
  'domain-warp-twin',
  'generic-class',
  'generic-helpers',
  'gradient-twin',
  'hello',
  'hello-vsout',
  'hillshade-twin',
  'julia-twin',
  'kaleidoscope-twin',
  'mandelbrot-twin',
  'mixin-surface',
  'module-const',
  'ocean-twin',
  'orbit-inout',
  'palette-const',
  'pick-composite',
  'plasma-twin',
  'private-state',
  'ray-class',
  'reference-parameters',
  'shape-inheritance',
  'starfield-twin',
  'tunnel-twin',
  'tuple-and-brand',
  'twin-structs',
  'fp64-cancellation-twin',
  'fp64-clock-twin',
  'fp64-deep-zoom-twin',
  'fp64-sine-sweep-twin',
  'id-pick',
  'packing-bitcast',
  'voronoi-twin',
  'class-syntax',
  'rng-method',
  'class-builder',
  'class-parts',
  'closures',
  'higher-order',
  'inferred-returns',
  'array-methods',
  'imported-noise',
  'separable-blur',
  'feedback-trail',
  'fp64-checker-plane-twin',
  'fp64-loran-twin',
  'fp64-rtc-twin',
  'fp64-julia-twin',
  'fp64-burning-ship-twin',
  'fp64-newton-twin',
  'fp64-mandelbrot-de-twin',
  'hello-uniform-struct',
  'bit-bump',
  'normal-matrix',
  'fp64-lane-stripes',
  'integer-math',
  'uniform-array',
  'loops-over-data',
  'path-tracer',
  'rt-renderer-class',
];

/** Why one example has no still, keyed by id, for every example that is not in the list
 *  above. The per-example page (src/components/pages/ExamplePage.astro)
 *  prints the sentence its language writes for the reason instead of an empty frame, and
 *  src/lib/example-pages.ts holds this table against the registry in both directions,
 *  so an example added upstream stops the build here instead of shipping a blank picture.
 *
 *  The five reasons, each the refusal src/lib/hero-shader.ts already raises:
 *   - `no-glsl`      the registry marks it as having no GLSL ES 3.00 form that links
 *   - `control`      a control kind src/lib/shader-runtime.ts has no packer for
 *   - `texture`      a texture the page has no data for; only the fp64 guard is supplied
 *   - `uniform`      a uniform field that is neither one of the three the runtime fills by
 *                    itself nor covered by a source twin's controls
 *   - `vertex-buffer` vertex attributes read from a buffer, which a page that draws one
 *                    fullscreen triangle and binds no vertex buffer cannot fill */
export const NO_STILL_REASONS = {
  'hello-vsin': 'vertex-buffer',
  'hello-uniform': 'no-glsl',
  'hello-camera': 'no-glsl',
  'textured-quad': 'texture',
  'compute-reduction-twin': 'no-glsl',
  'array-length': 'no-glsl',
  'atomic-histogram': 'no-glsl',
  'gpu-console': 'no-glsl',
  'workgroup-scratch': 'no-glsl',
  'workgroup-reduce': 'no-glsl',
  'workgroup-override': 'no-glsl',
  'shadow-compare': 'texture',
  'cube-env': 'texture',
  'cube-array-gather': 'no-glsl',
  'msaa-resolve': 'no-glsl',
  'storage-texture': 'no-glsl',
  'particle-step': 'no-glsl',
  'clip-planes': 'no-glsl',
  'compute-sync': 'no-glsl',
  'packed-bytes': 'no-glsl',
  'sample-branch': 'uniform',
  'workgroup-tile-2d': 'no-glsl',
  'loop-kernel': 'no-glsl',
  'loop-reduction': 'no-glsl',
  'loop-struct-array': 'no-glsl',
  'loop-on-cpu': 'no-glsl',
  'kernel-array-methods': 'no-glsl',
  'kernel-image-invert': 'no-glsl',
  'kernel-push': 'no-glsl',
  'kernel-set-unique': 'no-glsl',
};

/** The reason keys above, so a dictionary can be held to one sentence for each. */
export const NO_STILL_REASON_KEYS = ['no-glsl', 'control', 'texture', 'uniform', 'vertex-buffer'];

export const STILLS = [
  // The gradient pass and the deep zoom, drawn at the aspect their own pages use. The ids are
  // the stills' file names, which predate the source twins that draw them now.
  { id: 'gradient', example: 'gradient-twin', page: '/guide/checks/', backend: 'webgpu' },
  {
    id: 'gradient-webgl2',
    example: 'gradient-twin',
    page: '/guide/checks/',
    forceWebGl2: true,
    backend: 'webgl2',
  },
  { id: 'fp64-deep-zoom', example: 'fp64-deep-zoom-twin', page: '/guide/examples/' },
  { id: 'quick-start-stripes', live: true, page: '/guide/quick-start/' },
  { id: 'gpu-types-disc', live: true, page: '/guide/language/gpu-types/' },
  // The front page's own live file.
  { id: 'front-first', live: true, page: '/' },
  // The reference note on `pow` (content/reference/en/function-pow.md).
  { id: 'reference-pow-curve', live: true, page: '/reference/functions/pow/' },
  { id: 'reference-pow-negative', live: true, page: '/reference/functions/pow/' },
  { id: 'reference-pow-specular', live: true, page: '/reference/functions/pow/' },
  ...FUNCTION_DEMOS.map(({ name }) => ({
    id: `reference-function-${name}`,
    live: true,
    page: `/reference/functions/${name}/`,
  })),
  // One tile per example the runtime can draw, photographed on the build-only /capture-stills/
  // page. The examples gallery and the front page show them as pictures.
  ...SHADE_STILL_EXAMPLES.map((id) => ({ id, example: id, page: '/capture-stills/' })),
];

export const ARTIFACTS = [
  { file: 'og.png', env: 'OG_REBASELINE', regenerate: 'bun run capture:og' },
  { file: 'favicon.svg', env: 'ICONS_REBASELINE', regenerate: 'bun run build:icons' },
  ...STILLS.map(({ id }) => ({
    file: `stills/${id}.webp`,
    env: 'STILLS_REBASELINE',
    regenerate: 'bun run capture:stills',
  })),
];

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Write public/<file>, then its .sha256. */
export function writeHashed(root, file, bytes) {
  const target = path.join(root, 'public', file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  const digest = sha256(bytes);
  writeFileSync(`${target}.sha256`, `${digest}\n`);
  return digest;
}

/** Throws on the first artifact whose bytes do not match its sidecar. */
export function verifyArtifacts(root) {
  for (const { file, env, regenerate } of ARTIFACTS) {
    const rebaseline = process.env[env] === '1';
    const target = path.join(root, 'public', file);
    const sidecar = `${target}.sha256`;
    if (!existsSync(target) || !existsSync(sidecar)) {
      if (rebaseline) continue;
      throw new Error(
        `[artifacts] public/${file} or its .sha256 is missing. Run \`${regenerate}\`.`,
      );
    }
    const actual = sha256(readFileSync(target));
    const expected = readFileSync(sidecar, 'utf8').trim();
    if (actual === expected || rebaseline) continue;
    throw new Error(
      `[artifacts] public/${file} does not match its committed hash.\n` +
        `  committed ${expected}\n  on disk   ${actual}\n` +
        `Regenerate it with \`${regenerate}\`, or set ${env}=1 for this build while rebaselining.`,
    );
  }
}
