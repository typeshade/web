// Check standalone learning coverage, safe language-name discovery and compact document views.
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { languageEntries, languageEntryPath } from '../src/lib/language-reference.ts';
import { functionSpellings, directCall } from '../src/lib/function-spellings.ts';
import { functionLessons } from '../src/i18n/function-lessons-en.ts';
import { operationLessons, constructorLesson } from '../src/i18n/operation-lessons-en.ts';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

const baselineOnly = process.argv.includes('--baseline');
const baselineFile = '/tmp/standalone-learning-baseline.json';
const functions = languageEntries().filter((entry) => entry.kind === 'function');
for (const entry of functions)
  assert(
    entry.name in functionLessons ||
      entry.name in operationLessons ||
      constructorLesson(entry.name),
    entry.name,
  );
for (const form of [
  '_private(a)',
  'clamp(a, 0.0, 1.0)',
  'vec2(textureSize(a, b))',
  'unpackHalf2x16(a).x',
])
  assert.equal(directCall(form), undefined, form);
assert.deepEqual(functionSpellings('saturate'), []);
assert(functionSpellings('mix').some((row) => row.name === 'lerp' && row.language === 'HLSL'));
assert(functionSpellings('round').some((row) => row.name === 'roundEven'));
assert(functionSpellings('countOneBits').some((row) => row.name === 'bitCount'));
const concepts = [
  ['bridge', '/guide/typescript-and-webgpu/'],
  ['cpuAndGpu', '/guide/concepts/cpu-and-gpu/'],
  ['pipeline', '/guide/concepts/the-pipeline/'],
  ['webgpuAndWebgl2', '/guide/concepts/webgpu-and-webgl2/'],
  ['wgslAndGlsl', '/guide/concepts/wgsl-and-glsl/'],
];
const queries = [
  ['lerp', 'mix'],
  ['inversesqrt', 'inverseSqrt'],
  ['dFdx', 'dpdx'],
  ['roundEven', 'round'],
  ['bitCount', 'countOneBits'],
  ['floatBitsToUint', 'bitcast'],
  ['texelFetch', 'textureLoad'],
];
const shots = path.resolve('shots/standalone-learning');
await mkdir(shots, { recursive: true });
let baseline: Record<string, number> = {};
if (!baselineOnly)
  try {
    baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
  } catch {}
const server = await serveDist(path.resolve('dist'), 4502);
const browser = await launchChromium();
const widths: Record<string, number> = {},
  searches: unknown[] = [];
