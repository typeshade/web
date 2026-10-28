// The maintainer's review page, gallery.typeshade.dev/review/ (docs/cloudflare.md, Reviewing
// the gallery): the submissions waiting for a decision, each with its still, its source and a
// link that opens it, and Approve and Reject. A decision taken here is the UPDATE the
// maintainer once ran by hand.
//
// Only the maintainer reaches it. Cloudflare Access stands in front of /review/ and signs in
// whoever it lets through; the Worker then checks the token Access adds to the request
// (Cf-Access-Jwt-Assertion) against the team's keys and the application's audience, so a
// request that did not come through Access, or a Worker with no Access configured, gets
// nothing. Readers who submit need no account: only this page has a sign-in.
import { GALLERY_TITLE_MAX } from '../src/lib/example-data.ts';
import { galleryStillId, galleryStillKey, galleryStillPath } from '../src/lib/gallery-data.ts';
import { decodeSource } from '../src/scripts/source-link.ts';

export interface ReviewEnv {
  readonly DATA: R2Bucket;
  readonly DB: D1Database;
  /** The Access team's domain, `<team>.cloudflareaccess.com`. */
  readonly ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's audience tag. */
  readonly ACCESS_AUD?: string;
  /** '1' under `wrangler dev` (.dev.vars): the page opens with no Access. Never a secret of the
   *  deployed Worker. */
  readonly REVIEW_LOCAL?: string;
}

const SITE = 'https://typeshade.dev';
const ID = /^[A-Za-z0-9_-]{8,43}$/;
const STATUSES = ['pending', 'approved', 'rejected'] as const;
type Status = (typeof STATUSES)[number];
/** Rows each section lists. */
const SECTION_MAX = 50;
/** The decisions a form posts, and the status each sets. */
const DECISIONS: Record<string, Status> = { approve: 'approved', reject: 'rejected' };

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** The team's signing keys, fetched at most once an hour per isolate. */
let keys:
  { readonly domain: string; readonly jwks: JsonWebKey[]; readonly until: number } | undefined;
async function accessKeys(domain: string): Promise<JsonWebKey[]> {
  if (keys && keys.domain === domain && keys.until > Date.now()) return keys.jwks;
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!res.ok) return [];
  const { keys: jwks } = (await res.json()) as { keys?: JsonWebKey[] };
  keys = { domain, jwks: jwks ?? [], until: Date.now() + 3_600_000 };
  return keys.jwks;
}

/** Who Access signed in, or null when the request did not come through it. */
async function signedIn(request: Request, env: ReviewEnv): Promise<string | null> {
  // `wrangler dev` presents a request under the route's host, so the local opening is the
  // variable alone. It lives in .dev.vars, which git ignores and `wrangler deploy` never uploads.
  if (env.REVIEW_LOCAL === '1') return 'wrangler dev';
  const domain = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!domain || !aud || !token) return null;
  const [head, body, signature] = token.split('.');
  if (!head || !body || !signature) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(head))) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256') return null;
    const jwk = (await accessKeys(domain)).find((k) => (k as { kid?: string }).kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(`${head}.${body}`),
    );
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as {
      aud?: string | string[];
      exp?: number;
      iss?: string;
      email?: string;
    };
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(aud)) return null;
    if (claims.iss !== `https://${domain}`) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
    return claims.email ?? 'signed in';
  } catch {
    return null;
  }
}

const noStore = {
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex',
  'referrer-policy': 'no-referrer',
};

interface Row {
  share_id: string;
  title: string;
  author: string;
  locale: string;
  status: Status;
  created_at: string;
  reviewed_at: string | null;
  thumbnail: string | null;
  fragment: string;
  views: number;
}

async function rows(env: ReviewEnv, status: Status): Promise<Row[]> {
  // The queue oldest first, so nothing waits behind newer submissions; a decision newest first.
  const order =
    status === 'pending' ? 's.created_at' : 'COALESCE(s.reviewed_at, s.created_at) DESC';
  const { results } = await env.DB.prepare(
    `SELECT s.share_id, s.title, s.author, s.locale, s.status, s.created_at, s.reviewed_at,
       s.thumbnail, h.fragment, h.views
     FROM submissions s JOIN shares h ON h.id = s.share_id
     WHERE s.status = ? ORDER BY ${order} LIMIT ?`,
  )
    .bind(status, SECTION_MAX)
    .all<Row>();
  return results;
}

async function card(row: Row): Promise<string> {
  const params = new URLSearchParams(row.fragment);
  const packed = params.get('code');
  const code = packed ? await decodeSource(packed) : undefined;
  const still = row.thumbnail
    ? `<img src="${galleryStillPath('/review/stills', row.share_id, row.thumbnail)}" alt="" width="320" height="180" loading="lazy">`
    : '<div class="none">no still</div>';
  const when = (row.reviewed_at ?? row.created_at).slice(0, 16).replace('T', ' ');
  const action = (decision: string, label: string, primary = false): string =>
    `<button name="decision" value="${decision}"${primary ? ' class="primary"' : ''}>${label}</button>`;
  const buttons =
    row.status === 'pending'
      ? action('approve', 'Approve', true) + action('reject', 'Reject')
      : row.status === 'approved'
        ? action('reject', 'Take down')
        : action('approve', 'Approve');
  return `<li>
  <div class="still">${still}</div>
  <form method="post" action="/review/${row.share_id}/">
    <input name="title" value="${escapeHtml(row.title)}" maxlength="${GALLERY_TITLE_MAX}" aria-label="Title" required>
    <p class="meta">${row.author ? `by ${escapeHtml(row.author)} · ` : ''}${row.locale} · ${row.status === 'pending' ? 'sent' : row.status} ${when} UTC · ${row.views} views · <a href="${SITE}/s/${row.share_id}/" target="_blank" rel="noopener">Open in the Playground</a>${params.has('files') ? ' · more files' : ''}</p>
    <div class="actions">${buttons}</div>
  </form>
  ${code === undefined ? '' : `<details><summary>Source</summary><pre>${escapeHtml(code)}</pre></details>`}
</li>`;
}

