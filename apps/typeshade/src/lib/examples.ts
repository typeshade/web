// Build-time facts, computed from the vendored compiler (vendor/shader-dsl). Every code
// sample and every number on the page comes from here.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { examples as registry } from '../../vendor/shader-dsl/examples/index.ts';
import { shortBlurb } from './blurb.ts';
import { builtinCounts } from './builtin-table.ts';
import { languageCounts } from './language-reference.ts';
import { errorCodeCounts } from './error-codes.ts';
import { ruleCounts } from './design-rules.ts';
import { ruleHistory } from './rule-history.ts';
import { loweringRowCount } from './typescript-lowering.ts';
import { glslCapabilityCount } from './glsl-mapping.ts';
import { wgslBuiltinIdCount } from './target-mapping.ts';
import { shadeCounts, shadeExampleList, shadeModule } from './shade-examples.ts';
import { RETIRED_EXAMPLES } from './retired-examples.mjs';
import { compile, emitModule, emitGlslModule, reflect } from '../../vendor/shader-dsl/src/index.ts';

// Every example a page shows is a `"use typeshade"` file (src/lib/shade-examples.ts). The
// `fn()` registry (examples/index.ts) is read for two things only: the words and the controls
// of the example a source twin ports, which the twin takes over in the original's place, and
// the table of retired pages (src/lib/retired-examples.mjs), which is held against it here.
const examplesDir = path.resolve('vendor/shader-dsl/examples');

/** Text from `from` (inclusive) to the first `to` after it (inclusive), else ''. */
function between(text: string, from: string, to: string): string {
  const a = text.indexOf(from);
  if (a < 0) return '';
  const b = text.indexOf(to, a + from.length);
  return b < 0 ? text.slice(a) : text.slice(a, b + to.length);
}

/** Line count as an editor gutter shows it, including the empty line after a trailing newline. */
const countLines = (text: string): number => text.trimEnd().split('\n').length;

/** One `.shade.ts` example by id, or the build stops. */
function shadeExample(id: string): (typeof shadeExampleList)[number] {
  const e = shadeExampleList.find((x) => x.id === id);
  if (!e) throw new Error(`[examples] no example '${id}' in the .shade.ts corpus`);
  return e;
}

/** The registry example a source twin ports, or the build stops. */
function originalOf(id: string): (typeof registry)[number] {
  const twinOf = shadeExample(id).twinOf;
  const e = twinOf ? registry.find((x) => x.id === twinOf) : undefined;
  if (!e) throw new Error(`[examples] '${id}' is no source twin of a registry example`);
  return e;
}

// The gradient pass, written as TypeScript source: the file the quick start and the examples
// page print, and the one the two backends draw on the verification page.
const HERO_ID = 'gradient-twin';
const heroFile = shadeExample(HERO_ID).file;
const source = readFileSync(path.join(examplesDir, heroFile), 'utf8');
const heroModule = shadeModule(HERO_ID);
const wgsl = emitModule(heroModule);
const glslVertex = emitGlslModule(heroModule, 'vertex');
const glsl = emitGlslModule(heroModule, 'fragment');

const authored = between(source, '@fragment', '\n}');

/** The gradient pass: the authored fragment entry and what it emits for each target. */
export const hero = {
  file: heroFile,
  authored,
  authoredLines: countLines(authored),
  wgsl: between(wgsl, '@fragment', '\n}'),
  glsl: between(glsl, 'void main()', '\n}'),
  emit: {
    wgslLines: countLines(wgsl),
    glslVertexLines: countLines(glslVertex),
    glslFragmentLines: countLines(glsl),
  },
};

/** The name the quick start saves the shader under, and the host file that compiles it. */
const QUICK_START_SHADER = 'gradient.shade.ts';
const QUICK_START_HOST = 'compile.ts';

/** The two files the quick start shows. The shader is gradient-twin.shade.ts with its
 *  registration block and its comments taken out, since those talk about the compiler's own
 *  test corpus; no line of code is touched, and the build compiles both texts and stops if
 *  their WGSL differs. The host file is the one call that compiles it, `compile()` from the
 *  main entry, imported by the package name installed from the Git repository. */
