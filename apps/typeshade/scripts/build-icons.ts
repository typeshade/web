// Re-baselines the canonical favicon SVG after changing the mark.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeHashed } from './artifacts.mjs';
import { MARK } from '../src/lib/mark.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = 'favicon.svg';
const source = readFileSync(path.join(root, 'public', file));
const text = source.toString('utf8');
const viewBox = /viewBox="([^"]+)"/.exec(text)?.[1];

if (viewBox !== MARK.viewBox) {
  throw new Error(`[icons] favicon.svg viewBox ${viewBox} != MARK.viewBox ${MARK.viewBox}`);
}

const digest = writeHashed(root, file, source);
console.log(`public/${file}  ${source.length} B  sha256 ${digest.slice(0, 16)}`);
