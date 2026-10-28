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

// Global layers contain base layout/accessibility utilities only. Component CSS is
// imported by its owner outside src/styles; the repository's test:styles command
// also checks the global import graph and the CSS emitted for each route.
const GLOBAL_CLASSES = new Set(['wrap', 'wide-in', 'visually-hidden', 'skip']);
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
      if (GLOBAL_CLASSES.has(className)) continue;
      hits.push(
        `src/styles/${name}:${line}  page or component class in shared styles: .${className} belongs on that page's or component's markup as Tailwind utilities, or in its scoped <style>. Global layers contain tokens, fonts, theme and base layout/accessibility only (DESIGN.md, Styling). Import component or generated-markup styles from their owner.`,
      );
    }
  }
}

if (hits.length > 0) {
  console.error(`check-style: ${hits.length} hit(s)\n` + hits.join('\n'));
  process.exit(1);
}
console.log(
  `check-style: ${files.length} files clean, global stylesheets name only base layout/accessibility classes`,
);
