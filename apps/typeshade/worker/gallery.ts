// gallery.typeshade.dev's Worker (docs/cloudflare.md, The gallery). It serves the same dist/ as
// the site's Worker, runs first on every request (wrangler.gallery.jsonc), and reads the same
// database and bucket:
//
// /, /ko/              the approved entries, newest first or, with ?sort=popular, most opened
//                      first: the built template /gallery/ filled in
// /<id>/, /ko/<id>/    an entry's old page: a redirect to the entry in the Playground
// /stills/<id>.<ext>   an approved entry's still, from R2 (galleryStillPath)
// /review/             the maintainer's queue, behind Cloudflare Access (worker/gallery-review.ts)
// /sitemap.xml, /robots.txt
// a file (a name with a dot, /_astro/...): the build's, as the site serves it
// anything else        a redirect to the same path on typeshade.dev
//
// The built pages are written for typeshade.dev, so every page this Worker serves passes through
// `rehost`: a link to the gallery's routes becomes a link here, and every other link on the page
// goes to the site.
import {
  GALLERY_ORIGIN,
  GALLERY_ROUTE,
  GALLERY_SORTS,
  GALLERY_STILL_HEIGHT,
  GALLERY_STILL_WIDTH,
  galleryStillId,
  galleryStillKey,
  galleryStillPath,
  type GallerySort,
} from '../src/lib/gallery-data.ts';
import { findEntry, listEntries, type GalleryRow } from './gallery-store.ts';
import { review, type ReviewEnv } from './gallery-review.ts';

export interface Env extends ReviewEnv {
  readonly ASSETS: Fetcher;
  readonly DATA: R2Bucket;
  readonly DB: D1Database;
}

const SITE = 'https://typeshade.dev';
/** An entry's id is its share's (worker/index.ts, SHARE_ID). An entry had a page of its own
 *  here; a card now opens the entry in the Playground, and the old address goes there too. */
const ENTRY = /^(\/ko)?\/([A-Za-z0-9_-]{8,43})\/?$/;
const LIST = /^(\/ko)?\/$/;
/** Entries the list shows. */
const LIST_MAX = 120;

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** An attribute's value as the page means it. HTMLRewriter hands back the source text, with
 *  the build's character references still in it. */
