// The Playground, opened in a browser against the built site. A build that emits a page whose
// script throws on its first line is still a green build, which is how the Playground shipped
// two empty panes: the editor never mounted and nothing said so. This opens dist/ on loopback,
// loads the page the way a reader does, and checks what the list below names.
//
//   1. the page's own script runs: no uncaught error reaches `pageerror`
//   2. Monaco mounts: `.monaco-editor` appears
//   3. Monaco's own TypeScript validation is off, and no marker it owns is on the sample
//   4. the compiler ran in the browser: the WGSL pane holds text, syntax-coloured, and the
//      GLSL tabs hold the two GLSL ES 3.00 stages
//   5. the reflection pane names the sample's entry points, and running them on the CPU
//      oracle fills in what each one returns
//   6. the arguments are a form: the vertex entry run at another index returns another corner
//   7. an entry declaring a struct parameter is called with the struct, not with its fields
//   8. the CPU canvas rasterises the module: a triangle, one fragment call per pixel, drawn
//      by a pool of workers that says how many of them there were
//   9. the emit options reach the panes: the level, minify and its number mode, parens,
//      obfuscate, the GLSL precision, and the f64 emulation flavour in both the WGSL and
//      the reflection
//  10. dark mode reaches the editor: its background is dark
//  11. the example picker replaces the source
//  12. raising the resolution changes the grid the fragment entry runs over and leaves the
//      box it is drawn in the size it was
//  13. changing the resolution under a running draw retires it: the result reported is the
//      new grid's, and the old draw's never lands
//  14. the source and the result columns are one height, the tab strip is at the top of the
//      result column, and the canvas is on the first screen beside the code
//  15. a vector times a scalar compiles: nothing is reported and the broadcast reaches the WGSL
//  16. a vector times a string still draws TypeScript's own arithmetic diagnostic
//  17. an unclosed call reports a diagnostic that carries a position, and the panes stay empty
//  18. the compute example is clean, and the store into its writable array reaches the WGSL
//  19. hover over the entry point's parameter answers with its TypeShade type
//  20. hover over a local bound to a numeric literal answers f32, the type the compiler gave
//      it, and not the `number` TypeScript infers for it
//  21. `vec` offers vec4 in the completion list
//  22. the URL fragment carries the edited source and the options into a second tab
//  23. go to definition from a struct's use lands on its declaration
//  24. find references on the struct lists its declaration and its uses
//  25. the outline names the entry points
//  26. signature help inside a call names the function
//  27. rename on the struct rewrites every occurrence and nothing else
//  28. the colouring is the compiler's: a decorator and a GPU type draw with classes of
//      their own, not the identifier's
//  29. the compiler is in the language worker: a worker script was fetched and the page's
//      own module is a fraction of what it was
//  30. a file with no @vertex entry is compiled behind the fullscreen triangle: the page
//      says so, the WGSL and the reflection carry that entry, and the canvas is covered
//  31. the reader's own lines survive the prelude: a mistake on line 9 is reported on line
//      9, the markers land there, and hover answers about that line
//  32. a file that declares its own vertex half, and one with no directive at all, are both
//      left exactly as they were
//  33. every example in the picker is selected in turn and the Result tab's canvas is
//      photographed: how many paint more than one colour, and how many get a backend at
//      all, against the floors below, with the reason printed for each one that does not
//  34. an example on the page is editable: a keystroke reaches the emitted text and the
//      frame, which is the claim nothing tested before
//  35. the tool on an example's own page: no picker, the editor seeded with that example's
//      file, and a keystroke there reaching the emitted text and the frame as well
//  36. the backend picker: WebGL2 and WebGPU by name each draw the same program, a switch
//      mounts again without compiling or touching the editor, and the pick joins the link
//  37. a browser with no WebGPU, asked for WebGPU by the link, draws nothing and says so in
//      the page's own words instead of falling back to WebGL2
//  38. the bindings panel reaches the frame: a matrix preset turns a flat uniform-struct
//      example into a picture, and the CPU oracle draws a uniform struct it used to stop on
//  39. a texture and a sampler bind, and changing the texture's source changes the frame
//  40. an override moved in the panel is pinned in the GLSL and changes the frame
//  41. a compute entry is dispatched on WebGPU and on the oracle, plotted, and what it wrote
//      is shown under its buffer; and a value the reader set survives an edit
//  42. the two engines agree: every example the GPU paints, the CPU backend paints too, and
//      twelve pixels of one frame held at three seconds match within a few units of 255
//  43. a module with two uniform blocks: on WebGL2 and on WebGPU the second block's reserved
//      `time` and its own slider both reach the frame, with no rebuild of the pass
//  44. a uniform struct holding a struct and an array of structs gets a control per leaf,
//      draws on WebGL2, on WebGPU and on the CPU, and a leaf's control reaches the frame
//  45. storage textures on the CPU oracle: the storage-texture example dispatched on the CPU
//      plots the image it wrote, and the image is the one WebGPU wrote, texel for texel
//  46. every example in the picker opens with no error, the compute kernels that paint
//      nothing included
//  47. the Console tab: the gpu-console example's console calls come back from WebGPU and
//      from the CPU oracle as the same lines, in the same order (surface §66)
//  48. a module that draws logs a clicked pixel: on WebGPU the frame is drawn once more for
//      that pixel with its console calls recorded, on WebGL2 the CPU oracle runs it, the two
//      give the same line, and the vertex entry's calls are the CPU oracle's
//  49. recording the frame on WebGPU gives every pixel's lines, row by row, and a frame that
//      overflows the buffer keeps whole lines and counts every call it dropped
//  51. an example drawn in several passes (compiler change 0026): feedback-trail opens with
//      its pass as a marked tab, draws into rgba16float on WebGPU, builds a trail over frames
//      that Pause holds and Restart clears, and draws on WebGL2 and on the CPU oracle;
//      separable-blur draws;
//      the link carries the graph, and the WGSL tab shows a pass's own module on its tab;
//      Download writes the workspace, pass graph and edits included, as a zip of a folder
//      Open in VS Code hands the browser a vscode://typeshade.vscode-typeshade/open uri whose
//      link is the page's own URL, the code, files and passes of the workspace with it,
//      read the way VS Code and the extension read it (the query decoded once, then split)
//  52. file names: picking Plasma names the main tab after it; a double click renames the
//      main file, its diagnostics still come back under the new name, and the link carries
//      the name into a second tab; renaming a file the main one imports rewrites that import;
//      an empty name is refused and Escape cancels; a `#code=` link written before files had
//      names opens under its example's name, or main.shade.ts for code no example has
//  53. host.ts (compiler change 0062): picking host-compute shows a host.ts tab holding that
//      example's host; a type error typed into it comes back as a marker on its model; Run
//      runs it in an iframe whose sandbox is exactly `allow-scripts`, and its console line
//      reaches the Console tab with the line of host.ts it was written on, beside what `run()`
//      returned; Stop removes the frame; and the link, which carries host.ts, opens with no
//      frame until Run is clicked. Run from the Result tab on loop-fuse, whose run() draws
//      nothing, brings the Console tab and its value to the front; on host-helper, which
//      draws, the Result tab stays and the value is on a line under the frame
//  50. the workspace: a bare link opens on the gallery, a tile opens that example in the
//      editor with a tab for each file it imports, an edit to the imported file changes the
//      emitted WGSL, a new file is a tab the main file can import, the link carries the
//      files, Back returns to the gallery, and the transport holds and restarts the clock
//
// Monaco comes from jsdelivr, the way the page loads it for a reader, so a runner with no
// route to that host cannot check 2, 3 or 4. That case is reported on its own, with the
// requests that failed, so a CDN outage reads differently from a page that is broken. Exit
// codes: 1 for a broken page, 2 for the CDN. Two environment variables answer the second one:
//
//   PLAYGROUND_MONACO_VIA_NODE=1  Node fetches the exact URLs the page asks the CDN for and
//                                 hands them back, for a sandbox whose browser has no route
//                                 out while Node has one. A wrong URL still fails, since it
//                                 is the page's own request that is fetched, a worker's own
//                                 importScripts included.
//   PLAYGROUND_CDN_OPTIONAL=1     a CDN that neither can reach passes with a warning.
//
// Run: bun run check:playground (after a build, which writes dist/)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

// A WebGPU canvas is not readable through getImageData, so the frame is measured the way a
// reader sees it: the element is photographed and the pixels are counted here.
const sharp = createRequire(import.meta.url)('sharp');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const CDN = 'cdn.jsdelivr.net';
const ROUTES = ['/playground/', '/ko/playground/'];

// How many of the examples in the picker the Result tab has to paint, and how many of them a
// backend has to run at all. Measured, never typed. The first floors, on 2026-09-23 when the
// tab moved to the GPU, were 34 painted and 36 run of 51, against 10 that drew before. The
// bindings panel took them to 46 and 48 of 51. On the tree merged with main at 5843b61, 73
// examples in the picker, measured twice with the same result: 66 put more than one colour
// on a canvas a backend drew and 69 got a backend. The seven that do not are listed under
// the count with the reason the page gives for each.
//
// These are floors and the build defends them. A change that lowers one is a change that
// stopped an example drawing: find out which, from the list this prints, and fix that. Do
// not lower the number to get a green build, and do not skip an example to reach it.
const PAINTED_FLOOR = 66;
const RAN_FLOOR = 69;

// Of the examples the GPU paints, how many the CPU backend paints too, and how many draw the
// same pixels on both engines. The rasteriser runs the oracle at f32, the GPU's precision, and
// the two backends' own `sin` still differ in their last bits, so a pixel agrees when every
// channel is within AGREE_UNITS of eight-bit value of the GPU's, at the same pixel of the same
// frame or one beside it. Measured twice on the same tree as the floors above, the same both
// times: of the 61 the GPU paints at the held clock, 55 paint on the CPU and 49 agree. Under
// them were the six that sample a texture, which the oracle could not do; the four passes
// whose noise is a hash of `sin`, which no two implementations of `sin` agree on past a few
// digits; and two fp64 fractals that differ by a few units at a pixel on the edge of the set.
// Once the oracle read the panel's texels through the panel's sampler, all 61 painted on the
// CPU and 54 agreed, measured twice. Of the six textured ones, `textured-quad` still differs by
// up to 16: its checker's edges fall on the rows sampled here, and the photograph of a box a
// quarter pixel off the device grid is resampled across an edge the two engines draw alike.
const AGREE_UNITS = 6;
const CPU_PAINTED_FLOOR = 61;
const AGREE_FLOOR = 54;
// The check runs in parts, one CI job each (deploy.yml), since the two walks over the picker
// below take most of its time. PLAYGROUND_SHARD=k/n draws every n-th example from the k-th and
// compares the engines on those; part 1 also runs the Playground's other steps and the seeded
// and no-WebGPU pages, and part 3 (the last, when there are fewer) the Korean route. The floors
// above are totals, so a part of several writes its counts to PLAYGROUND_REPORT and
// `--merge <reports>` holds their sum to the floors. With no PLAYGROUND_SHARD it is one part.
const [SHARD_K, SHARD_N] = (process.env.PLAYGROUND_SHARD ?? '1/1').split('/').map(Number);
if (!(SHARD_N >= 1 && SHARD_K >= 1 && SHARD_K <= SHARD_N)) {
  console.error(
    `[playground] PLAYGROUND_SHARD is k/n with 1 <= k <= n, not ${process.env.PLAYGROUND_SHARD}`,
  );
  process.exit(1);
}
const SHARDED = SHARD_N > 1;
const RUNS_REST = SHARD_K === 1;
const RUNS_KOREAN = SHARD_K === Math.min(3, SHARD_N);
/** What a part of several leaves for `--merge`: its rows of the picker walk and its counts of
 *  the engine comparison. */
const tally = {
  drawn: [],
  engines: { ids: 0, asked: 0, cpuPainted: [], agree: [], differ: [], noCpu: [], flatAtClock: [] },
};
const EDITOR_TIMEOUT = Number(process.env.PLAYGROUND_TIMEOUT ?? 45_000);
const VIA_NODE = process.env.PLAYGROUND_MONACO_VIA_NODE === '1';
// How long Monaco's TypeScript worker gets to report after the editor mounts.
const SETTLE = Number(process.env.PLAYGROUND_SETTLE ?? 3_000);

if (process.argv[2] === '--merge') {
  const reports = process.argv.slice(3).map((file) => JSON.parse(readFileSync(file, 'utf8')));
  if (reports.length === 0) {
    console.error('[playground] --merge takes the reports the parts wrote');
    process.exit(1);
  }
  const parts = new Set(reports.map((r) => r.shard));
  const expected = reports[0].of;
  if (parts.size !== expected || reports.some((r) => r.of !== expected)) {
    console.error(
      `[playground] --merge needs one report from each of ${expected} parts, got ${[...parts].join(', ')}`,
    );
    process.exit(1);
  }
  const problems = [];
  const drawn = reports.flatMap((r) => r.drawn);
  const engines = reports.reduce((sum, r) => {
    for (const key of Object.keys(sum))
      sum[key] =
        typeof sum[key] === 'number' ? sum[key] + r.engines[key] : [...sum[key], ...r.engines[key]];
    return sum;
  }, structuredClone(tally.engines));
  console.log(`[playground] the picker, over ${expected} parts`);
  walkFloors(drawn, problems);
  engineFloors(engines, problems);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`[playground] ${drawn.length} examples drawn and compared, every floor held`);
  process.exit(0);
}

if (!existsSync(dist)) {
  console.error('[playground] dist/ does not exist. Run `bun run build` first.');
  process.exit(1);
}

/** One route's outcome: what went wrong, and whether the CDN is why. */
// The page debounces a render at 350ms and the URL at 600ms, so a change is read after both.
const AFTER_EDIT = 1_100;

const sourceOf = (page) => page.evaluate(() => window.monaco.editor.getModels()[0].getValue());

/** Put a source in the editor and wait for the render and the URL it debounces. */
async function typeSource(page, source) {
  await page.evaluate((value) => window.monaco.editor.getModels()[0].setValue(value), source);
  await page.waitForTimeout(AFTER_EDIT);
}

/** Open one tab of the result column. The column is one tab strip over one panel, so every
 *  read below opens the tab that holds what it is reading. */
async function openTab(page, name, wait = 150) {
  await page.click(`[data-target="${name}"]`);
  await page.waitForTimeout(wait);
  // A text panel is coloured by Monaco once the tab is up, on a promise nothing here holds,
  // so a loaded machine can be read while the pane still holds the plain text the colouriser
  // is about to replace. An empty pane is a pane with nothing to colour.
  if (name === 'wgsl' || name === 'glslVertex' || name === 'glslFragment') {
    await page
      .waitForFunction(
        () => {
          const pane = document.querySelector('[data-output]');
          return (
            !pane || pane.textContent.trim().length === 0 || pane.querySelector('span') !== null
          );
        },
        null,
        { timeout: 5_000 },
      )
      .catch(() => {});
  }
}

/** Read the WGSL pane with its tab open. */
async function wgslPane(page) {
  await openTab(page, 'wgsl');
  return (await page.innerText('[data-output]')).trim();
}

/** One photograph of the Result tab's canvas, counted. The middle of the element, so the
 *  frame's own rounded corners are not counted as pixels the shader drew. One colour is a
 *  canvas nothing painted, or one a shader filled flat; two or more is a picture. The status
 *  note is not evidence: a note reading "36864 px in 249 ms" over a fully transparent canvas
 *  is how five of these examples read before this. */
/** A photograph of the Result tab's canvas, taken from its box on the page. An element
 *  photograph first waits for the box to hold still across two animation frames, and a
 *  program that takes seconds a frame on a software GPU gives it no two frames to compare,
 *  though the box never moves. */
async function photographCanvas(page) {
  const box = await page.evaluate(() => {
    const canvas = document.querySelector('[data-gpu-canvas]');
    canvas.scrollIntoView({ block: 'center' });
    const r = canvas.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  return page.screenshot({ clip: box, timeout: 15_000 });
}

/** photographCanvas, tried again up to three more times. A change of backend or a dispatch
 *  puts a new canvas element in the frame, so the one measured can leave the page
 *  mid-photograph; and a program that takes longer than the timeout a frame on a software
 *  GPU (capsule-corp-namek-class) can hold the page's compositor past one attempt. */
async function photographCanvasSteady(page) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await photographCanvas(page);
    } catch (error) {
      if (attempt >= 3) throw error;
      await page.waitForTimeout(300);
    }
  }
}

async function sampleCanvas(page) {
  const shot = await photographCanvasSteady(page);
  const meta = await sharp(shot).metadata();
  const pad = Math.round(Math.min(meta.width, meta.height) * 0.08);
  const { data } = await sharp(shot)
    .extract({ left: pad, top: pad, width: meta.width - 2 * pad, height: meta.height - 2 * pad })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const colours = new Set();
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) opaque += 1;
    colours.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
  }
  return { colours: colours.size, opaque };
}

/** What the canvas holds, over a few frames. A pass whose picture follows its own clock is
 *  flat for part of its cycle: julia-twin measured 1 colour for the first two seconds and
 *  then 11, 17, 1, 75, 91, so a single photograph reads it as blank and the count moves
 *  between runs. Eight photographs over about three seconds cover that dark stretch with
 *  room to spare. Another photograph is taken only while the canvas is still one colour, so
 *  a pass that drew costs one screenshot. */
async function canvasColours(page, samples = 8, gap = 400) {
  let best = await sampleCanvas(page);
  for (let i = 1; i < samples && best.colours < 2; i += 1) {
    await page.waitForTimeout(gap);
    const next = await sampleCanvas(page);
    if (next.colours > best.colours) best = next;
  }
  return best;
}

/** Wait for the Result tab to settle on this module: a backend that is drawing has put a
 *  frame up, and a module the runtime refuses has said so. Waiting on the page's own state
 *  instead of a fixed sleep, so a slow machine reads the same as a fast one. */
async function settleResult(page) {
  await page.waitForFunction(
    () => {
      // The frame carries the document version it last showed, and the tool the version the
      // editor holds; until the two agree the canvas may still hold the file before.
      const tool = document.querySelector('[data-playground]');
      const frame = document.querySelector('[data-gpu-frame]');
      if (!tool || !frame || frame.dataset.settled !== tool.dataset.version) return false;
      const canvas = document.querySelector('[data-gpu-canvas]');
      if (!canvas) return false;
      // A dispatch plots onto a 2D canvas, which has no frame counter.
      if (canvas.dataset.plotted === '1') return true;
      const backend = canvas.dataset.backend;
      if (backend && backend !== 'none') return (canvas.__shader?.frames ?? 0) > 0;
      // No backend: the note says why, and it is written before the backend is cleared.
      return (document.querySelector('[data-gpu-note]')?.textContent ?? '').length > 0;
    },
    null,
    { timeout: 30_000 },
  );
}

/** The editor's document version, which moves on every change to the file. */
const versionOf = (page) =>
  page.evaluate(() => Number(document.querySelector('[data-playground]')?.dataset.version ?? 0));

/** Pick an example and wait until the canvas shows it: the version has moved past the one
 *  before, and the frame has caught up with it. */
async function pickExample(page, id) {
  const before = await versionOf(page);
  await page.selectOption('[data-example]', id);
  await page.waitForFunction(
    (b) => Number(document.querySelector('[data-playground]')?.dataset.version ?? 0) > b,
    before,
    { timeout: 15_000 },
  );
  await settleResult(page);
}

/** The backend, the note and the plot flag of the Result tab's canvas right now. */
const resultState = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('[data-gpu-canvas]');
    return {
      backend: canvas?.dataset.backend ?? 'none',
      plotted: canvas?.dataset.plotted === '1',
      note: (document.querySelector('[data-gpu-note]')?.textContent ?? '').trim(),
    };
  });

/** Read the reflection panel with its tab open. */
async function reflectionPane(page, wait = 150) {
  await openTab(page, 'reflection', wait);
  return (await page.innerText('[data-reflection]')).trim();
}

/** Set one control on the options bar and wait for the render it triggers. */
async function setOption(page, selector, value) {
  if (value === true || value === false) await page.setChecked(selector, value);
  else await page.selectOption(selector, value);
  await page.waitForTimeout(500);
}

/** How dark a CSS colour is, on the 0 to 255 scale the channels use. */
const brightness = (colour) => {
  const [r, g, b] = (colour.match(/\d+(\.\d+)?/g) ?? ['255', '255', '255']).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Every expression here depends on a runtime input, so the optimizer cannot fold it away and
// `parens: 'minimal'` has parentheses left to drop. The default sample folds to constants.
const UNFOLDABLE = `"use typeshade";

class VsOut {
  @builtin("position") pos: vec4;
  @location(0) uv: vec2;
}

class Color {
  @location(0) color: vec4;
}

@fragment
export function fs(v: VsOut): Color {
  const a = v.uv.x * 2. + v.uv.y * 3. - 1.;
  const b = a * a + a * 2.;
  return { color: vec4(b, a - b * 3., a * b + 1., 1.) };
}
`;

// A float the f32 mode can shorten: 0.30000001192092896 is the f64 printout of the f32
// nearest 0.3, so `.3` loads the same bits and the lossless mode has to keep every digit.
const LONG_LITERAL = `"use typeshade";

class Clip {
  @builtin("position") pos: vec4;
}

class Color {
  @location(0) color: vec4;
}

@vertex
export function vs(@builtin("vertex_index") i: u32): Clip {
  const k = 0.30000001192092896;
  const x = i === 1 ? k : -k;
  return { pos: vec4(x, k, 0., 1.) };
}

@fragment
export function fs(): Color {
  return { color: vec4(0.30000001192092896, 0., 0., 1.) };
}
`;

// A fragment program and nothing else: no vertex entry, so the page compiles it behind the
// fullscreen triangle and the reader gets a picture without writing a vertex half. The
// mistake below is on its line 9, which is where the diagnostics have to land.
const FRAGMENT_ONLY = `"use typeshade"

class Color {
  @location(0) color: vec4
}

@fragment
export function fs(@location(0) uv: vec2): Color {
  const stripe = fract(uv.x * 8.);
  return { color: vec4(stripe, uv.y, 1. - stripe, 1.) };
}
`;

/** A page that reports what the CDN did, and fetches through Node when asked to. The shared
 *  link check opens a second one, which is why the setup is a helper. */
async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  const cdnFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().includes(CDN))
      cdnFailures.push(`${request.url()} (${request.failure()?.errorText ?? 'failed'})`);
  });
  page.on('response', (response) => {
    if (response.url().includes(CDN) && response.status() >= 400)
      cdnFailures.push(`${response.url()} (HTTP ${response.status()})`);
  });

  if (VIA_NODE) {
    await page.route(`**://${CDN}/**`, async (route) => {
      const url = route.request().url();
      try {
        const response = await fetch(url);
        if (!response.ok) {
          cdnFailures.push(`${url} (HTTP ${response.status}, fetched by Node)`);
          return route.fulfill({ status: response.status, body: '' });
        }
        return route.fulfill({
          status: 200,
          headers: { 'content-type': response.headers.get('content-type') ?? 'text/javascript' },
          body: Buffer.from(await response.arrayBuffer()),
        });
      } catch (error) {
        cdnFailures.push(
          `${url} (${error instanceof Error ? error.message : String(error)}, fetched by Node)`,
        );
        return route.abort();
      }
    });
  }
  return { page, pageErrors, cdnFailures };
}

