// The Korean font subset is generated (scripts/build-fonts.py) and committed with a sidecar
// that lists the code points it carries. The build checks that every non-ASCII character in
// the translated copy has a glyph, and that the files match the sidecar's hashes, so a new
// sentence cannot ship in the system fallback face by accident. FONTS_REBASELINE=1 skips it.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SIDECAR = 'public/fonts/ibm-plex-sans-kr.json';

export function verifyKoreanFonts(root) {
  if (process.env.FONTS_REBASELINE === '1') return;
  const sidecarPath = path.join(root, SIDECAR);
  if (!existsSync(sidecarPath)) {
    throw new Error(`[fonts] ${SIDECAR} is missing. It is generated: run \`bun run build:fonts\`.`);
  }
  const sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8'));

  for (const [file, expected] of Object.entries(sidecar.files)) {
    const target = path.join(root, 'public/fonts', file);
    if (!existsSync(target))
      throw new Error(`[fonts] public/fonts/${file} is missing; run \`bun run build:fonts\`.`);
    const actual = createHash('sha256').update(readFileSync(target)).digest('hex');
    if (actual !== expected) {
      throw new Error(
        `[fonts] public/fonts/${file} does not match its sidecar; run \`bun run build:fonts\`.`,
      );
    }
  }

  const covered = new Set();
  for (const [a, b] of sidecar.codepoints) for (let cp = a; cp <= b; cp++) covered.add(cp);

  const missing = new Map();
  const dir = path.join(root, 'src/i18n');
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts') || name === 'index.ts' || name === 'en.ts') continue;
    for (const ch of readFileSync(path.join(dir, name), 'utf8')) {
      const cp = ch.codePointAt(0);
      // Latin-1 (© and the like) comes from the Plex Sans latin subset, whose unicode-range
      // covers U+0000 to U+00FF; only characters beyond it need the Korean font.
      if (cp > 0xff && !covered.has(cp)) missing.set(ch, name);
    }
  }
  if (missing.size > 0) {
    const list = [...missing].map(([ch, name]) => `${ch} (${name})`).join(' ');
    throw new Error(
      `[fonts] the Korean subset has no glyph for ${list}. Run \`bun run build:fonts\`.`,
    );
  }
}
