// Enforces the i18n rule (DESIGN.md "Languages"): every user-facing string lives in
// src/i18n/en.ts and src/i18n/ko.ts, every locale-dependent URL is built with localePath, and
// the pages themselves stay thin. Run: node scripts/check-i18n.mjs (part of bun run build,
// right after check-copy).
//   1. Route parity: every route file under src/pages has a twin at the same relative path
//      under src/pages/ko, and vice versa.
//   2. Route files are thin: no Hangul, and a page never imports another page.
//   3. Copy lives in the dictionaries: no Hangul outside src/i18n/.
//   4. No locale literal outside the dictionaries: 'ko' and anything starting with '/ko/'.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(root, 'src');
const PAGES = path.join(SRC, 'pages');
const PAGES_KO = path.join(PAGES, 'ko');
const I18N_DIR = path.join(SRC, 'i18n');
// content.config.ts defines the per-locale content collections themselves (there is no
// translated guide until a locale has one); like src/i18n/index.ts it is locale wiring, not
// page or component copy, so it names a locale the same way that file does.
const EXEMPT_FILES = new Set([
  path.join(I18N_DIR, 'index.ts'),
  path.join(I18N_DIR, 'en.ts'),
  path.join(I18N_DIR, 'ko.ts'),
  path.join(I18N_DIR, 'function-lessons-en.ts'),
  path.join(I18N_DIR, 'function-lessons-ko.ts'),
  path.join(I18N_DIR, 'operation-lessons-en.ts'),
  path.join(I18N_DIR, 'operation-lessons-ko.ts'),
  path.join(I18N_DIR, 'concept-lessons-en.ts'),
  path.join(I18N_DIR, 'concept-lessons-ko.ts'),
  path.join(I18N_DIR, 'precision-guide-en.ts'),
  path.join(I18N_DIR, 'precision-guide-ko.ts'),
  path.join(I18N_DIR, 'locales.ts'),
  path.join(SRC, 'content.config.ts'),
]);
const ROOT_ONLY_IGNORE = new Set([
  'og.astro',
  'capture-stills.astro',
  'llms.txt.ts',
  'llms-full.txt.ts',
]);
const ROUTE_EXT = new Set(['.astro', '.ts']);
const SCAN_EXT = new Set(['.astro', '.ts', '.mjs']);

const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/;
// A route file under src/pages/ko declares its own locale, as a component prop (locale="ko",
// the one-liner pattern DESIGN.md "Languages" describes), as the const it hands its layout
// (const locale = 'ko'), or as the argument to localePath() that builds its own URL. Each of
// those is the locale itself, so the three call shapes are exempt. A comparison spells the
// locale on the other side of the operator (locale === 'ko'), so it stays a branch and is
// still reported.
const KO_LITERAL = /(?<!locale\s{0,8}=\s{0,8})(?<!localePath\(\s{0,20})(['"`])ko\1/;
const KO_PATH_LITERAL = /(['"`])\/ko\//;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.astro') continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Comments blanked out (kept the same length and newlines, so line numbers still line up):
 *  // line comments (not inside a string that merely contains "//", such as a URL), block
 *  comments and HTML comments. Best-effort, the way check-style.mjs's own rules are. A line
 *  ending in `i18n-ok` (in a comment or not) is blanked entirely: for the rare structural use
 *  of a Hangul range that is not copy, such as a slug regex that lets a Korean heading keep
 *  its own characters instead of losing them to a Latin-only slug. */
function stripComments(text) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  out = out
    .split('\n')
    .map((line) => {
      if (/i18n-ok\s*$/.test(line)) return '';
      const m = /(^|[^:])\/\/(.*)$/.exec(line);
      if (!m) return line;
      const cut = m.index + m[1].length;
      return line.slice(0, cut) + ' '.repeat(line.length - cut);
    })
    .join('\n');
  return out;
}

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

const problems = [];
const add = (file, line, msg) => problems.push(`${path.relative(root, file)}:${line}  ${msg}`);

/** At most one problem per source line, even when a regex matches many times on it (a Korean
 *  sentence is many Hangul characters, not many separate problems). */
function addPerLine(file, stripped, re, msg) {
  const seen = new Set();
  for (const m of stripped.matchAll(new RegExp(re, 'g'))) {
    const line = lineAt(stripped, m.index);
    if (seen.has(line)) continue;
    seen.add(line);
    add(file, line, msg(m, stripped));
  }
}

// 1. Route parity.
const allPageFiles = walk(PAGES);
const koFiles = allPageFiles
  .filter((f) => f === PAGES_KO || f.startsWith(PAGES_KO + path.sep))
  .filter((f) => statSync(f).isFile());
const rootFiles = allPageFiles
  .filter((f) => !(f === PAGES_KO || f.startsWith(PAGES_KO + path.sep)))
  .filter((f) => statSync(f).isFile());

for (const f of rootFiles) {
  if (ROOT_ONLY_IGNORE.has(path.basename(f))) continue;
  const rel = path.relative(PAGES, f);
  const twin = path.join(PAGES_KO, rel);
  if (!koFiles.includes(twin)) add(f, 1, `route parity: no twin at src/pages/ko/${rel}`);
}
for (const f of koFiles) {
  const rel = path.relative(PAGES_KO, f);
  const twin = path.join(PAGES, rel);
  if (!rootFiles.includes(twin))
    add(f, 1, `route parity: no twin at src/pages/${rel} outside src/pages/ko`);
}

// 2. Route files are thin: no Hangul, no page-imports-page.
const routeFiles = [...rootFiles, ...koFiles].filter((f) => ROUTE_EXT.has(path.extname(f)));
for (const f of routeFiles) {
  const text = readFileSync(f, 'utf8');
  const stripped = stripComments(text);
  addPerLine(
    f,
    stripped,
    HANGUL,
    (m, s) =>
      `route file has Hangul (copy belongs in src/i18n/): ${JSON.stringify(s.slice(Math.max(0, m.index - 20), m.index + 20).trim())}`,
  );
  for (const m of stripped.matchAll(/\bfrom\s+(['"])([^'"]+)\1/g)) {
    const spec = m[2];
    if (!spec.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(f), spec);
    if (resolved === f) continue;
    if (resolved === PAGES || resolved.startsWith(PAGES + path.sep)) {
      add(
        f,
        lineAt(stripped, m.index),
        `route file imports another page: '${spec}' (components live in src/components/pages)`,
      );
    }
  }
}

// 3 & 4: no Hangul and no locale literal outside src/i18n/.
const allSrcFiles = walk(SRC).filter((f) => statSync(f).isFile() && SCAN_EXT.has(path.extname(f)));
for (const f of allSrcFiles) {
  const exempt = EXEMPT_FILES.has(f);
  const text = readFileSync(f, 'utf8');
  const stripped = stripComments(text);
  if (!exempt) {
    addPerLine(
      f,
      stripped,
      HANGUL,
      (m, s) =>
        `Hangul outside src/i18n/: ${JSON.stringify(s.slice(Math.max(0, m.index - 20), m.index + 20).trim())}`,
    );
    addPerLine(f, stripped, KO_LITERAL, () => `locale literal 'ko' outside the dictionaries`);
    addPerLine(
      f,
      stripped,
      KO_PATH_LITERAL,
      () => `locale literal '/ko/' outside the dictionaries; use localePath()`,
    );
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error(
    `check-i18n: ${problems.length} problem(s) in ${new Set(problems.map((p) => p.split(':')[0])).size} file(s)`,
  );
  process.exit(1);
}
console.log(
  `check-i18n: ${allSrcFiles.length} files clean, ${routeFiles.length} route files thin, route parity ok`,
);
