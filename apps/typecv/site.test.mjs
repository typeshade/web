import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { Marked, Renderer } from 'marked';
import { prepareMarkedHighlights } from '@typeshade/site-ui/code/highlight';
import {
  assertReviewedSourceRevision,
  selectDocumentationFile,
  typecvSourceUrl,
} from './scripts/doc-overrides.mjs';

const directory = path.resolve(import.meta.dirname, 'dist');
const version = JSON.parse(await readFile(path.join(directory, 'version.json'), 'utf8'));
const fileFor = (pathname) =>
  path.join(directory, pathname.endsWith('/') ? pathname + 'index.html' : pathname);

test('all generated pages render selectable TypeScript code with real tokens', async () => {
  const source = '`const x: number = 2`\n\n```ts\nconst y = 3\n```\n';
  const preparer = new Marked({ gfm: true, async: true });
  const { tokens, highlighted } = await prepareMarkedHighlights(preparer, source);
  const renderer = new Renderer();
  renderer.codespan = ({ text }) => highlighted.get(`inline:${text}`) ?? `<code>${text}</code>`;
  renderer.code = ({ text, lang }) =>
    highlighted.get(`block:${lang}:${text}`) ?? `<pre><code>${text}</code></pre>`;
  const html = new Marked({ gfm: true, renderer }).parser(tokens);
  assert.match(html, /class="ts-inline-code"/);
  assert.match(html, /class="ts-code-block"/);
  assert.doesNotMatch(html, /\[object Promise\]/);
  const snippets = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)].map(([, code]) =>
    code.replace(/<[^>]*>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>'),
  );
  assert.deepEqual(snippets, ['const x: number = 2', 'const y = 3']);
});

