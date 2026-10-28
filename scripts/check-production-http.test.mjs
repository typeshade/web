import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyProductionHttp } from './check-production-http.mjs';

const url = 'https://cv.typeshade.dev/';

function response(status, headers = {}, responseUrl = url) {
  return { status, url: responseUrl, headers: new Headers(headers) };
}

test('passes only HTTP 200 from the allowlisted expected host', async () => {
  const result = await verifyProductionHttp(url, { fetchImpl: async () => response(200), sleep: async () => {} });
  assert.deepEqual(result, {
    result: 'passed', status: 200, host: 'cv.typeshade.dev', attempts: 1, reason: null,
  });
  await assert.rejects(verifyProductionHttp('https://attacker.example/', { fetchImpl: async () => response(200) }), /allowlist/);
  const externalResponse = await verifyProductionHttp(url, {
    fetchImpl: async () => response(200, {}, 'https://attacker.example/'),
    sleep: async () => {},
    maxAttempts: 1,
  });
  assert.equal(externalResponse.result, 'failed');
  assert.match(externalResponse.reason, /host/);
});

test('classifies only a 403 with cf-mitigated challenge as blocked and stops immediately', async () => {
  let calls = 0;
  const requestOptions = [];
  const result = await verifyProductionHttp(url, {
    fetchImpl: async (_url, options) => {
      calls += 1;
      requestOptions.push(options);
      return response(403, { 'cf-mitigated': 'challenge' });
    },
    sleep: async () => assert.fail('challenge responses must not be retried'),
  });
  assert.equal(result.result, 'blocked');
  assert.equal(result.status, 403);
  assert.equal(result.reason, 'cf-mitigated: challenge');
  assert.equal(calls, 1);
  assert.equal(requestOptions[0].redirect, 'manual');
  assert.equal('headers' in requestOptions[0], false);
  const externalChallenge = await verifyProductionHttp(url, {
    fetchImpl: async () => response(403, { 'cf-mitigated': 'challenge' }, 'https://untrusted.example/'),
    sleep: async () => {},
    maxAttempts: 1,
  });
  assert.equal(externalChallenge.result, 'failed');
});

test('ordinary 403/404/500 and redirects fail rather than pass or block', async () => {
  for (const reply of [
    response(403),
    response(403, { 'cf-mitigated': 'none' }),
    response(404),
    response(500),
    response(200, { 'cf-mitigated': 'challenge' }),
    response(302, { location: 'https://example.net/' }, 'https://cv.typeshade.dev/'),
  ]) {
    const result = await verifyProductionHttp(url, {
      fetchImpl: async () => reply,
      sleep: async () => {},
      maxAttempts: 1,
    });
    assert.equal(result.result, 'failed', `HTTP ${reply.status} must fail`);
    assert.equal(result.status, reply.status);
  }
});

test('retries network errors within the configured bound', async () => {
  let calls = 0;
  let sleeps = 0;
  const result = await verifyProductionHttp(url, {
    fetchImpl: async () => {
      calls += 1;
      throw new Error('network detail must not be surfaced');
    },
    sleep: async (ms) => { assert.equal(ms, 5); sleeps += 1; },
    maxAttempts: 3,
    timeoutMs: 20,
    retryDelay: 5,
  });
  assert.equal(result.result, 'failed');
  assert.equal(result.status, null);
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
  assert.equal(sleeps, 2);
  assert.doesNotMatch(result.reason, /network detail/);
});