function buildQuickStartFile(): {
  shader: { name: string; code: string; lines: number };
  host: { name: string; code: string; lines: number };
  importPath: string;
} {
  const importPath = JSON.parse(
    readFileSync(path.join(gitmodulesField('path'), 'package.json'), 'utf8'),
  ).name as string;
  const shader = source
    .replace(/\r\n/g, '\n')
    .replace(/\/\*\s*@example[\s\S]*?\*\/\n?/, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const compiled = compile(shader, { fileName: QUICK_START_SHADER });
  const errors = compiled.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0 || compiled.wgsl === undefined)
    throw new Error(
      `[examples] the quick start's ${QUICK_START_SHADER} does not compile: ${errors.map((d) => d.message).join('; ')}`,
    );
  if (compiled.wgsl !== compile(source, { fileName: heroFile }).wgsl)
    throw new Error(
      `[examples] taking the comments out of ${heroFile} changed its WGSL; the quick start would print another program`,
    );
  const host = [
    "import { readFileSync } from 'node:fs'",
    `import { compile } from '${importPath}'`,
    '',
    `const { diagnostics, wgsl } = compile(readFileSync('${QUICK_START_SHADER}', 'utf8'))`,
    'for (const d of diagnostics) console.error(`${d.line}:${d.character} ${d.message}`)',
    'console.log(wgsl)',
  ].join('\n');
  return {
    shader: { name: QUICK_START_SHADER, code: shader, lines: countLines(shader) },
    host: { name: QUICK_START_HOST, code: host, lines: countLines(host) },
    importPath,
  };
}
export const quickStartFile = buildQuickStartFile();

const vendorRoot = path.resolve(process.cwd(), 'vendor/shader-dsl');
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}
const packageFiles = walk(vendorRoot);
const testFiles = packageFiles.filter((f) => f.endsWith('.test.ts'));

/** How many `.shade.ts` examples emit both targets. Every one must emit WGSL, and every one
 *  the registry marks as having a GLSL ES 3.00 form must emit both of its stages; the build
 *  stops on either, the way it stops on a drifted count. An example marked without one may
 *  still emit GLSL (a vertex stage with nothing to draw, a kernel), and is not counted. */
