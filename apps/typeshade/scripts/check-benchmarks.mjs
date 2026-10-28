// End-to-end instrument check: real WGSL, Run authorization and local Wrangler D1.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { launchChromium } from './playwright.mjs';
import { checkRegressions } from './check-regressions.mjs';

const scratch = mkdtempSync(path.join(tmpdir(), 'typeshade-benchmarks-'));
const port = 40000 + Math.floor(Math.random() * 2000);
const url = `http://127.0.0.1:${port}`;
const wrangler = 'node_modules/wrangler/bin/wrangler.js';
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
execFileSync(
  'node',
  [wrangler, 'd1', 'migrations', 'apply', 'typeshade', '--local', '--persist-to', scratch],
  { env, stdio: 'pipe' },
);
const server = spawn(
  'node',
  [
    wrangler,
    'dev',
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    String(port),
    '--persist-to',
    scratch,
  ],
  { env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] },
);
let logs = '';
server.stdout.on('data', (s) => {
  logs += s;
});
server.stderr.on('data', (s) => {
  logs += s;
});
let browser;
const catalog = JSON.parse(readFileSync('src/lib/benchmarks/catalog-v1.json', 'utf8'));
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/benchmarks/`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* server starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert(ready, `Local Worker did not start: ${logs.slice(-3000)}`);
  browser = await launchChromium();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let posts = 0;
  let workerLoads = 0;
  page.on('request', (r) => {
    if (r.url().includes('/data/benchmarks/') && r.method() === 'POST') posts++;
    if (/regression\.worker-.*\.js/.test(r.url())) workerLoads++;
  });
  const root = page.locator('[data-benchmarks]');
  const record = async () => JSON.parse(await root.locator('[data-record]').textContent());
  const run = async () => {
    await root.locator('[data-run]').click();
    await page.waitForFunction(
      () => document.querySelector('[data-benchmarks] [data-stop]').disabled,
      {},
      { timeout: 650000 },
    );
    return record();
  };
  await page.goto(`${url}/benchmarks/`);
  assert.equal(await root.count(), 1);
  for (const name of ['run', 'stop', 'submission-notice', 'send', 'profile', 'progress'])
    assert.equal(await root.locator(`[data-${name}]`).count(), 1);
  assert(await root.locator('[data-send]').isDisabled());
  assert.equal(await root.locator('input[type="checkbox"]').count(), 0);
  assert.equal(await root.locator('[data-run]').textContent(), 'Run');
  assert.equal(
    await root.locator('[data-run]').getAttribute('aria-describedby'),
    'benchmark-submission',
  );
  assert.equal(posts, 0);
  assert.equal(workerLoads, 0);
  const first = await run();
  assert.equal(first.status, 'complete', JSON.stringify(first.results.at(-1)));
  assert.equal(first.revision, 'applications-3');
  assert.equal(first.instrument, 'unified-2');
  assert.equal(first.results.length, 60);
  assert(
    first.results.every(
      (r) => r.status === 'passed' && r.corruptionDetected && r.wallMs.length === 3,
    ),
  );
  assert.equal(new Set(first.results.map((r) => `${r.id}:${r.n}:${r.build}`)).size, 60);
  for (const job of catalog.cases)
    assert.equal(first.results.filter((r) => r.id === job.id).length, 2);
  assert.equal(await root.locator('[data-section]:visible').count(), 4);
  assert.equal(await root.locator('[data-case]').count(), 30);
  assert.equal(await root.locator('table').count(), 0);
  await page.waitForFunction(() =>
    document.querySelector('[data-send-status]').textContent.startsWith('Results received.'),
  );
  assert.equal(posts, 1);
  assert(await root.locator('[data-send]').isDisabled());
  assert.equal(first.metadata.webgl.state, 'available');
  for (const id of ['transfer-upload', 'transfer-readback', 'submission-separate'])
    assert(
      first.results
        .filter((r) => r.id === id)
        .every((r) => r.gpuNs === null && r.gpuTiming === 'unsupported'),
    );
  assert(
    first.results.filter((r) => r.id.startsWith('submission-')).every((r) => r.dispatches === 16),
  );
  for (const metric of ['gpu', 'buffers', 'cold', 'readback', 'wall']) {
    await root.locator('[data-metric]').selectOption(metric);
    assert.equal(await root.locator('[data-section]:visible').count(), 4);
    assert.equal(await root.locator('[data-case]').count(), 30);
    if (metric === 'readback') assert.equal(await root.locator('[data-bars]:visible').count(), 1);
  }
  assert.equal(posts, 1);
  assert((await root.locator('[data-send-status]').textContent()).includes(first.id));
  const retry = await page.evaluate(
    async (r) =>
      (
        await fetch('/data/benchmarks/records/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ consent: true, record: r }),
        })
      ).status,
    first,
  );
  assert.equal(retry, 200);
  const invalid = structuredClone(first);
  invalid.digest = 'bad';
  assert.equal(
    await page.evaluate(
      async (r) =>
        (
          await fetch('/data/benchmarks/records/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ consent: true, record: r }),
          })
        ).status,
      invalid,
    ),
    400,
  );
  assert.equal((await fetch(`${url}/data/benchmarks/records/`)).status, 405);
  const downloadPromise = page.waitForEvent('download');
  await root.locator('[data-download]').click();
  const download = await downloadPromise;
  assert(download.suggestedFilename().includes(first.id));
  await download.saveAs(path.join(scratch, 'download.json'));
  assert.deepEqual(JSON.parse(readFileSync(path.join(scratch, 'download.json'), 'utf8')), first);
  mkdirSync('shots/benchmarks', { recursive: true });
  await checkRegressions(page, url);
  // One report and receipt for cancellation; a failed send can retry the same ID.
  await page.goto(`${url}/benchmarks/`);
  await page.route('**/data/benchmarks/records/', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"unavailable"}' }),
  );
  await root.locator('[data-profile]').selectOption('extended');
  const previousPosts = posts;
  await root.locator('[data-run]').click();
  await page.waitForFunction(() => document.querySelector('[data-progress]').value > 0);
  await root.locator('[data-stop]').click();
  await page.waitForFunction(() =>
    document.querySelector('[data-send-status]').textContent.includes('could not be sent'),
  );
  const stopped = await record();
  assert.equal(stopped.status, 'cancelled');
  assert.equal(posts, previousPosts + 1);
  assert.equal(await root.locator('[data-bars]:visible').count(), 0);
  await page.unrouteAll();
  await root.locator('[data-send]').click();
  await page.waitForFunction(() =>
    document.querySelector('[data-send-status]').textContent.startsWith('Results received.'),
  );
  assert((await root.locator('[data-send-status]').textContent()).includes(stopped.id));
  assert.equal(posts, previousPosts + 2);
  // Repeated visual runs use receipts without consuming the collector's hourly quota.
  await page.route('**/data/benchmarks/records/', (route) => {
    const body = route.request().postDataJSON();
    assert.equal(body.consent, true);
    return route.fulfill({ json: { id: body.record.id, receivedAt: new Date().toISOString() } });
  });
  // Both locales and themes render the same four charts at mobile and desktop widths.
  const measurements = [];
  for (const locale of ['', '/ko']) {
    await page.goto(`${url}${locale}/benchmarks/`);
    assert.equal(await root.locator('[data-run]').textContent(), locale ? '실행' : 'Run');
    assert.equal((await run()).status, 'complete');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => delete document.documentElement.dataset.theme);
    assert.equal(
      await root
        .locator("[data-section='data']")
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--section-color').trim()),
      '#b37feb',
    );
    assert.equal(
      await root
        .locator("[data-section='compute']")
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--section-color').trim()),
      '#5cdbd3',
    );
    assert.equal(
      await root
        .locator("[data-section='execution']")
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--section-color').trim()),
      '#ffc069',
    );
    for (const width of [390, 1440])
      for (const theme of ['light', 'dark']) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
          document.documentElement.classList.toggle('dark', value === 'dark');
        }, theme);
        assert.equal(await root.locator('[data-section]:visible').count(), 4);
        assert.equal(await root.locator('table').count(), 0);
        const colors = await root
          .locator('[data-section]')
          .evaluateAll((els) =>
            els.map((el) => getComputedStyle(el).getPropertyValue('--section-color').trim()),
          );
        assert.equal(new Set(colors).size, 4);
        const prefix = `shots/benchmarks/unified-${locale ? 'ko' : 'en'}-${width}-${theme}`;
        await page.screenshot({ path: `${prefix}.png`, fullPage: true });
        await root.locator('[data-results]').screenshot({ path: `${prefix}-charts.png` });
        if (width === 390) await page.locator('.site-menu > summary').click();
        else
          await page
            .locator('.site-lang')
            .first()
            .evaluate((el) => (el.open = true));
        await page.screenshot({ path: `${prefix}-menu.png`, fullPage: true });
        if (width === 390) await page.locator('.site-menu > summary').click();
        else
          await page
            .locator('.site-lang')
            .first()
            .evaluate((el) => (el.open = false));
        const measurement = await page.evaluate(
          ({ locale, width, theme }) => {
            const rect = (selector) => {
              const r = document.querySelector(selector).getBoundingClientRect();
              return { width: r.width, height: r.height };
            };
            return {
              locale,
              width,
              theme,
              document: document.documentElement.scrollWidth,
              heading: document.querySelector('h1').textContent,
              header: rect('.site-header'),
              footer: rect('.site-footer'),
              controls: rect('[data-controls]'),
              run: rect('[data-run]'),
              notice: {
                ...rect('[data-submission-notice]'),
                size: getComputedStyle(document.querySelector('[data-submission-notice]')).fontSize,
                belowButton:
                  document.querySelector('[data-submission-notice]').getBoundingClientRect().top >=
                  document.querySelector('[data-run]').getBoundingClientRect().bottom,
              },
              charts: [...document.querySelectorAll('[data-section]')].map((el) => ({
                section: el.dataset.section,
                width: el.getBoundingClientRect().width,
                height: el.getBoundingClientRect().height,
              })),
            };
          },
          { locale, width, theme },
        );
        assert(measurement.run.height >= 44);
        assert(measurement.notice.belowButton);
        assert.equal(measurement.notice.size, '14px');
        measurements.push(measurement);
      }
  }
  assert(measurements.every((r) => r.document <= r.width));
  assert.deepEqual(errors, []);
  writeFileSync('shots/benchmarks/measurements.json', JSON.stringify(measurements, null, 2));
  writeFileSync('shots/benchmarks/instrument-record.json', JSON.stringify(first, null, 2));
  console.log(
    'unified benchmarks: one run/report, 60 quick / 180 extended checks, four section charts, every original experiment, correctness probes, automatic submission, retry and localized layouts passed.',
  );
} finally {
  await browser?.close();
  if (process.platform === 'win32') server.kill('SIGTERM');
  else {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      /* already stopped */
    }
  }
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once('exit', resolve);
  });
  rmSync(scratch, { recursive: true, force: true });
}
