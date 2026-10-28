// Every destination the site links to, in one place. Routes into the compiler are permalinks
// at the pinned commit, so a link never points at a file the site's numbers were not
// measured from. A product built on TypeShade is named and linked in two places only: the
// footer's Project group, and a guide page that shows the same task done with that product
// (the MNIST guide shows TypeNN). The API reference names no consumer of the library.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { apiCategories, apiSlugByName } from './api-nav.ts';
import { facts } from './examples.ts';
import { languageSections } from './language-reference.ts';
import { shadeExampleList } from './shade-examples.ts';
import { translationDir } from './guide-translations.ts';
import { apiCategoryCopy, copyFor, localePath, type Locale } from '../i18n/index.ts';

export interface Destination {
  readonly label: string;
  readonly href: string;
}

const mirror = facts.mirrorUrl;
const at = (file: string): string => `${mirror}/blob/${facts.pinnedCommit}/${file}`;
/** One `.shade.ts` example, by the id the registry carries it under. The construct page links
 *  a row to the file that demonstrates it; a renamed or dropped example stops the build here
 *  instead of leaving the row pointing at nothing. */
const shade = (id: string): Destination => {
  const example = shadeExampleList.find((e) => e.id === id);
  if (!example)
    throw new Error(`[links] no '.shade.ts' example called '${id}' at ${facts.pinnedCommit}`);
  return { label: example.file, href: at(`examples/${example.file}`) };
};
const siteRepo = 'https://github.com/typeshade/typeshade.github.io';

