// /llms.txt, generated from the same records the page renders from. Every numeral in it must
// exist in `facts` with the same value, or the build fails.
import type { APIRoute } from 'astro';
import { claims } from '../lib/claims.ts';
import { facts } from '../lib/examples.ts';
import { languageSections } from '../lib/language-reference.ts';
import { links, sidebar } from '../lib/links.ts';
import { copyFor, defaultLocale } from '../i18n/index.ts';

const copy = copyFor(defaultLocale);

const summary = [
  `TypeShade compiles TypeScript files that start with "use typeshade".`,
  `One intermediate representation emits WGSL for WebGPU and`,
  `${facts.glslTarget} for WebGL2. The same source also compiles to a CPU function that runs in double`,
  `precision, and the test suite checks the compiler's algebra against it. A misspelt uniform field is`,
  `a TypeScript error at author time; reflect() recovers`,
  `${facts.layoutStandards.join(' and ')} layouts, so a host packs its uniform buffer from the compiler's`,
  `own layout; emulated double precision is authored with the same syntax as f32. It has`,
  `${facts.runtimeDeps} runtime dependency, TypeScript, and is ${facts.license} licensed. Its own CI compiles every`,
  `WGSL emit on Tint and links every renderable example on WebGL2, on every push. Version`,
  `${facts.nextVersion} is not published yet and the npm name typeshade is reserved, so start from the`,
  `mirror and the authoring guide.`,
].join(' ');

const absolute = (href: string) => (href.startsWith('/') ? `https://typeshade.dev${href}` : href);

// The six kind pages of the language reference, named the way the English dictionary names
// them, so a page added to the reference upstream reaches this file with the next pin. Each
// one is the index over its names, and every name has a page of its own one segment further
// in at /reference/<kind>/<name>/; the index lists and links every one of them, so the
// index's row here covers the set, the way the examples gallery's row covers the per-example
// pages. The sidebar names the six indexes and no entry page, so the check below, which
// holds the sidebar to this table, needs nothing added to it.
const kindNotes: Readonly<Record<string, string>> = {
  types: 'the scalar, vector, matrix and memory types a declaration names, one page each',
  attributes:
    'the decorators that mark an entry point and bind a field to the pipeline, one page each',
  'builtin-values':
    'the @builtin(...) ids the pipeline supplies, with the stage each belongs to, one page each',
  functions:
    'the functions a shader calls, with the WGSL and GLSL text written for each, one page each',
  constants: 'the compile-time literals the compiler inlines, and discard, one page each',
  math: 'the Math members a shader may reach, each routed to a builtin or a literal, one page each',
};
const referenceKinds = languageSections().map((section) => {
  const note = kindNotes[section.slug];
  if (!note)
    throw new Error(
      `[llms.txt] the language reference has a '${section.slug}' page this file does not describe`,
    );
  return {
    dest: {
      label: copy.docs.reference.kinds[section.kind].name,
      href: `/reference/${section.slug}/`,
    },
    note,
  };
});