test('all generated pages check documentation override guards and source URLs', async () => {
  const app = path.dirname(directory);
  const docsRoot = path.resolve(app, '../../sources/typecv/docs');
  const overridesRoot = path.join(app, 'docs-overrides');
  const manifest = JSON.parse(
    await readFile(path.join(overridesRoot, 'manifest.json'), 'utf8'),
  );

  for (const relativePath of Object.keys(manifest.overrides)) {
    const selected = await selectDocumentationFile(
      path.join(docsRoot, relativePath),
      path.join(overridesRoot, relativePath),
      relativePath,
      manifest,
    );
    assert.deepEqual(selected, {
      file: path.join(overridesRoot, relativePath),
      edited: true,
    });
  }

  const revision = manifest.sourceRevision;
  assert.doesNotThrow(() => assertReviewedSourceRevision(revision, manifest));
  assert.throws(
    () => assertReviewedSourceRevision(`${revision}-changed`, manifest),
    /source revision changed from reviewed/,
  );
  assert.equal(
    typecvSourceUrl('../README.md', revision),
    `https://github.com/typeshade/typecv/blob/${revision}/README.md`,
  );
  assert.equal(
    typecvSourceUrl('experiments/gpu/pyramid-software.json', revision),
    `https://github.com/typeshade/typecv/blob/${revision}/docs/experiments/gpu/pyramid-software.json`,
  );
  const documentationIndex = await readFile(fileFor('/docs/'), 'utf8');
  assert.ok(
    documentationIndex.includes(`href="${typecvSourceUrl('../README.md', revision)}"`),
  );
  const editedPage = await readFile(fileFor('/docs/sfm-quickstart/'), 'utf8');
  assert.ok(editedPage.includes('This page is an edited website copy.'));
  assert.ok(
    editedPage.includes(`href="${typecvSourceUrl('sfm-quickstart.md', revision)}"`),
  );
  const highlightedDocs = await readFile(fileFor('/docs/gpu-sfm/'), 'utf8');
  assert.match(highlightedDocs, /class="ts-inline-code"/);
  assert.match(highlightedDocs, /class="ts-code-block"/);
  assert.doesNotMatch(highlightedDocs, /\[object Promise\]/);

  const temporary = await mkdtemp(path.join(tmpdir(), 'typecv-doc-override-'));
  try {
    const sourcePath = path.join(temporary, 'source.md');
    const overridePath = path.join(temporary, 'override.md');
    await writeFile(sourcePath, '# Updated upstream source');
    await writeFile(overridePath, '# Website copy');
    await assert.rejects(
      selectDocumentationFile(sourcePath, overridePath, 'source.md', {
        overrides: { 'source.md': { sha256: '0'.repeat(64) } },
      }),
      /source changed/,
    );

    const missingOverride = path.join(temporary, 'missing.md');
    assert.deepEqual(
      await selectDocumentationFile(sourcePath, missingOverride, 'source.md', {
        overrides: {},
      }),
      { file: sourcePath, edited: false },
    );

    const directoryOverride = path.join(temporary, 'directory-override');
    await mkdir(directoryOverride);
    await assert.rejects(
      selectDocumentationFile(sourcePath, directoryOverride, 'source.md', {
        overrides: {},
      }),
      (error) => error.code === 'EISDIR',
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('all generated pages link to real pages, anchors, local runtimes and records', async () => {
  const failures = [];
  for (const route of version.routes) {
    const html = await readFile(fileFor(route), 'utf8');
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, route);
    assert.ok(!/cfat_[a-z0-9]{20,}/i.test(html), 'Credential marker in static content');
    for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const url = new URL(match[1], 'https://cv.typeshade.dev');
      const file = fileFor(decodeURIComponent(url.pathname));
      assert.ok(file.startsWith(directory + path.sep));
      try {
        await access(file);
      } catch {
        failures.push(route + ' → ' + match[1]);
        continue;
      }
      if (url.hash && (url.pathname.endsWith('/') || url.pathname.endsWith('.html'))) {
        const target = await readFile(file, 'utf8');
        if (!target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))
          failures.push(route + ' → ' + match[1]);
      }
    }
  }
  assert.deepEqual(failures, []);
  const runtime = await readFile(path.join(directory, 'runtime/core.js'), 'utf8');
  assert.ok(runtime.includes('verifyImagePair'));
  assert.equal(version.project, 'TypeCV');
});

test('public UI runs real CPU/WebGPU verification, handles missing GPU and fits mobile', async () => {
  const mime = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain',
  };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = fileFor(decodeURIComponent(url.pathname));
    if (!file.startsWith(directory + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const content = await readFile(file);
      res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(await readFile(path.join(directory, '404.html')));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.TYPESHADE_CHROMIUM || undefined,
      args:
        process.env.TYPECV_HARDWARE_GPU === '1'
          ? [
              '--enable-unsafe-webgpu',
              ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
            ]
          : [
              '--enable-unsafe-webgpu',
              '--enable-unsafe-swiftshader',
              '--use-angle=swiftshader',
              '--use-vulkan=swiftshader',
              '--enable-features=Vulkan',
            ],
    });
    const page = await browser.newPage(),
      errors = [],
      requested = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => requested.push(new URL(r.url()).pathname));
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url + '/ko/playground/');
    await page.waitForFunction(() => !!window.__typecvPlayground);
    await page.selectOption('[name=backend]', 'cpu');
    await page.click('#run');
    await page.waitForFunction(() =>
      ['success', 'error', 'rejected'].includes(document.querySelector('#status').dataset.state),
    );
    const cpu = await page.evaluate(() => window.__typecvPlayground.result);
    assert.ok(
      cpu?.backend === 'cpu' && cpu.quality >= 90 && cpu.errorPx < 0.2,
      JSON.stringify(cpu),
    );
    assert.ok(requested.includes('/runtime/core.js'));
    assert.ok(!requested.includes('/runtime/gpu.js'), 'CPU reference must not load TypeShade');
    await page.selectOption('[name=backend]', 'webgpu');
    await page.click('#run');
    await page.waitForFunction(
      () =>
        ['success', 'error', 'rejected'].includes(document.querySelector('#status').dataset.state),
      undefined,
      { timeout: 45000 },
    );
    const gpu = await page.evaluate(() => window.__typecvPlayground.result);
    assert.ok(
      gpu?.backend === 'webgpu' && gpu.quality >= 90 && gpu.errorPx < 0.2,
      JSON.stringify(gpu),
    );
    assert.equal(gpu.computeSubmissions, 1);
    assert.equal(gpu.applicationReadbackBytes, 624 + 4 * 128);
    assert.ok(gpu.dispatches > 0);
    assert.deepEqual(gpu.cpuStages, []);
    await page.locator('.ant-switch').click();
    const mode = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.reload();
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.theme === 'light' ||
        document.documentElement.dataset.theme === 'dark',
    );
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), mode);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/ko/', '/docs/gpu-initialization/', '/ko/playground/', '/ko/lab/']) {
      await page.goto(url + route);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route,
      );
    }
    await page.goto(url + '/lab/');
    assert.ok(await page.locator('input[type=file]').count());
    assert.ok(await page.locator('.ant-input-number-input').count());
    await page.getByRole('button', { name: /Load pyramid video sample/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('.frame-grid img').length === 8);
    await page.getByRole('button', { name: /Run GPU SfM/ }).click();
    await page.waitForFunction(
      () =>
        /completed|Reconstruction failed/.test(
          document.querySelector('.lab-status')?.textContent ?? '',
        ),
      undefined,
      { timeout: 120000 },
    );
    const sfmStatus = await page.locator('.lab-status').textContent();
    assert.match(sfmStatus, /completed/i, sfmStatus);
    await page.waitForSelector('.viewer canvas', { timeout: 15000 });
    assert.ok(await page.locator('.viewer canvas').count());
    const sfmSummary = await page.locator('.sfm-summary').innerText();
    const sfmStages = JSON.parse(await page.locator('.run-details details pre').textContent());
    const boundedStages = sfmStages.filter((stage) =>
      ['pairVerification', 'pnp', 'bundle'].includes(stage.operation),
    );
    assert.ok(boundedStages.length > 0);
    assert.ok(boundedStages.every((stage) => stage.dispatches >= stage.submissions));
    assert.ok(boundedStages.some((stage) => stage.dispatches > stage.submissions));
    assert.equal(sfmStages.find((stage) => stage.operation === 'runTotal').reusedDevice, false);
    // A successful job keeps its worker/device so the next job can reuse compiled pipelines.
    assert.equal(page.workers().length, 1);
    const retainedWorker = page.workers()[0];
    await page.getByRole('button', { name: /Run GPU SfM/ }).click();
    await page.waitForFunction(
      () =>
        /completed|Reconstruction failed/.test(
          document.querySelector('.lab-status')?.textContent ?? '',
        ),
      undefined,
      { timeout: 120000 },
    );
    assert.match(await page.locator('.lab-status').textContent(), /completed/i);
    assert.equal(page.workers()[0], retainedWorker);
    assert.equal(page.workers().length, 1);
    const repeatedStages = JSON.parse(await page.locator('.run-details details pre').textContent());
    assert.equal(repeatedStages.find((stage) => stage.operation === 'runTotal').reusedDevice, true);

    const prepared = await page.evaluate(async () => {
      const frames = [];
      for (const [id, image] of [...document.querySelectorAll('.frame-grid img')].entries()) {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        frames.push({
          id,
          width: canvas.width,
          height: canvas.height,
          time: id,
          image: canvas.toDataURL('image/png'),
        });
      }
      return {
        format: 'typecv-sfm-video-v1',
        source: {
          name: '32k-input.mkv',
          width: 32768,
          height: Math.round((32768 * frames[0].height) / frames[0].width),
          duration: 8,
          fps: 1,
        },
        frames,
      };
    });
    await page.locator('input[type=file]').setInputFiles({
      name: '32k-input.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(prepared)),
    });
    await page.getByRole('button', { name: /Prepare analysis frames/ }).click();
    await page.waitForFunction(() =>
      /analysis frames are ready/.test(document.querySelector('.lab-status')?.textContent ?? ''),
    );
    assert.match(await page.locator('.lab-panel').innerText(), /Source 32768/);
    assert.equal(await page.locator('.frame-grid img').count(), 8);
    assert.equal(page.workers().length, 0, 'changing input terminates the retained worker');
    if (process.env.TYPECV_SITE_SCREENSHOTS) {
      await mkdir(process.env.TYPECV_SITE_SCREENSHOTS, { recursive: true });
      await page.goto(url + '/ko/');
      await page.screenshot({
        path: path.join(process.env.TYPECV_SITE_SCREENSHOTS, 'mobile.png'),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: path.join(process.env.TYPECV_SITE_SCREENSHOTS, 'desktop.png'),
        fullPage: true,
      });
    }
    const unavailable = await browser.newPage();
    await unavailable.addInitScript(() =>
      Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }),
    );
    await unavailable.goto(url + '/playground/');
    await unavailable.click('#run');
    await unavailable.waitForFunction(
      () => document.querySelector('#status').dataset.state === 'error',
    );
    assert.equal(await unavailable.locator('[name=backend]').inputValue(), 'webgpu');
    assert.equal(await unavailable.evaluate(() => window.__typecvPlayground.result), undefined);
    assert.match(await unavailable.locator('#status').textContent(), /WebGPU is unavailable/);
    const missing = await page.goto(url + '/missing-route/');
    assert.equal(missing.status(), 404);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ cpu, gpu, sfmStatus, sfmSummary, pages: version.routes.length }));
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