export const links = {
  home: { label: 'TypeShade', href: '/' },
  benchmarks: { label: 'Benchmarks', href: '/benchmarks/' },
  motivation: { label: 'Introduction', href: '/guide/introduction/' },
  why: { label: 'Why TypeShade', href: '/guide/why/' },
  quickStart: { label: 'Quick Start', href: '/guide/quick-start/' },
  playground: { label: 'Playground', href: '/playground/' },
  editor: { label: 'Editor support', href: '/guide/editor/' },
  // The gallery's page, built here and served at gallery.typeshade.dev (src/lib/gallery-data.ts).
  gallery: { label: 'Gallery', href: '/gallery/' },
  concepts: { label: 'TypeScript and WebGPU concepts', href: '/guide/typescript-and-webgpu/' },
  conceptsCpuGpu: { label: 'CPU and GPU', href: '/guide/concepts/cpu-and-gpu/' },
  conceptsPipeline: { label: 'The shader pipeline', href: '/guide/concepts/the-pipeline/' },
  conceptsWebgpu: { label: 'WebGPU and WebGL2', href: '/guide/concepts/webgpu-and-webgl2/' },
  conceptsGlslPrecision: { label: 'GLSL precision', href: '/guide/concepts/glsl-precision/' },
  conceptsWgsl: { label: 'WGSL and GLSL', href: '/guide/concepts/wgsl-and-glsl/' },
  guide: { label: 'Language guide', href: '/guide/language/' },
  languageStringKeys: {
    label: 'String keys and Record',
    href: '/guide/language/string-keys-record/',
  },
  exampleStringKeysRecord: {
    label: 'string-keys-record',
    href: '/guide/examples/string-keys-record/',
  },
  languageTypes: { label: 'Types', href: '/guide/language/types/' },
  languageFunctions: { label: 'Functions', href: '/guide/language/functions/' },
  languageControlFlow: { label: 'Control flow', href: '/guide/language/control-flow/' },
  languageGpuTypes: { label: 'GPU types', href: '/guide/language/gpu-types/' },
  languageResources: { label: 'Resources', href: '/guide/language/resources/' },
  languageStages: { label: 'Shader stages', href: '/guide/language/stages/' },
  // The common modules (compiler change 0072, surface §72 and §73).
  languageAlgorithms: { label: 'Algorithms', href: '/guide/language/algorithms/' },
  languageRandom: { label: 'Random numbers', href: '/guide/language/random/' },
  languageFromTypescript: {
    label: 'TypeScript constructs',
    href: '/guide/language/from-typescript/',
  },
  languageFromWgsl: { label: 'WGSL in TypeShade', href: '/guide/language/from-wgsl/' },
  languageFromGlsl: {
    label: `${facts.glslTarget} in TypeShade`,
    href: '/guide/language/from-glsl/',
  },
  // The sections of the three mapping sets, one page each. The index at the address above
  // introduces the set and links these; the sidebar opens them under it while the reader is
  // inside the set, so previous and next walk a set without going back to its index.
  fromTsDeclarations: {
    label: 'Declarations',
    href: '/guide/language/from-typescript/declarations/',
  },
  fromTsFunctions: { label: 'Functions', href: '/guide/language/from-typescript/functions/' },
  fromTsClasses: { label: 'Classes', href: '/guide/language/from-typescript/classes/' },
  fromTsControlFlow: {
    label: 'Control flow',
    href: '/guide/language/from-typescript/control-flow/',
  },
  fromTsExpressions: { label: 'Expressions', href: '/guide/language/from-typescript/expressions/' },
  fromTsDouble: { label: 'Emulated double', href: '/guide/language/from-typescript/double/' },
  fromWgslTypes: { label: 'Types', href: '/guide/language/from-wgsl/types/' },
  fromWgslResources: { label: 'Resources', href: '/guide/language/from-wgsl/resources/' },
  fromWgslEntries: { label: 'Entry points', href: '/guide/language/from-wgsl/entries/' },
  fromWgslStatements: { label: 'Statements', href: '/guide/language/from-wgsl/statements/' },
  fromGlslTypes: { label: 'Types', href: '/guide/language/from-glsl/types/' },
  fromGlslUniforms: { label: 'Uniforms', href: '/guide/language/from-glsl/uniforms/' },
  fromGlslVariables: { label: 'Builtin variables', href: '/guide/language/from-glsl/variables/' },
  fromGlslFunctions: { label: 'Functions', href: '/guide/language/from-glsl/functions/' },
  languageBuiltins: { label: 'Builtin functions', href: '/guide/language/builtins/' },
  legacyAuthoring: { label: 'Compiler authoring guide', href: '/guide/authoring/' },
  internals: { label: 'Compiler internals', href: '/guide/internals/' },
  internalsGlslShader: {
    label: 'Migrating a GLSL shader',
    href: '/guide/internals/migrating-a-glsl-shader/',
  },
  languageService: { label: 'Language service', href: '/guide/language-service/' },
  languageServiceDesign: {
    label: 'Language service design document',
    href: at('docs/language-service-api.md'),
  },
  checks: { label: 'Verification', href: '/guide/checks/' },
  examples: { label: 'Examples', href: '/guide/examples/' },
  mnist: { label: 'MNIST training', href: '/guide/mnist/' },
  api: { label: 'Compiler API reference', href: '/api/' },
  reference: { label: 'Language reference', href: '/reference/' },
  referenceFunctions: { label: 'Functions', href: '/reference/functions/' },
  referenceTypes: { label: 'Types', href: '/reference/types/' },
  errors: { label: 'Error codes', href: '/reference/errors/' },
  rules: { label: 'Design rules', href: '/reference/rules/' },
  rulesGuarantees: { label: 'What is guaranteed', href: '/reference/rules/guarantees/' },
  guideSource: { label: 'Compiler guide source (AUTHORING.md)', href: at('AUTHORING.md') },
  surfaceSource: {
    label: 'TypeShade surface specification',
    href: at('docs/use-typeshade-surface.md'),
  },
  designSource: { label: 'docs/language-design.md', href: at('docs/language-design.md') },
  mirror: { label: 'GitHub', href: mirror },
  docs: { label: 'README', href: at('README.md') },
  npm: { label: 'typeshade', href: 'https://www.npmjs.com/package/typeshade' },
  // The editor extension and the agent server live in one repository of their own, and each
  // is published where an editor or an agent client looks for it.
  extensionMarketplace: {
    label: 'Visual Studio Marketplace',
    href: 'https://marketplace.visualstudio.com/items?itemName=typeshade.vscode-typeshade',
  },
  extensionOpenVsx: {
    label: 'Open VSX',
    href: 'https://open-vsx.org/extension/typeshade/vscode-typeshade',
  },
  extensionSource: {
    label: 'typeshade/vscode-typeshade',
    href: 'https://github.com/typeshade/vscode-typeshade',
  },
  mcpPackage: { label: '@typeshade/mcp', href: 'https://www.npmjs.com/package/@typeshade/mcp' },
  mcpReadme: {
    label: 'the @typeshade/mcp README',
    href: 'https://github.com/typeshade/vscode-typeshade/blob/main/packages/mcp-server/README.md',
  },
  llms: { label: 'llms.txt', href: '/llms.txt' },
  // Products built on TypeShade, each in a repository of its own and served at its own host.
  // The footer's Project group closes with them, one link each under the product's name.
  radiance: { label: 'Radiance', href: 'https://radiance.typeshade.dev/' },
  // TypeNN, a neural-network library built on TypeShade: its site and its repository.
  typenn: { label: 'TypeNN', href: 'https://nn.typeshade.dev/' },
  typennGithub: { label: 'TypeNN on GitHub', href: 'https://github.com/typeshade/typenn' },
  commit: { label: facts.pinnedCommit, href: `${mirror}/tree/${facts.pinnedCommit}` },
  releases: { label: 'Watch releases', href: `${mirror}/releases` },
  license: { label: facts.licenseName, href: at('LICENSE') },
  changelog: { label: 'Changelog', href: at('CHANGELOG.md') },
  examplesDir: {
    label: 'the examples directory',
    href: `${mirror}/tree/${facts.pinnedCommit}/examples`,
  },
  goldens: { label: 'emit-goldens.test.ts', href: at('examples/emit-goldens.test.ts') },
  packageJson: { label: 'package.json', href: at('package.json') },
  oracle: { label: 'src/core/oracle.ts', href: at('src/core/oracle.ts') },
  intrinsicRegistry: { label: 'src/core/intrinsics.ts', href: at('src/core/intrinsics.ts') },
  deepZoom: {
    label: 'fp64-deep-zoom-twin.shade.ts',
    href: at('examples/fp64-deep-zoom-twin.shade.ts'),
  },
  compileGate: { label: 'scripts/compile-gate.ts', href: at('scripts/compile-gate.ts') },
  ciGates: { label: 'the CI workflow', href: `${siteRepo}/blob/main/.github/workflows/deploy.yml` },
  maplibreRoadmap: {
    label: 'MapLibre graphics modernization roadmap',
    href: 'https://maplibre.org/roadmap/maplibre-gl-js/graphics-modernization/',
  },
  deckglWebgpu: {
    label: 'deck.gl WebGPU guide',
    href: 'https://deck.gl/docs/developer-guide/webgpu',
  },
  pixijsMigration: {
    label: 'PixiJS v8 migration guide',
    href: 'https://pixijs.com/8.x/guides/migrations/v8',
  },
  mdnWebgpu: {
    label: 'MDN WebGPU API',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API',
  },
  mdnGpuDevice: {
    label: 'MDN GPUDevice',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice',
  },
  mdnBindGroupLayout: {
    label: 'MDN GPUBindGroupLayout',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/GPUBindGroupLayout',
  },
  mdnRenderPipeline: {
    label: 'MDN GPURenderPipeline',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPipeline',
  },
  mdnComputePass: {
    label: 'MDN GPUComputePassEncoder',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/GPUComputePassEncoder',
  },
  mdnWebgl2: {
    label: 'MDN WebGL2RenderingContext',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext',
  },
  specWebgpu: { label: 'WebGPU specification', href: 'https://www.w3.org/TR/webgpu/' },
  webgpuTypes: { label: 'WebGPU types', href: 'https://github.com/gpuweb/types' },
  specWgsl: { label: 'WGSL specification', href: 'https://www.w3.org/TR/WGSL/' },
  specWebgl2: {
    label: 'WebGL2 specification',
    href: 'https://registry.khronos.org/webgl/specs/latest/2.0/',
  },
  // The sections of the WGSL specification a reference note cites, by the anchor each heading
  // carries; the anchor stays when an edition renumbers the section.
  specWgslPow: { label: 'WGSL pow', href: 'https://www.w3.org/TR/WGSL/#pow-builtin' },
  specWgslIeeeOverview: {
    label: 'WGSL floating point evaluation',
    href: 'https://www.w3.org/TR/WGSL/#overview-of-ieee-754',
  },
  specWgslIeee: {
    label: 'WGSL differences from IEEE-754',
    href: 'https://www.w3.org/TR/WGSL/#differences-from-ieee754',
  },
  specWgslFloatAccuracy: {
    label: 'WGSL floating point accuracy',
    href: 'https://www.w3.org/TR/WGSL/#floating-point-accuracy',
  },
  specWgslAccuracy: {
    label: 'WGSL accuracy of concrete expressions',
    href: 'https://www.w3.org/TR/WGSL/#concrete-float-accuracy',
  },
  specWgslDomains: {
    label: 'WGSL domains of floating point expressions',
    href: 'https://www.w3.org/TR/WGSL/#domains-of-floating-point-expressions-and-builtins',
  },
  specWgslIndeterminate: {
    label: 'WGSL indeterminate values',
    href: 'https://www.w3.org/TR/WGSL/#indeterminate-values',
  },
  specWgslConstExpr: {
    label: 'WGSL const expressions',
    href: 'https://www.w3.org/TR/WGSL/#const-expr',
  },
  specWgslExtensions: {
    label: 'WGSL enable extensions',
    href: 'https://www.w3.org/TR/WGSL/#enable-extensions-sec',
  },
  specWgslIntro: { label: 'WGSL introduction', href: 'https://www.w3.org/TR/WGSL/#intro' },
  specGlslEs100: {
    label: 'GLSL ES 1.00 specification',
    href: 'https://registry.khronos.org/OpenGL/specs/es/2.0/GLSL_ES_Specification_1.00.pdf',
  },
  mdnGlslPrecision: {
    label: 'MDN GLSL precision guidance',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#be_precise_with_glsl_precision_annotations',
  },
  mdnShaderPrecision: {
    label: 'MDN getShaderPrecisionFormat',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getShaderPrecisionFormat',
  },
  specGlslEs: {
    label: `${facts.glslTarget} specification`,
    href: 'https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf',
  },
  survey: { label: facts.survey.title, href: facts.survey.url },
  // The examples the reference note on `pow` quotes a call from.
  examplePowBitBump: { label: 'bit-bump', href: '/guide/examples/bit-bump/' },
  examplePowDefaultArgs: { label: 'default-args', href: '/guide/examples/default-args/' },
  examplePowJulia: { label: 'fp64-julia-twin', href: '/guide/examples/fp64-julia-twin/' },
  // The kernel examples the control-flow page names (compiler changes 0078 to 0080).
  exampleKernelSetUnique: {
    label: 'kernel-set-unique',
    href: '/guide/examples/kernel-set-unique/',
  },
  exampleHostSetUnique: { label: 'host-set-unique', href: '/guide/examples/host-set-unique/' },
  exampleHostCompute: { label: 'host-compute', href: '/guide/examples/host-compute/' },
  examplePowCapsule: {
    label: 'capsule-corp-namek-class',
    href: '/guide/examples/capsule-corp-namek-class/',
  },
  guideGlslFloatPrecision: {
    label: 'GLSL float precision',
    href: '/guide/internals/glsl-float-precision/',
  },
  // The `.shade.ts` example behind a row of /guide/language/from-typescript/.
  shadeModuleConst: shade('module-const'),
  shadePaletteConst: shade('palette-const'),
  shadePrivateState: shade('private-state'),
  shadeBitfieldBands: shade('bitfield-bands'),
  shadeRayClass: shade('ray-class'),
  shadeDefaultArgs: shade('default-args'),
  shadeReferenceParameters: shade('reference-parameters'),
  shadeAtomicHistogram: shade('atomic-histogram'),
  shadeOrbitInout: shade('orbit-inout'),
  shadeClassSyntax: shade('class-syntax'),
  shadeShapeInheritance: shade('shape-inheritance'),
  shadeMixinSurface: shade('mixin-surface'),
  shadeGenericHelpers: shade('generic-helpers'),
  shadeGenericClass: shade('generic-class'),
  shadeBlockScope: shade('block-scope'),
  shadePickComposite: shade('pick-composite'),
  shadeCutout: shade('cutout'),
  shadeJuliaTwin: shade('julia-twin'),
  shadeArrayLiteralRamp: shade('array-literal-ramp'),
  shadeTupleAndBrand: shade('tuple-and-brand'),
  shadeBoolSelect: shade('bool-select'),
  shadeLaneStripes: shade('fp64-lane-stripes'),
} as const satisfies Record<string, Destination>;

