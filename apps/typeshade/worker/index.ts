// typeshade.dev's Worker (docs/cloudflare.md). The site is the Astro build in dist/, served as
// static assets; wrangler.jsonc runs this Worker first on four prefixes only, and everything
// else never reaches it.
//
// /data/examples/         the current release's index: every example the compiler has, with
//                         the site's words for it (scripts/publish-examples.ts writes it)
// /data/examples/<id>/    one example: its file, its emitted WGSL and GLSL, its page meta
// /data/releases/         the releases the database records, newest first
// /data/benchmarks/records/ POST: stores a consented, validated benchmark report privately in D1
// /data/shares/           POST: stores a Playground link's page and fragment in D1 and answers
//                         its short link
// /data/shares/<id>/      one short link's page and fragment, its views and when it was made and
//                         last opened; the Playground opens #share=<id> from it
// /data/notice/           the notice over every page, or null (worker/migrations/0005)
// /data/gallery/          GET: the approved gallery entries; POST: sends a share in, pending,
//                         with a still of its canvas (worker/gallery.ts serves the gallery)
// /data/issues/           GET: whether the issue dialog takes reports here; POST: opens one as
//                         an issue on GitHub for a reader with no account there (worker/github.ts)
// /data/issue-images/<n>  an image an issue shows, which the dialog sent with it
// /s/<id>/                the short link: a redirect to the page with #share=<id>, counted
// /guide/examples/<id>/   the built page where the build has one; otherwise, for an example
// /ko/guide/examples/...  the current release has, the prebuilt template page filled in with
//                         it, so an example merged upstream has a page before the next build
// /gallery/, /playground/gallery/, and their Korean twins: a redirect to the gallery's own
//                         address, gallery.typeshade.dev, which worker/gallery.ts serves
//
// A daily cron (wrangler.jsonc) deletes the shares nobody has opened for SHARE_TTL_DAYS.
import {
  GALLERY_AUTHOR_MAX,
  GALLERY_TITLE_MAX,
  releaseKey,
  TEMPLATE_ID,
  type DataLocale,
  type ExampleRecord,
  type ReleaseIndex,
} from '../src/lib/example-data.ts';
import {
  GALLERY_ORIGIN,
  GALLERY_STILL_BYTES,
  galleryStillKey,
  galleryStillPath,
} from '../src/lib/gallery-data.ts';
import {
  ISSUE_FILE_NAME,
  ISSUE_FILES_MAX,
  ISSUE_IMAGE_BYTES,
  ISSUE_IMAGES_MAX,
  ISSUE_LABEL,
  ISSUE_PAGE,
  ISSUE_PROGRAM_MAX,
  ISSUE_REPOS,
  ISSUE_TEXT_MAX,
  ISSUE_TITLE_MAX,
  isIssueRepo,
  type IssueAnswer,
  type IssueError,
  type IssueField,
  type IssueFile,
  type IssueRepo,
  type IssueStatus,
} from '../src/lib/issue-data.ts';
import { hasCredential, openIssue, type GitHubEnv } from './github.ts';
import { listEntries } from './gallery-store.ts';
import { benchmarkRequest, cleanupBenchmarks } from './benchmarks.ts';

export interface Env extends GitHubEnv {
  readonly ASSETS: Fetcher;
  readonly DATA: R2Bucket;
  readonly DB: D1Database;
  /** Cloudflare Turnstile's pair, where the dialog asks for a person before it opens an issue. */
  readonly TURNSTILE_SITE_KEY?: string;
  readonly TURNSTILE_SECRET_KEY?: string;
}

