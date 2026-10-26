# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: TypeScript developers who have not written a shader before, or who bounced off WGSL
and GLSL once. They arrive from a link (GitHub, a post, a search for "TypeScript shader") and
want to know within one screen whether writing GPU code in the language they already use is
real. The job the front page has for them: see a shader that came out of TypeScript, then open
the Playground and change a line. (Confirmed by the maintainer, 2026-09-21.)

Secondary, confirmed as present but not the front page's target: WGSL and GLSL authors comparing
the emitted code with what they would write by hand; renderer and engine developers who need
to know how the emitted module plugs into WebGPU or WebGL2 host code.

## Product Purpose

TypeShade is a shader language, written in TypeScript syntax and checked by TypeScript
tooling, and the compiler that lowers it.
A `.ts` file that starts with `"use typeshade"` is compiled to WGSL for WebGPU and GLSL ES 3.00
for WebGL2 from one source, and the same source runs on the CPU in double precision as an
oracle the emitted code is checked against. The site (typeshade.dev, English at `/`, Korean at
`/ko/`) is the primary place to learn the language; the compiler repository is the source.
Success for the site: a visitor understands what TypeShade is in one screen, opens the
Playground, and comes back to the guide when they need the rules.

## Positioning

TypeShade is a language in its own right, with TypeScript's syntax, types and editor
tooling; the compiler is how that language reaches the GPU. (Confirmed by the maintainer,
2026-09-21.)

The mechanism a neighbouring tool cannot truthfully copy: the shader is ordinary TypeScript
syntax (types, classes, functions, modules, decorators) checked by the TypeScript language
service, and one file emits both WGSL and GLSL ES 3.00. TypeGPU, wgsl-plugin and hand-written
WGSL each give up one half of that. The CPU oracle in f64 is the second claim: the compiler's
output is verified against the source's own arithmetic, and the site shows the two backends
drawing the same pass.

## Operating Context

- The site is an Astro static site. Every number on it is read at build time from the compiler
  vendored at `vendor/shader-dsl` (a pinned commit of typeshade/typeshade); a pin move is the
  only way a fact changes.
- The compiler is pre-release: version 0.0.1 in `package.json`, nothing on npm, `0.1.0` will
  be the first release. Installation today is a git submodule. The site must not imply an npm
  install exists.
- The Playground compiles in the browser (Monaco editor, a language worker, a CPU raster
  worker) and shows WGSL, both GLSL stages, diagnostics and reflection.
- Two locales, English (source) and Korean (typed against it), with build checks on voice,
  label width, route parity and translation coverage.

## Capabilities and Constraints

- The compiler registers graph-API examples (cartographic passes, screen-space effects,
  fp64 demos and compute kernels) and `"use typeshade"` source files. The site's
  `ShaderCanvas` component can emit any registered
  example at build time and run it live on WebGPU or WebGL2 with a build-time still underneath.
  `scripts/artifacts.mjs` lists the examples with captured stills; `src/lib/examples.ts`
  derives the example counts from the pinned registries.
- Live examples on guide pages (`LiveShader`) let the reader edit a shader in place, with
  sliders bound to its uniforms.
- Emitted targets: WGSL, GLSL ES 3.00. No other targets. An application that hands the emitted
  source to its own WebGPU or WebGL2 code ships nothing of TypeShade; one that imports a module
  through the Vite plugin ships `typeshade/runtime` and no compiler.
- Four entry points, decided by the maintainer in the compiler's issue #335: ① the compiler
  (`compile()`, `reflect()`, `packModule()`) for an application that already has a renderer;
  ② the program runtime, `typeshade/runtime`, which loads a compiled program's manifest and
  runs it on WebGPU in frames the host draws, for an engine built on it (compiler change 0025);
  ③ an official reference engine on ②, in a repository of its own, which does not exist yet;
  ④ the call layer, a module imported through the Vite plugin and its entries called. The
  quick start teaches ① and ④, and the WebGPU and WebGL2 concept page describes ② beside them.
  The Playground draws through the site's own runner, which moves onto ② next.
- Undecided product facts: the release date of 0.1.0; whether a versioned docs site exists
  after it (DESIGN.md says one version per pin, older docs move under `/v0.1/`).

## Brand Commitments

- Name: TypeShade. Mark: the existing SVG mark (`src/lib/mark.ts`), a stylised "TS" tile.
- Voice: plain sentences from the maintainer to other developers. Say what the tool does. No
  praise words, no "X, not Y" contrasts, no em dashes, no all-caps emphasis. Headings are short
  nouns. `scripts/check-style.mjs` enforces the checkable parts.
- Imagery: the compiler's own example shaders, rendered live or captured at build time, are the
  site's only pictures. No stock photography, no illustration. (Confirmed 2026-09-21.)
- Visual language: Ant Design (antd v5) as a CSS token system, applied site-wide, with no
  React and no antd package: its palette (primary #1677ff), its neutral scale, 6px and 8px
  radii, its elevation shadows, its type scale and its button, card and list shapes. Pinned by
  the maintainer on 2026-09-21 ("Ant would be more consistent"), after an ink-on-paper
  rendition read as not enough like a product site. IBM Plex stays the typeface because it is
  self-hosted with a matching Korean cut; Ant's system font stack is a one-line switch later.
- Fonts aside, the maintainer confirmed that the earlier DESIGN.md visual rules are all open.
  URL slugs and the two-locale dictionary system stay because the build, search and existing
  links depend on them, not as a visual commitment.

## Evidence on Hand

- Real shaders: `vendor/shader-dsl/examples/` (85), each with a title, category and one-line
  blurb; six captured stills in `public/stills/`.
- Real code: `hello.shade.ts` and the WGSL it emits, generated at build time
  (`src/lib/use-typeshade-emit.ts`, `src/lib/use-typeshade-sample.ts`); the gradient pass on
  both backends.
- Real counts from the build (`src/lib/examples.ts`): examples, examples emitting both
  targets, test files, pinned commit, license.
- Absent, do not fabricate: users, customers, testimonials, benchmarks, download counts, an npm
  package, a release date.

## Product Principles

1. Show the shader before the sentence. The output of the compiler is the proof; prose explains
   it afterwards.
2. Every number is measured at build time. A number the build does not produce is not on the
   page.
3. The Playground is one click from anywhere the visitor is curious.
4. TypeScript familiarity is the whole pitch: what a reader already knows carries them to the
   first shader.
5. Both languages are first-class. A Korean page is written, not transliterated, and a Korean
   label may not reflow the layout.

## Accessibility & Inclusion

- Every live canvas has a still underneath it and a caption that names what is drawn, so no
  visitor sees an empty frame and a screen reader hears what the picture is.
- `prefers-reduced-motion` stops the live shaders at one frame.
- Dark and light follow the system, with a switch in the header.
