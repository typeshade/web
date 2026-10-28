import assert from 'node:assert/strict';
import test from 'node:test';
import { environmentProblems, readJson } from './deployment-readiness.mjs';

const custom = { deployment_branch_policy: { custom_branch_policies: true, protected_branches: false } };
const main = { name: 'main', type: 'branch' };

test('missing or unrestricted environments cannot start credential jobs', () => {
  assert.notDeepEqual(environmentProblems(undefined, []), []);
  assert.notDeepEqual(environmentProblems({}, []), []);
  assert.notDeepEqual(environmentProblems({ deployment_branch_policy: { protected_branches: true } }, []), []);
});

test('only an exact main branch rule is accepted', () => {
  assert.deepEqual(environmentProblems(custom, [main]), []);
  for (const rules of [[], [{ name: 'main', type: 'tag' }], [main, { name: '*', type: 'branch' }]]) {
    assert.notDeepEqual(environmentProblems(custom, rules), []);
  }
});

test('HTTP failure never includes response bodies or tokens', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 403 }));
  await assert.rejects(readJson('https://example.invalid', 'test-only-token'), {
    message: 'Read-only request failed: HTTP 403',
  });
});

test('Cloudflare API-level failure is not treated as ready', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ success: false }) }));
  await assert.rejects(readJson('https://example.invalid', 'test-only-token'), /Cloudflare rejected/);
});
