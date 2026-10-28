// Browser integration regression for the MNIST lab, using *official SHA-256 verified* IDX
// bytes delivered locally to Chromium. All TypeShade WebGPU/WebGL2 math is real.
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { parseIdx } from '../vendor/shader-dsl/journeys/mnist/idx.mjs';
import {
  referenceTrain,
  reference,
  referencePredict,
} from '../vendor/shader-dsl/journeys/mnist/reference.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = 39000 + Math.floor(Math.random() * 1000);

// Always exercise the original official MNIST dataset with known SHA-256 hashes.
// The browser itself verifies the same checksums a second time before parsing IDX.
const officialSha256 = {
  'train-images-idx3-ubyte.gz': '440fcabf73cc546fa21475e81ea370265605f56be210a4024d2ca8f203523609',
  'train-labels-idx1-ubyte.gz': '3552534a0a558bbed6aed32b30c495cca23d567ec52cac8be1a0730e8010255c',
  't10k-images-idx3-ubyte.gz': '8d422c7b0a1c1c79245a5bcf07fe86e33eeafee792b84584aec276f5a2dbc4e6',
  't10k-labels-idx1-ubyte.gz': 'f7ae60f92e00ec6debd23a6088c31dbd2371eca3ffa0defaefb259924204aec6',
};
const paths = new Map();
for (const [name, expected] of Object.entries(officialSha256)) {
  const data = execFileSync(
    'curl',
    [
      '--fail',
      '--silent',
      '--show-error',
      '--location',
      '--retry',
      '2',
      'https://storage.googleapis.com/cvdf-datasets/mnist/' + name,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  const digest = createHash('sha256').update(data).digest('hex');
  if (digest !== expected) throw new Error('Official MNIST checksum mismatch: ' + name);
  paths.set(name, data);
}

// Independent double-precision oracle uses the exact same official samples/seed.
const training = parseIdx(
  gunzipSync(paths.get('train-images-idx3-ubyte.gz')),
  gunzipSync(paths.get('train-labels-idx1-ubyte.gz')),
  128,
);
const testing = parseIdx(
  gunzipSync(paths.get('t10k-images-idx3-ubyte.gz')),
  gunzipSync(paths.get('t10k-labels-idx1-ubyte.gz')),
  64,
);
const epochs = 2;
const expectedModel = referenceTrain(training, { epochs, batchSize: 16, rate: 0.1, seed: 123 });
let expectedLoss = 0;
let expectedCorrect = 0;
for (let at = 0; at < testing.labels.length; at += 16) {
  const metrics = reference(testing, expectedModel, at, Math.min(16, testing.labels.length - at));
  expectedLoss += metrics.stats[0] * Math.min(16, testing.labels.length - at);
  expectedCorrect += metrics.stats[1];
}
expectedLoss /= testing.labels.length;
const expectedAccuracy = expectedCorrect / testing.labels.length;

async function assertEpochInput(page) {
  const input = page.locator('[data-epochs]');
  assert.equal(await input.getAttribute('type'), 'number');
  assert.equal(await input.getAttribute('min'), '1');
  assert.equal(await input.getAttribute('max'), '100');
  assert.equal(await input.getAttribute('step'), '1');
  assert.equal(await input.inputValue(), '3');
  const describedBy = (await input.getAttribute('aria-describedby')).split(' ');
  for (const id of describedBy) assert.equal(await page.locator('#' + id).count(), 1);
}

async function assertInvalidEpochs(page, downloads) {
  const before = await page.locator('[data-results]').innerHTML();
  const curves = await page.locator('[data-learning]').innerHTML();
  const probability = await page.locator('[data-probabilities]').innerHTML();
  const requestCount = downloads();
  const words = await page
    .locator('[data-mnist-trainer]')
    .evaluate((el) => JSON.parse(el.dataset.copy));
  for (const invalid of ['', '0', '-1', '1.5', '101', 'Infinity', 'NaN', '1e309']) {
    await page.locator('[data-epochs]').evaluate((el, value) => {
      // Number inputs sanitize nonnumeric/nonfinite text to an empty string.
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, invalid);
    await page.locator('[data-start]').click();
    assert.equal(await page.locator('[data-epochs]').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('[data-epochs-error]').isVisible(), true);
    assert.equal(await page.locator('[data-epochs-error]').innerText(), words.epochsError);
    assert.equal(await page.locator('[data-results]').innerHTML(), before);
    assert.equal(await page.locator('[data-learning]').innerHTML(), curves);
    assert.equal(await page.locator('[data-probabilities]').innerHTML(), probability);
    assert.equal(downloads(), requestCount, 'Invalid epochs started a dataset download');
    assert.equal(await page.locator('[data-cancel]').isDisabled(), true);
  }
  await page.locator('[data-epochs]').fill(String(epochs));
  assert.equal(await page.locator('[data-epochs]').getAttribute('aria-invalid'), 'false');
  assert.equal(await page.locator('[data-epochs-error]').isVisible(), false);
}

async function watchTraining(page) {
  await page.evaluate(() => {
    window.mnistObservations = [];
    const root = document.querySelector('[data-mnist-trainer]');
    new MutationObserver(() => {
      const progress = root.querySelector('[data-progress]');
      if (progress.value > 0 && progress.value < progress.max) {
        window.mnistObservations.push({
          value: progress.value,
          max: progress.max,
          disabled: root.querySelector('[data-epochs]').disabled,
          controlsLocked: [
            'data-start',
            'data-tier',
            'data-count',
            'data-clear',
            'data-sample',
          ].every((name) => root.querySelector('[' + name + ']').disabled),
          phase: root.querySelector('[data-learning-phase]').textContent,
          batch: root.querySelector('[data-training-batch]').textContent,
          evaluation: root.querySelector('[data-evaluation-batch]').textContent,
          loss: root.querySelector('[data-loss-chart]').innerHTML,
        });
      }
    }).observe(root, { attributes: true, childList: true, subtree: true, characterData: true });
  });
}

async function assertTraining(page, samples, count) {
  const progress = await page
    .locator('[data-progress]')
    .evaluate((el) => ({ value: el.value, max: el.max }));
  assert.deepEqual(progress, { value: samples * count, max: samples * count });
  const observed = await page.evaluate(() => window.mnistObservations);
  assert(observed.length > 1, 'No intermediate batch progress was observable');
  assert(observed.every((item) => item.max === samples * count && item.disabled));
  assert(
    observed.every((item) => item.controlsLocked),
    'Training left a mutable control unlocked',
  );
  assert(new Set(observed.map((item) => item.value)).size > 1, 'Batch progress did not advance');
  assert(
    observed.some((item) => item.phase && item.batch),
    'Training process has no live explanation',
  );
  assert(
    observed.some((item) => item.batch.includes('8/8')),
    'Training batch count did not reach the selected sample count',
  );
  assert(
    observed.some((item) => item.evaluation.includes('4/4')),
    'Evaluation batch count did not reach the test sample count',
  );
  assert(
    observed.some((item) => item.loss.includes('data-epoch')),
    'No live chart appeared before training finished',
  );
  assert.equal(await page.locator('[data-results] > li').count(), count);
  assert.equal(await page.locator('[data-epochs]').isDisabled(), false);
  assert.equal(await page.locator('[data-cancel]').isDisabled(), true);
  const words = await page
    .locator('[data-mnist-trainer]')
    .evaluate((el) => JSON.parse(el.dataset.copy));
  const rows = await page.locator('[data-results] > li').allInnerTexts();
  for (const [chart, metric] of [
    ['loss', words.loss],
    ['accuracy', words.testAccuracy],
  ]) {
    const values = await page
      .locator('[data-' + chart + '-chart] circle[data-epoch]')
      .evaluateAll((points) =>
        points.map((point) => ({
          epoch: Number(point.dataset.epoch),
          value: Number(point.dataset.value),
        })),
      );
    assert.equal(values.length, count, chart + ' chart did not reset or missed an epoch');
    assert.equal(
      (await page.locator('[data-' + chart + '-chart] polyline').getAttribute('points'))
        .trim()
        .split(/\s+/).length,
      count,
    );
    values.forEach((point, i) => {
      assert.equal(point.epoch, i + 1);
      assert(Number.isFinite(point.value));
      const displayed = new RegExp(metric + ' ([0-9.]+)').exec(rows[i]);
      assert(displayed, 'Chart metric is absent from its epoch row');
      const normalized = chart === 'accuracy' ? Number(displayed[1]) / 100 : Number(displayed[1]);
      assert(
        Math.abs(point.value - normalized) < 0.001,
        'Chart does not plot the measured epoch metric',
      );
    });
  }
}

const server = await serveDist(dist, port);
let browser;
try {
  browser = await launchChromium();
  for (const { tier, locale } of [
    { tier: 'webgpu', locale: 'en' },
    { tier: 'webgl2', locale: 'en' },
    { tier: 'webgpu', locale: 'ko' },
  ]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let downloads = 0;
    await page.route('**/storage/v1/b/cvdf-datasets/o/**', async (route) => {
      downloads++;
      const objectPath = decodeURIComponent(new URL(route.request().url()).pathname);
      const name = objectPath.split('/').at(-1);
      const bytes = paths.get(name);
      if (!bytes) {
        await route.abort();
        return;
      }
      await route.fulfill({
        status: 200,
        body: bytes,
        contentType: 'application/octet-stream',
        headers: { 'access-control-allow-origin': '*' },
      });
    });
    await page.goto(server.url + (locale === 'ko' ? '/ko' : '') + '/guide/mnist/');
    const words = await page
      .locator('[data-mnist-trainer]')
      .evaluate((el) => JSON.parse(el.dataset.copy));
    assert.equal(await page.locator('#mnist-epochs-help').innerText(), words.epochsHelp);
    assert((await page.locator('[data-mnist-trainer]').innerText()).includes(words.resourceNote));
    if (locale === 'ko') {
      assert(/[가-힣]/.test(words.epochsError));
      assert(/[가-힣]/.test(words.resourceNote));
      assert(/[가-힣]/.test(await page.locator('[data-learning]').innerText()));
    }
    await assertEpochInput(page);
    await assertInvalidEpochs(page, () => downloads);
    await watchTraining(page);
    // The lab teaches the authored TypeShade program, including host dispatches.
    const preview = await page.locator('[data-mnist-code-preview] pre').innerText();
    if (!preview.includes('export function forward') || !preview.includes('weights[p * 10 + c]'))
      throw new Error('MNIST live lab does not explain the real forward kernel');
    const walkthrough = page.locator('[data-mnist-walkthrough]');
    if ((await walkthrough.count()) !== 1)
      throw new Error('MNIST step-by-step explanation is missing');
    for (const name of [
      'setup',
      'forward',
      'objective',
      'backward',
      'update',
      'reduce',
      'predict',
    ]) {
      const step = walkthrough.locator('[data-mnist-code-step="' + name + '"]');
      if (
        (await step.count()) !== 1 ||
        !(await step.locator('pre').innerText()).includes(
          name === 'setup' ? '"use typeshade"' : 'export function ' + name,
        )
      )
        throw new Error('MNIST guided code stage missing: ' + name);
      if (!(await step.locator('p').count()))
        throw new Error('MNIST guided code stage lacks explanation: ' + name);
    }
    const hostExcerpt = await walkthrough.innerText();
    if (
      !hostExcerpt.includes('trainBatch') ||
      !hostExcerpt.includes('predict') ||
      !hostExcerpt.includes('setBatch')
    )
      throw new Error('MNIST guided walkthrough lacks real host execution code');
    // The exact TypeShade source must be accessible on the lab itself.
    const sourcePanel = page.locator('[data-mnist-source]');
    if ((await sourcePanel.count()) !== 1)
      throw new Error('MNIST lab does not display the TypeShade source panel');
    await sourcePanel.locator('summary').click();
    const displayedSource = await sourcePanel.locator('pre').innerText();
    for (const part of [
      '"use typeshade"',
      'export function forward',
      'export function objective',
      'export function backward',
      'export function update',
      'export function predict',
    ]) {
      if (!displayedSource.includes(part))
        throw new Error('MNIST source panel is missing real compute code: ' + part);
    }
    const sourceHref = await sourcePanel
      .locator('a[href*="softmax.shade.ts"]')
      .getAttribute('href');
    if (!sourceHref?.includes('/blob/'))
      throw new Error('MNIST source panel lacks a pinned GitHub source link');
    await sourcePanel.locator('summary').click();
    await page.locator('[data-tier]').selectOption(tier);
    await page.locator('[data-count]').selectOption('128');
    await page.locator('[data-epochs]').fill(String(epochs));
    await page.locator('[data-start]').click();
    await page.waitForFunction(
      (words) => {
        const status = document.querySelector('[data-status]')?.textContent ?? '';
        return status.startsWith(words.completed) || status.startsWith(words.error);
      },
      words,
      { timeout: 360_000 },
    );
    const status = await page.locator('[data-status]').innerText();
    if (!status.startsWith(words.completed) || !status.includes(tier)) {
      throw new Error(tier + ' did not train through the requested TypeShade backend: ' + status);
    }
    const rows = await page.locator('[data-results] > li').allInnerTexts();
    await assertTraining(page, 128, epochs);
    if (
      rows.length !== epochs ||
      !rows.at(-1).includes(words.testAccuracy) ||
      !rows.at(-1).includes(words.loss)
    )
      throw new Error(tier + ' produced no measured test metrics: ' + rows.join(' | '));
    const report = new RegExp(
      words.testAccuracy + ' ([0-9.]+)%, ' + words.loss + ' ([0-9.]+)',
    ).exec(rows.at(-1));
    if (
      !report ||
      Math.abs(Number(report[1]) / 100 - expectedAccuracy) > 0.0025 ||
      Math.abs(Number(report[2]) - expectedLoss) > 0.015
    )
      throw new Error(
        tier +
          ' diverged from independent MNIST f64 reference: ' +
          rows.at(-1) +
          ', expected accuracy=' +
          expectedAccuracy +
          ', loss=' +
          expectedLoss,
      );
    await page.locator('[data-sample]').click();
    await page.waitForFunction(
      () => document.querySelectorAll('[data-probabilities] > li').length === 10,
    );
    const prediction = await page.locator('[data-guess]').innerText();
    if (!prediction.startsWith(words.prediction) || errors.length > 0)
      throw new Error(
        tier + ' inference failed: ' + prediction + ', errors: ' + errors.join(' / '),
      );
    const probabilitySum = await page
      .locator('[data-probabilities] meter')
      .evaluateAll((elements) => elements.reduce((sum, el) => sum + el.value, 0));
    if (Math.abs(probabilitySum - 1) > 0.0002)
      throw new Error(tier + ' probability sum mismatch: ' + probabilitySum);
    await page.locator('[data-sample]').click();
    await page.locator('[data-sample]').click();
    await page.waitForFunction(
      () => document.querySelectorAll('[data-probabilities] > li').length === 10,
    );
    // The UI issues two predictions quickly. Only the final image may be shown.
    const finalIndex = 3;
    const expected = referencePredict(reference(testing, expectedModel, finalIndex, 1).logits);
    await page.waitForFunction(
      ({ predicted, probability, label }) => {
        const text = document.querySelector('[data-guess]')?.textContent ?? '';
        const match = new RegExp(label + ' ([0-9]+) \\(([0-9.]+)%\\)').exec(text);
        return (
          match &&
          Number(match[1]) === predicted &&
          Math.abs(Number(match[2]) / 100 - probability) < 0.002
        );
      },
      {
        predicted: expected.predicted,
        probability: expected.probabilities[expected.predicted],
        label: words.prediction,
      },
      { timeout: 30_000 },
    );
    await assertInvalidEpochs(page, () => downloads);
    console.log(
      '[mnist] REAL MNIST ' +
        locale +
        '/' +
        tier +
        ': ' +
        status +
        '; ' +
        rows.at(-1) +
        '; ' +
        prediction,
    );
    if (tier === 'webgpu' && locale === 'en') {
      // Verify the drawing path submits fresh pixels to the GPU inference stage.
      await page.locator('[data-clear]').click();
      const square = await page.locator('[data-draw]').boundingBox();
      if (!square) throw new Error('MNIST drawing canvas has no bounding box');
      const x = square.x + square.width * 0.5;
      await page.mouse.move(x, square.y + square.height * 0.2);
      await page.mouse.down();
      await page.mouse.move(x, square.y + square.height * 0.8, { steps: 8 });
      await page.mouse.up();
      await page.waitForFunction(
        () =>
          (document.querySelector('[data-guess]')?.textContent ?? '').startsWith('Prediction:') &&
          document.querySelectorAll('[data-probabilities] > li').length === 10,
        undefined,
        { timeout: 30_000 },
      );

      // Cancel during training, release the old session, then retrain from seed.
      await page.locator('[data-count]').selectOption('1024');
      await page.locator('[data-epochs]').fill('100');
      await page.locator('[data-start]').click();
      await page.waitForFunction(
        () => {
          const progress = document.querySelector('[data-progress]');
          return progress.max === 102400 && progress.value > 0 && progress.value < progress.max;
        },
        undefined,
        { timeout: 60_000 },
      );
      const remainedLocked = await page.locator('[data-cancel]').evaluate((el) => {
        el.click();
        return (
          document.querySelector('[data-epochs]').disabled &&
          document.querySelector('[data-start]').disabled
        );
      });
      assert.equal(remainedLocked, true, 'Cancellation unlocked controls before cleanup');
      await page.waitForFunction(
        () =>
          (document.querySelector('[data-status]')?.textContent ?? '').startsWith(
            'Training cancelled',
          ),
        undefined,
        { timeout: 60_000 },
      );
      assert.equal(await page.locator('[data-epochs]').isDisabled(), false);
      const cancelledProgress = await page
        .locator('[data-progress]')
        .evaluate((el) => ({ value: el.value, max: el.max }));
      assert(cancelledProgress.value > 0 && cancelledProgress.value < cancelledProgress.max);
      assert.equal(await page.locator('[data-sample]').isDisabled(), true);
      await page.locator('[data-count]').selectOption('128');
      await page.locator('[data-epochs]').fill(String(epochs));
      await page.evaluate(() => {
        window.mnistObservations = [];
      });
      await page.locator('[data-start]').click();
      await page.waitForFunction(
        () => {
          const status = document.querySelector('[data-status]')?.textContent ?? '';
          return status.startsWith('Training finished') || status.startsWith('Unable to run MNIST');
        },
        undefined,
        { timeout: 120_000 },
      );
      const restarted = await page.locator('[data-status]').innerText();
      if (!restarted.startsWith('Training finished'))
        throw new Error('MNIST restart failed: ' + restarted);
      await assertTraining(page, 128, epochs);
      assert.deepEqual(
        await page.locator('[data-results] > li').allInnerTexts(),
        rows,
        'Restart did not recreate the seeded model',
      );
      console.log('[mnist] drawing and cancel/restart validated on WebGPU');

      // A fresh page cannot reuse the in-memory IDX cache. Keep download requests
      // pending and prove cancellation aborts fetch without needing a response.
      const downloading = await browser.newPage();
      let releaseDownloads;
      const stalled = new Promise((resolve) => {
        releaseDownloads = resolve;
      });
      let requested = 0;
      await downloading.route('**/storage/v1/b/cvdf-datasets/o/**', async (route) => {
        requested++;
        await stalled;
        await route.abort().catch(() => {});
      });
      try {
        await downloading.goto(server.url + '/guide/mnist/');
        await downloading.locator('[data-epochs]').fill('100');
        const downloadRequest = downloading.waitForRequest('**/storage/v1/b/cvdf-datasets/o/**');
        await downloading.locator('[data-start]').click();
        await downloadRequest;
        await downloading.waitForFunction(() =>
          document.querySelector('[data-status]').textContent.startsWith('Downloading'),
        );
        assert.equal(await downloading.locator('[data-epochs]').isDisabled(), true);
        await downloading.locator('[data-cancel]').click();
        await downloading.waitForFunction(() =>
          document.querySelector('[data-status]').textContent.startsWith('Training cancelled'),
        );
        assert(requested > 0, 'Download cancellation never reached the network');
        assert.equal(await downloading.locator('[data-start]').isDisabled(), false);
        assert.equal(await downloading.locator('[data-epochs]').isDisabled(), false);
        assert.equal(await downloading.locator('[data-results] > li').count(), 0);
        assert.equal(await downloading.locator('[data-loss-chart] circle').count(), 0);
        console.log('[mnist] cancellation during stalled dataset download validated');
      } finally {
        releaseDownloads();
        await downloading.close();
      }

      // Hidden tabs may never receive animation frames. Simulate that scheduler
      // and exercise the minimum epoch boundary plus cancellation in evaluation.
      const hidden = await browser.newPage();
      await hidden.route('**/storage/v1/b/cvdf-datasets/o/**', async (route) => {
        const name = decodeURIComponent(new URL(route.request().url()).pathname).split('/').at(-1);
        await route.fulfill({
          status: 200,
          body: paths.get(name),
          contentType: 'application/octet-stream',
          headers: { 'access-control-allow-origin': '*' },
        });
      });
      try {
        await hidden.goto(server.url + '/guide/mnist/');
        await hidden.locator('[data-tier]').selectOption('webgpu');
        await hidden.locator('[data-count]').selectOption('128');
        await hidden.locator('[data-epochs]').fill('1');
        await hidden.evaluate(() => {
          window.requestAnimationFrame = () => 1;
          window.cancelAnimationFrame = () => {};
          document.querySelector('[data-start]').click();
        });
        await hidden.waitForFunction(
          () => document.querySelector('[data-status]').textContent.startsWith('Training finished'),
          undefined,
          { polling: 20, timeout: 120_000 },
        );
        assert.equal(await hidden.locator('[data-results] > li').count(), 1);
        assert.equal(await hidden.locator('[data-loss-chart] circle[data-epoch="1"]').count(), 1);
        assert.deepEqual(
          await hidden
            .locator('[data-progress]')
            .evaluate((el) => ({ value: el.value, max: el.max })),
          { value: 128, max: 128 },
        );
        await hidden.locator('[data-epochs]').fill('100');
        await hidden.locator('[data-start]').evaluate((el) => el.click());
        await hidden.waitForFunction(
          () =>
            document.querySelector('[data-learning-phase]').textContent.startsWith('Evaluating'),
          undefined,
          { polling: 10, timeout: 120_000 },
        );
        assert.equal(await hidden.locator('[data-epochs]').isDisabled(), true);
        await hidden.locator('[data-cancel]').evaluate((el) => el.click());
        await hidden.waitForFunction(
          () =>
            document.querySelector('[data-status]').textContent.startsWith('Training cancelled'),
          undefined,
          { polling: 20, timeout: 60_000 },
        );
        assert.equal(await hidden.locator('[data-start]').isDisabled(), false);
        assert.equal(await hidden.locator('[data-epochs]').isDisabled(), false);
        assert.equal(await hidden.locator('[data-sample]').isDisabled(), true);
        console.log(
          '[mnist] minimum1 epoch and evaluation cancellation without animation frames validated',
        );
      } finally {
        await hidden.close();
      }
    }
    if (tier === 'webgpu' && locale === 'en') {
      // Verify CORS from the visitor's browser. Routing official gzip bytes in
      // the deterministic test must not conceal a blocked production download.
      await page.unroute('**/storage/v1/b/cvdf-datasets/o/**');
      const corsOkay = await page.evaluate(async () => {
        const url =
          'https://storage.googleapis.com/storage/v1/b/cvdf-datasets/o/' +
          'mnist%2Ft10k-labels-idx1-ubyte.gz?alt=media';
        const response = await fetch(url, { mode: 'cors' });
        const data = await response.arrayBuffer();
        return response.ok && data.byteLength > 100;
      });
      if (!corsOkay) throw new Error('Official MNIST endpoint did not pass browser CORS check');
    }
    await page.close();
  }
} finally {
  await browser?.close();
  server.close();
}