/** The current release's id, read from D1 at most once a minute per isolate. */
let current: { readonly release: string | null; readonly until: number } | undefined;
async function currentRelease(env: Env): Promise<string | null> {
  if (current && current.until > Date.now()) return current.release;
  const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = 'current_release'`)
    .first<{ value: string }>()
    .catch(() => null);
  current = { release: row?.value ?? null, until: Date.now() + 60_000 };
  return current.release;
}

async function readJson<T>(env: Env, file: string): Promise<T | null> {
  const release = await currentRelease(env);
  if (!release) return null;
  const object = await env.DATA.get(releaseKey(release, file)).catch(() => null);
  return object ? ((await object.json()) as T) : null;
}

const ID = /^[a-z0-9][a-z0-9-]*$/;

/** The pages a short link may open: the Playground and an example's page, in either language. */
const SHARE_PATH = /^(\/ko)?\/(playground|guide\/examples\/[a-z0-9][a-z0-9-]*)\/$/;
/** What the Playground writes (writeHash): `code=` and the options, in URL-safe characters. */
const SHARE_FRAGMENT = /^code=[A-Za-z0-9._~%&=-]+$/;
/** A deflated file of a few thousand lines, with room to spare. */
const SHARE_MAX = 64 * 1024;
const SHARE_ID = /^[A-Za-z0-9_-]{8,43}$/;
/** A share nobody opens for this long is deleted, unless it was sent to the gallery. */
const SHARE_TTL_DAYS = 365;
/** Submissions one address may send in a day. */
const GALLERY_DAILY_MAX = 5;
/** Entries the gallery lists. */
const GALLERY_LIST_MAX = 100;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // A release changes when the compiler does, a few times a day at most; a minute at the
      // edge keeps the reads off R2 without holding a new example back for long.
      'cache-control': 'public, max-age=60',
      'access-control-allow-origin': '*',
    },
  });
}

async function api(request: Request, url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (url.pathname.startsWith('/data/benchmarks/')) return benchmarkRequest(request, env.DB);
  const parts = url.pathname.split('/').filter(Boolean); // ['data', 'examples', id?]
  if (parts[1] === 'examples' && parts.length === 2) {
    const index = await readJson<ReleaseIndex>(env, 'index.json');
    return index ? json(index) : json({ error: 'no release is current' }, 503);
  }
  if (parts[1] === 'examples' && parts.length === 3 && ID.test(parts[2]!)) {
    const record = await readJson<ExampleRecord>(env, `examples/${parts[2]}.json`);
    return record ? json(record) : json({ error: `no example '${parts[2]}'` }, 404);
  }
  if (parts[1] === 'notice' && parts.length === 2) return currentNotice(url, env, ctx);
  if (parts[1] === 'gallery' && parts.length === 2) {
    return request.method === 'POST' ? submitToGallery(request, url, env) : listGallery(env);
  }
  if (parts[1] === 'shares' && parts.length === 2) {
    return request.method === 'POST'
      ? createShare(request, url, env)
      : json({ error: 'POST a page and a fragment' }, 405);
  }
  if (parts[1] === 'shares' && parts.length === 3 && SHARE_ID.test(parts[2]!)) {
    const row = await env.DB.prepare(
      `SELECT id, path, fragment, views, created_at, last_opened_at FROM shares WHERE id = ?`,
    )
      .bind(parts[2])
      .first<{
        id: string;
        path: string;
        fragment: string;
        views: number;
        created_at: string;
        last_opened_at: string | null;
      }>();
    if (!row) return json({ error: `no share '${parts[2]}'` }, 404);
    return new Response(
      JSON.stringify({
        id: row.id,
        path: row.path,
        // What the Playground opens: its short link carries only the id (openShare).
        fragment: row.fragment,
        views: row.views,
        createdAt: row.created_at,
        lastOpenedAt: row.last_opened_at,
      }),
      { headers: { 'content-type': 'application/json; charset=utf-8', ...noStore } },
    );
  }
  if (parts[1] === 'issues' && parts.length === 2) {
    if (request.method === 'POST') return createIssue(request, url, env);
    return request.method === 'GET' ? issueStatus(url, env) : refuse('invalid', 405);
  }
  if (parts[1] === 'issue-images' && parts.length === 3 && IMAGE_NAME.test(parts[2]!)) {
    return issueImage(parts[2]!, env);
  }
  if (parts[1] === 'releases' && parts.length === 2) {
    const { results } = await env.DB.prepare(
      `SELECT id, compiler_commit, compiler_date, site_commit, example_count, created_at
       FROM releases ORDER BY created_at DESC LIMIT 50`,
    ).all();
    return json({ current: await currentRelease(env), releases: results });
  }
  return json({ error: 'not found' }, 404);
}

const noStore = { 'cache-control': 'no-store' };

/** The id of a share: the SHA-256 of what it opens, in base64url, cut to `length`. */
async function shareId(target: string, length: number): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(target)),
  );
  const b64 = btoa(String.fromCharCode(...digest))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return b64.slice(0, length);
}

/** A request body read as JSON, or the response that refuses it: a request from another site,
 *  one larger than a share can be, or one that is not JSON. */
async function readBody(
  request: Request,
  url: URL,
  max = SHARE_MAX + 1024,
): Promise<Record<string, unknown> | Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: 'another site' }, 403);
  const body = await request.text();
  if (body.length > max) return json({ error: 'too large' }, 413);
  try {
    const value: unknown = JSON.parse(body);
    if (value && typeof value === 'object') return value as Record<string, unknown>;
  } catch {
    // Falls through to the refusal below.
  }
  return json({ error: 'not JSON' }, 400);
}

/** The page and fragment a body names, or the response that refuses them. */
function readShare(body: Record<string, unknown>): { path: string; fragment: string } | Response {
  const { path, fragment } = body;
  if (typeof path !== 'string' || !SHARE_PATH.test(path))
    return json({ error: 'not a page a link can open' }, 400);
  if (typeof fragment !== 'string' || !SHARE_FRAGMENT.test(fragment) || fragment.length > SHARE_MAX)
    return json({ error: 'not a Playground fragment' }, 400);
  return { path, fragment };
}

/** Stores a share, or finds the one already stored for the same page and fragment, and
 *  answers its id. Eight characters are 48 bits; a different share that already holds them
 *  takes a longer id. */
async function storeShare(env: Env, path: string, fragment: string): Promise<string | null> {
  const target = `${path}#${fragment}`;
  for (const length of [8, 12, 16, 43]) {
    const id = await shareId(target, length);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO shares (id, path, fragment, created_at) VALUES (?, ?, ?, ?)`,
    )
      .bind(id, path, fragment, new Date().toISOString())
      .run();
    const row = await env.DB.prepare(`SELECT path, fragment FROM shares WHERE id = ?`)
      .bind(id)
      .first<{ path: string; fragment: string }>();
    if (row?.path === path && row.fragment === fragment) return id;
  }
  return null;
}

const privateJson = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...noStore },
  });

/** POST /data/shares/ with `{ path, fragment }`: the short link to that page and fragment. */
async function createShare(request: Request, url: URL, env: Env): Promise<Response> {
  const body = await readBody(request, url);
  if (body instanceof Response) return body;
  const share = readShare(body);
  if (share instanceof Response) return share;
  const id = await storeShare(env, share.path, share.fragment);
  if (!id) return json({ error: 'no free id' }, 500);
  return privateJson({ id, url: `${url.origin}/s/${id}/` });
}

/** A title or a name as the gallery shows it: one line, trimmed, no control characters, and
 *  at most `max` characters. Undefined when it is not a string or is too long. */
function readLine(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  // eslint-disable-next-line no-control-regex
  const line = value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [...line].length <= max ? line : undefined;
}

/** A submission's still: base64 of a WebP, PNG or JPEG, known by its first bytes, of at most
 *  GALLERY_STILL_BYTES. Undefined for anything else, which the submission goes in without. */
function readStill(value: unknown): { bytes: Uint8Array; type: string } | undefined {
  if (typeof value !== 'string' || value.length > Math.ceil(GALLERY_STILL_BYTES / 3) * 4)
    return undefined;
  let bytes: Uint8Array;
  try {
    const binary = atob(value);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  } catch {
    return undefined;
  }
  const kind = IMAGE_KINDS.find(
    (k) => k.ext !== 'gif' && k.magic.every(([at, byte]) => bytes[at] === byte),
  );
  return kind && bytes.length > 0 ? { bytes, type: kind.type } : undefined;
}

/** POST /data/gallery/ with `{ path, fragment, title, author, locale, still? }`: stores the
 *  share and queues it for the gallery as `pending`, with the still of its canvas where the
 *  Playground took one. The maintainer approves it (docs/cloudflare.md). A still is kept only
 *  for a submission that is still pending and has none, so nothing changes what an approved
 *  entry shows. */
async function submitToGallery(request: Request, url: URL, env: Env): Promise<Response> {
  const body = await readBody(request, url, SHARE_MAX + GALLERY_STILL_BYTES * 2);
  if (body instanceof Response) return body;
  const share = readShare(body);
  if (share instanceof Response) return share;
  const title = readLine(body.title, GALLERY_TITLE_MAX);
  if (!title)
    return json({ error: `a title of 1 to ${GALLERY_TITLE_MAX} characters is required` }, 400);
  const author = readLine(body.author ?? '', GALLERY_AUTHOR_MAX);
  if (author === undefined) return json({ error: 'the name is too long' }, 400);
  const locale = body.locale === 'ko' ? 'ko' : 'en';
  // The address, hashed, so one sender cannot flood the queue; the address is never stored.
  const sender = await shareId(`sender:${request.headers.get('cf-connecting-ip') ?? ''}`, 16);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM submissions WHERE sender = ? AND created_at > ?`,
  )
    .bind(sender, since)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= GALLERY_DAILY_MAX) return privateJson({ error: 'limit' }, 429);
  const id = await storeShare(env, share.path, share.fragment);
  if (!id) return json({ error: 'no free id' }, 500);
  const { meta } = await env.DB.prepare(
    `INSERT OR IGNORE INTO submissions (share_id, title, author, locale, sender, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, title, author, locale, sender, new Date().toISOString())
    .run();
  const still = readStill(body.still);
  if (still) {
    // The row is claimed before the object is written, so two senders of the same file
    // cannot both write a still.
    const { meta: claimed } = await env.DB.prepare(
      `UPDATE submissions SET thumbnail = ?
       WHERE share_id = ? AND status = 'pending' AND thumbnail IS NULL`,
    )
      .bind(still.type, id)
      .run();
    if (claimed.changes > 0) {
      const stored = await env.DATA.put(galleryStillKey(id), still.bytes, {
        httpMetadata: { contentType: still.type },
      }).catch(() => null);
      if (!stored)
        await env.DB.prepare(`UPDATE submissions SET thumbnail = NULL WHERE share_id = ?`)
          .bind(id)
          .run();
    }
  }
  if (meta.changes > 0) return privateJson({ id, status: 'pending' }, 201);
  const row = await env.DB.prepare(`SELECT status FROM submissions WHERE share_id = ?`)
    .bind(id)
    .first<{ status: string }>();
  return privateJson({ id, status: row?.status ?? 'pending' });
}

/** A notice's link: a path on the site or an https address, and nothing else. */
const NOTICE_HREF = /^(\/(?!\/)|https:\/\/)[^\s"'<>]*$/;

/** GET /data/notice/: the newest active notice whose window holds the current time, or
 *  null. Every page asks for it, so the answer is kept in the edge cache for its minute and
 *  D1 is read at most once a minute per location. */
async function currentNotice(url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  const key = new Request(new URL('/data/notice/', url).toString());
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return hit;
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `SELECT id, text_en, text_ko, href FROM notices
     WHERE active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?)
     ORDER BY id DESC LIMIT 1`,
  )
    .bind(now, now)
    .first<{ id: number; text_en: string; text_ko: string; href: string | null }>()
    .catch(() => null);
  const response = json({
    notice: row
      ? {
          id: row.id,
          text: { en: row.text_en, ko: row.text_ko || row.text_en },
          href: row.href && NOTICE_HREF.test(row.href) ? row.href : null,
        }
      : null,
  });
  ctx.waitUntil(cache.put(key, response.clone()));
  return response;
}

/** GET /data/gallery/: the approved submissions, the most recently approved first. Each names
 *  its page on the gallery and its still there, when it has one. */
async function listGallery(env: Env): Promise<Response> {
  const rows = await listEntries(env.DB, 'recent', GALLERY_LIST_MAX);
  return json({
    entries: rows.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      path: row.path,
      views: row.views,
      approvedAt: row.approvedAt,
      url: `/s/${row.id}/`,
      page: `${GALLERY_ORIGIN}/${row.id}/`,
      still: row.still
        ? `${GALLERY_ORIGIN}${galleryStillPath('/stills', row.id, row.still)}`
        : null,
    })),
  });
}

/** GET /s/<id>/: the page the share opens, with its fragment. The open is counted after the
 *  answer is sent, so the redirect does not wait on the write. */
async function openShare(url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  const id = /^\/s\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  const row =
    id && SHARE_ID.test(id)
      ? await env.DB.prepare(`SELECT path, fragment FROM shares WHERE id = ?`)
          .bind(id)
          .first<{ path: string; fragment: string }>()
          .catch(() => null)
      : null;
  // /s/ is no page of the build's, so the asset handler answers it with the 404 page.
  if (!row) return env.ASSETS.fetch(new Request(new URL('/s/', url)));
  ctx.waitUntil(
    env.DB.prepare(`UPDATE shares SET views = views + 1, last_opened_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), id)
      .run()
      .catch(() => undefined),
  );
  // Not cached, so every open reaches the Worker and is counted.
  return new Response(null, {
    status: 302,
    // The id alone, which the page resolves through /data/shares/<id>/. The file itself once rode
    // in this address, and a large one made a redirect of tens of kilobytes that did not open.
    headers: { location: `${url.origin}${row.path}#share=${id}`, ...noStore },
  });
}

