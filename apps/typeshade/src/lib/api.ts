// The data behind the API reference: one ApiEntry (src/lib/api-types.ts) per public export of
// the compiler, read at build time from the vendored checkout at the pinned commit with the
// TypeScript compiler API. Nothing here is written by hand. A signature is the declaration's
// own source text, a description is its JSDoc, and the Targets table is read from the
// compiler's own tables (the intrinsic registry, the oracle's builtin and stub sets, the fp64
// pass's whitelist), so a change upstream arrives at the next pin instead of being retyped.
//
// The text passes through one rewrite on the way in, the same one the guide gets: the
// pre-release package scope becomes the release name, issue numbers go, {@link X} becomes a
// link to X's page, and a word the source writes in capitals for emphasis is lower-cased.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type {
  ApiCategory,
  ApiEntry,
  ApiException,
  ApiExample,
  ApiKind,
  ApiLink,
  ApiMember,
  ApiParameter,
  ApiReturn,
  ApiSignature,
  ApiTargetSupport,
} from './api-types.ts';
import { plain } from './authoring.ts';
import { guideSections } from './guide.ts';
import { slugify } from './slug.ts';

const ROOT = 'vendor/shader-dsl';
const BARREL = 'src/index.ts';
const FROM = '@xgis/shader-dsl';
/** The name the package ships under, which every reference page shows its import line with. */
export const PACKAGE_NAME = 'typeshade';
const TO = PACKAGE_NAME;
/** The package's entry points the reference reads, each with the specifier a host imports it
 *  by. The barrel comes first, so an export another entry point shares with it is one page,
 *  whose import line is the barrel's and which names the other specifiers too. The program
 *  runtime is its own entry point (compiler change 0025): an application that loads compiled
 *  programs imports it and none of the compiler. The optional load-time emitter is a separate
 *  entry point, typeshade/emit, which reads portable IR without the TypeScript front end. The
 *  IR builder left the barrel for typeshade/core/ir (Rule 11.19, compiler change 0060), so its
 *  names are read from there and their pages import them from there; a name the barrel still
 *  exports, such as an IR type, keeps the barrel's import line. The fuse scope is
 *  typeshade/fuse (compiler change 0058), and hostFace and its types are public from
 *  typeshade/language-service (compiler change 0062). */
