// The examples as data, published to Cloudflare so the site shows an example the compiler
// merged today without a site build (docs/cloudflare.md).
//
// The static build pins the compiler and checks every example against the dictionaries, the
// stills and the goldens, and a mismatch stops it: that is what keeps a built page true. It is
// also why an example added upstream reached the site only after a pin bump, four edits here
// and a full build. This script is the other half. It reads the compiler's examples directory
// at whatever commit vendor/shader-dsl is checked out at, fails soft where the build fails hard
// (a missing translation falls back to the registry's English, an example in no group goes in
// `new`), and writes one release: an index and one file per example. The Worker serves the
// release the database names as current, and the pages add what the build did not have.
//
// It runs in three steps, because the examples and the words come from two commits of the
// compiler. The examples are read at the commit being published. The words are the site's
// dictionaries, which import the build-time libraries, and those check themselves against the
// pinned compiler, so they are read with the pin checked out again:
//
//   git -C vendor/shader-dsl checkout <compiler commit>
//   bun scripts/publish-examples.ts read                  # the examples, at the new commit
//   git submodule update vendor/shader-dsl
//   bun scripts/publish-examples.ts words                 # titles and page meta, at the pin
//   bun scripts/publish-examples.ts upload [--force]      # R2, then the release row in D1
//
// Each step writes under .cache/examples/ (gitignored). `upload` reaches R2 and D1 through the
// Cloudflare API with one credential, CLOUDFLARE_API_TOKEN; the account is wrangler.jsonc's
// `account_id`, or CLOUDFLARE_ACCOUNT_ID where that is set.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  BUCKET,
  DATABASE,
  releaseKey,
  type DataLocale,
  type ExampleEntry,
  type ExampleRecord,
  type ReleaseIndex,
} from '../src/lib/example-data.ts';

const root = path.resolve(import.meta.dir, '..');
const cacheDir = path.join(root, '.cache/examples');
const readFile = path.join(cacheDir, 'read.json');
const outDir = path.join(cacheDir, 'release');
const vendor = path.join(root, 'vendor/shader-dsl');
const examplesDir = path.join(vendor, 'examples');
const goldensDir = path.join(examplesDir, '__emit-goldens__');
const LOCALES: readonly DataLocale[] = ['en', 'ko'];

/** What `read` takes from the compiler: each example in its own English, before the words. */
interface Read {
  readonly compiler: ReleaseIndex['compiler'];
  readonly repo: string;
  readonly examples: readonly (Omit<
    ExampleRecord,
    'title' | 'blurb' | 'page' | 'still' | 'group'
  > & {
    readonly title: string;
    readonly blurb: string;
    readonly category: string;
  })[];
}

const git = (cwd: string, args: string): string =>
  execSync(`git ${args}`, { cwd, encoding: 'utf8' }).trim();