/** The daily cron: the shares nobody has opened for SHARE_TTL_DAYS. */
async function expireShares(env: Env): Promise<void> {
  const cutoff = new Date(Date.now() - SHARE_TTL_DAYS * 86_400_000).toISOString();
  const { meta } = await env.DB.prepare(
    `DELETE FROM shares WHERE COALESCE(last_opened_at, created_at) < ?
     AND id NOT IN (SELECT share_id FROM submissions)
     AND id NOT IN (SELECT share_id FROM issues WHERE share_id IS NOT NULL)`,
  )
    .bind(cutoff)
    .run();
  console.log(`expired ${meta.changes} shares not opened since ${cutoff}`);
}

// The issue dialog (src/components/IssueDialog.astro, docs/cloudflare.md): a reader with no
// GitHub account files an issue, and the Worker opens it with the credential it holds.

/** The hosts that open issues: the site, and `wrangler dev`. */
const ISSUE_HOSTS = new Set(['typeshade.dev', 'localhost', '127.0.0.1']);
/** A pull request's preview version answers at workers.dev with the site's bindings and
 *  secrets. There the dialog runs as it does on the site, and the Worker checks each report
 *  and files nothing, so a reviewer can try it. */
const isPreview = (url: URL): boolean => url.hostname.endsWith('.workers.dev');
/** Issues the dialog opens in a day, from one address and from every reader together. Past
 *  either, the dialog asks the reader to try again the next day. */