const ENTRY_POINTS: readonly {
  readonly file: string;
  readonly specifier: string;
  /** The names the reference reads from this entry point, when it reads only some. */
  readonly only?: readonly string[];
}[] = [
  { file: BARREL, specifier: PACKAGE_NAME },
  { file: 'src/runtime.ts', specifier: `${PACKAGE_NAME}/runtime` },
  { file: 'src/emit.ts', specifier: `${PACKAGE_NAME}/emit` },
  { file: 'src/core/ir/index.ts', specifier: `${PACKAGE_NAME}/core/ir` },
  { file: 'src/fuse.ts', specifier: `${PACKAGE_NAME}/fuse` },
  // The editor's language service has its own types, some under the barrel's names, so the
  // reference reads only the four names change 0062 made public here.
  {
    file: 'src/language-service/index.ts',
    specifier: `${PACKAGE_NAME}/language-service`,
    only: ['hostFace', 'HostFace', 'HostFaceOptions', 'HostExport'],
  },
];
// The one name from the pre-release scope that stays, because it is what the pinned compiler
// reads at runtime. scripts/check-seo.mjs exempts it too.
const KEPT_ENV = 'XGIS_SHADER_DSL_TRACE';
// A first sentence at least this long already states what the export does, so the summary
// stops there. A shorter one is half a thought, and takes the sentence after it along.
const SUMMARY_MIN = 30;
const SUMMARY_MAX = 160;
// Where one sentence ends and the next begins. "e.g." and its friends end no sentence. A
// sentence may open with a quote or an identifier in a code span as well as with a capital.
export const SENTENCE =
  /(?<!\b(?:e\.g|i\.e|cf|vs|etc|approx|no)\.)(?<=[.!?])\s+(?=[A-Z`([\d'"\u2018\u201c])/;

/** The categories a reference page can sit in, in the order the index and the sidebar use. */
export const API_CATEGORIES: readonly ApiCategory[] = [
  {
    slug: 'authoring',
    name: 'Authoring',
    summary:
      'The builder a shader is written with: modules, functions, variables and control flow.',
  },
  {
    slug: 'builtins',
    name: 'Builtins',
    summary:
      'IR builder functions for math, vector and texture operations. Each returns an IR node. A shader file calls the builtins that the language reference lists.',
  },
  {
    slug: 'values',
    name: 'Values',
    summary:
      'Literals, typed references and the constructors that turn a JavaScript value into a node.',
  },
  {
    slug: 'types',
    name: 'Types',
    summary: 'The type keys and type descriptors the authoring surface is typed by.',
  },
  {
    slug: 'ir',
    name: 'IR',
    summary:
      'The intermediate representation every backend reads: nodes, statements and declarations.',
  },
  {
    slug: 'layout',
    name: 'Layout',
    summary:
      'The declarators that state a struct or a bound resource once, for the host and both targets.',
  },
  {
    slug: 'emit',
    name: 'Emit',
    summary:
      'The WGSL and GLSL ES 3.00 writers, module fragments and the passes that run before them.',
  },
  // The slug carries the -api suffix MDN gives a group page (WebGPU_API): the compiler also
  // exports an interface called Reflection, and its page holds /api/reflection/.
  {
    slug: 'reflection-api',
    name: 'Reflection',
    summary: 'What reflect() recovers from a module: bind groups, byte layouts and entry points.',
  },
  {
    slug: 'cpu-oracle',
    name: 'CPU oracle',
    summary:
      'The CPU backend that runs a module in f64 and gives the reference values to compare against.',
  },
  {
    slug: 'console',
    name: 'Console',
    summary:
      'What a shader says through console.log: the events the CPU delivers, and the decoder for the ones the GPU records.',
  },
  {
    // Not 'runtime', which is the page of typeshade/runtime's runtime() export.
    slug: 'runtime-api',
    name: 'Runtime',
    summary:
      'The program runtime that runs compiled programs on WebGPU, and the array a kernel call keeps on the device.',
  },
  {
    slug: 'diagnostics',
    name: 'Diagnostics',
    summary: 'The coded error class and the validation gate every emit goes through.',
  },
  {
    slug: 'emulated-f64',
    name: 'Emulated f64',
    summary: 'Double precision on targets that have none, carried in pairs of f32 lanes.',
  },
  {
    slug: 'variants',
    name: 'Variants',
    summary: 'Feature axes as one family of modules, compiled and linked point by point.',
  },
  {
    slug: 'backends',
    name: 'Backends',
    summary:
      'The backend contract, the capability model and the registry that spells an intrinsic.',
  },
  {
    slug: 'tooling',
    name: 'Tooling',
    summary: 'Registry generation, semantic comparison, emit identity and size measurement.',
  },
  {
    slug: 'editor',
    name: 'Editor',
    summary:
      'What an editor asks the compiler for: diagnostics, completion and hover, at a source position.',
  },
];
const categoryBySlug = new Map(API_CATEGORIES.map((c) => [c.slug, c]));

// Which category a file's exports belong to. src/core/ir/node.ts is the one file that holds
// several, so it is split by export below instead.
const CATEGORY_BY_FILE: Readonly<Record<string, string>> = {
  'src/compiler/ts/compile.ts': 'authoring',
  'src/compiler/ts/source-file.ts': 'authoring',
  'src/compiler/ts/directive.ts': 'authoring',
  'src/compiler/ts/pack.ts': 'reflection-api',
  'src/core/manifest-types.ts': 'reflection-api',
  'src/core/manifest.ts': 'reflection-api',
  'src/core/ir/span.ts': 'ir',
  'src/core/debug/dispatch.ts': 'cpu-oracle',
  'src/core/console.ts': 'console',
  'src/core/resident.ts': 'runtime-api',
  // typeshade/runtime, the program runtime (compiler change 0025).
  'src/runtime/runtime.ts': 'runtime-api',
  'src/runtime/program.ts': 'runtime-api',
  'src/runtime/resources.ts': 'runtime-api',
  // typeshade/fuse, the fuse scope of a host (compiler change 0058).
  'src/fuse.ts': 'runtime-api',
  'src/core/fuse-plan.ts': 'runtime-api',
  // The device owner of a host's calls (compiler change 0071) and the report of a plan, which
  // typeshade/runtime re-exports without the planner (change 0071, Amendment 2).
  'src/runtime/device.ts': 'runtime-api',
  'src/core/build-info.ts': 'runtime-api',
  'src/core/device-info.ts': 'runtime-api',
  'src/core/fuse-report.ts': 'runtime-api',
  'src/core/host-entry.ts': 'runtime-api',
  'src/runtime/chunk.ts': 'runtime-api',
  'src/core/passes/determinism.ts': 'tooling',
  'src/core/ir/builder.ts': 'authoring',
  'src/core/ir/types.ts': 'types',
  'src/core/ir/nodes.ts': 'ir',
  'src/core/passes/rename-varrefs.ts': 'ir',
  // Forward-mode derivative of a module function, returned as a new module (compiler #194).
  'src/core/passes/grad.ts': 'ir',
  'src/core/passes/grad-check.ts': 'ir',
  'src/core/sot.ts': 'layout',
  'src/core/backends/wgsl.ts': 'emit',
  'src/core/backends/glsl.ts': 'emit',
  'src/core/emit.ts': 'emit',
  'src/emit.ts': 'emit',
  'src/core/fragment.ts': 'emit',
  'src/core/passes/match-lower.ts': 'emit',
  'src/core/passes/opt/optimize.ts': 'emit',
  'src/core/passes/opt/cse.ts': 'emit',
  'src/core/passes/opt/auto-vars.ts': 'emit',
  'src/core/reflect.ts': 'reflection-api',
  'src/core/passes/stage-bindings.ts': 'reflection-api',
  'src/core/oracle.ts': 'cpu-oracle',
  'src/core/cpu-codegen.ts': 'cpu-oracle',
  'src/core/cpu-runtime.ts': 'cpu-oracle',
  'src/core/diagnostics/error.ts': 'diagnostics',
  'src/core/passes/lint/engine.ts': 'diagnostics',
  'src/core/passes/validate.ts': 'diagnostics',
  'src/core/fp64/df64-lib.ts': 'emulated-f64',
  'src/core/fp64/flavor-select.ts': 'emulated-f64',
  'src/core/passes/fp64-lower.ts': 'emulated-f64',
  'src/core/variant-family.ts': 'variants',
  'src/core/variant-link.ts': 'variants',
  'src/core/passes/compose.ts': 'variants',
  'src/core/backend.ts': 'backends',
  'src/core/intrinsics.ts': 'backends',
  'src/core/registry.ts': 'tooling',
  'src/core/measure.ts': 'tooling',
  'src/core/semantic-diff.ts': 'tooling',
  'src/core/emit-identity.ts': 'tooling',
  'src/language-service.ts': 'editor',
  // hostFace, public from typeshade/language-service (compiler change 0062).
  'src/compiler/ts/host-face.ts': 'editor',
};
// The language service is one file today and a directory once it grows; both sit in Editor.
const EDITOR_DIR = 'src/language-service/';
const NODE_FILE = 'src/core/ir/node.ts';
// src/core/ir/node.ts, by export. The literal makers and the constructors that take a type are
// values; the plumbing under them is IR; the call-shaped surface is the builtins.
const NODE_VALUES = new Set([
  'f32',
  'i32',
  'u32',
  'f64',
  'bool',
  'construct',
  'arrayLit',
  'member',
  'constRef',
  'overrideRef',
  'externRef',
  'param',
  'bindingRef',
  'enumU32',
  'EnumU32',
]);
const NODE_IR = new Set([
  'Node',
  'ReadonlyNode',
  'lift',
  'isNodeValue',
  'NODE_BRAND',
  'installStmtSink',
]);
const NODE_AUTHORING = new Set(['callFn', 'matchExpr', 'matchEnum']);

// The three emit paths, by the file that writes them. An emit function gets a Targets row per
// target: the one it writes, and the two it says nothing about.
const EMIT_TARGET_BY_FILE: Readonly<Record<string, 'wgsl' | 'glsl' | 'cpu'>> = {
  'src/core/backends/wgsl.ts': 'wgsl',
  'src/core/backends/glsl.ts': 'glsl',
  'src/core/oracle.ts': 'cpu',
  'src/core/cpu-codegen.ts': 'cpu',
};

// Acronyms and spellings that stay as they are when a capitalised word is lower-cased. An
// identifier the source itself writes in a code span is kept too, found in the text. The
// last row is names the source writes bare: the ANGLE translator, the fn() EDSL, and WebGL's
// RENDERER string.
// prettier-ignore
const ACRONYMS = new Set([ // <!-- ok -->
  'WGSL', 'GLSL', 'IR', 'GPU', 'CPU', 'IO', 'API', 'CSP', 'JS', 'TS', 'ESM', 'TSL', 'DSL', 'ES',
  'GL', 'UI', 'DX', 'SD', 'PI', 'TAU', 'UV', 'LUT', 'LOD', 'RGBA', 'MSAA', 'SSBO', 'UBO', 'LHS',
  'MVP', 'ECEF', 'DSFUN', 'EFT', 'MSL', 'HLSL', 'IEEE', 'CSE', 'LICM', 'ABI', 'RHI', 'FXC',
  'JSON', 'HTML', 'URL', 'CI', 'PR', 'NPM', 'MIT', 'SPIR', 'AST', 'ID', 'UTF', 'ULP', 'LSP',
  'HTTP', 'GPGPU',
  'ANGLE', 'EDSL', 'RENDERER',
]);

const abs = (rel: string): string => path.resolve(process.cwd(), ROOT, rel);

// ── the compiler's own tables, read from the vendored source ───────────────────────────────

/** The object literal keys of the named `const`s in one file, in source order. */
function objectKeys(file: string, names: readonly string[]): Record<string, string[]> {
  const source = ts.createSourceFile(
    file,
    readFileSync(abs(file), 'utf8'),
    ts.ScriptTarget.ES2022,
    true,
  );
  const out: Record<string, string[]> = {};
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      names.includes(node.name.text)
    ) {
      const init = node.initializer;
      if (init && ts.isObjectLiteralExpression(init)) {
        out[node.name.text] = init.properties.flatMap((p) =>
          p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? [p.name.text] : [],
        );
      }
      // A table the compiler writes as a plain list of ids instead of as a keyed record.
      if (init && ts.isArrayLiteralExpression(init)) {
        out[node.name.text] = init.elements.flatMap((el) =>
          ts.isStringLiteral(el) ? [el.text] : [],
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

type Spelling = { wgsl: (a: readonly string[]) => string; glsl: (a: readonly string[]) => string };
interface IntrinsicTables {
  readonly intrinsics: Record<string, Spelling>;
  readonly portable: ReadonlySet<string>;
  readonly preEmit: ReadonlySet<string>;
}

/** The intrinsic registry, evaluated from its own source: it imports nothing, so the spelling
 *  templates can be run here to show what each target emits. */
function intrinsicTables(): IntrinsicTables {
  const file = 'src/core/intrinsics.ts';
  const js = ts.transpileModule(readFileSync(abs(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod: Record<string, unknown> = {};
  new Function('exports', 'require', js)(mod, () => ({}));
  const intrinsics = mod.INTRINSICS as Record<string, Spelling> | undefined;
  const portable = mod.PORTABLE_INTRINSICS as ReadonlySet<string> | undefined;
  const preEmit = mod.PRE_EMIT_INTRINSICS as ReadonlySet<string> | undefined;
  if (!intrinsics || !portable || !preEmit)
    throw new Error(`[api] ${file} no longer exports the intrinsic tables`);
  return { intrinsics, portable, preEmit };
}

interface CompilerTables extends IntrinsicTables {
  /** The intrinsic ids the CPU oracle evaluates, and the GPU-only ones it stubs. */
  readonly oracleBuiltins: ReadonlySet<string>;
  readonly oracleStubs: ReadonlySet<string>;
  /** The builtin ids the fp64 pass rewrites into df64 helpers over f64 operands. */
  readonly fp64: ReadonlySet<string>;
}

function compilerTables(): CompilerTables {
  const oracle = objectKeys('src/core/cpu-runtime.ts', ['BUILTINS', 'GPU_STUBS']);
  // The one list of builtins the fp64 pass has an emulated-double body for. It sits in a leaf
  // module so the front end can name it in a refusal without pulling the pass in, and both
  // halves of the compiler read it from there.
  const fp64 = objectKeys('src/core/fp64/twins.ts', [
    'F64_SCALAR_TWIN_FN',
    'F64_VEC_TWIN_KIND',
    'F64_VEC_REDUCTIONS',
  ]);
  const builtins = oracle.BUILTINS ?? [];
  const stubs = oracle.GPU_STUBS ?? [];
  if (builtins.length === 0 || stubs.length === 0)
    throw new Error('[api] the CPU oracle no longer keeps its builtins in BUILTINS and GPU_STUBS');
  if ((fp64.F64_SCALAR_TWIN_FN ?? []).length === 0)
    throw new Error('[api] the fp64 pass no longer keeps its whitelist in F64_SCALAR_TWIN_FN');
  return {
    ...intrinsicTables(),
    oracleBuiltins: new Set(builtins),
    oracleStubs: new Set(stubs),
    fp64: new Set([
      ...(fp64.F64_SCALAR_TWIN_FN ?? []),
      ...(fp64.F64_VEC_TWIN_KIND ?? []),
      ...(fp64.F64_VEC_REDUCTIONS ?? []),
    ]),
  };
}

// ── JSDoc ─────────────────────────────────────────────────────────────────────────────────

interface DocTag {
  readonly name: string;
  readonly text: string;
}
interface ParsedDoc {
  readonly body: string;
  readonly tags: readonly DocTag[];
}

/** The `/** … *␟/` block in front of a declaration, stars and indentation removed. */
function rawDoc(decl: ts.Node): string {
  const source = decl.getSourceFile();
  const full = source.getFullText();
  // A `const` carries its comment on the statement, not on the declaration inside it.
  const node = ts.isVariableDeclaration(decl) ? decl.parent.parent : decl;
  const blocks = (ts.getLeadingCommentRanges(full, node.getFullStart()) ?? []).filter(
    (r) => full.slice(r.pos, r.pos + 3) === '/**',
  );
  const last = blocks[blocks.length - 1];
  if (!last) return '';
  const lines = full
    .slice(last.pos, last.end)
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^[ \t]*\*[ \t]?/, ''));
  const indents = lines.filter((l) => l.trim()).map((l) => (/^ */.exec(l) ?? [''])[0].length);
  const cut = indents.length > 0 ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(cut))
    .join('\n')
    .trim();
}

