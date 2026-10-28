import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEPLOY_SITES,
  parseJsonc,
  previewConfigFor,
  validateTypeCvProductionConfig,
  validateProductionTarget,
} from './deploy-preview-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_ACCOUNT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('the Wrangler JSONC reader preserves comment markers inside strings and removes trailing commas', () => {
  assert.deepEqual(
    parseJsonc(`{
      // full-line comment
      "url": "https://example.test/a//b",
      "items": [1, 2,], /* block comment */
    }`),
    { url: 'https://example.test/a//b', items: [1, 2] },
  );
});

test('each preview config has an isolated worker name, preview URLs, and no production routes or bindings', async () => {
  for (const site of DEPLOY_SITES) {
    const source = await readFile(path.join(root, 'apps', site, 'wrangler.jsonc'), 'utf8');
    const config = previewConfigFor(site, source, 731, PREVIEW_ACCOUNT_ID);
    assert.equal(config.name, `${site}-site-pr-731`);
    assert.equal(config.account_id, PREVIEW_ACCOUNT_ID);
    assert.equal(config.preview_urls, true);
    assert.equal(config.workers_dev, false);
    assert.equal(config.assets.directory, './dist');
    assert.equal('routes' in config, false);
    assert.equal('d1_databases' in config, false);
    assert.equal('r2_buckets' in config, false);
    assert.equal('triggers' in config, false);
    assert.equal(config.main, './.deploy-preview-worker-pr-731.mjs');
    assert.deepEqual(config.assets.run_worker_first, undefined);
  }
});

test('TypeCV production can keep preview URLs off while its ephemeral preview enables them', async () => {
  const source = await readFile(path.join(root, 'apps/typecv/wrangler.jsonc'), 'utf8');
  const production = parseJsonc(source);
  const preview = previewConfigFor('typecv', source, 42, PREVIEW_ACCOUNT_ID);
  assert.equal(production.preview_urls, false);
  assert.equal(preview.preview_urls, true);
  assert.equal(preview.name, 'typecv-site-pr-42');
});

test('preview identity does not inherit production Worker name or account', async () => {
  const source = await readFile(path.join(root, 'apps/typecv/wrangler.jsonc'), 'utf8');
  const production = parseJsonc(source);
  const first = previewConfigFor('typecv', production, 42, PREVIEW_ACCOUNT_ID);
  const changedProduction = {
    ...production,
    name: 'renamed-production-worker',
    account_id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  };
  const second = previewConfigFor('typecv', changedProduction, 42, PREVIEW_ACCOUNT_ID);
  assert.equal(second.name, first.name);
  assert.equal(second.account_id, first.account_id);
});

test('invalid site and PR identifiers are rejected', async () => {
  const source = await readFile(path.join(root, 'apps/typenn/wrangler.jsonc'), 'utf8');
  assert.throws(() => previewConfigFor('../typenn', source, 1, PREVIEW_ACCOUNT_ID), /Unknown site/);
  assert.throws(() => previewConfigFor('typenn', source, 0, PREVIEW_ACCOUNT_ID), /positive integer/);
  assert.throws(() => previewConfigFor('typenn', source, Number.NaN, PREVIEW_ACCOUNT_ID), /positive integer/);
  assert.throws(() => previewConfigFor('typenn', source, 1), /preview account ID/);
  assert.throws(() => previewConfigFor('typenn', source, 1, 'bad'), /preview account ID/);
});

test('production dispatch is limited to a known site on main', () => {
  assert.deepEqual(validateProductionTarget('typeshade', 'refs/heads/main'), {
    site: 'typeshade',
    environment: 'typeshade-production',
  });
  assert.throws(() => validateProductionTarget('typeshade', 'refs/heads/review'), /main/);
  assert.throws(() => validateProductionTarget('unknown', 'refs/heads/main'), /Unknown site/);
});

test('TypeCV production bindings must be provisioned before deployment', async () => {
  const source = await readFile(path.join(root, 'apps/typecv/wrangler.jsonc'), 'utf8');
  const config = parseJsonc(source);
  assert.throws(() => validateTypeCvProductionConfig(config), /real KV namespace/);
  config.kv_namespaces[0].id = '0123456789abcdef0123456789abcdef';
  assert.equal(validateTypeCvProductionConfig(config), true);
  config.r2_buckets = config.r2_buckets.filter((binding) => binding.binding !== 'SAMPLES');
  assert.throws(() => validateTypeCvProductionConfig(config), /typecv-samples/);
});
