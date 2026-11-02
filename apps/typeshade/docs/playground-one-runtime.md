# Playground on one runtime

Status: accepted (merged in #18); decisions recorded 2026-11-02. No implementation has started.

## Request and baseline

The owner found that the Playground does not show how TypeShade works. A reader edits a host
file that looks real, but the picture comes from other code that the reader cannot see. The
Playground does not open a device or run the program through `typeshade/runtime`. The owner asked
for a structural redesign.

- Site baseline: `typeshade/web` `main` at `ac00d02`.
- Compiler pin: `apps/typeshade/vendor/shader-dsl` at `3e1e8420a5313e045beb175131148920bfdc2d07`.
- Compiler `main` when this was written: `typeshade/typeshade` at `c9efde0`.

## What the Playground does today

These are facts read from the baseline. File paths are relative to `apps/typeshade/src/`.

### Two paths draw two different things

1. **The Result canvas does not use the runtime.** The site draws it with its own runner:
   `lib/shader-runtime.ts` (1955 lines), `lib/render-runtime.ts` (166 lines) and
   `scripts/playground-bindings.ts` (1869 lines). This runner creates its own buffers, bind
   groups and pipelines from `reflect()` and the emitted WGSL and GLSL. It imports only types
   and packing helpers from `runtime.ts`. It never calls `createDevice()` or `runtime()`.
2. **The CPU canvas does not use the runtime either.** `scripts/playground/cpu-program.ts` and
   `scripts/playground-raster.ts` call `compileModule()` from `core/oracle.ts` and draw tiles
   in a worker.
3. **Only host.ts runs on the runtime.** The Run button starts `scripts/playground-host-frame.ts`
   in a sandboxed frame. That frame loads `runtime.ts`, `runtime-internal.ts` and `fuse.ts`.

So the picture in the Result tab and the code in host.ts are produced by different code. A
reader who edits host.ts does not change the picture that the page opened with.

### The generated module is hidden

host.ts imports the shader file, for example `import { fs } from './host-draw.shade.ts'`. The
worker turns that import into the module that `hostFace()` generates
(`scripts/playground-host-service.ts`, `hostBuild`). That module holds the calls that the reader
does not write: the device, the pipeline, the packing, the dispatch and the readback
(Rule 8.24, Rationale). The page sends the module into the frame and does not show it. The
output tabs are Result, WGSL, GLSL vertex, GLSL fragment, Reflection and Console.

### Most gallery programs cannot be run from host.ts

All 76 examples marked `"renderable": true` at the pin have a `@vertex` entry, and their
fragment entries read values that the vertex entry writes. Rule 8.24 keeps such a fragment entry
`never` in the host view. Its drawing is the open design question of `typeshade/typeshade#204`.
For these examples, `scripts/playground-host-default.ts` writes a starter host.ts that only logs
the entry names. Its comment cites Rule 8.20; the rule that applies is Rule 8.24.

### Inputs are guessed or fixed

- The starter host.ts fills a binding from its field name: `time` gets the clock,
  `resolution` and `size` get the canvas size, `mouse` gets the centre.
- The compiler host examples get fixed inputs from the `DRIVE` table in
  `scripts/playground-host-frame.ts`.
- The bindings panel writes into the site runner, not into host.ts.

## Goal

The Playground shows one program, the way an application runs it. What the reader sees on the
canvas is what host.ts did through `typeshade/runtime`. Each step between the source and the
pixels can be opened and read.

## Proposed design

### D1. One execution path

Every run starts from host.ts and goes through `typeshade/runtime`. The Result canvas is the
canvas of the host frame. The site runner and the separate CPU raster path are removed when
nothing reads them.

- The tier is the runtime's choice: WebGPU, then WebGL2, then the CPU tier (Rule 8.24). A tier
  selector passes `configure()` or `createDevice({ prefer })` options into the frame. It does
  not switch to another runner.
- The CPU oracle stays available as the CPU tier of the runtime, not as a separate canvas.

### D2. Every step can be read

The output tabs follow the order in which the program runs:

1. `host.ts`: the code the reader writes (editable).
2. The generated module: the JavaScript that the import gives host.ts (read-only). This is
   the module that `hostBuild` already sends to the frame.
3. WGSL and GLSL: the shader source that the generated module hands to the device.
4. Reflection: the layouts that the generated module packs to.
5. Console: the console lines of host.ts and of the shader (Rule 11.9), with the tier of each
   line.

A "Go to definition" from a name in host.ts opens its place in the generated module, and from
there in `typeshade/runtime`. The runtime source is read-only and comes from the pin.

### D3. A real host.ts for each example

- Each example that a host can call ships its own host.ts, checked in the compiler repository
  next to the example, as `examples/hosts/` already does.
- The bindings panel edits the values in host.ts: a slider writes the literal, and the source
  stays the one source of truth.
- The name-based guesses in `playground-host-default.ts` and the `DRIVE` table go away. A
  starter keeps only what the host face can type.

### D4. Examples a host cannot call yet

Until `typeshade/typeshade#204` gives multi-pass and vertex-driven drawing a host shape, the 76
vertex-driven examples cannot run through host.ts. The Playground says so in place of a
picture, names the rule (Rule 8.24) and the issue, and still shows WGSL, GLSL and Reflection.
This is a visible reduction until #204 lands, which the owner accepted (Decisions, 1).

## Compiler work this depends on

- `typeshade/typeshade#204` (open): a host shape for a fragment entry that reads vertex output,
  and for passes in sequence. It needs a proposal in `changes/` of that repository.
- A public way to read the generated module text. `hostFace()` returns it as `code` today; the
  site reads it through the vendored source, not through a public export.
- The fix of the rule citation in the starter comment is site-only and needs no compiler change.

## Phases

Each phase is its own pull request.

1. Show the generated module as a read-only tab. No behaviour changes.
2. Run the Result canvas from the host frame for the examples that a host can call: the
   compiler host examples and any example with a position-only fragment or a compute entry.
3. Move the bindings panel to edit host.ts. Remove the `DRIVE` table and the name-based guesses.
4. Add the tier selector through runtime options. Remove the CPU raster path.
5. After `typeshade/typeshade#204` lands: give the vertex-driven examples host files, then remove
   `lib/shader-runtime.ts`, `lib/render-runtime.ts` and the runner half of
   `scripts/playground-bindings.ts`.

## Decisions

The owner decided the three open questions on 2026-11-02, in the Claude Code session, by
approving the recommendations ("승인", confirmed in a follow-up question).

1. **Vertex-driven examples.** Between phase 2 and phase 5, the 76 vertex-driven examples show
   no picture. The Playground says why in its place, names Rule 8.24 and
   `typeshade/typeshade#204`, and still shows WGSL, GLSL and Reflection. The site runner is not
   kept for them.
2. **Per-example host files.** Each example's `host.ts` lives in the compiler repository, next
   to the example, as `examples/hosts/` does today.
3. **Home page and live examples.** They move to the runtime in a separate series after this
   one. They keep the site runner until then.

## Verification for each phase

- Functional: `bun run build` for `apps/typeshade`, the Playground checks in
  `packages/ui/scripts/playground-checks.mjs`, and a run in Chromium with WebGPU and with
  WebGPU disabled (WebGL2), and the CPU tier.
- Document audit: this file, the Playground copy in `src/i18n/` and the guide pages that
  describe the Playground match the delivered behaviour.