function countShadeBothTargets(): number {
  let n = 0;
  for (const e of shadeExampleList) {
    const module = shadeModule(e.id);
    emitModule(module);
    if (!e.renderable) continue;
    try {
      emitGlslModule(module, 'vertex');
      emitGlslModule(module, 'fragment');
    } catch (error) {
      throw new Error(
        `[examples] '${e.id}' is marked as having a GLSL form and does not emit one: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    n += 1;
  }
  return n;
}

/** The English description of every source twin, keyed by the twin's id: the line the
 *  registry writes for the example it ports. The site shows the twin in the original's place,
 *  and the twin's own line ("x.ts written in the source language") points at a file the site
 *  no longer shows. */
export function twinBlurbs(): Record<string, string> {
  return Object.fromEntries(
    shadeExampleList.filter((e) => e.twinOf).map((e) => [e.id, shortBlurb(originalOf(e.id).blurb)]),
  );
}

// The retired pages' table against the registry and the twins, in both directions: every
// registry example has a line, every line names a registry example, and a line names a twin
// exactly when one is registered, and the right one.
{
  const ids = registry.map((e) => e.id);
  const table = RETIRED_EXAMPLES as Record<string, string | null>;
  const problems = [
    ...ids.filter((id) => !(id in table)).map((id) => `no line for ${id}`),
    ...Object.keys(table)
      .filter((id) => !ids.includes(id))
      .map((id) => `a line for ${id}, which the registry does not have`),
    ...ids
      .filter((id) => id in table)
      .flatMap((id) => {
        const twin = shadeExampleList.find((e) => e.twinOf === id)?.id ?? null;
        return table[id] === twin ? [] : [`${id} goes to ${table[id]}, and its twin is ${twin}`];
      }),
  ];
  if (problems.length > 0)
    throw new Error(
      `[examples] src/lib/retired-examples.mjs is out of date (${problems.join('; ')})`,
    );
}

function pinnedCommit(): string {
  const sha = execSync('git -C vendor/shader-dsl rev-parse --short HEAD', {
    encoding: 'utf8',
  }).trim();
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`[examples] unusable pinned commit '${sha}'`);
  return sha;
}

function pinnedYear(): number {
  const date = execSync('git -C vendor/shader-dsl log -1 --format=%cs HEAD', {
    encoding: 'utf8',
  }).trim();
  const year = Number(date.slice(0, 4));
  if (!Number.isInteger(year) || year < 2020)
    throw new Error(`[examples] unusable commit date '${date}'`);
  return year;
}

/** The pinned commit's own date, ISO 8601 with its offset, for WebPage.dateModified on the
 *  pages generated from it (the guide and the reference). Nothing else on the site reads it. */
function pinnedDate(): string {
  // %cI is ISO 8601, and git spells a commit made at UTC two ways: '+00:00' up to git 2.43,
  // 'Z' from 2.55. The same pinned commit therefore reads differently depending on which git
  // built the site, and dateModified would move with the runner. 'Z' is folded into '+00:00'
  // so the page is the same either way. A commit at any other offset is untouched.
  const date = execSync('git -C vendor/shader-dsl log -1 --format=%cI HEAD', { encoding: 'utf8' })
    .trim()
    .replace(/Z$/, '+00:00');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(date))
    throw new Error(`[examples] unusable commit date '${date}'`);
  return date;
}

const pkg = JSON.parse(readFileSync(path.join(vendorRoot, 'package.json'), 'utf8')) as {
  version: string;
  license: string;
  author: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  optionalDependencies?: Record<string, string>;
};

/** The names the mirror's package.json puts into a consumer's install: `dependencies`,
 *  `optionalDependencies`, and every `peerDependencies` entry not marked optional in
 *  `peerDependenciesMeta`. An optional peer installs nothing and does not count.
 *  devDependencies is the compiler's own CI toolchain and never reaches an install.
 *  At the pinned commit the one name is `typescript`, a required peer since `compile()` on the
 *  main entry and the language service both parse TypeScript source. A name outside
 *  this list stops the build, because the copy counts these and names them. */
const RUNTIME_DEPS = ['typescript'];
function runtimeDeps(): readonly string[] {
  const meta = pkg.peerDependenciesMeta ?? {};
  const requiredPeers = Object.keys(pkg.peerDependencies ?? {}).filter(
    (name) => !meta[name]?.optional,
  );
  const declared = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...requiredPeers,
  ].sort();
  const unexpected = declared.filter((name) => !RUNTIME_DEPS.includes(name));
  if (unexpected.length > 0) {
    throw new Error(
      `[examples] the mirror's package.json now installs ${unexpected.join(', ')} into a consumer; update the copy`,
    );
  }
  return declared;
}

/** The author field with the address removed, so the copyright line and the structured data
 *  carry the name alone. The mirror writes it in npm's `Name <email>` form. */
function authorName(): string {
  const name = pkg.author
    .replace(/\s*<[^>]*>/, '')
    .replace(/\s*\([^)]*\)/, '')
    .trim();
  if (name.length === 0)
    throw new Error(`[examples] the mirror's author field '${pkg.author}' has no name`);
  return name;
}

function gitmodulesField(field: 'url' | 'path'): string {
  const conf = readFileSync(path.resolve(process.cwd(), '.gitmodules'), 'utf8');
  const m = new RegExp(
    `\\[submodule "vendor\\/shader-dsl"\\][^[]*?\\b${field}\\s*=\\s*(\\S+)`,
  ).exec(conf);
  if (!m) throw new Error(`[examples] no ${field} for vendor/shader-dsl in .gitmodules`);
  return m[1]!;
}

