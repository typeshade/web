#!/usr/bin/env node
// Before `wrangler deploy`: make sure the run-record collector's required KV namespace
// exists and is bound in this app's wrangler.jsonc, then store the required read token.
// CLOUDFLARE_API_TOKEN and RECORDS_READ_TOKEN must both be set. Any setup failure stops
// deployment so the protected read routes cannot ship without their required resources.
//
//   node scripts/ensure-run-records.mjs            # ensure, bind, store the token if given
//   node scripts/ensure-run-records.mjs --check    # print what would change; no network
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const NAMESPACE = 'typecv-records';
export const PLACEHOLDER = 'REPLACE_WITH_RECORDS_KV_ID';
const CONFIG = new URL('../wrangler.jsonc', import.meta.url);

/** Parse the Wrangler namespace-list JSON, or return undefined if the output is invalid. */
export function namespaceEntries(listOutput) {
  const start = listOutput.indexOf('[');
  const end = listOutput.lastIndexOf(']');
  if (start < 0 || end < start) return undefined;
  try {
    const entries = JSON.parse(listOutput.slice(start, end + 1));
    return Array.isArray(entries) ? entries : undefined;
  } catch {
    return undefined;
  }
}

/** The id of the namespace in `wrangler kv namespace list` output, or undefined. */
export function findNamespaceId(listOutput, worker = 'typecv-site') {
  const entries = namespaceEntries(listOutput);
  if (!entries) return undefined;
  const titles = new Set([NAMESPACE, `${worker}-${NAMESPACE}`]);
  const entry = entries.find((e) => titles.has(e.title) && /^[0-9a-f]{32}$/.test(e.id ?? ''));
  return entry?.id;
}
/** Return an existing namespace ID, throwing when listing failed or returned malformed output. */
export function checkedNamespaceId(listed, worker = 'typecv-site') {
  if (!listed.ok)
    throw new Error(
      `Could not list existing KV namespaces; refusing to create a replacement. ${listed.out}`,
    );
  if (!namespaceEntries(listed.out))
    throw new Error('Wrangler returned an invalid KV namespace list; refusing to create a replacement.');
  return findNamespaceId(listed.out, worker);
}
/** The id `wrangler kv namespace create` printed, or undefined. */
export function createdNamespaceId(createOutput) {
  return /"id":\s*"([0-9a-f]{32})"/.exec(createOutput)?.[1];
}
/** wrangler.jsonc with the required RECORDS binding set to `id`. */
export function bindNamespace(config, id) {
  if (!/^[0-9a-f]{32}$/.test(id ?? ''))
    throw new Error('A valid RECORDS KV namespace ID is required.');
  const property = /("kv_namespaces"\s*:\s*\[[\s\S]*?\])/m;
  const found = property.exec(config);
  if (!found) throw new Error('wrangler.jsonc has no kv_namespaces binding.');
  const entry = /("binding"\s*:\s*"RECORDS"[\s\S]*?"id"\s*:\s*")(?:[0-9a-f]{32}|REPLACE_WITH_RECORDS_KV_ID)(")/;
  const updated = found[0].replace(entry, `$1${id}$2`);
  if (updated === found[0])
    throw new Error('wrangler.jsonc has no RECORDS binding with a replaceable ID.');
  return config.replace(property, updated);
}

function wrangler(args, input) {
  const result = spawnSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    input,
    env: process.env,
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return { ok: result.status === 0, out: `${result.stdout}\n${result.stderr}` };
}

function main() {
  const check = process.argv.includes('--check');
  const config = readFileSync(CONFIG, 'utf8');
  if (check) {
    console.log(bindNamespace(config, 'deadbeefdeadbeefdeadbeefdeadbeef'));
    return;
  }
  const token = process.env.RECORDS_READ_TOKEN;
  if (!token)
    throw new Error('RECORDS_READ_TOKEN is required to deploy the protected record read routes.');
  const listed = wrangler(['kv', 'namespace', 'list']);
  let id = checkedNamespaceId(listed);
  if (!id) {
    const created = wrangler(['kv', 'namespace', 'create', NAMESPACE]);
    id = created.ok ? createdNamespaceId(created.out) : undefined;
    if (!id) console.error(created.out);
  }
  if (!id) {
    console.log(listed.out);
    throw new Error(
      'Could not list or create the required KV namespace. CLOUDFLARE_API_TOKEN needs "Workers KV Storage: Edit".',
    );
  }
  const stored = wrangler(['secret', 'put', 'RECORDS_READ_TOKEN'], token + '\n');
  if (!stored.ok) throw new Error(`Could not store RECORDS_READ_TOKEN: ${stored.out}`);
  writeFileSync(CONFIG, bindNamespace(config, id));
  console.log(`RECORDS bound to KV namespace ${id}`);
  console.log('RECORDS_READ_TOKEN stored');
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) main();
