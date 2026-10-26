// A live example, opened in a browser against the built site. A build stays green while the
// page that ships an editor and a canvas does nothing at all, so this opens dist/ on
// loopback, loads a page the way a reader does, and checks the four things <LiveShader>
// exists to do:
//
//   1. the canvas mounts on a backend, or the fallback note and the build-time still show
//   2. the compiler is not in the page's initial JavaScript: every script the page fetches
//      before the first edit is small, and the megabyte arrives on the first keystroke
//   3. an edit recompiles: a broken edit draws diagnostics and keeps the last frame, and a
//      good edit puts a new program on the canvas
//   4. moving a control reaches the shader: with the clock pinned, the packed uniform bytes
//      change and so does the image
//   5. the link to the Playground carries the file as it stands: the sample before an edit,
//      and the edited text after one
//   6. the Playground opens that link on the same picture: the frame's shape, the controls'
//      starting values, and an example picker that names no example
//
// Exit codes: 1 for a broken page, 2 when no backend was reachable, which is the one failure
// that is the runner and not the page. LIVE_GPU_OPTIONAL=1 lets a runner with no software
// rasteriser pass on the checks that need no frame.
//
// Run: bun run check:live (after a build, which writes dist/)
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
/** One live example per page, in both languages, and one of them forced onto the fallback.
 *  The WebGL2 half is a second emitted program from the same source, and a page that only
 *  ever ran on WebGPU can ship one that does not link. */
const ROUTES = [
  { route: '/guide/quick-start/', id: 'quick-start-stripes' },
  { route: '/guide/quick-start/?forcegl2=1', id: 'quick-start-stripes', backend: 'webgl2' },
  { route: '/ko/guide/language/gpu-types/', id: 'gpu-types-disc' },
  // The three live examples of the reference note on `pow`, on each backend.
  { route: '/reference/functions/pow/', id: 'reference-pow-curve' },
  { route: '/reference/functions/pow/', id: 'reference-pow-negative' },
  { route: '/reference/functions/pow/', id: 'reference-pow-specular' },
  { route: '/reference/functions/pow/?forcegl2=1', id: 'reference-pow-curve', backend: 'webgl2' },
  {
    route: '/reference/functions/pow/?forcegl2=1',
    id: 'reference-pow-negative',
    backend: 'webgl2',
  },
  {
    route: '/reference/functions/pow/?forcegl2=1',
    id: 'reference-pow-specular',
    backend: 'webgl2',
  },
];
/** A script larger than this is the compiler; nothing else the site ships comes close. */
const SMALL_SCRIPT = 200_000;
/** What a page carrying a live example may fetch before the first edit, in total, so a
 *  compiler split into several smaller chunks cannot slip past the rule above. */
const INITIAL_BUDGET = 120_000;
const TIMEOUT = Number(process.env.LIVE_TIMEOUT ?? 30_000);
const GPU_OPTIONAL = process.env.LIVE_GPU_OPTIONAL === '1';
/** The clock the frames are compared at. Pinning it makes two frames of one program equal. */
const PINNED = 2;

if (!existsSync(dist)) {
  console.error('[live] dist/ does not exist. Run `bun run build` first.');
  process.exit(1);
}

const bytesDiffer = (a, b) => a.length !== b.length || !a.equals(b);

/** A photograph of a canvas taken from its box on the page. An element photograph first
 *  waits for the box to hold still across two animation frames, and a runner under load can
 *  give it no two frames in time, though the box never moves. */
async function photograph(locator) {
  // Scrolled by the page itself: Playwright's own scroll waits for the same stability.
  await locator.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  const box = await locator.boundingBox();
  if (!box) throw new Error('the canvas has no box to photograph');
  return locator.page().screenshot({ clip: box, timeout: 15_000 });
}

