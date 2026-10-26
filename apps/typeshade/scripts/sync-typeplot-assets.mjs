// Copy the released font atlas and its notices without importing TypePlot's browser runtime.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.dirname(fileURLToPath(import.meta.resolve('typeplot/shaders')));
const library = path.dirname(dist);
const assets = path.join(dist, 'assets');
const candidates = readdirSync(assets).filter((file) =>
  /^typeplot-font-base-[a-f0-9]+\.png$/.test(file),
);
if (candidates.length !== 1) throw new Error('Expected one released TypePlot base font atlas.');
const atlas = readFileSync(path.join(assets, candidates[0]));
const version = JSON.parse(readFileSync(path.join(library, 'package.json'), 'utf8')).version;
const files = new Map([
  ['font-base.png', atlas],
  ['LICENSE-IBM-Plex.txt', readFileSync(path.join(library, 'assets/LICENSE-IBM-Plex.txt'))],
  ['LICENSE-XGIS.txt', readFileSync(path.join(library, 'assets/LICENSE-XGIS.txt'))],
  ['NOTICE', readFileSync(path.join(library, 'NOTICE'))],
  [
    'source.json',
    Buffer.from(
      JSON.stringify(
        {
          package: 'typeplot',
          version,
          source: `https://github.com/typeshade/typeplot/tree/v${version}`,
          atlas: candidates[0],
          sha256: createHash('sha256').update(atlas).digest('hex'),
        },
        null,
        2,
      ) + '\n',
    ),
  ],
]);
const target = path.join(root, 'public/vendor/typeplot');
const check = process.argv.includes('--check');
if (!check) mkdirSync(target, { recursive: true });
for (const [name, bytes] of files) {
  const file = path.join(target, name);
  if (!check) writeFileSync(file, bytes);
  else {
    let actual;
    try {
      actual = readFileSync(file);
    } catch {
      /* Report the same regeneration command below. */
    }
    if (!actual?.equals(bytes))
      throw new Error(`public/vendor/typeplot/${name} is stale. Run bun run sync:typeplot-assets.`);
  }
}
console.log(
  `[typeplot-assets] ${check ? 'Verified' : 'Copied'} v${version}: ${atlas.length} atlas bytes and license notices.`,
);