async function page(env: ReviewEnv, who: string, notice: string): Promise<Response> {
  const sections = await Promise.all(
    STATUSES.map(async (status) => {
      const list = await rows(env, status);
      const items = (await Promise.all(list.map(card))).join('\n');
      const title = { pending: 'Waiting', approved: 'Approved', rejected: 'Rejected' }[status];
      return `<section${status === 'pending' ? '' : ' class="decided"'}><h2>${title} <span>${list.length}${list.length === SECTION_MAX ? '+' : ''}</span></h2>${items ? `<ul>${items}</ul>` : '<p class="empty">Nothing here.</p>'}</section>`;
    }),
  );
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Gallery review, TypeShade</title>
<style>
:root { color-scheme: light dark; --ground: #fff; --surface: #fafafa; --line: #e6e6e6; --text-2: rgb(0 0 0 / .65); --accent: #1677ff; }
@media (prefers-color-scheme: dark) { :root { --ground: #141414; --surface: #1f1f1f; --line: #303030; --text-2: rgb(255 255 255 / .65); } }
body { margin: 0; background: var(--ground); font: 14px/1.5 system-ui, sans-serif; }
main { max-width: 1320px; margin: 0 auto; padding: 24px 16px 64px; }
header { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: baseline; justify-content: space-between; }
h1 { margin: 0; font-size: 1.5rem; }
header p, .meta, .empty { margin: 0; color: var(--text-2); }
.notice { margin: 16px 0 0; padding: 8px 12px; border-radius: 6px; background: var(--surface); border: 1px solid var(--line); }
h2 { margin: 32px 0 12px; font-size: 1.125rem; }
h2 span { color: var(--text-2); font-weight: 400; }
ul { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
li { display: grid; grid-template-columns: 160px 1fr; gap: 8px 16px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; }
.decided li { grid-template-columns: 96px 1fr; }
.still img, .none { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 4px; background: var(--surface); }
.none { display: grid; place-items: center; color: var(--text-2); font-size: 12px; }
form { display: grid; gap: 6px; align-content: start; min-width: 0; }
input { font: inherit; font-weight: 600; padding: 4px 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--ground); color: inherit; max-width: 40rem; }
.actions { display: flex; gap: 8px; }
button { font: inherit; padding: 4px 14px; border: 1px solid var(--line); border-radius: 6px; background: var(--ground); color: inherit; cursor: pointer; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
a { color: var(--accent); }
details { grid-column: 1 / -1; }
pre { max-height: 24rem; overflow: auto; margin: 6px 0 0; padding: 10px 12px; border-radius: 6px; background: var(--surface); font: 12px/1.55 ui-monospace, monospace; }
@media (max-width: 40rem) { li, .decided li { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
<header><h1>Gallery review</h1><p>Signed in as ${escapeHtml(who)} · <a href="/">The gallery</a></p></header>
${notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ''}
${sections.join('\n')}
</main>
</body>
</html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', ...noStore },
  });
}

/** POST /review/<id>/: a decision on one submission, and the title as the form holds it. */
async function decide(request: Request, url: URL, env: ReviewEnv, id: string): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin)
    return new Response('Another site', { status: 403, headers: noStore });
  const form = await request.formData().catch(() => null);
  const status = DECISIONS[String(form?.get('decision') ?? '')];
  if (!form || !status) return new Response('No decision', { status: 400, headers: noStore });
  const title = String(form.get('title') ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const { meta } = await env.DB.prepare(
    `UPDATE submissions SET status = ?, reviewed_at = ?,
       title = CASE WHEN ? <> '' AND length(?) <= ${GALLERY_TITLE_MAX} THEN ? ELSE title END
     WHERE share_id = ?`,
  )
    .bind(status, new Date().toISOString(), title, title, title, id)
    .run();
  const said =
    meta.changes > 0
      ? `${status === 'approved' ? 'Approved' : 'Rejected'}: ${title}`
      : 'No such submission';
  return new Response(null, {
    status: 303,
    headers: { location: `/review/?done=${encodeURIComponent(said)}`, ...noStore },
  });
}

/** A submission's still, whatever its status. */
async function reviewStill(env: ReviewEnv, id: string): Promise<Response> {
  const object = await env.DATA.get(galleryStillKey(id)).catch(() => null);
  if (!object) return new Response('Not found', { status: 404, headers: noStore });
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      ...noStore,
    },
  });
}

export async function review(request: Request, url: URL, env: ReviewEnv): Promise<Response> {
  const who = await signedIn(request, env);
  if (!who)
    return new Response('This page is for the maintainer, behind Cloudflare Access.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8', ...noStore },
    });
  const path = url.pathname;
  if (path === '/review') return Response.redirect(`${url.origin}/review/`, 308);
  if (path === '/review/' && request.method === 'GET')
    return page(env, who, (url.searchParams.get('done') ?? '').slice(0, 200));
  const stillId = galleryStillId('/review/stills', path);
  if (stillId && request.method === 'GET') return reviewStill(env, stillId);
  const id = /^\/review\/([^/]+)\/$/.exec(path)?.[1];
  if (id && ID.test(id) && request.method === 'POST') return decide(request, url, env, id);
  return new Response('Not found', { status: 404, headers: noStore });
}