const ISSUES_PER_ADDRESS = 5;
const ISSUES_PER_DAY = 20;
const COMMIT = /^[0-9a-f]{7,40}$/;
/** The images every issue shows, under /data/issue-images/ and issue-images/ in the bucket,
 *  named by their content so the same picture sent twice is one object. */
const IMAGE_NAME = /^[A-Za-z0-9_-]{22}\.(?:png|jpg|gif|webp)$/;
/** A request the dialog sends: every image at its largest, and room for the words. */
const ISSUE_REQUEST_MAX = ISSUE_IMAGES_MAX * ISSUE_IMAGE_BYTES + 256 * 1024;

/** The hosts of a local run, where the dialog opens without Turnstile so it can be tried. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Whether the Worker takes reports here: a host that opens issues and a credential, and on
 *  the site itself Turnstile too. Its issues are public the moment they are opened, with no
 *  one approving them first, so the site never takes one without a check for a person. */
const issueOpen = (url: URL, env: Env): boolean =>
  ISSUE_HOSTS.has(url.hostname) &&
  hasCredential(env) &&
  (challengeKey(env) !== undefined || LOCAL_HOSTS.has(url.hostname));

const refuse = (error: IssueError, status: number): Response =>
  privateJson({ error } satisfies IssueAnswer, status);

/** Turnstile's site key, where the Worker holds both halves of the pair and checks for a
 *  person before it opens an issue. */
const challengeKey = (env: Env): string | undefined =>
  env.TURNSTILE_SITE_KEY?.trim() && env.TURNSTILE_SECRET_KEY?.trim()
    ? env.TURNSTILE_SITE_KEY.trim()
    : undefined;

/** GET /data/issues/: the dialog asks first. Where this says no, a report link is followed to
 *  GitHub's own form. A preview has no Turnstile: the widget knows only the site's host. */
