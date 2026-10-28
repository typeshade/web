import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bindNamespace,
  checkedNamespaceId,
  createdNamespaceId,
  findNamespaceId,
} from './scripts/ensure-run-records.mjs';

const config = readFileSync(new URL('./wrangler.jsonc', import.meta.url), 'utf8');
const namespaceId = '0123456789abcdef0123456789abcdef';

test('bindNamespace replaces the multiline RECORDS binding in the app config only', () => {
  const updated = bindNamespace(config, namespaceId);
  assert.match(updated, new RegExp(`"binding": "RECORDS",\\s*"id": "${namespaceId}"`));
  assert.match(updated, /"binding": "SAMPLES", "bucket_name": "typecv-samples"/);
  assert.match(updated, /"binding": "RECORD_FILES", "bucket_name": "typecv-records"/);
  assert.throws(() => bindNamespace(config.replace('"binding": "RECORDS"', '"binding": "OTHER"'), namespaceId), /no RECORDS binding/);
  assert.throws(() => bindNamespace(config, 'invalid'), /valid RECORDS KV namespace ID/);
});

test('namespace output readers accept only known names and valid IDs', () => {
  const valid = { title: 'typecv-records', id: namespaceId };
  assert.equal(findNamespaceId(JSON.stringify([valid])), namespaceId);
  assert.equal(checkedNamespaceId({ ok: true, out: JSON.stringify([valid]) }), namespaceId);
  assert.equal(checkedNamespaceId({ ok: true, out: '[]' }), undefined);
  assert.throws(() => checkedNamespaceId({ ok: false, out: 'auth error' }), /refusing to create/);
  assert.throws(() => checkedNamespaceId({ ok: true, out: 'invalid' }), /invalid KV namespace list/);
  assert.equal(findNamespaceId('Wrangler output without JSON'), undefined);
  assert.equal(findNamespaceId('{"result":[]}'), undefined);
  assert.equal(findNamespaceId('[]'), undefined);
  assert.equal(findNamespaceId(JSON.stringify([{ ...valid, id: 'invalid' }])), undefined);
  assert.equal(findNamespaceId(JSON.stringify([{ ...valid, title: 'unrelated' }])), undefined);
  assert.equal(createdNamespaceId(`Created namespace: {"id":"${namespaceId}"}`), namespaceId);
  assert.equal(createdNamespaceId('Created namespace with malformed output'), undefined);
});
