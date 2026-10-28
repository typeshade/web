// The GitHub half of the issue form (worker/index.ts, /data/issues/): the credential the Worker
// holds and the one call it makes with it. A GitHub App opens the issue as its own bot account;
// a fine-grained token opens it as the token's owner (docs/cloudflare.md, Issues).

export interface GitHubEnv {
  /** The App's id, and its private key as GitHub downloads it (PKCS#1) or as PKCS#8. */
  readonly GITHUB_APP_ID?: string;
  readonly GITHUB_APP_PRIVATE_KEY?: string;
  /** A fine-grained token with Issues: Read and write on the form's repositories. */
  readonly GITHUB_TOKEN?: string;
  /** Another API root, for a local run against a stand-in (docs/cloudflare.md, Locally). */
  readonly GITHUB_API_URL?: string;
}

type Credential =
  { readonly appId: string; readonly privateKey: string } | { readonly token: string };

/** The credential, trimmed: a secret piped into `wrangler secret put` keeps its line break,
 *  and an App id with one in it is an id GitHub does not know. */
function credential(env: GitHubEnv): Credential | undefined {
  const appId = env.GITHUB_APP_ID?.trim();
  const privateKey = env.GITHUB_APP_PRIVATE_KEY?.trim();
  const token = env.GITHUB_TOKEN?.trim();
  return appId && privateKey ? { appId, privateKey } : token ? { token } : undefined;
}

export const hasCredential = (env: GitHubEnv): boolean => credential(env) !== undefined;

function call(env: GitHubEnv, path: string, token: string, body?: unknown): Promise<Response> {
  return fetch(`${env.GITHUB_API_URL ?? 'https://api.github.com'}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      // GitHub refuses a request that names no client.
      'user-agent': 'typeshade.dev',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** DER's length octets: short form under 128, then one or two bytes of length. */
const derLength = (n: number): number[] =>
  n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : [0x82, n >> 8, n & 0xff];

/** The private key as PKCS#8, the one form WebCrypto imports. GitHub hands out PKCS#1 (`BEGIN
 *  RSA PRIVATE KEY`), which is the same key without the algorithm in front: this puts version 0
 *  and rsaEncryption ahead of it. A key pasted with its line breaks written as `\n` reads too. */
function pkcs8(pem: string): Uint8Array<ArrayBuffer> {
  const text = pem.replace(/\\n/g, '\n');
  const der = Uint8Array.from(
    atob(text.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')),
    (c) => c.charCodeAt(0),
  );
  if (!text.includes('BEGIN RSA PRIVATE KEY')) return der;
  const version = [0x02, 0x01, 0x00];
  // SEQUENCE { OID 1.2.840.113549.1.1.1, NULL }
  const algorithm = [
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ];
  const head = [...version, ...algorithm, 0x04, ...derLength(der.length)];
  return new Uint8Array([0x30, ...derLength(head.length + der.length), ...head, ...der]);
}

/** The App's JWT: nine minutes, backdated one against a clock that runs ahead of GitHub's. */
async function appJwt(appId: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const part = (value: unknown): string =>
    base64url(new TextEncoder().encode(JSON.stringify(value)));
  const signed = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({ iat: now - 60, exp: now + 540, iss: appId })}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signed),
  );
  return `${signed}.${base64url(new Uint8Array(signature))}`;
}

/** An installation token per repository, held until five minutes before GitHub expires it. */
const tokens = new Map<string, { readonly token: string; readonly until: number }>();

/** The token the Worker opens an issue in `repo` with. The App's is scoped to that repository
 *  and to issues alone, whatever else the installation may do. */
async function tokenFor(env: GitHubEnv, repo: string): Promise<string> {
  const held = credential(env);
  if (!held) throw new Error('no GitHub credential');
  if ('token' in held) return held.token;
  const cached = tokens.get(repo);
  if (cached && cached.until > Date.now()) return cached.token;
  const jwt = await appJwt(held.appId, held.privateKey);
  const installation = await call(env, `/repos/${repo}/installation`, jwt);
  if (!installation.ok)
    throw new Error(`the App is not installed on ${repo} (${installation.status})`);
  const { id } = await installation.json<{ id: number }>();
  const minted = await call(env, `/app/installations/${id}/access_tokens`, jwt, {
    repositories: [repo.slice(repo.indexOf('/') + 1)],
    permissions: { issues: 'write' },
  });
  if (!minted.ok) throw new Error(`no installation token for ${repo} (${minted.status})`);
  const { token, expires_at } = await minted.json<{ token: string; expires_at: string }>();
  tokens.set(repo, { token, until: Date.parse(expires_at) - 5 * 60_000 });
  return token;
}

/** Opens an issue in `repo` (owner/name): its number and its page. */
export async function openIssue(
  env: GitHubEnv,
  repo: string,
  issue: { readonly title: string; readonly body: string; readonly labels: readonly string[] },
): Promise<{ number: number; url: string }> {
  const token = await tokenFor(env, repo);
  let res = await call(env, `/repos/${repo}/issues`, token, issue);
  // A label the repository lacks can fail the whole request, and the issue matters more than
  // its label.
  if (res.status === 422 && issue.labels.length > 0)
    res = await call(env, `/repos/${repo}/issues`, token, { ...issue, labels: [] });
  if (!res.ok)
    throw new Error(`GitHub answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { number, html_url } = await res.json<{ number: number; html_url: string }>();
  return { number, url: html_url };
}
