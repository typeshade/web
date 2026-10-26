// public/og.png: a screenshot of the /og/ route at 1200 x 630.
//
// Run: bun run capture:og  (builds with OG_REBASELINE=1 first, then runs this)
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './playwright.mjs';
import { writeHashed } from './artifacts.mjs';
import { serveDist } from './serve-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
if (!existsSync(path.join(dist, 'og/index.html'))) {
  throw new Error(
    `[og] ${dist}/og/index.html is missing; run the build with OG_REBASELINE=1 first.`,
  );
}

const server = await serveDist(dist, Number(process.env.OG_PORT ?? 4471));
const browser = await launchChromium();
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${server.url}/og/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const report = await page.evaluate(() => {
    const card = document.querySelector('[data-og-card]')!.getBoundingClientRect();
    const img = document.querySelector('img') as HTMLImageElement;
    return {
      card: { width: card.width, height: card.height },
      imageLoaded: img.complete && img.naturalWidth > 0,
      sans: document.fonts.check('600 54px "IBM Plex Sans Variable"'),
    };
  });
  const fail = (m: string): never => {
    throw new Error(`[og] ${m}\n  report ${JSON.stringify(report)}`);
  };
  if (report.card.width !== 1200 || report.card.height !== 630) fail('the card is not 1200 x 630');
  if (!report.imageLoaded) fail('the metaballs still did not load; run capture:stills first');
  if (!report.sans) fail('IBM Plex Sans did not load');

  const png = (await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } })) as Buffer;
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 1200 || height !== 630) fail(`the PNG is ${width} x ${height}`);
  if (png.length > 300 * 1024) fail(`${png.length} B exceeds the 300 KB cap`);

  const digest = writeHashed(root, 'og.png', png);
  console.log(
    `public/og.png  ${width} x ${height}  ${png.length} B  sha256 ${digest.slice(0, 16)}`,
  );
} finally {
  await browser.close();
  server.close();
}

rmSync(path.join(dist, 'og'), { recursive: true, force: true });