const semver = (v: string): [number, number, number] => {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) throw new Error(`[examples] the mirror's version '${v}' is not semver`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
const mirrorVersion = pkg.version;
/** The next minor above the mirror's own version: the release the page says is not out yet. */
const nextVersion = `${semver(mirrorVersion)[0]}.${semver(mirrorVersion)[1] + 1}.0`;

/** The deep-zoom example the examples page draws and describes. */
const DEEP_ZOOM_ID = 'fp64-deep-zoom-twin';

function deepZoomOrigin(): { name: string; sourceType: string; layoutType: string } {
  const field = reflect(shadeModule(DEEP_ZOOM_ID)).uniforms[0]?.fields.find(
    (f) => f.name === 'origin',
  );
  if (!field) throw new Error(`[examples] '${DEEP_ZOOM_ID}' reflects no 'origin' field`);
  if (field.type !== 'f64')
    throw new Error(`[examples] '${DEEP_ZOOM_ID}' declares origin as '${field.type}'`);
  const lanes = field.size / 4;
  if (!Number.isInteger(lanes) || lanes < 1)
    throw new Error(`[examples] origin occupies ${field.size} bytes`);
  return {
    name: field.name,
    sourceType: field.type,
    layoutType: lanes === 1 ? 'f32' : `vec${lanes}<f32>`,
  };
}

/** The GLSL target, read from the `#version` directive the compiler emits. */
function glslTarget(): string {
  const m = /^#version\s+(\d)(\d\d)\s+es\b/.exec(glsl);
  if (!m) throw new Error(`[examples] the emitted GLSL names no '#version <n> es'`);
  return `GLSL ES ${m[1]}.${m[2]}`;
}

/** The buffer layout standards named in reflect()'s own source. */
function layoutStandards(): readonly string[] {
  const src = readFileSync(path.join(vendorRoot, 'src/core/reflect.ts'), 'utf8');
  const found = [...new Set(src.match(/\bstd\d{3}\b/g) ?? [])].sort();
  if (found.length === 0) throw new Error('[examples] reflect.ts names no std<n> layout standard');
  return found;
}

const builtins = builtinCounts();
const languageSurface = languageCounts();
const errorCounts = errorCodeCounts();
const rules = ruleCounts();
const ruleMoves = ruleHistory();

/** The English name of the pinned compiler's license, from its SPDX id. An id the site has no
 *  name for stops the build, so the footer never prints a guess. */
function licenseName(spdx: string): string {
  const names: Record<string, string> = { MIT: 'MIT License', 'Apache-2.0': 'Apache License 2.0' };
  const name = names[spdx];
  if (name === undefined) throw new Error(`[examples] no name for the pinned license '${spdx}'`);
  return name;
}

export const facts = {
  /** The examples a page shows: the `.shade.ts` files, written in TypeScript source and
   *  compiled from the file itself (src/lib/shade-examples.ts). */
  shadeExamples: shadeCounts.total,
  /** How many of those have a GLSL ES 3.00 form. The registry states it per file; a compute
   *  entry and a WGSL-only texture have none. Each one is emitted for both targets here, so a
   *  file that claims a GLSL form and lost it stops the build. */
  shadeRenderable: countShadeBothTargets(),
  /** The examples that use emulated double precision, by the compiler's `fp64` prefix. */
  fp64Examples: shadeExampleList.filter((e) => e.id.startsWith('fp64')).length,
  testFiles: testFiles.length,
  pinnedCommit: pinnedCommit(),
  license: pkg.license,
  /** The license's name and URL, read from the pinned `package.json` so a pin that relicenses
   *  the compiler moves the footer, the link and the structured data together. */
  licenseName: licenseName(pkg.license),
  licenseUrl: `https://opensource.org/licenses/${pkg.license}`,
  author: authorName(),
  /** The year of the pinned commit, for the copyright line. */
  year: pinnedYear(),
  /** The pinned commit's own date, for WebPage.dateModified on the guide and the reference. */
  pinnedDate: pinnedDate(),
  glslTarget: glslTarget(),
  /** The builtin registry, counted at the pin (src/lib/builtin-table.ts): every id the
   *  compiler can spell, the ones spelled the same way on both targets, the ones GLSL ES 3.00
   *  has no form for, and the ones the `Math.*` surface has a name for. The builtin table
   *  page prints all four and types none of them. */
  builtins: builtins.total,
  portableBuiltins: builtins.portable,
  glslAbsentBuiltins: builtins.noGlsl,
  mathAliasBuiltins: builtins.aliased,
  /** The construct rows on /guide/language/from-typescript/, counted from the generator that
   *  compiles one program per row (src/lib/typescript-lowering.ts). */
  constructRows: loweringRowCount(),
  /** How many `@builtin(...)` ids the WGSL vocabulary holds (src/core/sot.ts
   *  WGSL_BUILTIN_NAMES). The WGSL mapping page states it and types none of it. */
  wgslBuiltinIds: wgslBuiltinIdCount(),
  /** How many capabilities the GLSL ES 3.00 profile has a row for
   *  (src/core/backends/glsl.ts GLSL_CAP_PROFILE). Everything with no row fails the module
   *  closed on that target. The GLSL mapping page states it and types none of it. */
  glslCapabilities: glslCapabilityCount(),
  layoutStandards: layoutStandards(),
  runtimeDeps: runtimeDeps().length,
  /** The names behind that count, so a sentence can say which one it is. */
  runtimeDepNames: runtimeDeps(),
  mirrorUrl: gitmodulesField('url')
    .replace(/\.git$/, '')
    .replace(/\/$/, ''),
  mirrorPath: gitmodulesField('path'),
  mirrorVersion,
  nextVersion,
  /** The two halves the deep-zoom frame is split into, as the example its twin ports names
   *  them. */
  splitLabels: originalOf(DEEP_ZOOM_ID).splitLabels ?? null,
  deepZoomOrigin: deepZoomOrigin(),
  /** Third-party survey figures. They describe the market as a whole. */
  survey: {
    title: 'Khronos 2026 Real-Time Shading Ecosystem Survey',
    figure64: 64,
    figure10: 10,
    n: 400,
    url: 'https://www.khronos.org/blog/shader-ecosystem-survey-results-2026',
  },
  /** The documented language surface at the pin, counted from the six tables the compiler's
   *  language service keeps one sentence per name in (src/lib/language-reference.ts). The
   *  language reference at /reference/ is generated from them, and every count on those
   *  pages is read from here. */
  languageEntries: languageSurface.total,
  languageTypes: languageSurface.type,
  languageAttributes: languageSurface.attribute,
  languageBuiltinValues: languageSurface.builtin,
  languageFunctions: languageSurface.function,
  languageConstants: languageSurface.constant,
  languageMathMembers: languageSurface.math,
  /** The diagnostic codes at the pin, counted from the compiler's two registries
   *  (src/lib/error-codes.ts): the front end's TS_CODES, the core's CODES catalogue, and the
   *  front-end numbers its header calls retired. /reference/errors/ has a page for each. */
  errorCodesTs: errorCounts.ts,
  errorCodesSd: errorCounts.sd,
  errorCodesRetired: errorCounts.retired,
  /** The design rules at the pin, counted from the compiler's traceability tree
   *  (src/lib/design-rules.ts): every rule, the rules held each of the four ways reqs/README.md
   *  names (a test, the implementation alone, listed as not yet enforced, review), and the
   *  sections of the surface document that explain one. /reference/rules/ has a page for each
   *  rule. */
  rules: rules.total,
  rulesTest: rules.test,
  rulesCode: rules.code,
  rulesPending: rules.pending,
  rulesReview: rules.review,
  rulesSurfaceSections: rules.surfaceSections,
  /** The rules added, removed and changed (Doorstop's fingerprint moved) since the pin before
   *  this one, from this repository's history of the pin and the compiler's reqs/rules at each
   *  (src/lib/rule-history.ts). All three are 0 when the previous pin has no reqs/. */
  rulesAdded: ruleMoves.added.length,
  rulesRemoved: ruleMoves.removed.length,
  rulesChanged: ruleMoves.changed.length,
};

// The copy was written against these values, at the commit this names. Every count is
// compared at whatever commit is pinned now, so the pin that changes one stops the build and
// asks for a copy decision. Comparing them only at the commit the copy was written at left
// the check inert from the next pin on, which is when it has something to catch.
const pinned = {
  commit: '91c2fe31',
  shadeExamples: 98,
  shadeRenderable: 73,
  fp64Examples: 12,
  testFiles: 420,
  builtins: 169,
  portableBuiltins: 44,
  glslAbsentBuiltins: 43,
  mathAliasBuiltins: 27,
  constructRows: 73,
  wgslBuiltinIds: 16,
  glslCapabilities: 4,
  languageEntries: 317,
  languageTypes: 65,
  languageAttributes: 12,
  languageBuiltinValues: 16,
  languageFunctions: 175,
  languageConstants: 8,
  languageMathMembers: 41,
  errorCodesTs: 51,
  errorCodesSd: 36,
  errorCodesRetired: 2,
  rules: 124,
  rulesTest: 117,
  rulesCode: 2,
  rulesPending: 0,
  rulesReview: 5,
  rulesSurfaceSections: 48,
  rulesAdded: 0,
  rulesRemoved: 0,
  rulesChanged: 3,
};
const drift: string[] = [];
if (facts.shadeExamples !== pinned.shadeExamples)
  drift.push(`shadeExamples ${facts.shadeExamples} != ${pinned.shadeExamples}`);
if (facts.shadeRenderable !== pinned.shadeRenderable)
  drift.push(`shadeRenderable ${facts.shadeRenderable} != ${pinned.shadeRenderable}`);
if (facts.fp64Examples !== pinned.fp64Examples)
  drift.push(`fp64Examples ${facts.fp64Examples} != ${pinned.fp64Examples}`);
if (facts.testFiles < pinned.testFiles)
  drift.push(`testFiles ${facts.testFiles} < ${pinned.testFiles}`);
if (facts.builtins !== pinned.builtins)
  drift.push(`builtins ${facts.builtins} != ${pinned.builtins}`);
if (facts.portableBuiltins !== pinned.portableBuiltins)
  drift.push(`portableBuiltins ${facts.portableBuiltins} != ${pinned.portableBuiltins}`);
if (facts.glslAbsentBuiltins !== pinned.glslAbsentBuiltins)
  drift.push(`glslAbsentBuiltins ${facts.glslAbsentBuiltins} != ${pinned.glslAbsentBuiltins}`);
if (facts.mathAliasBuiltins !== pinned.mathAliasBuiltins)
  drift.push(`mathAliasBuiltins ${facts.mathAliasBuiltins} != ${pinned.mathAliasBuiltins}`);
if (facts.constructRows !== pinned.constructRows)
  drift.push(`constructRows ${facts.constructRows} != ${pinned.constructRows}`);
if (facts.wgslBuiltinIds !== pinned.wgslBuiltinIds)
  drift.push(`wgslBuiltinIds ${facts.wgslBuiltinIds} != ${pinned.wgslBuiltinIds}`);
if (facts.glslCapabilities !== pinned.glslCapabilities)
  drift.push(`glslCapabilities ${facts.glslCapabilities} != ${pinned.glslCapabilities}`);
if (facts.languageEntries !== pinned.languageEntries)
  drift.push(`languageEntries ${facts.languageEntries} != ${pinned.languageEntries}`);
if (facts.languageTypes !== pinned.languageTypes)
  drift.push(`languageTypes ${facts.languageTypes} != ${pinned.languageTypes}`);
if (facts.languageAttributes !== pinned.languageAttributes)
  drift.push(`languageAttributes ${facts.languageAttributes} != ${pinned.languageAttributes}`);
if (facts.languageBuiltinValues !== pinned.languageBuiltinValues)
  drift.push(
    `languageBuiltinValues ${facts.languageBuiltinValues} != ${pinned.languageBuiltinValues}`,
  );
if (facts.languageFunctions !== pinned.languageFunctions)
  drift.push(`languageFunctions ${facts.languageFunctions} != ${pinned.languageFunctions}`);
if (facts.languageConstants !== pinned.languageConstants)
  drift.push(`languageConstants ${facts.languageConstants} != ${pinned.languageConstants}`);
if (facts.languageMathMembers !== pinned.languageMathMembers)
  drift.push(`languageMathMembers ${facts.languageMathMembers} != ${pinned.languageMathMembers}`);
if (facts.errorCodesTs !== pinned.errorCodesTs)
  drift.push(`errorCodesTs ${facts.errorCodesTs} != ${pinned.errorCodesTs}`);
if (facts.errorCodesSd !== pinned.errorCodesSd)
  drift.push(`errorCodesSd ${facts.errorCodesSd} != ${pinned.errorCodesSd}`);
if (facts.errorCodesRetired !== pinned.errorCodesRetired)
  drift.push(`errorCodesRetired ${facts.errorCodesRetired} != ${pinned.errorCodesRetired}`);
for (const key of [
  'rules',
  'rulesTest',
  'rulesCode',
  'rulesPending',
  'rulesReview',
  'rulesSurfaceSections',
  'rulesAdded',
  'rulesRemoved',
  'rulesChanged',
] as const) {
  if (facts[key] !== pinned[key]) drift.push(`${key} ${facts[key]} != ${pinned[key]}`);
}
if (drift.length > 0) {
  throw new Error(
    `[examples] the pinned mirror (${facts.pinnedCommit}) no longer matches the copy written at ${pinned.commit}: ${drift.join('; ')}`,
  );
}
// The page says the next version is not published. When the compiler reaches it, that copy
// has to change, so the build stops here instead of printing a stale sentence.
const reached = ((a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return true;
})(semver(mirrorVersion), semver(nextVersion));
if (reached) {
  throw new Error(
    `[examples] the compiler is at ${mirrorVersion}; the page still says ${nextVersion} is unreleased`,
  );
}