function issueStatus(url: URL, env: Env): Response {
  if (isPreview(url)) return privateJson({ open: true } satisfies IssueStatus);
  const open = issueOpen(url, env);
  const challenge = challengeKey(env);
  return privateJson((open && challenge ? { open, challenge } : { open }) satisfies IssueStatus);
}

/** GET /data/issue-images/<name>: a picture an issue shows. Its name is its content, so it is
 *  kept for a year and never looked up again. */
async function issueImage(name: string, env: Env): Promise<Response> {
  const object = await env.DATA.get(`issue-images/${name}`).catch(() => null);
  if (!object) return json({ error: `no image '${name}'` }, 404);
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'",
    },
  });
}

interface IssueImage {
  readonly name: string;
  readonly type: string;
  readonly bytes: ArrayBuffer;
}

/** The kinds of image an issue takes, known by their first bytes, whatever the file says. */
const IMAGE_KINDS: readonly {
  readonly ext: string;
  readonly type: string;
  readonly magic: readonly (readonly [number, number])[];
}[] = [
  {
    ext: 'png',
    type: 'image/png',
    magic: [
      [0, 0x89],
      [1, 0x50],
      [2, 0x4e],
      [3, 0x47],
    ],
  },
  {
    ext: 'jpg',
    type: 'image/jpeg',
    magic: [
      [0, 0xff],
      [1, 0xd8],
      [2, 0xff],
    ],
  },
  {
    ext: 'gif',
    type: 'image/gif',
    magic: [
      [0, 0x47],
      [1, 0x49],
      [2, 0x46],
      [3, 0x38],
    ],
  },
  // RIFF, then WEBP at byte 8.
  {
    ext: 'webp',
    type: 'image/webp',
    magic: [
      [0, 0x52],
      [1, 0x49],
      [2, 0x46],
      [3, 0x46],
      [8, 0x57],
      [9, 0x45],
      [10, 0x42],
      [11, 0x50],
    ],
  },
];

/** One uploaded file as an image the issue can show, or undefined for anything else. */
async function readImage(file: File): Promise<IssueImage | undefined> {
  if (file.size === 0 || file.size > ISSUE_IMAGE_BYTES) return undefined;
  const bytes = await file.arrayBuffer();
  const head = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
  const kind = IMAGE_KINDS.find((k) => k.magic.every(([at, byte]) => head[at] === byte));
  if (!kind) return undefined;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const id = btoa(String.fromCharCode(...digest.slice(0, 17)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 22);
  return { name: `${id}.${kind.ext}`, type: kind.type, bytes };
}

interface IssueDraft {
  readonly repo: IssueRepo;
  readonly title: string;
  readonly text: string;
  readonly page?: string;
  readonly share?: string;
  readonly files: readonly IssueFile[];
  readonly images: readonly IssueImage[];
  readonly compiler?: string;
  readonly challenge: string;
}

/** The request as the dialog sends it; `invalid` or `image` for anything else. */
async function readIssue(form: FormData): Promise<IssueDraft | IssueError> {
  const field = (name: IssueField): string | undefined => {
    const value = form.get(name);
    return typeof value === 'string' ? value : undefined;
  };
  // The dialog hides this field from a person; a script that fills in every field fills it.
  if (field('website')) return 'invalid';
  const repo = field('repo');
  if (!isIssueRepo(repo)) return 'invalid';
  const title = (field('title') ?? '').replace(/\s+/g, ' ').trim();
  const text = (field('text') ?? '').replace(/\r\n?/g, '\n').trim();
  if (!title || title.length > ISSUE_TITLE_MAX || text.length > ISSUE_TEXT_MAX) return 'invalid';
  const page = field('page');
  const share = field('share');
  const compiler = field('compiler');
  if (page !== undefined && !ISSUE_PAGE.test(page)) return 'invalid';
  if (share !== undefined && !SHARE_ID.test(share)) return 'invalid';
  if (compiler !== undefined && !COMMIT.test(compiler)) return 'invalid';
  const files: IssueFile[] = [];
  const program = field('files');
  if (program !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(program);
    } catch {
      return 'invalid';
    }
    if (!Array.isArray(parsed) || parsed.length > ISSUE_FILES_MAX) return 'invalid';
    for (const file of parsed as unknown[]) {
      const { name, text: source } = (file ?? {}) as { name?: unknown; text?: unknown };
      if (typeof name !== 'string' || !ISSUE_FILE_NAME.test(name) || typeof source !== 'string')
        return 'invalid';
      files.push({ name, text: source });
    }
    if (files.reduce((size, file) => size + file.text.length, 0) > ISSUE_PROGRAM_MAX)
      return 'invalid';
  }
  const uploads = form.getAll('image');
  if (uploads.length > ISSUE_IMAGES_MAX) return 'image';
  const images: IssueImage[] = [];
  for (const upload of uploads) {
    const image = typeof upload === 'string' ? undefined : await readImage(upload);
    if (!image) return 'image';
    if (!images.some((held) => held.name === image.name)) images.push(image);
  }
  return {
    repo,
    title,
    text,
    ...(page ? { page } : {}),
    ...(share ? { share } : {}),
    files,
    images,
    ...(compiler ? { compiler } : {}),
    challenge: field('challenge') ?? '',
  };
}

