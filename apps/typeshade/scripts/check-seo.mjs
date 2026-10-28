// The metadata every built page must carry, and the URL form the site links itself by.
// Runs over dist/ after the build (bun run qa:seo, also in deploy.yml). Any failure exits 1.
//
// Usage: node scripts/check-seo.mjs [dist-dir]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const dist = process.argv[2] ?? 'dist';
const SITE = 'https://typeshade.dev';
// The same bounds OpenSEO's page reporters use (scripts/openseo-audit.mts runs those too).
const TITLE_MAX = 60;
const TITLE_MIN = 10;
const DESCRIPTION_MAX = 160;
const DESCRIPTION_MIN = 70;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const one = (html, re) => (html.match(re) ?? [])[1];
const every = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const decode = (s) =>
  s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

const sitemapUrls = new Set(
  every(readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8'), /<loc>([^<]+)<\/loc>/g),
);
const problems = [];
const pages = walk(dist).filter((f) => f.endsWith('.html'));

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(dist.length + 1);
  if (html.includes('http-equiv="refresh"')) continue;
  const fail = (what) => problems.push(`${rel}: ${what}`);
  // The root 404 the host serves, and the Korean one it sends a /ko/ path on to.
  const isNotFound = rel === '404.html' || rel.endsWith('/404/index.html');
  // The example page template the Worker fills in (worker/index.ts), and the gallery's two that
  // worker/gallery.ts fills in at gallery.typeshade.dev, are noindex until they are.
  const isPreview =
    html.includes('class="api-preview"') ||
    /(^|\/)guide\/examples\/runtime-example\//.test(rel) ||
    /^(ko\/)?gallery\//.test(rel);

  const title = decode(one(html, /<title>([^<]*)<\/title>/) ?? '');
  const description = decode(one(html, /name="description" content="([^"]*)"/) ?? '');
  const canonical = one(html, /rel="canonical" href="([^"]*)"/);
  const robots = one(html, /name="robots" content="([^"]*)"/);
  const ogTitle = decode(one(html, /property="og:title" content="([^"]*)"/) ?? '');
  const h1s = every(html, /<h1[^>]*>/g);
  const imagesWithoutAlt = [...html.matchAll(/<img\b[^>]*>/g)].filter(
    (m) => !/\balt=/.test(m[0]),
  ).length;
  const internal = every(html, /href="(\/[^"#?]*)"/g);
  const noSlash = [
    ...new Set(internal.filter((u) => !u.endsWith('/') && !/\.[a-z0-9]+$/i.test(u))),
  ];

  if (!title) fail('no title');
  else if (title.length > TITLE_MAX) fail(`title is ${title.length} characters, over ${TITLE_MAX}`);
  else if (title.length < TITLE_MIN)
    fail(`title is ${title.length} characters, under ${TITLE_MIN}`);
  if (!description) fail('no description');
  else if (description.length > DESCRIPTION_MAX)
    fail(`description is ${description.length} characters, over ${DESCRIPTION_MAX}`);
  else if (!isNotFound && description.length < DESCRIPTION_MIN)
    fail(`description is ${description.length} characters, under ${DESCRIPTION_MIN}`);
  // The reference composes "Name, a <kind> in <category>." from the kind words, and 'interface'
  // is the one that takes "an" (src/i18n/en.ts, api.pageDescription).
  const article = description.match(/\ba (?:interface)\b|\ban (?:function|constant|type|class)\b/i);
  if (article) fail(`description says "${article[0]}"`);
  if (!canonical) fail('no canonical');
  else if (!isNotFound && !canonical.endsWith('/'))
    fail(`canonical ${canonical} does not end in a slash`);
  if (ogTitle !== title) fail(`og:title "${ogTitle}" differs from the title`);
  if (h1s.length !== 1) fail(`${h1s.length} h1 elements`);
  if (imagesWithoutAlt) fail(`${imagesWithoutAlt} images without alt`);
  if (noSlash.length) fail(`links without a trailing slash: ${noSlash.join(', ')}`);
  if (!html.includes('application/ld+json')) fail('no JSON-LD');
  // The reference and the guide render a BreadcrumbList from the trail they already show.
  if (!isNotFound && /^(ko\/)?(api\/|guide\/authoring\/)/.test(rel)) {
    const ld = one(html, /<script type="application\/ld\+json">([^]*?)<\/script>/);
    let graph = [];
    try {
      graph = JSON.parse(ld ?? '{}')['@graph'] ?? [];
    } catch {
      graph = [];
    }
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
    if (!crumbs) fail('no BreadcrumbList in JSON-LD');
    else if (!Array.isArray(crumbs.itemListElement) || crumbs.itemListElement.length === 0)
      fail('BreadcrumbList has no items');
  }
  // TypePlot's released font shader retains these third-party implementation credits.
  // They identify the licensed text renderer, independently of the compiler's former brand.
  const fontCredits = [
    'X-GIS/TinySDF distance encoding over licensed IBM Plex input glyphs.',
    'X-GIS/X-GIS map/src/shaders/dsl/text.ts (MIT).',
    "X-GIS's local-glyph size routing while keeping the atlas offline.",
    'X-GIS&#39;s local-glyph size routing while keeping the atlas offline.',
    'X-GIS fill edge and analytic AA: EDGE_GAMMA 0.105 * ONE_EM 24.',
    'as X-GIS glyph slots do.',
  ];
  const branded = fontCredits.reduce(
    (text, credit) => text.replaceAll(credit, ''),
    html.replace(/XGIS_SHADER_DSL_TRACE/g, ''),
  );
  if (/x-?gis/i.test(branded)) fail('names the former host');
  if (!/property="og:image" content="https:/.test(html)) fail('no absolute og:image');

  if (isPreview) {
    if (robots !== 'noindex') fail('a template preview must carry noindex');
  } else if (isNotFound) {
    if (robots !== 'noindex') fail('the 404 must carry noindex');
  } else {
    if (robots) fail(`unexpected robots directive: ${robots}`);
    if (!sitemapUrls.has(canonical)) fail(`canonical ${canonical} is not in the sitemap`);
    const lang = one(html, /<html lang="([^"]*)"/);
    if (!every(html, /hreflang="([^"]*)"/g).includes('x-default')) fail('no x-default alternate');
    if (!html.includes(`property="og:locale" content="${lang === 'ko' ? 'ko_KR' : 'en_US'}"`))
      fail('og:locale does not match lang');
    // A Korean page's own text links to Korean pages. A link from the body to an English guide,
    // reference or API page sends a Korean reader out of the language they chose; the nav and
    // the language switch are outside <main> or inside a <nav> and are not counted.
    if (rel.startsWith('ko/')) {
      const main = (one(html, /<main[^>]*>([\s\S]*)<\/main>/) ?? '').replace(
        /<nav[\s\S]*?<\/nav>/g,
        '',
      );
      for (const href of every(main, /href="(\/(?:guide|reference|api)\/[^"]*)"/g))
        fail(`links from its body to the English page ${href}`);
    }
  }
}

for (const url of sitemapUrls) {
  if (!url.startsWith(`${SITE}/`)) problems.push(`sitemap: ${url} is off-site`);
  const file = path.join(dist, url.slice(SITE.length), 'index.html');
  if (!pages.includes(file)) problems.push(`sitemap: ${url} has no ${file}`);
}

if (problems.length) {
  console.error(problems.map((p) => `  ${p}`).join('\n'));
  console.error(`FAIL: ${problems.length} problem(s) in ${pages.length} pages`);
  process.exit(1);
}
console.log(`ok: ${pages.length} pages, ${sitemapUrls.size} sitemap entries`);