/** The picker walk's rows held to their floors: the whole picker's, from one part or the rows of
 *  every part. */
function walkFloors(drawn, problems) {
  const ran = drawn.filter((row) => row.backend !== 'none');
  // A picture is more than one colour on a canvas a backend drew. A canvas with no
  // backend is transparent over the frame, so a count there would be of the frame.
  const painted = drawn.filter((row) => row.colours > 1 && row.backend !== 'none');
  console.log(
    `  examples: ${painted.length} of ${drawn.length} paint more than one colour, ${ran.length} of ${drawn.length} get a backend`,
  );
  // Grouped by what the page says about them, so a count that moves names what moved.
  const byReason = new Map();
  for (const row of drawn.filter((r) => r.colours <= 1 || r.backend === 'none')) {
    const reason =
      row.backend === 'none'
        ? row.note
        : `${row.note} (a backend ran it and it came out one flat colour)`;
    byReason.set(reason, [...(byReason.get(reason) ?? []), row.id]);
  }
  for (const [reason, names] of byReason) console.log(`    ${names.join(', ')}\n      ${reason}`);
  if (painted.length < PAINTED_FLOOR) {
    problems.push(
      `${painted.length} of ${drawn.length} examples paint the canvas, and ${PAINTED_FLOOR} did when this check was written. Do not lower the floor: find the example that stopped drawing in the list above`,
    );
  }
  if (ran.length < RAN_FLOOR) {
    problems.push(
      `${ran.length} of ${drawn.length} examples get a backend, and ${RAN_FLOOR} did when this check was written. Do not lower the floor: find the example that stopped running in the list above`,
    );
  }
}

// ── the two engines agree ──────────────────────────────────────────────────────────────

/** For every example the GPU paints: the CPU backend paints it too, and a dozen pixels of one
 *  frame agree between the two. The rasteriser is asked for those pixels at the GPU canvas's
 *  own size and clock through the tool's handle, so the comparison is of one program at one
 *  time on one grid. This is what would have caught the rasteriser reading a bare `vec4`
 *  return by the name `_ret` and leaving five canvases transparent. */
async function checkEnginesAgree(page, problems, ids) {
  const cpuPainted = [];
  const flatAtClock = [];
  const agree = [];
  const differ = [];
  const noCpu = [];
  for (const id of ids) {
    await pickExample(page, id);
    // Three seconds in, the time every build-time still is captured at, so the frame compared
    // is the one a reader sees on the gallery tile.
    await page.evaluate(() => document.querySelector('[data-playground]').__playground.freeze(3));
    // Held, the buffer goes back to the box's full size; two frames drawn after that are at
    // it. A program this runner draws slowly may take seconds for them.
    const framesAt = await page.evaluate(
      () => document.querySelector('[data-gpu-canvas]').__shader?.frames ?? 0,
    );
    await page
      .waitForFunction(
        (n) => (document.querySelector('[data-gpu-canvas]').__shader?.frames ?? 0) >= n + 2,
        framesAt,
        { timeout: 60_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => {
      const canvas = document.querySelector('[data-gpu-canvas]');
      const frame = document.querySelector('[data-gpu-frame]');
      return {
        width: canvas.width,
        height: canvas.height,
        ground: getComputedStyle(frame).backgroundColor,
      };
    });
    // The frame is held and drawn at full size, so the loop stops drawing it again while it is
    // photographed: a program this runner draws in seconds a frame keeps the GPU process busy,
    // and a busy GPU process composites nothing for the photograph (capsule-corp-namek-class
    // timed out four times in a row on two runs, 2026-10-12).
    await page.evaluate(() => document.querySelector('[data-playground]').__playground.idle(true));
    // A photograph that times out names the example it was of, which the error alone does not.
    const shot = await photographCanvasSteady(page)
      .catch((error) => {
        throw new Error(`photographing '${id}' for the engine comparison: ${error.message}`, {
          cause: error,
        });
      })
      .finally(() =>
        page.evaluate(() => document.querySelector('[data-playground]').__playground.idle(false)),
      );
    const { data, info } = await sharp(shot)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    const gpuColours = new Set();
    for (let i = 0; i < data.length; i += 4)
      gpuColours.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    const points = [];
    for (const v of [0.25, 0.5, 0.75])
      for (const u of [0.2, 0.4, 0.6, 0.8])
        points.push([Math.floor(u * state.width), Math.floor(v * state.height)]);
    const cpu = await page.evaluate(
      ([p, w, h]) => document.querySelector('[data-playground]').__playground.cpuPixels(p, w, h),
      [points, state.width, state.height],
    );
    const ground = (state.ground.match(/\d+/g) ?? [0, 0, 0]).map(Number);
    if (typeof cpu === 'string') {
      differ.push(`${id} (the rasteriser: ${cpu})`);
    } else {
      // The GPU canvas is premultiplied over the frame's ground, so the CPU's colour is put
      // over the same ground before it is compared.
      let worst = 0;
      points.forEach(([x, y], i) => {
        const sx = Math.round(((x + 0.5) * info.width) / state.width - 0.5);
        const sy = Math.round(((y + 0.5) * info.height) / state.height - 0.5);
        const c = cpu[i];
        const want = c
          ? [0, 1, 2].map((k) => Math.min(255, c[k] + ground[k] * (1 - c[3] / 255)))
          : ground;
        let best = Infinity;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const px = Math.min(info.width - 1, Math.max(0, sx + dx));
            const py = Math.min(info.height - 1, Math.max(0, sy + dy));
            const at = (py * info.width + px) * 4;
            best = Math.min(
              best,
              Math.max(...[0, 1, 2].map((k) => Math.abs(data[at + k] - want[k]))),
            );
          }
        }
        worst = Math.max(worst, best);
      });
      if (worst <= AGREE_UNITS) agree.push(id);
      else differ.push(`${id} (by up to ${worst} of 255)`);
    }

    // And the CPU backend itself paints more than one colour, at the same held clock: a pass
    // that is one colour at the start of its cycle is not a canvas the rasteriser left blank.
    // Counted the way the GPU's photograph is, the transparent ground being one colour of it.
    await page.selectOption('[data-engine]', 'cpu');
    const drew = await page
      .waitForFunction(
        () => document.querySelector('[data-canvas-note]').dataset.px !== undefined,
        null,
        { timeout: 60_000 },
      )
      .then(
        () => true,
        () => false,
      );
    const colours = drew
      ? await page.evaluate(() => {
          const node = document.querySelector('[data-canvas]');
          const pixels = node.getContext('2d').getImageData(0, 0, node.width, node.height).data;
          const set = new Set();
          for (let i = 0; i < pixels.length; i += 4)
            set.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`);
          return set.size;
        })
      : 0;
    // A pass that is one colour on the GPU at this clock is one colour on the CPU too, and
    // that is agreement: only a frame the GPU paints is asked of the CPU.
    if (gpuColours.size <= 1) flatAtClock.push(id);
    else if (colours > 1) cpuPainted.push(id);
    else
      noCpu.push(
        `${id} (${drew ? `${colours} colour(s)` : (await page.textContent('[data-canvas-note]')).trim()})`,
      );
    await page.selectOption('[data-engine]', 'auto');
    await page.evaluate(() =>
      document.querySelector('[data-playground]').__playground.freeze(null),
    );
  }
  const asked = ids.length - flatAtClock.length;
  const counts = { ids: ids.length, asked, cpuPainted, agree, differ, noCpu, flatAtClock };
  if (SHARDED) {
    console.log(
      `  engines, part ${SHARD_K} of ${SHARD_N}: ${cpuPainted.length} of ${asked} paint on the CPU, ${agree.length} of ${ids.length} agree`,
    );
    for (const key of Object.keys(tally.engines))
      tally.engines[key] =
        typeof counts[key] === 'number'
          ? tally.engines[key] + counts[key]
          : [...tally.engines[key], ...counts[key]];
  } else engineFloors(counts, problems);
}

/** The engine comparison's counts held to their floors: the whole picker's, from one part or
 *  the sum of several. */
function engineFloors({ ids, asked, cpuPainted, agree, differ, noCpu, flatAtClock }, problems) {
  console.log(
    `  engines: ${cpuPainted.length} of ${asked} the GPU paints at 3 s the CPU paints too, ${agree.length} of ${ids} agree within ${AGREE_UNITS} of 255`,
  );
  if (flatAtClock.length > 0)
    console.log(
      `    one colour on the GPU at 3 s, so not asked of the CPU: ${flatAtClock.join(', ')}`,
    );
  if (noCpu.length > 0) console.log(`    the CPU paints nothing for ${noCpu.join(', ')}`);
  if (differ.length > 0) console.log(`    the engines differ on ${differ.join(', ')}`);
  if (cpuPainted.length < CPU_PAINTED_FLOOR) {
    problems.push(
      `${cpuPainted.length} of ${asked} examples paint on the CPU, and ${CPU_PAINTED_FLOOR} did when this check was written. Do not lower the floor: ${noCpu.join(', ')}`,
    );
  }
  if (agree.length < AGREE_FLOOR) {
    problems.push(
      `${agree.length} of ${ids} examples draw the same pixels on both engines, and ${AGREE_FLOOR} did when this check was written. Do not lower the floor: ${differ.join(', ')}`,
    );
  }
}

// ── the backend picker ─────────────────────────────────────────────────────────────────

/** Wait for a mount on the backend the picker asked for: a frame drawn, or a note that says
 *  why none was. */
async function settleBackend(page) {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('[data-gpu-canvas]');
      if (!canvas) return false;
      if (canvas.dataset.backend && canvas.dataset.backend !== 'none')
        return (canvas.__shader?.frames ?? 0) > 0;
      const note = (document.querySelector('[data-gpu-note]')?.textContent ?? '').trim();
      return note.length > 0 && !/^Running on|에서 실행 중입니다/.test(note);
    },
    null,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(300);
}

/** Each backend by name draws the same program, a switch mounts again without compiling or
 *  touching the editor, the pick joins the link, and a pick the browser cannot honour is
 *  said as that on the canvas instead of drawn on the other backend. */
async function checkBackends(page, problems) {
  await pickExample(page, 'gradient-twin');
  const version = await versionOf(page);
  const source = await sourceOf(page);
  const seen = [];
  for (const [pick, want] of [
    ['webgl2', 'webgl2'],
    ['webgpu', 'webgpu'],
    ['auto', null],
  ]) {
    await page.selectOption('[data-engine]', pick);
    await settleBackend(page);
    const state = await resultState(page);
    const drawn = await canvasColours(page);
    seen.push(`${pick} on ${state.backend} in ${drawn.colours} colours`);
    if (want && state.backend !== want)
      problems.push(`picking ${pick} drew on ${state.backend}: ${state.note}`);
    if (!want && state.backend === 'none')
      problems.push(`the runtime's own order drew nothing: ${state.note}`);
    if (drawn.colours < 2)
      problems.push(`on ${pick} the gradient came out ${drawn.colours} colour(s)`);
    const hash = await page.evaluate(() => window.location.hash);
    if (want && !hash.includes(`backend=${pick}`))
      problems.push(`picking ${pick} left the link without it: ${hash}`);
    if (!want && hash.includes('backend='))
      problems.push(`the default backend still names one in the link: ${hash}`);
  }
  if ((await versionOf(page)) !== version)
    problems.push('switching the backend compiled the file again');
  if ((await sourceOf(page)) !== source)
    problems.push('switching the backend changed what the editor holds');
  console.log(`  backends: ${seen.join(', ')}`);
}

/** A browser with no WebGPU, asked for WebGPU by the link: nothing draws, and the canvas says
 *  that in the page's own words instead of falling back to WebGL2 behind the reader's back. */
async function checkMissingWebGpu(browser, origin, problems) {
  const { page, pageErrors } = await openPage(browser);
  try {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'gpu', {
        get: () => undefined,
        configurable: true,
      });
    });
    await page.goto(`${origin}/playground/#example=gradient-twin&backend=webgpu`, {
      waitUntil: 'load',
    });
    await page.waitForSelector('.monaco-editor', { timeout: EDITOR_TIMEOUT });
    await settleResult(page);
    await settleBackend(page);
    const state = await resultState(page);
    const said = await page.evaluate(
      () => JSON.parse(document.querySelector('[data-playground]').dataset.copy).gpuNoWebgpu,
    );
    const picked = await page.evaluate(() => document.querySelector('[data-engine]').value);
    if (picked !== 'webgpu')
      problems.push(`the link asked for WebGPU and the picker reads ${picked}`);
    if (state.backend !== 'none')
      problems.push(`with no WebGPU and WebGPU picked, the canvas drew on ${state.backend}`);
    if (state.note !== said)
      problems.push(`with no WebGPU and WebGPU picked, the canvas says "${state.note}"`);
    console.log(`  WebGPU picked with none: ${state.backend}, "${state.note.slice(0, 60)}"`);
    for (const message of pageErrors) problems.push(`the page with no WebGPU threw: ${message}`);
  } finally {
    await page.close();
  }
}

// ── the bindings panel ─────────────────────────────────────────────────────────────────