/** Whether Turnstile saw a person send this token. */
async function passesChallenge(secret: string, token: string, address: string): Promise<boolean> {
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (address) form.append('remoteip', address);
  const outcome = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
    .then((res) => res.json<{ success?: boolean }>())
    .catch(() => undefined);
  return outcome?.success === true;
}

/** The fence around a file: longer than any run of backticks in it, so the file cannot close
 *  its own block. */
const fence = (text: string): string =>
  '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));

/** A mention outside code notifies the account it names, and the form speaks for nobody, so
 *  `@name` in the reader's words is set as code, the way a decorator reads in a shader file. */
const quiet = (prose: string): string =>
  prose.replace(/(^|[^\w`])@([A-Za-z0-9][\w-]*)/g, '$1`@$2`');

/** The reader's words as the body's Markdown, mentions quieted outside code. A code fence left
 *  open is closed and an HTML comment is written out, so neither swallows the program under
 *  them. */
function readerMarkdown(text: string): string {
  const out: string[] = [];
  let open: string | undefined;
  for (const line of text.split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (open) {
      if (marker && marker[0] === open[0] && marker.length >= open.length && line.trim() === marker)
        open = undefined;
      out.push(line);
    } else if (marker) {
      open = marker;
      out.push(line);
    } else {
      out.push(
        line
          .split(/(`+[^`]*`+)/)
          .map((part, i) => (i % 2 === 1 ? part : quiet(part).replace(/<!--/g, '&lt;!--')))
          .join(''),
      );
    }
  }
  if (open) out.push(open);
  return out.join('\n');
}

/** The issue's body: where it came from, the reader's words and images, then the program. */
function issueBody(draft: IssueDraft, origin: string, shared: boolean): string {
  const lines = [
    `> Filed through the issue dialog on ${origin}/ by a reader who is not signed in to GitHub.`,
  ];
  if (draft.page || draft.compiler) lines.push('>');
  if (draft.page) lines.push(`> - Page: ${origin}${draft.page}`);
  if (draft.compiler) lines.push(`> - Compiler: ${ISSUE_REPOS.compiler}@${draft.compiler}`);
  if (draft.text) lines.push('', readerMarkdown(draft.text));
  draft.images.forEach((image, i) =>
    lines.push('', `![Image ${i + 1}](${origin}/data/issue-images/${image.name})`),
  );
  // A program too long to copy in comes as its link alone.
  if (draft.files.length > 0 || shared) {
    lines.push('', '### Program', '');
    if (shared) lines.push(`The Playground opens it at ${origin}/s/${draft.share}/.`, '');
    for (const file of draft.files) {
      const mark = fence(file.text);
      lines.push(`\`${file.name}\``, '', `${mark}ts`, file.text.replace(/\n$/, ''), mark, '');
    }
  }
  return lines.join('\n').trimEnd();
}

/** POST /data/issues/: opens the issue the dialog describes, once. */
async function createIssue(request: Request, url: URL, env: Env): Promise<Response> {
  const preview = isPreview(url);
  if (!preview && !issueOpen(url, env)) return refuse('closed', 503);
  if (request.headers.get('origin') !== url.origin) return refuse('invalid', 403);
  if (Number(request.headers.get('content-length') ?? 0) > ISSUE_REQUEST_MAX)
    return refuse('image', 413);
  const form = await request.formData().catch(() => undefined);
  if (!form) return refuse('invalid', 400);
  const draft = await readIssue(form);
  if (typeof draft === 'string') return refuse(draft, 400);
  // A preview stops here: no row, no image, and nothing against the site's limits.
  if (preview) return privateJson({ preview: true } satisfies IssueAnswer);

  // The same issue sent twice, a second click or a retry, is the one issue.
  const repo = ISSUE_REPOS[draft.repo];
  const id = await shareId(
    JSON.stringify([
      repo,
      draft.title,
      draft.text,
      draft.page ?? '',
      draft.share ?? '',
      draft.images.map((image) => image.name),
    ]),
    43,
  );
  const held = await env.DB.prepare(`SELECT number, url, created_at FROM issues WHERE id = ?`)
    .bind(id)
    .first<{ number: number | null; url: string | null; created_at: string }>();
  if (held && held.number !== null && held.url !== null)
    return privateJson({ number: held.number, url: held.url } satisfies IssueAnswer);
  // A row with no number is a request still waiting on GitHub, or one that died before it
  // could clear its row.
  if (held) {
    if (Date.parse(held.created_at) > Date.now() - 60_000) return refuse('limit', 429);
    await env.DB.prepare(`DELETE FROM issues WHERE id = ? AND number IS NULL`).bind(id).run();
  }

  // The address, hashed, as the gallery counts its senders; the address is never stored.
  const address = request.headers.get('cf-connecting-ip') ?? '';
  const sender = await shareId(`sender:${address}`, 16);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const today = await env.DB.prepare(
    `SELECT COUNT(*) AS total, COALESCE(SUM(sender = ?), 0) AS mine
     FROM issues WHERE created_at > ?`,
  )
    .bind(sender, since)
    .first<{ total: number; mine: number }>();
  if ((today?.mine ?? 0) >= ISSUES_PER_ADDRESS || (today?.total ?? 0) >= ISSUES_PER_DAY)
    return refuse('limit', 429);
  const secret = challengeKey(env) && env.TURNSTILE_SECRET_KEY?.trim();
  if (secret && !(await passesChallenge(secret, draft.challenge, address)))
    return refuse('challenge', 403);
  // The program's short link, where the share is one the Worker holds. The issue keeps it
  // from the cron that expires the shares nobody opens.
  const shared = draft.share
    ? (await env.DB.prepare(`SELECT id FROM shares WHERE id = ?`).bind(draft.share).first()) !==
      null
    : false;
  const claim = await env.DB.prepare(
    `INSERT OR IGNORE INTO issues (id, repo, share_id, sender, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, repo, shared ? draft.share : null, sender, new Date().toISOString())
    .run();
  if (claim.meta.changes === 0) return refuse('limit', 429);
  const stored: string[] = [];
  try {
    // The images go in first, so the issue never shows one that is not there yet. An image
    // an earlier issue already stored is left as it is.
    for (const image of draft.images) {
      const key = `issue-images/${image.name}`;
      if (await env.DATA.head(key)) continue;
      await env.DATA.put(key, image.bytes, { httpMetadata: { contentType: image.type } });
      stored.push(key);
    }
    const opened = await openIssue(env, repo, {
      title: draft.title,
      body: issueBody(draft, url.origin, shared),
      labels: [ISSUE_LABEL],
    });
    await env.DB.prepare(`UPDATE issues SET number = ?, url = ? WHERE id = ?`)
      .bind(opened.number, opened.url, id)
      .run();
    console.log(`the dialog opened ${repo}#${opened.number}`);
    return privateJson(opened satisfies IssueAnswer, 201);
  } catch (error) {
    console.error(`the dialog's issue in ${repo} was not opened: ${String(error)}`);
    // No issue shows the images this request stored, so they go too.
    await Promise.all(stored.map((key) => env.DATA.delete(key).catch(() => undefined)));
    await env.DB.prepare(`DELETE FROM issues WHERE id = ?`)
      .bind(id)
      .run()
      .catch(() => undefined);
    return refuse('github', 502);
  }
}

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** The dictionaries' inline marks, as src/components/Rich.astro renders the two a blurb uses:
 *  a code span, and a link, which keeps its text only unless it points at a page. */