/** The name of a destination above. Copy that carries a link as a key (src/i18n/en.ts) is
 *  typed with this, so a key no record has is a type error and not a crash at build time. */
export type LinkKey = keyof typeof links;

/** The three construct-mapping sets. Each one is an index that introduces the set and links
 *  its sections, and one page per section in this order, which is the order the sidebar
 *  lists them in and the order previous and next walk them in. The rows themselves stay in
 *  the generators; this is only the shape of the routes. */
export const mappingSets = [
  {
    index: 'languageFromTypescript',
    sections: [
      { key: 'declarations', link: 'fromTsDeclarations' },
      { key: 'functions', link: 'fromTsFunctions' },
      { key: 'classes', link: 'fromTsClasses' },
      { key: 'controlFlow', link: 'fromTsControlFlow' },
      { key: 'expressions', link: 'fromTsExpressions' },
      { key: 'double', link: 'fromTsDouble' },
    ],
  },
  {
    index: 'languageFromWgsl',
    sections: [
      { key: 'types', link: 'fromWgslTypes' },
      { key: 'resources', link: 'fromWgslResources' },
      { key: 'entries', link: 'fromWgslEntries' },
      { key: 'statements', link: 'fromWgslStatements' },
    ],
  },
  {
    index: 'languageFromGlsl',
    sections: [
      { key: 'types', link: 'fromGlslTypes' },
      { key: 'uniforms', link: 'fromGlslUniforms' },
      { key: 'variables', link: 'fromGlslVariables' },
      { key: 'functions', link: 'fromGlslFunctions' },
    ],
  },
] as const;

