// Verify the learning page, its explicit rounding model, and the optional WebGL query.
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  precisionExample,
  precisionCalculation,
  roundFraction,
} from '../src/lib/glsl-precision-model.ts';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

assert.equal(roundFraction(1.00048828125, 10), 1, 'tie rounds to even lower neighbour');
assert.equal(roundFraction(1.00146484375, 10), 1.001953125, 'tie rounds to even upper neighbour');
assert.equal(precisionCalculation(1024, 0.25, 10).recovered, 0);
assert.equal(precisionCalculation(1024, 0.25, 23).recovered, 0.25);
for (const base of precisionExample.bases)
  for (let step = 1; step <= 16; step++) {
    assert.equal(precisionCalculation(base, step / 16, 23).recovered, step / 16);
    assert(Number.isFinite(precisionCalculation(base, step / 16, 10).sum));
  }
const root = process.cwd(),
  shots = path.join(root, 'shots/glsl-precision');
await mkdir(shots, { recursive: true });
const server = await serveDist(path.join(root, 'dist'), 4500);
const browser = await launchChromium();
const reports: unknown[] = [],
  searches: unknown[] = [];
const route = '/guide/concepts/glsl-precision/';
async function pageFor(options: Record<string, unknown> = {}) {
  const page = await browser.newPage(options);
  await page.route('**/*', (r: any) =>
    new URL(r.request().url()).origin === server.url ? r.continue() : r.abort(),
  );
  return page;
}
try {
  for (const locale of ['en', 'ko'])
    for (const width of [1440, 390])
      for (const theme of ['light', 'dark']) {
        const page = await pageFor({ viewport: { width, height: 1000 }, colorScheme: theme });
        const errors: string[] = [];
        page.on('pageerror', (error: Error) => errors.push(error.message));
        await page.addInitScript(() => {
          (window as any).__precisionContexts = 0;
          const original = HTMLCanvasElement.prototype.getContext;
          (HTMLCanvasElement.prototype as any).getContext = function (...args: any[]) {
            if (String(args[0]).startsWith('webgl')) (window as any).__precisionContexts++;
            return original.apply(this, args as any);
          };
        });
        const url = `${server.url}${locale === 'en' ? '' : '/ko'}${route}`;
        assert.equal((await page.goto(url))?.status(), 200);
        const widget = page.locator('[data-precision-guide]');
        const labels = JSON.parse(await widget.getAttribute('data-labels'));
        await page.waitForFunction(
          () => !document.querySelector<HTMLFieldSetElement>('[data-precision-controls]')?.disabled,
        );
        assert.equal(
          await page.evaluate(() => (window as any).__precisionContexts),
          0,
          'no automatic WebGL query',
        );
        assert.equal(await page.locator('canvas').count(), 0, 'no visual canvas');
        assert.equal(await widget.locator('[data-precision-coarse-result]').textContent(), '0');
        assert.equal(await widget.locator('[data-precision-fine-result]').textContent(), '0.25');
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
        );
        await page.screenshot({ path: path.join(shots, `page-${width}-${locale}-${theme}.png`) });
        if (width === 390) await page.locator('.docs-local > summary').click();
        const navigation = page.locator(width === 390 ? '.docs-local > nav' : '.docs-sidebar-in');
        const conceptLink = navigation.locator(
          `.sidebar-sections a[href="${locale === 'en' ? '' : '/ko'}${route}"]`,
        );
        await conceptLink.scrollIntoViewIfNeeded();
        assert(await conceptLink.isVisible(), 'GLSL precision navigation link is visible');
        await page.screenshot({ path: path.join(shots, `menu-${width}-${locale}-${theme}.png`) });
        if (width === 390) await page.locator('.docs-local > summary').click();

        await widget.locator('[data-precision-base]').selectOption('0');
        await widget.locator('[data-precision-increment]').evaluate((input: HTMLInputElement) => {
          input.value = '0.75';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        assert.equal(await widget.locator('[data-precision-coarse-result]').textContent(), '0.75');
        assert.equal(await widget.locator('[data-precision-fine-result]').textContent(), '0.75');
        await widget
          .locator('section')
          .first()
          .screenshot({ path: path.join(shots, `model-${width}-${locale}-${theme}.png`) });
        for (const context of ['webgl2', 'webgl']) {
          await widget.locator('[data-precision-context]').selectOption(context);
          await widget.locator('[data-precision-inspect]').click();
          assert.equal(
            await widget.locator('[data-precision-status]').textContent(),
            labels.ready,
            `${context}: context query`,
          );
          assert.equal(await widget.locator('[data-precision-report-body] tr').count(), 6);
          assert.equal(await widget.locator('[data-precision-report] thead').isVisible(), true);
          assert(
            (await widget.locator('[data-precision-report]').boundingBox())!.height < 500,
            'capability report stays compact on mobile',
          );
          const cells = await widget.locator('[data-precision-report-body] tr').allTextContents();
          reports.push({ locale, width, theme, context, rows: cells });
        }
        await widget
          .locator('section')
          .nth(1)
          .screenshot({ path: path.join(shots, `report-${width}-${locale}-${theme}.png`) });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          'report overflow',
        );
        assert.deepEqual(errors, [], 'browser errors');
        if (width === 1440 && theme === 'light') {
          for (const query of [
            'precision highp float',
            'highp mediump',
            ...(locale === 'ko' ? ['정밀도'] : ['WebGL precision']),
          ]) {
            const results = await page.evaluate(async (query: string) => {
              const pagefind = await import('/pagefind/pagefind.js');
              const result = await pagefind.search(query);
              return Promise.all(result.results.slice(0, 10).map((item: any) => item.data()));
            }, query);
            assert(
              results.some((r: any) => r.url.endsWith(`${locale === 'en' ? '' : '/ko'}${route}`)),
              `${locale}: learning page missing from search ${query}`,
            );
            searches.push({
              locale,
              query,
              results: results.map((r: any) => ({ url: r.url, title: r.meta.title })),
            });
          }
        }
        for (const [name, destination, selector] of [
          ['internals', '/guide/internals/glsl-float-precision/', 'aside.guide-note'],
          [
            'languages',
            '/guide/concepts/wgsl-and-glsl/',
            '.docs-content a[href*="concepts/glsl-precision"]',
          ],
          [
            'types',
            '/guide/language/gpu-types/',
            '.docs-content a[href*="concepts/glsl-precision"]',
          ],
        ]) {
          assert.equal(
            (
              await page.goto(`${server.url}${locale === 'en' ? '' : '/ko'}${destination}`)
            )?.status(),
            200,
          );
          await page.locator(selector).first().scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(shots, `${name}-${width}-${locale}-${theme}.png`),
          });
        }
        await page.close();
        console.log(
          `[glsl-precision] ${locale}, ${width}, ${theme}: controls, actual WebGL queries, discovery links and layout passed`,
        );
      }
  for (const locale of ['en', 'ko']) {
    const prefix = locale === 'en' ? '' : '/ko';
    const page = await pageFor({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 1000 },
    });
    await page.goto(`${server.url}${prefix}${route}`);
    assert.equal(await page.locator('[data-precision-base]').isDisabled(), true);
    assert.equal(await page.locator('[data-precision-increment]').isDisabled(), true);
    assert.equal(await page.locator('[data-precision-coarse-result]').textContent(), '0');
    assert.equal(await page.locator('[data-precision-fine-result]').textContent(), '0.25');
    assert.equal(await page.locator('noscript p').isVisible(), true);
    await page.close();
  }
  for (const mode of ['unavailable', 'null', 'unsupported']) {
    const page = await pageFor();
    await page.addInitScript((mode: string) => {
      if (mode === 'unavailable') {
        const original = HTMLCanvasElement.prototype.getContext;
        (HTMLCanvasElement.prototype as any).getContext = function (...args: any[]) {
          return String(args[0]).startsWith('webgl') ? null : original.apply(this, args as any);
        };
      } else
        for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
          const original = type.prototype.getShaderPrecisionFormat;
          type.prototype.getShaderPrecisionFormat = function (stage, tier) {
            if (mode === 'null') return null;
            if (stage === this.FRAGMENT_SHADER && tier === this.HIGH_FLOAT)
              return { rangeMin: 0, rangeMax: 0, precision: 0 } as WebGLShaderPrecisionFormat;
            return original.call(this, stage, tier);
          };
        }
    }, mode);
    await page.goto(`${server.url}/ko${route}`);
    const widget = page.locator('[data-precision-guide]'),
      labels = JSON.parse(await widget.getAttribute('data-labels'));
    await widget.locator('[data-precision-inspect]').click();
    if (mode === 'unsupported')
      assert(
        (await widget.locator('[data-precision-report-body]').textContent()).includes(
          labels.unsupported,
        ),
      );
    else {
      assert.equal(
        await widget.locator('[data-precision-status]').textContent(),
        labels[mode === 'null' ? 'error' : 'unavailable'],
      );
      assert.equal(await widget.locator('[data-precision-report]').isVisible(), false);
    }
    await page.close();
  }
  await writeFile(path.join(shots, 'reports.json'), JSON.stringify({ reports, searches }, null, 2));
  console.log(
    '[glsl-precision] numerical rounding, 8 layouts, WebGL 1/2, 6 search queries, 2 script-free fallbacks and 3 query failure/support cases passed',
  );
} finally {
  await browser.close();
  server.close();
}