function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]*)`/g, '<code>$1</code>')
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_m, label: string, href: string) =>
      /^(https:\/\/|\/)/.test(href) ? `<a href="${href}">${label}</a>` : label,
    );
}

/** The template page, filled in with one example. The template is a built page
 *  (src/components/pages/RuntimeExamplePage.astro): the markup, the scripts and the styles are
 *  the build's, and only the example's own text is written in here. */
function fill(template: Response, record: ExampleRecord, locale: DataLocale, path: string) {
  const templatePath = `/guide/examples/${TEMPLATE_ID}/`;
  const { title, description } = record.page[locale];
  const name = record.title[locale];
  const retarget = (value: string): string => value.split(templatePath).join(path);
  // The template's own title and description, as the JSON-LD block repeats them.
  let templateTitle = '';
  let templateDescription = '';
  let ld = '';

  const panes: Record<string, string | undefined> = {
    source: record.source,
    wgsl: record.emitted.wgsl,
    vertex: record.emitted.glsl?.vertex,
    fragment: record.emitted.glsl?.fragment,
  };
  // The pane whose text the next [data-runtime-code] takes: the handlers run in document
  // order, and each code slot sits inside its pane.
  let pane: string | undefined;
  const playgroundExample = {
    id: record.id,
    source: record.source,
    title: name,
    description: record.blurb[locale],
  };

  return (
    new HTMLRewriter()
      .on('title', {
        text(chunk) {
          templateTitle += chunk.text;
          chunk.remove();
          if (chunk.lastInTextNode) chunk.after(escapeHtml(title), { html: true });
        },
      })
      .on('meta[name="description"]', {
        element(e) {
          templateDescription = e.getAttribute('content') ?? '';
          e.setAttribute('content', description);
        },
      })
      .on('meta[property="og:title"], meta[name="twitter:title"]', {
        element(e) {
          e.setAttribute('content', title);
        },
      })
      .on('meta[property="og:description"], meta[name="twitter:description"]', {
        element(e) {
          e.setAttribute('content', description);
        },
      })
      // The template keeps itself out of the index; the page it becomes is an example page.
      .on('meta[name="robots"]', {
        element(e) {
          e.remove();
        },
      })
      .on('[href*="/guide/examples/"], [content*="/guide/examples/"]', {
        element(e) {
          for (const attr of ['href', 'content']) {
            const value = e.getAttribute(attr);
            if (value?.includes(templatePath)) e.setAttribute(attr, retarget(value));
          }
        },
      })
      .on('script[type="application/ld+json"]', {
        text(chunk) {
          ld += chunk.text;
          chunk.remove();
          if (!chunk.lastInTextNode) return;
          const js = (s: string): string => JSON.stringify(s).slice(1, -1);
          let out = retarget(ld);
          if (templateTitle) out = out.split(js(templateTitle)).join(js(title));
          if (templateDescription) out = out.split(js(templateDescription)).join(js(description));
          chunk.after(out.replace(/</g, '\\u003c'), { html: true });
          ld = '';
        },
      })
      .on('[data-runtime="name"]', {
        element(e) {
          e.setInnerContent(name);
        },
      })
      .on('[data-runtime="blurb"]', {
        element(e) {
          e.setInnerContent(inline(record.blurb[locale]), { html: true });
        },
      })
      .on('[data-runtime="source-link"]', {
        element(e) {
          e.setAttribute('href', record.sourceHref);
        },
      })
      .on('[data-runtime="file-name"]', {
        element(e) {
          e.setInnerContent(record.file);
        },
      })
      .on('[data-runtime-corpus]', {
        element(e) {
          if (e.getAttribute('data-runtime-corpus') !== record.corpus) e.remove();
        },
      })
      .on('[data-runtime-tab]', {
        element(e) {
          const key = e.getAttribute('data-runtime-tab')!;
          if (panes[key] === undefined) e.remove();
          else if (key === 'source') e.setInnerContent(record.file);
        },
      })
      .on('[data-runtime-pane]', {
        element(e) {
          const key = e.getAttribute('data-runtime-pane')!;
          pane = panes[key];
          if (pane === undefined) e.remove();
          else if (key === 'source') e.setAttribute('data-entry-line', String(record.entryLine));
        },
      })
      .on('[data-runtime-code]', {
        element(e) {
          // One span per line, so the pane can open on the line the shader starts at
          // (src/scripts/example-stage.ts), as a built pane does.
          const lines = (pane ?? '').split('\n');
          e.setInnerContent(
            lines
              .map(
                (line, i) =>
                  `<span class="runtime-line">${escapeHtml(line)}${i < lines.length - 1 ? '\n' : ''}</span>`,
              )
              .join(''),
            { html: true },
          );
        },
      })
      .on('[data-playground]', {
        element(e) {
          e.setAttribute('data-examples', JSON.stringify([playgroundExample]));
          e.setAttribute('data-default-example', record.id);
        },
      })
      .on('[data-gpu-frame]', {
        element(e) {
          if (!record.still) return;
          // Astro scopes the Playground's styles by an attribute on each of its elements, so
          // the still carries the frame's own.
          const scope = [...e.attributes].find(([n]) => n?.startsWith('data-astro-cid-'));
          e.prepend(
            `<img src="/stills/${record.id}.webp" alt="" loading="eager" decoding="async"${scope ? ` ${scope[0]}` : ''}>`,
            { html: true },
          );
        },
      })
      .transform(template)
  );
}

/** /guide/examples/<id>/ and its Korean twin. */
async function examplePage(request: Request, url: URL, env: Env): Promise<Response> {
  const match = /^(\/ko)?\/guide\/examples\/([^/]+)\/$/.exec(url.pathname);
  const built = await env.ASSETS.fetch(request);
  // The routes end in a slash, and the asset handler redirects a path without one only when
  // the build has the page; a newer example's page gets the same redirect here.
  if (built.status === 404 && /^(\/ko)?\/guide\/examples\/[a-z0-9-]+$/.test(url.pathname))
    return Response.redirect(`${url.origin}${url.pathname}/${url.search}`, 307);
  if (!match || built.status !== 404) {
    // The template is not a page of its own.
    if (match?.[2] === TEMPLATE_ID)
      return env.ASSETS.fetch(new Request(new URL(`${match[1] ?? ''}/guide/examples/-/`, url)));
    return built;
  }
  const [, prefix = '', id = ''] = match;
  if (!ID.test(id) || request.method !== 'GET') return built;
  const record = await readJson<ExampleRecord>(env, `examples/${id}.json`);
  if (!record) return built;
  const template = await env.ASSETS.fetch(
    new Request(new URL(`${prefix}/guide/examples/${TEMPLATE_ID}/`, url)),
  );
  if (!template.ok) return built;
  const page = fill(template, record, prefix ? 'ko' : 'en', `/guide/examples/${id}/`);
  const headers = new Headers(page.headers);
  headers.set('cache-control', 'public, max-age=60');
  headers.set('x-typeshade-example', 'release');
  return new Response(page.body, { status: 200, headers });
}

/** The gallery's routes on the site: its old page under the Playground, and the pages the build
 *  writes for worker/gallery.ts to fill in, which are no pages of the site's own. */
const GALLERY_PATH = /^(\/ko)?\/(?:playground\/)?gallery(?:\/|$)/;

/** The gallery's list, in the language the path asked for. Permanent, so a bookmark or a link
 *  elsewhere moves with it. */
function galleryRedirect(prefix: string, url: URL): Response {
  return new Response(null, {
    status: 301,
    headers: {
      location: `${GALLERY_ORIGIN}${prefix}/${url.search}`,
      'cache-control': 'public, max-age=3600',
    },
  });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/data/')) return api(request, url, env, ctx);
    if (url.pathname.startsWith('/s/')) return openShare(url, env, ctx);
    if (/^(\/ko)?\/guide\/examples\//.test(url.pathname)) return examplePage(request, url, env);
    const gallery = GALLERY_PATH.exec(url.pathname);
    if (gallery) return galleryRedirect(gallery[1] ?? '', url);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(expireShares(env));
    ctx.waitUntil(cleanupBenchmarks(env.DB));
  },
} satisfies ExportedHandler<Env>;
