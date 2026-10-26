// The API reference's data, before it reaches a page (bun run check:api). Loads every entry
// from src/lib/api.ts and fails, naming the entry, when an export carries no documentation, a
// slug collides, a category is missing, or a text still names the former host. It also holds
// the floors the tables read out of the compiler must clear, so a rename upstream that empties
// one of them fails here with a count instead of quietly deleting a section from every page. A
// {@link} target the barrel does not export is a warning: the compiler links to its own
// internals too.
//
// Usage: bun scripts/check-api.ts [--json <file>]
import { writeFileSync } from 'node:fs';
import {
  API_CATEGORIES,
  SENTENCE,
  apiEntries,
  assignSlugs,
  hostMentions,
  unresolvedLinkCount,
} from '../src/lib/api.ts';
import type { ApiEntry } from '../src/lib/api-types.ts';
import { slugify } from '../src/lib/slug.ts';

// How much of the compiler's own tables must still reach a page. The numbers sit under what
// the pinned commit produces (89 Targets tables, 70 of them builtins, 15 emit paths), so
// ordinary drift passes and a table that stopped being found fails.
const TARGETS_FLOOR = 60;
const BUILTIN_TARGETS_FLOOR = 50;
const EMIT_TARGETS_FLOOR = 10;

// The budget for a summary that joins sentences. One sentence stands whole however long it
// is: the page opens with it, and a lead cut mid-clause reads as a rendering fault.
const SUMMARY_MAX = 160;

const entries = apiEntries();
const problems: string[] = [];
const fail = (entry: ApiEntry, what: string): void => {
  problems.push(`${entry.name} (${entry.source.file}:${entry.source.line}): ${what}`);
};

const bySlug = new Map<string, ApiEntry>();
const byCategory = new Map<string, number>();
const byKind = new Map<string, number>();
const known = new Set(API_CATEGORIES.map((c) => c.slug));

for (const entry of entries) {
  const seen = bySlug.get(entry.slug);
  if (seen) fail(entry, `slug ${entry.slug} is already ${seen.name}'s`);
  bySlug.set(entry.slug, entry);
  if (!entry.summary.trim() && !entry.description.trim())
    fail(entry, 'no documentation in the source');
  if (!entry.summary.trim()) fail(entry, 'no summary');
  else if (entry.summary.endsWith('\u2026')) fail(entry, 'summary is cut short');
  else if (entry.summary.length > SUMMARY_MAX && entry.summary.split(SENTENCE).length > 1)
    fail(
      entry,
      `summary is ${entry.summary.length} characters over ${SUMMARY_MAX} and more than one sentence`,
    );
  if (!known.has(entry.category.slug))
    fail(
      entry,
      `category ${entry.category.slug || '(none)'} is not one of the reference's categories`,
    );
  if (entry.signatures.length === 0 && !entry.declaration.trim())
    fail(entry, 'nothing to show in Syntax');
  if (entry.preview) fail(entry, 'is marked a template preview');
  byCategory.set(entry.category.name, (byCategory.get(entry.category.name) ?? 0) + 1);
  byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
}

// A slug two exports share is decided by the names, so the same pair keeps the same pages at
// the next pin. Every member of a colliding group but the first carries its kind.
const expected = assignSlugs(entries.map((e) => ({ name: e.name, kind: e.kind })));
for (const entry of entries) {
  const want = expected.get(entry.name);
  if (want && want !== entry.slug)
    fail(entry, `slug ${entry.slug} is not the ${want} its name and kind ask for`);
}
const colliding = new Map<string, ApiEntry[]>();
for (const entry of entries) {
  const list = colliding.get(slugify(entry.name)) ?? [];
  list.push(entry);
  colliding.set(slugify(entry.name), list);
}
const pairs = [...colliding.values()].filter((list) => list.length > 1);
for (const list of pairs) {
  const bare = list.filter((e) => e.slug === slugify(e.name));
  if (bare.length !== 1)
    problems.push(
      `${list.map((e) => e.name).join(', ')}: ${bare.length} of them hold the bare slug`,
    );
}

// The tables read out of the compiler, by how many pages still carry a Targets section.
const withTargets = entries.filter((e) => e.targets.length > 0);
const builtinTargets = withTargets.filter((e) => e.category.slug === 'builtins');
const emitTargets = withTargets.filter((e) => e.category.slug !== 'builtins');
if (withTargets.length < TARGETS_FLOOR)
  problems.push(
    `only ${withTargets.length} entries carry a Targets table, under ${TARGETS_FLOOR}: check the tables src/lib/api.ts reads`,
  );
if (builtinTargets.length < BUILTIN_TARGETS_FLOOR)
  problems.push(
    `only ${builtinTargets.length} builtins resolve an intrinsic id, under ${BUILTIN_TARGETS_FLOOR}: check how the compiler spells its intrinsic calls`,
  );
if (emitTargets.length < EMIT_TARGETS_FLOOR)
  problems.push(
    `only ${emitTargets.length} emit paths carry a Targets table, under ${EMIT_TARGETS_FLOOR}: check the emit function names in targetsOf`,
  );

for (const name of hostMentions(entries)) problems.push(`${name}: names the former host`);
for (const category of API_CATEGORIES) {
  if (!byCategory.has(category.name))
    problems.push(`${category.slug}: a category with no exports in it`);
}

const json = process.argv.indexOf('--json');
if (json > 0 && process.argv[json + 1])
  writeFileSync(process.argv[json + 1]!, `${JSON.stringify(entries, null, 2)}\n`);

const unresolved = unresolvedLinkCount();
if (unresolved > 0)
  console.warn(
    `warning: ${unresolved} {@link} targets are not public exports and are left as code`,
  );

const order = (a: [string, number], b: [string, number]): number =>
  b[1] - a[1] || a[0].localeCompare(b[0]);
console.log(`${entries.length} entries in ${byCategory.size} categories`);
console.log(
  `  Targets tables: ${withTargets.length} (${builtinTargets.length} builtins, ${emitTargets.length} emit paths), ${pairs.length} slug pairs`,
);
console.log(
  [...byCategory]
    .sort(order)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n'),
);
console.log(
  [...byKind]
    .sort(order)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n'),
);

if (problems.length > 0) {
  console.error(problems.map((p) => `  ${p}`).join('\n'));
  console.error(`FAIL: ${problems.length} problem(s) in ${entries.length} entries`);
  process.exit(1);
}
console.log('ok');
