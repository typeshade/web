// Cloudflare Access in front of gallery.typeshade.dev/review/ (docs/cloudflare.md, Reviewing the
// gallery), set up through Cloudflare's API and safe to run again: the Zero Trust organization
// the account has, One-time PIN as a login method, a self-hosted application on the review
// path, a policy that lets in the reviewer's email address and nobody else, and the two values
// the gallery's Worker checks the Access token against, as its secrets.
//
// Run: GALLERY_REVIEWER_EMAIL=<address> bun scripts/setup-gallery-access.ts
// with CLOUDFLARE_API_TOKEN holding Access: Organizations, Identity Providers, and Groups edit
// and Access: Apps and Policies edit, beside what the deploy already needs (gallery-setup.yml
// runs it). The address is read from the environment and never printed.
import { readFileSync } from 'node:fs';
import { GALLERY_ORIGIN } from '../src/lib/gallery-data.ts';

const token = process.env.CLOUDFLARE_API_TOKEN;
const email = (process.env.GALLERY_REVIEWER_EMAIL ?? '').trim();
if (!token) throw new Error('[access] CLOUDFLARE_API_TOKEN is not set');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error('[access] GALLERY_REVIEWER_EMAIL is not an email address');

const account = /"account_id":\s*"([0-9a-f]{32})"/.exec(
  readFileSync('wrangler.gallery.jsonc', 'utf8'),
)?.[1];
if (!account) throw new Error('[access] no account_id in wrangler.gallery.jsonc');

const host = new URL(GALLERY_ORIGIN).host;
const DOMAIN = `${host}/review`;
const APP_NAME = 'Gallery review';
const POLICY_NAME = 'Gallery reviewer';
const WORKER_CONFIG = 'wrangler.gallery.jsonc';

interface Envelope<T> {
  readonly success: boolean;
  readonly errors: readonly { code: number; message: string }[];
  readonly result: T;
}

async function cf<T>(method: string, route: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${route}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !data?.success) {
    const why =
      data?.errors.map((e) => `${e.code} ${e.message}`).join('; ') || `HTTP ${res.status}`;
    throw new Error(`[access] ${method} ${route}: ${why}`);
  }
  return data.result;
}

// The organization: Zero Trust's team, whose domain signs the tokens.
let organization: { auth_domain?: string } | null = null;
try {
  organization = await cf<{ auth_domain?: string }>('GET', '/access/organizations');
} catch (error) {
  if (!String(error).includes('HTTP 404') && !/not found|does not exist/i.test(String(error)))
    throw error;
}
if (!organization?.auth_domain) {
  organization = await cf<{ auth_domain: string }>('POST', '/access/organizations', {
    name: 'TypeShade',
    auth_domain: 'typeshade.cloudflareaccess.com',
  });
  console.log('[access] created the Zero Trust organization');
}
const team = organization.auth_domain!;
console.log(`[access] team domain ${team}`);

// One-time PIN: Access mails a code to the address, so no other identity provider is needed.
const providers = await cf<{ id: string; type: string }[]>('GET', '/access/identity_providers');
if (!providers.some((p) => p.type === 'onetimepin')) {
  await cf('POST', '/access/identity_providers', {
    name: 'One-time PIN',
    type: 'onetimepin',
    config: {},
  });
  console.log('[access] added One-time PIN');
}

// The application on the review path, and its one policy.
const apps = await cf<{ id: string; aud: string; domain: string }[]>('GET', '/access/apps');
let app = apps.find((a) => a.domain === DOMAIN);
if (!app) {
  app = await cf<{ id: string; aud: string; domain: string }>('POST', '/access/apps', {
    name: APP_NAME,
    domain: DOMAIN,
    type: 'self_hosted',
    session_duration: '24h',
    app_launcher_visible: false,
  });
  console.log(`[access] created the application on ${DOMAIN}`);
}
const include = [{ email: { email } }];
const policies = await cf<{ id: string; name: string }[]>('GET', `/access/apps/${app.id}/policies`);
const policy = policies.find((p) => p.name === POLICY_NAME);
const rule = { name: POLICY_NAME, decision: 'allow', include, precedence: 1 };
if (policy) await cf('PUT', `/access/apps/${app.id}/policies/${policy.id}`, rule);
else await cf('POST', `/access/apps/${app.id}/policies`, rule);
console.log('[access] the policy lets in the reviewer alone');

// The values the Worker checks the token against (worker/gallery-review.ts).
for (const [name, value] of [
  ['ACCESS_TEAM_DOMAIN', team],
  ['ACCESS_AUD', app.aud],
] as const) {
  const run = Bun.spawnSync(['bunx', 'wrangler', 'secret', 'put', name, '-c', WORKER_CONFIG], {
    stdin: new TextEncoder().encode(value),
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (run.exitCode !== 0) throw new Error(`[access] wrangler secret put ${name} failed`);
}
console.log(`[access] ${GALLERY_ORIGIN}/review/ now opens for the reviewer`);
