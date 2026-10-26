// The Worker runs before the static assets on the prefixes wrangler.jsonc lists in
// `run_worker_first`, and a page the build writes under one of them is the Worker's to pass
// through or to shadow. The Worker's data once lived under /api/, where the build writes the
// API reference, and every English reference page answered a JSON 404 on typeshade.dev. So
// each prefix is held to dist/: a prefix the Worker owns has no page under it, and a prefix
// whose pages the Worker passes through (the example pages, worker/index.ts) or redirects (the
// gallery's templates, which gallery.typeshade.dev serves) is named here.
//
// Usage: node scripts/check-worker-routes.mjs [dist-dir]
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dist = process.argv[2] ?? 'dist';
const PASS_THROUGH = new Set([
  '/guide/examples/*',
  '/ko/guide/examples/*',
  '/gallery*',
  '/ko/gallery*',
]);

const config = readFileSync('wrangler.jsonc', 'utf8');
const list = /"run_worker_first":\s*\[([^\]]*)\]/.exec(config)?.[1] ?? '';
const prefixes = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
if (prefixes.length === 0) {
  console.error('FAIL: no run_worker_first list in wrangler.jsonc');
  process.exit(1);
}

const problems = prefixes
  .filter((p) => !PASS_THROUGH.has(p))
  .filter((p) => existsSync(path.join(dist, p.replace(/\*$/, ''))))
  .map((p) => `${p}: dist/ has pages under it, which the Worker would answer instead`);

if (problems.length) {
  console.error(problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check-worker-routes: ${prefixes.length} prefixes, none shadows a built page`);
