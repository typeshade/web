// Nullable values through the built Playground and its language worker.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

const server = await serveDist(path.resolve('dist'), 9189);
const browser = await launchChromium();
try {
  const source = readFileSync('vendor/shader-dsl/examples/null-values.shade.ts', 'utf8');
  for (const locale of ['', '/ko']) {
    for (const backend of ['webgpu', 'webgl2']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      if (process.env.PLAYGROUND_MONACO_VIA_NODE === '1') {
        await page.route('https://cdn.jsdelivr.net/**', async (route) => {
          try {
            const response = await fetch(route.request().url());
            return route.fulfill({
              status: response.status,
              headers: {
                'content-type': response.headers.get('content-type') ?? 'text/javascript',
              },
              body: Buffer.from(await response.arrayBuffer()),
            });
          } catch {
            return route.abort();
          }
        });
      }
      await page.goto(`${server.url}${locale}/playground/#example=null-values&backend=${backend}`);
      await page.waitForFunction(() => window.monaco?.editor.getModels().length > 0);
      await page.waitForFunction(
        (wanted) =>
          document.querySelector('[data-gpu-canvas]')?.getAttribute('data-backend') === wanted,
        backend,
        { timeout: 90_000 },
      );
      assert.equal(await page.locator('[data-diagnostics] .error').count(), 0);
      const displayed = await page.evaluate(() => window.monaco.editor.getModels()[0].getValue());
      assert.ok(displayed.includes('f32 | null'));
      await page.waitForFunction(
        () => (document.querySelector('[data-gpu-canvas]')?.__shader?.frames ?? 0) > 0,
      );
      const frame = await page.locator('[data-gpu-canvas]').screenshot();
      const { data, info } = await sharp(frame)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (const [fraction, channel] of [
        [1 / 6, 0],
        [1 / 2, 1],
        [5 / 6, 2],
      ]) {
        const offset =
          (Math.floor(info.height / 2) * info.width + Math.floor(info.width * fraction)) *
          info.channels;
        const rgb = Array.from(data.subarray(offset, offset + 3));
        assert.ok(
          rgb[channel] > 150 && rgb.every((value, index) => index === channel || value < 100),
          `${backend} band ${channel}: ${rgb}`,
        );
      }
      // A real mistake must be visible, then disappear after the source is repaired.
      const bad = `"use typeshade";\nfunction gain(value: f32 | null | undefined): f32 { return value * 2.; }\n@fragment export function main(@location(0) uv: vec2): vec4 { return vec4(uv, gain(null), 1.); }`;
      await page.evaluate((text) => window.monaco.editor.getModels()[0].setValue(text), bad);
      await page.waitForFunction(() =>
        /TS8003/.test(document.querySelector('[data-diagnostics]')?.textContent ?? ''),
      );
      const diagnostics = await page.locator('[data-diagnostics]').innerText();
      assert.doesNotMatch(diagnostics, /TS18047|TS18049|TS2531|TS2533/);
      await page.evaluate((text) => window.monaco.editor.getModels()[0].setValue(text), source);
      await page.waitForFunction(
        () => document.querySelectorAll('[data-diagnostics] .error').length === 0,
      );
      console.log(
        `nullable Playground: ${locale || '/en'} ${backend}, accepted, refused and repaired`,
      );
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