/** Set a range input and fire what a drag fires. */
const slide = (page, selector, value) =>
  page.$eval(
    selector,
    (input, v) => {
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    value,
  );

// Two uniform blocks, the second holding the clock and a speed. Before the runtime packed
// every block each frame, WebGL2 bound only the first and WebGPU wrote the second once, with
// its `time` left at zero.
const TWO_BLOCKS = `"use typeshade"

class Look {
  tint: vec4
  gain: f32
}

class Clock {
  time: f32
  speed: f32
}

declare const look: uniform<Look>
declare const clock: uniform<Clock>

class VsOut {
  @builtin("position") pos: vec4
  @location(0) uv: vec2
}

@vertex
export function vs(@builtin("vertex_index") idx: u32): VsOut {
  const x = f32(idx & 1) * 4. - 1.
  const y = f32(idx >> 1) * 4. - 1.
  return { pos: vec4(x, y, 0., 1.), uv: vec2(x, y) * 0.5 + vec2(0.5, 0.5) }
}

@fragment
export function fs(v: VsOut): vec4 {
  const wave = 0.5 + 0.5 * sin(clock.time * clock.speed + v.uv.x * 12.)
  return vec4(look.tint.rgb * wave * look.gain, 1.)
}
`;

/** The canvas's pixels as one string, for telling two frames apart. */
async function frameDigest(page) {
  const { data } = await sharp(await photographCanvas(page))
    .raw()
    .toBuffer({ resolveWithObject: true });
  return createHash('sha1').update(data).digest('hex');
}

/** Hold the clock at `seconds` and wait for two frames drawn at it. */
async function holdAt(page, seconds) {
  const framesAt = await page.evaluate((t) => {
    document.querySelector('[data-playground]').__playground.freeze(t);
    return document.querySelector('[data-gpu-canvas]').__shader?.frames ?? 0;
  }, seconds);
  await page
    .waitForFunction(
      (n) => (document.querySelector('[data-gpu-canvas]').__shader?.frames ?? 0) >= n + 2,
      framesAt,
      { timeout: 20_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(200);
}

/** Every uniform block reaches the frame on both GPU backends: the second block's reserved
 *  `time` moves the picture as the clock does, and its slider moves it without a rebuild. */
async function checkUniformBlocks(page, problems) {
  await typeSource(page, TWO_BLOCKS);
  await settleResult(page);
  const seen = [];
  for (const engine of ['webgl2', 'webgpu']) {
    await page.selectOption('[data-engine]', engine);
    await settleBackend(page);
    const state = await resultState(page);
    if (state.backend !== engine) {
      problems.push(`two uniform blocks did not draw on ${engine}: ${state.note}`);
      continue;
    }
    await slide(page, '[data-bindings] input[aria-label="speed"]', 1);
    await holdAt(page, 1);
    const early = await frameDigest(page);
    await holdAt(page, 2);
    const later = await frameDigest(page);
    const mountedBefore = await page.evaluate(() => {
      const canvas = document.querySelector('[data-gpu-canvas]');
      canvas.dataset.probe = 'kept';
      return canvas.__shader?.frames ?? 0;
    });
    await slide(page, '[data-bindings] input[aria-label="speed"]', 0.25);
    await holdAt(page, 2);
    const slower = await frameDigest(page);
    const kept = await page.evaluate(() => {
      const canvas = document.querySelector('[data-gpu-canvas]');
      return { probe: canvas.dataset.probe ?? '', frames: canvas.__shader?.frames ?? 0 };
    });
    if (early === later)
      problems.push(`on ${engine} the second block's time did not reach the frame`);
    if (later === slower)
      problems.push(`on ${engine} the second block's speed slider did not reach the frame`);
    if (kept.probe !== 'kept' || kept.frames < mountedBefore)
      problems.push(`on ${engine} a slider in the second block rebuilt the pass`);
    seen.push(
      `${engine} ${early === later ? 'still' : 'moves'} with time, ${later === slower ? 'deaf' : 'follows'} speed`,
    );
  }
  await page.evaluate(() => document.querySelector('[data-playground]').__playground.freeze(null));
  await page.selectOption('[data-engine]', 'auto');
  await settleBackend(page);
  console.log(`  two uniform blocks: ${seen.join(', ')}`);
}

// A uniform struct that nests a struct and an array of them. Before the panel filled each
// leaf, it had no control for `scene` and the canvas drew nothing.
const NESTED_UNIFORM = `"use typeshade"

class Light {
  dir: vec3
  colour: vec3
}

class Scene {
  key: Light
  fills: array<Light, 2>
  ambient: f32
}

declare const scene: uniform<Scene>

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  const n = normalize(vec3(uv * 2. - 1., 1.))
  let c = scene.key.colour * max(dot(n, normalize(scene.key.dir)), 0.)
  c = c + scene.fills[0].colour * max(dot(n, normalize(scene.fills[0].dir)), 0.)
  c = c + scene.fills[1].colour * max(dot(n, normalize(scene.fills[1].dir)), 0.)
  return vec4(c + vec3(scene.ambient, scene.ambient, scene.ambient), 1.)
}
`;

/** A uniform struct of structs: a control for every leaf, a frame on every engine, and a
 *  leaf's control that moves the frame. */
async function checkNestedUniform(page, problems) {
  await typeSource(page, NESTED_UNIFORM);
  await settleResult(page);
  const panel = await page.evaluate(() => ({
    text: document.querySelector('[data-bindings]')?.textContent ?? '',
    leaf: document.querySelector('[data-bindings] input[aria-label="fills[1].colour"]') !== null,
  }));
  if (!panel.leaf) problems.push('the nested uniform has no control for fills[1].colour');
  const note = JSON.parse(
    await page.evaluate(() => document.querySelector('[data-playground]').dataset.copy),
  ).bindings.noControl;
  if (panel.text.includes(note))
    problems.push(`the nested uniform still reads "${note}" in the panel`);
  const seen = [];
  for (const engine of ['webgl2', 'webgpu']) {
    await page.selectOption('[data-engine]', engine);
    await settleBackend(page);
    const state = await resultState(page);
    const drawn = await canvasColours(page);
    if (state.backend !== engine || drawn.colours < 2)
      problems.push(
        `the nested uniform on ${engine} drew ${drawn.colours} colour(s): ${state.note}`,
      );
    seen.push(`${engine} ${drawn.colours} colours`);
  }
  await holdAt(page, 1);
  const before = await frameDigest(page);
  await slide(page, '[data-bindings] input[aria-label="ambient"]', 0.05);
  await holdAt(page, 1);
  if ((await frameDigest(page)) === before)
    problems.push('the nested uniform: moving ambient did not reach the frame');
  await page.selectOption('[data-engine]', 'cpu');
  const cpu = await page
    .waitForFunction(
      () => document.querySelector('[data-canvas-note]').dataset.px !== undefined,
      null,
      { timeout: 30_000 },
    )
    .then(() =>
      page.evaluate(() => {
        const node = document.querySelector('[data-canvas]');
        const data = node.getContext('2d').getImageData(0, 0, node.width, node.height).data;
        const set = new Set();
        for (let i = 0; i < data.length; i += 4)
          if (data[i + 3] > 0) set.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        return set.size;
      }),
    )
    .catch(() => 0);
  if (cpu < 2) problems.push(`the nested uniform drew ${cpu} colour(s) on the CPU`);
  seen.push(`CPU ${cpu} colours`);
  await page.evaluate(() => document.querySelector('[data-playground]').__playground.freeze(null));
  await page.selectOption('[data-engine]', 'auto');
  await settleBackend(page);
  console.log(`  nested uniform: ${seen.join(', ')}, ambient reaches the frame`);
}

/** The plotted canvas's pixels at a grid of points, once a dispatch on `backend` has plotted. */
async function plottedPixels(page, backend) {
  await page.waitForFunction(
    (b) => {
      const canvas = document.querySelector('[data-gpu-canvas]');
      return canvas?.dataset.plotted === '1' && canvas.dataset.backend === b;
    },
    backend,
    { timeout: 60_000 },
  );
  return page.evaluate(() => {
    const node = document.querySelector('[data-gpu-canvas]');
    const data = node.getContext('2d').getImageData(0, 0, node.width, node.height).data;
    const out = [];
    for (let y = 0.05; y < 1; y += 0.1)
      for (let x = 0.05; x < 1; x += 0.1) {
        const at = (Math.floor(y * node.height) * node.width + Math.floor(x * node.width)) * 4;
        out.push([data[at], data[at + 1], data[at + 2]]);
      }
    return { width: node.width, height: node.height, points: out };
  });
}

/** A compute entry that writes storage textures runs on the CPU oracle: it loads and stores
 *  texels there, and the image it plots is the one WebGPU wrote. */
async function checkStorageTextures(page, problems) {
  await pickExample(page, 'storage-texture');
  const gpu = await plottedPixels(page, 'webgpu');
  await page.selectOption('[data-engine]', 'cpu');
  const cpu = await plottedPixels(page, 'cpu').catch(() => undefined);
  const note = (await resultState(page)).note;
  const rows = await page.evaluate(
    () => document.querySelector('[data-bindings]')?.textContent ?? '',
  );
  await page.selectOption('[data-engine]', 'auto');
  await settleResult(page);
  if (!cpu) {
    problems.push(`storage-texture did not plot on the CPU: ${note}`);
    return;
  }
  let worst = 0;
  const colours = new Set();
  cpu.points.forEach((c, i) => {
    colours.add(c.join(','));
    const g = gpu.points[i];
    worst = Math.max(worst, ...c.map((v, k) => Math.abs(v - g[k])));
  });
  if (colours.size < 2)
    problems.push(`storage-texture plotted ${colours.size} colour(s) on the CPU: ${note}`);
  if (worst > 1)
    problems.push(`storage-texture on the CPU differs from WebGPU by up to ${worst} of 255`);
  if (!/128 × 128 rgba8unorm/.test(rows))
    problems.push('storage-texture on the CPU left no row under its storage textures');
  console.log(
    `  storage textures on the CPU: storage-texture in ${colours.size} colours at ${cpu.points.length} points, within ${worst} of 255 of WebGPU`,
  );
}

/** The Console tab shows the lines a compute run's console calls delivered: from WebGPU, where
 *  the module is emitted with the console buffer and the page decodes it, and from the CPU
 *  oracle's sink. The two runs give the same lines, each marked with the tier that ran it and
 *  the file and line of its call, the way a host's printed line is (surface §66). */
const firstDiff = (a, b) => a.findIndex((x, i) => x !== b[i]);

/** The `file:line` of each line of `source` that holds `needle`, as the editor numbers it. */
const linesWith = (source, needle, file = 'gpu-console.shade.ts') =>
  source.split('\n').flatMap((text, i) => (text.includes(needle) ? [`${file}:${i + 1}`] : []));

async function checkConsole(page, problems) {
  await pickExample(page, 'gpu-console');
  const linesOn = async (backend) => {
    await plottedPixels(page, backend).catch(() => undefined);
    await page
      .waitForFunction(
        () => (document.querySelector('[data-console] ol')?.children.length ?? 0) > 0,
        undefined,
        { timeout: 60_000 },
      )
      .catch(() => undefined);
    // What a line logged and where, which the two engines agree on, apart from its tier.
    return page.evaluate(() =>
      [...document.querySelectorAll('[data-console] li')].map((li) => ({
        tier: li.querySelector('.tier')?.textContent ?? '',
        source: li.querySelector('.source')?.textContent ?? '',
        text: [...li.children]
          .filter((child) => !child.classList.contains('tier'))
          .map((child) => child.textContent)
          .join('  '),
      })),
    );
  };
  // The example's console.table of a matrix (changes/0019) is drawn as a table, not one line.
  const tables = () =>
    page.evaluate(() => document.querySelectorAll('[data-console] li table').length);
  const calls = linesWith(await sourceOf(page), 'console.');
  const gpuLines = await linesOn('webgpu');
  const gpuTables = await tables();
  await page.selectOption('[data-engine]', 'cpu');
  const cpuLines = await linesOn('cpu');
  const cpuTables = await tables();
  const gpu = gpuLines.map((line) => line.text);
  const cpu = cpuLines.map((line) => line.text);
  const untiered = [
    ...gpuLines.filter((line) => line.tier !== 'GPU'),
    ...cpuLines.filter((line) => line.tier !== 'CPU'),
  ];
  if (untiered.length > 0)
    problems.push(
      `gpu-console has ${untiered.length} console line(s) not marked with the tier that ran them: ${JSON.stringify(untiered[0])}`,
    );
  const unplaced = [...gpuLines, ...cpuLines].filter((line) => !calls.includes(line.source));
  if (unplaced.length > 0)
    problems.push(
      `gpu-console has ${unplaced.length} console line(s) that name no line of the file with a console call (${calls.join(', ')}): ${JSON.stringify(unplaced[0])}`,
    );
  if (gpu.length > 0 && gpuTables === 0)
    problems.push('gpu-console drew no console.table as a table from WebGPU');
  if (cpu.length > 0 && cpuTables === 0)
    problems.push('gpu-console drew no console.table as a table from the CPU');
  await page.selectOption('[data-engine]', 'auto');
  await settleResult(page);
  if (gpu.length === 0) problems.push('gpu-console showed no console line from WebGPU');
  if (cpu.length === 0) problems.push('gpu-console showed no console line from the CPU');
  if (gpu.length > 0 && JSON.stringify(gpu) !== JSON.stringify(cpu))
    problems.push(
      `gpu-console's console lines differ between WebGPU and the CPU (${gpu.length} and ${cpu.length}; at line ${firstDiff(gpu, cpu)}: ${gpu[firstDiff(gpu, cpu)]} / ${cpu[firstDiff(gpu, cpu)]})`,
    );
  console.log(
    `  console: gpu-console logged ${gpu.length} lines on WebGPU, the same on the CPU, ${gpuTables} of them tables, from ${new Set(gpuLines.map((line) => line.source)).size} calls`,
  );
}

/** The Console tab's next report after `before`, once it is one of `reports`: what it says,
 *  its counts, and its lines by block, each as the place it ran and the text it logged, and
 *  in `places` the tier that ran it and the file and line of its call. */
async function nextReport(page, before, reports) {
  await page.waitForFunction(
    ([b, wanted]) => {
      const pane = document.querySelector('[data-console]');
      return Number(pane?.dataset.paint ?? 0) > b && wanted.includes(pane?.dataset.report ?? '');
    },
    [before, reports],
    { timeout: 60_000 },
  );
  return page.evaluate(() => {
    const pane = document.querySelector('[data-console]');
    const blocks = {};
    const places = {};
    for (const list of pane.querySelectorAll('ol[data-console-block]')) {
      blocks[list.dataset.consoleBlock] = [...list.children].map((li) => [
        li.querySelector('.at')?.textContent ?? '',
        li.lastElementChild?.textContent ?? '',
      ]);
      places[list.dataset.consoleBlock] = [...list.children].map((li) => [
        li.querySelector('.tier')?.textContent ?? '',
        li.querySelector('.source')?.textContent ?? '',
      ]);
    }
    return {
      report: pane.dataset.report,
      lines: Number(pane.dataset.lines ?? -1),
      dropped: Number(pane.dataset.dropped ?? -1),
      heading: pane.querySelector('p')?.textContent ?? '',
      text: pane.textContent,
      blocks,
      places,
    };
  });
}

const paintsOf = (page) =>
  page.evaluate(() => Number(document.querySelector('[data-console]')?.dataset.paint ?? 0));

/** A module that draws logs a pixel at a time (surface §66). The Console tab says so before a
 *  click. On WebGPU a click draws the frame once more for that pixel alone with its console
 *  calls recorded and lists what the pixel logged; the vertex entry's calls, which no GPU
 *  records, come from the CPU oracle for the three vertices, under a sentence that says why.
 *  On WebGL2, which records nothing, the same pixel runs on the CPU oracle and lists the same
 *  lines. A click outside the triangle says no fragment runs there. */
async function checkPixelConsole(page, problems) {
  await pickExample(page, 'hello');
  const source = (await sourceOf(page))
    .replace(
      'export function fs(): Color {',
      'export function fs(@builtin("position") p: vec4): Color {\n  console.log("at", p.x, p.y);',
    )
    .replace('let x = -0.8;', 'console.log("vertex", i);\n  let x = -0.8;');
  await typeSource(page, source);
  // Each line names the tier that ran it and the line of its call (surface §66).
  const [atCall] = linesWith(source, 'console.log("at"', 'hello.shade.ts');
  const [vertexCall] = linesWith(source, 'console.log("vertex"', 'hello.shade.ts');
  const placesOf = (report, block) =>
    (report.places[block] ?? []).map(([tier, where]) => `${tier} ${where}`);
  await settleResult(page);
  await openTab(page, 'console');
  const hint = (await page.textContent('[data-console]')).trim();
  await openTab(page, 'result');
  const frame = await page.$('[data-gpu-frame]');
  const box = await frame.boundingBox();
  const clickAt = async (x, y, reports) => {
    const before = await paintsOf(page);
    await page.mouse.click(x, y);
    return nextReport(page, before, reports);
  };
  const inside = [box.x + box.width / 2, box.y + box.height * 0.6];
  const backend = await page.evaluate(
    () => document.querySelector('[data-gpu-canvas]')?.dataset.backend,
  );
  if (!/Click a pixel|픽셀을 클릭/.test(hint))
    problems.push(`a module that draws and logs shows no pixel hint in the Console tab: "${hint}"`);
  if (backend !== 'webgpu') {
    problems.push(`the pixel console needs the Result tab on WebGPU, and it drew on ${backend}`);
    await pickExample(page, 'hello');
    return;
  }
  const onGpu = await clickAt(...inside, ['pixel/webgpu', 'pixel/cpu']);
  const note = (await page.textContent('[data-pixel-note]')).trim();
  const fragmentLine = /^\[(\d+), (\d+), 0\]$/;
  const pixelOf = (report) => {
    const [at, text] = report.blocks.pixel?.[0] ?? ['', ''];
    const m = fragmentLine.exec(at);
    return m && text === `at ${m[1]}.5 ${m[2]}.5` ? `${m[1]},${m[2]}` : '';
  };
  if (onGpu.report !== 'pixel/webgpu')
    problems.push(`a click on the WebGPU canvas was not recorded on WebGPU: ${onGpu.heading}`);
  if ((onGpu.blocks.pixel ?? []).length !== 1 || pixelOf(onGpu) === '')
    problems.push(
      `a click inside the triangle should list the pixel's one line from WebGPU: ${JSON.stringify(onGpu.blocks)}`,
    );
  const vertexBodies = (report) => (report.blocks.vertex ?? []).map(([, text]) => text);
  if (JSON.stringify(vertexBodies(onGpu)) !== JSON.stringify(['vertex 0', 'vertex 1', 'vertex 2']))
    problems.push(
      `the vertex entry's calls should be the CPU oracle's, one per vertex: ${JSON.stringify(onGpu.blocks.vertex)}`,
    );
  if (!/vertex stage|버텍스 단계/.test(onGpu.text))
    problems.push('the WebGPU report does not say why a vertex entry records nothing');
  if (JSON.stringify(placesOf(onGpu, 'pixel')) !== JSON.stringify([`GPU ${atCall}`]))
    problems.push(
      `the pixel's line from WebGPU should say GPU and ${atCall}: ${JSON.stringify(onGpu.places.pixel)}`,
    );
  if (placesOf(onGpu, 'vertex').some((place) => place !== `CPU ${vertexCall}`))
    problems.push(
      `the vertex entry's lines should say CPU and ${vertexCall}: ${JSON.stringify(onGpu.places.vertex)}`,
    );
  if (!/\(\d+, \d+\)/.test(note)) problems.push(`the pixel note names no pixel: "${note}"`);

  // The same pixel on WebGL2, whose GLSL records nothing: the CPU oracle's lines, the same ones.
  await page.selectOption('[data-engine]', 'webgl2');
  await settleResult(page);
  const onGl = await clickAt(...inside, ['pixel/cpu', 'pixel/webgpu']);
  if (onGl.report !== 'pixel/cpu' || !/WebGL2/.test(onGl.heading))
    problems.push(`a click on WebGL2 should run the pixel on the CPU oracle: ${onGl.heading}`);
  if (pixelOf(onGl) !== pixelOf(onGpu) || pixelOf(onGl) === '')
    problems.push(
      `the same pixel logged differently on WebGPU and on the CPU oracle: ${JSON.stringify(onGpu.blocks.pixel)} and ${JSON.stringify(onGl.blocks.pixel)}`,
    );
  if (JSON.stringify(placesOf(onGl, 'pixel')) !== JSON.stringify([`CPU ${atCall}`]))
    problems.push(
      `the pixel's line from the CPU oracle should say CPU and ${atCall}: ${JSON.stringify(onGl.places.pixel)}`,
    );
  if (JSON.stringify(vertexBodies(onGl)) !== JSON.stringify(vertexBodies(onGpu)))
    problems.push(`the vertex entry's lines differ between the two reports`);
  await page.selectOption('[data-engine]', 'auto');
  await settleResult(page);

  const outside = await clickAt(box.x + 3, box.y + 3, ['pixel/webgpu', 'pixel/cpu']);
  if ((outside.blocks.pixel ?? []).length !== 0 || !/triangle|삼각형/.test(outside.heading))
    problems.push(`a click outside the triangle should say so: ${JSON.stringify(outside)}`);
  console.log(
    `  pixel console: ${pixelOf(onGpu) || 'nothing'} on WebGPU and ${pixelOf(onGl) || 'nothing'} on the CPU oracle, ${vertexBodies(onGpu).length} vertex lines; outside: ${outside.heading}`,
  );
  await pickExample(page, 'hello');
}

/** Record the frame on WebGPU (surface §66): the canvas's frame drawn once more with every
 *  pixel's console calls recorded. A fragment that logs on a grid of pixels comes back as
 *  exactly those lines, row by row, each marked with its own pixel. One that logs every pixel
 *  overflows the buffer, and the report keeps whole lines, each still its own pixel's, and
 *  counts every call it dropped: kept and dropped add up to the pixels of the frame. The CPU
 *  oracle's own draw lists the same grid's lines at its own resolution. */
async function checkFrameConsole(page, problems) {
  const grid = (every) => `"use typeshade";

@fragment
export function main(@location(0) uv: vec2, @builtin("position") p: vec4): vec4 {
  if (i32(p.x) % ${every} === 0 && i32(p.y) % ${every} === 0) {
    console.log("grid", p.x, p.y);
  }
  return vec4(uv, 0.5, 1.);
}
`;
  const record = async () => {
    await openTab(page, 'console');
    await page.waitForSelector('[data-record-frame]:not([hidden])', { timeout: 30_000 });
    const before = await paintsOf(page);
    await page.click('[data-record-frame]');
    const report = await nextReport(page, before, ['frame/webgpu', 'frame/failed']);
    const size = await page.evaluate(() => {
      const canvas = document.querySelector('[data-gpu-canvas]');
      return [canvas.width, canvas.height];
    });
    await openTab(page, 'result');
    return { report, size };
  };

  await typeSource(page, grid(40));
  await settleResult(page);
  const backend = await page.evaluate(
    () => document.querySelector('[data-gpu-canvas]')?.dataset.backend,
  );
  if (backend !== 'webgpu') {
    problems.push(`recording a frame needs the Result tab on WebGPU, and it drew on ${backend}`);
    await pickExample(page, 'hello');
    return;
  }
  const { report: sparse, size } = await record();
  const [w, h] = size;
  const expected = [];
  for (let y = 0; y < h; y += 40)
    for (let x = 0; x < w; x += 40) expected.push([`[${x}, ${y}, 0]`, `grid ${x}.5 ${y}.5`]);
  const got = sparse.blocks.frame ?? [];
  if (sparse.report !== 'frame/webgpu')
    problems.push(`the frame was not recorded: ${sparse.heading}`);
  if (sparse.lines !== expected.length || sparse.dropped !== 0)
    problems.push(
      `a ${w} x ${h} frame logging every 40th pixel should give ${expected.length} lines and drop none, and gave ${sparse.lines} and dropped ${sparse.dropped}`,
    );
  const shown = expected.slice(0, got.length);
  if (got.length === 0 || JSON.stringify(got) !== JSON.stringify(shown))
    problems.push(
      `the recorded frame's lines are not the grid's, row by row: ${JSON.stringify(got.slice(0, 4))} for ${JSON.stringify(shown.slice(0, 4))}`,
    );
  // The file has no vertex entry, so the page compiles it with the prelude's lines in it; the
  // line a call names is still the editor's.
  const [gridCall] = linesWith(grid(40), 'console.log("grid"', 'hello.shade.ts');
  const misplaced = (report, tier) =>
    (report.places.frame ?? []).filter(([t, where]) => t !== tier || where !== gridCall);
  if (misplaced(sparse, 'GPU').length > 0)
    problems.push(
      `the recorded frame's lines should say GPU and ${gridCall}: ${JSON.stringify(misplaced(sparse, 'GPU').slice(0, 2))}`,
    );

  await typeSource(page, grid(1));
  await settleResult(page);
  const { report: dense, size: denseSize } = await record();
  const pixels = denseSize[0] * denseSize[1];
  const own = (dense.blocks.frame ?? []).every(([at, text]) => {
    const m = /^\[(\d+), (\d+), 0\]$/.exec(at);
    return m !== null && text === `grid ${m[1]}.5 ${m[2]}.5`;
  });
  if (dense.lines + dense.dropped !== pixels || dense.lines <= 0)
    problems.push(
      `a frame logging every pixel should keep and drop ${pixels} calls between them, and kept ${dense.lines} and dropped ${dense.dropped}`,
    );
  if (!own) problems.push("a line kept from an overflowing frame is not its own pixel's");
  if (dense.dropped > 0 && !/dropped|버려/.test(dense.text))
    problems.push('the report of an overflowing frame does not say calls were dropped');

  // The CPU oracle draws the whole frame itself, and lists what its pixels logged once done.
  await typeSource(page, grid(40));
  await settleResult(page);
  const before = await paintsOf(page);
  await page.selectOption('[data-engine]', 'cpu');
  const onCpu = await nextReport(page, before, ['frame/cpu']);
  const [cw, ch] = await page.evaluate(() => {
    const canvas = document.querySelector('[data-canvas]');
    return [canvas.width, canvas.height];
  });
  const cpuExpected = [];
  for (let y = 0; y < ch; y += 40)
    for (let x = 0; x < cw; x += 40) cpuExpected.push([`[${x}, ${y}, 0]`, `grid ${x}.5 ${y}.5`]);
  if (
    onCpu.lines !== cpuExpected.length ||
    onCpu.dropped !== 0 ||
    JSON.stringify(onCpu.blocks.frame ?? []) !== JSON.stringify(cpuExpected)
  )
    problems.push(
      `the CPU oracle's ${cw} x ${ch} frame should list ${cpuExpected.length} grid lines row by row, and listed ${onCpu.lines}: ${JSON.stringify((onCpu.blocks.frame ?? []).slice(0, 4))}`,
    );
  if (misplaced(onCpu, 'CPU').length > 0)
    problems.push(
      `the CPU oracle's frame lines should say CPU and ${gridCall}: ${JSON.stringify(misplaced(onCpu, 'CPU').slice(0, 2))}`,
    );
  await page.selectOption('[data-engine]', 'auto');
  await settleResult(page);
  console.log(
    `  frame console: ${sparse.lines} lines from a ${w} x ${h} grid of every 40th pixel on WebGPU, ${onCpu.lines} from ${cw} x ${ch} on the CPU oracle; every pixel logging kept ${dense.lines} and dropped ${dense.dropped} of ${pixels}`,
  );
  await pickExample(page, 'hello');
}

/** One previously flat example of each kind the panel supplies now draws, and the panel's
 *  controls reach the frame: a matrix preset, a texture source, an override, a dispatch's
 *  buffers on both engines, and a value that survives a recompile. */
async function checkBindings(page, problems) {
  // A uniform struct with a matrix in it. Under the identity the normal points at the viewer
  // and the fragment is one colour; turned about Y it is not.
  await pickExample(page, 'normal-matrix');
  const flat = await canvasColours(page, 1);
  await page.selectOption('[data-bindings] select[aria-label^="model "]', 'turn');
  await page.waitForTimeout(600);
  const turned = await canvasColours(page);
  if (turned.colours <= flat.colours)
    problems.push(
      `the matrix preset did not reach the frame: ${flat.colours} colour(s) before, ${turned.colours} after`,
    );
  console.log(
    `  uniform matrix: normal-matrix ${flat.colours} colour(s) at the identity, ${turned.colours} turned`,
  );

  // The same uniform struct on the CPU oracle, which used to stop at `unbound u`.
  await pickExample(page, 'hello-uniform-struct');
  await page.selectOption('[data-engine]', 'cpu');
  await page.waitForFunction(
    () => document.querySelector('[data-canvas-note]').dataset.px !== undefined,
    null,
    { timeout: 30_000 },
  );
  const cpuNote = (await page.textContent('[data-canvas-note]')).trim();
  const cpuColours = await page.evaluate(() => {
    const node = document.querySelector('[data-canvas]');
    const data = node.getContext('2d').getImageData(0, 0, node.width, node.height).data;
    const set = new Set();
    for (let i = 0; i < data.length; i += 4)
      if (data[i + 3] > 0) set.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return set.size;
  });
  if (/unbound|uniform or a storage/.test(cpuNote))
    problems.push(`the CPU oracle still has no value for the uniform: ${cpuNote}`);
  if (cpuColours < 2)
    problems.push(`the CPU oracle drew hello-uniform-struct in ${cpuColours} colour(s)`);
  console.log(`  uniform on the CPU: hello-uniform-struct in ${cpuColours} colours, "${cpuNote}"`);
  await page.selectOption('[data-engine]', 'auto');
  await settleBackend(page);

  // A texture and a sampler, and the two overrides beside them.
  await pickExample(page, 'textured-quad');
  const checker = await canvasColours(page);
  const textured = await resultState(page);
  if (textured.backend === 'none' || checker.colours < 2)
    problems.push(`textured-quad did not draw its texture: ${textured.note}`);
  await page.selectOption('[data-texture-source="tex"]', 'solid');
  await settleBackend(page);
  const solid = await canvasColours(page);
  if (solid.colours >= checker.colours)
    problems.push(
      `a solid texture drew as many colours as the checker: ${checker.colours} and ${solid.colours}`,
    );
  await page.selectOption('[data-texture-source="tex"]', 'checker');
  await settleBackend(page);
  console.log(
    `  texture: textured-quad on ${textured.backend}, ${checker.colours} colours from the checker, ${solid.colours} from a solid colour`,
  );

  await page.fill('[data-override="tint"]', '0');
  await page.press('[data-override="tint"]', 'Enter');
  await page.waitForTimeout(AFTER_EDIT);
  await settleBackend(page);
  await openTab(page, 'glslFragment');
  const pinned = (await page.innerText('[data-output]')).trim();
  await openTab(page, 'result');
  const dimmed = await canvasColours(page);
  if (!/#define tint 0(?:\.0*)?(?![\d.])/.test(pinned))
    problems.push(
      `the override did not reach the GLSL as a define:\n    ${pinned
        .split('\n')
        .filter((l) => /tint/.test(l))
        .join('\n    ')}`,
    );
  if (dimmed.colours >= checker.colours)
    problems.push(
      `tint 0 drew as many colours as tint 0.85: ${checker.colours} and ${dimmed.colours}`,
    );
  console.log(
    `  override: tint 0 pinned in the GLSL, ${checker.colours} colours to ${dimmed.colours}`,
  );

  // A compute entry: dispatched on WebGPU and on the oracle, and what it wrote shown twice.
  await pickExample(page, 'array-length');
  for (const engine of ['auto', 'cpu']) {
    if (engine === 'cpu') {
      await page.selectOption('[data-engine]', 'cpu');
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector('[data-gpu-canvas]');
          return canvas?.dataset.plotted === '1' && canvas.dataset.backend === 'cpu';
        },
        null,
        { timeout: 20_000 },
      );
    }
    const state = await resultState(page);
    const plot = await canvasColours(page);
    const rows = await page.evaluate(
      () => document.querySelector('[data-result="dst"]')?.textContent ?? '',
    );
    if (!state.plotted || plot.colours < 2)
      problems.push(`array-length on ${engine} plotted nothing: ${state.note}`);
    if (!/\[0\]/.test(rows) || !/\[1\]/.test(rows))
      problems.push(`array-length on ${engine} showed no rows for dst: "${rows.slice(0, 80)}"`);
    console.log(
      `  compute: array-length on ${state.backend}, ${plot.colours} colours, dst ${rows.split('\n').slice(0, 2).join(' ')}`,
    );
  }
  await page.selectOption('[data-engine]', 'auto');

  // A value the reader set survives an edit that keeps its field.
  await pickExample(page, 'hillshade-twin');
  await slide(page, '[data-bindings] input[aria-label="sun_az"]', 0.9);
  await typeSource(page, `${await sourceOf(page)}\n// an edit that keeps every binding\n`);
  await settleResult(page);
  const kept = Number(
    await page.$eval('[data-bindings] input[aria-label="sun_az"]', (input) => input.value),
  );
  if (Math.abs(kept - 0.9) > 1e-6)
    problems.push(`the value set on sun_az did not survive a recompile: 0.9 became ${kept}`);
  console.log(`  a value across an edit: sun_az held at ${kept}`);
}

async function checkRoute(browser, origin, route) {
  const { page, pageErrors, cdnFailures } = await openPage(browser);
  const problems = [];
  let cdnOnly = false;
  try {
    // A bare link opens on the gallery (checkWorkspace); the tool is checked on the example it
    // opened on before the gallery came first.
    await page.goto(`${origin}${route}#example=hello`, { waitUntil: 'load' });

    let mounted = true;
    try {
      await page.waitForSelector('.monaco-editor', { timeout: EDITOR_TIMEOUT });
    } catch {
      mounted = false;
      problems.push('the editor did not mount: no .monaco-editor appeared');
    }

    if (mounted) {
      // Monaco's own TypeScript drew seven diagnostics on this sample that the TypeShade
      // compiler does not report. Reading the setting says so without waiting on Monaco's
      // worker, which answers on its own schedule and is down whenever the CDN is proxied.
      const validation = await page.evaluate(
        () =>
          window.monaco?.languages.typescript.typescriptDefaults.getDiagnosticsOptions() ?? null,
      );
      if (!validation)
        problems.push(
          'the TypeScript defaults are unreachable, so its validation could not be read',
        );
      else if (!validation.noSemanticValidation || !validation.noSyntaxValidation) {
        problems.push(
          `Monaco is checking the source itself: noSemanticValidation=${validation.noSemanticValidation}, noSyntaxValidation=${validation.noSyntaxValidation}`,
        );
      }
      // And its providers are off too, not only its validation: the page's providers answer
      // for the editor alone, so a hover or a completion list holds one answer and not the
      // page's beside Monaco's own. The mode configuration is what says so.
      const mode = await page.evaluate(
        () => window.monaco?.languages.typescript.typescriptDefaults.modeConfiguration ?? null,
      );
      if (!mode) problems.push('the TypeScript mode configuration is unreachable');
      else {
        const still = [
          'hovers',
          'completionItems',
          'definitions',
          'references',
          'documentSymbols',
          'rename',
          'signatureHelp',
          'diagnostics',
        ].filter((k) => mode[k] !== false);
        if (still.length > 0)
          problems.push(`Monaco's own TypeScript providers are still on: ${still.join(', ')}`);
      }

      // And nothing it owns reached the model. Its worker reports late, so this settles first.
      await page.waitForTimeout(SETTLE);
      const markers = await page.evaluate(() =>
        (window.monaco?.editor.getModelMarkers({}) ?? []).map(
          (m) => `${m.owner} ${m.startLineNumber}:${m.startColumn} ${m.code ?? ''} ${m.message}`,
        ),
      );
      if (markers.length > 0)
        problems.push(
          `the editor drew ${markers.length} marker(s) on the sample:\n    ${markers.join('\n    ')}`,
        );

      // The compiler is bundled into the page, so this is the half that needs no network.
      // innerText is what the reader sees: the pane is coloured markup whose line breaks are
      // <br>, which textContent would run together into one line.
      await openTab(page, 'wgsl');
      const output = (await page.innerText('[data-output]')).trim();
      if (output.length === 0) problems.push('the WGSL pane is empty');
      else if (!/@vertex|@fragment|fn\s/.test(output))
        problems.push(`the WGSL pane holds no WGSL:\n    ${output.slice(0, 200)}`);

      // And it is syntax-coloured. One colour throughout means the tokenizer did nothing.
      const colours = await page.evaluate(() => {
        const pane = document.querySelector('[data-output]');
        return [
          ...new Set([...pane.querySelectorAll('span')].map((s) => getComputedStyle(s).color)),
        ].length;
      });
      if (colours < 2)
        problems.push(
          `the WGSL pane is not syntax-coloured: ${colours} colour(s) across its spans`,
        );

      // And it still copies as shader source. Monaco's colorize writes spaces as &nbsp;, and a
      // reader pasting U+00A0 into a shader file gets something no compiler accepts.
      const nbsp = (output.match(/\u00a0/g) ?? []).length;
      if (nbsp > 0)
        problems.push(
          `the WGSL pane holds ${nbsp} non-breaking space(s), so copying it out gives source no compiler takes`,
        );

      // The reflection pane: what reflect() recovered, and what the entry points return when
      // the CPU oracle runs them. The sample declares a vertex and a fragment entry point.
      const reflection = await reflectionPane(page);
      for (const wanted of [
        '@vertex',
        '@fragment',
        'vec4<f32>',
        '@builtin(vertex_index)',
        '@location(0)',
      ]) {
        if (!reflection.includes(wanted))
          problems.push(
            `the reflection pane is missing ${wanted}:\n    ${reflection.slice(0, 240)}`,
          );
      }

      await page.click('[data-run-cpu]');
      await page.waitForTimeout(500);
      const evaluated = (await page.innerText('[data-reflection]')).trim();
      // The sample's two entry points return a clip position and a red fragment.
      for (const wanted of ['[-0.8, -0.8, 0, 1]', '[1, 0, 0, 1]']) {
        if (!evaluated.includes(wanted))
          problems.push(`the CPU oracle did not return ${wanted}:\n    ${evaluated.slice(0, 240)}`);
      }

      // The arguments are editable, so the vertex entry can be seen at a corner other than
      // its first. At `vertex_index` 0 the sample returns [-0.8, -0.8, 0, 1]; at 1 it returns
      // the second corner. Before this the oracle ran every entry at the zero of its type.
      await page.fill('[data-arg="vs/i"]', '1');
      await page.click('[data-run-cpu]');
      await page.waitForTimeout(500);
      const atOne = (await page.innerText('[data-reflection]')).trim();
      if (!atOne.includes('[0.8, -0.8, 0, 1]')) {
        problems.push(
          `running the vertex entry at vertex_index 1 did not return the second corner:\n    ${atOne.slice(0, 240)}`,
        );
      }
      await page.fill('[data-arg="vs/i"]', '0');
      await page.click('[data-run-cpu]');
      await page.waitForTimeout(400);

      // ── the struct parameter, and the canvas ────────────────────────────────────────────
      // hello-vsout's `fs(v: VsOut)` declares a single struct parameter that reflection
      // reports as two fields. Handing the two over leaves the struct undefined and every
      // component computed from it comes back NaN, which is what this shipped as.
      await page.selectOption('[data-example]', 'hello-vsout');
      await page.waitForTimeout(AFTER_EDIT);
      await page.fill('[data-arg="fs/uv"]', '0.3, 0.7');
      await page.click('[data-run-cpu]');
      await page.waitForTimeout(500);
      const structRun = (await page.innerText('[data-reflection]')).trim();
      if (!structRun.includes('[0.3, 0.7, 0.2, 1]')) {
        problems.push(
          `an entry declaring a struct parameter was not called with the struct:\n    ${structRun.slice(0, 300)}`,
        );
      }

      // And the canvas, which is the Result tab of the one strip over the result column.
      // Every read below is of that panel, so it stays open to the end of the shape check.
      // The tab draws with the GPU by default and the oracle's rasteriser is the other
      // engine, so the block that measures the rasteriser selects it first.
      await openTab(page, 'result');
      await page.selectOption('[data-engine]', 'cpu');
      await page.waitForTimeout(400);
      // The canvas: the vertex entry for three corners, then one fragment call per pixel
      // the triangle covers, with every varying interpolated from what the vertex entry
      // returned. A triangle covers some of the canvas and not all of it. The canvas follows
      // the source, so choosing the example is what drew it; a draw deletes the count when it
      // starts and writes it when it ends, so a count present means this draw is done.
      await page.waitForFunction(
        () => document.querySelector('[data-canvas-note]').dataset.px !== undefined,
        null,
        { timeout: 15_000 },
      );
      const drawn = await page.evaluate(() => {
        const node = document.querySelector('[data-canvas]');
        const data = node.getContext('2d').getImageData(0, 0, node.width, node.height).data;
        let opaque = 0;
        const colours = new Set();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            opaque += 1;
            colours.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
          }
        }
        return { opaque, colours: colours.size, total: node.width * node.height };
      });
      // The note names how many workers drew it. The pool is sized from the cores the
      // browser admits to, so the number is whatever this runner has, and 1 means the
      // main-thread fallback ran instead.
      // The note's words are translated, so what is read here are the numbers it carries as
      // data. 1 worker means the main-thread fallback drew it instead of the pool.
      const canvasNote = await page.evaluate(() => {
        const node = document.querySelector('[data-canvas-note]');
        return {
          text: node.textContent.trim(),
          px: Number(node.dataset.px),
          workers: Number(node.dataset.workers),
        };
      });
      if (!Number.isFinite(canvasNote.workers) || canvasNote.workers < 1) {
        problems.push(`the CPU canvas did not report what drew it: "${canvasNote.text}"`);
      } else if (canvasNote.px !== drawn.opaque) {
        problems.push(
          `the canvas says it covered ${canvasNote.px} px and ${drawn.opaque} are painted`,
        );
      }
      if (drawn.opaque === 0) problems.push('the CPU canvas drew nothing');
      else if (drawn.opaque >= drawn.total)
        problems.push(
          `the CPU canvas covered every pixel, so it drew no triangle: ${drawn.opaque}/${drawn.total}`,
        );
      // This example's fragment entry paints its varyings, so every covered pixel differs.
      else if (drawn.colours < drawn.opaque / 2) {
        problems.push(
          `the CPU canvas is not interpolating: ${drawn.colours} colour(s) across ${drawn.opaque} pixels`,
        );
      }
      console.log(
        `  canvas: ${drawn.opaque} of ${drawn.total} px, ${drawn.colours} colours, ${canvasNote.workers} worker(s)`,
      );

      // ── the grid moves, the box stays ────────────────────────────────────────────────────
      // Raising the resolution buys pixels and not room. The canvas element's width and
      // height are its backing store; the size it is shown at comes from the stylesheet, so
      // the pane does not resize under a reader who is changing the control.
      const canvasSize = () =>
        page.evaluate(() => {
          const node = document.querySelector('[data-canvas]');
          return { box: Math.round(node.getBoundingClientRect().width), grid: node.width };
        });
      const smallGrid = await canvasSize();
      await page.selectOption('[data-resolution]', '768');
      await page.waitForTimeout(250);
      const bigGrid = await canvasSize();
      if (bigGrid.grid !== 768)
        problems.push(`choosing 768 left the canvas grid at ${bigGrid.grid}`);
      if (smallGrid.grid === bigGrid.grid)
        problems.push('the resolution picker did not change the grid');
      if (smallGrid.box !== bigGrid.box) {
        problems.push(
          `the canvas box moved with the resolution: ${smallGrid.box}px at ${smallGrid.grid}, ${bigGrid.box}px at ${bigGrid.grid}`,
        );
      }
      if (bigGrid.box === 0) problems.push('the canvas is not being shown at any size');
      console.log(
        `  resolution: grid ${smallGrid.grid} to ${bigGrid.grid}, box held at ${bigGrid.box} px`,
      );

      // ── a draw retired by the control that started it ────────────────────────────────────
      // A draw is planned against one grid, and at the larger sizes it runs for seconds, so
      // changing the resolution while one is running is a normal thing to do and not an edge
      // case. The tiles in flight carry the old grid's coordinates; if they are not dropped
      // they scatter the old picture over the new canvas, and if the draw never settles the
      // button never comes back. This starts one, moves the control under it, and checks that
      // the page lands somewhere a reader can act from.
      // Choosing a size starts a draw at it. 1536 is 36 tiles and most of a second, so the
      // switch to 192 lands while it is well under way; the 192 draw then runs and reports.
      await page.selectOption('[data-resolution]', '1536');
      await page.waitForTimeout(150);
      await page.selectOption('[data-resolution]', '192');
      await page.waitForFunction(
        () => document.querySelector('[data-canvas-note]').dataset.px !== undefined,
        null,
        { timeout: 15_000 },
      );
      // The 192 count is in. Now the wait that finds the bug: long enough for the 1536 draw
      // to have finished if it was never retired, in which case its settle overwrites the
      // count with its own 753992 and its tiles land on a canvas a quarter of their size.
      // Retired, it stays quiet, and the count is the 192 draw's and nothing else's.
      await page.waitForTimeout(3_000);
      const retired = await page.evaluate(() => {
        const node = document.querySelector('[data-canvas]');
        const note = document.querySelector('[data-canvas-note]');
        return {
          grid: node.width,
          reported: Number(note.dataset.px),
          button: document.querySelector('[data-draw-cpu]').disabled ? 'disabled' : 'enabled',
        };
      });
      if (retired.grid !== 192)
        problems.push(
          `after retiring a draw the grid is ${retired.grid} and not the 192 that was chosen`,
        );
      if (retired.reported !== drawn.opaque) {
        problems.push(
          `after switching from 1536 to 192 the count is ${retired.reported}, not the ${drawn.opaque} a 192 draw covers: the retired draw reported over it`,
        );
      }
      if (retired.button !== 'enabled')
        problems.push('the draw button is not available after a retired draw');
      console.log(
        `  retired mid-draw: grid ${retired.grid}, reported ${retired.reported} px, button ${retired.button}`,
      );
      await page.selectOption('[data-engine]', 'auto');
      await page.waitForTimeout(AFTER_EDIT);

      // ── the shape of the page ────────────────────────────────────────────────────────────
      // The source and the result are the two things a reader looks between, so the columns
      // that hold them end on the same line, and the canvas is beside the code on the first
      // screen and not under the reflection two screens down. Measured in document space, so
      // it does not matter what the clicks above scrolled to.
      const shape = await page.evaluate(() => {
        const box = (selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return {
            top: Math.round(rect.top + window.scrollY),
            bottom: Math.round(rect.bottom + window.scrollY),
            height: Math.round(rect.height),
          };
        };
        return {
          source: box('.source-pane'),
          result: box('.result-column'),
          canvas: box('[data-gpu-canvas]'),
          editor: box('[data-editor]'),
          tabs: box('.result-head'),
          viewport: window.innerHeight,
        };
      });
      if (Math.abs(shape.source.height - shape.result.height) > 1) {
        problems.push(
          `the source column is ${shape.source.height}px tall and the result column ${shape.result.height}px`,
        );
      }
      if (shape.canvas.bottom > shape.viewport) {
        problems.push(
          `the canvas ends at ${shape.canvas.bottom}px, below the first ${shape.viewport}px screen`,
        );
      }
      // Beside the code, which is the whole point of the two columns: the canvas starts in
      // the top half of the editor, so it is next to the source and not under it. The tab
      // strip and the controls the Result tab owns sit over it, and those take a second row
      // where the column is too narrow for both, so the slack is the editor's own height
      // and not a fixed number of pixels.
      if (shape.canvas.top > shape.editor.top + shape.editor.height / 2) {
        problems.push(
          `the canvas starts at ${shape.canvas.top}px, past the middle of the ${shape.editor.height}px editor at ${shape.editor.top}px: it is not beside the code`,
        );
      }
      if (shape.tabs.top > shape.source.top + 1) {
        problems.push(
          `the tab strip starts at ${shape.tabs.top}px, below the top of the source column at ${shape.source.top}px: it is not at the top of the result column`,
        );
      }
      console.log(
        `  shape: columns ${shape.source.height} and ${shape.result.height} px, canvas ends at ${shape.canvas.bottom} of ${shape.viewport}, tab strip at ${shape.tabs.top}`,
      );

      // One strip, five tabs, one panel shown. The three texts and the reflection are
      // painted while hidden, so switching to one shows what the last compile put there.
      const strip = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('[role="tab"][data-target]')];
        const panels = [...document.querySelectorAll('.result-panels > [role="tabpanel"]')];
        return {
          names: tabs.map((t) => t.dataset.target),
          selected: tabs
            .filter((t) => t.getAttribute('aria-selected') === 'true')
            .map((t) => t.dataset.target),
          shown: panels.filter((p) => p.offsetParent !== null || p.getClientRects().length > 0)
            .length,
        };
      });
      const wantedTabs = ['result', 'wgsl', 'glslVertex', 'glslFragment', 'reflection', 'console'];
      if (strip.names.join(',') !== wantedTabs.join(','))
        problems.push(
          `the result column's tabs are ${strip.names.join(', ')}, not ${wantedTabs.join(', ')}`,
        );
      if (strip.selected.join(',') !== 'result')
        problems.push(
          `the Result tab is not the one selected: ${strip.selected.join(', ') || 'none'}`,
        );
      if (strip.shown !== 1)
        problems.push(`${strip.shown} of the result column's panels are shown at once`);
      console.log(`  tabs: ${strip.names.join(', ')}, showing ${strip.selected.join(', ')}`);

      await page.selectOption('[data-example]', 'hello');
      await page.waitForTimeout(AFTER_EDIT);

      // The GLSL tabs carry the other two files the compiler emits from the same module.
      for (const [tab, wanted] of [
        ['glslVertex', 'void main'],
        ['glslFragment', 'void main'],
      ]) {
        await page.click(`[data-target="${tab}"]`);
        await page.waitForTimeout(250);
        const glsl = (await page.innerText('[data-output]')).trim();
        const glslNbsp = (glsl.match(/\u00a0/g) ?? []).length;
        if (glslNbsp > 0) problems.push(`the ${tab} tab holds ${glslNbsp} non-breaking space(s)`);
        if (!glsl.startsWith('#version 300 es'))
          problems.push(
            `the ${tab} tab does not open with #version 300 es:\n    ${glsl.slice(0, 160)}`,
          );
        if (!glsl.includes(wanted))
          problems.push(`the ${tab} tab holds no ${wanted}:\n    ${glsl.slice(0, 160)}`);
      }
      await page.click('[data-target="wgsl"]');
      await page.waitForTimeout(250);

      // ── the emit options ────────────────────────────────────────────────────────────────
      const atO2 = await wgslPane(page);
      const shownSize = (await page.innerText('[data-size]')).trim();
      if (!/^[0-9]+ B$/.test(shownSize))
        problems.push(`the output pane shows no byte count: "${shownSize}"`);
      else if (Math.abs(Number(shownSize.replace(' B', '')) - atO2.length) > 2) {
        // The label counts the emitted string; the pane reads back trimmed of its last newline.
        problems.push(
          `the byte count says ${shownSize} for a pane holding ${atO2.length} characters`,
        );
      }

      await setOption(page, '[data-opt-level]', 'O0');
      const atO0 = await wgslPane(page);
      if (atO0 === atO2) problems.push('the optimization level changed nothing in the WGSL pane');
      if (!(await page.isVisible('[data-level-note]')))
        problems.push('at O0 the note about the level standing alone is hidden');
      await setOption(page, '[data-opt-level]', 'O2');
      if (await page.isVisible('[data-level-note]'))
        problems.push('at O2 the note about the level is still shown');

      await setOption(page, '[data-opt-minify]', true);
      const minified = await wgslPane(page);
      if (minified.length >= atO2.length)
        problems.push(
          `minify did not shrink the WGSL: ${atO2.length} to ${minified.length} characters`,
        );
      await setOption(page, '[data-opt-minify]', false);

      await setOption(page, '[data-opt-precision]', 'mediump');
      await page.click('[data-target="glslVertex"]');
      await page.waitForTimeout(250);
      const mediump = (await page.innerText('[data-output]')).trim();
      if (!mediump.includes('precision mediump float')) {
        problems.push(
          `mediump did not reach the GLSL precision line:\n    ${mediump.slice(0, 160)}`,
        );
      }
      await setOption(page, '[data-opt-precision]', 'highp');

      // `parens` needs a source the optimizer cannot fold flat. This one declares its own
      // `VsOut` and no vertex entry, so it is also what proves the prelude stays out of a
      // file that would get a duplicate from it.
      await typeSource(page, UNFOLDABLE);
      if (await page.isVisible('[data-prelude-note]')) {
        problems.push(
          'a file declaring its own VsOut was compiled behind the prelude, which declares one too',
        );
      }
      const parensFull = await wgslPane(page);
      if (!/fn\s/.test(parensFull)) {
        // Without this the next comparison reads as the option failing when the source is
        // what failed to compile.
        problems.push(
          `the parentheses source did not compile, so the option could not be checked:\n    ${parensFull.slice(0, 200)}`,
        );
      }
      await setOption(page, '[data-opt-parens]', 'minimal');
      const parensMinimal = await wgslPane(page);
      if (parensMinimal.length >= parensFull.length) {
        problems.push(
          `minimal parentheses dropped none: ${parensFull.length} to ${parensMinimal.length} characters`,
        );
      }
      await setOption(page, '[data-opt-parens]', 'full');

      // The number mode minify runs under, which is a control only while minify is on.
      if (await page.isVisible('[data-numbers-field]'))
        problems.push('the number literal mode is shown with minify off');
      await typeSource(page, LONG_LITERAL);
      const plainLiteral = await wgslPane(page);
      await setOption(page, '[data-opt-minify]', true);
      if (!(await page.isVisible('[data-numbers-field]')))
        problems.push('with minify on the number literal mode is still hidden');
      const canonical = await wgslPane(page);
      await setOption(page, '[data-opt-numbers]', 'f32');
      const asF32 = await wgslPane(page);
      await setOption(page, '[data-opt-numbers]', 'false');
      const asEmitted = await wgslPane(page);
      if (!canonical.includes('.30000001192092896'))
        problems.push(
          `the lossless number mode dropped a significand digit:\n    ${canonical.slice(0, 200)}`,
        );
      if (asF32.includes('.30000001192092896'))
        problems.push(
          `the f32 number mode left the literal spelled in full:\n    ${asF32.slice(0, 200)}`,
        );
      if (asF32.length >= canonical.length)
        problems.push(
          `the f32 number mode saved nothing: ${canonical.length} to ${asF32.length} characters`,
        );
      if (asEmitted.length <= canonical.length)
        problems.push(
          `leaving the literals alone spelled them shorter than the lossless mode: ${asEmitted.length} to ${canonical.length} characters`,
        );
      console.log(
        `  number literals: plain ${plainLiteral.length} B, true ${canonical.length} B, f32 ${asF32.length} B, false ${asEmitted.length} B`,
      );
      await setOption(page, '[data-opt-numbers]', 'true');
      await setOption(page, '[data-opt-minify]', false);

      // obfuscate(), the compiler's production preset: renamed identifiers over a compacted
      // text. It is a plugin array, so it reaches the same `plugins` field minify does.
      const named = await wgslPane(page);
      await setOption(page, '[data-opt-obfuscate]', true);
      const obfuscated = await wgslPane(page);
      if (obfuscated.includes('Clip'))
        problems.push(
          `obfuscate left the struct's authored name in the WGSL:\n    ${obfuscated.slice(0, 200)}`,
        );
      if (obfuscated.length >= named.length)
        problems.push(
          `obfuscate did not shrink the WGSL: ${named.length} to ${obfuscated.length} characters`,
        );
      console.log(`  obfuscate: ${named.length} B to ${obfuscated.length} B`);
      await setOption(page, '[data-opt-obfuscate]', false);

      // fp64Flavor, which goes to reflect() as well as to the emit. An f64 module lowered
      // with the float primitives binds an `_fp64` guard texture the integer ones never
      // read, so the flavour decides what a host has to bind and the reflection has to say
      // so. This is the one option whose effect is visible in two panels at once.
      await page.selectOption('[data-example]', 'fp64-lane-stripes');
      await page.waitForTimeout(AFTER_EDIT);
      const floatWgsl = await wgslPane(page);
      const floatReflection = await reflectionPane(page, 300);
      await setOption(page, '[data-opt-fp64]', 'integer');
      const integerWgsl = await wgslPane(page);
      const integerReflection = await reflectionPane(page, 300);
      if (floatWgsl === integerWgsl)
        problems.push('the f64 emulation flavour changed nothing in the WGSL of an f64 module');
      if (!floatReflection.includes('_fp64'))
        problems.push(
          `the float flavour's reflection does not report the _fp64 guard:\n    ${floatReflection.slice(0, 300)}`,
        );
      if (integerReflection.includes('_fp64'))
        problems.push(
          `the integer flavour's reflection still reports the _fp64 guard, which its helpers never read:\n    ${integerReflection.slice(0, 300)}`,
        );
      console.log(
        `  f64 flavour: WGSL ${floatWgsl.length} B float, ${integerWgsl.length} B integer; guard in the reflection ${floatReflection.includes('_fp64')} and ${integerReflection.includes('_fp64')}`,
      );
      await setOption(page, '[data-opt-fp64]', 'float');
      await page.selectOption('[data-example]', 'hello');
      await page.waitForTimeout(AFTER_EDIT);

      // ── the fullscreen vertex half ──────────────────────────────────────────────────────
      // A file with no @vertex entry is compiled behind the fullscreen triangle, the way
      // <LiveShader> compiles one, so a reader can write a fragment program alone and see
      // it cover the canvas. The compiler then answers about a text the editor does not
      // hold, and every line the page prints has to be the reader's own.
      // The example the options above left in the editor declares its own vertex half, so
      // it is what the last two steps of this block put back.
      const moduleShaped = await sourceOf(page);
      await typeSource(page, FRAGMENT_ONLY);
      if (!(await page.isVisible('[data-prelude-note]')))
        problems.push(
          'a file with no vertex entry does not say it was compiled behind the fullscreen triangle',
        );
      const preludeStatus = await page.textContent('[data-status]');
      const preludeDiagnostics = (await page.innerText('[data-diagnostics]')).trim();
      const preludeWgsl = await wgslPane(page);
      if (!/fn fullscreen/.test(preludeWgsl))
        problems.push(
          `the fullscreen vertex half did not reach the WGSL:\n    ${preludeWgsl.slice(0, 200)}`,
        );
      const preludeReflection = await reflectionPane(page, 300);
      if (!preludeReflection.includes('fullscreen'))
        problems.push(
          `the reflection does not name the fullscreen entry:\n    ${preludeReflection.slice(0, 200)}`,
        );
      await openTab(page, 'result');
      await settleResult(page);
      await page.waitForTimeout(600);
      const preludeDrawn = await canvasColours(page);
      const preludeBackend = await page.evaluate(
        () => document.querySelector('[data-gpu-canvas]')?.dataset.backend,
      );
      if (preludeBackend === 'none') problems.push('the fullscreen triangle reached no backend');
      if (preludeDrawn.colours < 2)
        problems.push(
          `the fullscreen triangle drew ${preludeDrawn.colours} colour(s), and it stripes the frame`,
        );
      console.log(
        `  fullscreen half: ${preludeStatus}, WGSL ${preludeWgsl.length} B, canvas on ${preludeBackend} in ${preludeDrawn.colours} colours`,
      );
      if (!/No diagnostics|진단 없음/.test(preludeDiagnostics))
        problems.push(
          `the fragment program did not compile clean:\n    ${preludeDiagnostics.slice(0, 200)}`,
        );

      // The prelude moves the reader's own lines down inside the compiled text, so every
      // line the page prints has to be moved back. The mistake is on the reader's line 9.
      await typeSource(page, FRAGMENT_ONLY.replace('fract(uv.x * 8.)', 'fract(uv.x * "eight")'));
      const shiftedRows = (await page.innerText('[data-diagnostics]')).trim().split('\n');
      const shiftedMarkers = await page.evaluate(() =>
        (window.monaco?.editor.getModelMarkers({}) ?? []).map((m) => m.startLineNumber),
      );
      if (!shiftedRows.some((row) => row.startsWith('9:')))
        problems.push(
          `the mistake on line 9 was not reported there:\n    ${shiftedRows.join('\n    ')}`,
        );
      if (shiftedMarkers.length === 0 || !shiftedMarkers.includes(9))
        problems.push(
          `the editor drew markers on lines ${shiftedMarkers.join(', ') || 'nothing'}, and the mistake is on line 9`,
        );
      if (shiftedMarkers.some((line) => line > FRAGMENT_ONLY.split('\n').length)) {
        problems.push(
          `a marker landed on line ${Math.max(...shiftedMarkers)}, past the ${FRAGMENT_ONLY.split('\n').length} lines the editor holds`,
        );
      }
      console.log(
        `  shifted lines: diagnostics ${shiftedRows.map((r) => r.split(' ')[0]).join(', ')}, markers ${shiftedMarkers.join(', ')}`,
      );

      // And hover answers about the reader's own line, which is the same shift the other way.
      await typeSource(page, FRAGMENT_ONLY);
      const preludeHover = await page.evaluate(async () => {
        const editor = window.monaco.editor.getEditors()[0];
        const lines = editor.getModel().getLinesContent();
        const at = lines.findIndex((line) => line.includes('const stripe'));
        editor.revealLineInCenter(at + 1);
        editor.setPosition({ lineNumber: at + 1, column: lines[at].indexOf('stripe') + 2 });
        editor.focus();
        editor.trigger('check', 'editor.action.showHover', null);
        await new Promise((done) => setTimeout(done, 900));
        return {
          line: at + 1,
          text: (document.querySelector('.monaco-hover')?.innerText ?? '')
            .replace(/\s+/g, ' ')
            .trim(),
        };
      });
      if (!preludeHover.text.includes('f32'))
        problems.push(
          `hover on the reader's own line ${preludeHover.line} answered "${preludeHover.text}", and the local is an f32`,
        );
      console.log(
        `  hover past the prelude: line ${preludeHover.line} is ${preludeHover.text.slice(0, 40)}`,
      );
      await page.keyboard.press('Escape');

      // A file that declares its own vertex half is compiled as written.
      await typeSource(page, moduleShaped);
      if (await page.isVisible('[data-prelude-note]'))
        problems.push(
          'a file with its own vertex entry says it was compiled behind the fullscreen triangle',
        );
      if (/fn fullscreen/.test(await wgslPane(page)))
        problems.push(
          'a file with its own vertex entry was compiled behind the fullscreen triangle anyway',
        );
      // And one with no directive still gets the page's own sentence about the directive,
      // which supplying a directive for the reader would hide.
      await typeSource(page, 'class Color {\n  @location(0) color: vec4\n}\n');
      const noDirective = (await page.innerText('[data-diagnostics]')).trim();
      if (!/use typeshade/.test(noDirective))
        problems.push(
          `a file with no directive was not told so:\n    ${noDirective.slice(0, 160)}`,
        );
      await typeSource(page, moduleShaped);
      await openTab(page, 'result');

      // ── dark mode reaches inside the editor ─────────────────────────────────────────────
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'dark';
      });
      await page.waitForTimeout(400);
      const editorBackground = await page.evaluate(() => {
        const node =
          document.querySelector('.monaco-editor .monaco-editor-background') ??
          document.querySelector('.monaco-editor');
        return node ? getComputedStyle(node).backgroundColor : '';
      });
      if (brightness(editorBackground) > 90)
        problems.push(`in dark mode the editor background is ${editorBackground}`);
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'light';
      });
      await page.waitForTimeout(200);

      // ── the example picker ──────────────────────────────────────────────────────────────
      await page.selectOption('[data-example]', 'hello-vsout');
      await page.waitForTimeout(AFTER_EDIT);
      const picked = await sourceOf(page);
      if (!picked.includes('VsOut'))
        problems.push(
          `choosing hello-vsout left the editor holding something else:\n    ${picked.slice(0, 160)}`,
        );
      await page.selectOption('[data-example]', 'hello');
      await page.waitForTimeout(AFTER_EDIT);
      const sample = await sourceOf(page);

      // ── a vector times a scalar ─────────────────────────────────────────────────────────
      // typeshade/typeshade#19 broadcasts a vector against a scalar, so `vec4(…) * 2.` is a
      // rule the compiler has. It reported an error here until this pin, which is half of
      // what the Playground was reported broken for, so what is checked is the whole way
      // through: the language service says nothing, and the scalar reaches the emitted
      // multiply instead of the edit being dropped on the floor.
      await typeSource(
        page,
        sample.replace('vec4(1., 0., 0., 1.) }', 'vec4(1., 0., 0., 1.) * 2. }'),
      );
      const rows = await page.$$eval('[data-diagnostics] li button', (list) =>
        list.map((row) => row.innerText.trim()),
      );
      if (rows.length > 0)
        problems.push(
          `a vector times a scalar reported ${rows.length} diagnostic(s):\n    ${rows.join('\n    ')}`,
        );
      const broadcast = await wgslPane(page);
      if (!/@vertex|@fragment|fn\s/.test(broadcast)) {
        problems.push(
          `a vector times a scalar left the WGSL pane without WGSL:\n    ${broadcast.slice(0, 200)}`,
        );
      } else if (!/vec4<f32>\(1\.0, 0\.0, 0\.0, 1\.0\) \* 2\.0/.test(broadcast)) {
        problems.push(
          `the broadcast did not reach the emitted WGSL:\n    ${broadcast.slice(-200)}`,
        );
      }

      // ── a vector times a string ─────────────────────────────────────────────────────────
      // The filter typeshade/typeshade#39 added drops TS2362, TS2363, TS2365 and TS2322 where
      // a vector or a matrix is an operand, because TypeScript's arithmetic rules are not the
      // compiler's there. This says how far the filter reaches: the right-hand side is a
      // string, which neither language has a rule for, so TypeScript's own arithmetic
      // diagnostic has to survive the filter and reach the reader. Without a case like this
      // one, a later pin that widened the filter would leave the page silent on a real error
      // and still pass here, since every other source this file refuses fails to parse.
      await typeSource(
        page,
        sample.replace('vec4(1., 0., 0., 1.) }', 'vec4(1., 0., 0., 1.) * "x" }'),
      );
      const refused = await page.$$eval('[data-diagnostics] li button', (list) =>
        list.map((row) => row.innerText.trim()),
      );
      if (!refused.some((row) => row.includes('arithmetic operation'))) {
        problems.push(
          `a vector times a string drew no arithmetic diagnostic, so the filter on vector arithmetic is swallowing real errors:\n    ${refused.join('\n    ') || '(no diagnostics at all)'}`,
        );
      }
      const refusedPane = await wgslPane(page);
      if (/@vertex|@fragment|fn\s/.test(refusedPane)) {
        problems.push(
          `a vector times a string still filled the WGSL pane:\n    ${refusedPane.slice(0, 160)}`,
        );
      }

      // ── an unclosed call ────────────────────────────────────────────────────────────────
      // The compiler reports this as a parse error now (TS8030) and emits nothing for the
      // file, where it used to report a return-type mismatch and emit WGSL anyway. It is the
      // one source here that does not parse, and it carries what the vector check used to
      // hold before a vector times a scalar started compiling: a row a reader can click,
      // which is a row that carries a position.
      await typeSource(
        page,
        sample.replace('return { color: vec4(1., 0., 0., 1.) }', 'return vec4(3.14'),
      );
      const parseRows = await page.$$eval('[data-diagnostics] li button', (list) =>
        list.map((row) => row.innerText.trim()),
      );
      if (parseRows.length === 0) problems.push('an unclosed call reported no diagnostic');
      else if (!/^\d+:\d+\s/.test(parseRows[0]))
        problems.push(`a diagnostic row carries no position: ${parseRows[0]}`);
      const afterParse = await wgslPane(page);
      if (/@vertex|@fragment|fn\s/.test(afterParse)) {
        problems.push(
          `an unclosed call still filled the WGSL pane:\n    ${afterParse.slice(0, 160)}`,
        );
      }

      // ── the compute example ─────────────────────────────────────────────────────────────
      // The language service used to report TS2542 on this example's `output[idx] = sum`,
      // because the ambient `array<T>` index signature was read-only while a storage binding
      // the shader writes is writable in TypeShade. typeshade/typeshade#39 drops the readonly,
      // so the example is clean, which is the other half of what the Playground was reported
      // broken for. The store is followed all the way into the WGSL so a service that goes
      // quiet by dropping the assignment would still fail here. GLSL ES 3.00 has no compute
      // stage, so its tabs say the module has none instead of holding a shader.
      await page.selectOption('[data-example]', 'compute-reduction-twin');
      await page.waitForTimeout(AFTER_EDIT);
      const computeRows = await page.$$eval('[data-diagnostics] li button', (list) =>
        list.map((row) => row.innerText.trim()),
      );
      if (computeRows.length > 0) {
        problems.push(
          `the compute example reported ${computeRows.length} diagnostic(s):\n    ${computeRows.join('\n    ')}`,
        );
      }
      const computeWgsl = await wgslPane(page);
      for (const wanted of [
        '@compute @workgroup_size(64)',
        'fn reduce_windows',
        'output[idx] = sum;',
      ]) {
        if (!computeWgsl.includes(wanted)) {
          problems.push(
            `the compute example's WGSL is missing ${wanted}:\n    ${computeWgsl.slice(0, 300)}`,
          );
        }
      }
      const computeReflection = await reflectionPane(page);
      if (!computeReflection.includes('@compute')) {
        problems.push(
          `the reflection pane does not name the compute entry point:\n    ${computeReflection.slice(0, 240)}`,
        );
      }
      // The sentence is translated, so it is read back out of the copy the component wrote
      // into the page and the tab has to hold that and nothing else. Asking instead whether
      // the tab held no shader passed on the WGSL tab too, so the check could not tell which
      // tab it had read: clicking the wrong one still passed.
      const noGlsl = await page.evaluate(
        () => JSON.parse(document.querySelector('[data-playground]').dataset.copy).noGlsl,
      );
      for (const tab of ['glslVertex', 'glslFragment']) {
        await page.click(`[data-target="${tab}"]`);
        await page.waitForTimeout(250);
        const glsl = (await page.innerText('[data-output]')).trim();
        if (glsl !== noGlsl)
          problems.push(
            `the ${tab} tab does not say a compute module has no GLSL stage:\n    ${glsl.slice(0, 160)}`,
          );
      }
      await page.click('[data-target="wgsl"]');
      await page.waitForTimeout(250);
      await page.selectOption('[data-example]', 'hello');
      await page.waitForTimeout(AFTER_EDIT);

      // ── hover ───────────────────────────────────────────────────────────────────────────
      // The service had no answer for a name the source declares when the Playground shipped,
      // so this check waited for it. What it is asked about is the entry point's parameter,
      // where its answer is its own: the shim the page hands Monaco declares `u32` as
      // `number`, so Monaco's own TypeScript hover says `(parameter) i: number` and the
      // compiler's says `(parameter) i: u32`. Asking about `vs` proved less, since both spell
      // its signature `vs(i: u32): Clip` and either one satisfied the check.
      // Monaco's hover provider is off, and the page's is the one answering, so the widget
      // holds one answer: the compiler's, alone. Both halves are read here, the compiler's
      // line present and Monaco's `number` absent, and the rows counted, since a stacked
      // widget is the bug this replaced.
      await typeSource(page, sample);
      const hovered = await page.evaluate(async () => {
        const editor = window.monaco.editor.getEditors()[0];
        const model = editor.getModel();
        const at = model
          .getLinesContent()
          .findIndex((line) => line.includes('export function vs('));
        if (at < 0) return null;
        const declared = model.getLineContent(at + 1).indexOf('i: u32');
        if (declared < 0) return null;
        // On the name itself, where a reader's pointer is; one column past it is the `:`, and
        // typeshade/typeshade#56 records that a position past a name's end falls back to
        // TypeScript's quick info, which is not what this asks about.
        editor.setPosition({ lineNumber: at + 1, column: declared + 1 });
        editor.focus();
        await editor.getAction('editor.action.showHover')?.run();
        return true;
      });
      if (hovered === null)
        problems.push(
          'the sample no longer declares vs(i: u32), so hover had nothing to ask about',
        );
      else {
        await page.waitForSelector('.monaco-hover', { timeout: 4_000 }).catch(() => {});
        const quickInfo = await page.evaluate(
          () =>
            document.querySelector('.monaco-hover')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
        );
        const hoverRows = await page.evaluate(
          () => document.querySelectorAll('.monaco-hover .hover-row').length,
        );
        if (!quickInfo.includes('i: u32')) {
          problems.push(
            `hovering the parameter did not answer with its TypeShade type:\n    ${quickInfo.slice(0, 200)}`,
          );
        }
        if (quickInfo.includes('i: number')) {
          problems.push(
            `hovering the parameter stacks Monaco's own TypeScript answer beside the compiler's:\n    ${quickInfo.slice(0, 200)}`,
          );
        }
        if (hoverRows !== 1)
          problems.push(`the hover widget holds ${hoverRows} answer(s) for the parameter, not one`);
        await page.keyboard.press('Escape');
      }

      // ── hover over a local ──────────────────────────────────────────────────────────────
      // The other half of what the Playground was reported for: `let x = 1.` hovered as plain
      // `number`. The ambient GPU scalars brand `number` optionally, so TypeScript infers
      // `number` for a local bound to a numeric literal where the front end lowered an `f32`,
      // and the editor showed the inference. typeshade/typeshade#51 answers every name the
      // document declares off the compiler's own symbol table instead, so the local now hovers
      // as `let k: f32`. The check above asks about a parameter, which carries a written
      // annotation TypeScript could read on its own. A literal-bound local carries none, so
      // `f32` here can only have come from the compiler.
      // Monaco's provider is off, so the widget holds the compiler's line and nothing else:
      // the `number` it used to stack beside it is asserted absent, and the rows counted.
      const withLocal = sample
        .replace('let x = -0.8', 'let k = 1.\n  let x = -0.8')
        .replace('vec4(x, y, 0., 1.)', 'vec4(x, y, 0., k)');
      if (!withLocal.includes('let k = 1.') || !withLocal.includes('vec4(x, y, 0., k)')) {
        problems.push(
          'the sample no longer has the vertex entry this check adds a local to, so hover had no local to ask about',
        );
      } else {
        await typeSource(page, withLocal);
        // The type comes off the front end's own run, so a source it refused would fall back
        // to TypeScript and hover `number` for a reason that is not the service's fault.
        const localRows = await page.$$eval('[data-diagnostics] li button', (list) =>
          list.map((row) => row.innerText.trim()),
        );
        if (localRows.length > 0) {
          problems.push(
            `declaring a local reported ${localRows.length} diagnostic(s):\n    ${localRows.join('\n    ')}`,
          );
        }
        const hoveredLocal = await page.evaluate(async () => {
          const editor = window.monaco.editor.getEditors()[0];
          const model = editor.getModel();
          const at = model.getLinesContent().findIndex((line) => line.includes('let k = 1.'));
          if (at < 0) return null;
          const declared = model.getLineContent(at + 1).indexOf('k = 1.');
          if (declared < 0) return null;
          // On the name itself, where a reader's pointer is. One column further is the space
          // after it, and the compiler answers a position that lands on whitespace from
          // TypeScript's quick info, which is the `number` this check exists to refuse. The
          // parameter above survives that column only because the next character there is `:`.
          editor.setPosition({ lineNumber: at + 1, column: declared + 1 });
          editor.focus();
          await editor.getAction('editor.action.showHover')?.run();
          return true;
        });
        if (hoveredLocal === null)
          problems.push('the editor is not holding the local this check declared');
        else {
          await page.waitForSelector('.monaco-hover', { timeout: 4_000 }).catch(() => {});
          const localInfo = await page.evaluate(
            () =>
              document.querySelector('.monaco-hover')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
          );
          const localRowsShown = await page.evaluate(
            () => document.querySelectorAll('.monaco-hover .hover-row').length,
          );
          if (!localInfo.includes('k: f32')) {
            problems.push(
              `hovering a local bound to a numeric literal did not answer with f32:\n    ${localInfo.slice(0, 200)}`,
            );
          }
          if (localInfo.includes('k: number')) {
            problems.push(
              `hovering the local stacks Monaco's own \`number\` beside the compiler's f32:\n    ${localInfo.slice(0, 200)}`,
            );
          }
          if (localRowsShown !== 1)
            problems.push(
              `the hover widget holds ${localRowsShown} answer(s) for the local, not one`,
            );
          await page.keyboard.press('Escape');
        }
        await typeSource(page, sample);
      }

      // ── completion ──────────────────────────────────────────────────────────────────────
      await page.evaluate(() => {
        const editor = window.monaco.editor.getEditors()[0];
        const at = editor
          .getModel()
          .getLinesContent()
          .findIndex((line) => line.includes('return { color:'));
        editor.setPosition({ lineNumber: at + 1, column: 1 });
        editor.focus();
      });
      await page.keyboard.type('vec');
      try {
        await page.waitForSelector('.suggest-widget.visible', { timeout: 2_000 });
      } catch {
        // quickSuggestions has its own timing, so the list is asked for outright.
        await page.keyboard.press('Control+Space');
        await page.waitForSelector('.suggest-widget.visible', { timeout: 4_000 }).catch(() => {});
      }
      const suggestions = await page.evaluate(
        () => document.querySelector('.suggest-widget')?.innerText ?? '',
      );
      if (!suggestions.includes('vec4'))
        problems.push(
          `after "vec" the completion list does not offer vec4:\n    ${suggestions.slice(0, 200).replace(/\n/g, ' / ')}`,
        );
      await page.keyboard.press('Escape');

      // ── definition ──────────────────────────────────────────────────────────────────────
      // The struct a function returns is declared above it. Going to its definition from the
      // return type has to land on the declaration, and the answer is the service's alone:
      // Monaco's own definition provider is off.
      await typeSource(page, sample);
      const jumped = await page.evaluate(async () => {
        const editor = window.monaco.editor.getEditors()[0];
        const lines = editor.getModel().getLinesContent();
        const declaredAt = lines.findIndex((line) => /^class (\w+)/.test(line));
        if (declaredAt < 0) return null;
        const name = lines[declaredAt].match(/^class (\w+)/)[1];
        const usedAt = lines.findIndex(
          (line, index) => index !== declaredAt && line.includes(`): ${name}`),
        );
        if (usedAt < 0) return null;
        editor.setPosition({
          lineNumber: usedAt + 1,
          column: lines[usedAt].indexOf(`): ${name}`) + '): '.length + 2,
        });
        editor.focus();
        // Go to definition is registered as a command and not an editor action in this
        // Monaco, so `getAction` does not see it; `trigger` dispatches it through the
        // command service, which does.
        editor.trigger('check', 'editor.action.revealDefinition', null);
        await new Promise((done) => setTimeout(done, 1_000));
        return {
          name,
          declaredAt: declaredAt + 1,
          usedAt: usedAt + 1,
          landed: editor.getPosition().lineNumber,
        };
      });
      if (!jumped)
        problems.push(
          'the sample has no struct a function returns, so definition had nothing to ask about',
        );
      else if (jumped.landed !== jumped.declaredAt) {
        problems.push(
          `go to definition on ${jumped.name} at line ${jumped.usedAt} landed on line ${jumped.landed}, not its declaration at line ${jumped.declaredAt}`,
        );
      }
      console.log(
        `  definition: ${jumped?.name} from line ${jumped?.usedAt} to line ${jumped?.landed}`,
      );

      // ── references ──────────────────────────────────────────────────────────────────────
      // Every place the struct is named, asked from its declaration. Monaco peeks when there
      // is more than one, and the rows in the peek are the service's locations.
      const referenced = await page.evaluate(async () => {
        const editor = window.monaco.editor.getEditors()[0];
        const lines = editor.getModel().getLinesContent();
        const declaredAt = lines.findIndex((line) => /^class (\w+)/.test(line));
        if (declaredAt < 0) return null;
        editor.setPosition({ lineNumber: declaredAt + 1, column: 'class '.length + 2 });
        editor.focus();
        // The peek command, dispatched the same way, so the widget is what opens.
        editor.trigger('check', 'editor.action.referenceSearch.trigger', null);
        await new Promise((done) => setTimeout(done, 1_200));
        return {
          widget: Boolean(document.querySelector('.reference-zone-widget')),
          rows: document.querySelectorAll('.reference-zone-widget .monaco-list-row').length,
        };
      });
      if (!referenced)
        problems.push('the sample declares no struct, so references had nothing to ask about');
      else if (!referenced.widget || referenced.rows < 2) {
        problems.push(
          `references on the struct showed ${referenced.rows} row(s) in ${referenced.widget ? 'the peek widget' : 'no widget'}; its declaration and a use were expected`,
        );
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      console.log(`  references: ${referenced?.rows} row(s) in the peek`);

      // ── outline ─────────────────────────────────────────────────────────────────────────
      const outline = await page.evaluate(async () => {
        const editor = window.monaco.editor.getEditors()[0];
        editor.focus();
        const action = editor.getAction('editor.action.quickOutline');
        if (!action) return null;
        await action.run();
        await new Promise((done) => setTimeout(done, 800));
        return [...document.querySelectorAll('.quick-input-widget .monaco-list-row')].map((row) =>
          row.innerText.replace(/\s+/g, ' ').trim(),
        );
      });
      if (!outline) problems.push('Monaco has no quick outline action');
      else {
        const missing = ['vs', 'fs'].filter(
          (name) => !outline.some((row) => new RegExp(`\\b${name}\\b`).test(row)),
        );
        if (outline.length === 0 || missing.length > 0)
          problems.push(
            `the outline is missing ${missing.join(', ') || 'everything'}:\n    ${outline.join('\n    ')}`,
          );
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      console.log(`  outline: ${outline?.length} row(s)`);

      // ── signature help ──────────────────────────────────────────────────────────────────
      const hinted = await page.evaluate(async () => {
        const editor = window.monaco.editor.getEditors()[0];
        const lines = editor.getModel().getLinesContent();
        const at = lines.findIndex((line) => line.includes('vec4('));
        if (at < 0) return null;
        // Monaco anchors this widget to the line, and places none for a line out of view, so
        // the line is revealed first: the subject here is the answer, not the scroll position.
        editor.revealLineInCenter(at + 1);
        editor.setPosition({
          lineNumber: at + 1,
          column: lines[at].indexOf('vec4(') + 'vec4('.length + 1,
        });
        editor.focus();
        const action = editor.getAction('editor.action.triggerParameterHints');
        if (!action) return { noAction: true };
        await action.run();
        await new Promise((done) => setTimeout(done, 800));
        return {
          text:
            document
              .querySelector('.parameter-hints-widget')
              ?.innerText.replace(/\s+/g, ' ')
              .trim() ?? '',
        };
      });
      if (!hinted)
        problems.push('the sample calls no vec4, so signature help had nothing to ask about');
      else if (hinted.noAction) problems.push('Monaco has no parameter hints action');
      else if (!hinted.text.includes('vec4'))
        problems.push(
          `signature help inside vec4( did not name vec4:\n    ${hinted.text.slice(0, 200)}`,
        );
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      console.log(`  signature help: ${(hinted?.text ?? '').slice(0, 60)}`);

      // ── rename ──────────────────────────────────────────────────────────────────────────
      // Every occurrence of the struct's name and nothing else: the count of the new name
      // afterwards is the count of the old one before, and the old one is gone.
      const renamed = await page.evaluate(async () => {
        const editor = window.monaco.editor.getEditors()[0];
        const model = editor.getModel();
        const lines = model.getLinesContent();
        const declaredAt = lines.findIndex((line) => /^class (\w+)/.test(line));
        if (declaredAt < 0) return null;
        const name = lines[declaredAt].match(/^class (\w+)/)[1];
        const before = (model.getValue().match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
        editor.setPosition({ lineNumber: declaredAt + 1, column: 'class '.length + 2 });
        editor.focus();
        const action = editor.getAction('editor.action.rename');
        if (!action) return { noAction: true };
        void action.run();
        await new Promise((done) => setTimeout(done, 1_000));
        return { name, before, box: Boolean(document.querySelector('.rename-box input')) };
      });
      if (!renamed)
        problems.push('the sample declares no struct, so rename had nothing to ask about');
      else if (renamed.noAction) problems.push('Monaco has no rename action');
      else if (!renamed.box) problems.push(`rename on ${renamed.name} opened no rename box`);
      else {
        await page.keyboard.press('Control+A');
        await page.keyboard.type('Renamed');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1_000);
        const after = await page.evaluate((name) => {
          const text = window.monaco.editor.getModels()[0].getValue();
          return {
            old: (text.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length,
            fresh: (text.match(/\bRenamed\b/g) ?? []).length,
          };
        }, renamed.name);
        if (after.old !== 0 || after.fresh !== renamed.before) {
          problems.push(
            `renaming ${renamed.name} (${renamed.before} occurrence(s)) left ${after.old} of the old name and wrote ${after.fresh} of the new`,
          );
        }
        console.log(
          `  rename: ${renamed.name} to Renamed, ${after.fresh} of ${renamed.before} occurrence(s)`,
        );
      }
      await typeSource(page, sample);

      // ── semantic tokens ─────────────────────────────────────────────────────────────────
      // The colouring is the compiler's classification, drawn over Monaco's tokenizer. Its
      // tokenizer alone gives `@vertex` an annotation's class and `u32` an identifier's, the
      // same as the parameter `i`; the compiler's tokens give the decorator and the GPU type
      // classes of their own, so each has to differ from a plain identifier's.
      const coloured = await page.evaluate(async () => {
        await new Promise((done) => setTimeout(done, 1_200));
        const spans = [...document.querySelectorAll('.monaco-editor .view-line > span > span')];
        const classOf = (text) =>
          spans.find((span) => span.textContent.trim() === text)?.className ?? '';
        return {
          decorator: classOf('@vertex') || classOf('vertex'),
          gpuType: classOf('u32'),
          parameter: classOf('i'),
        };
      });
      if (!coloured.decorator)
        problems.push('the rendered lines hold no span for the @vertex decorator');
      if (!coloured.gpuType) problems.push('the rendered lines hold no span for the u32 type');
      if (!coloured.parameter) problems.push('the rendered lines hold no span for the parameter i');
      if (coloured.gpuType && coloured.parameter && coloured.gpuType === coloured.parameter) {
        problems.push(
          `the GPU type u32 draws with the parameter's class (${coloured.parameter}): the semantic tokens are not reaching the editor`,
        );
      }
      if (coloured.decorator && coloured.parameter && coloured.decorator === coloured.parameter) {
        problems.push(`the decorator draws with the parameter's class (${coloured.parameter})`);
      }
      console.log(
        `  semantic tokens: decorator ${coloured.decorator}, u32 ${coloured.gpuType}, parameter ${coloured.parameter}`,
      );

      // ── the compiler is in the worker ───────────────────────────────────────────────────
      // The resource timeline says what the page loaded: a language worker script, and a page
      // module a fraction of the size it was when it carried the compiler.
      const loaded = await page.evaluate(() => {
        const scripts = performance
          .getEntriesByType('resource')
          .filter((entry) => /\.js(\?|$)/.test(entry.name));
        const worker = scripts.find((entry) => /playground-language-worker/.test(entry.name));
        const main = scripts.find((entry) =>
          /Playground\.astro_astro_type_script/.test(entry.name),
        );
        const kb = (entry) => (entry ? Math.round(entry.decodedBodySize / 1024) : null);
        return { worker: kb(worker), main: kb(main) };
      });
      if (loaded.worker === null)
        problems.push(
          'no language worker script was fetched: the service is not running in a worker',
        );
      if (loaded.main === null) problems.push('the page module is not in the resource timeline');
      else if (loaded.main > 1024)
        problems.push(`the page module is ${loaded.main} KB: the compiler is still in it`);
      console.log(
        `  chunks: page module ${loaded.main} KB, language worker ${loaded.worker} KB, raw`,
      );

      // ── the source in the URL ───────────────────────────────────────────────────────────
      const edited = sample.replace('vec4(1., 0., 0., 1.)', 'vec4(0.25, 0.5, 0.75, 1.)');
      await typeSource(page, edited);
      await setOption(page, '[data-opt-level]', 'O0');
      await setOption(page, '[data-opt-minify]', true);
      const shared = page.url();
      if (!shared.includes('#code=')) {
        problems.push(`editing the source did not put it in the URL: ${shared}`);
      } else {
        const second = await openPage(browser);
        try {
          await second.page.goto(shared, { waitUntil: 'load' });
          await second.page.waitForSelector('.monaco-editor', { timeout: EDITOR_TIMEOUT });
          const restored = await sourceOf(second.page);
          if (restored.trim() !== edited.trim())
            problems.push(
              `the shared link opened a different source:\n    ${restored.slice(0, 160)}`,
            );
          // And the bar it was shared under, so the link shows what the sender saw.
          const reopened = await second.page.evaluate(() => ({
            level: document.querySelector('[data-opt-level]')?.value,
            minify: document.querySelector('[data-opt-minify]')?.checked,
          }));
          if (reopened.level !== 'O0' || reopened.minify !== true) {
            problems.push(
              `the shared link lost the emit options: level ${reopened.level}, minify ${reopened.minify}`,
            );
          }
          pageErrors.push(...second.pageErrors);
        } finally {
          await second.page.close();
        }
      }
      console.log(
        `  emit options: O2 ${atO2.length} B, O0 ${atO0.length} B, minified ${minified.length} B, parens ${parensFull.length} to ${parensMinimal.length} B`,
      );
      console.log(`  link: ${shared.length} characters`);
      await setOption(page, '[data-opt-level]', 'O2');
      await setOption(page, '[data-opt-minify]', false);

      const status = (await page.textContent('[data-status]'))?.trim() ?? '';
      const diagnostics = (await page.textContent('[data-diagnostics]'))?.trim() ?? '';
      console.log(`  status: ${status}`);
      console.log(`  diagnostics: ${diagnostics}`);
      console.log(
        `  WGSL: ${output.split('\n').length} lines, ${output.length} characters, ${colours} colours`,
      );
      console.log(
        `  reflection: ${(reflection.match(/@(?:vertex|fragment|compute)/g) ?? []).length} entry point(s), evaluated on the CPU`,
      );

      // ── every example in the picker, drawn ────────────────────────────────────────────
      // "The examples run in the Playground" was a claim nobody could check without driving
      // a browser by hand, which is how it went two hours without a straight answer. This
      // is that answer, as a number the build defends. The corpus is one list and the same
      // list in both languages, so it is walked once, on the source locale; the Korean
      // route runs every other step.
      if (route === ROUTES[0]) {
        await openTab(page, 'result');
        const every = await page.evaluate(() =>
          [...document.querySelectorAll('[data-example] option')].map((o) => o.value),
        );
        if (every.length === 0) problems.push('the example picker offers nothing to draw');
        const ids = every.filter((_, i) => i % SHARD_N === SHARD_K - 1);
        const drawn = [];
        for (const id of ids) {
          // The compile is debounced, so the canvas holds the example before this one until
          // it lands. The wait is on the frame's own mark of which version it shows, so a
          // fast example is never photographed as its predecessor.
          try {
            await pickExample(page, id);
          } catch {
            problems.push(
              `'${id}' never settled: the Result tab neither drew a frame nor said why not`,
            );
          }
          const seen = await canvasColours(page);
          const state = await page.evaluate(() => ({
            backend: document.querySelector('[data-gpu-canvas]')?.dataset.backend ?? 'none',
            plotted: document.querySelector('[data-gpu-canvas]')?.dataset.plotted === '1',
            note: (document.querySelector('[data-gpu-note]')?.textContent ?? '').trim(),
            status: (document.querySelector('[data-status]')?.textContent ?? '').trim(),
            errors:
              document.querySelector('[data-playground]')?.classList.contains('has-errors') ??
              false,
            first: (document.querySelector('[data-diagnostics] li')?.textContent ?? '')
              .replace(/\s+/g, ' ')
              .trim(),
          }));
          drawn.push({ id, ...state, ...seen });
        }
        if (SHARDED) {
          tally.drawn.push(...drawn);
          console.log(`  examples, part ${SHARD_K} of ${SHARD_N}: ${drawn.length} drawn`);
        } else walkFloors(drawn, problems);
        // Every example in the picker is a program the compiler and the editor both accept,
        // so none opens with an error. The counts above cannot see this for a compute kernel,
        // which paints nothing either way: four of them opened with TypeScript's TS2454 on
        // their workgroup memory, because the language service ran on this site's TypeScript
        // 5.9 and the compiler's own tests run 5.6 (typeshade/typeshade#247).
        const errored = drawn.filter((row) => row.errors);
        console.log(`  errors: ${errored.length} of ${drawn.length} examples open with one`);
        if (errored.length > 0) {
          problems.push(
            `${errored.length} example(s) open with an error, and every example in the picker is a program the compiler accepts: ${errored.map((row) => `${row.id} (${row.first})`).join('; ')}`,
          );
        }

        if (RUNS_REST) {
          // And the thing the maintainer actually asked for: that an example on the page is
          // editable. A build that compiles is not evidence; a keystroke that reaches the
          // emitted text and the frame is. `plasma-twin` is a fullscreen pass whose look
          // follows its own arithmetic, so an edit to it has to move both.
          await pickExample(page, 'plasma-twin');
          await page.waitForTimeout(AFTER_EDIT);
          const beforeFrame = await canvasColours(page);
          const beforeWgsl = await wgslPane(page);
          await openTab(page, 'result');
          const edited = await page.evaluate(() => {
            const model = window.monaco.editor.getModels()[0];
            // One number in the pass: the wave count the three sines run at, which is an edit
            // a reader could make by eye and see in the picture.
            const next = model.getValue().replaceAll('* 10. +', '* 3. +');
            const changed = next !== model.getValue();
            model.setValue(next);
            return changed;
          });
          if (!edited)
            problems.push(
              'the edit the check types found nothing to replace in plasma-twin, so it proved nothing',
            );
          await page.waitForTimeout(AFTER_EDIT);
          await settleResult(page);
          const afterWgsl = await wgslPane(page);
          await openTab(page, 'result');
          await page.waitForTimeout(600);
          const afterFrame = await canvasColours(page);
          if (afterWgsl === beforeWgsl)
            problems.push('typing into the editor did not change the emitted WGSL');
          if (
            afterFrame.colours === beforeFrame.colours &&
            afterFrame.opaque === beforeFrame.opaque
          ) {
            problems.push(
              `typing into the editor did not repaint the canvas: ${beforeFrame.colours} colours before and after`,
            );
          }
          console.log(
            `  an edit reaches the output: WGSL ${beforeWgsl.length} B to ${afterWgsl.length} B, canvas ${beforeFrame.colours} colours to ${afterFrame.colours}`,
          );
        }

        await checkEnginesAgree(
          page,
          problems,
          drawn
            .filter((row) => row.colours > 1 && row.backend !== 'none' && !row.plotted)
            .map((row) => row.id),
        );
        if (RUNS_REST) {
          await checkBackends(page, problems);
          await checkBindings(page, problems);
          await checkUniformBlocks(page, problems);
          await checkNestedUniform(page, problems);
          await checkStorageTextures(page, problems);
          await checkConsole(page, problems);
          await checkPixelConsole(page, problems);
          await checkFrameConsole(page, problems);
        }
        await pickExample(page, 'hello');
      }
    }

    const realErrors = pageErrors;
    if (realErrors.length > 0)
      problems.push(
        `the page threw ${realErrors.length} uncaught error(s):\n    ${realErrors.join('\n    ')}`,
      );

    // A failure that is only the CDN leaves the page's own script clean.
    cdnOnly = problems.length > 0 && realErrors.length === 0 && cdnFailures.length > 0 && !mounted;
  } finally {
    await page.close();
  }
  return { route, problems, cdnFailures, cdnOnly };
}

