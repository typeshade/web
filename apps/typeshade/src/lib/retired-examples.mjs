// The `fn()` registry examples (the compiler's examples/index.ts), which the site no longer
// shows. Each once had a page at /guide/examples/<id>/. The page of one with a `"use typeshade"`
// twin redirects to the twin's page, which shows the same shader under the same name. The page
// of one with no twin redirects to the examples page, because the site has nothing in its place.
//
// A plain list, because astro.config.mjs reads it before the build, where the registry
// (TypeScript) cannot be imported. src/lib/example-pages.ts holds it against the registry and
// against each twin's `twinOf` in both directions, so a pin that adds, removes or twins an
// example stops the build until this table says where its old page goes.

/** Registry id to the id of its twin, or `null` where it has none. */
export const RETIRED_EXAMPLES = {
  'compute-reduction': 'compute-reduction-twin',
  'domain-warp': 'domain-warp-twin',
  'fp64-burning-ship': 'fp64-burning-ship-twin',
  'fp64-cancellation': 'fp64-cancellation-twin',
  'fp64-checker-plane': 'fp64-checker-plane-twin',
  'fp64-clock': 'fp64-clock-twin',
  'fp64-deep-zoom': 'fp64-deep-zoom-twin',
  'fp64-julia': 'fp64-julia-twin',
  'fp64-loran': 'fp64-loran-twin',
  'fp64-mandelbrot-de': 'fp64-mandelbrot-de-twin',
  'fp64-newton': 'fp64-newton-twin',
  'fp64-rtc': 'fp64-rtc-twin',
  'fp64-sine-sweep': 'fp64-sine-sweep-twin',
  gradient: 'gradient-twin',
  hillshade: 'hillshade-twin',
  julia: 'julia-twin',
  kaleidoscope: 'kaleidoscope-twin',
  mandelbrot: 'mandelbrot-twin',
  ocean: 'ocean-twin',
  plasma: 'plasma-twin',
  starfield: 'starfield-twin',
  tunnel: 'tunnel-twin',
  voronoi: 'voronoi-twin',
  graticule: null,
  'color-ramp': null,
  'fbm-clouds': null,
  metaballs: null,
  truchet: null,
  heart: null,
  'override-quality': null,
  'texture-array-lod': null,
  'discard-cutout': null,
  'raymarch-sphere': null,
  'raymarch-boxes': null,
  'fp64-mercator-tiles': null,
  'fp64-mandelbrot': null,
};

/** The routes the build writes as redirects, locale-neutral: each retired page to its twin's
 *  page, or to the examples page. */
export function retiredExampleRedirects() {
  return Object.fromEntries(
    Object.entries(RETIRED_EXAMPLES).map(([id, twin]) => [
      `/guide/examples/${id}/`,
      twin ? `/guide/examples/${twin}/` : '/guide/examples/',
    ]),
  );
}
