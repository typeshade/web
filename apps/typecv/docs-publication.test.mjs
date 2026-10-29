import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { markdownFiles, isPublicMarkdownPath } from './scripts/docs.mjs';

test('internal migration handoff is excluded from public markdown routes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'typecv-docs-'));
  try {
    await mkdir(path.join(root, 'experiments'));
    await mkdir(path.join(root, 'experiments', 'handoff'));
    await writeFile(path.join(root, 'README.md'), '# Docs');
    await writeFile(path.join(root, 'website-migration.md'), '# Internal');
    await writeFile(path.join(root, 'experiments', 'results.md'), '# Results');
    await writeFile(path.join(root, 'experiments', 'handoff', 'website-migration.md'), '# Nested public doc');

    assert.equal(isPublicMarkdownPath('website-migration.md'), false);
    assert.equal(isPublicMarkdownPath('experiments/results.md'), true);
    assert.equal(isPublicMarkdownPath('experiments/handoff/website-migration.md'), true);
    assert.deepEqual(
      (await markdownFiles(root)).map((file) => path.relative(root, file)).sort(),
      [
        'README.md',
        path.join('experiments', 'results.md'),
        path.join('experiments', 'handoff', 'website-migration.md'),
      ].sort(),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
