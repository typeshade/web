# Compiler changes this site has handled

A change to the compiler that alters what this site shows is agreed first as a proposal in the
compiler's `changes/` directory (the compiler's `changes/README.md` explains the process). Each
proposal lists, under `downstream`, the work it will owe this repository.

When a pull request moves the compiler pin (`vendor/shader-dsl`) past a proposal that names
`typeshade.github.io`, `scripts/downstream-impact.ts` fails the pull request until the proposal's
work is done on that branch and its id is recorded below. Record one list item per proposal: the
id first, then the pull request that did the work.

- 0001: a `for` loop takes a runtime bound and `while` is an open loop: the constructs page,
  the TS8006 and TS8007 copy and the TS8006 example, handled in #60.
- 0005: an array's `map`, `forEach`, `some`, `every` and `reduce` compile: the control-flow page's
  loop copy and its item on array methods (en and ko), and the array-methods example in the
  gallery, the Playground picker, the stills and the Korean blurbs, handled in #77.
- 0006: a storage binding's access mode is its second type argument: every
  `declare let x: storage<T>` the site shows, the resources page's access table and its copy,
  the uniform refusal line in both locales, the other copy that tied `let` to a writable binding, and the
  target-mapping type probes, handled in #77.
- 0007: a `switch` case body that would fall through is refused (`TS8017`), and the vector types
  are interfaces whose members include the swizzles: the control-flow page's switch row and the
  from-WGSL statements note in both locales, and the language reference, which reads an
  interface and folds its swizzles into one line, handled in #82.
- 0011: WGSL's `matCxRf` aliases are types and constructors: the nine names join the language
  reference's constructors family, handled in #83.
- 0012: a `"use typeshade"` directive after another statement is `TS8069`: its error-code page
  with a trigger and a fix, and the `TS8001` line, which now means no directive at all, in both
  locales, handled in #83.
