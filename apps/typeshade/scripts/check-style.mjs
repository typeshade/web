// Flags writing patterns this site does not use, in page source and in Markdown. The list
// is in DESIGN.md. A line ending in `<!-- ok -->` is skipped. Run: bun run check:style
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// The English of a reference note is page copy (DESIGN.md, Reference notes); the directory
// exists once a note is published.
const SCAN_DIRS = ['src', 'scripts', 'content/reference/en'].filter((d) =>
  existsSync(path.join(root, d)),
);
const SCAN_FILES = ['README.md', 'DESIGN.md'];
const EXT = new Set(['.astro', '.ts', '.mjs', '.md', '.css']);

const RULES = [
  { name: '"X, never Y" contrast', re: /,\s+never\s+(?:a|an|the|to|by|of|in|as|from)\b/i },
  { name: '"rather than" contrast', re: /\brather than\b/i },
  {
    name: 'all-caps emphasis',
    re: /(?<![A-Z_#\-])\b(ONE|NEVER|NOT|SAME|BOTH|ONLY|FIRST|EVERY|EXACTLY|MUST|ALL|IS|ARE)\b(?![A-Z_\-])/,
  },
  {
    name: 'self-praise word',
    re: /\b(honest(?:ly|y)?|verbatim|ratified|load-bearing|injective|of record|seamless(?:ly)?|blazing|effortless(?:ly)?|robust)\b/i,
  },
  { name: 'uppercase label', re: /text-transform:\s*uppercase|\buppercase\b/ },
  { name: 'middle-dot metadata', re: /\S\s·\s\S/ },
  {
    name: 'font on the avoid list',
    re: /\b(Inter|Geist|Space Grotesk|Instrument Serif|Poppins)\b/,
  },
  { name: 'em dash', re: /\S—\S/ },
  { name: 'raw code block, use <TypeShadeCode> or <Code>', re: /<pre><code>/ },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.astro' || name === 'vendor')
      continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(p))) out.push(p);
  }
  return out;
}

const files = [
  ...SCAN_DIRS.flatMap((d) => walk(path.join(root, d))),
  ...SCAN_FILES.map((f) => path.join(root, f)),
].filter((f) => !f.endsWith('check-style.mjs') && !f.endsWith('check-http-links.mjs'));

const hits = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('<!-- ok -->')) return;
    for (const rule of RULES) {
      if (rule.re.test(line))
        hits.push(
          `${path.relative(root, file)}:${i + 1}  ${rule.name}: ${line.trim().slice(0, 100)}`,
        );
    }
  });
}

// global.css holds the tokens, the fonts, the base element rules, dark mode, the chrome every
// page shares and the rules for markup the site does not author (Expressive Code's frames,
// Pagefind's dialog, the Markdown the loaders render). A page's or a component's own styling
// is Tailwind utilities on its markup, or that component's scoped <style> (DESIGN.md,
// Styling). So every class a selector in global.css names has to be one of these roots, or
// start with one and a hyphen.
const GLOBAL_CLASS_ROOTS = {
  chrome: [
    'site',
    'docs',
    'doc',
    'skip',
    'wrap',
    'wide',
    'visually-hidden',
    'icon',
    'chevron',
    'depth',
    'header-anchor',
    'search',
    'guide-note',
  ],
  shared: [
    'ui',
    'button',
    'alert',
    'figure',
    'tabs',
    'tile-cover',
    'no-still',
    'diagnostic',
    // The reference's vocabulary, drawn by the /api/ pages and the language reference alike.
    'api-crumbs',
    'api-kind',
    'api-summary',
    'api-list',
    'api-index',
    'api-type',
    'api-optional',
  ],
  // Expressive Code's output.
  foreign: [
    'expressive-code',
    'ec',
    'frame',
    'header',
    'title',
    'has-title',
    'is-terminal',
    'code',
    'copy',
  ],
};
const roots = Object.values(GLOBAL_CLASS_ROOTS).flat();
const styleDirectory = path.join(root, 'src/styles');
for (const name of readdirSync(styleDirectory).filter((name) => name.endsWith('.css'))) {
  const globalCss = path.join(styleDirectory, name);
  const css = readFileSync(globalCss, 'utf8');
  // Blank out comments without moving a line, so a hit keeps its line number.
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  for (const m of bare.matchAll(/([^{};]+)\{/g)) {
    const selector = m[1].trim();
    if (selector.startsWith('@')) continue;
    const line = bare.slice(0, m.index + m[0].indexOf(selector)).split('\n').length;
    for (const [, className] of selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      if (roots.some((r) => className === r || className.startsWith(`${r}-`))) continue;
      hits.push(
        `src/styles/${name}:${line}  page or component class in shared styles: .${className} belongs on that page's or component's markup as Tailwind utilities, or in its scoped <style>. global.css holds tokens, fonts, base rules, shared chrome and rules for markup the site does not author (DESIGN.md, Styling); a class that really is shared goes into GLOBAL_CLASS_ROOTS in scripts/check-style.mjs.`,
      );
    }
  }
}

if (hits.length > 0) {
  console.error(`check-style: ${hits.length} hit(s)\n` + hits.join('\n'));
  process.exit(1);
}
console.log(
  `check-style: ${files.length} files clean, shared stylesheets name only shared classes`,
);
