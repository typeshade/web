// Nullable values through the built Playground and its language worker.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

const server = await serveDist(path.resolve('dist'), 9189);
const browser = await launchChromium();
try {
  const source = readFileSync('vendor/shader-dsl/examples/null-values.shade.ts', 'utf8');
  for (const locale of ['', '/ko']) {
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
    await page.goto(`${server.url}${locale}/playground/#example=null-values`);
    await page.waitForFunction(() => window.monaco?.editor.getModels().length > 0);
    // The example's fragment entry reads its vertex entry's `uv`, which no host can call yet
    // (Rule 8.24), so the Result tab draws no picture and says why
    // (docs/playground-one-runtime.md, Decision 1). The compile still has to accept it.
    await page.waitForFunction(
      () => {
        const root = document.querySelector('[data-playground]');
        return root?.dataset.result === 'none' && root.classList.contains('has-output');
      },
      undefined,
      { timeout: 90_000 },
    );
    assert.ok(await page.locator('[data-result-none]').isVisible());
    assert.equal(await page.locator('[data-diagnostics] .error').count(), 0);
    const displayed = await page.evaluate(() => window.monaco.editor.getModels()[0].getValue());
    assert.ok(displayed.includes('f32 | null'));
    // A real mistake must be visible, then disappear after the source is repaired.
    const bad = `"use typeshade";\nfunction gain(value: f32 | null | undefined): f32 { return value * 2.; }\nexport const main = fragment(function main(uv: location<0, vec2>): vec4 { return vec4(uv, gain(null), 1.); });`;
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
    console.log(`nullable Playground: ${locale || '/en'}, accepted, refused and repaired`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