- 0014: `console` calls reach the host from WebGPU under `console: 'gpu'`: the Playground's
  Console tab fed by the CPU run's sink and by the WebGPU run's decoded console buffer (and the
  f32 rounding the CPU run's storage inputs were missing), the `gpu-console` example in the
  gallery, the picker and the Korean blurbs, a `TS8071` page compiled with the option, a Console
  category in the API reference, and glossary terms kept apart from the driver log, handled in
  #83.
- 0009: ordinary TypeScript can import callable `.shade.ts` exports through the generated host view; the site-facing host-import copy and documentation are updated in #89.
- 0019: the Playground Console pane supports `console.table` events and the related method copy/checks are updated in #89.
- 0020: the class-builder documentation follows the compiler's `this`-parameter spelling in #89.
- 0008: a diagnostic says what the program is: the `TS8012` example goes, since its trigger is
  `TS8022` now, and its page says the number is retired, as `TS8011`'s does, once the registry
  reads "8011 and 8012 are retired"; no copy quoted a message with `struct:`, `vec3<f32>` or
  the `new` sentences, and the error-code pages compile their triggers at the pin, handled in
  #97.
- 0022: a shader file imports another: the `TS8004` page's fix imports the function from the
  file that declares it, a new `TS8072` page with a trigger and a fix, each showing the file it
  imports, in both locales; the copy that called a file a compilation unit or the whole
  program; the gallery's build-time compile and the Playground's language worker read an
  import through `readDocument`, and the toolbar names the file an example imports; the
  language service page names `readDocument` and `resolveImport`; the `imported-noise` example
  in the gallery, the picker and the Korean blurbs; and the Korean guide's two new sections,
  handled in #97.
- 0016: a host file calls a `@compute` entry and draws a full-screen `@fragment` entry, so the
  import the site held back is shown with its GPU call: the WebGPU and WebGL2 concept page's
  lead, ownership table and runtime section, and a new section on importing a module; the
  familiar-concepts row on Web APIs and the paragraph on where WebGPU fits; a front-page row for
  the host call; and the quick start's host section, which compiles the file today and imports
  it from 0.1.0 (the Vite plugin, the two `tsconfig.json` lines, `tshc sync` in `prepare`, and a
  host file that draws `hello.shade.ts`), in both locales, handled in #104.
- 0023: the command is `tshc`: the Korean translation of the guide section The CPU oracle, read
  again at the pin, and the quick start's import setup, which runs `tshc sync`, handled in #104.
- 0013: a loop that runs as a kernel: the control-flow page gains the kernel function, the
  proof's rules in one paragraph and the `TS8070` warning (en and ko); the WebGPU and WebGL2
  concept page's runtime copy gains the tiers, `configure({ prefer })` and `Resident`; the four
  loop examples, their gallery group, picker rows, Korean blurbs and the API reference's Runtime
  category came with #97, handled in #113.
- 0024: a shader module imports a package's by the package's name: the language service page's
  paragraph on imports (en and ko) names packages and the `package.json` reads; the Korean guide
  section The CPU oracle translated again from the pinned AUTHORING.md; the `TS8072` page reads
  the registry's sentences; the Playground has no `node_modules`, so it needs nothing, handled in
  #113.
- 0026: an example drawn in several passes: `src/lib/shader-runtime.ts` draws a pass list into
  canvas-sized `rgba16float` textures on WebGPU and WebGL2 (`RGBA8` where WebGL2 cannot render
  to floats, which the Playground's note says), two a pass, so a reader gets this frame's output
  of an earlier pass and the frame before's of itself or a later one; the live-shader contract
  gains `frame` and `timeDelta`, restated in DESIGN.md; the Playground draws a workspace file as
  a pass from the Pass toggle on its tab, opens an example's passes on, shows a texture named
  like a pass as its output in the bindings panel, shows a pass's own emit on its tab, carries
  the graph in the link and clears it on Restart; the CPU oracle draws the passes in order at
  frame 0; separable-blur and feedback-trail join the gallery, the picker, the Korean titles
  and lines and the stills (a still of a program with passes is the frame after a second of
  them); check-playground opens both on every engine, handled in #117.
- 0027: WebGL2 gives WGSL's answer for integer division, remainder and shift, and for a float's
  conversion to an integer: the Korean guide's values-and-mutation section says a float converts
  the same way on every target, through `_f2i` and `_f2u` on GLSL (Rule 11.12); no page shows
  GLSL's spelling of an integer operator, handled in #124.
- 0031: value parameters can be reassigned without changing the caller's value: the functions
  copy and a compiled parameter reassignment row (en and ko), and the TS8018 trigger now
  demonstrates a write to a temporary component, handled in #132.
- 0032: legal TypeScript variable and parameter names are escaped for a shader backend: the
  functions scope guidance (en and ko) follows surface section 62, while the TS8068 struct-field
  trigger keeps the remaining interface naming restriction, handled in #132.
- 0035: fieldless classes can be constructed and have methods: the class boundary copy and a
  compiled method-only class row (en and ko) explain the empty host object and internal GPU
  storage footprint. The TS8010 missing-field and TS8035 static-block examples still describe
  their remaining refusals, handled in #132.
- 0036: a direct declared nongeneric function argument can determine an integer-written local's
  scalar type: the integer-literal mapping row and its en/ko guidance describe integer demand,
  conflicting demands and the unchanged f32 default. Playground diagnostic regressions cover
  inference and disagreement, handled in #132.
- 0025: the WebGPU render and compute runners load compiled manifests into the public program
  runtime and bind resources by name, while the site keeps its WebGL2 path. Build-time,
  edited live and Playground payloads carry their manifests. Frame and pixel console captures
  use the runtime sink and keep source events; the API reference includes `typeshade/emit`
  and `repack` beside the runtime pages and concept guidance introduced in #125, handled in #132.
- 0028: render overrides use `RenderState.constants` and compute overrides use the pipeline's
  `constants`; console captures read dropped-call counts from `Frame.submit()`. Playground
  manifests are packed under the reader's emit options. English and Korean program-loading
  guidance explains overrides, console counts and the optional load-time emitter; focused
  regressions and browser probes check the migrated execution, handled in #132.
- 0037: integer-written locals take concrete declared demands from constructors, methods,
  typed initializers and simple assignments. The compiled mapping and English/Korean numeric
  guidance explain the contexts and unchanged conflict/default policy. Compiler/editor tests
  check constructor and method calls, assignment and hover agreement.
- 0038: a derived material may supply a proved read-only, dispatch-equivalent base view.
  The compiled class mapping and English/Korean class guidance explain accepted views and
  remaining override, receiver-write and alias-mutation limits. Compiler/editor fixtures
  accept the material view and retain the unsafe-override diagnostic.
- 0039: parameters and body locals may shadow module values while closures resolve the
  nearest declaration. The compiled function mapping and English/Korean scope guidance explain
  lexical shadowing and same-scope duplicate errors; focused fixtures check both behaviors.
- 0040: a parameter declared `Ref<T>` names the caller's variable, passed as `ref(x)`: the
  functions guide's parameters section and its sample, the reference-parameter and alias
  cards on the TypeScript mapping page with the WGSL they emit and the `TS8074` refusal, the
  parameter-reassignment card, the Korean translation of the authoring guide's new section,
  the glossary row, `ref` in the language reference, and the reference-parameters example in
  the gallery, the Playground picker, the stills and the Korean blurbs. The third amendment
  replaces that spelling with the parameter decorators `@inout` and `@out` and an unmarked
  argument: the functions guide's parameters section and its sample (`swap`, `add` with `@out`
  into a `let` with no value) and a local function that reads and writes a qualified parameter
  around it, in both locales; the `@inout` card, a new `@out` card and the
  alias card on the TypeScript mapping page; the parameter-reassignment card; the set of
  attributes on the types page; the Korean translation of the authoring guide's section,
  translated again from the pinned AUTHORING.md; the glossary rows (되돌려 쓰는 매개변수,
  한정자, 참조); `ref` gone from the language reference, where `inout` and `out` join the
  attributes; and the example's Korean title and blurb. The example's still is kept: the program
  computes the same colours as before. The fourth amendment removes `@in`: no page offers it, and
  the Korean authoring guide says, as the English does, that there is none. The Playground's
  hover is the language service's and needs no site change; the compiler delivers no inlay hint,
  so the Playground shows none. Handled in #145.
- 0043: a read of a local before it is assigned on every path is refused as `TS8075`, and GLSL
  ES 3.00 starts a local with no initializer at zero: the local `let` card on the TypeScript
  mapping page and the `var` note on the WGSL mapping page, which said WGSL zeroes the value
  and GLSL leaves it undefined, in both locales; a refused read-before-assignment card on the
  TypeScript mapping page; and the `TS8075` page in the error-code reference, with a trigger
  and a fix compiled at the pin, handled in #145.
- 0044: `bitcast` takes a vector, one neutral id per width (`bitcastVec2U32` to
  `bitcastVec4F32`): `src/lib/builtin-table.ts` gives each a category (`casts`) and an arity of 1;
  the builtins page, the language reference's `bitcast` entry and the packing-bitcast example
  read the rest from the pin, handled in the pull request that pins the compiler at fd39ba3.
- 0045: a NaN or subnormal `f32` word has no portable `bitcast`: the reference page for
  `bitcast` reads the new sentence from the compiler's JSDoc, with no change here, handled in
  the same pull request.
- 0046: a GLSL storage struct array with an integer field is an R32UI data texture, and
  `BindEntry` gains `glslDataTexture`: the API reference reads the field from its JSDoc; the
  Korean guide's `layouts-and-resources` section is translated again for the changed Storage
  buffers paragraph (and for the `"use typeshade"` uniform and storage blocks of typeshade#481),
  handled in the same pull request.
- 0047: `array<T, N>()` is the zero value of a fixed-size array: the language reference's `array`
  entry reads the new hover sentence from `FUNCTION_DOCS`, and the `packing-bitcast` example page
  reads the new line from the example, with no change of their own, handled in the pull request
  that pins the compiler at 596c805.
- 0054: the program runtime executes supported `@compute` entries on WebGL2 through
  GLSL ES 3.00 passes, transform feedback and data textures. The WebGPU and WebGL2 concept
  page, target comparison, quick start, first-page host row and Playground's compute-only
  note now distinguish native compute from lowered compute. Existing render stills remain
  keyed to their renderable examples; the pinned compiler carries the emitted WGSL and GLSL
  golden files. The WebGL2 compute runner and its numeric checks remain in the compiler.
- 0030: the program runtime's `Program`, `ComputePipeline` and `RenderPipeline`
  expose binding types per entry. The API reference reads these types from the pinned
  compiler; the host examples already pass bindings by their declared names and need
  no copied type definitions. Reviewed in #130.
- 0053: the runtime's `Geometry` accepts resident vertex and index data without repeated
  uploads. The API reference reads its definition and JSDoc from the pinned compiler.
  The site's existing examples do not use that resource form. Reviewed in #130.
- 0057: named `override<u32>` values can set `@compute` dimensions and a workgroup array's
  outer length. The shader stages, resources and WGSL mapping pages show the syntax; host
  TypeScript selects values through `program.compute(..., { constants })` and reads the
  resolved `workgroupShape`. The new compiler example appears in the compute gallery and
  Playground picker. Pinned at compiler commit `b0e489b3a3991278973916933a991e807e00318d`;
  handled in #154.
- 0060: the package root no longer exports the IR builder (Rule 11.19), which stays at
  `typeshade/core/ir`. `src/lib/language-reference.ts` and `src/lib/target-mapping.ts` import
  `WGSL_BUILTIN_NAMES` and `WGSL_BUILTIN_TYPES` from `typeshade/core/ir`; the API reference
  reads `typeshade/core/ir` as an entry point, so a builder name's page imports it from there
  and no page lists it under `typeshade`. AUTHORING.md teaches `"use typeshade"` alone: the
  section Raw statements is gone, and `/guide/internals/raw-statements/` and
  `/guide/authoring/raw-statements/` (and their Korean twins) redirect to the reference page of
  `rawStmt` (`src/lib/retired-guide-sections.mjs`); its Korean translation is removed. No page
  of the site linked to a renamed or removed heading of the guide. The front page, the quick
  start, the examples page, the example pages, the Playground picker and the stills already
  show only `"use typeshade"` files. The Korean guide sections the rewrite leaves stale are
  shown in English until they are translated again from the pinned AUTHORING.md, in a pull
  request of their own. Handled in the pull request that pins the compiler at 48e3951.
- 0061: the host examples. The examples page gains a group, Host examples, after the
  `.shade.ts` groups, which reads `hostExamples` from the pinned compiler; each host example
  has a page at `/guide/examples/<id>/` in English and Korean that shows the module and its
  `host.ts` under two tabs, and the tiers its host runs on (`src/lib/host-example-pages.ts`,
  `src/components/pages/HostExamplePage.astro`). The Korean dictionary carries each title, line
  and paragraph. The pages run no host: the live run of `host-draw` and `host-program` needs the
  Vite plugin's generated module and `typeshade/runtime` in the page, which the site's canvas
  does not load, and is left for a later pull request. Handled in the pull request that pins
  the compiler at 48e3951.
- 0058: a host fuses a chain of kernel calls with `fuse` from `typeshade/fuse`: the
  control-flow page's kernel-function paragraph (en and ko) names the fuse scope, the option
  `typeshade({ fuse: true })` and the report; the WebGPU concept page's load-time emitter
  paragraph names `typeshade/fuse` beside the emitter; the API reference reads `typeshade/fuse`
  (`fuse`, `FuseReport`, `FuseScope`); the Korean guide gains the new subsection of the CPU
  oracle section, and the Korean blurb of `loop-fuse` follows its fifth function, `total`. The
  gallery, the Playground picker and the stills gained `loop-fuse` in the pull request that
  pinned the compiler at 48e3951. Handled in the pull request that pins the compiler at
  c89f6b2.
- 0062: `hostFace` is public from `typeshade/language-service`: the API reference reads
  `hostFace`, `HostFace`, `HostFaceOptions` and `HostExport` from that entry point, handled in
  the pull request that pins the compiler at c89f6b2. The Playground had no deep import of
  `src/compiler/ts/host-face.ts` to replace: its language worker computed no host face until
  the editable `host.ts` tab, which imports `hostFace` from the subpath's entry
  (`src/language-service/index.ts`) to type-check and run `host.ts`, handled in the pull
  request that adds that tab.
- 0063: a builtin's scalar overload returns `ScalarOf<P0, …>` in place of the inlined chain
  over the brand symbols, so the Syntax frame of 49 function pages prints a short signature.
  `isHandle` in `src/lib/language-reference.ts` now takes a brand tag only in key position
  (`[textureTag]`) for an opaque handle, so `ScalarOf`, which reads the tags in a condition,
  is listed beside `Numeric` under the types the ambient file declares for its own use.
  Handled in the pull request that pins the compiler at the merge of typeshade/typeshade#625.
- 0069: an entry call in a `fuse` body is recorded and runs as a group of its own: the Korean
  API entry of `fuse` is translated again from the pinned JSDoc, the control-flow page's new
  section on a chain of calls says so in both locales, and the Korean guide section The CPU
  oracle is translated again for it; the site has no page that copies §67 or §71 whole, and a
  tiled-matmul page waits for the compiler's decision Q7. Handled in #212, which pins the
  compiler at 91df8e2.
- 0071: the device owner: the WebGPU concept page gains a paragraph on `createDevice()` with
  `device.array()`, `device.fuse()` and one owner for each `Resident` (en and ko), the
  control-flow page's chain-of-calls section gains `device.array()`, `device.fuse()`,
  `device.release()`, and `FuseReport` and `mergeReports` on `typeshade/runtime` (Amendment 2),
  and the API reference files `src/runtime/device.ts`, `src/core/fuse-report.ts`,
  `src/core/host-entry.ts` and `src/runtime/chunk.ts` under Runtime, with a Korean entry for each
  new export. Handled in #212.
- 0072: the common modules: a guide page each for `typeshade/algorithms` and `typeshade/random`
  (`/guide/language/algorithms/`, `/guide/language/random/`, en and ko) teaches the host face
  inside and outside `fuse` and the device face, and the control-flow page links both; the API
  reference does not read the two subpaths, since their host faces export `add`, `abs`, `sqrt`
  and other names that `typeshade/core/ir` exports as other declarations and the reference has
  one page for each name, which stays open until the reference gives a page to a name under each
  entry point. Handled in #212.
- 0073: the flavor of the emulated double at run time: the Korean API entries of `configure`,
  `createDevice` and `recommendFp64Flavor` are translated from the pinned JSDoc, the examples
  page's emulated-double section gains a paragraph on `createDevice({ fp64Flavor })`,
  `configure({ fp64Flavor })` and `recommendFp64Flavor` (en and ko), and the WebGPU concept
  page's device-owner paragraph names the option. Handled in #212.
- 0074: the time budget: the Korean API entries of `createDevice`, `Device`, `DeviceOptions`,
  `FuseReport` and `ChunkRate` are translated from the pinned JSDoc, and the control-flow page's
  chain-of-calls section and the WebGPU concept page's device-owner paragraph gain
  `timeBudgetMs`, `chunkSize`, `fuse(body, { chunk })` and `chunkRates` (en and ko). Handled in
  #212.
- 0075: the indirect workgroup count: the WebGPU concept page's import paragraph gains
  `{ indirect, offset }` (§67), and the control-flow page's chain-of-calls section gains the
  indirect count and the group's `indirect: true` (§65 and §71), in both locales; the Korean API
  entry of `FuseReport` is translated from the pinned JSDoc. Handled in #212.
- 0078: `push` in a kernel function's loop: the control-flow page, which carries the
  kernel-function and the array-methods copy, gains `out.push(v)`, its order, the capacity of the
  host array and `out.length` after the loop with a sample, says that a loop that pushes runs as
  a group of its own in a `fuse` plan, and lists `kernel-push` beside the other kernel examples in
  the gallery, the Playground picker and the Korean titles and lines (en and ko). Handled in #212.
- 0079: an array's methods on a kernel function's array: the control-flow page's loop list and
  boundary list name the six new methods, and its new section gives the methods on a kernel
  function's array, what runs on the GPU and the tree order of a floating-point `reduce` with a
  sample, and lists `kernel-array-methods` in the gallery, the Playground picker and the Korean
  titles and lines (en and ko). Handled in #212.

- 0080, this pull request: collection loops now describe WebGPU execution, the CPU fallback and the WebGL2 refusal. The host example translation covers lookups.
- 0081, this pull request: pin `91df8e2` moves to `94203d3c` (typeshade/typeshade#733). English and Korean pages teach key types, dense numeric Records and the host contract. The TypeScript string row links to the key page, and collection copy explains string conversions. The registered host example has both translations. D1 remains open upstream.
- 0082, #205: pin `85b803f9` includes the first private input projection from compiler #738. English and Korean control-flow guidance describes eligibility, full logical validation and layout fallbacks. The unified benchmark adds actual one/four/eight-field host calls, separate validation/packing probes, input/upload bytes and device intervals. Controlled physical-device evidence remains pending upstream.
- 0083, #205: pin `85b803f9` includes runtime information from compiler #736, merged as `72049d09`. The generated API reference has all new exports and translated JSDoc. English and Korean host guidance explains immutable snapshots and nullable provenance. The benchmark uses its candidate owner's `Device.info`, retaining independent adapter/WebGL observations and compiler/artifact/workload hashes. Source archives truthfully report `revision: null`.

- 0084: pin `3b40e065e17fd4d6929d4c30ab45656da73f0fcd` includes
  typeshade/typeshade#743 and its completed `host-compute` example. The English and Korean
  WebGPU concept, shader-stage and control-flow pages explain the optional `{ constants }`
  argument, authored defaults, dispatch counts, normalized pipeline caches, owner-selected fp64,
  selected report shapes and CPU/WebGL2 limits. All three changed authoring-guide sections are
  translated again; the gallery shows the executed default, direct and planned calls in both
  locales. Rule fingerprints record review against the pinned contracts. The pin also includes
  typeshade/typeshade#742's merged fp64 workgroup-array correctness fix. PR #743 awaits merge;
  this site change depends on it and does not claim deployment or native GPU performance.
  On 2026-10-22 UTC the assistant validated the preceding `c5fd951c` pin on Node 24.19.0 / Bun 1.4.4: the complete
  build (2,514 generated pages), host/Worker typechecks, all 15 Korean guide translations,
  25 shader samples, all 515 Korean API entries, 90 regression tests and the built reference
  notes passed. Formatting, compiler impact, IfChange, SEO and Worker-route checks passed.
  The Playground browser check also executes `runSpecialized()` and compares both direct
  and planned outputs; its result is recorded in the pull request.
  The versioned comparison catalog was regenerated and reproduced with Bun 1.4.3 for
  `94203d3c` against `c5fd951c`, retaining all prior catalogs and runtime artifacts. Workload
  and measurement identities did not change; `docs/benchmark-regressions.md` records the pin.

  On 2026-10-23 UTC, this branch integrates site main `6f2985d` (#205). The current pin retains
  0082 input projection and 0083 runtime information alongside 0084. English/Korean host guidance,
  all runtime-information API translations and actual projection benchmarks remain present.
  The current comparison advances `85b803f9` to `3b40e065` with the unchanged `applications-3`
  workload and `unified-2` instrument from main. All five previously committed comparison
  catalogs and their artifacts remain. The new catalog is reproducible with Bun 1.4.3;
  integration checks and production deployment are recorded in PR #218.

  The integrated browser run exposed a collector assumption that every baseline held the full
  input layout. The generator now records each exact build's projection capability; record
  validation and real-browser assertions use it. Tests retain the older full-input baseline,
  accept already projected baselines and reject incorrect input sizes. All prior catalogs
  remain immutable. This correction changes validation provenance without changing the workload.

- 0085 (partial): pin `eb5c3378` includes automatic fp64 selection, mutually exclusive
  device-source types, ordinary-call owner inference and automatic loading for `device.fuse()`.
  English and Korean runtime, control-flow and fp64 guidance describe those delivered behaviors.
  Fusion facts still require `fuse: true`, which still disables ordinary-call input projection.
  Default fusion facts, projection separation, instance-local capability options, `tshc init` and
  retained console variants are not included in this pin. Existing explicit setup and console
  repacking guidance remains applicable. Existing benchmark cohorts and their provenance remain unchanged.
- 0086: pin `eb5c3378` supports function-local fixed-array and homogeneous-tuple binding
  patterns. English and Korean TypeScript and array guidance describes omissions, nesting,
  value copies, literal inference and unsupported forms. The compiled destructuring example
  now includes an omitted array position. Playground examples remain sourced directly from
  the compiler; its diagnostic fixtures contained no blanket array-pattern refusal to replace.
  Integration and browser validation are recorded in this pin pull request.
