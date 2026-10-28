import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const allowedUrls = new Set([
  'https://typeshade.dev/',
  'https://nn.typeshade.dev/',
  'https://cv.typeshade.dev/',
  'https://gallery.typeshade.dev/',
]);
const attempts = 12;
const requestTimeoutMs = 20_000;
const retryDelayMs = 5_000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function verifyProductionHttp(url, {
  fetchImpl = fetch,
  sleep = delay,
  maxAttempts = attempts,
  timeoutMs = requestTimeoutMs,
  retryDelay = retryDelayMs,
} = {}) {
  if (!allowedUrls.has(url)) throw new Error('URL is not in the fixed production root allowlist.');
  const expectedHost = new URL(url).host;
  let last = { status: null, reason: 'no response' };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const responseHost = new URL(response.url || url).host;
      const mitigation = response.headers.get('cf-mitigated')?.trim().toLowerCase();
      await response.body?.cancel();
      const challenge = response.status === 403
        && responseHost === expectedHost
        && mitigation === 'challenge';
      if (challenge) {
        return {
          result: 'blocked',
          status: response.status,
          host: expectedHost,
          attempts: attempt,
          reason: 'cf-mitigated: challenge',
        };
      }
      if (response.status === 200 && responseHost === expectedHost && mitigation !== 'challenge') {
        return { result: 'passed', status: response.status, host: expectedHost, attempts: attempt, reason: null };
      }
      last = {
        status: response.status,
        reason: response.status >= 300 && response.status < 400
          ? 'redirects are not followed by this check'
          : mitigation === 'challenge'
            ? 'unexpected challenge response'
          : response.status === 200
            ? 'response host did not match the expected host'
            : 'non-200 response',
      };
    } catch (error) {
      last = { status: null, reason: error?.name === 'TimeoutError' ? 'request timed out' : 'request failed' };
    }
    if (attempt < maxAttempts) await sleep(retryDelay);
  }
  return {
    result: 'failed',
    status: last.status,
    host: expectedHost,
    attempts: maxAttempts,
    reason: last.reason,
  };
}

function appendOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function appendSummary(message) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
}

async function main() {
  const [url] = process.argv.slice(2);
  if (!url) throw new Error('usage: check-production-http.mjs <allowlisted-root-url>');
  const result = await verifyProductionHttp(url);
  appendOutput('public_verification', result.result);
  if (result.result === 'passed') {
    const line = `Public HTTP verification passed: HTTP ${result.status} from ${result.host}.`;
    console.log(line);
    appendSummary(line);
  } else if (result.result === 'blocked') {
    const line = 'HTTP verification blocked by Cloudflare; external browser/API verification required';
    console.warn(`::warning::${line} (HTTP ${result.status}, ${result.reason}).`);
    appendSummary(`**${line}.** Public HTTP check reported HTTP ${result.status} (${result.reason}); this result is not a pass.`);
  } else {
    const line = `Public HTTP verification failed: HTTP ${result.status ?? 'unavailable'} from ${result.host} after ${result.attempts} attempts (${result.reason}).`;
    console.error(`::error::${line}`);
    appendSummary(`**${line}**`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