async function checkRoute(browser, origin, { route, id, backend: expected }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  const problems = [];
  const pageErrors = [];
  /** Every script the page fetched, with its size, in order. The static server sends no
   *  content-length, so the size is the body the browser actually received. */
  const scripts = [];
  const weighed = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    if (!url.endsWith('.js')) return;
    const entry = { url: url.replace(origin, ''), length: 0 };
    scripts.push(entry);
    weighed.push(
      response
        .body()
        .then((body) => {
          entry.length = body.length;
        })
        .catch(() => {}),
    );
  });
  /** Every script fetched so far, weighed. */
  const fetched = async () => {
    await Promise.all(weighed);
    return scripts;
  };

  let mounted = false;
  try {
    await page.goto(`${origin}${route}`, { waitUntil: 'load' });
    const figure = page.locator(`[data-live-shader][data-live-id="${id}"]`);
    await figure.waitFor({ timeout: TIMEOUT });
    const canvas = figure.locator('canvas');
    await page.waitForFunction(
      (at) => document.querySelector(at)?.__liveShader != null,
      `[data-live-id="${id}"]`,
      { timeout: TIMEOUT },
    );

    // 1. A backend, or the fallback the page promises instead. The canvas is brought into
    // view first: the runtime draws nothing for a canvas out of view, so a count taken below
    // the fold measured only the frames that slipped in before the page said so.
    await canvas.evaluate((node) => node.scrollIntoView({ block: 'center' }));
    // The host handle appears before asynchronous pipeline and font preparation finishes.
    // The canvas handle reports the completed backend choice, including a real fallback.
    await page.waitForFunction(
      (at) => document.querySelector(at)?.__shader != null,
      `[data-live-id="${id}"] canvas`,
      { timeout: TIMEOUT },
    );
    await page.waitForTimeout(1500);
    const backend = await canvas.getAttribute('data-backend');
    mounted = backend === 'webgpu' || backend === 'webgl2';
    if (expected && mounted && backend !== expected) {
      problems.push(`this route asks for ${expected} and drew on ${backend}`);
    }
    if (!mounted) {
      const note = (await figure.locator('[data-live-caption]').innerText()).trim();
      const still = await figure.locator('.figure-frame img').count();
      if (note.length === 0) problems.push('no backend drew and the fallback note is empty');
      if (still === 0)
        problems.push('no backend drew and there is no still image under the canvas');
    } else {
      await page
        .waitForFunction(
          (at) => (document.querySelector(at)?.__shader?.frames ?? 0) >= 2,
          `[data-live-id="${id}"] canvas`,
          { timeout: TIMEOUT },
        )
        .catch(() => {});
      const frames = await page.evaluate(
        (at) => document.querySelector(at)?.__shader?.frames ?? 0,
        `[data-live-id="${id}"] canvas`,
      );
      if (frames < 2) problems.push(`the canvas drew ${frames} frame(s) on ${backend}`);
    }

    // The link to the Playground, in the Playground's own encoding, read as the text it
    // opens there. Before any edit it holds the sample.
    const linked = () =>
      page.evaluate(async (at) => {
        const link = document.querySelector(`${at} [data-live-playground]`);
        const code = /[#&]code=([^&]+)/.exec(new URL(link?.href ?? '', location.href).hash)?.[1];
        if (!code) return null;
        const binary = atob(code.slice(1).replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        if (code.startsWith('u')) return new TextDecoder().decode(bytes);
        const stream = new Blob([bytes])
          .stream()
          .pipeThrough(new DecompressionStream('deflate-raw'));
        return new Response(stream).text();
      }, `[data-live-id="${id}"]`);
    const linkedBefore = await linked();

    // 6. The Playground opens the link on the picture this canvas draws: its frame has the
    //    canvas's shape, its controls start where the page's stand, and its example picker
    //    names no example. Checked once per example, on the WebGPU route.
    if (!expected) {
      const opened = await page.evaluate((at) => {
        const figure = document.querySelector(at);
        const box = figure?.querySelector('canvas')?.getBoundingClientRect();
        return {
          href: figure?.querySelector('[data-live-playground]')?.href ?? '',
          ratio: box && box.height > 0 ? box.width / box.height : 0,
          values: figure?.__liveShader?.values() ?? {},
        };
      }, `[data-live-id="${id}"]`);
      const playground = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
      try {
        await playground.goto(opened.href, { waitUntil: 'load' });
        await playground
          .waitForFunction(
            () => document.querySelectorAll('input[data-uniform]').length > 0,
            undefined,
            { timeout: TIMEOUT * 2 },
          )
          .catch(() => {});
        const seen = await playground.evaluate(() => {
          const frame = document.querySelector('[data-gpu-frame]')?.getBoundingClientRect();
          const picker = document.querySelector('[data-example]');
          return {
            ratio: frame && frame.height > 0 ? frame.width / frame.height : 0,
            picked: picker ? picker.selectedIndex : -1,
            sliders: Object.fromEntries(
              [...document.querySelectorAll('input[data-uniform]')].map((i) => [
                i.dataset.uniform,
                Number(i.value),
              ]),
            ),
            // A colour field is a picker, which holds 8 bits a channel.
            pickers: Object.fromEntries(
              [...document.querySelectorAll('input[type="color"]')].map((i) => [
                i.getAttribute('aria-label'),
                [1, 3, 5].map((at) => parseInt(i.value.slice(at, at + 2), 16) / 255),
              ]),
            ),
          };
        });
        if (Math.abs(seen.ratio - opened.ratio) > 0.02 * opened.ratio)
          problems.push(
            `the Playground frame is ${seen.ratio.toFixed(3)} wide per high, the canvas ${opened.ratio.toFixed(3)}`,
          );
        if (seen.picked !== -1)
          problems.push(`the Playground picker names an example (index ${seen.picked})`);
        // A slider shows its value on its own step, so a value is matched to within a step.
        const near = (a, b) => typeof a === 'number' && Math.abs(a - b) <= 0.005;
        for (const [field, value] of Object.entries(opened.values)) {
          value.forEach((v, i) => {
            const name = value.length > 1 ? `${field} ${'xyzw'[i]}` : field;
            const shown = seen.sliders[name] ?? seen.pickers[field]?.[i];
            if (!near(shown, v))
              problems.push(`the Playground starts ${name} at ${shown}, the page at ${v}`);
          });
        }
      } finally {
        await playground.close();
      }
    }

    // 2. Nothing large before the first edit.
    const before = (await fetched()).filter((s) => s.length >= SMALL_SCRIPT);
    if (before.length > 0) {
      problems.push(
        `the page fetched the compiler before any edit:\n    ${before.map((s) => `${s.url} (${s.length} bytes)`).join('\n    ')}`,
      );
    }
    const initial = scripts.reduce((sum, s) => sum + s.length, 0);
    const initialCount = scripts.length;
    if (initial > INITIAL_BUDGET) {
      problems.push(
        `the page fetched ${initial} bytes of script before any edit, over the ${INITIAL_BUDGET} byte budget`,
      );
    }

    // 3. The editor opens where the reader reaches for the code, and an edit recompiles.
    const disclosure = figure.locator('details.live-parts');
    if (await disclosure.count()) await disclosure.locator(':scope > summary').click();
    await figure.locator('[data-live-code] pre').click();
    const area = figure.locator('textarea[data-live-input]');
    await area.waitFor({ timeout: TIMEOUT });
    const source = await area.inputValue();
    if (source.trim().length === 0) problems.push('the editor opened with no source in it');
    if (linkedBefore !== source)
      problems.push('before an edit, the Playground link does not carry the sample');

    // A broken edit: diagnostics under the canvas, and the frame that compiled stays up.
    await area.fill(`${source}\nthis is not TypeShade`);
    await page.waitForFunction(
      (at) => document.querySelector(at)?.dataset.liveState === 'error',
      `[data-live-id="${id}"]`,
      { timeout: TIMEOUT },
    );
    const messages = await page.evaluate(
      (at) => document.querySelector(at)?.__liveShader?.diagnostics() ?? [],
      `[data-live-id="${id}"]`,
    );
    if (messages.length === 0) problems.push('a broken edit drew no diagnostic');
    if (mounted) {
      const stillDrawing = await canvas.getAttribute('data-backend');
      if (stillDrawing !== backend)
        problems.push(`a broken edit took the canvas from ${backend} to ${stillDrawing}`);
    }

    // The compiler arrived, once, on that edit.
    const loaded = (await fetched()).filter((s) => s.length >= SMALL_SCRIPT);
    if (loaded.length === 0) problems.push('the edit did not fetch the compiler');

    // A good edit: back to a clean state, with a program of its own on the canvas.
    await page.evaluate(
      (at) => document.querySelector(at)?.__liveShader?.freeze(2),
      `[data-live-id="${id}"]`,
    );
    await area.fill(source);
    await page.waitForFunction(
      (at) => document.querySelector(at)?.dataset.liveState !== 'error',
      `[data-live-id="${id}"]`,
      { timeout: TIMEOUT },
    );
    await page.waitForTimeout(300);

    let framePixels = 0;
    if (mounted) {
      // Two frames of the same program at a pinned clock, to prove the comparison below
      // reads a control and not the animation.
      const a = await photograph(canvas);
      await page.waitForTimeout(250);
      const b = await photograph(canvas);
      if (bytesDiffer(a, b))
        problems.push(
          'two frames of one program at a pinned clock differ, so a moved control cannot be told from the clock',
        );
      framePixels = a.length;

      // 4. Move the first control and read both the buffer and the image.
      const uniformsBefore = await page.evaluate(
        (at) => document.querySelector(at)?.__liveShader?.uniforms() ?? [],
        `[data-live-id="${id}"]`,
      );
      const moved = await page.evaluate((at) => {
        const input = document.querySelector(`${at} [data-live-controls] input[type="range"]`);
        if (!input) return null;
        const from = Number(input.value);
        const to =
          Number(input.value) === Number(input.max) ? Number(input.min) : Number(input.max);
        input.value = String(to);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return { from, to };
      }, `[data-live-id="${id}"]`);
      if (!moved) problems.push('the example has no slider to move');
      else {
        await page.waitForTimeout(250);
        const uniformsAfter = await page.evaluate(
          (at) => document.querySelector(at)?.__liveShader?.uniforms() ?? [],
          `[data-live-id="${id}"]`,
        );
        if (JSON.stringify(uniformsBefore) === JSON.stringify(uniformsAfter)) {
          problems.push(
            `moving a slider from ${moved.from} to ${moved.to} did not change the packed uniform bytes`,
          );
        }
        const c = await photograph(canvas);
        if (!bytesDiffer(b, c))
          problems.push(
            `moving a slider from ${moved.from} to ${moved.to} did not change the rendered frame`,
          );
      }
    }

    // 5. The link to the Playground carries the file as it stands, the edited text after an
    // edit (the sample before one is read above).
    const marked = `${source}\n// opened from the page`;
    await area.fill(marked);
    let carried = await linked();
    for (let i = 0; i < 20 && carried !== marked; i++) {
      await page.waitForTimeout(100);
      carried = await linked();
    }
    if (carried !== marked)
      problems.push(
        `the Playground link does not carry the edited file: ${JSON.stringify(carried?.slice(-60) ?? carried)}`,
      );

    if (pageErrors.length > 0) {
      problems.push(
        `the page threw ${pageErrors.length} uncaught error(s):\n    ${pageErrors.join('\n    ')}`,
      );
    }

    const compiler = (await fetched())
      .filter((s) => s.length >= SMALL_SCRIPT)
      .reduce((sum, s) => sum + s.length, 0);
    console.log(`  backend: ${backend}`);
    console.log(`  initial JavaScript: ${initial} bytes over ${initialCount} script(s)`);
    console.log(`  compiler chunk on first edit: ${compiler} bytes`);
    if (mounted) console.log(`  frame: ${framePixels} bytes of PNG per canvas screenshot`);
  } catch (error) {
    // A step that timed out says so as this route's problem, with anything the page threw,
    // which is usually the reason. The other routes still run.
    problems.push(`${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    if (pageErrors.length > 0) problems.push(`the page threw:\n    ${pageErrors.join('\n    ')}`);
  } finally {
    await page.close();
  }
  return { route, problems, mounted };
}

const server = await serveDist(dist, Number(process.env.LIVE_PORT ?? 4474));
const browser = await launchChromium();
const results = [];
try {
  for (const target of ROUTES) {
    console.log(`[live] ${target.route}`);
    results.push(await checkRoute(browser, server.url, target));
  }
} finally {
  await browser.close();
  server.close();
}

const broken = results.filter((r) => r.problems.length > 0);
for (const result of broken) {
  console.error(`\n[live] ${result.route}`);
  for (const problem of result.problems) console.error(`  - ${problem}`);
}
if (broken.length > 0) process.exit(1);

if (results.some((r) => !r.mounted)) {
  const message = '[live] no WebGPU and no WebGL2 on this runner, so the frames were not compared.';
  if (GPU_OPTIONAL) {
    console.warn(`${message} LIVE_GPU_OPTIONAL is set, so this passes.`);
    process.exit(0);
  }
  console.error(`${message} Set LIVE_GPU_OPTIONAL=1 to pass on the checks that need no frame.`);
  process.exit(2);
}

console.log(
  `[live] ${results.length} route(s) mount, recompile on an edit and follow their controls`,
);
process.exit(0);