export type MappingIndexKey = (typeof mappingSets)[number]['index'];
export type MappingSectionKey = (typeof mappingSets)[number]['sections'][number]['link'];

/** One set by the index it belongs to, for the page components that render it. */
export function mappingSet<K extends MappingIndexKey>(
  index: K,
): Extract<(typeof mappingSets)[number], { index: K }> {
  const found = mappingSets.find((set) => set.index === index);
  if (!found) throw new Error(`[links] no mapping set called '${index}'`);
  return found as Extract<(typeof mappingSets)[number], { index: K }>;
}

const i18nSourceByLocale = new Map<Locale, string>();
function i18nSource(locale: Locale): string {
  const cached = i18nSourceByLocale.get(locale);
  if (cached !== undefined) return cached;
  const text = readFileSync(path.resolve(`src/i18n/${locale}.ts`), 'utf8');
  i18nSourceByLocale.set(locale, text);
  return text;
}
function dictionaryLine(locale: Locale, key: string): number {
  const lines = i18nSource(locale).split('\n');
  const at = lines.findIndex((l) => l.startsWith(`  ${key}: {`) || l.startsWith(`  ${key}: `));
  if (at < 0) throw new Error(`[links] '${key}' is not a top-level key of src/i18n/${locale}.ts`);
  return at + 1;
}
export function editCopy(locale: Locale, key?: string): string {
  const at = key === undefined ? '' : `#L${dictionaryLine(locale, key)}`;
  return `${siteRepo}/blob/main/src/i18n/${locale}.ts${at}`;
}
export function editPrecisionGuide(locale: Locale): string {
  return `${siteRepo}/blob/main/src/i18n/precision-guide-${locale}.ts`;
}

