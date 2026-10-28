// dist/ crawled by OpenSEO's site-audit engine (github.com/every-app/open-seo), the same
// discovery, page analyzer, per-page reporters and cross-page checks its hosted audit runs,
// outside its Cloudflare workflow. The checkout is pinned and cached under node_modules.
// dist is served the way GitHub Pages serves it: a directory answers at its slash, the bare
// path redirects there, and anything missing is 404.html with a 404 status. The crawler
// believes it is reading https://typeshade.dev, so canonicals and the sitemap compare exactly.
// A warning or critical issue fails; info issues are printed.
//
// Usage: bun scripts/openseo-audit.mts [dist-dir]
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.resolve(process.argv[2] ?? 'dist');
const ORIGIN = 'https://typeshade.dev';
const REPO = 'https://github.com/every-app/open-seo.git';
const COMMIT = '3632f408528cd588fec98c3a174af8ea0ad205e8';
const MAX_PAGES = 50;

const checkout = path.join(root, 'node_modules', '.cache', 'open-seo');
if (!existsSync(path.join(checkout, 'src', 'server', 'lib', 'audit', 'page-analyzer.ts'))) {
  mkdirSync(checkout, { recursive: true });
  const git = (...args: string[]) => execFileSync('git', args, { cwd: checkout, stdio: 'inherit' });
  git('init', '-q');
  git('fetch', '-q', '--depth', '1', REPO, COMMIT);
  git('checkout', '-q', COMMIT);
}
const engine = (file: string) => import(path.join(checkout, 'src', file));
const [
  { discoverUrls, parseRobotsTxt },
  { crawlPage },
  { runPageReporters },
  { findDuplicates, findRedirectChainsAndLoops },
  { isSameOrigin },
  { isCrawlableUrl },
  { AUDIT_ISSUE_TYPES, ISSUE_SEVERITY_ORDER },
] = await Promise.all([
  engine('server/lib/audit/discovery.ts'),
  engine('server/workflows/site-audit-workflow-helpers.ts'),
  engine('server/lib/audit/issues/page-reporters.ts'),
  engine('server/lib/audit/issues/multipage-checks.ts'),
  engine('server/lib/audit/url-utils.ts'),
  engine('server/lib/audit/url-policy.ts'),
  engine('shared/audit-issues.ts'),
]);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let file = path.join(dist, decodeURIComponent(url.pathname));
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/'))
      return res.writeHead(301, { location: `${url.pathname}/` }).end();
    file = path.join(file, 'index.html');
  }
  if (!existsSync(file))
    return res
      .writeHead(404, { 'content-type': TYPES['.html'] })
      .end(readFileSync(path.join(dist, '404.html')));
  res
    .writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
    .end(readFileSync(file));
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const local = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const u = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (u.origin !== ORIGIN) return realFetch(input, init);
  const res = await realFetch(`${local}${u.pathname}${u.search}`, init);
  Object.defineProperty(res, 'url', { value: u.toString() });
  return res;
}) as typeof fetch;

// Discovery, then the frontier as the engine's scratchpad keeps it: the start URL at depth
// 0, sitemap seeds with no depth, link targets one deeper than their source.
const { urls: seeds, robotsText } = await discoverUrls(ORIGIN, MAX_PAGES);
const robots = parseRobotsTxt(ORIGIN, robotsText);
type Entry = { url: string; depth: number | null; inSitemap: boolean };
const frontier: Entry[] = [
  { url: `${ORIGIN}/`, depth: 0, inSitemap: seeds.includes(`${ORIGIN}/`) },
];
const seen = new Set(frontier.map((e) => e.url));
for (const url of seeds)
  if (!seen.has(url)) {
    seen.add(url);
    frontier.push({ url, depth: null, inSitemap: true });
  }
const queueable = (link: string) =>
  isSameOrigin(link, ORIGIN) && isCrawlableUrl(link) && robots.isAllowed(link);
const enqueue = (url: string, depth: number | null) => {
  if (queueable(url) && !seen.has(url)) {
    seen.add(url);
    frontier.push({ url, depth, inSitemap: false });
  }
};

