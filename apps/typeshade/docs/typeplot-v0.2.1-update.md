# TypePlot v0.2.1 update

## Baselines

- Site baseline: `6125b072f167065c645a69008dc10a54d2fd0fe2`.
- Released dependency: `github:typeshade/typeplot#v0.2.1`.
- Release tag object: `87e80af`; target commit: `a5a9cef7626b0d780ee7899672c736eac0d5c356`.
- Compiler pin remains `91c2fe31de045ebf0e5f2c333ac98b95cc460280`.

## Compatibility changes

The site continues to import `typeplot/shaders` and `typeplot/interaction`. No TypePlot
renderer or compiler is added to the site browser runtime. The new shared shader documents
include the font and palette modules, and spatial plots retain `plot3D` so edits to every trajectory coordinate remain effective.

Graph blocks receive the release's camera, transform and appearance uniforms. Ordinary
shader blocks retain their existing reserved fields and primary-block ordering. The extra
font uniform block is reflected and bound by instance on both GPU tiers.

The released base font atlas is copied unchanged into `public/vendor/typeplot`, with its
licenses, NOTICE and SHA-256 provenance. `bun run sync:typeplot-assets` regenerates these
files from the installed package, and the build checks them. GPU hosts upload the image from
its URL. The Playground decodes pixels only when CPU evaluation needs the texture. These are
texture-decoding operations; chart graphics remain named TypeShade shader output.

LiveShader, edit compilation and Playground handoff share shader sources and defaults.
Resolution is measured in CSS pixels for plot layout and actual buffer density controls
font antialiasing. Editor and diagnostic link helpers load on use to preserve the initial
script budget. A reset or page exit invalidates a pending editor mount.

Shared module listings and generated targets populate when expanded. The main editable
callback remains server-rendered, and plaintext noscript fallbacks retain shader source
access without JavaScript. Shared library source is excluded from the page search index.

## Verification

- Frozen lock installation, asset provenance, site/worker TypeScript and formatting pass.
- The final full site build passes. All 49 changed graph stills were regenerated with
  Chromium/WebGPU using the production capture pipeline, and their artifact hashes pass.
- SEO passes for 2,606 pages and 2,486 sitemap entries. Worker routing covers eight prefixes.
  OpenSEO reports no info, warning or critical issues across its 50 selected pages.
- Static import traversal measures 119,384 bytes across ten initial scripts, within the
  unchanged 120,000-byte budget. The same traversal reproduces the v0.1.1 measurement of
  118,037 bytes. This is artifact analysis, not an additional browser network review.
- Korean inverseSqrt HTML is 737,968 bytes (158,604 bytes gzip), down from approximately
  3.1 MiB in the first v0.2.1 build. It remains larger than the v0.1.1 page at 570,540 bytes
  (46,685 bytes gzip), because the new shader programs and font source are larger.
- The external checker collects 1,805 unique URLs. Its final result is recorded on PR #238.
- No test suite was added. Full manual browser regression checks were not run. The existing
  CI browser checks run on the PR; asset capture verifies the displayed initial 2D graphs.
- Compiler pin, page widths, padding and grid columns are unchanged.

The branding audit excludes only the exact five third-party font credit phrases (including
an HTML-escaped spelling) present in the released font shader. All other former-brand
references remain rejected. The source comments and license notices are preserved unchanged.

This PR is not merged or deployed. The v0.1.1 adoption evidence in
[typeplot-package-integration.md](typeplot-package-integration.md) is historical.
