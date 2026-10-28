// Every remaining function has a translated lesson and a script-free worked model.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { languageEntries } from '../src/lib/language-reference.ts';
import { operationModel, modelBits } from '../src/lib/operation-models.ts';
import { operationLessons, constructorLesson } from '../src/i18n/operation-lessons-en.ts';
import {
  operationLessons as korean,
  constructorLesson as koreanConstructor,
} from '../src/i18n/operation-lessons-ko.ts';
import { functionLessons } from '../src/i18n/function-lessons-en.ts';
import { FUNCTION_DEMOS } from '../src/lib/function-demo-catalog.mjs';
import { launchChromium } from './playwright.mjs';
import { serveDist } from './serve-dist.mjs';

const root = process.cwd();
const functions = languageEntries().filter((e) => e.kind === 'function');
const names = functions
  .filter((e) => e.name in operationLessons || constructorLesson(e.name))
  .map((e) => e.name);
assert.equal(names.length + FUNCTION_DEMOS.length + 1, functions.length, 'function coverage');
for (const entry of functions)
  assert(
    entry.name in functionLessons || names.includes(entry.name),
    `${entry.name}: missing lesson`,
  );
for (const name of names) {
  const en = operationLessons[name as keyof typeof operationLessons] ?? constructorLesson(name);
  const ko = korean[name as keyof typeof korean] ?? koreanConstructor(name);
  assert(en && ko, `${name}: missing translation`);
  const model = operationModel(name);
  assert.equal(model?.cases.length, 3, `${name}: three contrasting cases`);
  for (const related of model!.related)
    assert(
      functions.some((e) => e.name === related),
      `${name}: unknown related ${related}`,
    );
}
const shots = path.join(root, 'shots/operation-lessons');
await mkdir(shots, { recursive: true });
const server = await serveDist(path.resolve(root, process.env.OPERATION_DIST ?? 'dist'), 4493);
const browser = await launchChromium();
const allShots = process.argv.includes('--all-screenshots');
const representatives = [
  'textureSample',
  'textureGatherCompare',
  'atomicAdd',
  'atomicCompareExchangeWeak',
  'storageBarrier',
  'reverseBits',
  'pack4x8snorm',
  'mat2x3',
  'vec3i',
  'uniform',
  'dpdxFine',
  'refract',
];
const measurements: unknown[] = [];
let screenshotCount = 0;
try {
  if (process.argv.includes('--accessibility-only')) {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === server.url ? route.continue() : route.abort(),
    );
    let count = 0;
    for (const locale of ['en', 'ko'])
      for (const name of names.filter((name) =>
        operationModel(name)!.cases.some((c) => c.word !== undefined),
      )) {
        await page.goto(
          `${server.url}/${locale === 'en' ? '' : 'ko/'}reference/functions/${name}/`,
          { waitUntil: 'load' },
        );
        const lesson = page.locator('[data-operation-lesson]');
        for (let i = 0; i < 3; i++) {
          const modelCase = lesson.locator('details').nth(i);
          if ((await modelCase.getAttribute('open')) === null)
            await modelCase.locator('summary').click();
          const word = operationModel(name)!.cases[i].word!;
          const diagram = modelCase.getByRole('img');
          assert(
            (await diagram.getAttribute('aria-label'))?.endsWith(modelBits(word)),
            `${name}: binary representation is not named`,
          );
          assert(
            (await modelCase.ariaSnapshot()).includes(modelBits(word)),
            `${name}: binary representation missing from accessibility tree`,
          );
          count++;
        }
      }
    console.log(
      `[operation-lessons] ${count} binary examples expose their complete representation to assistive technology`,
    );
    await page.close();
  } else {
    // No scripts are needed to select, read, or navigate the worked examples.
    async function review(locale: string, width: number, theme: 'light' | 'dark') {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        javaScriptEnabled: false,
        colorScheme: theme,
      });
      await page.route('**/*', (route) =>
        new URL(route.request().url()).origin === server.url ? route.continue() : route.abort(),
      );
      for (const name of names) {
        const response = await page.goto(
          `${server.url}/${locale === 'en' ? '' : 'ko/'}reference/functions/${name}/`,
          { waitUntil: 'load' },
        );
        assert.equal(response?.status(), 200, name);
        const lesson = page.locator(`[data-operation-lesson="${name}"]`);
        assert.equal(await lesson.getAttribute('lang'), locale, name);
        assert.equal(await lesson.locator('details').count(), 3, name);
        const first = lesson.locator('details').nth(0),
          second = lesson.locator('details').nth(1);
        assert.notEqual(await first.getAttribute('open'), null, `${name}: first example open`);
        assert.equal(await second.getAttribute('open'), null, `${name}: second example closed`);
        await second.locator('summary').click();
        assert.notEqual(
          await second.getAttribute('open'),
          null,
          `${name}: native example selection`,
        );
        assert.equal(await first.getAttribute('open'), null, `${name}: examples stay compact`);
        for (let i = 0; i < 3; i++) {
          const modelCase = lesson.locator('details').nth(i);
          await modelCase.locator('summary').focus();
          if ((await modelCase.getAttribute('open')) === null) await page.keyboard.press('Enter');
          const expected = operationModel(name)!.cases[i].output;
          assert.equal(
            await modelCase.locator('[data-model-output]').textContent(),
            expected,
            `${name}: rendered result ${i}`,
          );
          const word = operationModel(name)!.cases[i].word;
          if (word !== undefined)
            assert(
              (await modelCase.getByRole('img').getAttribute('aria-label'))?.endsWith(
                modelBits(word),
              ),
              `${name}: unnamed binary diagram`,
            );
        }
        await first.locator('summary').click();
        const sizes = await page.evaluate(() => {
          const section = document.querySelector('[data-operation-lesson]')!;
          const syntax = document.querySelector('#syntax')!;
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            order: !!(section.compareDocumentPosition(syntax) & Node.DOCUMENT_POSITION_FOLLOWING),
            diagrams: [...section.querySelectorAll('.model-figure')].map((e) => ({
              width: e.getBoundingClientRect().width,
              height: e.getBoundingClientRect().height,
            })),
          };
        });
        assert(
          sizes.overflow <= 1,
          `${name} ${width} ${locale} ${theme}: overflow ${sizes.overflow}`,
        );
        assert(sizes.order, `${name}: lesson must precede compiler syntax`);
        for (const figure of sizes.diagrams)
          assert(figure.width <= 352.5, `${name}: oversized diagram`);
        measurements.push({ name, locale, width, theme, ...sizes });
        if (allShots || representatives.includes(name)) {
          await page.locator('h1').scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(shots, `${name}-${width}-${locale}-${theme}.png`),
          });
          screenshotCount++;
        }
      }
      console.log(
        `[operation-lessons] ${names.length} pages: ${locale}, ${width}, ${theme}, script-free selection and layout passed`,
      );
      await page.close();
    }
    const configurations = ['en', 'ko'].flatMap((locale) =>
      [1440, 390].flatMap((width) =>
        (['light', 'dark'] as const).map((theme) => ({ locale, width, theme })),
      ),
    );
    for (let offset = 0; offset < configurations.length; offset += 4) {
      const results = await Promise.allSettled(
        configurations.slice(offset, offset + 4).map((c) => review(c.locale, c.width, c.theme)),
      );
      for (const result of results) if (result.status === 'rejected') throw result.reason;
    }
  }
  if (measurements.length)
    await writeFile(path.join(shots, 'measurements.json'), JSON.stringify(measurements, null, 2));
  if (measurements.length)
    console.log(
      `[operation-lessons] ${names.length} models, ${functions.length} functions covered, ${screenshotCount} screenshots passed`,
    );
} finally {
  await browser.close();
  server.close();
}
