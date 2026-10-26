# Stable function plot controls

The owner reported moving slider tracks when inverseSqrt alternates fractional and integer readouts,
and missing readable x and y axes, on 2026-10-23 UTC.
Baseline: site `fda26c5a1ea7ececf08a36a00c67a74bf0e3ddde`, compiler `91c2fe31`.

## Scope

Reserve readout width from each control's numeric range and formatting before interaction.
Show explicit coordinate axes and ticks for plotted function examples, using their actual bounds.
Apply the common control correction to other live examples without changing numeric precision.
Keep canvas size, article width and site grids intact. Graph programs move into the shared module described below.
Track navigation and Git installation separately in site PR 231.

Implementation and local interaction verification are complete. CI status is tracked in PR 233.

## Expanded renderer scope

The owner directed use of TypeShade's existing shader imports and function-typed parameters.
Build a shared shader module that accepts callbacks and renders 2D/3D curves with x/y/z axes.
Add pointer zoom/pan/orbit and transitions with reduced-motion support.
Use the compiler's readDocument/default resolver for both initial build and edited programs.
Carry every module into Playground links and show imported source beside the entry file.
Reuse the existing shader runtime rather than adding another GPU execution layer.

## Implementation

The 47 catalogue entries import `function-plot.shade.ts` and supply named scalar and
spatial callbacks. Pow's filled and signed/raw comparison graphs import the same module.
The specular sphere remains a lighting example. Build and browser compilers resolve the
same source documents through TypeShade's existing resolver. Playground links carry each
module and the current viewport. Imported diagnostics retain their source file location.

The host writes viewport uniforms through the existing runtime. Wheel zoom anchors to the
cursor; pointer drag pans a 2D graph or rotates a 3D graph. Keyboard arrows, plus/minus and
Home also work. A bounded transition stops scheduling frames once the view settles.
Reduced motion applies view changes immediately. BFCache restoration retains interaction.
The graph redraws on input. Readout widths use numeric ranges and formatting precision.

## Verification on 2026-10-23 UTC

Environment: Bun 1.4.3, Node 24.19.0, Chromium with SwiftShader, compiler `91c2fe31`.

- All 47 catalogue graphs and three Pow examples emit matching WGSL and GLSL from the
  build and browser compilation paths. A genuine x/y/z trajectory callback also compiles.
- All 47 catalogue graphs render on WebGPU and WebGL2 and respond to their controls.
  The existing check also passed 40 layout screenshots and script-free fallback checks.
- The inverseSqrt rail moved approximately 33.6 px when `4` changed to `3.981` on production.
  The corrected rail has 0 px width variation in EN/KO at 1440/390 px in both themes.
- Article widths remain 836/358 px. Canvas widths remain 350/320.1875 px excluding borders.
  No horizontal page overflow was observed.
- Actual browser edits retain imports, and Playground links open and render the project.
  GPU and WebGL2 both render a spatial callback and respond to orbit at device scale 2.
- All 49 changed plot stills were captured from actual WebGPU output and their hashes verified.
- Reference-note audit passes, including imported source checks; all 43 note regression tests pass.
- SEO checks pass for 2604 pages and 2484 sitemap entries. OpenSEO reports no issues.
  External links: 1804 resolved, one font-license transport warning, zero broken links.
- Type checks, formatting and IfChange checks pass.

Evidence: `/workspace/shared/stable-function-plots/`, `shots/function-demos/`, and the PR checks.
The final pass confirms identical reset rendering after preserving the axis labels' original markup.
Menu and Git installation work is ready for review in PR 231; neither change is deployed by this PR.