/** A doc block split into its prose and its tags. A line inside a fence is never a tag, so the
 *  WGSL attributes in an example (`@location(0)`, `@group(0)`) stay in the code. */
function parseDoc(text: string): ParsedDoc {
  const body: string[] = [];
  const tags: Array<{ name: string; lines: string[] }> = [];
  let open: { name: string; lines: string[] } | null = null;
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const tag = fenced ? null : /^@([a-zA-Z]+)[ \t]*(.*)$/.exec(line);
    if (tag) {
      open = { name: tag[1] ?? '', lines: [tag[2] ?? ''] };
      tags.push(open);
      continue;
    }
    if (open) open.lines.push(line);
    else body.push(line);
  }
  return {
    body: body.join('\n').trim(),
    tags: tags.map((t) => ({ name: t.name, text: dedent(t.lines.join('\n')).trim() })),
  };
}

/** A tag's continuation lines are indented under it; take that indent off. */
function dedent(text: string): string {
  const lines = text.split('\n');
  const rest = lines.slice(1).filter((l) => l.trim());
  const cut = rest.length > 0 ? Math.min(...rest.map((l) => (/^ */.exec(l) ?? [''])[0].length)) : 0;
  return [lines[0] ?? '', ...lines.slice(1).map((l) => l.slice(cut))].join('\n');
}

// ── the rewrite every piece of text goes through ──────────────────────────────────────────

/** Run `f` over the prose of a markdown text, leaving fenced blocks and code spans alone. */
function outsideCode(text: string, f: (s: string) => string): string {
  return text
    .split(/(```[\s\S]*?```)/g)
    .map((chunk, i) =>
      i % 2 === 1
        ? chunk
        : chunk
            .split(/(`[^`]*`)/g)
            .map((part, j) => (j % 2 === 1 ? part : f(part)))
            .join(''),
    )
    .join('');
}

/** The release name, and no issue numbers: the site has no tracker to send a reader to. */
function rewriteReferences(text: string): string {
  return (
    text
      .split(FROM)
      .join(TO)
      // "(#763 H9 - the name-once form)": the aside stays, the number goes.
      .replace(/\(#\d+[^)]*?[\u2014-]\s*([^)]+)\)/g, '($1)')
      // A paragraph that opens with its issue number ("#923 host specialization") keeps what
      // followed it as its opening: the dash the number was joined with goes, and the first
      // word takes the capital the number was holding.
      .replace(
        /(^|\n[ \t]*\n)[ \t]*#\d+\b[ \t]*[\u2014,;:-]?[ \t]*([a-z]+)(?![A-Za-z])/g,
        (_m, lead: string, word: string) =>
          `${lead}${word.charAt(0).toUpperCase()}${word.slice(1)}`,
      )
      // "(#1703)", "(#763 X2)", "(#1717 Ask 2)", "(#9, #628, #1670)", and "see #1697" in prose.
      .replace(/\s*\(#\d+[^)]{0,20}\)/g, '')
      // "(#1724, see {@link X})": an aside too long to drop keeps its words, without the number.
      .replace(/\(#\d+(?:[\s,]+#\d+)*\s*,?\s*/g, '(')
      .replace(/\s*#\d+\b/g, '')
  );
}

/** What is left of "consumers: #1661 (rgba16float sampling)" once the number goes. Prose only:
 *  a signature's own parentheses are not an aside. */
const tidyProse = (text: string): string =>
  text.replace(/:\s*\(([^():]+)\)/g, ': $1').replace(/[,;]\s*\)/g, ')');

// What follows a document's name: an extension ("AUTHORING.md") or a section ("AUTHORING §7").
const DOCUMENT_NAME = /^(?:\.[a-z]{1,4}\b|\s*§)/;

/** A word the source writes in capitals for emphasis, in lower case. An acronym, an identifier
 *  the source spells in a code span, a file or document name, and anything with a digit or an
 *  underscore stay. */
function lowerEmphasis(text: string, identifiers: ReadonlySet<string>): string {
  return outsideCode(text, (prose) =>
    prose.replace(/(?<![A-Za-z0-9_#$])[A-Z]{2,}(?![A-Za-z0-9_])/g, (word, at: number) => {
      if (ACRONYMS.has(word) || identifiers.has(word)) return word;
      if (DOCUMENT_NAME.test(prose.slice(at + word.length))) return word;
      const lower = word.toLowerCase();
      // A word that opens a sentence keeps its capital.
      const before = prose.slice(0, at).trimEnd();
      return before === '' || /[.!?:]$/.test(before)
        ? lower.charAt(0).toUpperCase() + lower.slice(1)
        : lower;
    }),
  );
}

// Every file of the vendored checkout by name, so a file the compiler does not own can be
// recognised in a comment. The compiler's JSDoc still points at the codebase it grew up in.
let vendorFiles: Set<string> | null = null;
function vendorBasenames(): Set<string> {
  if (vendorFiles) return vendorFiles;
  const out = new Set<string>();
  const walk = (dir: string): void => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.name === 'node_modules' || item.name === '.git') continue;
      if (item.isDirectory()) walk(path.join(dir, item.name));
      else out.add(item.name.toLowerCase());
    }
  };
  walk(path.resolve(process.cwd(), ROOT));
  vendorFiles = out;
  return out;
}

const FILE_REFERENCE = /(?:[\w.@*-]+\/)+[\w.@*-]+|[\w.@*-]+\.(?:ts|tsx)\b/g;

/** True when a piece of text points at a file or a package the compiler does not own: the
 *  reference pages name no consumer of the library, so such a sentence does not run. */
function namesAConsumer(text: string): boolean {
  if (/x-?gis/i.test(text.split(KEPT_ENV).join(''))) return true;
  // The packages around the compiler in the codebase it grew up in, named in passing.
  if (
    /\b(map|tiler)'s\b/i.test(text) ||
    /\bthe (map|tiler|engine|compiler|rhi|runtime|playground) package\b/i.test(text)
  )
    return true;
  for (const m of text.matchAll(FILE_REFERENCE)) {
    const token = m[0];
    if (token.startsWith('./') || token.startsWith('../') || token.startsWith('http')) continue;
    if (!/\.[a-z]+$/i.test(token)) continue;
    if (vendorBasenames().has((token.split('/').pop() ?? '').toLowerCase())) continue;
    return true;
  }
  return false;
}

// "in `map/src/shaders/dsl/hillshade.ts` and `line.ts`": the clause that points a sentence at
// a file, which the sentence around it reads without.
const WHERE_CLAUSE = /,?\s*\b(?:in|see|per|from|of)\s+`?[\w.@*/-]+`?(?:\s+and\s+`?[\w.@*/-]+`?)*/g;
// A parenthetical, with up to two levels of brackets inside it.
const ASIDE = /\s*\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g;

/** The prose with every aside and sentence that names a consumer taken out. */
function dropConsumerText(markdown: string): string {
  return markdown
    .split(/\n{2,}/)
    .map((paragraph) => {
      if (/^\s*```/.test(paragraph)) return paragraph;
      const trimmed = paragraph
        .replace(WHERE_CLAUSE, (clause) => (namesAConsumer(clause) ? '' : clause))
        .replace(ASIDE, (aside) => (namesAConsumer(aside) ? '' : aside));
      if (!namesAConsumer(trimmed)) return trimmed;
      return trimmed
        .split(SENTENCE)
        .filter((sentence) => !namesAConsumer(sentence))
        .join(' ')
        .trim();
    })
    .filter((paragraph) => paragraph.trim())
    .join('\n\n');
}