// The example page that carries the tool seeded with its own file. `plasma-twin` is a
// fullscreen pass whose picture follows its own arithmetic, so an edit to it moves the frame.
const SEEDED_ROUTE = '/guide/examples/plasma-twin/';

/** The Playground on an example's own page, which is what "the examples are editable" means.
 *  The page names the example, so there is no picker and the editor opens on that file. The
 *  tool is inside a documentation column here and on a page of its own everywhere else, so
 *  the edit is typed again on this route instead of taken on trust. */
async function checkSeeded(browser, origin) {
  const { page, pageErrors, cdnFailures } = await openPage(browser);
  const problems = [];
  let cdnOnly = false;
  let mounted = true;
  try {
    await page.goto(`${origin}${SEEDED_ROUTE}`, { waitUntil: 'load' });
    try {
      await page.waitForSelector('.monaco-editor', { timeout: EDITOR_TIMEOUT });
    } catch {
      mounted = false;
      problems.push('the editor did not mount on the example page: no .monaco-editor appeared');
    }

    if (mounted) {
      await page.waitForTimeout(AFTER_EDIT);
      if (await page.isVisible('[data-example]')) {
        problems.push(
          'the example page carries the example picker, and the page already names the example',
        );
      }
      const seeded = await sourceOf(page);
      if (!seeded.includes('use typeshade')) {
        problems.push(
          `the editor on the example page does not hold a "use typeshade" file:\n    ${seeded.slice(0, 200)}`,
        );
      }
      await openTab(page, 'result');
      try {
        await settleResult(page);
      } catch {
        problems.push(
          'the example page never settled: the Result tab neither drew a frame nor said why not',
        );
      }
      const before = await canvasColours(page);
      const beforeWgsl = await wgslPane(page);
      await openTab(page, 'result');
      const edited = await page.evaluate(() => {
        const model = window.monaco.editor.getModels()[0];
        const next = model.getValue().replaceAll('* 10. +', '* 3. +');
        const changed = next !== model.getValue();
        model.setValue(next);
        return changed;
      });
      if (!edited)
        problems.push(
          'the edit the check types found nothing to replace on the example page, so it proved nothing',
        );
      await page.waitForTimeout(AFTER_EDIT);
      try {
        await settleResult(page);
      } catch {
        problems.push('the example page did not settle after an edit');
      }
      const afterWgsl = await wgslPane(page);
      await openTab(page, 'result');
      await page.waitForTimeout(600);
      const after = await canvasColours(page);
      const status = (await page.textContent('[data-status]'))?.trim() ?? '';
      if (afterWgsl === beforeWgsl)
        problems.push("typing into the example page's editor did not change the emitted WGSL");
      if (after.colours === before.colours && after.opaque === before.opaque) {
        problems.push(
          `typing into the example page's editor did not repaint the canvas: ${before.colours} colours before and after`,
        );
      }
      console.log(`  seeded with ${seeded.length} B, ${status}`);
      console.log(
        `  an edit reaches the output: WGSL ${beforeWgsl.length} B to ${afterWgsl.length} B, canvas ${before.colours} colours to ${after.colours}`,
      );
    }

    const realErrors = pageErrors.filter((message) => !/ResizeObserver|Canceled/.test(message));
    for (const message of realErrors) problems.push(`the page threw: ${message}`);
    cdnOnly = problems.length > 0 && realErrors.length === 0 && cdnFailures.length > 0 && !mounted;
  } finally {
    await page.close();
  }
  return { route: SEEDED_ROUTE, problems, cdnFailures, cdnOnly };
}