// The same rewrite src/lib/example-pages.ts makes: the compiler's files cite its issue
// tracker as "<project> #1840", and no page names that former host.
const FORMER_HOST = /\bX-?GIS (#\d+)/g;
const clean = (text: string): string =>
  text.replace(/\r\n/g, '\n').trimEnd().replace(FORMER_HOST, '$1');

const STAGE_LINE = /^[\t ]*(?:@vertex|@fragment|@compute)\b/;
const EXPORT_LINE = /^[\t ]*export\b/;
function entryLineOf(source: string): number {
  const lines = source.split('\n');
  const stage = lines.findIndex((line) => STAGE_LINE.test(line));
  if (stage >= 0) return stage;
  return Math.max(
    0,
    lines.findIndex((line) => EXPORT_LINE.test(line)),
  );
}

function golden(name: string): string | undefined {
  const file = path.join(goldensDir, name);
  return existsSync(file) ? clean(readFileSync(file, 'utf8')) : undefined;
}

function emittedFor(id: string, renderable: boolean): ExampleRecord['emitted'] {
  const wgsl = golden(`${id}.wgsl`);
  const vertex = renderable ? golden(`${id}.vertex.glsl`) : undefined;
  const fragment = renderable ? golden(`${id}.fragment.glsl`) : undefined;
  return {
    ...(wgsl ? { wgsl } : {}),
    ...(vertex && fragment ? { glsl: { vertex, fragment } } : {}),
  };
}

const EXAMPLE_BLOCK = /\/\*\s*@example\s*([\s\S]*?)\*\//;
const SHADE_EXT = '.shade.ts';

/** Step one, at the compiler commit being published: every `.shade.ts` example. The `fn()`
 *  registry is not published: the site shows none of it, and its old pages redirect. */
async function read(): Promise<void> {
  const commit = git(vendor, 'rev-parse HEAD');
  const repo = git(root, 'config -f .gitmodules submodule.vendor/shader-dsl.url').replace(
    /\.git$/,
    '',
  );
  const out: Read['examples'][number][] = [];

  // The `.shade.ts` corpus: every file in the directory, each registered by its own block. A
  // block that does not parse leaves the file with its id for a title, where the build stops.
  for (const name of readdirSync(examplesDir)
    .filter((n) => n.endsWith(SHADE_EXT))
    .sort()) {
    const id = name.slice(0, -SHADE_EXT.length);
    const text = readFileSync(path.join(examplesDir, name), 'utf8');
    let spec: Record<string, unknown> = {};
    try {
      spec = JSON.parse(EXAMPLE_BLOCK.exec(text)?.[1] ?? '{}') as Record<string, unknown>;
    } catch {
      console.warn(`read: ${name}'s @example block is not JSON; publishing it under its id`);
    }
    const renderable = spec.renderable === true;
    const source = clean(text);
    out.push({
      id,
      corpus: 'shade',
      category: 'source',
      file: name,
      title: typeof spec.title === 'string' ? spec.title : id,
      blurb: typeof spec.blurb === 'string' ? spec.blurb : '',
      renderable,
      ...(typeof spec.twinOf === 'string' ? { twinOf: spec.twinOf } : {}),
      sourceHref: `${repo}/blob/${commit}/examples/${name}`,
      source,
      entryLine: entryLineOf(source),
      emitted: emittedFor(id, renderable),
    });
  }

  const result: Read = {
    compiler: { commit, date: git(vendor, 'log -1 --format=%cI') },
    repo,
    examples: out,
  };
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(readFile, JSON.stringify(result));
  console.log(`read: ${out.length} examples at ${commit.slice(0, 12)} -> ${readFile}`);
}

/** Step two, at the site's pin: each example's words, group and page meta, from the
 *  dictionaries the build uses. An example they do not know yet keeps the registry's English
 *  and goes in the group `new`, which is the gap this data covers until the next build. */
async function words(): Promise<void> {
  if (!existsSync(readFile)) throw new Error(`[publish] run 'read' first: no ${readFile}`);
  const input = JSON.parse(readFileSync(readFile, 'utf8')) as Read;
  const { copyFor } = await import('../src/i18n/index.ts');
  const { SHADE_GROUPS } = await import('../src/lib/shade-examples.ts');
  const { shortBlurb } = await import('../src/lib/blurb.ts');
  const { exampleMeta } = await import('../src/lib/example-meta.ts');
  const { twinBlurbs } = await import('../src/lib/examples.ts');
  const { SHADE_STILL_EXAMPLES } = await import('./artifacts.mjs');
  const stills = new Set<string>(SHADE_STILL_EXAMPLES);
  // A source twin's English line is the one its original's registry entry writes, the way
  // the dictionaries give it (src/lib/examples.ts).
  const twinLines = twinBlurbs();
  const groupOf = new Map<string, string>(
    SHADE_GROUPS.flatMap((g) => g.ids.map((id): [string, string] => [id, g.key])),
  );
  const shadeOrder = SHADE_GROUPS.flatMap((g) => [...g.ids] as string[]);

  const records: ExampleRecord[] = input.examples.map(
    ({ category: _category, title, blurb, ...e }) => {
      const english = { title, blurb: twinLines[e.id] ?? shortBlurb(blurb) };
      const inLocale = (locale: DataLocale) => {
        const x = copyFor(locale).examples;
        const t = (x.shade.titles as Record<string, string>)[e.id] ?? english.title;
        const b = (x.shade.descriptions as Record<string, string>)[e.id] ?? english.blurb;
        return { title: t, blurb: b, page: exampleMeta(locale, t, b) };
      };
      const w = Object.fromEntries(LOCALES.map((l) => [l, inLocale(l)])) as Record<
        DataLocale,
        ReturnType<typeof inLocale>
      >;
      return {
        ...e,
        group: groupOf.get(e.id) ?? 'new',
        title: { en: w.en.title, ko: w.ko.title },
        blurb: { en: w.en.blurb, ko: w.ko.blurb },
        page: { en: w.en.page, ko: w.ko.page },
        still: stills.has(e.id),
      };
    },
  );
  const rank = (r: ExampleRecord): number => (r.group === 'new' ? 1e6 : shadeOrder.indexOf(r.id));
  records.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));

  const siteCommit = git(root, 'rev-parse HEAD');
  const release = `${input.compiler.commit.slice(0, 12)}-${siteCommit.slice(0, 7)}`;
  const index: ReleaseIndex = {
    release,
    compiler: input.compiler,
    site: { commit: siteCommit },
    createdAt: new Date().toISOString(),
    examples: records.map(
      ({ source: _s, entryLine: _l, emitted: _e, ...entry }): ExampleEntry => entry,
    ),
  };
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(path.join(outDir, 'examples'), { recursive: true });
  writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index));
  for (const record of records)
    writeFileSync(path.join(outDir, 'examples', `${record.id}.json`), JSON.stringify(record));
  const fresh = records.filter((r) => r.group === 'new').map((r) => r.id);
  console.log(
    `words: release ${release}, ${records.length} examples` +
      (fresh.length ? `; in no group yet: ${fresh.join(', ')}` : ''),
  );
}

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[publish] ${name} is not set`);
  return value;
}

/** The Cloudflare account: the environment's, else the one wrangler.jsonc deploys to. */
function account(): string {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const config = readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
  const id = /"account_id":\s*"([0-9a-f]+)"/.exec(config)?.[1];
  if (!id)
    throw new Error('[publish] no CLOUDFLARE_ACCOUNT_ID and no account_id in wrangler.jsonc');
  return id;
}

const api = (): string => `https://api.cloudflare.com/client/v4/accounts/${account()}`;
const auth = (): Record<string, string> => ({
  authorization: `Bearer ${need('CLOUDFLARE_API_TOKEN')}`,
});