const table = [
  {
    dest: links.motivation,
    note: 'the TypeShade language boundary and its TypeScript authoring model',
  },
  {
    dest: links.why,
    note: 'TypeScript tooling, shared shader source, output verification and adoption constraints',
  },
  {
    dest: links.quickStart,
    note: 'the submodule command, a complete shader file and the WGSL it emits',
  },
  {
    dest: links.playground,
    note: 'the browser editor: a shader, its diagnostics and its emitted shader text side by side',
  },
  {
    dest: links.editor,
    note: 'the VS Code extension: how to install it, what it gives a shader file on the desktop and in VS Code for the Web, and the round trip with the Playground',
  },
  { dest: links.guide, note: 'the language guide and its topics' },
  {
    dest: links.languageStringKeys,
    note: 'closed string-literal key types, Record tables and their host values',
  },
  {
    dest: links.languageTypes,
    note: 'type aliases, classes as GPU structs, and the field decorators that describe layout',
  },
  {
    dest: links.languageFunctions,
    note: 'parameters, return types, helpers, entry points and builtin inputs',
  },
  { dest: links.languageControlFlow, note: 'the conditions and loops that compile to GPU code' },
  { dest: links.languageGpuTypes, note: 'scalars, vectors, matrices and arrays' },
  {
    dest: links.languageResources,
    note: 'uniform and storage declarations, access modes and binding slots',
  },
  { dest: links.languageStages, note: 'the vertex, fragment and compute decorators' },
  {
    dest: links.languageAlgorithms,
    note: 'typeshade/algorithms: maps, reductions, scans, compaction and a histogram as kernel functions',
  },
  {
    dest: links.languageRandom,
    note: 'typeshade/random: hashes and uniform draws for a kernel and for a host',
  },
  {
    dest: links.languageFromTypescript,
    note: 'every TypeScript construct, what it lowers to, and the shader text it emits, one page per section',
  },
  {
    dest: links.fromTsDeclarations,
    note: 'constants, variables, enums, type aliases, interfaces and namespaces, and what is emitted for each',
  },
  {
    dest: links.fromTsFunctions,
    note: 'helpers, arrow functions, overloads, recursion, entry points, and the calls the compiler refuses',
  },
  {
    dest: links.fromTsClasses,
    note: 'constructors, methods, static members, inheritance, mixins and generics as structs and functions',
  },
  {
    dest: links.fromTsControlFlow,
    note: 'conditions, loops, switch, the ternary, break, continue and discard, and the loops refused',
  },
  {
    dest: links.fromTsExpressions,
    note: 'assertions, destructuring, spreads, literals, and the values a shader cannot build while it runs',
  },
  {
    dest: links.fromTsDouble,
    note: 'emulated double precision: what is rewritten, and the calls put in place of the arithmetic',
  },
  {
    dest: links.languageFromWgsl,
    note: 'the WGSL surface construct by construct, with the TypeShade spelling of each one, one page per section',
  },
  {
    dest: links.fromWgslTypes,
    note: 'WGSL scalars, vectors, matrices, arrays, atomics, textures and samplers, and how each is written',
  },
  {
    dest: links.fromWgslResources,
    note: 'address spaces, access modes and the binding slot a declare takes',
  },
  {
    dest: links.fromWgslEntries,
    note: 'stage attributes, workgroup size, vertex returns, and the builtin ids the pipeline supplies',
  },
  {
    dest: links.fromWgslStatements,
    note: 'the statements and expressions, with the WGSL each one is emitted as',
  },
  {
    dest: links.languageFromGlsl,
    note: `the ${facts.glslTarget} surface construct by construct, with the TypeShade spelling of each one, one page per section`,
  },
  {
    dest: links.fromGlslTypes,
    note: `${facts.glslTarget} scalars, vectors, matrices, arrays and samplers, and the types this target refuses`,
  },
  {
    dest: links.fromGlslUniforms,
    note: 'uniform blocks, storage buffers, varyings, and the extensions this target has a row for',
  },
  {
    dest: links.fromGlslVariables,
    note: 'the gl_ globals as builtin attributes, and the ones neither writer takes',
  },
  {
    dest: links.fromGlslFunctions,
    note: `the functions and operators a GLSL author looks for, with the ${facts.glslTarget} written for each`,
  },
  {
    dest: links.languageBuiltins,
    note: `every builtin with the WGSL and ${facts.glslTarget} text the compiler writes for it`,
  },
  { dest: links.concepts, note: 'where the TypeScript you know sits in a WebGPU program' },
  {
    dest: links.conceptsCpuGpu,
    note: 'what the GPU does to an entry point, and the language rule each of those facts produces',
  },
  {
    dest: links.conceptsPipeline,
    note: 'what each stage is handed, what it produces and what interpolation between stages means',
  },
  {
    dest: links.conceptsWebgpu,
    note: 'what the host application owns, what the compiler owns, and where WebGL2 differs',
  },
  {
    dest: links.conceptsWgsl,
    note: `the same source emitted as WGSL and as ${facts.glslTarget}, with the differences between the targets`,
  },
  {
    dest: links.conceptsGlslPrecision,
    note: 'precision highp float explained, shader defaults, illustrative rounding and browser capability inspection without a TypeShade prerequisite',
  },
  {
    dest: links.examples,
    note: `the ${facts.shadeExamples} examples, one page each with the shader running and the text it emits, the GLSL emit and the emulated-double demo`,
  },
  {
    dest: links.mnist,
    note: 'MNIST training stages, CPU/WebGPU results and WebGL2 subset validation',
  },
  {
    dest: links.reference,
    note: `the language reference, every name a "use typeshade" file can write, one page per name under six indexes`,
  },
  ...referenceKinds,
  {
    dest: links.api,
    note: 'the compiler API reference, one page per public export, for a host application and the fn() builder',
  },
  { dest: links.internals, note: 'the compiler internals, one page per section of AUTHORING.md' },
  {
    dest: links.languageService,
    note: 'the editor-neutral language service behind the Playground, for language servers and editor extensions',
  },
  { dest: links.checks, note: 'what CI runs on every push' },
  {
    dest: links.mirror,
    note: 'mirror; pull requests cannot be merged there yet; consume as a git submodule, its root is the package',
  },
  { dest: links.docs, note: "the repository's README" },
  { dest: links.npm, note: 'the reserved package name; not published yet' },
  { dest: links.commit, note: 'the commit every number below was measured at' },
];

// Every page the sidebar names under /guide/, and the Playground beside them, has to be in
// the table above. A page added to the site and missed here would leave the file a model
// reads describing a smaller site than the one that shipped. The per-example pages under
// /guide/examples/<id>/ are one set the gallery already lists and links every member of, so
// the gallery's row covers them; the sidebar names that gallery page alone, which is what
// the check below reads.
const listed = new Set<string>(table.map((r) => r.dest.href));
const missing = sidebar(defaultLocale)
  .flatMap((g) => g.items)
  .map((i) => i.href)
  .filter(
    (href) => (href.startsWith('/guide/') || href === links.playground.href) && !listed.has(href),
  );
if (missing.length > 0) {
  throw new Error(
    `[llms.txt] the sidebar names ${missing.join(', ')}, which this file does not list`,
  );
}

const body = `# TypeShade

> ${summary}

## Links

${table.map((r) => `- [${r.dest.label}](${absolute(r.dest.href)}): ${r.note}`).join('\n')}

## Measured at build time from the compiler pinned at ${facts.pinnedCommit}

${claims.map((c) => `- ${c.text} Source: ${c.source.label}, ${c.source.href}`).join('\n')}
`;

const NUMERAL = /\d+(?:\.\d+)*/g;
const prose = body.replace(/https?:\/\/\S+/g, ' ');
const known = new Set(JSON.stringify(facts).match(NUMERAL) ?? []);
const strays = [...new Set(prose.match(NUMERAL) ?? [])].filter((n) => !known.has(n));
if (strays.length > 0) {
  throw new Error(`[llms.txt] numerals with no fact behind them: ${strays.join(', ')}`);
}

export const GET: APIRoute = () =>
  new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