/** The workspace around the editor (50 above): the gallery a bare link opens on, the file
 *  tabs, a file the reader adds, the link that carries them, and the transport. */
async function checkWorkspace(browser, origin) {
  const route = ROUTES[0];
  const { page, pageErrors, cdnFailures } = await openPage(browser);
  const problems = [];
  let mounted = true;
  try {
    await page.goto(`${origin}${route}`, { waitUntil: 'load' });
    const view = await page.getAttribute('[data-playground]', 'data-view');
    if (view !== 'gallery')
      problems.push(`a bare link opened on the ${view} view, not the gallery`);
    const tiles = await page.locator('[data-open-example]').count();
    if (tiles < 10) problems.push(`the gallery holds ${tiles} example tiles`);
    if (await page.isVisible('.editor-host')) problems.push('the editor shows under the gallery');
    try {
      await page.waitForSelector('.monaco-editor', { state: 'attached', timeout: EDITOR_TIMEOUT });
    } catch {
      mounted = false;
      problems.push('the editor did not mount under the gallery');
    }

    if (mounted) {
      await page.click('[data-open-example="imported-noise"]');
      await page.waitForFunction(
        () => document.querySelector('[data-playground]')?.dataset.view === 'editor',
      );
      if (!(await page.isVisible('.editor-host')))
        problems.push('picking a tile did not show the editor');
      if (!/example=imported-noise/.test(page.url()))
        problems.push(`picking a tile did not name the example in the link: ${page.url()}`);
      await page.waitForTimeout(AFTER_EDIT);
      await settleResult(page).catch(() => {});
      const tabs = await page.$$eval('[data-file-tab]', (nodes) =>
        nodes.map((node) => node.getAttribute('data-file-tab')),
      );
      if (!tabs.includes('lib/noise.shade.ts'))
        problems.push(`the imported file has no tab: ${tabs.join(', ')}`);

      // An edit to the imported file is an edit to the program.
      const before = await wgslPane(page);
      await page.click('[data-file-tab="lib/noise.shade.ts"]');
      const shows = await page.evaluate(() =>
        window.monaco.editor.getEditors()[0]?.getModel()?.uri.toString(),
      );
      if (!shows?.endsWith('/lib/noise.shade.ts'))
        problems.push(`the imported file's tab did not put that file in the editor: ${shows}`);
      const edited = await page.evaluate(() => {
        const model = window.monaco.editor.getEditors()[0].getModel();
        const next = model.getValue().replace('vec2(3.)', 'vec2(2.5)');
        if (next === model.getValue()) return false;
        model.setValue(next);
        return true;
      });
      if (!edited) problems.push('the check found nothing to edit in lib/noise.shade.ts');
      await page.waitForTimeout(AFTER_EDIT);
      await settleResult(page).catch(() => {});
      const after = await wgslPane(page);
      if (after === before || !after.includes('2.5'))
        problems.push('an edit to the imported file did not reach the emitted WGSL');
      if (!/[#&]files=/.test(page.url()))
        problems.push('the link does not carry the edited imported file');

      // A new file, imported by the main one.
      await page.click('[data-new-file]');
      await page.fill('[data-file-tabs] input', 'lib/extra');
      await page.press('[data-file-tabs] input', 'Enter');
      await page.waitForSelector('[data-file-tab="lib/extra.shade.ts"]');
      await page.click(
        '[data-file-tab="imported-noise.shade.ts"], [data-file-tab="hello.shade.ts"]',
      );
      await page.evaluate(() => {
        const model = window.monaco.editor.getModels()[0];
        model.setValue(
          model
            .getValue()
            .replace(
              'import { fbm } from "./lib/noise.shade.ts";',
              'import { fbm } from "./lib/noise.shade.ts";\nimport { wave } from "./lib/extra.shade.ts";',
            )
            .replace(/return vec4\(/, 'return wave(0.0, 0.0) * vec4('),
        );
      });
      await page.waitForTimeout(AFTER_EDIT);
      await settleResult(page).catch(() => {});
      const status = (await page.textContent('[data-status]'))?.trim() ?? '';
      const diagnostics = (await page.textContent('[data-diagnostics]'))?.trim() ?? '';
      const withImport = await wgslPane(page);
      if (!/fn wave/.test(withImport))
        problems.push(
          `the main file's import of a new file did not compile (${status}): ${diagnostics.slice(0, 300)}`,
        );

      // The transport holds the clock and takes it back to zero.
      await openTab(page, 'result');
      await page.click('[data-play]');
      await page.waitForTimeout(300);
      const held = await page.textContent('[data-clock]');
      await page.waitForTimeout(700);
      const stillHeld = await page.textContent('[data-clock]');
      if (held !== stillHeld)
        problems.push(`Pause did not hold the clock: ${held} then ${stillHeld}`);
      await page.click('[data-restart]');
      await page.waitForTimeout(400);
      const restarted = await page.textContent('[data-clock]');
      if (restarted !== '0.00s') problems.push(`Restart while held left the clock at ${restarted}`);
      await page.click('[data-play]');

      await page.goBack();
      await page.waitForTimeout(300);
      const back = await page.getAttribute('[data-playground]', 'data-view');
      if (back !== 'gallery') problems.push(`Back from a picked tile opened the ${back} view`);
      console.log(
        `  ${tiles} tiles; tabs ${tabs.join(', ')}; an imported file's edit and a new file both compile`,
      );
    }
    const realErrors = pageErrors.filter((message) => !/ResizeObserver|Canceled/.test(message));
    for (const message of realErrors) problems.push(`the page threw: ${message}`);
  } finally {
    await page.close();
  }
  return {
    route: `${route} workspace`,
    problems,
    cdnFailures,
    cdnOnly: !mounted && cdnFailures.length > 0,
  };
}

/** How many pixels of the Result canvas are lit: a channel above a quarter. A trail is the
 *  lit pixels behind the dot, so the count is its length. */
async function litPixels(page) {
  const shot = await photographCanvas(page);
  const { data } = await sharp(shot).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let lit = 0;
  for (let i = 0; i < data.length; i += 4)
    if (Math.max(data[i], data[i + 1], data[i + 2]) > 64) lit += 1;
  return lit;
}

/** File names (52 above). */
async function checkNames(browser, origin) {
  const problems = [];
  let cdnFailures = [];
  let mounted = true;
  const pages = [];
  const open = async (hash) => {
    const opened = await openPage(browser);
    pages.push(opened);
    cdnFailures = opened.cdnFailures;
    await opened.page.goto(`${origin}${ROUTES[0]}#${hash}`, { waitUntil: 'load' });
    try {
      await opened.page.waitForSelector('.monaco-editor', { timeout: EDITOR_TIMEOUT });
    } catch {
      mounted = false;
    }
    await opened.page.waitForTimeout(AFTER_EDIT);
    return opened.page;
  };
  const tabsOf = (page) =>
    page.$$eval('[data-file-tab]', (nodes) =>
      nodes.map((node) => node.getAttribute('data-file-tab')),
    );
  const errorRows = (page) =>
    page.$$eval('[data-diagnostics] .error', (nodes) => nodes.map((node) => node.textContent));
  const strip = (url, key) => {
    const at = new URL(url);
    const params = new URLSearchParams(at.hash.replace(/^#/, ''));
    params.delete(key);
    at.hash = params.toString();
    return at.toString();
  };
  try {
    const page = await open('example=hello');
    if (mounted) {
      // The picker names the main file after the example it opens.
      await pickExample(page, 'plasma-twin');
      const picked = await tabsOf(page);
      if (picked[0] !== 'plasma-twin.shade.ts')
        problems.push(`picking Plasma left the main tab named ${picked[0]}`);
      const label = (await page.textContent('[data-runtime="file-name"]'))?.trim();
      if (label !== 'plasma-twin.shade.ts')
        problems.push(`picking Plasma left the toolbar naming ${label}`);

      // An empty name is refused with a message, and Escape puts the tab back.
      await page.dblclick('[data-file-tab="plasma-twin.shade.ts"]');
      await page.waitForSelector('[data-file-tabs] input');
      await page.fill('[data-file-tabs] input', '');
      await page.press('[data-file-tabs] input', 'Enter');
      const refusal = (await page.textContent('[data-file-error]'))?.trim() ?? '';
      if (!(await page.isVisible('[data-file-tabs] input')) || refusal === '')
        problems.push('an empty name was not refused with a message');
      await page.press('[data-file-tabs] input', 'Escape');
      if ((await tabsOf(page))[0] !== 'plasma-twin.shade.ts')
        problems.push('Escape did not put the tab back under its old name');

      // A double click renames the main file, and the worker answers under the new name.
      await page.dblclick('[data-file-tab="plasma-twin.shade.ts"]');
      await page.fill('[data-file-tabs] input', 'waves');
      await page.press('[data-file-tabs] input', 'Enter');
      await page.waitForSelector('[data-file-tab="waves.shade.ts"]');
      await page.waitForTimeout(AFTER_EDIT);
      if (!/[#&]name=waves\.shade\.ts(&|$)/.test(page.url()))
        problems.push(`the link does not carry the new name: ${page.url().slice(0, 160)}`);
      const renamedUrl = page.url();
      await page.evaluate(() => {
        const model = window.monaco.editor.getModels()[0];
        model.setValue(`${model.getValue()}\nconst broken: f32 = undefinedName;\n`);
      });
      const listed = await page
        .waitForFunction(
          () => document.querySelectorAll('[data-diagnostics] .error').length > 0,
          null,
          {
            timeout: 15_000,
          },
        )
        .then(() => true)
        .catch(() => false);
      const rows = await errorRows(page);
      const markers = await page.evaluate(
        () =>
          window.monaco.editor
            .getModelMarkers({ owner: 'typeshade' })
            .filter((marker) => marker.severity === 8).length,
      );
      if (!listed || !rows.some((row) => /undefinedName/.test(row)) || markers === 0)
        problems.push(
          `a mistake in the renamed file brought back no diagnostic (${rows.length} rows, ${markers} markers)`,
        );

      // A file the main one imports, renamed: the import follows it.
      await page.evaluate(() => {
        const model = window.monaco.editor.getModels()[0];
        model.setValue(model.getValue().replace('\nconst broken: f32 = undefinedName;\n', ''));
      });
      await page.click('[data-new-file]');
      await page.fill('[data-file-tabs] input', 'lib/wave');
      await page.press('[data-file-tabs] input', 'Enter');
      await page.waitForSelector('[data-file-tab="lib/wave.shade.ts"]');
      await page.click('[data-file-tab="waves.shade.ts"]');
      await page.evaluate(() => {
        const model = window.monaco.editor.getModels()[0];
        model.setValue(
          model
            .getValue()
            .replace(
              '"use typeshade";\n',
              '"use typeshade";\nimport { wave } from "./lib/wave.shade.ts";\n',
            )
            .replace(/return vec4\(/, 'return wave(0.0, 0.0) * vec4('),
        );
      });
      await page.waitForTimeout(AFTER_EDIT);
      await page.dblclick('[data-file-tab="lib/wave.shade.ts"]');
      await page.fill('[data-file-tabs] input', 'lib/ripple');
      await page.press('[data-file-tabs] input', 'Enter');
      await page.waitForSelector('[data-file-tab="lib/ripple.shade.ts"]');
      await page.waitForTimeout(AFTER_EDIT);
      await settleResult(page).catch(() => {});
      const main = await sourceOf(page);
      const note = (await page.textContent('[data-file-error]'))?.trim() ?? '';
      if (!main.includes('from "./lib/ripple.shade.ts"') || main.includes('./lib/wave.shade.ts'))
        problems.push("renaming an imported file did not rewrite the main file's import of it");
      if (!note.includes('waves.shade.ts'))
        problems.push(`the rename did not say which file's import changed: "${note}"`);
      const afterImports = await errorRows(page);
      if (afterImports.length > 0)
        problems.push(
          `after the renames the program reports: ${afterImports.join(' | ').slice(0, 300)}`,
        );
      else if (!/fn wave/.test(await wgslPane(page)))
        problems.push('the renamed import did not reach the emitted WGSL');

      // The link carries the name into a second tab.
      const second = await open(renamedUrl.split('#')[1]);
      const reopened = await tabsOf(second);
      if (reopened[0] !== 'waves.shade.ts')
        problems.push(`a link with name= opened the main tab as ${reopened[0]}`);
      // A link written before files had names: Plasma's own code opens as Plasma's file,
      // code no example has as main.shade.ts.
      const old = await open(strip(renamedUrl, 'name').split('#')[1]);
      const oldTabs = await tabsOf(old);
      if (oldTabs[0] !== 'plasma-twin.shade.ts')
        problems.push(`an old #code= link of Plasma opened the main tab as ${oldTabs[0]}`);
      const edited = await open(strip(page.url(), 'name').split('#')[1]);
      const editedTabs = await tabsOf(edited);
      if (editedTabs[0] !== 'main.shade.ts')
        problems.push(`an old #code= link of edited code opened the main tab as ${editedTabs[0]}`);
      if (!/fn wave/.test(await wgslPane(edited)))
        problems.push('an old #code= link with its files did not compile');
      console.log(
        `  picked: ${picked[0]}; renamed: waves.shade.ts with ${rows.length} diagnostic(s) back; import rewritten: ${note}; reopened: ${reopened[0]}, ${oldTabs[0]}, ${editedTabs[0]}`,
      );
    }
    for (const { pageErrors } of pages)
      for (const message of pageErrors.filter((m) => !/ResizeObserver|Canceled/.test(m)))
        problems.push(`the page threw: ${message}`);
  } finally {
    for (const { page } of pages) await page.close();
  }
  return {
    route: `${ROUTES[0]} names`,
    problems,
    cdnFailures,
    cdnOnly: !mounted && cdnFailures.length > 0,
  };
}

/** Examples drawn in several passes (51 above). */
async function checkMultipass(browser, origin) {
  const problems = [];
  let cdnFailures = [];
  let mounted = true;
  const open = async (hash) => {
    const opened = await openPage(browser);
    cdnFailures = opened.cdnFailures;
    await opened.page.goto(`${origin}${ROUTES[0]}#${hash}`, { waitUntil: 'load' });
    try {
      await opened.page.waitForSelector('.monaco-editor', { timeout: EDITOR_TIMEOUT });
    } catch {
      mounted = false;
    }
    await opened.page.waitForTimeout(AFTER_EDIT);
    await settleResult(opened.page).catch(() => {});
    return opened;
  };
  const errorsOf = (opened) =>
    opened.pageErrors.filter((message) => !/ResizeObserver|Canceled/.test(message));
  const report = [];

  // feedback-trail on WebGPU: the pass's tab, the float target, the trail and Restart.
  let opened = await open('example=feedback-trail');
  let page = opened.page;
  try {
    if (mounted) {
      const toggles = await page.$$eval('.file-pass-toggle', (nodes) =>
        nodes.map((n) => [n.textContent, n.getAttribute('aria-pressed')]),
      );
      if (!toggles.some(([text, pressed]) => /trail/.test(text ?? '') && pressed === 'true'))
        problems.push(`feedback-trail's pass is not a marked tab: ${JSON.stringify(toggles)}`);
      const shader = await page.evaluate(() => {
        const s = document.querySelector('[data-gpu-canvas]')?.__shader;
        return s ? { backend: s.backend, passFormat: s.passFormat } : null;
      });
      if (shader?.backend !== 'webgpu' || shader.passFormat !== 'rgba16float')
        problems.push(
          `feedback-trail did not draw its passes on WebGPU: ${JSON.stringify(shader)}`,
        );
      await page.waitForTimeout(2000);
      const long = await litPixels(page);
      // Pause holds the frame: the trail neither fades nor moves while the clock is held.
      await page.click('[data-play]');
      const paused = await litPixels(page);
      await page.waitForTimeout(1500);
      const stillPaused = await litPixels(page);
      await page.click('[data-play]');
      if (!(paused > 0 && stillPaused >= paused * 0.95))
        problems.push(
          `feedback-trail's trail faded while paused: ${paused} lit pixels at Pause, ${stillPaused} a second and a half later`,
        );
      await page.click('[data-restart]');
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
      const short = await litPixels(page);
      if (!(long > 0 && short < long * 0.7))
        problems.push(
          `feedback-trail's trail did not build up and clear: ${long} lit pixels after two seconds, ${short} after Restart`,
        );
      report.push(
        `trail ${long} lit pixels, ${paused} to ${stillPaused} paused, ${short} after Restart`,
      );
      // The link carries the graph once the workspace is edited, and the WGSL tab shows the
      // pass's own module while its tab is open.
      await page.click('[data-file-tab="passes/trail.shade.ts"]');
      await page.evaluate(() => {
        const model = window.monaco.editor.getEditors()[0].getModel();
        model.setValue(model.getValue().replace('0.96', '0.9'));
      });
      await page.waitForTimeout(AFTER_EDIT);
      if (!/[#&]passes=trail:passes\/trail\.shade\.ts/.test(page.url()))
        problems.push(`the link does not carry the pass graph: ${page.url().slice(-120)}`);
      const wgsl = await wgslPane(page);
      // The program itself holds no 0.9; the pass's fade, as edited above, does.
      if (!wgsl.includes('0.9'))
        problems.push("the WGSL tab does not show the pass's own module while its tab is open");
      // Download writes the workspace as a zip of a folder: the edited pass file, and
      // typeshade.json naming the main file and the graph (src/scripts/workspace-folder.ts).
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }),
        page.click('[data-download]'),
      ]);
      const zip = readFileSync(await download.path());
      const text = zip.toString('utf8');
      const manifest = /\{\n {2}"main"[\s\S]*?\n\}\n/.exec(text)?.[0];
      const parsed = manifest ? JSON.parse(manifest) : undefined;
      if (
        zip.readUInt32LE(0) !== 0x04034b50 ||
        zip.readUInt32LE(zip.length - 22) !== 0x06054b50 ||
        download.suggestedFilename() !== 'feedback-trail.zip' ||
        parsed?.main !== 'feedback-trail.shade.ts' ||
        !text.includes('feedback-trail.shade.ts') ||
        parsed?.passes?.[0]?.name !== 'trail' ||
        parsed?.passes?.[0]?.file !== 'passes/trail.shade.ts' ||
        !text.includes('passes/trail.shade.ts') ||
        !text.includes('.vscode/extensions.json') ||
        !/\b0\.9\b/.test(text)
      )
        problems.push(
          `the folder download is not the workspace: ${download.suggestedFilename()}, ${zip.length} bytes, typeshade.json ${JSON.stringify(parsed)}`,
        );
      report.push(`folder ${zip.length} bytes`);
      // Open in VS Code: the anchor's click is caught before it navigates, so the page stays.
      // There is no Worker here, so the link the uri carries is the page's own URL.
      await page.evaluate(() => {
        window.__vscodeOpened = [];
        HTMLAnchorElement.prototype.click = function () {
          window.__vscodeOpened.push(this.href);
        };
      });
      const hintState = () =>
        page.evaluate(() => {
          const line = document.querySelector('[data-vscode-hint]');
          return line
            ? { hidden: line.hidden, href: line.querySelector('a')?.getAttribute('href') ?? '' }
            : null;
        });
      const hintBefore = await hintState();
      await page.click('[data-open-vscode]');
      await page
        .waitForFunction(() => window.__vscodeOpened.length > 0, undefined, { timeout: 10_000 })
        .catch(() => {});
      const opened = await page.evaluate(() => window.__vscodeOpened);
      // No editor answers a vscode: address silently, so the click opens a line that links to
      // the page on installing the extension, and the line takes no room before the click.
      const hintAfter = await hintState();
      if (!hintBefore?.hidden || hintAfter?.hidden !== false || hintAfter.href !== '/guide/editor/')
        problems.push(
          `the install hint under the file bar: before ${JSON.stringify(hintBefore)}, after ${JSON.stringify(hintAfter)}`,
        );
      const prefix = 'vscode://typeshade.vscode-typeshade/open?link=';
      const uri = opened[0] ?? '';
      // The receiver, as VS Code and the extension read it: Uri.parse percent-decodes the
      // query once, then the handler splits it with URLSearchParams and takes `link`. A link
      // encoded once loses everything after its first `&` here.
      const carried = uri.startsWith(prefix)
        ? (new URLSearchParams(decodeURIComponent(uri.slice(uri.indexOf('?') + 1))).get('link') ??
          '')
        : '';
      const fragmentOf = (href) => new URLSearchParams(href.split('#')[1] ?? '');
      const want = fragmentOf(page.url());
      const got = fragmentOf(carried);
      if (
        opened.length !== 1 ||
        !uri.startsWith(prefix) ||
        !carried.startsWith(`${origin}${ROUTES[0]}#`) ||
        !want.get('code') ||
        !want.get('files') ||
        !want.get('passes') ||
        ['code', 'files', 'passes'].some((key) => got.get(key) !== want.get(key))
      )
        problems.push(
          `Open in VS Code did not hand over the workspace's link: ${JSON.stringify(opened).slice(0, 200)}`,
        );
      if (new URL(page.url()).pathname !== ROUTES[0])
        problems.push(`Open in VS Code left the page: ${page.url().slice(0, 80)}`);
      report.push('vscode uri carries the link');
    }
    for (const message of errorsOf(opened)) problems.push(`the page threw: ${message}`);
  } finally {
    await page.close();
  }

  // The other engines, and the other example.
  for (const [hash, backend, label] of [
    ['example=feedback-trail&backend=webgl2', 'webgl2', 'feedback-trail on WebGL2'],
    ['example=feedback-trail&backend=cpu', 'cpu', 'feedback-trail on the CPU'],
    ['example=separable-blur', 'webgpu', 'separable-blur on WebGPU'],
    ['example=separable-blur&backend=cpu', 'cpu', 'separable-blur on the CPU'],
  ]) {
    opened = await open(hash);
    page = opened.page;
    try {
      if (!mounted) break;
      if (backend === 'cpu') {
        await page
          .waitForFunction(
            () => /px in/.test(document.querySelector('[data-canvas-note]')?.textContent ?? ''),
            undefined,
            { timeout: 60_000 },
          )
          .catch(() => {});
        const px = await page.getAttribute('[data-canvas-note]', 'data-px');
        if (!(Number(px) > 0)) problems.push(`${label} drew no pixel`);
        report.push(`${label} ${px} px`);
      } else {
        const drawn = await page.getAttribute('[data-gpu-canvas]', 'data-backend');
        const seen = await canvasColours(page);
        if (drawn !== backend || seen.colours < 2)
          problems.push(`${label} did not paint: ${drawn}, ${seen.colours} colours`);
        report.push(`${label} ${seen.colours} colours`);
      }
      for (const message of errorsOf(opened))
        problems.push(`the page threw on ${label}: ${message}`);
    } finally {
      await page.close();
    }
  }
  if (!mounted) problems.push('the editor did not mount for the multipass examples');
  else console.log(`  ${report.join('; ')}`);
  return {
    route: `${ROUTES[0]} passes`,
    problems,
    cdnFailures,
    cdnOnly: !mounted && cdnFailures.length > 0,
  };
}

/** host.ts beside the main file, checked and run in a sandboxed frame (53 above). */
async function checkHostTs(browser, origin) {
  const problems = [];
  let cdnFailures = [];
  let mounted = true;
  const pages = [];
  const open = async (hash) => {
    const opened = await openPage(browser);
    pages.push(opened);
    cdnFailures = opened.cdnFailures;
    await opened.page.goto(`${origin}${ROUTES[0]}#${hash}`, { waitUntil: 'load' });
    try {
      await opened.page.waitForSelector('.monaco-editor', { timeout: EDITOR_TIMEOUT });
    } catch {
      mounted = false;
    }
    await opened.page.waitForTimeout(AFTER_EDIT);
    return opened.page;
  };
  const HOST_MODEL = 'inmemory://playground/host.ts';
  const hostText = (page) =>
    page.evaluate(
      (uri) => window.monaco.editor.getModel(window.monaco.Uri.parse(uri))?.getValue() ?? '',
      HOST_MODEL,
    );
  const setHostText = (page, text) =>
    page.evaluate(
      ([uri, value]) => window.monaco.editor.getModel(window.monaco.Uri.parse(uri)).setValue(value),
      [HOST_MODEL, text],
    );
  const hostErrors = (page) =>
    page.evaluate(
      (uri) =>
        window.monaco.editor
          .getModelMarkers({ resource: window.monaco.Uri.parse(uri) })
          .filter((marker) => marker.severity === 8)
          .map((marker) => `${marker.startLineNumber}: ${marker.message}`),
      HOST_MODEL,
    );
  const frames = (page) =>
    page.$$eval('iframe[data-host-frame]', (nodes) =>
      nodes.map((node) => node.getAttribute('sandbox')),
    );
  try {
    const page = await open('example=hello');
    if (mounted) {
      // Picking a host example opens its host.ts in the tab beside the module.
      await pickExample(page, 'host-compute');
      const tabs = await page.$$eval('[data-file-tab]', (nodes) =>
        nodes.map((node) => node.getAttribute('data-file-tab')),
      );
      if (tabs[0] !== 'host-compute.shade.ts' || tabs[1] !== 'host.ts')
        problems.push(`picking host-compute gave the tabs ${tabs.join(', ')}`);
      await page.click('[data-file-tab="host.ts"]');
      const host = await hostText(page);
      if (
        !host.includes("from './host-compute.shade.ts'") ||
        !/export async function run/.test(host)
      )
        problems.push(
          `the host.ts tab does not hold host-compute's host:\n    ${host.slice(0, 200)}`,
        );
      if ((await frames(page)).length > 0) problems.push('picking a host example ran its host.ts');

      // A type error in host.ts comes back as a marker on its own model, checked against the
      // host view of the module: `k` is a number to the host.
      await setHostText(page, host.replace('{ k: 2.5, xs, ys }', "{ k: 'fast', xs, ys }"));
      const marked = await page
        .waitForFunction(
          (uri) =>
            window.monaco.editor
              .getModelMarkers({ resource: window.monaco.Uri.parse(uri) })
              .some((marker) => marker.severity === 8),
          HOST_MODEL,
          { timeout: 60_000 },
        )
        .then(() => true)
        .catch(() => false);
      const errors = await hostErrors(page);
      if (!marked) problems.push('a type error in host.ts brought back no marker');
      const clean = host.replace(
        '  return ys;',
        "  console.log('host says', ys[3]);\n" +
          '  const specialized = await runSpecialized();\n' +
          "  console.log('specialized says', specialized.direct[3], specialized.values[3]);\n" +
          '  return ys;',
      );
      await setHostText(page, clean);
      const cleared = await page
        .waitForFunction(
          (uri) =>
            window.monaco.editor
              .getModelMarkers({ resource: window.monaco.Uri.parse(uri) })
              .every((marker) => marker.severity !== 8),
          HOST_MODEL,
          { timeout: 30_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!cleared)
        problems.push(
          `host-compute's host.ts with a console line reports: ${(await hostErrors(page)).join(' | ')}`,
        );
      const logLine = clean.split('\n').findIndex((line) => line.includes('host says')) + 1;

      // Run: a frame sandboxed to scripts alone, whose console line reaches the Console tab.
      await page.waitForTimeout(AFTER_EDIT);
      await page.click('[data-run-host]');
      await page.waitForSelector('iframe[data-host-frame]', { timeout: 30_000 }).catch(() => {});
      const sandbox = await frames(page);
      if (sandbox.length !== 1 || sandbox[0] !== 'allow-scripts')
        problems.push(
          `Run made ${sandbox.length} frame(s), sandboxed as ${sandbox.join(', ') || 'nothing'}`,
        );
      const lines = await page
        .waitForFunction(
          () => {
            const rows = [...document.querySelectorAll('[data-console-block="host"] li')];
            return rows.some((row) => row.textContent?.includes('host says')) &&
              rows.some((row) => row.textContent?.includes('specialized says')) &&
              rows.some((row) => row.textContent?.includes('run()'))
              ? rows.map((row) => row.textContent)
              : false;
          },
          null,
          { timeout: 60_000 },
        )
        .then((handle) => handle.jsonValue())
        .catch(() => undefined);
      const printed =
        lines ??
        (await page.$$eval('[data-console-block="host"] li', (rows) =>
          rows.map((row) => row.textContent),
        ));
      const said = printed.find((row) => row?.includes('host says')) ?? '';
      if (!said.includes(`host.ts:${logLine}`) || !said.includes('host says 7.5'))
        problems.push(
          `the host's console line did not arrive from host.ts:${logLine}: ${printed.join(' | ') || 'no lines'}`,
        );
      if (!printed.some((row) => row?.includes('specialized says 3.75 7.5')))
        problems.push(`the direct and planned constants gave wrong values: ${printed.join(' | ')}`);
      // Read the default from the host shown in the editor, so a compiler example update
      // cannot leave this check asserting an older input length.
      const count = Number(/export async function run\(n = (\d+)\)/.exec(host)?.[1]);
      if (!Number.isSafeInteger(count) || count <= 3)
        problems.push('host-compute has no positive default input length to check');
      const returned = new RegExp(`run\\(\\).*Float32Array\\(${count}\\) \\[0, 2\\.5, 5`);
      if (!printed.some((row) => returned.test(row ?? '')))
        problems.push(`what run() returned was not shown: ${printed.join(' | ')}`);
      const runUrl = page.url();
      if (!/[#&]host=/.test(runUrl)) problems.push('the link does not carry the edited host.ts');

      // Stop removes the frame.
      await page.click('[data-run-host]');
      if ((await frames(page)).length > 0) problems.push('Stop left the frame in place');

      // The link opens host.ts as it was written, and runs nothing until Run.
      const linked = await open(runUrl.split('#')[1]);
      await linked.waitForTimeout(3_000);
      const before = await frames(linked);
      const blocks = await linked.$$eval('[data-console-block="host"]', (nodes) => nodes.length);
      if (before.length > 0 || blocks > 0)
        problems.push('opening a link ran its host.ts before Run was clicked');
      if (!(await hostText(linked)).includes('host says'))
        problems.push('the link did not bring its host.ts');
      await linked.click('[data-run-host]');
      const ran = await linked
        .waitForSelector('[data-console-block="host"] li', { state: 'attached', timeout: 60_000 })
        .then(() => true)
        .catch(() => false);
      if (!ran) problems.push('Run on a linked host.ts printed nothing');

      // A run that draws nothing shows its value: Run from the Result tab brings the Console
      // tab to the front once run() returns. loop-fuse is the owner's report (2026-10-13):
      // its run() resolves to the three scopes' values, and the Result tab showed an empty
      // frame. A run that draws keeps the Result tab, where its picture is.
      const shownAfterRun = async (id, pattern) => {
        await pickExample(page, id);
        await page.click('[data-target="result"]');
        await page.waitForTimeout(AFTER_EDIT);
        await page.click('[data-run-host]');
        const row = await page
          .waitForFunction(
            (source) =>
              [...document.querySelectorAll('[data-console-block="host"] li')]
                .map((li) => li.textContent ?? '')
                .find((text) => new RegExp(source).test(text)) ?? false,
            pattern.source,
            { timeout: 60_000 },
          )
          .then((handle) => handle.jsonValue())
          .catch(() => '');
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => ({
          tab: document.querySelector('[role="tab"][aria-selected="true"]')?.dataset.target,
          visible: [...document.querySelectorAll('[data-console-block="host"] li')].some(
            (li) => li.getClientRects().length > 0,
          ),
          under: (() => {
            const line = document.querySelector('[data-host-result]');
            return line && line.getClientRects().length > 0 ? (line.textContent ?? '') : '';
          })(),
        }));
        await page.click('[data-run-host]');
        return { row, ...state };
      };
      const fused = await shownAfterRun('loop-fuse', /run\(\).*reduce: \{ sum: /);
      if (!fused.row) problems.push("loop-fuse's run() returned nothing to the Console tab");
      if (fused.tab !== 'console' || !fused.visible)
        problems.push(
          `loop-fuse's run() value is not on screen after Run: the ${fused.tab} tab is shown`,
        );
      // host-set-unique (compiler change 0080): two kernel functions collect into the host's
      // own Set and Map, and the Console tab shows their entries in insertion order.
      const collected = await shownAfterRun(
        'host-set-unique',
        /run\(\).*seen: Set\(6\) \{5, 3, 1, 6, 4, 2\}.*count: 6.*last: Map\(7\) \{/,
      );
      if (!collected.row)
        problems.push("host-set-unique's run() did not show the Set and the Map it collected");
      const drawn = await shownAfterRun('host-helper', /run\(\)/);
      if (drawn.tab !== 'result')
        problems.push(`host-helper draws, and Run left the Result tab for the ${drawn.tab} tab`);
      if (!/^run\(\) \d/.test(drawn.under))
        problems.push(`host-helper's run() value is not under its frame: "${drawn.under}"`);

      // A kernel function has no program entries. Run must call it and show the image it wrote.
      await pickExample(page, 'kernel-image-invert');
      await page.click('[data-target="result"]');
      await page.click('[data-run-host]');
      const imageReturned = await page
        .waitForFunction(
          () =>
            /run\(\).*width: 128, height: 96/.test(
              document.querySelector('[data-host-result]')?.textContent ?? '',
            ),
          null,
          { timeout: 60_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!imageReturned) problems.push('kernel-image-invert did not return its image dimensions');
      else {
        const frame = await (await page.$('iframe[data-host-frame]'))?.contentFrame();
        const image = await frame?.$eval('canvas', (canvas) => {
          const { width, height } = canvas;
          const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
          let wrong = 0;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              if (
                pixels[i] !== 255 - Math.round((255 * x) / (width - 1)) ||
                pixels[i + 1] !== 255 - Math.round((255 * y) / (height - 1)) ||
                pixels[i + 2] !== 191 ||
                pixels[i + 3] !== 255
              )
                wrong++;
            }
          }
          return { width, height, wrong };
        });
        if (!image || image.width !== 128 || image.height !== 96 || image.wrong !== 0)
          problems.push(`kernel-image-invert drew the wrong image: ${JSON.stringify(image)}`);
        if (
          (await page.$eval('[data-target="result"]', (tab) =>
            tab.getAttribute('aria-selected'),
          )) !== 'true'
        )
          problems.push('kernel-image-invert left the Result tab after drawing');
      }
      await page.click('[data-run-host]');
      console.log(
        `  host.ts tab: ${tabs.slice(0, 2).join(', ')}; type error marked: ${errors[0] ?? 'none'}; frame sandbox: ${sandbox.join(', ')}; console: ${printed.join(' | ').slice(0, 200)}; linked frames before Run: ${before.length}; loop-fuse after Run: ${fused.tab} tab, ${fused.row.slice(0, 60)}; host-set-unique: ${collected.row.slice(0, 90)}; host-helper after Run: ${drawn.tab} tab, "${drawn.under}" under the frame`,
      );
    }
    for (const { pageErrors } of pages)
      for (const message of pageErrors.filter((m) => !/ResizeObserver|Canceled/.test(m)))
        problems.push(`the page threw: ${message}`);
  } finally {
    for (const { page } of pages) await page.close();
  }
  return {
    route: `${ROUTES[0]} host.ts`,
    problems,
    cdnFailures,
    cdnOnly: !mounted && cdnFailures.length > 0,
  };
}

const server = await serveDist(dist, Number(process.env.PLAYGROUND_PORT ?? 4473));
const browser = await launchChromium();
const results = [];
try {
  for (const route of ROUTES.filter((r) => r === ROUTES[0] || RUNS_KOREAN)) {
    console.log(`[playground] ${route}${SHARDED ? `, part ${SHARD_K} of ${SHARD_N}` : ''}`);
    results.push(await checkRoute(browser, server.url, route));
  }
  if (RUNS_REST) {
    console.log(`[playground] ${SEEDED_ROUTE}`);
    results.push(await checkSeeded(browser, server.url));
    console.log('[playground] /playground/ workspace');
    results.push(await checkWorkspace(browser, server.url));
    console.log('[playground] /playground/ passes');
    results.push(await checkMultipass(browser, server.url));
    console.log('[playground] /playground/ file names');
    results.push(await checkNames(browser, server.url));
    console.log('[playground] /playground/ host.ts');
    results.push(await checkHostTs(browser, server.url));
    console.log('[playground] /playground/ with no WebGPU');
    const missing = [];
    await checkMissingWebGpu(browser, server.url, missing);
    results.push({
      route: '/playground/ with no WebGPU',
      problems: missing,
      cdnFailures: [],
      cdnOnly: false,
    });
  }
} finally {
  await browser.close();
  server.close();
}

if (SHARDED) {
  const report = process.env.PLAYGROUND_REPORT ?? `playground-part-${SHARD_K}.json`;
  writeFileSync(report, JSON.stringify({ shard: SHARD_K, of: SHARD_N, ...tally }));
  console.log(`[playground] part ${SHARD_K} of ${SHARD_N} wrote ${report} for --merge`);
}

const broken = results.filter((r) => r.problems.length > 0);
if (broken.length === 0) {
  console.log(`[playground] ${results.length} route(s) load, compile and mount the editor`);
  process.exit(0);
}

for (const result of broken) {
  console.error(`\n[playground] ${result.route}`);
  for (const problem of result.problems) console.error(`  - ${problem}`);
  if (result.cdnFailures.length > 0)
    console.error(`  requests to ${CDN} that failed:\n    ${result.cdnFailures.join('\n    ')}`);
}

if (broken.every((r) => r.cdnOnly)) {
  const message = `[playground] Monaco did not load from ${CDN}, so the editor could not be checked. The page's own script threw nothing.`;
  if (process.env.PLAYGROUND_CDN_OPTIONAL === '1') {
    console.warn(`${message} PLAYGROUND_CDN_OPTIONAL is set, so this passes.`);
    process.exit(0);
  }
  const lever = VIA_NODE
    ? 'Set PLAYGROUND_CDN_OPTIONAL=1 to let a runner with no route to it pass.'
    : 'Set PLAYGROUND_MONACO_VIA_NODE=1 to fetch it with Node instead, or PLAYGROUND_CDN_OPTIONAL=1 to pass without it.';
  console.error(`${message} ${lever}`);
  process.exit(2);
}
process.exit(1);