const pages: Awaited<ReturnType<typeof crawlPage>>[] = [];
const edges: Array<{ sourcePageId: string; targetUrl: string }> = [];
while (frontier.length && pages.length < MAX_PAGES) {
  const entry = frontier.shift()!;
  const page = await crawlPage(entry.url, entry.depth, entry.inSitemap);
  pages.push(page);
  const next = entry.depth === null ? null : entry.depth + 1;
  if (page.redirectUrl) enqueue(page.redirectUrl, next);
  for (const link of page.links) {
    if (!link.isInternal) continue;
    edges.push({ sourcePageId: page.id, targetUrl: link.targetUrl });
    enqueue(link.targetUrl, next);
  }
}
const completed = frontier.length === 0;
server.close();

// Per-page reporters, the cross-page checks, and the two link-graph checks the engine runs
// at finalize (broken internal links, orphans).
type Issue = { issueType: string; pageUrl: string; details?: Record<string, unknown> };
const issues: Issue[] = pages.flatMap((p) => runPageReporters(p));
issues.push(...findDuplicates(pages), ...findRedirectChainsAndLoops(pages));
const byUrl = new Map(pages.map((p) => [p.url, p]));
for (const e of edges) {
  const target = byUrl.get(e.targetUrl);
  if (target && target.fetchClass === 'ok' && target.statusCode >= 400) {
    issues.push({
      issueType: 'broken-internal-link',
      pageUrl: pages.find((p) => p.id === e.sourcePageId)!.url,
      details: { targetUrl: e.targetUrl, targetStatus: target.statusCode },
    });
  }
}
if (completed) {
  for (const p of pages) {
    if (
      p.url === `${ORIGIN}/` ||
      p.fetchClass !== 'ok' ||
      p.statusCode < 200 ||
      p.statusCode >= 300
    )
      continue;
    const linked = edges.some((e) => e.targetUrl === p.url && e.sourcePageId !== p.id);
    if (!linked && !pages.some((r) => r.redirectUrl === p.url))
      issues.push({ issueType: 'orphan-page', pageUrl: p.url });
  }
}

const short = (url: string) => url.replace(ORIGIN, '') || '/';
console.log(
  `OpenSEO audit engine at ${COMMIT.slice(0, 7)}: ${pages.length} URL(s)${completed ? '' : ' (page budget reached)'}, ${edges.length} internal link edge(s)`,
);
console.log(
  'url                      status  words  title  desc  h1  imgs/noalt  links  canonical',
);
for (const p of pages) {
  const canon =
    p.canonicalUrl === null ? '-' : p.canonicalUrl === p.url ? 'self' : short(p.canonicalUrl);
  const cols = [
    short(p.url).padEnd(25),
    String(p.statusCode).padEnd(8),
    String(p.wordCount).padEnd(7),
    String(p.title.length).padEnd(7),
    String(p.metaDescription.length).padEnd(6),
    String(p.h1Count).padEnd(4),
    `${p.imagesTotal}/${p.imagesMissingAlt}`.padEnd(12),
    String(p.links.length).padEnd(7),
    canon,
  ];
  console.log(
    cols.join('') +
      (p.redirectUrl ? `  to ${short(p.redirectUrl)}` : '') +
      (p.isIndexable ? '' : '  noindex'),
  );
}
const severity = (i: Issue) =>
  AUDIT_ISSUE_TYPES[i.issueType].severity as 'critical' | 'warning' | 'info';
issues.sort(
  (a, b) =>
    ISSUE_SEVERITY_ORDER[severity(a)] - ISSUE_SEVERITY_ORDER[severity(b)] ||
    a.issueType.localeCompare(b.issueType),
);
for (const i of issues)
  console.log(
    `  [${severity(i)}] ${i.issueType}  ${short(i.pageUrl)}${i.details ? '  ' + JSON.stringify(i.details) : ''}`,
  );
const failing = issues.filter((i) => severity(i) !== 'info');
if (failing.length) {
  console.error(`FAIL: ${failing.length} warning or critical issue(s)`);
  process.exit(1);
}
console.log(`ok: ${issues.length} info issue(s), nothing at warning or critical`);