export function editGuide(sourceLine: number): string {
  return `${links.guideSource.href}#L${sourceLine}`;
}
export function editGuideTranslation(locale: Locale, id: string): string {
  return `${siteRepo}/blob/main/${translationDir(locale)}/${id}.md`;
}

export function navLinks(locale: Locale): readonly Destination[] {
  const labels = copyFor(locale).docs.labels.nav;
  return [
    { label: labels.docs, href: localePath(locale, links.quickStart.href) },
    { label: labels.playground, href: localePath(locale, links.playground.href) },
    { label: labels.language, href: localePath(locale, links.guide.href) },
    { label: labels.reference, href: localePath(locale, links.reference.href) },
    { label: labels.examples, href: localePath(locale, links.examples.href) },
  ];
}

export function apiPage(name: string): string {
  const slug = apiSlugByName().get(name);
  if (!slug)
    throw new Error(`[links] the copy links to '${name}', which the compiler does not export`);
  return `/api/${slug}/`;
}

/** The guide's own pages in the order the sidebar groups them, for the footer's site map.
 *  A set whose members are listed and linked by a page of its own is one row here, the way
 *  the compiler internals are: the three mapping indexes stand for their fourteen sections
 *  and /guide/internals/ for its own, so the map stays a map. */
export function docsPages(locale: Locale): readonly Destination[] {
  return [
    docsPage(locale, 'motivation'),
    docsPage(locale, 'why'),
    docsPage(locale, 'quickStart'),
    docsPage(locale, 'editor'),
    docsPage(locale, 'guide'),
    docsPage(locale, 'languageFromTypescript'),
    docsPage(locale, 'languageFromWgsl'),
    docsPage(locale, 'languageFromGlsl'),
    docsPage(locale, 'languageBuiltins'),
    docsPage(locale, 'concepts'),
    docsPage(locale, 'conceptsCpuGpu'),
    docsPage(locale, 'conceptsPipeline'),
    docsPage(locale, 'conceptsWebgpu'),
    docsPage(locale, 'conceptsWgsl'),
    docsPage(locale, 'conceptsGlslPrecision'),
    docsPage(locale, 'examples'),
    docsPage(locale, 'mnist'),
    docsPage(locale, 'reference'),
    docsPage(locale, 'internals'),
    docsPage(locale, 'languageService'),
    docsPage(locale, 'checks'),
  ];
}