let captures = 0;
try {
  for (const locale of ['en', 'ko'])
    for (const width of [1440, 390])
      for (const theme of ['light', 'dark']) {
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
          colorScheme: theme,
        });
        await page.route('**/*', (r: any) =>
          new URL(r.request().url()).origin === server.url ? r.continue() : r.abort(),
        );
        for (const [key, route] of concepts) {
          const id = `${locale}-${width}-${theme}-${key}`;
          assert.equal(
            (await page.goto(`${server.url}${locale === 'en' ? '' : '/ko'}${route}`))?.status(),
            200,
          );
          if (!baselineOnly) {
            assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
            assert.equal(await page.locator('link[rel="alternate"][hreflang="en"]').count(), 1);
            assert.equal(await page.locator('link[rel="alternate"][hreflang="ko"]').count(), 1);
            const schema = JSON.parse(
              await page.locator('script[type="application/ld+json"]').textContent(),
            );
            assert(schema['@graph'].some((item: any) => item['@type'] === 'BreadcrumbList'));
            assert(
              (await page.locator('meta[name="description"]').getAttribute('content'))!.length >=
                70,
            );
          }
          const box = (await page.locator('.docs-content').boundingBox())!;
          widths[id] = box.width;
          if (baseline[id])
            assert(Math.abs(box.width - baseline[id]) < 1, `${id}: document width changed`);
          if (baselineOnly) continue;
          assert.equal(await page.locator(`[data-concept-lesson="${key}"]`).count(), 1);
          for (const anchor of ['learning-use', 'learning-example', 'learning-caveat'])
            assert.equal(await page.locator(`#${anchor}`).count(), 1);
          assert((await page.locator('[data-concept-lesson] pre').count()) > 0);
          assert(await page.locator('.docs-content > p').first().textContent());
          assert(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            id,
          );
          await page.screenshot({ path: path.join(shots, `${id}.png`) });
          captures++;
          if (width === 390) await page.locator('.docs-local > summary').click();
          const nav = page.locator(width === 390 ? '.docs-local > nav' : '.docs-sidebar-in');
          const conceptLink = nav.locator(
            `.sidebar-sections a[href="${locale === 'en' ? '' : '/ko'}${route}"]`,
          );
          await conceptLink.scrollIntoViewIfNeeded();
          assert(await conceptLink.isVisible(), `${id}: concept navigation link is visible`);
          await page.screenshot({ path: path.join(shots, `${id}-menu.png`) });
          captures++;
        }
        if (!baselineOnly)
          for (const [query, name] of queries) {
            const route = languageEntryPath('function', name);
            assert.equal(
              (await page.goto(`${server.url}${locale === 'en' ? '' : '/ko'}${route}`))?.status(),
              200,
            );
            const googleTitle = await page.title();
            assert(googleTitle.length >= 45 && googleTitle.length <= 60);
            assert(googleTitle.includes(name), `${name}: Google title`);
            const discovery = page.locator('[data-function-spellings]');
            assert.equal(await discovery.getAttribute('open'), null, 'names start compact');
            await discovery.locator('summary').click();
            assert((await discovery.textContent()).includes(query));
            const href = await discovery.locator('a').getAttribute('href');
            assert.equal(await page.locator(href).count(), 1, `${name}: disclosure destination`);
            assert(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            );
            await page.screenshot({
              path: path.join(shots, `${locale}-${width}-${theme}-${name}.png`),
            });
            captures++;
            if (width === 1440 && theme === 'light') {
              const results = await page.evaluate(async (query: string) => {
                const pf = await import('/pagefind/pagefind.js');
                const response = await pf.search(query);
                return Promise.all(response.results.slice(0, 10).map((r: any) => r.data()));
              }, query);
              const expected = `${locale === 'en' ? '' : '/ko'}${route}`;
              assert(
                results.some((r: any) => r.url.endsWith(expected)),
                `${locale}: ${query} missing ${expected}`,
              );
              searches.push({
                locale,
                query,
                expected,
                results: results.map((r: any) => ({ url: r.url, title: r.meta.title })),
              });
            }
          }
        await page.close();
      }
  if (baselineOnly) await writeFile(baselineFile, JSON.stringify(widths, null, 2));
  else {
    const page = await browser.newPage({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 1000 },
    });
    for (const [, route] of concepts)
      for (const prefix of ['', '/ko']) {
        await page.goto(`${server.url}${prefix}${route}`);
        assert.equal(await page.locator('#learning-example').isVisible(), true);
        assert.equal(await page.locator('#learning-caveat').isVisible(), true);
      }
    for (const entry of languageEntries().filter(
      (entry) => entry.kind === 'math' && entry.alias?.kind === 'function',
    )) {
      for (const prefix of ['', '/ko']) {
        await page.goto(`${server.url}${prefix}${languageEntryPath('math', entry.name)}`);
        assert.equal(
          await page.locator('[data-canonical-lesson] a').getAttribute('href'),
          `${prefix}${languageEntryPath('function', entry.alias!.name)}`,
        );
      }
    }
    await page.close();
    await writeFile(
      path.join(shots, 'reports.json'),
      JSON.stringify({ functions: functions.length, widths, searches, captures }, null, 2),
    );
  }
  console.log(
    `[standalone-learning] ${functions.length} function lessons; ${Object.keys(widths).length} concept views; ${searches.length} searches; ${captures} screenshots; ${baselineOnly ? 'baseline saved' : 'passed'}`,
  );
} finally {
  await browser.close();
  server.close();
}