const decodeAttribute = (value: string | null): string =>
  (value ?? '').replace(/&(quot|amp|lt|gt|#39|#x27);/g, (_m, name: string) =>
    name === 'quot' ? '"' : name === 'amp' ? '&' : name === 'lt' ? '<' : name === 'gt' ? '>' : "'",
  );

/** The words a template carries for the Worker, in `data-copy`. */
const readCopy = (e: Element): CardCopy => {
  try {
    return JSON.parse(decodeAttribute(e.getAttribute('data-copy'))) as CardCopy;
  } catch {
    return { by: '{name}', views: '{count}', viewOne: '1' };
  }
};

/** A string of the site's, rewritten for the gallery's address: the built route of the list
 *  becomes the gallery's own. */
function rehostText(text: string): string {
  return text
    .split(`${SITE}/ko${GALLERY_ROUTE}`)
    .join(`${GALLERY_ORIGIN}/ko/`)
    .split(`${SITE}${GALLERY_ROUTE}`)
    .join(`${GALLERY_ORIGIN}/`);
}

/** A link on a built page: the gallery's route becomes the gallery's own path (on whatever
 *  host serves it, so a preview stays on the preview), and every other path the site's. */
function rehostHref(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return rehostText(href);
  const match = /^(\/ko)?\/gallery\/(.*)$/.exec(href);
  if (!match) return `${SITE}${href}`;
  return `${match[1] ?? ''}/${match[2]}`;
}

/** The rewriter every page this Worker serves goes through. */
function rehost(): HTMLRewriter {
  let ld = '';
  return (
    new HTMLRewriter()
      .on('a[href]', {
        element(e) {
          e.setAttribute('href', rehostHref(e.getAttribute('href')!));
        },
      })
      .on('link[rel="sitemap"]', {
        element(e) {
          e.setAttribute('href', '/sitemap.xml');
        },
      })
      .on('link[rel="canonical"], link[rel="alternate"]', {
        element(e) {
          e.setAttribute('href', rehostText(e.getAttribute('href')!));
        },
      })
      .on('meta[content]', {
        element(e) {
          e.setAttribute('content', rehostText(e.getAttribute('content')!));
        },
      })
      // The template keeps itself out of the index on typeshade.dev; served here it is the
      // gallery's page.
      .on('meta[name="robots"]', {
        element(e) {
          e.remove();
        },
      })
      .on('script[type="application/ld+json"]', {
        text(chunk) {
          ld += chunk.text;
          chunk.remove();
          if (!chunk.lastInTextNode) return;
          chunk.after(rehostText(ld), { html: true });
          ld = '';
        },
      })
  );
}

interface CardCopy {
  readonly by: string;
  readonly views: string;
  readonly viewOne: string;
}

/** An entry's line: who sent it, when it was approved, how often it was opened. */
function metaSpans(row: GalleryRow, copy: CardCopy, locale: string): string {
  const parts: string[] = [];
  if (row.author) parts.push(copy.by.replace('{name}', row.author));
  const date = new Date(row.approvedAt);
  if (!Number.isNaN(date.getTime()))
    parts.push(
      date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    );
  parts.push(
    row.views === 1
      ? copy.viewOne
      : copy.views.replace('{count}', row.views.toLocaleString(locale)),
  );
  return parts.map((part) => `<span>${escapeHtml(part)}</span>`).join('');
}

/** The panel that stands in for a still an entry was sent without: two colours from its id,
 *  so each entry keeps its own. */
function stillStandIn(row: GalleryRow): string {
  let hash = 0;
  for (const c of row.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const a = hash % 360;
  const b = (a + 40 + ((hash >>> 9) % 80)) % 360;
  return `<span class="gallery-still gallery-still-none" style="background:linear-gradient(135deg,hsl(${a} 55% 42%),hsl(${b} 60% 22%))"></span>`;
}

function stillImage(row: GalleryRow, eager: boolean): string {
  return `<img class="gallery-still" src="${galleryStillPath('/stills', row.id, row.still ?? '')}" alt="" width="${GALLERY_STILL_WIDTH}" height="${GALLERY_STILL_HEIGHT}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}

/** One entry's card. It opens the entry in the Playground, where it runs, through its short
 *  link. */
function card(row: GalleryRow, copy: CardCopy, locale: string, i: number): string {
  const still = row.still ? stillImage(row, i < 8) : stillStandIn(row);
  return `<li><a class="gallery-card" href="${SITE}/s/${row.id}/">${still}<span class="gallery-card-body"><h2>${escapeHtml(row.title)}</h2><p class="gallery-meta">${metaSpans(row, copy, locale)}</p></span></a></li>`;
}

const pageHeaders = (from: Response): Headers => {
  const headers = new Headers(from.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  // An approval or a view shows within a minute.
  headers.set('cache-control', 'public, max-age=60');
  return headers;
};

async function template(env: Env, url: URL, route: string): Promise<Response | null> {
  const page = await env.ASSETS.fetch(new Request(new URL(route, url)));
  return page.ok ? page : null;
}

async function listPage(env: Env, url: URL, prefix: string): Promise<Response> {
  const asked = url.searchParams.get('sort');
  const sort: GallerySort = GALLERY_SORTS.includes(asked as GallerySort)
    ? (asked as GallerySort)
    : 'recent';
  const page = await template(env, url, `${prefix}${GALLERY_ROUTE}`);
  if (!page) return notFound(env, url);
  const rows = await listEntries(env.DB, sort, LIST_MAX);
  const filled = rehost()
    .on('[data-gallery-sort]', {
      element(e) {
        if (e.getAttribute('data-gallery-sort') === sort) e.setAttribute('aria-current', 'page');
      },
    })
    .on('[data-gallery-empty]', {
      element(e) {
        if (rows.length > 0) e.remove();
      },
    })
    .on('[data-gallery-list]', {
      element(e) {
        const copy = readCopy(e);
        const locale = e.getAttribute('data-locale') ?? 'en';
        e.removeAttribute('data-copy');
        e.setInnerContent(rows.map((row, i) => card(row, copy, locale, i)).join(''), {
          html: true,
        });
      },
    })
    .transform(page);
  return new Response(filled.body, { status: 200, headers: pageHeaders(page) });
}

async function notFound(env: Env, url: URL): Promise<Response> {
  const page = await env.ASSETS.fetch(new Request(new URL('/404.html', url)));
  const body = page.ok ? rehost().transform(page).body : 'Not found';
  return new Response(body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}

/** An approved entry's still. A pending one's is the review page's alone. */
async function still(env: Env, id: string): Promise<Response> {
  const row = await findEntry(env.DB, id);
  const object = row?.still ? await env.DATA.get(galleryStillKey(id)).catch(() => null) : null;
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'",
    },
  });
}

function sitemap(): Response {
  const urls = ['', 'ko/'].map((prefix) => `<url><loc>${GALLERY_ORIGIN}/${prefix}</loc></url>`);
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`,
    {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    },
  );
}

const ROBOTS = `User-agent: *\nDisallow: /review/\n\nSitemap: ${GALLERY_ORIGIN}/sitemap.xml\n`;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/review' || path.startsWith('/review/')) return review(request, url, env);
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    const list = LIST.exec(path);
    if (list) return listPage(env, url, list[1] ?? '');
    const entry = ENTRY.exec(path)?.[2];
    if (entry)
      return new Response(null, {
        status: 301,
        headers: { location: `${SITE}/s/${entry}/`, 'cache-control': 'public, max-age=3600' },
      });
    if (path === '/ko') return Response.redirect(`${url.origin}/ko/`, 308);
    const stillId = galleryStillId('/stills', path);
    if (stillId) return still(env, stillId);
    if (path === '/robots.txt')
      return new Response(ROBOTS, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (path === '/sitemap.xml') return sitemap();
    // The issue dialog asks whether reports are taken here, and they are not: its links go to
    // GitHub's own form. The site's Worker takes them only from typeshade.dev.
    if (path === '/data/issues/')
      return new Response(JSON.stringify({ open: false }), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    // The notice, and anything else the pages ask the site for, answers there, with CORS.
    if (path.startsWith('/data/') || path.startsWith('/s/'))
      return Response.redirect(`${SITE}${path}${url.search}`, 307);
    const last = path.slice(path.lastIndexOf('/') + 1);
    if (path.startsWith('/_astro/') || (last.includes('.') && !last.endsWith('.html')))
      return env.ASSETS.fetch(request);
    return new Response(null, {
      status: 301,
      headers: { location: `${SITE}${path}${url.search}`, 'cache-control': 'public, max-age=3600' },
    });
  },
} satisfies ExportedHandler<Env>;