type DocsPageKey =
  | 'motivation'
  | 'why'
  | 'quickStart'
  | 'playground'
  | 'editor'
  | 'guide'
  | 'languageFromTypescript'
  | 'languageFromWgsl'
  | 'languageFromGlsl'
  | 'languageBuiltins'
  | MappingSectionKey
  | 'concepts'
  | 'conceptsCpuGpu'
  | 'conceptsPipeline'
  | 'conceptsWebgpu'
  | 'conceptsWgsl'
  | 'conceptsGlslPrecision'
  | 'examples'
  | 'mnist'
  | 'reference'
  | 'internals'
  | 'languageService'
  | 'checks'
  | 'benchmarks';
/** One page of the guide as the sidebar and the footer name it, in one language. */
function docsPage(locale: Locale, key: DocsPageKey): Destination {
  const d = copyFor(locale).docs;
  const m = d.labels.mappingSections;
  const labels: Record<DocsPageKey, string> = {
    motivation: d.introduction,
    why: d.why,
    quickStart: d.quickStart,
    playground: d.labels.playground,
    editor: d.labels.editor,
    guide: d.labels.languageGuide,
    languageFromTypescript: d.labels.mapping.fromTypescript,
    languageFromWgsl: d.labels.mapping.fromWgsl,
    languageFromGlsl: d.labels.mapping.fromGlsl,
    languageBuiltins: d.labels.mapping.builtins,
    concepts: d.labels.concepts,
    conceptsCpuGpu: d.labels.conceptPages.cpuAndGpu,
    conceptsPipeline: d.labels.conceptPages.pipeline,
    conceptsWebgpu: d.labels.conceptPages.webgpuAndWebgl2,
    conceptsWgsl: d.labels.conceptPages.wgslAndGlsl,
    conceptsGlslPrecision: d.labels.conceptPages.glslPrecision,
    examples: d.examples,
    mnist: copyFor(locale).mnist.title,
    reference: d.labels.languageReference,
    internals: d.labels.internals,
    languageService: d.labels.languageService,
    checks: d.checks,
    benchmarks: copyFor(locale).benchmarks.h1,
    // The sections of the three mapping sets. The sidebar row takes the short name; the
    // page's own h1 is the longer heading the set's copy already carries.
    fromTsDeclarations: m.fromTypescript.declarations,
    fromTsFunctions: m.fromTypescript.functions,
    fromTsClasses: m.fromTypescript.classes,
    fromTsControlFlow: m.fromTypescript.controlFlow,
    fromTsExpressions: m.fromTypescript.expressions,
    fromTsDouble: m.fromTypescript.double,
    fromWgslTypes: m.fromWgsl.types,
    fromWgslResources: m.fromWgsl.resources,
    fromWgslEntries: m.fromWgsl.entries,
    fromWgslStatements: m.fromWgsl.statements,
    fromGlslTypes: m.fromGlsl.types,
    fromGlslUniforms: m.fromGlsl.uniforms,
    fromGlslVariables: m.fromGlsl.variables,
    fromGlslFunctions: m.fromGlsl.functions,
  };
  return { label: labels[key], href: localePath(locale, links[key].href) };
}

