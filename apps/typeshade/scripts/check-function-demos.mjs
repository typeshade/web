// Every catalogue page must explain its function before the compiler reference, draw its
// own program on both GPU backends, and respond to the visible controls.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { FUNCTION_DEMOS } from '../src/lib/function-demo-catalog.mjs';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'shots/function-demos');
await mkdir(shots, { recursive: true });
const server = await serveDist(
  path.join(root, 'dist'),
  Number(process.env.FUNCTION_DEMOS_PORT ?? 4487),
);
const browser = await launchChromium();
const layoutsOnly = process.argv.includes('--layouts-only');
const externalHosts = new Set();
const localPage = async (options) => {
  const page = await browser.newPage(options);
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === server.url || ['blob:', 'data:'].includes(url.protocol))
      return route.continue();
    externalHosts.add(url.hostname);
    return route.abort();
  });
  return page;
};
const measurements = [];
const tick = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );

try {
  if (!layoutsOnly) {
    const page = await localPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const backend of ['webgpu', 'webgl2']) {
      for (const demo of FUNCTION_DEMOS) {
        assert(
          demo.expression.includes(`${demo.name}(`),
          `${demo.name}: expression calls a different function`,
        );
        errors.length = 0;
        await page.goto(
          `${server.url}/reference/functions/${demo.name}/${backend === 'webgl2' ? '?forcegl2=1' : ''}`,
        );
        const figure = page.locator(`[data-live-id="reference-function-${demo.name}"]`);
        const canvas = figure.locator('canvas');
        const calculation = await page.locator('[data-function-calculation]').innerText();
        assert(
          calculation.includes(`${demo.name}(`) && calculation.includes('≈'),
          `${demo.name}: no worked calculation`,
        );
        await canvas.scrollIntoViewIfNeeded();
        await page.waitForFunction((id) => {
          const canvas = document.querySelector(`[data-live-id="${id}"] canvas`);
          return canvas?.dataset.backend && canvas.dataset.backend !== 'none';
        }, `reference-function-${demo.name}`);
        assert.equal(
          await canvas.getAttribute('data-backend'),
          backend,
          `${demo.name}: wrong backend`,
        );
        assert.equal(
          await figure.locator('.live-axes span').count(),
          4,
          `${demo.name}: missing plot bounds`,
        );
        assert.equal(
          await figure.locator('details.live-parts').getAttribute('open'),
          null,
          `${demo.name}: source starts open`,
        );
        assert(
          await page.evaluate(() => {
            const explanation = document.getElementById('interactive-example');
            const syntax = document.getElementById('syntax');
            return !!(
              explanation.compareDocumentPosition(syntax) & Node.DOCUMENT_POSITION_FOLLOWING
            );
          }),
          `${demo.name}: compiler syntax precedes the explanation`,
        );
        await tick(page);
        for (const control of await figure.locator('input[type="range"]').all()) {
          const before = await canvas.screenshot();
          const moved = await control.evaluate((input) => {
            const previous = input.value;
            input.value = String(
              Number(input.min) + (Number(input.max) - Number(input.min)) * 0.73,
            );
            if (input.value === previous)
              input.value = input.value === input.max ? input.min : input.max;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return previous !== input.value;
          });
          assert(moved, `${demo.name}: control did not move`);
          await tick(page);
          const after = await canvas.screenshot();
          assert(!before.equals(after), `${demo.name}: a moved control did not change the image`);
        }
        assert.deepEqual(errors, [], `${demo.name}: browser errors`);
        if (demo.name === 'sin' && backend === 'webgpu') {
          await figure.locator('details.live-parts > summary').click();
          await figure.locator('[data-live-edit]').click();
          const editor = figure.locator('textarea[data-live-input]');
          const source = await editor.inputValue();
          await editor.fill(
            source
              .replace(
                'class Uniforms extends PlotUniforms {}',
                'class Uniforms extends PlotUniforms { extra: f32; }',
              )
              .replace('return sin(x)', 'return sin(x) + u.extra'),
          );
          await page.waitForFunction(() => {
            const root = document.querySelector('[data-live-id="reference-function-sin"]');
            return root?.dataset.liveState === 'ok' && root.querySelector('[data-field="extra"]');
          });
          assert(
            (await figure.locator('[data-field="extra"] .live-control-head').innerText()).includes(
              'extra',
            ),
          );
          await figure.locator('[data-live-reset]').click();
          await page.waitForFunction(
            () =>
              !document.querySelector(
                '[data-live-id="reference-function-sin"] [data-field="extra"]',
              ),
          );
        }
        console.log(
          `[function-demos] ${demo.name}: ${backend}, plot bounds, source disclosure and controls passed`,
        );
      }
    }
    await page.close();
  }

  // Representative continuous, discontinuous, constrained-domain, parameterized, and
  // vector-component plots, including their translated first screens.
  for (const width of [1440, 390]) {
    for (const locale of ['', '/ko']) {
      for (const colorScheme of ['light', 'dark']) {
        for (const name of ['sin', 'log', 'mod', 'smoothstep', 'normalize']) {
          const page = await localPage({
            viewport: { width, height: 1000 },
            colorScheme,
            reducedMotion: 'reduce',
          });
          await page.goto(`${server.url}${locale}/reference/functions/${name}/`);
          await page.evaluate(() => document.fonts.ready);
          const figure = page.locator(`[data-live-id="reference-function-${name}"]`);
          await figure.locator('canvas').scrollIntoViewIfNeeded();
          await page.waitForFunction(
            (name) =>
              document.querySelector(`[data-live-id="reference-function-${name}"] canvas`)?.dataset
                .backend !== 'none',
            name,
          );
          const box = await figure.locator('.live-frame').boundingBox();
          assert(box && box.width <= 353 && Math.abs(box.width - box.height) <= 2);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          const slider = await figure.locator('input[type="range"]').first().boundingBox();
          assert(slider && slider.width >= 200);
          await figure
            .locator('input[type="range"]')
            .first()
            .evaluate((input) => {
              input.value = String(
                Number(input.min) + (Number(input.max) - Number(input.min)) * 0.73,
              );
              input.dispatchEvent(new Event('input', { bubbles: true }));
            });
          await tick(page);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: path.join(shots, `${name}-${width}-${locale ? 'ko' : 'en'}-${colorScheme}.png`),
          });
          measurements.push({
            name,
            viewport: width,
            locale: locale || 'en',
            theme: colorScheme,
            canvas: box,
            slider: slider.width,
          });
          await page.close();
        }
      }
    }
  }

  // Every page remains useful with scripts disabled: the same program has a real captured
  // frame, its bounds are visible, and the mathematical explanation is server-rendered.
  const fallback = await localPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 1000 },
  });
  for (const demo of FUNCTION_DEMOS) {
    await fallback.goto(`${server.url}/ko/reference/functions/${demo.name}/`);
    const figure = fallback.locator(`[data-live-id="reference-function-${demo.name}"]`);
    const image = figure.locator('.live-frame img');
    await image.scrollIntoViewIfNeeded();
    await image.waitFor({ state: 'visible' });
    await image.evaluate((node) => node.decode());
    assert((await image.getAttribute('src')).endsWith(`${demo.name}.webp`));
    assert((await fallback.locator('.api-summary').innerText()).length > 0);
  }
  await fallback.close();
  await writeFile(path.join(shots, 'measurements.json'), JSON.stringify(measurements, null, 2));
  console.log(
    `[function-demos] ${FUNCTION_DEMOS.length} functions, ${layoutsOnly ? 'layout review' : 'both backends'}, ${measurements.length} layout screenshots and script-free fallback passed`,
  );
  console.log(
    `[function-demos] third-party requests excluded: ${[...externalHosts].join(', ') || 'none'}`,
  );
} finally {
  await browser.close();
  server.close();
}
