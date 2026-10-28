import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentVersionId,
  previousTraffic,
  rollbackCommand,
} from './deploy-worker-report.mjs';

const old = '01234567-89ab-cdef-0123-456789abcdef';
const current = 'fedcba98-7654-3210-fedc-ba9876543210';

test('captures the currently serving version traffic and builds a reversible command', () => {
  const history = [
    {
      created_on: '2026-10-27T10:00:00.000Z',
      versions: [{ version_id: current, percentage: 100 }],
    },
    {
      created_on: '2026-10-26T10:00:00.000Z',
      versions: [{ version_id: old, percentage: 100 }],
    },
  ];
  const previous = previousTraffic(history);
  assert.deepEqual(previous, { specs: [`${current}@100`], ids: [current] });
  assert.equal(
    rollbackCommand('wrangler.gallery.jsonc', previous.specs),
    `pnpm exec wrangler versions deploy ${current}@100 --config wrangler.gallery.jsonc --yes`,
  );
});

test('preserves a weighted production deployment for rollback', () => {
  const traffic = previousTraffic([
    {
      created_on: '2026-10-27T10:00:00.000Z',
      versions: [
        { version_id: current, percentage: 75 },
        { version_id: old, percentage: 25 },
      ],
    },
  ]);
  assert.deepEqual(traffic.specs, [`${current}@75`, `${old}@25`]);
});

test('extracts Wrangler’s deployed version ID from captured output', () => {
  assert.equal(currentVersionId(`Uploaded worker\nCurrent Version ID: ${current}\n`), current);
  assert.equal(currentVersionId(`Worker Version ID: ${old}`), old);
  assert.throws(() => currentVersionId('Upload completed without an ID'), /did not include/);
});

test('rejects incomplete or unsafe rollback history and config names', () => {
  assert.deepEqual(previousTraffic([]), { specs: [], ids: [] });
  assert.throws(
    () => previousTraffic([{ created_on: '2026-10-27', versions: [{ version_id: old, percentage: 90 }] }]),
    /routes 90%/,
  );
  assert.throws(() => rollbackCommand('../wrangler.jsonc', [`${old}@100`]), /Unexpected Wrangler config/);
});