export interface SidebarItem extends Destination {
  readonly depth?: number;
  /** The label is an export's name, set in the code font. */
  readonly code?: boolean;
}
export interface SidebarGroup {
  readonly title: string;
  readonly items: readonly SidebarItem[];
}

/** The sidebar's groups. The reference lists its categories and opens the members of the one
 *  the reader is in; the compiler internals list their sections the same way, only while the
 *  reader is on one of them, so the sidebar never carries every page of the reference at once.
 *  `path` is the page's locale-neutral route. */
export function sidebar(
  locale: Locale,
  sections: readonly Destination[] = [],
  openCategory?: string,
  path?: string,
): readonly SidebarGroup[] {
  const d = copyFor(locale).docs;
  const labels = d.labels.sidebarGroups;
  const topicLabels = d.labels.topics;
  const page = (key: DocsPageKey): SidebarItem => docsPage(locale, key);
  const languagePages: SidebarItem[] = [
    page('guide'),
    {
      label: topicLabels.stringKeys,
      href: localePath(locale, links.languageStringKeys.href),
      depth: 1,
    },
    { label: topicLabels.types, href: localePath(locale, links.languageTypes.href), depth: 1 },
    {
      label: topicLabels.functions,
      href: localePath(locale, links.languageFunctions.href),
      depth: 1,
    },
    {
      label: topicLabels.controlFlow,
      href: localePath(locale, links.languageControlFlow.href),
      depth: 1,
    },
    {
      label: topicLabels.gpuTypes,
      href: localePath(locale, links.languageGpuTypes.href),
      depth: 1,
    },
    {
      label: topicLabels.resources,
      href: localePath(locale, links.languageResources.href),
      depth: 1,
    },
    { label: topicLabels.stages, href: localePath(locale, links.languageStages.href), depth: 1 },
    {
      label: topicLabels.algorithms,
      href: localePath(locale, links.languageAlgorithms.href),
      depth: 1,
    },
    { label: topicLabels.random, href: localePath(locale, links.languageRandom.href), depth: 1 },
  ];
  // A mapping set is an index one level in, the way a topic is, with its own sections one
  // level further in. They open only while the reader is inside the set, the way the
  // compiler internals open their sections, so the Language group never carries every
  // section of all three sets at once.
  for (const set of mappingSets) {
    languagePages.push({ ...page(set.index), depth: 1 });
    if (path?.startsWith(links[set.index].href)) {
      for (const s of set.sections) languagePages.push({ ...page(s.link), depth: 2 });
    }
  }
  languagePages.push({ ...page('languageBuiltins'), depth: 1 });
  // The Reference group opens with the language reference, the surface a shader author
  // writes, and its six kind pages one level in; then the compiler's own API reference with
  // its categories, then the internals and the language service.
  const reference: SidebarItem[] = [page('reference')];
  for (const section of languageSections()) {
    reference.push({
      label: d.reference.kinds[section.kind].name,
      href: localePath(locale, `/reference/${section.slug}/`),
      depth: 1,
    });
    // On a function's own page, the functions of its family follow the kind one level in
    // (maths, packing, textures). Only that family opens, so the sidebar never carries the
    // 175 function names at once. The other kinds stay closed.
    const name =
      section.kind === 'function' && path?.startsWith(`/reference/${section.slug}/`)
        ? path.slice(`/reference/${section.slug}/`.length).replace(/\/$/, '')
        : '';
    const group = name
      ? section.groups.find((g) => g.entries.some((e) => e.name === name))?.entries
      : undefined;
    for (const e of group ?? [])
      reference.push({
        label: e.title,
        href: localePath(locale, `/reference/${section.slug}/${e.name}/`),
        depth: 2,
        code: true,
      });
  }
  // The diagnostic codes sit with the language reference: a code is what a reader of a
  // `"use typeshade"` file meets when the file does not compile.
  reference.push({ label: d.errors.h1, href: localePath(locale, links.errors.href), depth: 1 });
  // The design rules follow the codes: a code's page names the rule it enforces, and a rule's
  // page the codes that enforce it.
  reference.push({ label: d.rules.h1, href: localePath(locale, links.rules.href), depth: 1 });
  // What the rules guarantee opens one level further in, only while the reader is among the
  // rules, the way a mapping set opens its sections.
  if (path?.startsWith(links.rules.href))
    reference.push({
      label: d.rules.guarantees.h1,
      href: localePath(locale, links.rulesGuarantees.href),
      depth: 2,
    });
  reference.push({ label: d.api.h1, href: localePath(locale, links.api.href) });
  for (const { category, members } of apiCategories()) {
    reference.push({
      label: apiCategoryCopy(locale, category.slug).name,
      href: localePath(locale, `/api/${category.slug}/`),
      depth: 1,
    });
    if (category.slug !== openCategory) continue;
    for (const m of members)
      reference.push({
        label: m.name,
        href: localePath(locale, `/api/${m.slug}/`),
        depth: 2,
        code: true,
      });
  }
  reference.push(page('internals'));
  if (path?.startsWith(links.internals.href))
    for (const s of sections) reference.push({ ...s, depth: 1 });
  reference.push(page('languageService'));
  return [
    {
      title: labels.getStarted,
      items: [
        page('motivation'),
        page('why'),
        page('quickStart'),
        page('playground'),
        page('editor'),
      ],
    },
    { title: labels.language, items: languagePages },
    {
      title: labels.concepts,
      items: [
        page('concepts'),
        page('conceptsCpuGpu'),
        page('conceptsPipeline'),
        page('conceptsWebgpu'),
        page('conceptsWgsl'),
        page('conceptsGlslPrecision'),
      ],
    },
    { title: labels.examples, items: [page('examples'), page('mnist')] },
    { title: labels.reference, items: reference },
    { title: labels.project, items: [page('checks'), page('benchmarks')] },
  ];
}

/** The TypeNN training lab in a locale's language: `/lab/`, or `/ko/lab/` on the TypeNN site. */
export const typennLab = (locale: Locale): string =>
  `${links.typenn.href.replace(/\/$/, '')}${localePath(locale, '/lab/')}`;