/** Runs one SQL statement on the D1 database through the Cloudflare API. */
async function d1(sql: string, params: unknown[] = []): Promise<unknown[]> {
  const headers = { ...auth(), 'content-type': 'application/json' };
  const base = `${api()}/d1/database`;
  const list = (await (await fetch(`${base}?name=${DATABASE}`, { headers })).json()) as {
    result?: { name: string; uuid: string }[];
  };
  const db = list.result?.find((d) => d.name === DATABASE);
  if (!db) throw new Error(`[publish] no D1 database named ${DATABASE}`);
  const res = (await (
    await fetch(`${base}/${db.uuid}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql, params }),
    })
  ).json()) as { success: boolean; errors: unknown[]; result?: { results: unknown[] }[] };
  if (!res.success) throw new Error(`[publish] D1: ${JSON.stringify(res.errors)}`);
  return res.result?.[0]?.results ?? [];
}

/** Step three: the release's files into R2, then the row that makes it current. The files go
 *  first, so the Worker never reads a release that is half there. */
async function upload(): Promise<void> {
  const index = JSON.parse(readFileSync(path.join(outDir, 'index.json'), 'utf8')) as ReleaseIndex;
  // A release is named by the two commits it was read from, so the one already current has
  // nothing new in it. The schedule runs this often and uploads only when a commit moved.
  const [row] = (await d1(`SELECT value FROM settings WHERE key = 'current_release'`)) as {
    value?: string;
  }[];
  if (row?.value === index.release && !process.argv.includes('--force')) {
    console.log(`upload: ${index.release} is already current; nothing to do`);
    return;
  }
  const files = [
    'index.json',
    ...readdirSync(path.join(outDir, 'examples')).map((f) => `examples/${f}`),
  ];
  // One object per request, through the same API wrangler's `r2 object put` calls.
  const put = async (file: string): Promise<void> => {
    const key = releaseKey(index.release, file).split('/').map(encodeURIComponent).join('/');
    const res = await fetch(`${api()}/r2/buckets/${BUCKET}/objects/${key}`, {
      method: 'PUT',
      headers: { ...auth(), 'content-type': 'application/json' },
      body: readFileSync(path.join(outDir, file)),
    });
    if (!res.ok) throw new Error(`[publish] R2 ${file}: ${res.status} ${await res.text()}`);
  };
  for (let i = 0; i < files.length; i += 16) await Promise.all(files.slice(i, i + 16).map(put));
  await d1(
    `INSERT INTO releases (id, compiler_commit, compiler_date, site_commit, example_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET example_count = excluded.example_count, created_at = excluded.created_at`,
    [
      index.release,
      index.compiler.commit,
      index.compiler.date,
      index.site.commit,
      index.examples.length,
      index.createdAt,
    ],
  );
  await d1(
    `INSERT INTO settings (key, value) VALUES ('current_release', ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [index.release],
  );
  console.log(
    `upload: ${files.length} files to r2://${BUCKET}/releases/${index.release}/, now current`,
  );
}

const step = process.argv[2];
const steps: Record<string, () => Promise<void>> = { read, words, upload };
if (!step || !steps[step]) {
  console.error('usage: bun scripts/publish-examples.ts read|words|upload');
  process.exit(2);
}
await steps[step]!();