/** The line every doc block ends with, naming the barrels the export is reachable from. The
 *  site documents one package, so the line says nothing a reader needs. */
const dropExportedFrom = (markdown: string): string =>
  markdown
    .split(/\n{2,}/)
    .filter((paragraph) => !/^Exported from [`\w@/,\s.]+$/.test(paragraph.trim()))
    .join('\n\n');

/** The compiler's prose the way every reference page prints it: the release name, no issue
 *  numbers, no aside or sentence that names a consumer, and no capitals for emphasis. The
 *  error code pages put the two registries' text through it too (src/lib/error-codes.ts). */
export function referenceProse(text: string): string {
  return lowerEmphasis(
    dropConsumerText(tidyProse(rewriteReferences(text))),
    codeSpanWords(text),
  ).trim();
}

/** Every identifier the text itself writes in a code span, so capitals inside one are kept. A
 *  fenced block is left out: its prose is the example's comments, not identifiers. */
function codeSpanWords(text: string): Set<string> {
  const out = new Set<string>();
  const spans = text.replace(/```[\s\S]*?```/g, ' ');
  for (const m of spans.matchAll(/`([^`\n]+)`/g)) {
    for (const word of (m[1] ?? '').matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) out.add(word[0]);
  }
  for (const m of text.matchAll(/\{@link\s+([^}\s|]+)/g))
    out.add((m[1] ?? '').split(/[.#]/)[0] ?? '');
  // An identifier that only ever appears in an example is still an identifier.
  for (const fence of text.matchAll(/```[\s\S]*?```/g)) {
    for (const word of fence[0].matchAll(/\b[A-Z][A-Za-z0-9]*_[A-Za-z0-9_]+\b/g)) out.add(word[0]);
  }
  return out;
}

interface LinkResult {
  readonly text: string;
  readonly links: readonly ApiLink[];
  readonly unresolved: readonly string[];
}

/** `{@link X}` becomes a link to X's reference page when X is a public export, and plain code
 *  when it is not. Every resolved target is a "See also" entry. */
function linkify(
  text: string,
  slugOf: (name: string) => string | undefined,
  self: string,
): LinkResult {
  const links: ApiLink[] = [];
  const unresolved: string[] = [];
  const out = outsideCode(text, (prose) =>
    prose.replace(
      /\{@link\s+([^}\s|]+)\s*(?:[|]\s*)?([^}]*)\}/g,
      (_all, target: string, label: string) => {
        const shown = label.trim() || target;
        const base = target.split(/[.#]/)[0] ?? target;
        const slug = slugOf(base);
        if (!slug) {
          unresolved.push(target);
          return `\`${shown}\``;
        }
        if (base !== self && !links.some((l) => l.label === base))
          links.push({ label: base, href: `/api/${slug}/` });
        return `[\`${shown}\`](/api/${slug}/)`;
      },
    ),
  );
  return { text: out, links, unresolved };
}

// ── one export ────────────────────────────────────────────────────────────────────────────

/** Whitespace over several lines, as one line: a type or a signature in a table cell. */
const oneLine = (text: string): string =>
  text
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const stripModifiers = (text: string): string =>
  text.replace(/^(?:export\s+|declare\s+|default\s+)+/, '');

const SIGNATURE_WIDTH = 76;
// Argument names for a builtin whose emitted order the source does not show at the call.
const PLACEHOLDERS = ['a', 'b', 'c', 'd', 'e'];

/** A signature too long for one line, broken at its parameters the way the source is written.
 *  The compiler's own function declarations arrive wrapped; a const's type string does not. A
 *  lone parameter is broken out too, so the return type lands on a line a reader can see. */
function wrapSignature(text: string): string {
  // A declaration's own source text arrives wrapped by the compiler's formatter; leave it.
  if (text.includes('\n') || text.length <= SIGNATURE_WIDTH || !text.includes('(')) return text;
  let depth = 0;
  let open = -1;
  let close = -1;
  const commas: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const angle = c === '<' || (c === '>' && text[i - 1] !== '=');
    if (c === '(' || c === '[' || c === '{' || (angle && c === '<')) {
      if (c === '(' && depth === 0 && open < 0) open = i;
      depth += 1;
    } else if (c === ')' || c === ']' || c === '}' || (angle && c === '>')) {
      depth -= 1;
      if (c === ')' && depth === 0 && open >= 0 && close < 0) close = i;
    } else if (c === ',' && depth === 1 && open >= 0 && close < 0) commas.push(i);
  }
  if (open < 0 || close < 0) return text;
  const cuts = [open, ...commas, close];
  const params = cuts.slice(0, -1).map((from, i) => text.slice(from + 1, cuts[i + 1]).trim());
  return `${text.slice(0, open + 1)}\n${params.map((p) => `  ${p},`).join('\n')}\n${text.slice(close)}`;
}

/** A declaration without the maintainer's comments. Syntax shows the shape of the type, and
 *  the commentary around it in the source is what the Description section is for. */
function withoutComments(text: string): string {
  const lines = text.replace(/\/\*(?!\*)[\s\S]*?\*\//g, '').split('\n');
  const cut = lines.map((line) => {
    let quote = '';
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (quote) {
        if (c === '\\') i += 1;
        else if (c === quote) quote = '';
        continue;
      }
      if (c === "'" || c === '"' || c === '`') quote = c;
      else if (c === '/' && line[i + 1] === '/') return line.slice(0, i).trimEnd();
    }
    return line.trimEnd();
  });
  // A line the comment was all of goes; the blank lines it leaves behind go with it.
  return cut
    .filter((line, i) => line.trim() || (lines[i] ?? '').trim() === '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A function declaration without its body: the signature a reader writes. */
function signatureText(decl: ts.SignatureDeclaration): string {
  const text = decl.getText();
  const body = (decl as ts.FunctionLikeDeclaration).body;
  const cut = body ? text.slice(0, body.getStart() - decl.getStart()) : text;
  return stripModifiers(
    withoutComments(cut)
      .replace(/\s*\{$/, '')
      .trim(),
  );
}

function isCallableConst(decl: ts.Declaration, type: ts.Type): boolean {
  return ts.isVariableDeclaration(decl) && type.getCallSignatures().length > 0;
}

function kindOf(decl: ts.Declaration, callable: boolean): ApiKind {
  if (ts.isInterfaceDeclaration(decl)) return 'interface';
  if (ts.isTypeAliasDeclaration(decl)) return 'type';
  if (ts.isClassDeclaration(decl)) return 'class';
  if (ts.isFunctionDeclaration(decl) || callable) return 'function';
  return 'constant';
}

/** The category a name belongs to: the file it is declared in, and for node.ts the export. */
function categoryOf(name: string, file: string, decl: ts.Declaration): string | undefined {
  if (file.startsWith(EDITOR_DIR)) return 'editor';
  if (file !== NODE_FILE) return CATEGORY_BY_FILE[file];
  if (NODE_IR.has(name)) return 'ir';
  if (NODE_VALUES.has(name)) return 'values';
  if (NODE_AUTHORING.has(name)) return 'authoring';
  if (ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl)) return 'types';
  if (ts.isClassDeclaration(decl)) return 'ir';
  return 'builtins';
}

/** What a builtin emits: the neutral intrinsic id, and the arguments it passes in the order
 *  the backend spells them, which is not always the order the authoring surface takes them in.
 *  An overloaded builtin carries the call in its implementation, its last declaration. */
interface IntrinsicCall {
  readonly id: string;
  /** The argument names at the call, where the source shows them. */
  readonly args?: readonly string[];
}

function intrinsicCallOf(decls: readonly ts.Declaration[]): IntrinsicCall | undefined {
  for (const decl of [...decls].reverse()) {
    const text = decl.getText();
    const call = /(?:^|[^A-Za-z0-9_])call\(\s*'([A-Za-z0-9_]+)'\s*,/.exec(text);
    if (call?.[1]) {
      const args = callArguments(text, call.index + call[0].length);
      // The first argument after the id is the result type, which is not spelled.
      return { id: call[1], args: args.slice(1) };
    }
    const gen = /genType1[^(]*\(\s*'([A-Za-z0-9_]+)'\s*\)/.exec(text);
    if (gen?.[1]) return { id: gen[1] };
  }
  return undefined;
}

/** The arguments of a call, from just after its open bracket, as the names they are written
 *  with. Anything that is not a plain name or a `x.type` reads as a placeholder. */
function callArguments(text: string, from: number): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = from;
  for (let i = from; i < text.length; i += 1) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{' || c === '<') depth += 1;
    else if (c === ')' || c === ']' || c === '}' || c === '>') {
      if (c === ')' && depth === 0) {
        out.push(text.slice(start, i));
        break;
      }
      depth -= 1;
    } else if (c === ',' && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  return out.map((raw) => {
    const name = /^[\s(]*([A-Za-z_][A-Za-z0-9_]*)/.exec(raw);
    return name?.[1] ?? 'x';
  });
}

/** The members of an interface or class, with their own JSDoc. */
function membersOf(decl: ts.Declaration, name: string, doc: (text: string) => string): ApiMember[] {
  if (!ts.isInterfaceDeclaration(decl) && !ts.isClassDeclaration(decl)) return [];
  const out: ApiMember[] = [];
  for (const m of decl.members) {
    const modifiers = ts.canHaveModifiers(m) ? (ts.getModifiers(m) ?? []) : [];
    if (
      modifiers.some(
        (mod) =>
          mod.kind === ts.SyntaxKind.PrivateKeyword || mod.kind === ts.SyntaxKind.ProtectedKeyword,
      )
    )
      continue;
    if (m.name && ts.isPrivateIdentifier(m.name)) continue;
    const readonly = modifiers.some((mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword);
    const optional = 'questionToken' in m && m.questionToken !== undefined;
    // A member's JSDoc is split at its block tags the way an export's is, so a tag line does
    // not read as prose. @deprecated becomes the badge beside the name.
    const parsed = parseDoc(rawDoc(m));
    const description = doc(parsed.body);
    const deprecated = parsed.tags.some((t) => t.name === 'deprecated');
    if (ts.isConstructorDeclaration(m)) {
      out.push({
        name: 'constructor',
        kind: 'constructor',
        type: oneLine(`new ${name}(${m.parameters.map((p) => p.getText()).join(', ')})`),
        optional: false,
        readonly: false,
        deprecated,
        description,
      });
      continue;
    }
    if (!m.name || !(ts.isIdentifier(m.name) || ts.isStringLiteral(m.name))) continue;
    const member = m.name.text;
    if (ts.isMethodSignature(m) || ts.isMethodDeclaration(m)) {
      const params = m.parameters.map((p) => p.getText()).join(', ');
      const ret = m.type ? `: ${m.type.getText()}` : '';
      out.push({
        name: member,
        kind: 'method',
        type: oneLine(
          `${m.typeParameters ? `<${m.typeParameters.map((p) => p.getText()).join(', ')}>` : ''}(${params})${ret}`,
        ),
        optional,
        readonly,
        deprecated,
        description,
      });
      continue;
    }
    if (ts.isPropertySignature(m) || ts.isPropertyDeclaration(m)) {
      out.push({
        name: member,
        kind: 'property',
        type: oneLine(m.type?.getText() ?? 'unknown'),
        optional,
        readonly,
        deprecated,
        description,
      });
      continue;
    }
    if (ts.isGetAccessorDeclaration(m)) {
      out.push({
        name: member,
        kind: 'property',
        type: oneLine(m.type?.getText() ?? 'unknown'),
        optional,
        readonly: true,
        deprecated,
        description,
      });
    }
  }
  return out;
}

/** An interface as a declaration block: the header, then one line per member without its
 *  JSDoc, which the members list carries instead. A class shows its header alone. */
function declarationText(decl: ts.Declaration): string {
  if (ts.isTypeAliasDeclaration(decl)) return stripModifiers(withoutComments(decl.getText()));
  if (ts.isClassDeclaration(decl)) {
    const first = decl.members[0];
    const head = first
      ? decl.getText().slice(0, first.getStart() - decl.getStart())
      : decl.getText();
    return stripModifiers(withoutComments(head.replace(/\{[\s\S]*$/, '')).trim());
  }
  if (ts.isInterfaceDeclaration(decl)) {
    const first = decl.members[0];
    const head = stripModifiers(
      withoutComments(
        (first
          ? decl.getText().slice(0, first.getStart() - decl.getStart())
          : decl.getText()
        ).replace(/\{[\s\S]*$/, ''),
      ).trim(),
    );
    const lines = decl.members.map((m) => `  ${oneLine(withoutComments(m.getText()))}`);
    return `${head} {\n${lines.join('\n')}\n}`;
  }
  return '';
}

interface Extracted {
  readonly entry: ApiEntry;
  readonly unresolved: readonly string[];
  /** The entry's `@see` targets alone, kept apart from `entry.seeAlso` (which also holds
   *  `{@link}` targets) so `symmetrizeSeeTags` knows which links to add a back-link for. */
  readonly seeTagLinks: readonly ApiLink[];
}

let cache: readonly ApiEntry[] | null = null;
let unresolvedLinks: readonly string[] = [];

/** How many `{@link}` targets named something the barrel does not export, from the last run. */
export function unresolvedLinkCount(): number {
  return unresolvedLinks.length;
}

/** Every public export of the compiler as one reference entry, in the barrel's order. */
export function apiEntries(): readonly ApiEntry[] {
  if (cache) return cache;
  const built = build();
  cache = built.entries;
  unresolvedLinks = built.unresolved;
  return cache;
}

interface Built {
  readonly entries: readonly ApiEntry[];
  readonly unresolved: readonly string[];
}

/** Which export keeps the bare slug when two of them differ only in case: the one a reader is
 *  likelier to have searched for. */
const KIND_ORDER: readonly ApiKind[] = ['function', 'constant', 'class', 'interface', 'type'];

/** A slug for every export, decided by the names themselves. Two names that differ only in
 *  case (EmitFragment, emitFragment) want one slug: the kinds settle which of them keeps it,
 *  and the others take their kind as a suffix. The order the checker hands the exports over in
 *  changes nothing here, so an upstream reorder cannot move a page to another permalink. */
export function assignSlugs(
  exports: readonly { readonly name: string; readonly kind: ApiKind }[],
): Map<string, string> {
  const groups = new Map<string, { name: string; kind: ApiKind }[]>();
  for (const { name, kind } of exports) {
    const base = slugify(name);
    const list = groups.get(base) ?? [];
    list.push({ name, kind });
    groups.set(base, list);
  }
  const slugs = new Map<string, string>();
  for (const [base, list] of groups) {
    const sorted = [...list].sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        a.name.localeCompare(b.name, 'en'),
    );
    const taken = new Set<string>();
    sorted.forEach((item, at) => {
      let slug = at === 0 ? base : `${base}-${item.kind}`;
      let n = 2;
      while (taken.has(slug)) slug = `${base}-${item.kind}-${n++}`;
      taken.add(slug);
      slugs.set(item.name, slug);
    });
  }
  return slugs;
}

function build(): Built {
  const configPath = abs('tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram(
    ENTRY_POINTS.map((point) => abs(point.file)),
    { ...parsed.options, noEmit: true },
  );
  const checker = program.getTypeChecker();
  const tables = compilerTables();
  const root = path.resolve(process.cwd(), ROOT);

  // Every name and its slug first, so a {@link} can resolve to a page that is not built yet. An
  // entry point that exports the same declaration as an earlier one adds its specifier to that
  // page; one that gives a name to another declaration would need a second page with that name,
  // and stops the build instead.
  const symbols: {
    readonly name: string;
    readonly symbol: ts.Symbol;
    readonly decls: readonly ts.Declaration[];
    readonly decl: ts.Declaration;
    readonly type: ts.Type;
    readonly kind: ApiKind;
    readonly modules: string[];
  }[] = [];
  for (const point of ENTRY_POINTS) {
    const file = program.getSourceFile(abs(point.file));
    if (!file) throw new Error(`[api] no ${ROOT}/${point.file} at the pinned commit`);
    const moduleSymbol = checker.getSymbolAtLocation(file);
    if (!moduleSymbol) throw new Error(`[api] ${ROOT}/${point.file} is not a module`);
    const exported = checker.getExportsOfModule(moduleSymbol);
    for (const name of point.only ?? []) {
      if (!exported.some((e) => e.name === name))
        throw new Error(`[api] ${point.specifier} no longer exports ${name}`);
    }
    for (const raw of exported) {
      if (point.only && !point.only.includes(raw.name)) continue;
      const symbol = raw.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(raw) : raw;
      const known = symbols.find((s) => s.name === raw.name);
      if (known && known.symbol === symbol) {
        known.modules.push(point.specifier);
        continue;
      }
      if (known)
        throw new Error(
          `[api] ${point.specifier} exports ${raw.name}, which ${known.modules[0]} exports as another declaration`,
        );
      const decls = symbol.declarations ?? [];
      const decl = decls[0];
      if (!decl) throw new Error(`[api] ${raw.name} has no declaration`);
      const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
      symbols.push({
        name: raw.name,
        symbol,
        decls,
        decl,
        type,
        kind: kindOf(decl, isCallableConst(decl, type)),
        modules: [point.specifier],
      });
    }
  }
  const slugs = assignSlugs(symbols);
  const slugOf = (name: string): string | undefined => slugs.get(name);

  const entries: ApiEntry[] = [];
  const unresolved: string[] = [];
  const seeTagLinksByEntry: { readonly entry: ApiEntry; readonly links: readonly ApiLink[] }[] = [];
  for (const symbol of symbols) {
    const extracted = extract({ ...symbol, checker, root, tables, slugOf });
    entries.push(extracted.entry);
    unresolved.push(...extracted.unresolved);
    seeTagLinksByEntry.push({ entry: extracted.entry, links: extracted.seeTagLinks });
  }
  assertCategories(entries);
  symmetrizeSeeTags(entries, seeTagLinksByEntry);
  return { entries, unresolved };
}

/** `@see` is written by hand on one side of a pair, so a page it names does not automatically
 *  name it back. A reader who follows `@see` to the target page should still find a way back
 *  to where they started, so the target's See also gets the missing link added here.
 *  `{@link}` targets are left one-directional: those sit inside a sentence that already reads
 *  in one direction, and forcing a matching sentence onto the other page would misrepresent it. */
function symmetrizeSeeTags(
  entries: readonly ApiEntry[],
  seeTagLinksByEntry: readonly { readonly entry: ApiEntry; readonly links: readonly ApiLink[] }[],
): void {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  for (const { entry: source, links } of seeTagLinksByEntry) {
    for (const link of links) {
      const targetSlug = link.href.replace(/^\/api\//, '').replace(/\/$/, '');
      const target = bySlug.get(targetSlug);
      if (!target || target === source) continue;
      const already = target.seeAlso.some((l) => l.href === `/api/${source.slug}/`);
      if (!already)
        (target.seeAlso as ApiLink[]).push({ label: source.name, href: `/api/${source.slug}/` });
    }
  }
}

interface ExtractInput {
  readonly name: string;
  readonly decls: readonly ts.Declaration[];
  readonly decl: ts.Declaration;
  readonly type: ts.Type;
  readonly kind: ApiKind;
  readonly checker: ts.TypeChecker;
  readonly root: string;
  readonly tables: CompilerTables;
  readonly slugOf: (name: string) => string | undefined;
  /** The specifiers that export it, the first the one its import line shows. */
  readonly modules: readonly string[];
}

function extract(input: ExtractInput): Extracted {
  const { name, decls, decl, type, kind, checker, root, tables, slugOf, modules } = input;
  const callableConst = isCallableConst(decl, type);
  const slug = slugOf(name) ?? slugify(name);
  const file = path.relative(root, decl.getSourceFile().fileName).split(path.sep).join('/');
  const categorySlug = categoryOf(name, file, decl);
  const category = categorySlug ? categoryBySlug.get(categorySlug) : undefined;
  if (!category)
    throw new Error(
      `[api] ${name} (${file}) has no category; add its file to CATEGORY_BY_FILE in src/lib/api.ts`,
    );

  const raw = decls.map((d) => rawDoc(d)).filter(Boolean);
  const parsed = parseDoc(raw[0] ?? '');
  const identifiers = codeSpanWords(raw.join('\n'));
  const unresolved: string[] = [];
  const links: ApiLink[] = [];
  /** Source text to the markdown the page renders. */
  const md = (text: string): string => {
    if (!text.trim()) return '';
    const cleaned = dropExportedFrom(dropConsumerText(tidyProse(rewriteReferences(text))));
    if (!cleaned.trim()) return '';
    const linked = linkify(lowerEmphasis(cleaned, identifiers), slugOf, name);
    unresolved.push(...linked.unresolved);
    for (const l of linked.links) if (!links.some((k) => k.label === l.label)) links.push(l);
    return linked.text.trim();
  };

  const body = md(parsed.body);
  const summary = summarize(body);
  const description = withoutSummary(body, summary);

  // Signatures: a function shows its own source text, one line per overload; a const whose
  // type is callable shows the type the checker resolves for it.
  const overloads = decls.filter(
    (d): d is ts.SignatureDeclaration => ts.isFunctionDeclaration(d) && d.body === undefined,
  );
  const signatureDecls: ts.SignatureDeclaration[] =
    overloads.length > 0
      ? overloads
      : decls.filter((d): d is ts.SignatureDeclaration => ts.isFunctionDeclaration(d));
  const signatures: ApiSignature[] = signatureDecls.map((d) => ({
    text: rewriteReferences(signatureText(d)),
  }));
  if (signatures.length === 0 && callableConst) {
    signatures.push({
      text: wrapSignature(
        rewriteReferences(
          `const ${name}: ${oneLine(checker.typeToString(type, decl, ts.TypeFormatFlags.NoTruncation))}`,
        ),
      ),
    });
  }
  const declaration =
    signatures.length > 0
      ? ''
      : kind === 'constant'
        ? wrapSignature(
            rewriteReferences(
              `const ${name}: ${oneLine(checker.typeToString(type, decl, ts.TypeFormatFlags.NoTruncation))}`,
            ),
          )
        : rewriteReferences(declarationText(decl));

  // Parameters and the return value come from the first signature, described by the tags.
  const signature =
    signatureDecls[0] ??
    (callableConst ? type.getCallSignatures()[0]?.getDeclaration() : undefined);
  const paramTags = new Map<string, string>();
  for (const tag of parsed.tags) {
    if (tag.name !== 'param') continue;
    const m = /^([A-Za-z0-9_$]+)\s*(?:-\s*)?([\s\S]*)$/.exec(tag.text);
    if (m?.[1]) paramTags.set(m[1], (m[2] ?? '').trim());
  }
  // A parameter typed with one of the signature's own type variables shows what the variable is
  // bound to, so Parameters carries the type contract instead of a bare letter.
  const constraints = new Map<string, string>();
  for (const tp of signature?.typeParameters ?? []) {
    if (tp.constraint) constraints.set(tp.name.getText(), oneLine(tp.constraint.getText()));
  }
  const bound = (raw: string): string => {
    const constraint = constraints.get(raw.trim());
    return constraint ? `${raw.trim()} extends ${constraint}` : raw;
  };
  const parameters: ApiParameter[] = (signature?.parameters ?? []).map((p) => {
    const pname = p.name.getText();
    return {
      name: p.dotDotDotToken ? `...${pname}` : pname,
      type: oneLine(rewriteReferences(bound(p.type?.getText() ?? 'unknown'))),
      optional: p.questionToken !== undefined || p.initializer !== undefined,
      description: md(paramTags.get(pname) ?? ''),
    };
  });
  for (const [pname, text] of paramTags) {
    if (!parameters.some((p) => p.name === pname || p.name === `...${pname}`)) {
      parameters.push({ name: pname, type: '', optional: false, description: md(text) });
    }
  }
  const returnTag = parsed.tags.find((t) => t.name === 'returns' || t.name === 'return');
  const returnType = signature
    ? oneLine(
        rewriteReferences(
          signature.type?.getText() ??
            checker.typeToString(
              checker.getSignatureFromDeclaration(signature)?.getReturnType() ?? type,
              decl,
            ),
        ),
      )
    : '';
  const returns: ApiReturn | null = signature
    ? { type: returnType, description: md(returnTag?.text ?? '') }
    : null;

  const seeTagLinks = seeTags(parsed, slugOf);
  const entry: ApiEntry = {
    name,
    slug,
    kind,
    category,
    deprecated: parsed.tags.some((t) => t.name === 'deprecated'),
    summary,
    description,
    signatures,
    declaration,
    parameters,
    returns,
    exceptions: exceptionsOf(parsed, kind === 'function' ? body : '', name, md),
    examples: examplesOf(parsed, md),
    targets: targetsOf({ name, file, decls, kind, parameters, tables }),
    members: membersOf(decl, name, md),
    guideSections: guideLinksFor(name),
    seeAlso: uniqueByHref([...links, ...seeTagLinks]),
    source: { file, line: lineOf(decl) },
    modules,
  };
  return { entry, unresolved, seeTagLinks };
}

function lineOf(decl: ts.Declaration): number {
  const node = ts.isVariableDeclaration(decl) ? decl.parent.parent : decl;
  return node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

/** The first sentences of the description as one plain line, long enough to stand as the
 *  page's opening paragraph and its meta description. */
function summarize(body: string): string {
  // Split the markdown before the code spans go: a sentence that opens with a name in a code
  // span is a sentence, and the backticks are what say so.
  const prose = body
    .replace(/```[\s\S]*?```/g, '\n\n')
    .split(/\n{2,}/)
    .find((b) => b.trim() && !/^[#>|*+-]|^\d+[.)]\s/.test(b.trim()));
  if (!prose?.trim()) return '';
  let out = '';
  for (const sentence of prose.split(SENTENCE)) {
    const next = out ? `${out} ${sentence}` : sentence;
    // One more sentence only while it still fits: a cut sentence reads worse than a short one.
    if (out && plain(next).length > SUMMARY_MAX) break;
    out = next;
    if (plain(out).length >= SUMMARY_MIN) break;
  }
  // A first sentence longer than the budget stands whole: a lead cut mid-clause reads as a fault.
  return plain(out);
}

// A sentence that opens by pointing back at the one before it. Under the Description heading
// it would stand with nothing to point at, so its paragraph is shown whole.
const BACK_REFERENCE = /^(?:that|this|these|those|it|its|they|them|their|such|so|hence|both)\b/i;

/** The description without the sentence the summary was taken from, so the page does not open
 *  with the same words twice. A doc whose first paragraph the summary covered whole is left
 *  with nothing, and the page leaves the Description section out. */
function withoutSummary(body: string, summary: string): string {
  if (!summary) return body;
  const paragraphs = body.split(/\n{2,}/);
  const first = paragraphs[0] ?? '';
  const sentences = first.split(SENTENCE);
  let taken = 0;
  let seen = '';
  for (const sentence of sentences) {
    seen = seen ? `${seen} ${sentence}` : sentence;
    taken += 1;
    if (plain(seen).length >= plain(summary).length) break;
  }
  const leftover = sentences.slice(taken).join(' ').trim();
  if (leftover && BACK_REFERENCE.test(leftover)) return body;
  return [leftover, ...paragraphs.slice(1)].filter(Boolean).join('\n\n').trim();
}

/** `@throws`, plus the error class or code the prose names with the sentence that names it. */
function exceptionsOf(
  parsed: ParsedDoc,
  body: string,
  self: string,
  md: (text: string) => string,
): ApiException[] {
  const out: ApiException[] = [];
  const named = (text: string): string => {
    const braced = /^\{([^}]+)\}/.exec(text);
    if (braced?.[1]) return braced[1];
    const code = /\b(SD\d{4}|E_[A-Z0-9_]+)\b/.exec(text);
    if (code?.[1]) return code[1];
    const cls = /\b([A-Z][A-Za-z]*Error)\b/.exec(text);
    return cls?.[1] ?? 'Error';
  };
  for (const tag of parsed.tags) {
    if (tag.name !== 'throws' && tag.name !== 'exception') continue;
    const name = named(tag.text);
    out.push({ name, description: md(tag.text.replace(/^\{[^}]+\}\s*/, '')) });
  }
  // A code or the error class named in the prose, with the sentence it is named in.
  for (const sentence of plain(body).split(SENTENCE)) {
    for (const m of sentence.matchAll(
      /\b(SD\d{4}|E_[A-Z0-9_]+|ShaderDslError|ValidationError|UnsupportedFeatureError)\b/g,
    )) {
      const name = m[1] ?? '';
      if (name === self || out.some((e) => e.name === name)) continue;
      out.push({ name, description: md(sentence.trim()) });
    }
  }
  return out;
}

/** One `@example` tag, one example: the code from its fence, the prose around it above it. */
function examplesOf(parsed: ParsedDoc, md: (text: string) => string): ApiExample[] {
  const out: ApiExample[] = [];
  for (const tag of parsed.tags) {
    if (tag.name !== 'example') continue;
    const fence = /```([a-z]*)\n([\s\S]*?)```/.exec(tag.text);
    const code = withoutConsumerComments((fence?.[2] ?? tag.text).trim());
    if (!code) continue;
    const around = fence ? tag.text.replace(fence[0], '').trim() : '';
    const lang =
      fence?.[1] === 'wgsl' || fence?.[1] === 'glsl' || fence?.[1] === 'bash' ? fence[1] : 'ts';
    out.push({
      code: rewriteReferences(code),
      lang,
      description: md(around),
    });
  }
  return out;
}

/** A comment in a sample that points at a consumer's file goes; the code it sits on stays. */
function withoutConsumerComments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const comment = /\/\/.*$/.exec(line);
      if (!comment || !namesAConsumer(comment[0])) return line;
      const kept = line.slice(0, comment.index).trimEnd();
      return kept ? kept : null;
    })
    .filter((line): line is string => line !== null)
    .join('\n')
    .trim();
}

/** A name the description links with `{@link}` and also names in `@see` is one See also
 *  entry, at the place it first appears. */
function uniqueByHref(links: readonly ApiLink[]): ApiLink[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

/** `@see` targets that are reference pages of their own. */
function seeTags(parsed: ParsedDoc, slugOf: (name: string) => string | undefined): ApiLink[] {
  const out: ApiLink[] = [];
  for (const tag of parsed.tags) {
    if (tag.name !== 'see') continue;
    for (const m of tag.text.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
      const slug = slugOf(m[0]);
      if (slug && !out.some((l) => l.label === m[0]))
        out.push({ label: m[0], href: `/api/${slug}/` });
    }
  }
  return out;
}

interface TargetInput {
  readonly name: string;
  readonly file: string;
  readonly decls: readonly ts.Declaration[];
  readonly kind: ApiKind;
  readonly parameters: readonly ApiParameter[];
  readonly tables: CompilerTables;
}

/** The Targets table: what each of the three targets does with this export. A builtin is read
 *  from the intrinsic registry and the oracle's own sets; an emit function names the one
 *  target it writes. Anything else has no row. */
function targetsOf(input: TargetInput): ApiTargetSupport[] {
  const { name, file, decls, kind, parameters, tables } = input;
  const emitTarget = EMIT_TARGET_BY_FILE[file];
  if (emitTarget && kind === 'function' && /^(emit|compileModule)/.test(name)) {
    const wrote: Record<string, string> = {
      wgsl: 'Writes WGSL for WebGPU.',
      glsl: 'Writes GLSL ES 3.00 for WebGL2.',
      cpu: 'Compiles the module to a JavaScript function that runs in f64.',
    };
    return (['wgsl', 'glsl', 'cpu'] as const).map((target) =>
      target === emitTarget
        ? { target, support: 'native' as const, note: wrote[target] ?? '' }
        : { target, support: 'n/a' as const, note: '' },
    );
  }
  if (file !== NODE_FILE) return [];
  // A builtin whose body delegates to a Node method (select) emits under its own name, and
  // the emitted argument order is the method's, so the row spells neutral names for it.
  const known = (n: string): boolean =>
    Object.prototype.hasOwnProperty.call(tables.intrinsics, n) ||
    tables.portable.has(n) ||
    tables.oracleStubs.has(n) ||
    tables.oracleBuiltins.has(n);
  const call = intrinsicCallOf(decls) ?? (known(name) ? { id: name } : undefined);
  if (!call) return [];
  const id = call.id;
  const named = parameters.map((p) => p.name.replace(/^\.\.\./, ''));
  const written = call.args;
  // A call that passes a local (`lift(x)` as `n`) reads better under the parameter's own name.
  const args = written
    ? written.length === named.length
      ? written.map((a, i) => (named.includes(a) ? a : (named[i] ?? a)))
      : written
    : intrinsicCallOf(decls)
      ? named
      : PLACEHOLDERS.slice(0, named.length);
  const spelling = tables.intrinsics[id];
  const emulated = tables.fp64.has(id);
  const note = (target: 'wgsl' | 'glsl'): string => {
    const spelt = spelling ? spelling[target](args) : `${id}(${args.join(', ')})`;
    const suffix = emulated
      ? ' Over `f64` operands the fp64 pass rewrites it into its `df64` helper.'
      : '';
    return `\`${spelt}\`.${suffix}`;
  };
  const gpu = (target: 'wgsl' | 'glsl'): ApiTargetSupport =>
    tables.preEmit.has(id)
      ? {
          target,
          support: 'emulated',
          note: 'Rewritten by `fp64Lower` into a pair of `f32` lanes before the backend runs.',
        }
      : { target, support: 'native', note: note(target) };
  const cpu: ApiTargetSupport = tables.oracleStubs.has(id)
    ? {
        target: 'cpu',
        support: 'stub',
        note: 'The oracle has no texture memory and no neighbouring fragments. The call throws unless the module was compiled with `{ gpuStubs: true }`, which returns a placeholder.',
      }
    : tables.oracleBuiltins.has(id)
      ? { target: 'cpu', support: 'native', note: 'Evaluated in f64 by the oracle.' }
      : { target: 'cpu', support: 'none', note: 'The oracle has no implementation for it.' };
  return [gpu('wgsl'), gpu('glsl'), cpu];
}

// ── the guide ─────────────────────────────────────────────────────────────────────────────

const guideMentions = new Map<string, ApiLink[]>();
function guideLinksFor(name: string): readonly ApiLink[] {
  if (guideMentions.size === 0) {
    for (const section of guideSections) {
      for (const m of section.body.matchAll(/`([^`\n]+)`/g)) {
        for (const word of (m[1] ?? '').matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
          const list = guideMentions.get(word[0]) ?? [];
          const href =
            section.id === 'overview' ? '/guide/internals/' : `/guide/internals/${section.id}/`;
          if (!list.some((l) => l.href === href)) list.push({ label: section.title, href });
          guideMentions.set(word[0], list);
        }
      }
    }
  }
  return guideMentions.get(name) ?? [];
}

// ── the checks the data must pass ─────────────────────────────────────────────────────────

function assertCategories(entries: readonly ApiEntry[]): void {
  const used = new Set(entries.map((e) => e.category.slug));
  // A category's index page and an export's page are both /api/<slug>/, so the two sets of
  // slugs may not meet.
  const pages = new Set(entries.map((e) => e.slug));
  for (const category of API_CATEGORIES) {
    if (pages.has(category.slug)) {
      throw new Error(
        `[api] the ${category.slug} category's index page collides with the ${category.slug} export's page; give the category another slug in API_CATEGORIES`,
      );
    }
  }
  for (const entry of entries) {
    if (!categoryBySlug.has(entry.category.slug))
      throw new Error(
        `[api] ${entry.name} sits in ${entry.category.slug}, which is not in API_CATEGORIES`,
      );
  }
  for (const category of API_CATEGORIES) {
    if (!used.has(category.slug))
      throw new Error(`[api] the ${category.slug} category has no exports in it`);
  }
}

/** Every place a text may still name the former host, for scripts/check-api.ts. */
export function hostMentions(entries: readonly ApiEntry[]): string[] {
  const out: string[] = [];
  for (const entry of entries) {
    const texts = [
      entry.summary,
      entry.description,
      entry.declaration,
      ...entry.signatures.map((s) => s.text),
      ...entry.parameters.map((p) => `${p.type} ${p.description}`),
      entry.returns ? `${entry.returns.type} ${entry.returns.description}` : '',
      ...entry.exceptions.map((e) => e.description),
      ...entry.examples.map((e) => `${e.code} ${e.description}`),
      ...entry.targets.map((t) => t.note),
      ...entry.members.map((m) => `${m.type} ${m.description}`),
    ];
    for (const text of texts) {
      if (/x-?gis/i.test(text.split(KEPT_ENV).join(''))) out.push(entry.name);
    }
  }
  return [...new Set(out)];
}
