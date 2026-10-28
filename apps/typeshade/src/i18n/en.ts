import { conceptLessons, conceptLessonLabels } from './concept-lessons-en.ts';
import { precisionGuide, fractionLabel } from './precision-guide-en.ts';
// English copy: the source text every translation follows. Every number comes from the
// build (src/lib/examples.ts). Inline links are written as [text](key), where key names a
// record in src/lib/links.ts; inline code is written in backticks. Rich.astro renders both.
import { API_CATEGORIES } from '../lib/api.ts';
import { facts, hero, quickStartFile, twinBlurbs } from '../lib/examples.ts';
import { shadeDescriptions, shadeTitles } from '../lib/shade-examples.ts';
import { hostBlurbs, hostDescriptions, hostTitles } from '../lib/host-example-pages.ts';
import { guideSections } from '../lib/guide.ts';
import { ISSUE_IMAGE_BYTES, ISSUE_IMAGES_MAX } from '../lib/issue-data.ts';
import type { LinkKey } from '../lib/links.ts';
import { typedError } from '../lib/typed-error.ts';
import { mnistEpochs, mnistTestSamples } from '../lib/mnist-settings.ts';
import { operationLessons, constructorLesson } from './operation-lessons-en.ts';
import { functionLessons } from './function-lessons-en.ts';

const glsl = facts.glslTarget;
const err = typedError();
const std = facts.layoutStandards[0];
const split = facts.splitLabels ?? ['f32', 'f64'];

// A title and a description for every section of the authoring guide, keyed by the id the
// loader takes from its heading. English reads both off the section itself, so this map
// cannot drift from the file the pages are rendered from. Every section opens with a
// sentence that says what the reader can do after it; the loader takes that sentence as the
// description. The entries here replace the ones the loader had to cut short (a page
// description is plain text, so they carry no markdown code marks, the way describe() in
// src/lib/authoring.ts strips them from a derived one).
const written: Record<string, string> = {
  'your-first-shader': `After this page you have a two-entry shader module written in TypeScript, emitted as WGSL and as ${glsl}, and you know which call produced each string.`,
  'functions-and-entry-points':
    'After this page you can declare a helper, call it from another function, write an entry point for any stage, and collect them in the module that carries them.',
  'emitting-and-reflection':
    'After this page you can turn a module into WGSL, into both GLSL stages or into a fragment a host composes, and read the pipeline metadata a host binds from.',
  diagnostics:
    'After this page you can read a coded error, branch on its code, get every failure in a module in one report, and print the TypeScript line an error came from.',
  'conditional-programs':
    'After this page you can decide which of several programs to build from one source, tell when a variant is one constant instead, and hand the choice to the host.',
  'capabilities-extensions':
    'After this page you can declare the GPU features a module needs, read what each costs on each target, and check a booted device against them before it emits.',
  'glsl-float-precision':
    'After this page you know when to emit a GLSL stage at mediump, what that one option changes in the emitted source, and what it leaves alone.',
  'migrating-a-glsl-shader':
    'After this page you can take a GLSL shader construct by construct, find the "use typeshade" spelling of each, and see what it emits as WGSL and GLSL.',
};
const sections: Record<string, { title: string; description: string }> = Object.fromEntries(
  guideSections
    .filter((s) => s.id !== 'overview')
    .map((s) => {
      const description = written[s.id] ?? s.description;
      if (!description)
        throw new Error(
          `[guide] section '${s.id}' has no prose to describe it; write one in src/i18n/en.ts`,
        );
      return [s.id, { title: s.title, description }];
    }),
);

// The reference's categories, named and described where the entries are read, so the index
// pages cannot drift from the categories the entries sit in. Korean writes its own.
const apiCategories: Record<string, { name: string; summary: string }> = Object.fromEntries(
  API_CATEGORIES.map((c) => [c.slug, { name: c.name, summary: c.summary }]),
);

// Two lists of copy carry a link as a key of src/lib/links.ts, so the locale prefix and the
// pinned commit stay in one place. The two functions are identities: the parameter types the
// list where it is written, so a key no record has is a type error here, before the page
// that renders it is built. ko.ts is typed against the same shapes.
interface NextLink {
  readonly linkKey: LinkKey;
  readonly label: string;
}
interface PathStep extends NextLink {
  readonly title: string;
  readonly text: string;
}
const nextLinks = (items: readonly NextLink[]): readonly NextLink[] => items;
const pathSteps = (items: readonly PathStep[]): readonly PathStep[] => items;

export const en = {
  lang: 'en',
  /** How this locale names itself, shown in the language switch of other locales. */
  name: 'English',
  skip: 'Skip to content',
  // The notice over every page (src/components/SiteNotice.astro). Its text is a row in D1,
  // written in each language there; the dictionary holds the button that hides it.
  notice: {
    label: 'Notice',
    dismiss: 'Dismiss notice',
  },

  meta: {
    title: 'TypeShade: typed shaders in TypeScript for WebGPU and WebGL2',
    description: `Start a file with "use typeshade" and emit WGSL for WebGPU and ${glsl} for WebGL2. The same source runs on the CPU in f64, so its output can be checked.`,
    ogAlt: 'TypeShade: one shader source for WebGPU and WebGL2, with a rendered metaballs shader.',
  },

  nav: {
    /** The accessible name of the header's own navigation, which a screen reader reads out. */
    primary: 'Primary',
    guide: 'Guide',
    api: 'API',
    examples: 'Examples',
    github: 'GitHub',
    llms: 'llms.txt',
    languages: 'Languages',
    theme: 'Toggle dark mode',
    menu: 'Menu',
    search: 'Search',
    close: 'Close',
    /** Astro's dev server has no index; only a build writes dist/pagefind/. */
    searchUnavailable: 'Search is available on the built site',
    /** Pagefind's own UI strings. [SEARCH_TERM] and [COUNT] are its placeholders. */
    searchUi: {
      placeholder: 'Search',
      clear_search: 'Clear',
      load_more: 'Load more results',
      search_label: 'Search this site',
      filters_label: 'Filters',
      zero_results: 'No results for [SEARCH_TERM]',
      many_results: '[COUNT] results for [SEARCH_TERM]',
      one_result: '[COUNT] result for [SEARCH_TERM]',
      alt_search: 'No results for [SEARCH_TERM]. Showing results for [DIFFERENT_TERM]',
      search_suggestion: 'No results for [SEARCH_TERM]. Try one of these searches:',
      searching: 'Searching for [SEARCH_TERM]',
    },
    version: 'Version',
    prerelease: `Pre-release; ${facts.nextVersion} is next`,
    releases: 'Releases',
    commit: 'Pinned commit',
    changelog: 'Changelog',
  },
  docs: {
    navigation: {
      location: 'Current location',
      related: 'Related functions',
      browse: 'All documentation',
      overview: 'Overview',
    },
    labels: {
      nav: {
        docs: 'Docs',
        playground: 'Playground',
        language: 'Language',
        reference: 'Reference',
        examples: 'Examples',
      },
      languageGuide: 'Language guide',
      languageReference: 'Language reference',
      internals: 'Compiler internals',
      concepts: 'TypeScript & WebGPU',
      languageService: 'Language service',
      playground: 'Playground',
      editor: 'Editor support',
      /** The sidebar's own group headings (src/lib/links.ts sidebar()). */
      sidebarGroups: {
        getStarted: 'Getting Started',
        language: 'Language',
        concepts: 'Concepts',
        examples: 'Examples',
        reference: 'Reference',
        project: 'Project',
      },
      conceptPages: {
        glslPrecision: 'GLSL precision',
        cpuAndGpu: 'CPU and GPU',
        pipeline: 'The shader pipeline',
        webgpuAndWebgl2: 'WebGPU and WebGL2',
        wgslAndGlsl: 'WGSL and GLSL',
      },
      topics: {
        stringKeys: 'String keys and Record',
        types: 'Types',
        functions: 'Functions',
        controlFlow: 'Control flow',
        gpuTypes: 'GPU types',
        resources: 'Resources',
        stages: 'Shader stages',
        algorithms: 'Algorithms',
        random: 'Random numbers',
      },
      /** The four construct-mapping pages, after the topics in the Language group. */
      mapping: {
        fromTypescript: 'From TypeScript',
        fromWgsl: 'From WGSL',
        fromGlsl: 'From GLSL',
        builtins: 'Builtin functions',
      },
      /** The sections of the three mapping sets, one page each. The sidebar opens a set's
       *  sections under its index while the reader is inside it, so these are the short
       *  names a 240px row holds; the page's own h1 is the longer heading. */
      mappingSections: {
        fromTypescript: {
          declarations: 'Declarations',
          functions: 'Functions',
          classes: 'Classes',
          controlFlow: 'Control flow',
          expressions: 'Expressions',
          double: 'Emulated double',
        },
        fromWgsl: {
          types: 'Types',
          resources: 'Resources',
          entries: 'Entry points',
          statements: 'Statements',
        },
        fromGlsl: {
          types: 'Types',
          uniforms: 'Uniforms',
          variables: 'Builtin variables',
          functions: 'Functions',
        },
      },
    },
    introduction: 'Introduction',
    authoring: 'Authoring',
    project: 'Project',
    why: 'Why TypeShade',
    quickStart: 'Quick Start',
    authoringGuide: 'Language guide',
    checks: 'Verification',
    examples: 'Examples',
    onThisPage: 'On this page',
    previous: 'Previous',
    next: 'Next',
    editPage: 'Edit this page',
    reportIssue: 'Report a problem',
    permalink: 'Link to heading',
    // The API reference: the words around a generated ApiEntry (src/lib/api-types.ts).
    api: {
      // Lengthened past the review's 45-character floor for a reference title (the SEO
      // review, onpage, title length); the description below is unaffected.
      title: 'TypeShade compiler API reference for host applications',
      description:
        'Every public export of the TypeShade compiler on its own page: syntax, parameters, return value, examples and which targets support it.',
      h1: 'Compiler API reference',
      intro: `Every export of the typeshade package, generated from the compiler at commit ${facts.pinnedCommit}. One page per function, type, interface and class.`,
      audience:
        'This is the surface a host application and the [`fn()`](apiFn) builder call. A shader author writes the [language reference](reference) instead.',
      reference: 'Reference',
      breadcrumbs: 'Breadcrumbs',
      // The title names the export, its kind and its category, and grows a suffix only as
      // far as it fits under the 60-character limit check-seo.mjs enforces (the SEO review,
      // onpage, title length). 'clamp(): function in Builtins, TypeShade API reference'. A
      // short base (a short name in a short category) tried the two shortest suffixes first
      // and landed under the review's 45-character floor, so the longest suffix now leads.
      pageTitle: (heading: string, kind: string, category: string) => {
        const base = `${heading}: ${kind.toLowerCase()} in ${category}`;
        const suffixes = [
          ', TypeShade API reference for developers',
          ', TypeShade API reference',
          ', TypeShade API',
          ', TypeShade',
        ];
        const fitting = suffixes.find((suffix) => (base + suffix).length <= 60);
        return fitting ? base + fitting : base;
      },
      // An IR builder for a builtin of the language (Builtins and Values, imported from
      // typeshade/core/ir alone) is named as one, so its page and the builtin's page in the
      // language reference do not read as the same answer.
      builderTitle: (heading: string) => {
        const suffixes = [
          ': IR builder function in typeshade/core/ir, TypeShade',
          ': IR builder function in typeshade/core/ir',
          ': IR builder in typeshade/core/ir',
        ];
        return (
          heading +
          (suffixes.find((suffix) => (heading + suffix).length <= 60) ??
            suffixes[suffixes.length - 1]!)
        );
      },
      builderDescription: (name: string, summary: string) =>
        `${name}, an IR builder function in typeshade/core/ir. ${summary}`,
      categoryTitle: (name: string) => `${name}, a category in the TypeShade API reference`,
      categoryDescription: (name: string, summary: string) =>
        `${name} in the TypeShade API reference. ${summary}`,
      pageDescription: (name: string, kind: string, category: string, summary: string) => {
        // 'interface' is the one kind that starts with a vowel, so the article follows the word.
        const k = kind.toLowerCase();
        return `${name}, ${/^[aeiou]/.test(k) ? 'an' : 'a'} ${k} in ${category}. ${summary}`;
      },
      kindLine: (kind: string, category: string) => `${kind} in ${category}`,
      note: `The signature, the description and the examples come from the compiler's own source at commit ${facts.pinnedCommit}.`,
      // The note over a page whose JSDoc text is translated (content/api/<locale>/), which only a
      // translated locale shows; English keeps it so every dictionary has the same keys.
      translatedNote: `The description is translated from the JSDoc in the compiler's own source at commit ${facts.pinnedCommit}; the signature and the example code are as the source has them.`,
      syntax: 'Syntax',
      parameters: 'Parameters',
      returnValue: 'Return value',
      exceptions: 'Exceptions',
      descriptionHeading: 'Description',
      examples: 'Examples',
      example: 'Example',
      targets: 'Targets',
      target: 'Target',
      supportHeading: 'Support',
      notes: 'Notes',
      constructor: 'Constructor',
      instanceProperties: 'Instance properties',
      instanceMethods: 'Instance methods',
      inGuide: 'In the guide',
      seeAlso: 'See also',
      // Under the import line of a builtin's IR builder, before a link to the builtin itself.
      languageNote:
        'This export returns an IR node. A `"use typeshade"` file calls the builtin itself:',
      source: 'Source',
      optional: 'optional',
      readonly: 'read only',
      deprecated: 'deprecated',
      previewNote:
        'Template preview. The words on this page are a fixture; the compiler supplies the real ones.',
      line: (n: number) => `line ${n}`,
      atCommit: (sha: string) => `at commit ${sha}`,
      members: (n: number) => `${n} members`,
      kindMeta: 'Kind',
      kinds: {
        function: 'Function',
        constant: 'Constant',
        interface: 'Interface',
        type: 'Type',
        class: 'Class',
      },
      targetNames: { wgsl: 'WGSL (WebGPU)', glsl: `${glsl} (WebGL2)`, cpu: 'CPU oracle' },
      support: {
        native: 'Supported',
        emulated: 'Emulated',
        stub: 'Stub',
        none: 'Not supported',
        'n/a': 'Does not apply',
      },
      categories: apiCategories,
    },
    // The language reference at /reference/: the words around the entries generated from the
    // compiler's own language service (src/lib/language-reference.ts). The signature and the
    // sentence under every name are the compiler's, in English on every locale, the way the
    // API reference already carries its JSDoc.
    reference: {
      discovery: {
        title: (name: string, related: string[], dualTarget: boolean) => {
          const shown = related.length ? `${name} / ${related[0]}` : name;
          const suffixes = dualTarget
            ? [
                ': WGSL and GLSL examples, uses and input limits',
                ': WGSL and GLSL function guide',
                ': shader function examples and input limits',
                ': shader function guide',
              ]
            : [
                ': shader function examples, uses and input limits',
                ': shader function examples and input limits',
                ': shader function guide',
              ];
          suffixes.push(
            ': GPU shader function reference and examples',
            ': GPU shader function examples',
            ': shader function reference',
          );
          return [shown, name]
            .flatMap((label) => suffixes.map((suffix) => label + suffix))
            .find((title) => title.length >= 45 && title.length <= 60);
        },
        label: 'Related names in other languages',
        canonical: 'Explanation and examples',
        note: 'These related operations can differ in arguments, support, and semantics. The foreign names are not accepted TypeShade aliases. Check the target forms and restrictions.',
      },
      worked: {
        lessons: operationLessons,
        constructor: constructorLesson,
        heading: 'Compare examples',
        modelNote:
          'The examples are calculation models and do not run GPU work. The reference below gives the complete call signatures.',
        example: (index: number) => `Example ${index}`,
        setup: 'Model assumptions',
        input: 'Model input',
        output: 'Result',
        returned: 'Returned value',
        before: 'Stored value before',
        after: 'Stored value after',
        binary: 'Word in binary',
        diagram: 'Components in this example',
        textureDiagram:
          'Texel grid. The upper row has the higher vertical texture coordinate. Values describe one channel; comparison grids show pass or fail.',
        matrixDiagram: 'Matrix displayed by rows. Constructor arguments run down each column.',
        derivativeDiagram:
          'Field values at neighbouring pixels. The lower row adds a vertical pixel step.',
        calculationNote:
          'Decimal results are rounded for display. The stated assumptions determine each example; actual shader results follow the target precision and execution rules.',
      },
      demo: {
        heading: 'Explore the function',
        exercises: 'Explore the result:',
        useHeading: 'When to use it',
        cautionHeading: 'Inputs and limits',
        interaction2d: 'Wheel to zoom; drag to pan. Keyboard: arrows, +/-, Home to reset.',
        view3d: '3D view',
        interaction:
          'Wheel to zoom; drag to pan, or rotate in 3D. Keyboard: arrows, +/-, Home to reset.',
        probe: 'Input x',
        parameter: 'Parameter k',
        angleInput: 'Angle x (radians)',
        degreeInput: 'Angle x (degrees)',
        related: 'Related functions',
        calculation: 'Example calculation',
        calculationNote:
          'The reference result is rounded for readability. Shader output follows the precision rules of its target.',
        parameters: {
          mod: 'Divisor k',
          min: 'Other input k',
          max: 'Other input k',
          step: 'Edge k',
          clamp: 'Bound magnitude k',
          mix: 'End value k',
          smoothstep: 'Upper edge k',
          fma: 'Multiplier k',
          ldexp: 'Binary exponent k',
          hypot: 'Vertical component k',
          length: 'Vertical component k',
          distance: 'Other point height k',
          dot: 'Horizontal weight k',
        },
        condition: 'Conditions in this example',
        aria: (name: string) =>
          `${name} graph. A curve shows the output and a highlighted point follows the selected input.`,
        caption: 'The blue curve shows the output. The orange point marks the selected input.',
        window:
          'The axis labels show the displayed range. Values outside this window are not drawn.',
        sources:
          'For shader input rules and precision, consult [WGSL](specWgsl) and [GLSL ES 3.00](specGlslEs).',
        lessons: functionLessons,
      },
      title: 'TypeShade language reference for shader authors',
      description: `Every name a \`"use typeshade"\` file can write, ${facts.languageEntries} of them: types, attributes, builtin values, functions, constants and \`Math\` members.`,
      h1: 'Language reference',
      intro: `The language a file that starts with \`"use typeshade"\` is written in. ${facts.languageEntries} names, read from the compiler's own language service at commit ${facts.pinnedCommit}, which is the table the editor answers a hover from.`,
      audience:
        'This is the reference for shader authors. The surface a host application and the [`fn()`](apiFn) builder call is the [compiler API reference](api).',
      reference: 'Reference',
      breadcrumbs: 'Breadcrumbs',
      note: `The signature, the sentence and any message are the compiler's own text at commit ${facts.pinnedCommit}.`,
      readingH: 'Reading an entry',
      numberP:
        'A `number` in a parameter or a return position is the scalar slot. The ambient file declares a GPU scalar as a branded number whose brand is optional, so a literal and any branded scalar both fill it.',
      widthP:
        "A declaration you write still needs a width, and a bare `number` on a field or a parameter is refused; [the TypeScript constructs page](languageFromTypescript) carries that row with the compiler's own message.",
      positionsP:
        'A parameter named by position (`a0`, `a1`) carries a name the ambient file generates. A call passes its arguments in order and names none of them.',
      helpersP:
        'A signature may name a type the ambient file declares for its own use. These are those declarations.',
      swizzlesP: (n: number) =>
        `The \`…\` line stands for ${n} more members, the swizzles. A swizzle reads two to four components as a new vector of the same element type. The components come in any order and may repeat, and their letters come from one set, \`xyzw\` or \`rgba\`.`,
      readingP: `An entry holds the declaration the editor loads for that name, the compiler's sentence about it, and for a builtin function the WGSL and the ${glsl} text each backend writes. The [builtin table](languageBuiltins) is the scanning view over the same calls, four columns wide.`,
      sourceP:
        'Every entry on these pages is read from the compiler at the pinned commit, and none of it is typed here.',
      entries: (n: number) => `${n} names`,
      signature: 'Signature',
      emits: 'Emits',
      wgsl: 'WGSL',
      glsl,
      noForm: 'No form on this target.',
      preEmit: 'Rewritten into a pair of `f32` lanes before either backend runs.',
      // Under Targets, for a builtin whose form depends on the texture it reads.
      formsP: `An author writes the same call on every texture, and the compiler writes what each target needs. ${glsl}'s \`texelFetch\` takes a signed coordinate, carries an array layer inside it and has no 1d or multisampled texture.`,
      formsColumns: ['Texture', 'You write', 'WGSL', glsl],
      inTable: 'Builtin table',
      // The See also row to the compiler's IR builder of the same name (docs.api.languageNote).
      irBuilderLink: (name: string) => `\`${name}()\` in \`typeshade/core/ir\``,
      validIn: 'Valid in',
      anyStage: 'The compiler holds this id to no stage of the pipeline.',
      stageRule: (stage: string, direction: string) => `${stage} ${direction}`,
      stages: { vertex: 'vertex', fragment: 'fragment', compute: 'compute' },
      directions: { input: 'input', output: 'output' },
      // The title of a kind page, with the longest suffix that stays inside the 60 characters
      // check-seo.mjs allows; the shortest name plus the shortest suffix stays over its
      // 45-character floor.
      kindTitle: (name: string) => {
        const suffixes = [
          ', the TypeShade language reference for shaders',
          ', the TypeShade language reference',
          ', TypeShade language reference',
          ', TypeShade',
        ];
        return name + (suffixes.find((suffix) => (name + suffix).length <= 60) ?? '');
      },
      // One documented name on a page of its own, at /reference/<kind>/<name>/. The page
      // keeps MDN's order, the order /api/ already keeps: Syntax, Parameters, Return value,
      // Description, Targets, Examples, See also, and leaves out a section the compiler
      // supplies nothing for.
      entry: {
        // The title carries the name and what kind of name it is, and takes the longest
        // suffix that stays inside the 60 characters check-seo.mjs allows. Measured over
        // every name in the reference, the shortest of them `E` and the longest
        // `textureSampleCompareLevel`: the titles run from 45 to 60 characters.
        // A builtin function with a form on both targets names both targets and TypeShade as the
        // three languages it is written in: the searches that reach these pages are "glsl pow"
        // and "glsl atan2", so the title carries the target words.
        title: (name: string, kind: string, targets = false) => {
          const suffixes = [
            ...(targets
              ? [
                  ` in WGSL, GLSL and TypeShade: shader ${kind} reference`,
                  ` in WGSL, GLSL and TypeShade: ${kind} reference`,
                  ` in WGSL, GLSL and TypeShade: reference`,
                  ` in WGSL, GLSL and TypeShade`,
                ]
              : []),
            `: ${kind} in the TypeShade language reference`,
            `: ${kind}, TypeShade language reference`,
            `: ${kind}, TypeShade reference`,
          ];
          return (
            name +
            (suffixes.find((suffix) => (name + suffix).length <= 60) ??
              suffixes[suffixes.length - 1]!)
          );
        },
        // 'attribute' is the one kind that starts with a vowel, so the article follows the word.
        description: (name: string, kind: string, summary: string) =>
          `${name}, ${/^[aeiou]/i.test(kind) ? 'an' : 'a'} ${kind} in the TypeShade language reference. ${summary}`,
        // With both targets' forms, the description opens with them, as a search result shows it,
        // and the compiler's sentence follows (src/lib/meta-description.ts, fitLeadAndTail).
        targetsLead: (name: string, targets: { readonly wgsl: string; readonly glsl: string }) =>
          targets.wgsl === targets.glsl
            ? `${name} in TypeShade compiles to ${targets.wgsl} in both WGSL and ${glsl}.`
            : `${name} in TypeShade compiles to ${targets.wgsl} in WGSL and ${targets.glsl} in ${glsl}.`,
        // The same for a scalar, vector or matrix type: what each target writes for it.
        typeLead: (name: string, targets: { readonly wgsl: string; readonly glsl: string }) =>
          targets.wgsl === targets.glsl
            ? `${name} is ${targets.wgsl} in both WGSL and ${glsl}.`
            : `${name} is ${targets.wgsl} in WGSL and ${targets.glsl} in ${glsl}.`,
        kindNames: {
          type: 'Type',
          attribute: 'Attribute',
          builtin: 'Builtin value',
          function: 'Function',
          constant: 'Constant',
          math: 'Math member',
        },
        kindWords: {
          type: 'type',
          attribute: 'attribute',
          builtin: 'builtin value',
          function: 'function',
          constant: 'constant',
          math: 'Math member',
        },
        kindMeta: 'Kind',
        syntax: 'Syntax',
        parameters: 'Parameters',
        returnValue: 'Return value',
        descriptionHeading: 'Description',
        targets: 'Targets',
        examples: 'Examples',
        seeAlso: 'See also',
        optional: 'optional',
        // A decorator, under its Parameters heading. `@vertex` is written on its own, and
        // `@compute` has that form beside the one that takes a workgroup size, so the two
        // lines are apart. The third names the values the declaration carries for the
        // TypeScript decorator runtime, which a call never writes.
        decoratorNone: 'This decorator is written on its own and takes no arguments.',
        decoratorBareToo: 'It is also written on its own, with no arguments.',
        decoratorProtocol:
          'The declaration also names what the TypeScript decorator runtime hands a decorator, `target` and `context`. A call passes neither.',
        // What the CPU oracle does with the name, from the two tables it keeps its own
        // builtins and its GPU stubs in. The wording is the one the API reference's Targets
        // table already gives the same two cases.
        oracleEvaluates: 'Evaluated in f64 by the CPU oracle.',
        oracleStub:
          'The CPU oracle has no texture memory and no neighbouring fragments. The call throws unless the module was compiled with `{ gpuStubs: true }`, which returns a placeholder.',
        // Over a section of a reference note that a page in another language shows in English,
        // because its translation is missing or was made from an older English.
        noteUntranslated: 'This section is in English: its translation is missing or out of date.',
      },
      kinds: {
        type: {
          name: 'Types',
          summary: 'The scalar, vector, matrix and memory types a declaration names.',
          description: `The ${facts.languageTypes} types a \`"use typeshade"\` file declares a value with: the scalars, the vectors, every matrix, the textures and samplers, and the memory the GPU holds.`,
        },
        attribute: {
          name: 'Attributes',
          summary: 'The decorators that mark an entry point and bind a field to the pipeline.',
          description: `The ${facts.languageAttributes} decorators the compiler reads: they mark an entry, set a workgroup size, bind a field, qualify a varying or an output, or set how a check is reported.`,
        },
        builtin: {
          name: 'Builtin values',
          summary: 'The `@builtin(...)` ids the pipeline supplies, with the stage each belongs to.',
          description: `The ${facts.languageBuiltinValues} \`@builtin(...)\` ids the pipeline hands a shader or takes back from it, each with the type WGSL fixes for it and the stage it belongs to.`,
        },
        function: {
          name: 'Functions',
          summary: 'The functions a shader calls, by family, with the text each backend writes.',
          description: `The ${facts.languageFunctions} functions a shader calls, by family, each with its signature and with the WGSL and ${glsl} text the compiler writes for it.`,
        },
        constant: {
          name: 'Constants',
          summary: 'The compile-time literals the compiler inlines, and `discard`.',
          description: `The ${facts.languageConstants} names a shader reads without declaring them: the maths literals the compiler inlines at compile time, and the fragment \`discard\`.`,
        },
        math: {
          name: 'Math members',
          summary: 'The `Math` members a shader may reach, each routed to a builtin or a literal.',
          description: `The ${facts.languageMathMembers} \`Math\` members a shader may reach. Each one routes to a builtin call or to an inlined literal, so a familiar name compiles to the target's own.`,
        },
      },
      families: {
        maths: 'Maths',
        geometry: 'Geometry',
        derivatives: 'Derivatives',
        bits: 'Bit operations',
        packing: 'Packing',
        casts: 'Casts',
        textures: 'Textures and storage',
        atomics: 'Atomics',
        barriers: 'Barriers',
        f64: 'Emulated double',
        constructors: 'Constructors',
        resources: 'Arrays and bindings',
      },
    },
    // The error codes at /reference/errors/: one page per code in the compiler's two
    // registries (src/lib/error-codes.ts). The registry text and every compiler message stay
    // the compiler's own English in every language; these are the words around them.
    errors: {
      title: 'TypeShade error codes: every compiler diagnostic, by code',
      description: `The ${facts.errorCodesTs} front-end codes and ${facts.errorCodesSd} core codes the TypeShade compiler reports, each with its meaning and, where a program can raise it, that program fixed.`,
      summary: 'The code on a diagnostic, what it means and how to fix it.',
      h1: 'Error codes',
      intro: `Every code the compiler puts on a diagnostic, read from its two registries at commit ${facts.pinnedCommit}. The \`"use typeshade"\` front end has ${facts.errorCodesTs} codes and the core IR layer under it has ${facts.errorCodesSd}.`,
      verified: (n: number) =>
        `${n} pages carry a program that raises the code and the same program fixed. Both are compiled at build time against the pinned compiler, and the build stops when a program no longer raises its code or a fix no longer compiles clean. A row with an Example tag is one of them.`,
      note: "The registry text and every compiler message on these pages are the compiler's own English.",
      codes: (n: number) => `${n} codes`,
      frontEndH: 'Front-end codes',
      frontEndP:
        'The `TS80xx` codes, from `TS_CODES` in the front end. A `"use typeshade"` file is checked against these before any IR is built.',
      coreH: 'Core codes',
      coreP:
        'The `SDxxxx` codes, from the `CODES` catalogue in `typeshade/dev`. The core IR layer raises them under the [`fn()`](apiFn) builder and under a `"use typeshade"` file alike, and the front end refuses many of the same mistakes first under a code of its own.',
      numberingH: 'Numbering',
      numberingP: "The front end's registry explains its numbers in its own header:",
      exampleTag: 'Example',
      groups: {
        file: 'The file',
        types: 'Types and names',
        functions: 'Functions and classes',
        controlFlow: 'Control flow',
        entries: 'Entry points and IO',
        resources: 'Resources and memory',
        f64: 'Emulated double',
        targets: 'Targets',
        builder: 'Builder calls',
        lint: 'Lint rules',
        portable: 'Portable kernels',
        retired: 'Retired numbers',
        other: 'Other codes',
      },
      // One code on a page of its own, at /reference/errors/<code>/. The page keeps MDN's
      // order for an error: the code and what it means, when it fires, an example, how to
      // fix it and see also, then the source lines, and leaves out a section with nothing
      // true to put in it.
      entry: {
        // The first candidate that lands inside the 45 to 60 characters check-seo.mjs allows.
        // An SD code carries its summary, a TS code its constant, and a retired number only
        // itself. Measured over every code at the pin, the titles run from 45 to 60.
        title: (head: string, summary: string) => {
          const candidates = [
            ...(summary
              ? [
                  `${head}: ${summary}, a TypeShade error code`,
                  `${head}: ${summary} in TypeShade`,
                  `${head}: ${summary}`,
                ]
              : []),
            `${head}: an error code of the TypeShade compiler`,
            `${head}: a TypeShade compiler error code`,
            `${head}: TypeShade error code`,
          ];
          return (
            candidates.find((t) => t.length >= 45 && t.length <= 60) ??
            candidates[candidates.length - 1]!
          );
        },
        description: (head: string, line: string) =>
          `${head}, an error code of the TypeShade compiler. ${line}`,
        fill: 'Its page quotes the registry, shows where the compiler raises it and how to fix it.',
        kindTs: 'Front-end code',
        kindSd: 'Core code',
        kindRetired: 'Retired number',
        kindMeta: 'Kind',
        undocumented:
          'The registry has no documentation comment for this constant, so the line above is written by this site from the messages the compiler raises it with.',
        whenH: 'When it fires',
        exampleH: 'Example',
        fixH: 'How to fix it',
        frontEndH: 'In the front end',
        seeAlsoH: 'See also',
        sourceH: 'Source',
        // The design rules the code enforces (src/lib/design-rules.ts): a rule whose Enforced by
        // names the code, or a rule the code's registry text names.
        ruleH: (n: number): string =>
          n === 1 ? 'The rule this enforces' : 'The rules this enforces',
        compiled: 'Compiled at build time against the pinned compiler, this program gets:',
        backend:
          'Compiled at build time against the pinned compiler, this program gets a `TS8015` diagnostic, the front end reporting a backend that refused the module. The error the backend threw carries the code:',
        diagnose:
          '`compile()` does not run the lint rules. `diagnose()` from `typeshade/dev` does, on the module `compile()` returns, and reports:',
        deprecations:
          'Compiled with `{ deprecations: true }`, the option that turns this warning on.',
        consoleGpu:
          "Compiled with `{ console: 'gpu' }`, the option under which the WGSL records console calls.",
        hint: "The registry's hint:",
        fixed: 'The same program, corrected. It compiles with no diagnostic.',
        fixedDiagnose:
          'The same program, corrected. It compiles with no diagnostic, and `diagnose()` no longer reports the code.',
        otherFiles:
          'It imports from another file of the same program, which `compile()` reads through its `readDocument` option:',
        lineAt: (line: number) => `line ${line}`,
        retired:
          'This number is retired. No diagnostic carries it, and the registry never gives it to another rule.',
        frontEnd:
          'A `"use typeshade"` file never reaches this check with the same mistake: the front end refuses it first, under its own code. This program, compiled at build time, gets:',
        builder:
          'No `"use typeshade"` program on this site raises this code, so the page has no example. The [`fn()`](apiFn) builder builds the IR directly and reaches the check at the lines under Source.',
        internal:
          'The registry calls this an internal invariant: it means the compiler itself went wrong, and no program is meant to raise it.',
        unwritten: 'No example is written for this code at this commit yet.',
        sourceP: (commit: string) =>
          `Where the compiler raises this code at commit ${commit}, one line per file:`,
        sites: (n: number) => (n === 1 ? 'one site' : `${n} sites`),
        noSites: 'The compiler source names this code nowhere outside its registry.',
        index: 'Error codes',
        builderPage: 'The `fn()` builder',
      },
      // The line a front-end code leads with where its constant has no JSDoc. When the
      // registry documents one of these, the build stops and asks for its line to go.
      lines: {
        MISSING_DIRECTIVE:
          'A file compiled as TypeShade that has no `"use typeshade"` directive at all.',
        TYPE_MISMATCH:
          'Two types that do not fit where they meet (an operator, a condition, a declaration, a return or an argument), or a constant the compiler folds that WGSL refuses: a shift amount past 31, a divisor of 0, clamp bounds that cross, an f32 past its range or a builtin call outside its domain, such as `pow(-2., 2.)`.',
        UNKNOWN_FN: 'A call to a function the file neither declares nor imports.',
        CONST_ASSIGN:
          'An assignment to a name that cannot change, such as a `const` or a read-only resource.',
        LOOP_BOUND:
          'A counted `for` loop whose exit the compiler cannot prove: the counter is not compared to a bound, or the body writes the bound.',
        LOOP_INFINITE:
          'A loop that certainly never ends: a `while` whose condition is `true`, written or folded from constants, with no `break` or `return`, or a step that moves the counter away from its bound.',
        LOOP_INDUCTION:
          'A `for` loop whose counter is not one `let` of type `i32` or `u32`, or whose update is not a constant step.',
        BREAK_OUTSIDE: 'A `break` with no loop or `switch` around it.',
        TOP_LEVEL:
          'Something at the top level of the file the compiler cannot declare: a bare statement, or a module-level declaration of a shape it refuses.',
        BACKEND:
          "A backend that refused to emit a module the front end accepted. The message is the backend's own.",
        INDEX_OOB: 'A constant index outside the length of what it indexes.',
      },
    },
    // The design rules at /reference/rules/: one page per rule of the compiler's design
    // document, read from its traceability tree (src/lib/design-rules.ts). The rule text and
    // the parts under it stay the compiler's own English in every language; these are the
    // words around them.
    rules: {
      title: "TypeShade design rules: the language's rules, by chapter",
      description: `The ${facts.rules} rules the TypeShade language is designed by, each with its rationale, what it derives from, how it is verified and the error codes that enforce it.`,
      summary: 'What the language may contain and how it may change, one rule per page.',
      h1: 'Design rules',
      intro: `Every rule of the compiler's design document, \`docs/language-design.md\`, read from its traceability tree at commit ${facts.pinnedCommit}. A rule constrains an author writing a \`"use typeshade"\` file or the compiler itself. Each one states one requirement, why it holds, what it derives from, and where the compiler enforces it.`,
      verifiedP: 'How each rule is verified, as the traceability tree records it:',
      note: "The rule text and the parts under it are the compiler's own English, as the design document writes them.",
      rulesCount: (n: number) => `${n} rules`,
      // The badge a row and a page carry, one per value of `verification` in the item.
      kinds: {
        test: 'Test',
        code: 'Code only',
        pending: 'Not enforced',
        review: 'Review',
      },
      // What each value means, the way reqs/README.md in the compiler defines it.
      kindCounts: {
        test: `${facts.rulesTest} rules: a test, a gate script or a CI workflow names the rule.`,
        code: `${facts.rulesCode} rules: only the implementation carries the rule, and no test checks it yet.`,
        pending: `${facts.rulesPending} rules: listed as not yet enforced, in Appendix B of the design document.`,
        review: `${facts.rulesReview} rules: held by review, and no file checks them.`,
      },
      // The chapters of the design document, as its headings name them. The build holds this
      // list to the headings at the pin, so a renamed chapter stops it here.
      chapters: {
        1: 'Introduction',
        2: 'Sources of the surface',
        3: 'Textual structure and names',
        4: 'Types',
        5: 'Literals and typing',
        6: 'Declarations and resources',
        7: 'Expressions and statements',
        8: 'Functions and entry points',
        9: 'Built-in functions and the TypeShade extensions',
        10: 'Extensions and capabilities',
        11: 'Targets and the oracle',
        12: 'Diagnostics',
        13: 'Change control',
      } as Record<number, string>,
      chapterH: (n: number, title: string) => `${n}. ${title}`,
      guaranteesP:
        '[What is guaranteed](rulesGuarantees) lists the rules of each kind, with the files that verify each one.',
      // The note a guide page shows beside a rule it names that nothing checks yet, by the
      // rule's `verification` at the pin. A rule a test or review holds gets none.
      flags: {
        pending: 'not yet enforced by the compiler',
        code: 'no test checks this yet',
      },
      // What moved in the rules since the pin before this one, on the index
      // (src/lib/rule-history.ts). The compiler has no release yet, so a version of the language
      // here is a commit the site pinned.
      changes: {
        h: 'Changes since the previous pin',
        first: (current: string) =>
          `The site records no pin before ${current}, so there is nothing to compare its rules with.`,
        predates: (previous: string, date: string, current: string) =>
          `The previous pin, ${previous} (${date}), predates the compiler's traceability tree, which this pin, ${current}, is the first to carry. There is nothing to compare the rules with yet. From the next pin on, this section lists the rules added, removed or changed since the one before.`,
        none: (previous: string, current: string) =>
          `No rule was added, removed or changed between the previous pin, ${previous}, and this one, ${current}.`,
        lead: (previous: string, date: string, current: string) =>
          `Between the previous pin, ${previous} (${date}), and this one, ${current}, as the compiler's traceability tree records them. A rule changed when its fingerprint moved, which happens when its text or the files that verify it change.`,
        counts: `${facts.rulesAdded} added, ${facts.rulesRemoved} removed, ${facts.rulesChanged} changed.`,
        addedH: 'Added',
        removedH: 'Removed',
        changedH: 'Changed',
        was: (kind: string) => `verified as ${kind} before`,
        commits: 'compiler commits',
        removedItem: 'its item at the previous pin',
      },
      // The rules grouped by how each is verified, at /reference/rules/guarantees/.
      guarantees: {
        title: 'What TypeShade guarantees: its design rules, by verification',
        description: `How each of the ${facts.rules} TypeShade design rules is held: ${facts.rulesTest} checked by a test, ${facts.rulesCode} by the implementation alone, ${facts.rulesPending} not yet enforced and ${facts.rulesReview} by review, with the files that verify each.`,
        h1: 'What is guaranteed',
        lead: `The compiler's traceability tree records how each design rule is held at commit ${facts.pinnedCommit}: a test checks it, only the code that carries it out names it, nothing checks it yet, or review holds it. Below, the ${facts.rules} rules under those four headings, each with its first sentence and the files that verify it at the pin.`,
        heads: {
          test: 'Checked by a test',
          code: 'Implementation only, no test yet',
          pending: 'Not yet enforced',
          review: 'Held by review',
        },
        // One sentence under each heading, led by the count.
        groups: {
          test: `${facts.rulesTest} rules. A test, a gate script or a CI workflow names each one, and the compiler's traceability check fails when a listed file stops naming its rule.`,
          code: `${facts.rulesCode} rules. The implementation names each one in an \`Implements:\` tag, and no test checks it yet: each is a gap for a test to close. A guide page that names one of these rules says so beside the name.`,
          pending: `${facts.rulesPending} rule. Appendix B of the design document lists it as not yet enforced, and no file checks it. A guide page that names it says so beside the name.`,
          review: `${facts.rulesReview} rules. Each one says review holds it, and no file checks it.`,
        },
        none: 'No rule is held this way at the pin.',
        filesLabel: {
          test: 'Verified by',
          code: 'Implemented in',
        },
      },
      // One rule on a page of its own, at /reference/rules/<n-m>/.
      entry: {
        // The first candidate that lands inside the 45 to 60 characters check-seo.mjs allows.
        title: (rule: string, chapter: string) => {
          const candidates = [
            `Rule ${rule}: ${chapter}, a TypeShade design rule`,
            `Rule ${rule}, ${chapter}: a TypeShade language design rule`,
            `Rule ${rule}: ${chapter} in the TypeShade language`,
            `Rule ${rule}: ${chapter} in TypeShade`,
            `Rule ${rule}: ${chapter}`,
            `Rule ${rule}: a design rule of the TypeShade shader language`,
          ];
          return (
            candidates.find((t) => t.length >= 45 && t.length <= 60) ??
            candidates[candidates.length - 1]!
          );
        },
        heading: (rule: string) => `Rule ${rule}`,
        description: (rule: string, chapter: string, line: string) =>
          `Rule ${rule} of the TypeShade language design, in ${chapter}. ${line}`,
        fill: 'Its page gives the rationale, the sources, and the files and error codes that hold it.',
        kindLine: (n: number, title: string) => `Chapter ${n}, ${title}`,
        kindMeta: 'Verification',
        rationaleH: 'Rationale',
        derivesH: 'Derives from',
        verifiedH: 'How it is verified',
        explainedH: 'Explained in',
        codesH: 'Error codes that enforce it',
        seeAlsoH: 'See also',
        sourceH: 'Source',
        // How it is verified, one sentence per value of `verification`.
        how: {
          test: 'Checked by a test. A test, a gate script or a CI workflow names this rule, and the traceability check fails when a file listed below stops naming it.',
          code: 'Only the implementation carries it; no test checks it yet. The file below names the rule in an `Implements:` tag.',
          pending:
            'Listed as not yet enforced. Appendix B of the design document records the rule, and no file checks it.',
          review: 'Held by review. No file checks it, and the rule names review as what holds it.',
        },
        enforcedP: 'Where the rule says the compiler enforces it:',
        filesP: (commit: string) =>
          `The files that verify it at commit ${commit}, each at the first line that names the rule:`,
        evidence: "checked by the compiler's own test",
        explainedP: (commit: string) =>
          `The sections of the surface document that explain this rule, at commit ${commit}:`,
        section: (n: number, title: string) => `§${n} ${title}`,
        codesP:
          'The diagnostic codes the rule names under Enforced by, or whose registry text names the rule:',
        sourceP: (commit: string) => `The rule at commit ${commit}:`,
        designDoc: 'the design document',
        item: 'its traceability item',
      },
    },
  },
  // The Playground at /playground/: the words around the Monaco editor and the WGSL the
  // compiler writes from what is typed into it. Monaco carries its own English inside the
  // editor box.
  playground: {
    // The page's <title> and meta description, so the Playground does not repeat the front
    // page's in search results.
    title: 'TypeShade Playground: compile a shader in your browser',
    description: `Write a "use typeshade" file in the browser, compile it to WGSL and ${glsl}, run it on WebGPU or WebGL2, and read the diagnostics and the reflection.`,
    h1: 'Playground',
    intro:
      'Write a TypeShade TypeScript file, compile it in your browser, and inspect the generated WGSL and diagnostics.',
    help: 'Author TypeShade in a Monaco editor and compile it here.',
    run: 'Compile',
    reset: 'Reset example',
    editor: 'TypeShade source',
    output: 'Compiler output',
    // The tabs over the result column: the canvas the module draws, one per file the
    // compiler emits, and the reflection. `reflection` below names the last one.
    resultTab: 'Result',
    // One tab per file the compiler emits: the WGSL module, and the two GLSL ES 3.00 stages.
    wgslTab: 'WGSL',
    glslVertexTab: 'GLSL vertex',
    glslFragmentTab: 'GLSL fragment',
    noGlsl: 'This module emits no GLSL.',
    diagnostics: 'Diagnostics',
    idle: 'Ready to compile',
    ready: 'Compiled successfully',
    errors: 'Compile errors',
    loading: 'Loading editor…',
    clean: 'No diagnostics.',
    noOutput: 'No WGSL output.',
    directive: 'A file compiles once it starts with the "use typeshade" directive.',
    unavailable: 'The editor did not load. Check the connection and reload the page.',
    starting: 'Starting the language service…',
    serviceFailed: 'The language service stopped. Reload the page.',
    sourceTypescript: 'TypeScript',
    sourceTypeshade: 'TypeShade',
    // The reflection pane: what reflect() recovers from the compiled module, and what each
    // entry point returns when the CPU oracle runs it.
    reflection: 'Reflection',
    entryPoints: 'Entry points',
    resources: 'Resources',
    inputs: 'In',
    outputs: 'Out',
    returns: 'Returns',
    runCpu: 'Run on the CPU',
    running: 'Running',
    cpuIdle: 'Run the entry points to see the values they return.',
    noResources: 'This module binds no resources.',
    noEntryPoints: 'This module declares no entry point.',
    requiredFeatures: 'Required features',
    args: 'Arguments',
    argsInvalid: 'That argument is not a number or a list of numbers.',
    cpuNoResources:
      'The CPU oracle takes entry arguments only, so an entry that reads a uniform or a storage binding cannot run here yet.',
    canvas: 'CPU canvas',
    // The Result tab draws on the backend the reader picks: the GPU in the runtime's own
    // order, WebGPU alone, WebGL2 alone, or the CPU oracle, which runs the fragment entry once
    // per pixel. The GPU runs the very program the WGSL and GLSL tabs hold, through the
    // runtime every figure on the site uses. `WebGPU` and `WebGL2` are the options' own names.
    engine: 'Draw with',
    engineGpu: 'GPU',
    engineCpu: 'CPU oracle',
    gpuIdle: 'Compile a module with a vertex entry and a fragment entry to see it drawn.',
    // Over the canvas until the program's first frame is up: what the page is doing meanwhile.
    wait: {
      loading: 'Loading the program…',
      compiling: 'Compiling…',
      drawing: 'Drawing the first frame…',
    },
    gpuWebgpu: 'Running on WebGPU.',
    gpuWebgl2: 'Running on WebGL2.',
    gpuNone:
      'This browser has no WebGPU and no WebGL2, so nothing drew. The CPU oracle still runs.',
    gpuNoWebgpu:
      'You picked WebGPU, and this browser has no WebGPU device, so nothing drew. GPU falls back to WebGL2.',
    gpuNoWebgl2: 'You picked WebGL2, and this browser has no WebGL2 context, so nothing drew.',
    gpuNoGlsl:
      'This module has no GLSL ES 3.00 form, so WebGL2 has nothing to run. WebGPU runs its WGSL.',
    gpuNoGlslFeatures:
      'GLSL ES 3.00 has no {features}, which this module needs, so WebGL2 has nothing to run. WebGPU runs its WGSL.',
    gpuNoFeature:
      'This GPU does not offer the WebGPU feature {features}, which this module needs, so nothing drew.',
    gpuFailed: '{backend} could not run this program: {reason}',
    gpuNeedsStages:
      'Drawing needs a vertex entry and a fragment entry. This module has no such pair.',
    gpuNeedsAttributes:
      'The canvas draws three vertices and binds no vertex buffer. This module reads {fields} from one, so the GPU cannot run it here.',
    gpuNeedsBindings:
      'The bindings panel has no value for {names}, so this module cannot run here.',
    computeNeedsWebgpu:
      'This Playground runs compute on WebGPU or the CPU oracle. The TypeShade program runtime also supports WebGL2 compute lowering.',
    computeRan:
      'Ran {entry} over {invocations} invocations on {backend} in {ms} ms. The canvas plots what it wrote.',
    // The Console tab: the lines a compute run's console calls delivered, from the CPU oracle's
    // sink or, on WebGPU, from the console buffer the compiler adds (surface §66). A module that
    // draws logs one clicked pixel at a time, or one whole frame: on WebGPU the frame is drawn
    // once more with the calls recorded, and WebGL2, which records nothing, leaves the pixel to
    // the CPU oracle.
    consoleTab: 'Console',
    consoleIdle:
      'Call `console.log` in a shader to see its lines here. A compute module logs every invocation. In a module that draws, click a pixel of the canvas, or record the whole frame on WebGPU.',
    consoleLines: '{lines} lines from {backend}, in the order the CPU runs the invocations.',
    consoleNone: 'The run on {backend} logged nothing.',
    consoleDropped: '{dropped} more lines did not fit the buffer.',
    consoleMore: '{more} more lines are not shown.',
    consoleIndex: '(index)',
    consoleValue: 'Value',
    consolePixelHint:
      'This module draws, and its fragment entry runs once for every pixel. Click a pixel of the canvas to see what it logs. On WebGPU, Record the frame lists the lines of every pixel, and the CPU oracle lists them once it has drawn.',
    consolePixel:
      'What pixel ({x}, {y}) logged. It ran on the CPU oracle with the inputs the canvas gives it.',
    consolePixelGl:
      'What pixel ({x}, {y}) logged. WebGL2 records no console call, so the pixel ran on the CPU oracle with the inputs the canvas gives it.',
    consolePixelGpu:
      'What pixel ({x}, {y}) logged on WebGPU. The frame on the canvas was drawn once more for this pixel alone, with its console calls recorded.',
    consolePixelGpuNone: 'Pixel ({x}, {y}) reached no console call that WebGPU records.',
    consolePixelGpuFailed:
      'WebGPU could not record pixel ({x}, {y}), so the pixel ran on the CPU oracle. WebGPU said: {reason}',
    consolePixelNone: 'Pixel ({x}, {y}) reached no console call.',
    consolePixelOutside:
      'Pixel ({x}, {y}) is outside the triangle the vertex entry draws, so no fragment runs there.',
    consolePixelFailed: 'Pixel ({x}, {y}) did not run on the CPU oracle: {reason}',
    consolePixelNoRaster:
      "The CPU oracle cannot place this module's triangle. Its vertex entry needs `vertex_index` or the generated vertices, and a `position` output.",
    consoleNotRecorded:
      'WebGPU records no call on line {line}: {reason}. The CPU oracle ran it for this pixel:',
    consoleNotRecordedFrame:
      'WebGPU records no call on line {line}: {reason}. Click a pixel to run it on the CPU oracle.',
    consoleVertex: 'The vertex entry, on the CPU oracle, for the three vertices it places:',
    consoleVertexGpu:
      'WebGPU records no call a vertex entry reaches, since a vertex stage cannot write a storage buffer. The vertex entry, on the CPU oracle, for the three vertices it places:',
    consoleVertexAt: 'vertex {index}',
    consoleRecordFrame: 'Record the frame',
    consoleRecording: 'Drawing the frame once more on WebGPU, with its console calls recorded.',
    consoleFrameGpu:
      'Console lines from the whole frame on WebGPU, drawn at {width} × {height}: {lines}. They are listed row by row.',
    consoleFrameDropped:
      'The frame made {dropped} more calls than the buffer holds, and those were dropped. The GPU keeps the calls it runs first, which need not be the top rows.',
    consoleFrameFailed: 'WebGPU could not record the frame: {reason}',
    consoleFrameCpu:
      'Console lines from the whole frame on the CPU oracle, drawn at {width} × {height}: {lines}. They are listed row by row.',
    consoleFrameKept: 'The frame made {more} more calls, past what the page keeps.',
    pixelNote: 'Console lines from pixel ({x}, {y}): {lines}.',
    pixelNoteRecording: 'Recording pixel ({x}, {y}) on WebGPU.',
    // The panel under the canvas: one block per binding the module declares, with what the
    // reader supplies it with. The texture sources and matrix presets are the choices a
    // select offers; the filter and address values are WebGPU's own words and stay in code.
    bindings: {
      title: 'Bindings',
      empty: 'This module binds nothing.',
      runtime: 'filled by the page every frame',
      overrides: 'Overrides',
      source: 'source',
      sources: {
        checker: 'UV checker',
        gradient: 'Gradient',
        noise: 'Noise',
        solid: 'Solid colour',
        faces: 'Cube faces',
        image: 'Your image',
      },
      dropImage: 'image file',
      // A texture named like a pass reads that pass's output (compiler change 0026).
      passOutput: 'the output of the pass {name}',
      depthRamp: 'A depth ramp from 0 at the top left to 1 at the bottom right.',
      filter: 'filter',
      address: 'address',
      compare: 'compare',
      preset: 'preset',
      presets: { identity: 'Identity', camera: 'Camera on the origin', turn: 'Turn about Y' },
      fill: 'fill',
      elements: 'elements',
      written: 'After the dispatch',
      size: 'size',
      noControl: 'No control for',
      hostOwned:
        'The host owns this binding. Here the page supplies a stand-in value, which you can change.',
      vertices:
        'The vertex entry reads these from a buffer. The page gives it the three corners of a triangle, each input filled by what it is called.',
    },
    draw: 'Draw on the CPU',
    stop: 'Stop',
    canvasIdle: 'Run the fragment entry once per pixel, with no GPU.',
    resolution: 'Resolution',
    canvasTooBig:
      'This browser will not back a canvas this large, so nothing can be drawn at this resolution. Choose a smaller one.',
    canvasProgress: '{done}/{total} tiles, {running} running, {waiting} waiting',
    canvasDrawn: '{px} px in {ms} ms on {workers} worker(s)',
    canvasNeedsVertex:
      'Drawing needs a vertex entry driven by vertex_index and a fragment entry. This module has no such pair, so there is no triangle to cover.',
    // What the canvas says when the pair is there and the three corners it got have no area.
    // The canvas runs the vertex entry at the indices 0, 1 and 2 and has no value for any
    // other input, so it leaves those at zero, and a stage that reads one collapses.
    canvasFlat:
      'The vertex entry returned three corners with no area between them, so there is no triangle to cover.',
    canvasFlatInputs:
      'The canvas runs the vertex entry at the indices 0, 1 and 2 and has no value for {fields}, so it left those at 0. The three corners it got back have no area between them.',
    cpuFailed: 'The CPU oracle could not run this entry point.',
    entryCount: (n: number) => (n === 1 ? '1 entry point' : `${n} entry points`),
    // The example picker. Every example is one of the compiler's own .shade.ts files; the
    // names and the lines under them are the gallery's, in `examples.shade`, and the source
    // text comes from the vendored checkout at build time.
    exampleLabel: 'Example',
    // The line under the emit options, beside the prelude note, while the editor holds an
    // example that imports another shader file (Rule 3.9). `{files}` is each file it imports, in code and linked to the file
    // at the pinned commit. Each of those files is a tab over the editor.
    importsNote:
      'This example imports {files}. The compiler reads this file and what it imports as one program, and each file is a tab over the editor.',
    copy: 'Copy',
    copied: 'Copied',
    share: 'Copy link',
    shared: 'Link copied',
    // Sending the file to the gallery (/playground/gallery/). A submission waits for the
    // maintainer's approval (worker/index.ts), so the dialog says so before and after.
    submit: {
      button: 'Submit',
      title: 'Submit to the gallery',
      intro:
        'The file goes to the gallery under the title you give it. The maintainer reviews each submission before it appears.',
      titleLabel: 'Title',
      authorLabel: 'Your name (optional)',
      send: 'Submit',
      cancel: 'Cancel',
      close: 'Close',
      sending: 'Sending…',
      sent: 'Sent. It appears in the gallery once it is approved.',
      already: 'This file was already sent in.',
      limit: 'This address has sent as many as it can today. Try again tomorrow.',
      failed: 'It could not be sent. Try again later.',
    },
    galleryLink: 'Gallery',
    // Shown while the file declares no `@vertex` entry of its own, which is when the page
    // compiles it behind the fullscreen triangle src/lib/live-shader-contract.ts fixes.
    preludeNote:
      'This file declares no `@vertex` entry, so it is compiled behind a fullscreen triangle that hands the fragment stage a `uv` running 0 to 1. The tabs and the canvas show that program.',
    // The emit options the compiler takes, as controls over what the code tabs show.
    emit: {
      title: 'Emit options',
      optimization: 'WGSL optimization',
      levels: { O0: 'O0 (no passes)', O1: 'O1 (value-safe)', O2: 'O2 (default)' },
      parens: 'Parentheses',
      minify: 'Minify',
      numbers: 'Number literals',
      obfuscate: 'Obfuscate',
      fp64: 'f64 emulation',
      precision: `${glsl} float precision`,
      levelNote:
        'At O0 and O1 the compiler emits WGSL from the level alone, so parentheses, minify, the number literals, obfuscate and the f64 emulation reach the GLSL tabs only. The f64 emulation still reaches the reflection at every level, since `reflect()` takes it on its own.',
    },
    // The workspace around the editor: the gallery the page opens on when the link names
    // nothing, the file tabs, and the transport under the canvas. Every example in the gallery
    // is one of the compiler's own .shade.ts files, so its tile words are the gallery's.
    workspace: {
      galleryTitle: 'Start from an example',
      galleryIntro:
        'Each tile is one of the .shade.ts files in the compiler repository. Open one, change it, add files beside it, and bind your own images to its textures.',
      openGallery: 'All examples',
      blankTitle: 'Blank file',
      blankNote: 'A fragment shader that reads `time`, `resolution` and `mouse`.',
      noStill: 'No preview',
      // What a tile with nothing to draw says instead, keyed by the reason in NO_STILL_REASONS
      // (scripts/artifacts.mjs). The tile names what the example is, not what is missing.
      stillKinds: {
        'no-glsl': 'WGSL only',
        control: 'Host controls',
        texture: 'Needs textures',
        uniform: 'Host data',
        'vertex-buffer': 'Vertex buffer',
      },
      files: 'Files',
      newFile: 'New file',
      // The workspace as a folder VS Code opens (src/scripts/workspace-folder.ts).
      download: 'Download as a folder',
      // The extension's uri handler opens the workspace's link (vscode-typeshade, docs/playground-bridge.md).
      openInVsCode: 'Open in VS Code',
      // The button's tooltip: a browser cannot tell whether the extension is installed, so the
      // hint says what the button needs.
      openInVsCodeTitle: 'Open in VS Code (needs the TypeShade extension)',
      // The line that opens under the file bar after a click, since the browser says nothing
      // when no editor answers the vscode: address. It links to /guide/editor/.
      openInVsCodeHint:
        'If VS Code did not open, the TypeShade extension may be missing. [How to install it](editor).',
      newFileName: 'File name',
      badName:
        'A file name ends in .shade.ts and uses letters, digits, dots, hyphens, underscores and slashes.',
      takenName: 'The workspace already has a file with that name.',
      // A file tab's tooltip, and the label of the field a rename opens in its place.
      renameHint: 'Double-click or press F2 to rename',
      renameLabel: 'New name for {file}',
      emptyName: 'A file needs a name.',
      // The main file is the root of the workspace that the other files import from.
      mainNameSlash: 'The main file stays at the top of the workspace, so its name has no slash.',
      importsRenamed: 'Renamed {old} to {new}. The imports of it in {files} now use the new name.',
      deleteFile: 'Delete {file}',
      confirmDelete: 'Delete {file}? A file that imports it stops compiling.',
      play: 'Play',
      pause: 'Pause',
      restart: 'Restart',
      fullscreen: 'Full screen',
      exitFullscreen: 'Exit full screen',
      clock: 'Shader clock',
      dropHint: 'Drop an image on the canvas to bind it to `{texture}`.',
      // A file drawn as a pass before the main file each frame (compiler change 0026).
      pass: 'Pass',
      passTitle: 'Draw {file} as a pass before the main file, into the texture its name reads',
      passFailed: 'The pass {name} does not compile, so the frame is not drawn. Its tab shows why.',
      passTexture:
        'The pass {name} reads the texture {texture}, which is no pass output. A pass reads the output of a pass by its name.',
      passesRgba8:
        'This browser cannot draw WebGL2 into float textures, so each pass keeps 8 bits a channel and a value outside 0 to 1 is clamped.',
      // host.ts, the TypeScript an application writes around the module (compiler change 0062).
      // It runs on a click of the button in the file bar, in a sandboxed frame over the canvas.
      runHost: 'Run host.ts',
      stopHost: 'Stop host.ts',
      runHostTitle: 'Run host.ts in a sandboxed frame over the canvas',
      hostFrame: 'The canvas host.ts draws into',
      hostNote:
        'host.ts is running in a sandboxed frame over the canvas. Its console lines are in the Console tab.',
      hostConsole:
        'The lines host.ts printed, the newest last. It runs in a sandboxed frame over the canvas until you stop it.',
      hostNone: 'host.ts exports neither animate nor run, so only its top level ran.',
      hostUnloaded: 'The frame could not load the runtime, so host.ts did not run.',
      hostStopped: 'host.ts stopped, and its frame is gone.',
      // A host example's tile in the gallery: two files, and no still.
      hostTile: 'Module and host.ts',
    },
  },

  footer: {
    docs: 'Docs',
    project: 'Project',
    languages: 'Languages',
    readme: 'README',
    releases: 'Releases',
    npm: 'npm package',
    newIssue: 'Report a problem',
    radiance: 'Radiance',
    typenn: 'TypeNN',
    license: `Released under the [${facts.licenseName}](license).`,
    copyright: `Copyright © ${facts.year} ${facts.author}`,
    builtFrom: 'Built from commit',
  },

  canvas: {
    /** Accessible names for a mounted shader, by what drew it. */
    aria: (title: string) => ({
      webgpu: `${title} shader, written in TypeScript and compiled by TypeShade to WGSL, running on WebGPU.`,
      webgl2: `${title} shader, written in TypeScript and compiled by TypeShade to ${glsl}, running on WebGL2.`,
      'still-webgpu': `${title} shader, written in TypeScript and compiled by TypeShade to WGSL, one frame drawn on WebGPU.`,
      'still-webgl2': `${title} shader, written in TypeScript and compiled by TypeShade to ${glsl}, one frame drawn on WebGL2.`,
      none: `${title} shader, written in TypeScript and compiled by TypeShade, rendered at build time.`,
    }),
  },

  /** The copy button Expressive Code puts on every code block (ec.config.mjs). */

  /** The chrome around a live example (src/components/LiveShader.astro). The sample's own
   *  code is not copy: it stays on the page that shows it, and so does its file name. */
  live: {
    editCode: 'Edit code',
    source: 'Full shader source',
    file: 'live.shade.ts',
    edit: 'Edit',
    reset: 'Reset',
    playground: 'Open in the Playground',
    editorAria: 'Editable shader source',
    loading: 'Loading the compiler',
    keptFrame: 'The canvas holds the last frame that compiled.',
    noFrame: 'The canvas could not run this program, so it is holding the last frame that ran.',
    /** Named for the reserved fields this sample declares, so the note describes the file
     *  above it. The list goes last, in code font, so no language has to bend a word around
     *  whichever name lands at the end. */
    reserved: (fields: string) => `Filled by the page every frame, with no control: ${fields}.`,
    mouseUnits: '`mouse` runs 0 to 1 over the canvas from the bottom left, the space `uv` is in.',
    backend: {
      webgpu: 'Running on WebGPU.',
      webgl2: `Running on WebGL2, from the emitted ${glsl}.`,
      none: `This browser has no WebGPU and no WebGL2, so the frame above was drawn at build time.`,
    },
    /** The line that introduces the list of things to try, under the controls. */
    exercisesP: 'Try the following, with the controls or by editing a line:',
    output: 'Emitted output',
    outputNote:
      'The whole module the compiler saw. The page added the vertex entry and the `VsOut` struct it returns; the rest is the file above.',
    wgsl: 'WGSL',
    glslVertex: `${glsl} vertex`,
    glslFragment: `${glsl} fragment`,
    uniforms: 'Uniform block',
    field: 'Field',
    type: 'Type',
    offset: 'Offset',
    lineAt: 'line {line}',
    /** The names of a vector control's components, for its accessible name. */
    component: ['x', 'y', 'z', 'w'],
  },

  code: { copy: 'Copy to clipboard', copied: 'Copied' },

  install: {
    label: 'npm installation',
    source:
      'The Git dependency contains TypeScript source. tsx runs the compiler and CLI under Node.js.',
  },
  diagnostic: {
    frameLabel: 'Shader with a misspelt field, typed-error.shade.ts',
    error: (code: string, line: number, column: number) =>
      `error ${code} at line ${line}, column ${column}:`,
    truncated: '(first line of a longer message)',
  },
  layout: {
    region: `Reflected ${std} layout`,
    caption: (size: number) => `reflect(), ${std}, ${size} bytes`,
    field: 'field',
    type: 'type',
    offset: 'offset',
    size: 'size',
  },
  codeLabels: {
    authored: `Authored fragment, ${hero.file}`,
    quickStartShader: `The shader file, ${quickStartFile.shader.name}`,
    quickStartHost: `The host file that compiles it, ${quickStartFile.host.name}`,
    wgsl: 'The emitted WGSL fragment entry point',
    glsl: `The emitted ${glsl} fragment main`,
    useTypeshade: 'hello.shade.ts',
  },

  front: {
    title: 'TypeShade, a shader language you write in TypeScript',
    searchTitle: 'TypeShade',
    lede: `TypeShade is a language of its own, with TypeScript's syntax, types and editor. A file that starts with \`"use typeshade"\` emits WGSL for WebGPU and ${glsl} for WebGL2. ${facts.shadeRenderable} of the ${facts.shadeExamples} examples in the repository emit both from one file.`,
    playground: 'Playground',
    quickStart: 'Quick Start',
    stageAria: 'A shader running beside the file that draws it',
    first: {
      title: 'Warped bands',
      caption:
        'The file on the left, drawn on the right. Edit a line or move a control and the picture follows.',
      warp: 'how much the bands bend',
      ink: 'first colour',
      paper: 'second colour',
    },
    targets: {
      h: 'One file, two targets',
      p: 'The compiler lowers `hello.shade.ts` to one intermediate representation and emits both targets from it. The file imports nothing, so it is the whole program; the pane beside it holds the WGSL and the GLSL ES 3.00 fragment a host hands to WebGPU or WebGL2, one tab each.',
      source: 'hello.shade.ts',
      wgsl: 'WGSL',
      glsl: `${glsl} fragment`,
    },
    gallery: {
      h: 'More shaders',
      p: `${facts.shadeExamples} examples ship with the compiler, from cartographic passes to compute kernels. Each tile is the frame its shader drew at build time, and opens the page that runs it.`,
      all: 'All examples',
      /** What a canvas of one example says under it, by what drew the frame. The front page's
       *  tiles are stills and carry none of this; the example's own page runs the shader. */
      tile: (title: string) => ({
        neutral: `${title}, drawn at build time.`,
        webgpu: `${title}, running on WebGPU.`,
        webgl2: `${title}, running on WebGL2.`,
        none: `${title}, drawn at build time; this browser has no WebGPU or WebGL2.`,
        reduced: `${title}, one frame, since this system asks for less motion.`,
      }),
    },
    map: {
      h: 'What carries over from TypeScript',
      p: 'GPU code has three things: resources, value layouts and entry points. TypeShade gives each a place TypeScript already has, and keeps the rest of the language where it fits the GPU. The full rules are in the [language guide](guide).',
      rows: [
        [
          '"use typeshade"',
          'The directive is the language boundary',
          "It is the first statement of the file, where a JavaScript directive goes. A file without it does not compile as a shader; with it, everything under it is checked as TypeShade and lowered to the compiler's intermediate representation.",
        ],
        [
          'f32, vec3, mat4, sin(x)',
          'GPU types and builtins are globals',
          '`f32`, `vec3`, `mat4` and the builtins such as `sin` and `vec4(...)` need no import, and `Math.sin` and `Math.PI` are aliases of the same operations. The checker applies the shader rules to them in the editor, before any code is emitted.',
        ],
        [
          'class VsIn { @location(0) uv: vec2 }',
          'A type or a class is a value layout',
          'Plain data is a `type` alias; a `class` carries per-field metadata such as `@location` and `@builtin`, and its fields lay out the struct both targets receive.',
        ],
        [
          'new Circle(center, 0.3).coverage(p)',
          'A class is a TypeScript class',
          'Fields, a constructor and `new`, methods and static functions, `extends` with `super` and `abstract`, generic classes and functions, and the mixin pattern all compile. A method lowers to a function that takes the struct first, and a generic is compiled once per set of type arguments. The [gallery](examples) has a file for each of them.',
        ],
        [
          'declare const u: uniform<Camera>',
          'declare names a resource the host fills',
          '`uniform<T>` reads a uniform block, and `storage<T, "read_write">` is a storage buffer the shader writes. There is no initializer: the host owns the slot, in the order the file declares them, and [`reflect()`](apiReflect) reports its layout.',
        ],
        [
          '@fragment export function fs(v: VsOut): vec4',
          'A decorated export is an entry point',
          '`@vertex`, `@fragment` and `@compute([64, 1, 1])` name the stage; a function without one is a helper. Stage inputs are explicit parameters, a `@builtin("vertex_index")` or a `@location`. There is no hidden global.',
        ],
        [
          'await scale({ k, xs, ys }, 4)',
          'A host file imports the module and calls it',
          "Through the `typeshade/vite` plugin, a host file imports a `.shade.ts` and calls what it exports. A helper runs on the CPU, a `@compute` entry runs on WebGPU or the WebGL2 compute tier where supported, and a full-screen `@fragment` entry draws into a canvas as `fs(canvas, bindings)`. The bindings object is typed from the module, so a binding the call leaves out is a type error on the host's line.",
        ],
      ],
    },
    oracle: {
      h: 'Checked against the CPU',
      p: "The same module runs on the CPU in f64, and [the test suite](checks) checks the compiler's algebra against it. Every emit is compiled on Tint and linked on WebGL2 on each push. Below, the gradient pass drawn by each backend from the same file.",
      webgpu: {
        neutral: 'The gradient pass, drawn at build time from the emitted WGSL.',
        webgpu: 'The gradient pass, drawn by WebGPU from the emitted WGSL.',
        webgl2: 'The gradient pass, drawn by WebGL2; this browser has no WebGPU.',
        none: 'The gradient pass, drawn at build time; this browser has no WebGPU or WebGL2.',
      },
      webgl2: {
        neutral: `The gradient pass, drawn at build time from the emitted ${glsl}.`,
        webgpu: `The gradient pass, drawn by WebGL2 from the emitted ${glsl}.`,
        webgl2: `The gradient pass, drawn by WebGL2 from the emitted ${glsl}.`,
        none: 'The gradient pass, drawn at build time; this browser has no WebGL2.',
      },
    },
    install: {
      h: 'Install',
      p: `Install the repository with npm through its Git URL. Import the package as \`typeshade\`; [Quick Start](quickStart) covers installation and the first shader. The ${facts.nextVersion} registry release is not published yet.`,
    },
  },
  quickStart: {
    host: {
      hostH: 'Connect it to the host application',
      boundaryH: 'The TypeShade / host boundary',
      nextLearnH: 'What to learn next',
      p0: 'A file that starts with `"use typeshade"` is a shader file, and it compiles with the shader files it imports as one program. The example below is the TypeShade authoring surface.',
      boundaryP:
        'TypeShade source is authored with TypeScript syntax, but a file marked with `"use typeshade"` follows the shader language rules. TypeScript types and syntax form the authoring surface; TypeShade GPU types, resources and shader-stage rules define the shader semantics.',
      boundaryBullets: [
        '`"use typeshade"` declares the language boundary.',
        'GPU entry inputs are explicit parameters such as `@builtin(...)`, not hidden globals.',
        'Resource types such as `uniform<T>` and `storage<T>` express GPU resource semantics.',
      ],
      hostP0:
        'A host uses the file one of three ways. It compiles the file and passes the shader source to its own WebGPU or WebGL2 code, or it imports the file and calls what the file exports. An engine that draws its own frames loads the compiled program into the program runtime instead, the third way, which [WebGPU and WebGL2](conceptsWebgpu) describes.',
      compileH: 'Compiling the file',
      hostWgslLabel: 'Where the host consumes WGSL',
      hostP1:
        'This way works today. Compile the file, then let the host application pass the generated WGSL or GLSL ES 3.00 source to WebGPU or WebGL2.',
      hostP2:
        'TypeShade owns the language semantics and shader emission. The host owns runtime objects and their lifetimes, including the device, pipeline, bind groups, buffers, textures and command encoders.',
      importH: 'Importing the file',
      importP: `The Vite plugin supports the Git-installed source package. A host file imports a \`.shade.ts\` and calls what it exports, and TypeShade's runtime creates the device and the pipelines those calls need. A helper runs on the CPU. A \`@compute\` entry is \`await entry(bindings, workgroups)\`: it runs on WebGPU or WebGL2 where supported and reads back what it wrote. A full-screen \`@fragment\` entry draws into a canvas as \`entry(canvas, bindings)\`, on WebGPU, then WebGL2, then the CPU.`,
      setupP:
        'After installation, add the Vite plugin and the host `tsconfig.json` settings below. The scripts run Vite and the installed CLI through `tsx`. The `prepare` script writes the host views that `tsc` reads. Add `*.shade.typeshade.ts` to `.gitignore`.',
      viteLabel: 'The Vite plugin, vite.config.ts',
      tsconfigLabel: 'Two lines of the host tsconfig.json',
      packageLabel: 'Development scripts, package.json',
      toolingLabel: 'Vite development dependency',
      devLabel: 'Start the development server',
      drawP:
        'A host file then draws `hello.shade.ts`, the file at the top of this page, with one call. A vertex entry cannot be called from host code yet, so the view declares `vs` as `never`, and `fs` fills the whole canvas in red.',
      drawLabel: 'Drawing hello.shade.ts from a host file, app.ts',
      untilP: `[WebGPU and WebGL2](conceptsWebgpu) describes the ownership boundaries of the compiler, host calls and program runtime.`,
      nextLearnP: 'Now connect familiar TypeScript concepts to their TypeShade GPU meaning.',
      nextLinks: nextLinks([
        { linkKey: 'languageTypes', label: 'Types: value shapes and GPU structs' },
        { linkKey: 'languageFunctions', label: 'Functions: helpers and entry points' },
        { linkKey: 'languageControlFlow', label: 'Control flow: GPU execution' },
        { linkKey: 'languageGpuTypes', label: 'GPU types: scalars, vectors, matrices and arrays' },
        { linkKey: 'languageResources', label: 'Resources: uniform and storage' },
        { linkKey: 'languageStages', label: 'Shader stages: compute, vertex and fragment' },
      ]),
      nextLearnAllLink: 'Read the full Language Guide',
      nextEditorP:
        'The [VS Code extension](editor) shows diagnostics and the WGSL a file compiles to while you type.',
    },
    title: 'TypeShade Quick Start: install and write your first shader',
    description:
      'Install TypeShade from Git with npm, run its TypeScript source with tsx, and compile your first shader to WGSL for WebGPU or GLSL for WebGL2.',
    h1: 'Quick Start',
    runLabel: 'Run the compiler, terminal',
    installH: 'Install',
    p0: 'Start with a TypeScript file whose first statement is `"use typeshade"`. That directive crosses the boundary into the TypeShade shader language; the example below is a complete first shader, written with a class and stage-decorated functions.',
    p1: `A host compiles a file with one call. Save the gradient pass below as \`${quickStartFile.shader.name}\`, ${quickStartFile.shader.lines} lines with a uniform block, a vertex stage and a fragment stage, and compile it from a host file of ${quickStartFile.host.lines} lines that calls [\`compile()\`](apiCompile) and prints the WGSL:`,
    p2: 'Running it prints WGSL for both stages. Here is the fragment entry point:',
    p3: `The ${glsl} stage for the same function, and the uniform layout [\`reflect()\`](apiReflect) recovers for it, are on the [examples page](examples). The [language guide](guide) covers the rest of the surface.`,
    live: {
      h: 'Live example',
      p: '`sin` turns the x coordinate into a wave, and `time` scrolls it. That is the whole file below, and it runs here: edit a line and the canvas follows on the next keystroke.',
      title: 'Sine stripes',
      caption: 'A sine wave across the canvas, mixed between two colours.',
      anchor:
        '`bands` is how many times the wave repeats between the left edge and the right, and `time` slides the pattern along. Every column holds one colour, because only `uv.x` reaches `phase`.',
      exercises: [
        'Drag `bands` to the bottom of its range for a single wave, then to the top and watch the crests narrow to lines.',
        'Change `uv.x` to `uv.y` on the `phase` line. The stripes lie down, because `uv` runs up the canvas as well as across it.',
        'Add `speed: f32` to `Uniforms`, then multiply `u.time` by `u.speed` on the `phase` line. A slider named `speed` appears under the canvas, and `struct Uniforms` under Emitted output grows a field: the controls and the WGSL are both read from the module the compiler just built.',
      ],
      bands: 'waves across the canvas',
      low: 'trough colour',
      high: 'crest colour',
    },
    status: {
      h: 'Status',
      p: `The repository package is version ${facts.mirrorVersion}. The ${facts.nextVersion} registry release is not published yet; npm can install the Git source now. The host imports \`${quickStartFile.importPath}\` from the installed package. Commit the lockfile to record the resolved Git revision. [Releases](releases) lists published versions.`,
    },
  },

  motivation: {
    use: {
      title: 'What is TypeShade? A shader language in TypeScript',
      description:
        'Learn TypeShade as a shader language: start from TypeScript concepts, cross the use typeshade boundary, and compile to host-ready GPU code.',
      h1: 'A shader language that starts in TypeScript',
      sections: [
        [
          'What does TypeShade change?',
          'TypeShade is not a runtime that executes ordinary TypeScript on the GPU. It starts from familiar TypeScript syntax and tooling, then interprets the file as a separate shader language with its own types and semantics.',
        ],
        [
          '`use typeshade` is the language boundary',
          'The file-level `"use typeshade"` directive declares a TypeShade program. Once present, the compiler applies TypeShade shader semantics instead of treating the file as ordinary application code. Understanding this line is the first step to understanding the language.',
        ],
        [
          'What stays familiar from TypeScript?',
          'Functions, type annotations, modules, expressions and control flow form the familiar authoring surface. That does not mean every TypeScript feature is available unchanged. TypeShade deliberately constrains features that do not map cleanly to the GPU execution model and reports those constraints statically.',
        ],
        [
          'Where does TypeScript end and TypeShade begin?',
          'TypeScript describes general-purpose program types and execution. TypeShade additionally describes GPU values, vectors and matrices, resources, entry points, target capabilities and shader-specific restrictions. A familiar `function` or `if` still has to make sense for the target GPU program.',
        ],
        [
          'What does the compiler produce?',
          'TypeShade source is lowered to one intermediate representation and then emitted as host-consumable shader source. The current targets are WGSL for WebGPU and GLSL ES 3.00 for WebGL2. A host hands that source to its own WebGPU or WebGL2 code, or loads the compiled program into the program runtime, `typeshade/runtime`.',
        ],
        [
          'Where should you go next?',
          'Start with Quick start and make one real `"use typeshade"` file. Then use the Language guide to learn types, values and expressions, functions, control flow and GPU semantics. Move to Verification and the API reference once you know the authoring model.',
        ],
      ],
      familiarH: 'Your TypeScript knowledge is the starting point',
      familiarP:
        'TypeShade keeps familiar language concepts, then makes the GPU-specific differences explicit instead of hiding them in generated shader strings.',
      rows: [
        [
          'Functions',
          'Declarations and calls',
          'Shader functions and entry-point rules are added.',
        ],
        [
          'Types',
          'Annotations and inference',
          'GPU-native values plus vector and matrix types are added.',
        ],
        [
          'Modules',
          'import / export',
          'A shader file and the shader files it imports compile as one program.',
        ],
        [
          'Control flow',
          'if / for and related syntax',
          'The program must satisfy GPU execution and target constraints.',
        ],
        [
          'Execution',
          'JavaScript runtime',
          'The host executes generated code through WebGPU or WebGL2.',
        ],
      ],
      furtherH: 'Keep the TypeScript and JavaScript references nearby',
      furtherP:
        'TypeShade documentation focuses on what is different. When a TypeScript or JavaScript concept is new to you, use the language references below as the background layer.',
      further: [
        [
          'TypeScript Handbook — Everyday Types',
          'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
          'Types, annotations, unions and other everyday TypeScript concepts',
        ],
        [
          'TypeScript Handbook — Functions',
          'https://www.typescriptlang.org/docs/handbook/2/functions.html',
          'Function declarations, parameters, return types and calls',
        ],
        [
          'MDN — JavaScript Guide',
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
          'The JavaScript background for expressions, control flow, functions and modules',
        ],
      ],
      columns: ['Concept', 'Familiar from TypeScript', 'What TypeShade adds'],
    },
    title: 'Why TypeShade for TypeScript shader development',
    description:
      'TypeShade brings TypeScript syntax and editor tools to GPU programs. Learn how shared shader source, multiple targets and CPU checks fit your project.',
    h1: 'Why TypeShade',
    intro:
      'TypeShade keeps shader logic in a typed source file and compiles it for supported GPU targets. It brings TypeScript authoring tools, shared shader source and output verification into the same workflow.',
    sections: [
      {
        id: 'typescript-tooling',
        h: 'TypeScript tooling',
        p: 'Functions, classes, type annotations and imports provide a familiar way to organize shader code. A file starts with `"use typeshade"`, which marks the boundary where shader types and execution rules apply. The [editor extension](editor) adds completions, shader diagnostics and navigation. The [TypeScript mapping](languageFromTypescript) explains how each supported construct compiles.',
      },
      {
        id: 'shared-source',
        h: 'Shared shader source',
        p: `WebGPU consumes WGSL, while WebGL2 consumes ${glsl}. Maintaining separate implementations means applying each change in each language. TypeShade lowers a shader program to a shared intermediate representation and emits the supported targets from it. A change to a helper function reaches each emitted version through the same compilation. The [target guide](conceptsWgsl) explains where their capabilities differ.`,
      },
      {
        id: 'host-integration',
        h: 'Host integration',
        p: 'The compiler exposes shader source and reflection metadata for a host to inspect and consume. An application can use the output with its own renderer. The Vite plugin also lets a host import shader modules and call their entries through `typeshade/runtime`. The [WebGPU and WebGL2 guide](conceptsWebgpu) describes these integration paths and the resources the host provides.',
      },
      {
        id: 'verification',
        h: 'A reference for verification',
        p: 'The CPU oracle evaluates the same intermediate representation in double precision. It supplies a reference for checking GPU results. Compiler checks also include target compilation, output snapshots and differential tests. Floating-point results can differ between execution targets. [Verification](checks) describes the checks and their scope.',
      },
      {
        id: 'constraints',
        h: 'GPU constraints',
        p: 'A shader must follow resource, stage and target rules. Some constructs emit WGSL alone, and WebGL2 compute uses supported lowering paths with capability limits. TypeShade adds a compiler step and its own language rules. The [language guide](guide) and [target guide](conceptsWgsl) describe those constraints. Existing WGSL or GLSL may already cover a project that needs a single target or specific target features.',
      },
      {
        id: 'project-status',
        h: 'Project status',
        p: 'TypeShade is pre-release. Check the features and targets your application needs against the pinned compiler before adopting it. The [quick start](quickStart) documents the current setup, and the [design rules](rules) describe the language contract.',
      },
    ],
    nextH: 'Next steps',
    nextP:
      'Open the [Playground](playground) to edit a shader and inspect its output. Follow the [quick start](quickStart) to use it in a project, or browse the [examples](examples) for complete programs.',
  },

  benchmarks: {
    metricH: 'Measurement',
    metrics: {
      validation: 'Validation probe',
      packing: 'Packing probe',
      upload: 'Uploaded bytes',
      wall: 'Elapsed time',
      gpu: 'GPU time',
      buffers: 'Peak buffer memory',
      cold: 'First call',
      readback: 'Resident readback',
    },
    sections: {
      applications: 'Application workloads',
      data: 'Data and memory',
      compute: 'Computation',
      execution: 'Execution',
    },
    sectionInfo: {
      applications:
        'Complete image, particle, reduction and collection calls, plus a resident image chain.',
      data: 'Object and field arrays, buffer transfers and memory access patterns.',
      compute: 'Integer arithmetic, reduction and atomic additions.',
      execution: 'Workgroup sizes and queue submission patterns.',
    },
    caseNames: {
      'fields-1': 'Kernel call, read 1 of 8 fields',
      'fields-4': 'Kernel call, read 4 of 8 fields',
      'fields-8': 'Kernel call, read all 8 fields',
      image: 'Image inversion',
      particles: 'Particle updates',
      peak: 'Maximum value',
      collect: 'Map and Set aggregation',
      'resident-image': 'Resident image chain',
      'layout-aos-8-read-1': 'Object array, read 1 of 8 fields',
      'layout-soa-8-read-1': 'Field arrays, read 1 of 8 fields',
      'layout-aos-1-read-1': 'Object array, 1 field',
      'layout-soa-1-read-1': 'Field array, 1 field',
      'layout-aos-8-read-8': 'Object array, read 8 fields',
      'layout-soa-8-read-8': 'Field arrays, read 8 fields',
      'transfer-upload': 'Upload to GPU',
      'transfer-readback': 'Read back to host',
      'memory-step-1': 'Sequential access',
      'memory-step-17': 'Access step 17',
      'memory-step-4097': 'Access step 4097',
      'arithmetic-rounds-4': 'Integer arithmetic, 4 rounds',
      'arithmetic-rounds-64': 'Integer arithmetic, 64 rounds',
      'reduction-serial': 'Serial tile reduction',
      'reduction-workgroup': 'Workgroup reduction',
      'atomics-bins-1': 'Atomic additions, 1 bin',
      'atomics-bins-256': 'Atomic additions, 256 bins',
      'workgroup-64': 'Workgroup size 64',
      'workgroup-128': 'Workgroup size 128',
      'workgroup-256': 'Workgroup size 256',
      'submission-batched': 'Batched dispatches',
      'submission-separate': 'Separate submissions',
    },
    verdict: '{passed} / {total} checks passed',
    summary:
      'Lower: {lower}. Higher: {higher}. Overlapping or equal: {similar}. Unavailable: {missing}.',
    chartInfo:
      'Each baseline is 100. Shorter bars mean less time or buffer memory. Each section uses its own scale. Raw values appear above the bars.',
    rangeInfo:
      'Lines span percentiles 10 to 90 of repeated samples. Overlapping ranges stay separate from observed decreases and increases. First calls have one observation.',
    range: '{baseline}; {candidate}.',
    axis: 'Baseline 100; scale 0 to {max}.',
    lower: '{value}% lower',
    higher: '{value}% higher',
    overlap: 'Ranges overlap ({value}%)',
    same: 'Equal',
    pending: 'Comparison requires a complete run with matching adapters.',
    methodH: 'Measurement method',
    sampleRanges: 'Sample ranges',
    receipt: 'Receipt {id}, received {time}.',
    comparisonH: 'Version comparison',
    ratios: 'Paired results',
    ratioInfo:
      'Ratios divide the baseline median by the candidate median. Values above 1 indicate less candidate time or buffer memory. Timing spread and readback samples remain in the JSON.',
    wallRatio: 'Wall ratio',
    gpuRatio: 'GPU ratio',
    memoryRatio: 'Buffer ratio',
    comparisonInfo:
      'Run the same programs with the baseline and candidate builds. Each build has an isolated runtime, and their measured calls alternate.',
    comparisonScope:
      'One run includes every experiment and correctness check on both builds. It covers application calls, memory, computation and execution patterns.',
    comparisonTiming:
      'First-call time includes case preparation. Repeated compiled timings are per dispatch in a calibrated batch. Application timings cover the complete call. Resident timings cover a fixed chain; readback is recorded separately in the JSON.',
    comparisonProbes:
      'The field-read kernel cases measure validation and packing in separate probes before the actual call. These probes can warm caches and are not additive parts of elapsed time. Uploaded bytes count actual buffer writes. Available GPU times cover the compute pass with equal query overhead in both builds. Query buffers are excluded from workload memory. Shared runtime information describes the actual opened device; artifact and compiler hashes remain separate provenance.',
    comparisonMemory:
      'Peak buffer bytes count live WebGPU buffers created through the instrument. They exclude textures, driver allocations and JavaScript memory. The record also includes allocation and submission counts.',
    comparisonTrust:
      'Compare versions within the same run and workload. Inspect both adapter snapshots and raw samples before interpreting a ratio. A submitted GPU command does not prove every part of a call ran on the GPU.',
    baseline: 'Baseline',
    candidate: 'Candidate',
    build: 'Build',
    peakBuffers: 'Peak buffers (B)',
    cold: 'First call (ms)',
    title: 'Performance benchmarks',
    h1: 'Benchmarks',
    description:
      'Run TypeShade performance experiments on your device and contribute results to guide compiler improvements.',
    intro:
      'Measure how workloads behave on your device. These experiments help guide compiler work, including private kernel input projection.',
    runH: 'Unified benchmark',
    resultsH: 'Performance report',
    sharingH: 'Contribute results',
    runInfo:
      'Close other GPU applications and keep this tab visible. Switching tabs stops the run and retains completed results. Your device may become warm.',
    profile: 'Run size',
    profiles: { quick: 'Quick', standard: 'Standard', extended: 'Extended' },
    profileUnits: 'elements; samples per experiment',
    suites: {
      layout: 'Array layout',
      transfer: 'Buffer transfer',
      memory: 'Memory access',
      arithmetic: 'Integer arithmetic',
      reduction: 'Reduction',
      atomics: 'Atomic contention',
      workgroup: 'Workgroup size',
      submission: 'Queue submission',
    },
    descriptions: {
      layout: 'Compare full and projected AoS and SoA buffers with scalar fields.',
      transfer: 'Measure upload completion and readback into host memory.',
      memory: 'Compare sequential access with permuted access at different steps.',
      arithmetic: 'Compare different iteration counts of unsigned integer arithmetic.',
      reduction: 'Compare serial tiles with a workgroup tree reduction.',
      atomics: 'Compare concentrated and distributed atomic additions.',
      workgroup: 'Compare workgroup sizes with the same copy workload.',
      submission: 'Compare batched dispatches with separate queue submissions.',
    },
    run: 'Run',
    stop: 'Stop',
    download: 'Download JSON',
    send: 'Retry sending',
    idle: 'Choose a run size, then run the benchmark.',
    running: 'Running',
    complete: 'Complete',
    cancelled: 'Stopped',
    failed: 'Run failed',
    unsupported: 'WebGPU unavailable',
    progress: 'Completed experiments',
    empty: 'Results will appear here after a run.',
    experiment: 'Experiment',
    size: 'Elements',
    storage: 'Storage bytes',
    wall: 'Host ms',
    gpu: 'GPU ns',
    check: 'Result',
    passed: 'Passed',
    unavailable: 'Unavailable',
    timing:
      'Times are medians per dispatch or transfer. Host time includes submission and completion. GPU timestamps exclude transfers and host work.',
    timingUnavailable:
      'GPU timing requires timestamp queries and a resolved interval. Unavailable timing remains empty. Separate submissions report host time only.',
    protocol:
      'Each workload checks its output against an independent CPU reference and tests the comparison with a corrupted value. Alternatives rotate between rounds.',
    limits:
      'Run limits come from the selected profile. Setup includes pipeline creation, buffer allocation and initial upload. Raw samples and setup times are in the record.',
    privacy:
      'The record contains device and renderer information, browser version, workload identifiers, timings and correctness results. It contains no page URL or user program.',
    attribution:
      'WebGPU adapter information and WebGL renderer information have separate fields. The APIs may select different GPUs. Browsers can hide either value.',
    inspect: 'Inspect the record',
    submissionNotice: 'Running automatically sends results and device information to TypeShade.',
    submissionDetails: 'What is sent',
    retention:
      'Records expire after {days} days. A daily cleanup deletes expired records. Temporary address hashes enforce an hourly limit and expire at the end of the hour.',
    trust:
      'These are voluntary, unverified device reports. Maintainers check controlled reproductions before making compiler decisions. Raw submissions are private.',
    sent: 'Results received.',
    sendFailed: 'Results could not be sent. Download the record and try again later.',
    rateLimited: 'The submission limit was reached. Try again later.',
    software:
      'A software renderer is reported. This run checks the instrument and does not establish physical GPU performance.',
    deviceH: 'Reported device',
    webgpu: 'WebGPU adapter',
    webgl: 'WebGL renderer',
  },
  checks: {
    title: 'How TypeShade is checked: oracle, compile gate, goldens',
    description:
      "What TypeShade's CI runs on every push: a CPU oracle in f64, a compile gate on Tint and a real WebGL2 context, and golden files for every emit.",
    h1: 'Verification',
    ciH: 'On every push',
    intro:
      "The repository's CI runs these on every push and pull request, in [the CI workflow](ciGates):",
    items: [
      `The same module compiles to a CPU function that runs in f64 arithmetic. In its default mode only its equality tests round to f32 first, so they agree with the GPU; an f32 mode that rounds after every operation is opt-in. The test suite checks that function against known answers and against a second CPU backend, generated JavaScript, which must match it bit for bit. It says nothing about what rounding does on a driver, and no GPU output is compared against it in this repository. Where WGSL fixes a result and ${glsl} does not, the oracle follows WGSL (Rule 11.5). [src/core/oracle.ts](oracle)`,
      `The compile gate emits every registered example, hands each WGSL emit to Tint inside headless Chromium, and compiles and links both ${glsl} stages of every renderable example on a real WebGL2 context. It also hands each compiler a shader that cannot compile: if either accepts that non-program, the gate fails and the verdicts on the examples do not count. [scripts/compile-gate.ts](compileGate)`,
      'Golden files hold the emitted bytes of every example, so any change in a backend surfaces as a diff in review. [emit-goldens.test.ts](goldens)',
    ],
    pairH: 'The same pass on both backends',
    pairIntro:
      'The gradient pass from the front page, drawn once by each backend. No pixel comparison between the two is committed yet.',
    gpuFrame: {
      neutral: 'Drawn on WebGPU at build time, from the compiled WGSL.',
      webgpu: 'Drawn here on WebGPU, from the compiled WGSL.',
      webgl2: `WebGPU is not available here, so this frame was drawn on WebGL2 from the compiled ${glsl}.`,
      none: 'Drawn on WebGPU at build time, from the compiled WGSL. This browser has no WebGPU or WebGL2.',
    },
    glFrame: {
      neutral: `Drawn on WebGL2 at build time, from the compiled ${glsl}.`,
      webgpu: 'Drawn here on WebGPU, from the compiled WGSL.',
      webgl2: `Drawn here on WebGL2, from the compiled ${glsl}.`,
      none: `Drawn on WebGL2 at build time, from the compiled ${glsl}. This browser has no WebGPU or WebGL2.`,
    },
    authorTime: {
      h: 'At author time',
      p: 'The uniform block is declared once, and every field read is typed against that declaration. Misspell one and the editor says so, before a string reaches a GPU, and the compiler refuses the file with the same code.',
      caption: `The wrong read on line ${err.wrongLine}, the diagnostic it produces, and the ${std} layout [\`reflect()\`](apiReflect) recovers for the block it reads from: ${err.layout.size} bytes over ${err.layout.fields.length} fields. The gap after the first field is alignment.`,
    },
  },

  /** The bridge page at /guide/typescript-and-webgpu/. Rendered by
   *  src/components/pages/ConceptsPage.astro; the shader sample is not copy, so it stays there. */
  concepts: {
    lessons: conceptLessons,
    lessonLabels: conceptLessonLabels,
    glslPrecision: precisionGuide,
    precisionFractionLabel: fractionLabel,
    title: 'TypeScript and WebGPU: write GPU shaders in TypeScript',
    description: `Write WebGPU shaders in TypeScript. A "use typeshade" file compiles to WGSL and ${glsl}, and this page maps types, functions and modules to the GPU.`,
    h1: 'WebGPU shaders in TypeScript',
    lead: `TypeShade lets you write WebGPU shaders in TypeScript. A file marked with \`"use typeshade"\` compiles to WGSL for WebGPU and to ${glsl} for WebGL2. Your editor reads the same file as TypeScript. This page maps the types, functions and modules you know to what a shader needs, and shows where the WebGPU API begins.`,
    startH: 'Start with a TypeScript file',
    startP:
      '`"use typeshade"` marks the file as TypeShade source, and the file compiles with the TypeShade files it imports as one program. The rest of the program still uses familiar TypeScript-shaped constructs: functions, parameters, return types, objects, imports and exports. The second block is the WGSL the pinned compiler writes for this file, produced while the page is built.',
    startWgslLabel: 'The WGSL it compiles to',
    modelH: 'The mental model',
    adds: 'TypeShade adds',
    model: [
      [
        'TypeScript types',
        'Type annotations describe values and make incorrect programs visible to tooling.',
        'GPU value types such as `f32`, `u32`, `vec2`, `vec3` and `vec4`, plus rules for shader operations.',
      ],
      [
        'Functions',
        'A function has parameters, a return type and a body.',
        'Stage decorators such as `@vertex` and `@fragment` to identify entry points.',
      ],
      [
        'Modules',
        '`import` and `export` share code between the files of a program.',
        'Shader files import one another by relative paths and compile as one program, which the compiler lowers to GPU code from what its entry points reach.',
      ],
      [
        'Web APIs',
        'The host application owns devices, pipelines, buffers and rendering.',
        "Shader source and reflection metadata for the host's own WebGPU or WebGL2 code. A module the host imports through the Vite plugin brings a runtime that creates the device and the pipelines its calls need.",
      ],
    ],
    fitH: 'Where WebGPU fits',
    fitP: 'Think of TypeShade as the authoring and compilation layer above the browser graphics API. TypeShade produces shader code, and the application creates a `GPUDevice`, configures a pipeline, binds resources and submits work. A module the application imports through the Vite plugin does those steps inside the calls it exports. [The shader pipeline](conceptsPipeline) shows where the entry points run, and [WebGPU and WebGL2](conceptsWebgpu) shows which side owns each object.',
    fitLinks: [
      ['TypeScript documentation ↗', 'https://www.typescriptlang.org/docs/'],
      ['MDN WebGPU API ↗', 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API'],
      [
        'MDN JavaScript directives ↗',
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode',
      ],
    ],
    playgroundLink: 'Try it in the Playground →',
    typesH: 'WebGPU types',
    typesP:
      'Host code that calls WebGPU needs the WebGPU type declarations. With TypeScript 5, install `@webgpu/types` and add it to `compilerOptions.types` in `tsconfig.json`. TypeScript 6 carries only part of them in its `dom` library, and the [WebGPU types README](webgpuTypes) says what to use there. WebGL2 is in the `dom` library of both versions. The declarations of the `typeshade` package need no WebGPU types, because its runtime takes the device as an `object`.',
    orderH: 'Learn in this order',
    orderItems: [
      'Learn the TypeScript shape: types, functions and modules.',
      'Add `"use typeshade"` and learn the [GPU types](languageGpuTypes).',
      'Add entry-point decorators and resource declarations: [Shader stages](languageStages) and [Resources](languageResources).',
      'Use the Playground to see diagnostics and generated WGSL while you edit.',
      'Only then move into compiler and backend details.',
    ],

    /** The four pages under /guide/concepts/, the learning path from what a TypeScript
     *  developer knows to what a shader needs. Each is a component in src/components/pages
     *  and a one-line route file in src/pages/guide/concepts/. */
    cpuAndGpu: {
      title: 'CPU and GPU execution: memory, calls and shader limits',
      description:
        'Compare CPU and GPU execution, shader invocations, shared resources, calls and loops. Separate language restrictions from hardware scheduling and compiler choices.',
      h1: 'CPU and GPU',
      lead: 'CPU code prepares work and resources for the GPU. Shader languages define how invocations use those resources. Their restrictions come from language rules, API contracts, and compiler choices as well as hardware.',
      invocationH: 'Invocations',
      invocationP:
        'Each invocation processes a vertex, fragment, or compute work item. Invocations can communicate through shared resources under the language memory and synchronization rules. Their execution order is not implied.',
      invocationRule:
        'What follows: a stage decorator says which of the three is calling, and a `@builtin(...)` parameter is how an invocation learns its own place in the work. [Shader stages](languageStages) states the decorators and [Functions](languageFunctions) states the parameters.',
      memoryH: 'Memory',
      memoryP:
        "A shader uses typed local values and resources bound by the host. WGSL and GLSL ES do not expose JavaScript's general object heap. TypeShade classes describe GPU structs whose bytes the host supplies.",
      memoryRule:
        "What follows: `new` builds a value and not an object with identity, the order of a class's fields is the layout of the bytes the host writes, and resources use explicit bindings, including `declare` declarations. [Types](languageTypes) states the struct surface and [Resources](languageResources) states the declarations.",
      callsH: 'Calls',
      callsP:
        'WGSL and GLSL ES disallow recursive call graphs. A compiler may inline helpers or emit supported calls. Hardware stack details do not define this language restriction.',
      callsRule:
        'What follows: recursion is rejected, and a helper is an ordinary function the compiler can follow to its leaves. [Functions](languageFunctions) states what a call may be.',
      loopsH: 'Loops',
      loopsP:
        'Invocations can follow different paths and iteration counts. Divergence may affect throughput. A loop does not synchronize an entire stage; communication needs the synchronization rules of its execution and memory scope.',
      loopsRule:
        'What follows: a `for` counts toward a bound its body does not move, and a `while` ends where its condition or a `break` says. [Control flow](languageControlFlow) states which conditions and loops compile.',
      typesH: 'Value types',
      typesP:
        'Shader variables have statically defined value types and representations. The compiler decides whether a value occupies registers or memory. A source type does not specify the hardware register allocation.',
      typesRule:
        'What follows: each shader value has a statically known GPU type such as `f32`, `u32` or `vec4`. [Types](languageTypes) states the type surface and [GPU types](languageGpuTypes) states the values.',
      tableH: 'Execution and language rules',
      tableP:
        'These execution properties and language restrictions inform the TypeShade rules linked below.',
      tableColumns: ['Execution or language constraint', 'What TypeShade asks for', 'Stated in'],
      tableRows: [
        [
          'Calls an entry point once per vertex, fragment or work item',
          'A stage decorator on the entry point and a parameter for every builtin input',
          '[Shader stages](languageStages)',
        ],
        [
          'Uses typed values and bound resources without a JavaScript object heap',
          'No growing array or string; `new` builds a value, structs describe layout, and resources use explicit bindings',
          '[Resources](languageResources)',
        ],
        [
          'Disallows recursive call graphs in WGSL and GLSL ES',
          'A nonrecursive call graph',
          '[Functions](languageFunctions)',
        ],
        [
          'Permits different invocation paths and iteration counts',
          'A loop bound the compiler can read',
          '[Control flow](languageControlFlow)',
        ],
        [
          'Defines static value types independently of register allocation',
          'A statically known value type per variable',
          '[GPU types](languageGpuTypes)',
        ],
      ],
      furtherH: 'Further reading',
      furtherItems: [
        '[WGSL specification](specWgsl) writes down the execution model these facts come from, including what an invocation is and what it may hold.',
        '[MDN WebGPU API](mdnWebgpu) is the browser side of the same model, written for a JavaScript developer.',
      ],
      nextP:
        'Next in this path: [The shader pipeline](conceptsPipeline), which says what each stage is handed and what it produces.',
    },

    pipeline: {
      title: 'The shader pipeline: vertex, fragment and compute stages',
      description:
        'The steps a GPU runs from a draw call to pixels, which of them run shaders, and what the vertex, fragment and compute stages each take and return.',
      h1: 'The shader pipeline',
      lead: 'A shader pipeline is the chain of steps a GPU runs for one draw. The vertex stage and the fragment stage are the shaders in it. Fixed steps sit between them: primitive assembly, clipping and rasterization. A compute pipeline holds one stage, the compute stage. This page says what each stage is handed and what it gives back, and leaves the syntax to the language guide.',
      drawH: 'Steps of a draw',
      drawP:
        'The [WebGPU specification](specWebgpu) defines a draw as these steps, in this order. A step that names an entry point runs your shader code. Fixed-function hardware runs the other steps.',
      drawColumns: ['Step', 'What runs', 'What it does'],
      drawRows: [
        [
          'Index resolution',
          'Fixed function',
          'Builds the list of vertices to process, from the index buffer or from the vertex count of the draw.',
        ],
        [
          'Vertex processing',
          'Your `@vertex` entry',
          'Runs once per vertex and returns a clip-space position and the values the fragment stage reads.',
        ],
        [
          'Primitive assembly',
          'Fixed function',
          'Groups the vertices into points, lines or triangles, as the pipeline topology says.',
        ],
        ['Primitive clipping', 'Fixed function', 'Cuts each primitive to the clip volume.'],
        [
          'Rasterization',
          'Fixed function',
          'Finds the fragments each primitive covers and the weight of each vertex at each fragment.',
        ],
        [
          'Fragment processing',
          'Your `@fragment` entry',
          'Runs once per fragment on the vertex outputs weighed for it, and returns a value for each colour attachment.',
        ],
        [
          'Output merging',
          'Fixed function',
          'Updates depth and stencil from the depth and stencil tests, then blends and writes the colours of each fragment that passed both.',
        ],
      ],
      stagesH: 'Stages',
      stagesP: 'Each row is one stage of the pipeline the host set up.',
      stagesColumns: ['Stage', 'What it is handed', 'What it produces'],
      stagesRows: [
        [
          'Vertex',
          'One vertex of the draw: its index in the draw, and the fields the host laid out in the vertex buffers.',
          'A clip-space position, and the values the fragment stage will read.',
        ],
        [
          'Fragment',
          'The values the vertex stage produced, weighed for this fragment, and the fragment’s own position.',
          'A value for each colour attachment the pipeline declares.',
        ],
        [
          'Compute',
          'Its own place in the dispatch grid, and the resources the host bound.',
          'Nothing given back; a compute entry writes through the resources it holds.',
        ],
      ],
      entryH: 'Entry points',
      entryP:
        'The signature of an entry point is that stage interface written out. A `@builtin(...)` parameter is a value the stage hands the invocation, such as the vertex index or the fragment position. A struct parameter is per-vertex input in a vertex stage and a weighed value in a fragment stage. The return type is what the stage gives back to the pipeline, so a vertex entry returns a position and a fragment entry returns colour. [Shader stages](languageStages) has the decorators and the spellings; this page stays with the meaning.',
      entryNote:
        'Reading a signature therefore tells you which stage the function belongs to, what the pipeline has to supply, and what the pipeline receives.',
      interpolationH: 'Interpolation',
      interpolationP:
        'Between the vertex stage and the fragment stage the rasterizer works out which fragments a primitive covers. For each of them it weighs the values the vertices produced by how near the fragment lies to each vertex, and hands the fragment stage the result. A vertex entry writes a value per vertex and a fragment entry reads a value per fragment, so the two are different values with the same name.',
      interpolationNote:
        'A float `@location` field is weighed this way unless `@interpolate` asks for another mode. An integer cannot be weighed, so the compiler gives `id` the `flat` qualifier on both targets without being asked, and the fragment reads the value one vertex of the primitive produced. `@interpolate("flat")` asks the same for `tint`. [Types](languageTypes) states the field decorators.',
      computeH: 'Compute',
      computeP:
        'A compute stage has no rasterizer in front of it and no attachment behind it. The host dispatches a grid of work items, the entry point reads its own coordinates in that grid from a builtin parameter, and everything it produces goes through a storage resource. [Resources](languageResources) states how a writable resource is declared.',
      furtherH: 'Further reading',
      furtherItems: [
        '[WebGPU specification](specWebgpu) defines the render and compute pipelines these stages belong to.',
        '[MDN GPURenderPipeline](mdnRenderPipeline) and [MDN GPUComputePassEncoder](mdnComputePass) show the host code that drives them.',
      ],
      nextP:
        'Next in this path: [WebGPU and WebGL2](conceptsWebgpu), which divides the work between the host application and the compiler.',
    },

    webgpuAndWebgl2: {
      title: 'WebGPU and WebGL2 compared: shaders, bindings and compute',
      description: `WebGPU and WebGL2 side by side for one shader source: WGSL and ${facts.glslTarget}, bind groups and uniform blocks, native and generated compute, and who owns what.`,
      h1: 'WebGPU and WebGL2',
      lead: `WebGPU and WebGL2 are the browser GPU APIs TypeShade compiles for. WebGPU takes WGSL, binds resources through bind groups and has a compute stage. WebGL2 takes ${facts.glslTarget}, binds a uniform block to a binding point and has no compute stage of its own. One TypeShade source compiles for both, and the table below sets them side by side. The sections after it say which side owns the device, the pipelines and the buffers in each of the three ways a host uses a module.`,
      compareH: 'Comparison',
      compareColumns: ['What differs', 'WebGPU', 'WebGL2'],
      compareRows: [
        [
          'Shader language',
          'WGSL. One module holds every stage.',
          `${facts.glslTarget}. A vertex shader and a fragment shader are linked into one program.`,
        ],
        [
          'Resource binding',
          'Bind groups, whose layout `reflect()` reads from the compiled module.',
          'No bind groups. A uniform block binds to a binding point, and a sampler is set through its uniform location.',
        ],
        [
          'Compute',
          'A native `@compute` stage.',
          `No native compute stage. TypeShade runs supported \`@compute\` entries as generated ${facts.glslTarget} passes, and the manifest names the entries it cannot lower.`,
        ],
        [
          'Precision',
          'A type carries its own width.',
          'Each program declares a default precision above its declarations.',
        ],
        [
          'GPU features',
          'The device is requested with the feature, and the emitted module declares an `enable` line where the feature has one.',
          'The host asks the context for the extension, and the emitted source declares a directive where the extension has one.',
        ],
        ['Order for an imported module', 'Tried first.', 'Tried second, before the CPU.'],
      ],
      usesP:
        "A host uses a TypeShade module one of three ways. It compiles the module and hands the shader text to its own WebGPU or WebGL2 code, which owns the device, the pipelines, the bind groups, the buffers and the textures. It imports the module through the Vite plugin and calls its entry points, and TypeShade's runtime creates those objects for the calls. Or it loads the compiled program into the program runtime and draws it in frames of its own: the runtime creates those objects, and the host keeps its render state and its frame loop. Knowing which side owns what is most of what a first TypeShade program needs.",
      ownsH: 'Ownership',
      ownsP:
        'One row per object a WebGPU application creates, for a host that compiles the module and wires it into its own code.',
      ownsColumns: ['Object', 'What the application does', 'What TypeShade contributes'],
      ownsRows: [
        [
          'Device',
          'Asks for an adapter and a `GPUDevice`, and keeps them for the life of the page.',
          'Nothing. The compiled module touches no WebGPU object.',
        ],
        [
          'Pipeline',
          'Creates a render or compute pipeline and names an entry point for each stage.',
          'The shader text of the module, and the name of every entry point in it.',
        ],
        [
          'Bind group layout',
          'Describes each binding by its group, its index, its kind and the stages that see it.',
          'That same description, read back from the compiled module by `reflect()`.',
        ],
        [
          'Buffer',
          'Allocates the buffer and writes the bytes into it.',
          'The offset, the size and the type of every field of a uniform struct.',
        ],
        [
          'Texture and sampler',
          'Creates them and puts them in a bind group.',
          'The binding the shader declares and the type it expects to find there.',
        ],
      ],
      importH: 'Importing a module',
      importP:
        "A host can import a `.shade.ts` into its own TypeScript through the `typeshade/vite` plugin instead, and call what the module exports. A helper runs on the CPU. A `@compute` entry is `await entry(bindings, workgroups)`, where `workgroups` may also be `{ indirect, offset }`: the three counts an earlier call wrote at element `offset` of a `Resident<Uint32Array>`, read when the call runs. A full-screen `@fragment` entry is `entry(canvas, bindings)`, drawn on WebGPU, then WebGL2, then the CPU. The application's column of the table above is then the runtime's: it requests the device on the first call and every later call shares it, builds each entry's pipeline, packs each binding from the object the call passes, and reads back what a compute entry wrote.",
      overrideP:
        'A compute entry also accepts `entry(bindings, workgroups, { constants: { WIDTH: width } })`. The names are the module’s declared overrides; omitted values keep their defaults. The selected values determine the workgroup shape, shared-array lengths and CPU invocation builtins. Calculate workgroup counts for that shape: selection does not change the count you pass. The runtime checks names, scalar ranges and device limits before uploads, and captures constants when the call is made.',
      overrideLimitsP:
        'The same device and entry reuse a pipeline for the same normalized constants and fp64 flavor. Use a small set of measured sizes. The CPU tier uses generated closures with the same constants and bounded workgroup allocations; barriers still need a GPU tier. WebGL2 pins ordinary constants but refuses a changed workgroup shape or workgroup-array length. The [host-compute example](exampleHostCompute) shows default, direct-specialized and device-plan calls, including the last partly occupied workgroup.',
      loadH: 'Loading a program',
      loadP:
        "A host that draws its own frames, an engine or a renderer, loads each compiled program into the program runtime, `typeshade/runtime`, and runs it there. A program travels as its manifest, one object that holds the shader code, the bindings and the entry points. `packModule(compile(source).module)` returns it, a module's host import gives it as its default export, and it is plain JSON a build can write to disk.",
      loadOwnsP:
        "The runtime then does most of what the table above gives the application. It uses the application's `GPUDevice` when `createRuntime({ device })` names one, and never destroys it, or requests a device with the features and limits the programs need and the limits `createRuntime({ limits })` names. It builds every pipeline and bind group from the layouts in the manifest, packs each binding from the value a draw or a dispatch passes by name, and makes the buffers, textures and samplers. The application writes what the compiler cannot know: each pipeline's targets, depth and topology, and when a frame is drawn. A `GPUBuffer`, `GPUTexture` or `GPUSampler` of its own binds as it is, and the frame's `encoder` and a pass's `raw` encoder take its own commands.",
      loadOptionsP:
        "Set a program's overrides by name through `RenderState.constants` for a draw or the `constants` option of `Program.compute()` for a dispatch. The compute pipeline resolves `workgroupShape` from the entry's defaults and selected values; read it before calculating dispatch counts. The runtime checks the selected shape against the active WebGPU device's limits. `Frame.submit()` returns the console's line and dropped-call counts for each recorded entry. A host with a console sink reads those counts to report calls that did not fit in the recording buffer.",
      loadEmitP:
        'A host that enables console recording after the build can pass `repack` from `typeshade/emit` as `createRuntime({ emit: repack })`. Build the manifest with `packModule(module, { ir: true })` so it carries the portable IR. The load-time emitter uses the emit options stored in the manifest and carries no TypeScript front end. The fuse scope, `fuse` from `typeshade/fuse`, stands beside it (Rule 11.11). `device.fuse()` records calls without a registration import and loads the planner when needed. The body runs synchronously once; queued calls and reads retain their order. Explicit imports remain supported.',
      loadNote:
        'The program runtime accepts WebGPU and WebGL2. The WebGL2 tier draws fragments and runs supported compute entries through generated GLSL ES 3.00 passes.',
      reflectionH: 'Reflection',
      reflectionP: `\`reflect()\` reads a compiled module and returns its bindings: the group and index the shader declared, the address space, the access the shader needs, and for a uniform struct the fields with their offsets and sizes under the ${facts.layoutStandards.join(' and ')} layouts. A host builds its bind group layout entries out of that list and packs its uniform buffer from those offsets. The numbers the shader was compiled with are the numbers the host writes, so the two sides stay in step.`,
      reflectionNote:
        'A field renamed in the shader changes the reflection at the next build, and the host code that reads the reflection follows it.',
      runtimeH: 'Runtime',
      runtimeP: `A module the host compiles needs nothing of TypeShade in the browser. The compiler runs where the shader text is produced: in a build, in a test, or in an editor through the [language service](languageService), and what reaches the browser is the emitted shader source and the host code the application already had. A module the host imports carries \`typeshade/runtime\` into the bundle, the code its calls run on, and no compiler, because the Vite plugin compiles the module when the bundle is built. A call runs on the first tier the browser has, WebGPU, then WebGL2, then the CPU; \`configure({ prefer })\` orders the tiers a compute entry and a kernel function try, and a \`Resident\` keeps an array on the GPU between calls. A host that loads programs into the program runtime ships the same \`typeshade/runtime\` and the manifests, and no compiler either. TypeShade installs ${facts.runtimeDeps} runtime dependency, TypeScript, which \`compile()\` and the language service read source with.`,
      runtimeOwnerP:
        "A host can also open an owner of its calls with `createDevice()` from `typeshade/runtime` (Rule 11.8). It opens on the first tier of `prefer` that opens, on a `GPUDevice` the host already has, or on a program runtime's device, `createDevice({ runtime })`. `device.array()` makes the `Resident` arrays its calls take, and `device.fuse()` runs a chain of calls as one plan on that device. Ordinary calls infer the unique owner of their arrays and textures. Calls without owned resources use the default owner. Mixing owners is refused before execution; ownership and lifetime checks still apply. `prefer`, `device` and `runtime` are mutually exclusive source options. The owner also picks the flavor of the emulated double, `createDevice({ fp64Flavor })`, and the time one chunk of a long kernel may take, `createDevice({ timeBudgetMs })`. Omitting `fp64Flavor` means automatic selection from the actual device or context; explicit overrides remain available. `configure()`, `resident()` and `fuse()` work on the default owner as before.",
      runtimeInfoP:
        '`buildInfo` reports the package version and a nullable exact source revision. Modified, stale or unstamped builds report `revision: null`. `device.info` and `runtime.info` are frozen, serializable records of the actual opened device or context, readable after loss or disposal. WebGPU identity has explicit provenance and enabled device capabilities; unavailable identity stays unknown. WebGL strings come from the actual context. This information does not identify the tier of each call or send a report. The runtime build, producing compiler and benchmark workload have separate provenance.',
      webgl2H: 'Where WebGL2 differs',
      webgl2P: 'The same source compiles for WebGL2, and the host side of it looks different.',
      webgl2Items: [
        'There are no bind groups. A uniform block is bound to a binding point on the linked program and a sampler is set through its uniform location, so a host uses the same reflection in a different shape.',
        `WebGL2 has no native compute stage. TypeShade lowers supported \`@compute\` entries into ${facts.glslTarget} passes using the WebGL2 runtime. The manifest names entries that cannot be lowered.`,
        `Precision belongs to the source. Every emitted ${facts.glslTarget} program declares its default precision above its declarations, which WGSL has no need of.`,
        'A GPU feature is turned on by the host, which asks the context for the extension, and where the extension has a directive the emitted source declares it as well. [Compiler internals](internals) describes how the compiler splits those halves.',
      ],
      furtherH: 'Further reading',
      furtherItems: [
        '[MDN WebGPU API](mdnWebgpu) and [MDN GPUBindGroupLayout](mdnBindGroupLayout) are the host objects this page names.',
        '[MDN WebGL2RenderingContext](mdnWebgl2) is the older context, with the uniform and sampler calls the WebGL2 path uses.',
        '[WebGPU specification](specWebgpu) and the [WebGL2 specification](specWebgl2) define the two host APIs.',
      ],
      nextP:
        'Next in this path: [WGSL and GLSL](conceptsWgsl), which prints what one source compiles to on both targets.',
    },

    wgslAndGlsl: {
      title: `WGSL vs ${facts.glslTarget}: differences and one source for both`,
      description: `WGSL and ${facts.glslTarget} compared on one shader: the types, builtin variables and function names that differ, as the TypeShade compiler writes them.`,
      h1: `WGSL vs ${facts.glslTarget}`,
      lead: `One \`"use typeshade"\` file reaches WebGPU as WGSL and WebGL2 as ${facts.glslTarget}. The compiler spells ${facts.builtins} builtins, and ${facts.portableBuiltins} of them are written the same way in both languages. The blocks on this page are compiled while the page is built, from the file above them, by the compiler pinned at ${facts.pinnedCommit}.`,
      sourceH: 'The source',
      sourceP:
        'A triangle, with a vertex entry that places it and a fragment entry that colours it. The two structs give each stage its output shape.',
      sourceLabel: 'hello.shade.ts',
      wgslH: 'WGSL',
      wgslP:
        'WGSL is the language a WebGPU device accepts, and one module holds every stage. The structs survive as structs, each entry point keeps its stage attribute, and the builtin input stays an attribute on the parameter that receives it.',
      wgslLabel: 'The emitted WGSL module',
      glslH: `${facts.glslTarget}`,
      glslP: `A WebGL2 program is linked from one vertex shader and one fragment shader, so the compiler emits a separate program for each stage. Each one opens with its version line and its default precision, the vertex index arrives under the name the language reserves for it, and the fragment output becomes a declared out variable.`,
      glslVertexLabel: `The emitted ${facts.glslTarget} vertex shader`,
      glslFragmentLabel: `The emitted ${facts.glslTarget} fragment shader`,
      diffH: 'Where the targets differ',
      diffP: `Each difference is named by the page of the guide that handles it. Where the two disagree, WGSL defines what a construct means, and ${facts.glslTarget} is a target the compiler writes to (Rule 1.2).`,
      diffColumns: ['What differs', 'WGSL', `${facts.glslTarget}`],
      diffRows: [
        [
          '[Compute stages](languageStages)',
          'A `@compute` entry emits a compute shader carrying its workgroup size.',
          'WebGL2 has no native compute stage. TypeShade runs supported compute entries through generated GLSL ES 3.00 passes.',
        ],
        [
          '[Precision](languageGpuTypes)',
          'A type carries its own width, so the program declares nothing.',
          'The program opens with a default precision for floating-point and integer values.',
        ],
        [
          '[Builtin inputs](languageStages)',
          'A builtin stays an attribute on the parameter that receives it.',
          'A builtin becomes the name the language reserves for it, and the parameter goes away.',
        ],
        [
          '[Stage outputs](languageTypes)',
          'A stage returns a struct whose fields carry their locations.',
          'A stage writes to declared out variables, and the position goes to the reserved one.',
        ],
        [
          '[Extensions](internals)',
          'A GPU feature is turned on by a declaration at the top of the module.',
          'A GPU feature is turned on by a preprocessor line, and the host asks the context for the matching extension.',
        ],
      ],
      namesH: 'Names that differ',
      namesP: `Each row is one construct. The ${facts.glslTarget} and WGSL cells are the text the compiler at ${facts.pinnedCommit} writes for the TypeShade cell. A spelling the compiler changes reaches this table at the next pin.`,
      typesH: 'Types',
      variablesH: 'Builtin variables',
      functionsH: 'Functions',
      meaningH: 'Same name, other meaning',
      meaningP:
        "A few names are in both languages and mean different things. GLSL's `mod` rounds the quotient down, and WGSL's `%` truncates it toward zero. WGSL's `round` sends a half to the even integer and GLSL's may send it either way, so the compiler writes `roundEven`. TypeShade has `mod` and `%`, and the compiler writes each target the text that keeps the meaning.",
      swizzleP:
        'GLSL can assign to several components at once, as in `c.xy = uv`. WGSL writes one component at a time, so the compiler refuses that assignment with `TS8018`. An assignment to one component, `c.x = uv.x`, compiles.',
      colGlsl: `${facts.glslTarget}`,
      colWgsl: 'WGSL',
      colSource: 'TypeShade',
      convertH: 'Converting a shader',
      convertP: `\`compile()\` reads one kind of source, a \`"use typeshade"\` file, which is TypeScript. The compiler has no GLSL or WGSL front end, so a shader in either language is written once more in TypeScript. The compiler then writes the WGSL and the ${glsl} from that one file.`,
      convertItems: [
        `From GLSL: [Migrating a GLSL shader](internalsGlslShader) covers what a whole shader carries, such as uniform blocks, \`#ifdef\`, \`#include\` and \`#extension\`. [${glsl} in TypeShade](languageFromGlsl) has the types, uniforms, builtin variables and functions.`,
        'From WGSL: [WGSL in TypeShade](languageFromWgsl) gives each WGSL construct its TypeShade spelling.',
        'Only in WGSL: a file that uses such a construct still compiles. A scalar uniform, a `"read_write"` storage binding in a draw and `@interpolate("linear")` are examples. `compile()` then keeps the WGSL, leaves `glsl` undefined and says why in a `TS8015` warning.',
      ],
      furtherH: 'Further reading',
      furtherItems: [
        '[WGSL specification](specWgsl) defines the first of the two targets.',
        `[${facts.glslTarget} specification](specGlslEs) and the [WebGL2 specification](specWebgl2) define the second.`,
        '[MDN WebGPU API](mdnWebgpu) and [MDN WebGL2RenderingContext](mdnWebgl2) show how a host hands each of them to a driver.',
        `[Functions](referenceFunctions) in the language reference gives each builtin with the WGSL and ${facts.glslTarget} text the compiler writes for it, and [Types](referenceTypes) does the same for every type.`,
        `[Builtin functions](languageBuiltins) lists all ${facts.builtins} builtins on one page, with the text each backend writes. ${facts.glslAbsentBuiltins} of them have no ${glsl} form.`,
      ],
      nextP:
        'Next: [Examples](examples), where every example in the compiler’s registry names the targets it emits.',
    },
  },

  /** The language service page at /guide/language-service/, rendered by
   *  src/components/pages/LanguageServicePage.astro. The TypeScript sample is not copy, so it stays there. */
  languageService: {
    title: 'TypeShade language service for editors and language servers',
    description:
      'The editor-neutral layer behind the Playground: TypeScript and TypeShade diagnostics, completions, hover, rename and compiled output from one document API.',
    h1: 'Language service',
    intro:
      "The language service is the layer between the compiler's front end and an editor. It takes text and positions and returns data, and it touches no DOM or Node API. The Playground reads its diagnostics, completions and hover from it today, through the Monaco editor, and the [VS Code extension](editor) reads them through a TypeScript server plugin, so the two cannot drift apart. A language server for other editors is not published yet.",
    layersH: 'Layers',
    layersP: `The front end parses a \`"use typeshade"\` file, checks its types, structs and bindings, and reports diagnostics with source positions. The language service sits on top of the front end and of the TypeScript language service, which runs over an ambient declaration of the TypeShade globals, and answers requests about documents it holds by \`uri\`. Adapters sit above it and do nothing semantic: the Playground's Monaco adapter converts coordinates and owns the editor's markers, and an LSP server would carry the same answers over JSON-RPC. A judgement about TypeShade belongs in the service; an adapter converts.`,
    requestsH: 'Requests',
    requestsP: 'One document API answers the requests an editor makes.',
    requests: [
      [
        'Diagnostics',
        'TypeScript and TypeShade diagnostics in one list. Each carries a `source` of `typeshade` or `typescript` and a code, so an adapter can tell the two apart, and a TypeScript parse error appears once, under its TypeScript code.',
      ],
      [
        'Completions',
        'The symbols in scope, the keywords, and TypeShade items where the context calls for them: attribute names after `@`, builtin input names inside `@builtin("`, GPU type names in a type position, and snippets for vectors and entry functions.',
      ],
      [
        'Hover',
        'Quick info for a symbol, with the TypeShade type name where TypeScript would say `number`, and documentation for GPU types, attributes and builtin inputs.',
      ],
      [
        'Signature help',
        'The signatures of the function under the cursor and the parameter being typed.',
      ],
      [
        'Definition and references',
        'Where a symbol is declared and where it is used, across the documents the service holds.',
      ],
      [
        'Document symbols',
        'The functions, structs, fields and resources of a document as an outline, with an entry function labelled by its stage.',
      ],
      [
        'Rename',
        'The edits that rename a symbol in every document that uses it, after a check that the position can be renamed at all.',
      ],
      [
        'Semantic tokens',
        'The tokens in document order, with GPU types, entry functions, resources and the names inside `@builtin(...)` marked as such.',
      ],
      [
        'Compiled output',
        'The WGSL or GLSL a document compiles to, on demand for an output pane. Diagnostics produce no shader text, so a keystroke does not run a backend.',
      ],
    ],
    documentsH: 'Documents and positions',
    documentsP1:
      "Import `createTypeshadeLanguageService` from the `typeshade/language-service` subpath and open a document by `uri` with its text and an optional version. Update it with the whole text on each change and close it when the editor does; every other method takes the `uri` and, where it applies, a position. Nothing in the service is asynchronous, and a result for a stale version is the adapter's to drop.",
    documentsP2:
      "Positions are zero-based line and character pairs, with the character counted in UTF-16 code units, and a range is half-open with its end exclusive. These are the conventions LSP uses, so a language server passes them through field for field. Monaco counts from one, so the Playground's adapter adds one on its own side and takes it off on the way back; that adapter is the only place the two coordinate systems meet.",
    documentsP3:
      "A document can import another shader file by a relative path, or a package's by the package's name, found in `node_modules` the way Node finds one (Rule 3.9). The service resolves the import against the document's `uri` by the rule `compile()` follows, or through the `resolveImport` you pass it, and reads a file it has not opened through `readDocument`, which returns the file's text or `undefined` and is asked for each package's `package.json` too. `compile()` takes the same two options, so the editor and the compiler read one program, and an import the two cannot follow is `TS8072` in both.",
    packagingH: 'Packaging',
    packagingP:
      'The service runs on `typescript`, which the package lists as a required peer dependency. The main entry needs it too, because `compile()` reads a `"use typeshade"` file with the TypeScript parser, so a program that imports only the compiler installs it as well, and `typeshade/language-service` uses that same copy.',
    exampleH: 'Example',
    exampleP:
      'A host opens one document, asks for its diagnostics and for the hover at a position, and compiles it for an output pane.',
    furtherH: 'Further reading',
    furtherP:
      "The [Playground](playground) is the service at work in a browser. The [design document](languageServiceDesign) in the compiler's repository, at the pinned commit, records the conventions, the adapter contracts and the order of work.",
  },

  // The editor page at /guide/editor/: how to install the VS Code extension and what it gives
  // a `"use typeshade"` file. Every claim is one the extension's own README makes, including
  // what its web tests did and did not cover (vscode-typeshade, packages/vscode-typeshade).
  editor: {
    title: 'Editor support: TypeShade in VS Code',
    description:
      'Install the TypeShade extension for VS Code, and see what it gives a "use typeshade" file on the desktop and in VS Code for the Web.',
    h1: 'Editor support',
    intro:
      'TypeShade has an extension for VS Code. In a file that starts with `"use typeshade"` it shows the compiler\'s diagnostics, hover and completion, and it previews the WGSL and GLSL the file compiles to.',
    installH: 'Install',
    installP:
      'Install `typeshade.vscode-typeshade` from the [Visual Studio Marketplace](extensionMarketplace), or from [Open VSX](extensionOpenVsx) in an editor that installs from there. From a terminal, one line does it:',
    installLabel: 'Install from the command line',
    installP2:
      'The desktop needs VS Code 1.90 or newer. The extension turns its TypeScript server plugin on for the TypeScript version the workspace uses, so a repository that pins its own `typescript` gets the plugin too.',
    desktopH: 'In VS Code',
    desktopP:
      'Open a file that starts with `"use typeshade"`. The extension answers for it the way the compiler does.',
    desktopItems: [
      "Diagnostics, hover, completion, signature help, go to definition, references and rename come from the TypeShade language service, through a TypeScript server plugin. TypeScript's own false errors on a shader file go away. Every other TypeScript file is left as it is.",
      '`TypeShade: Show WGSL`, `TypeShade: Show GLSL` and `TypeShade: Show Reflection` open a preview beside the editor. It follows the active file and recompiles as you type.',
      '`TypeShade: Show Canvas` draws the shader in the preview with WebGPU. It needs a VS Code webview that has a WebGPU adapter, and says so where there is none.',
      '`TypeShade: Run Entry on CPU` runs a function of the file on the CPU with the arguments you type.',
    ],
    webH: 'VS Code for the Web',
    webP: 'On vscode.dev and other VS Code for the Web pages, a shader file gets diagnostics, hover and imports between shader files, through the same plugin. Every command above needs the desktop version. On the web each one shows a message that says so and does nothing else.',
    webConditionsP: 'Two conditions apply.',
    webConditions: [
      "VS Code for the Web 1.110 or newer. An older one does not load the plugin, so TypeScript's own false errors stay on a shader file.",
      'A page that is cross-origin isolated. Without it the TypeScript server runs no semantic checks in the browser, so neither TypeShade nor TypeScript reports an error. A VS Code for the Web you host yourself needs the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers.',
    ],
    webTestedP:
      'When a condition is missing, the extension shows a warning once. The web build was tested in Chromium on VS Code for the Web 1.110 and 1.139.1, and no other browser was tried. On vscode.dev itself the published extension was checked by hand: the page and the TypeScript servers are cross-origin isolated, and the diagnostics and hover arrive. github.dev was not checked, and completion, signature help, references and rename have no browser test.',
    roundH: 'Playground round trip',
    roundP1:
      "The [Playground](playground)'s Download as a folder button downloads a zip of the workspace as a folder: the files, a `typeshade.json` that names the main file and the passes, and a recommendation for this extension. Open in VS Code, the button beside it, hands the workspace to the extension, which asks for a folder, writes the files there and opens it.",
    roundP2:
      'In the other direction, `TypeShade: Open in Playground` opens the active file, the files it imports and its passes in the Playground. `TypeShade: Open Playground Link` writes the workspace that a Playground link carries to a folder and opens it. Both need the desktop version.',
    agentsH: 'Coding agents',
    agentsP:
      '[`@typeshade/mcp`](mcpPackage) is a Model Context Protocol server on npm. It gives a coding agent the diagnostics the editor shows, the WGSL and GLSL the compiler emits, types and navigation, and a run of a shader function on the CPU. Claude Code, Codex, Cursor, VS Code agent mode and Gemini CLI can start it. In Claude Code, one plugin installs the server together with a skill that teaches the language:',
    agentsLabel: 'Install the Claude Code plugin',
    agentsP2:
      'The other clients run `npx -y @typeshade/mcp`, and [the package README](mcpReadme) has the settings for each.',
    sourceP:
      'The extension and the server are developed in [typeshade/vscode-typeshade](extensionSource).',
  },

  examples: {
    path: {
      h: 'Learn TypeShade by building',
      p: 'Each step connects one Language Guide concept to actually writing a shader.',
      steps: pathSteps([
        {
          title: '1. First shader',
          text: 'Start with the shape of a "use typeshade" file and its shader entries.',
          label: 'Quick start',
          linkKey: 'quickStart',
        },
        {
          title: '2. Values and types',
          text: 'See how TypeScript type aliases and classes become GPU value layouts.',
          label: 'Types',
          linkKey: 'languageTypes',
        },
        {
          title: '3. Compose functions',
          text: 'Combine helper functions with stage entries to build shader calculations.',
          label: 'Functions',
          linkKey: 'languageFunctions',
        },
        {
          title: '4. GPU data',
          text: 'Connect vectors, matrices, arrays, and host-owned shader resources.',
          label: 'Resources',
          linkKey: 'languageResources',
        },
        {
          title: '5. Real examples',
          text: 'Read the repository examples and combine the language pieces into complete shaders.',
          label: 'Source examples',
          linkKey: 'examplesDir',
        },
      ]),
    },
    title: `TypeShade examples: ${facts.shadeExamples} shaders, GLSL emit, emulated f64`,
    description: `The ${facts.shadeExamples} TypeShade examples, the ${glsl} emit of the gradient pass, and a deep-zoom demo of emulated double precision.`,
    h1: 'Examples',
    intro: `There are ${facts.shadeExamples} runnable examples in the repository, from cartographic passes and the ShaderToy-era screen-space effects to compute kernels; ${facts.fp64Examples} of them use emulated double precision. Browse [the examples directory](examplesDir).`,
    wgslOnly: 'WGSL only',
    /** A tile whose example has nothing the page can draw shows Ant's Empty mark and this
     *  line instead of a bare grey frame. */
    noStill: 'No picture: this example is not one the page can draw.',
    /** The gallery's last group, which the page fills in from the example data when the
     *  compiler has examples this build does not (src/scripts/examples-runtime.ts). */
    runtime: {
      h: 'Added since this build',
      p: 'The compiler has these examples and this build of the site does not yet. Their pages are filled in from the example data its main branch published.',
    },
    /** Every example: one TypeScript file each, compiled from the file itself. Grouped by
     *  what each file is there to show, because the compiler files them all under one
     *  category and a reader looking for inheritance wants them apart. The titles and the
     *  lines under them are the registry's own words in English, and a source twin's line is
     *  the one the registry writes for the example it ports (src/lib/examples.ts twinBlurbs);
     *  a translation writes its own against the same keys. */
    shade: {
      h: 'Written as TypeScript source',
      p: `Each example is a TypeScript file that opens with \`"use typeshade"\`, compiled by \`compile()\` from the file's own bytes. Each one is there for one part of the language, and they are grouped here that way. ${facts.shadeRenderable} have a ${glsl} form and the others emit WGSL alone. The ones the page can draw carry a picture.`,
      groups: {
        cartographic: 'Cartographic',
        screen: 'Screen space',
        stages: 'Stages and IO structs',
        resources: 'Resources',
        values: 'Values and control flow',
        classes: 'Classes and generics',
        imports: 'Imports',
        passes: 'Several passes',
        compute: 'Module state and compute',
        kernels: 'Loops as kernels',
      },
      titles: shadeTitles(),
      descriptions: { ...shadeDescriptions(), ...twinBlurbs() },
    },
    /** The host examples (compiler change 0061): a `"use typeshade"` module and the host file
     *  that runs it, after the `.shade.ts` groups. The titles, the lines under the tiles and the
     *  paragraph each page opens with are the compiler's own words in English
     *  (src/lib/host-example-pages.ts); a translation writes its own against the same keys. */
    host: {
      h: 'Host examples',
      p: 'Each of these is two files: a `"use typeshade"` module and the `host.ts` that runs it, written the way an application writes it. The host imports the module through the Vite plugin and calls what it exports. Each page shows both files and the tiers the host runs on.',
      /** The tile's cover, which has no picture: the page shows two files and draws nothing. */
      cover: 'Two files: the module and the host that runs it.',
      titles: hostTitles(),
      descriptions: hostDescriptions(),
      blurbs: hostBlurbs(),
      /** The page one host example gets, at /guide/examples/<id>/. */
      page: {
        // The longest suffix that keeps the title within the 60 characters check-seo.mjs
        // enforces; the page asserts the 45 to 60 the SEO review wants.
        title: (name: string) => {
          const suffixes = [
            ', a TypeShade host example with both files',
            ', a TypeShade host example',
            ' in TypeShade',
          ];
          return name + (suffixes.find((s) => (name + s).length <= 60) ?? '');
        },
        files: 'The module and its host',
        module: 'Module',
        host: 'Host file',
        tiersLabel: 'Runs on',
        tiers: { webgpu: 'WebGPU', webgl2: 'WebGL2', cpu: 'CPU tier' },
        tiersNote:
          "The compiler checks this list: a tier is on it exactly when the host's whole run gives the reference with that tier alone. Its journeys gate runs each host on WebGPU and on WebGL2, and its unit suite runs each one on the CPU tier.",
        filesNote: `Both files are the compiler's own at commit ${facts.pinnedCommit}, from [the examples directory](examplesDir).`,
        moduleLink: 'Module on GitHub',
        hostLink: 'Host file on GitHub',
      },
    },
    /** The page one example gets, at /guide/examples/<id>/. Every tile in the gallery links
     *  here, and the file on GitHub is one link in the row at the foot of the page. */
    page: {
      // The title names the example and takes the longest suffix that still fits under the
      // 60-character ceiling check-seo.mjs enforces, the way docs.api.pageTitle does. The
      // suffixes step down by no more than 15, so every name up to 47 characters lands over the
      // SEO review's 45-character floor. A longer name is the compiler's own title written as
      // a sentence ("An integer varying, and the interpolation it has no choice about"), and
      // no suffix fits it; the title then takes the name up to its first comma, which names
      // the example on its own, and the page's heading keeps the whole of it.
      // src/components/pages/ExamplePage.astro asserts both ends for all of them.
      title: (name: string) => {
        const suffixes = [
          ', a TypeShade example with its source and emitted code',
          ', a TypeShade example and the code it emits',
          ', a TypeShade shader example',
          ' in TypeShade',
        ];
        const fit = (n: string): string | undefined => {
          const suffix = suffixes.find((s) => (n + s).length <= 60);
          return suffix === undefined ? undefined : n + suffix;
        };
        // A name over 60 with no comma to cut at ("Local functions that read and write the
        // variables around them") is cut at a word, and the page's heading keeps the whole.
        const cut = (n: string): string =>
          n.length <= 60 ? n : `${n.slice(0, 59).replace(/\s+\S*$/, '')}…`;
        return fit(name) ?? fit(name.split(', ')[0]!) ?? cut(name);
      },
      description: (name: string, blurb: string) => `${name}, a TypeShade example. ${blurb}`,
      /** Added when an example's own line leaves the description under the 70 characters the
       *  SEO checks want. */
      descriptionPad: `The source, the WGSL it emits and the ${glsl} stages, on one page.`,
      source: 'Source',
      tabs: 'Source and emitted output',
      /** What the line under the card says, by what drew the frame. The front page's tiles
       *  used to carry this wording; they are stills now, so the example pages keep it. */
      canvas: (name: string) => ({
        neutral: `${name}, drawn at build time.`,
        webgpu: `${name}, running on WebGPU.`,
        webgl2: `${name}, running on WebGL2.`,
        none: `${name}, drawn at build time; this browser has no WebGPU or WebGL2.`,
        reduced: `${name}, one frame, since this system asks for less motion.`,
      }),
      emittedNote: `The WGSL and GLSL tabs are the compiler's own output at commit ${facts.pinnedCommit}, read from the goldens its emit suite bakes ([emit-goldens.test.ts](goldens)).`,
      wgsl: 'WGSL',
      /** The tab over a pane. Four tabs share the card's right half, so a tab carries the
       *  language and the stage; the full target name is in the line under the card and on
       *  the pane itself. */
      glslVertexTab: 'GLSL vertex',
      glslFragmentTab: 'GLSL fragment',
      /** The pane's own accessible name, where the target is named in full. */
      glslVertex: `${glsl} vertex`,
      glslFragment: `${glsl} fragment`,
      github: 'File on GitHub',
      playground: 'Open in the Playground',
      /** The line over the tool on a `.shade.ts` example's page, which carries the whole
       *  Playground seeded with that file. */
      editable:
        "The editor holds this example's own file, and the program is that file and any file it imports. An edit recompiles it in your browser, and the tabs beside the editor follow.",
      /** The template page the Worker fills in for an example the compiler added after the
       *  site was built (worker/index.ts). Its own words stand in until the Worker writes the
       *  example's, and `note` is the line the filled page keeps. */
      runtime: {
        title: 'A TypeShade example newer than this site build',
        description:
          'A TypeShade example the compiler added after this site was built, with its source file and the WGSL and GLSL it emits.',
        name: 'A TypeShade example',
        blurb: 'An example the compiler added after this site was built.',
        note: "The compiler added this example after the site was last built, so this page is filled in from the example data its main branch published. The next build gives it a picture and the site's own words.",
      },
      /** What the page says where it draws no picture, one line per reason in
       *  NO_STILL_REASONS (scripts/artifacts.mjs). */
      noPicture: {
        'no-glsl': `This example has no ${glsl} form, and the canvas runs one program on both backends, so the page shows no picture.`,
        control:
          'This example is steered by a control the page has no value for, so the page shows no picture.',
        texture:
          'This example reads a texture the page has no data for, so the page shows no picture.',
        uniform:
          'This example declares a uniform field the page has no value for, so the page shows no picture.',
        'vertex-buffer':
          'This example reads its vertex attributes from a buffer the page does not bind, so the page shows no picture.',
      },
    },
    glsl: {
      h: `The gradient pass in ${glsl}`,
      p1: `The gradient pass, \`${hero.file}\`, emits this ${glsl} \`main\` for its fragment stage:`,
      p2: `The whole module is ${hero.emit.wgslLines} lines of WGSL; the GLSL vertex stage is ${hero.emit.glslVertexLines} lines and the fragment stage ${hero.emit.glslFragmentLines}. Uniform types, byte offsets, bind-group entries and entry signatures come from [\`reflect()\`](apiReflect), which reads the same intermediate representation and stays off the emit path, so a host can pack its uniform buffer from that layout. [Verification](checks) shows the reflected layout of a uniform block beside the diagnostic for a misspelt field.`,
    },
    f64: {
      h: 'Emulated double precision',
      p1: `Neither WGSL nor ${glsl} has a double-precision float. TypeShade emulates one as an unevaluated pair of f32 values, and lowers arithmetic, comparisons and a set of builtins into calls on that pair. An operation outside that set fails at emit with a coded error. What you write is unchanged: only the declared type differs. In the deep-zoom example the \`${facts.deepZoomOrigin.name}\` field is declared \`${facts.deepZoomOrigin.sourceType}\` in the source and occupies a \`${facts.deepZoomOrigin.layoutType}\` slot in the uniform block, which the host fills with the split pair.`,
      p2: 'A module that does f64 arithmetic also carries an injected guard texture binding for the host to fill with a single white texel. A downstream shader compiler cannot fold a texel read, and without one it is free to optimise the error-compensation terms away. Each operation costs several times its f32 equivalent, so the type is opted into per value. The example is [fp64-deep-zoom-twin.shade.ts](deepZoom).',
      p3: "The guard belongs to the `'float'` flavor of the emulation. An Apple GPU needs the `'integer'` flavor, which computes the same terms through integer operations and binds no guard. The default is automatic selection from the actual device or context, with an available user-agent fallback. Apple or Metal signals select `'integer'`; CPU and unknown GPU signals select `'float'`. An unknown signal does not prove extended precision. `createDevice({ fp64Flavor })` or `configure({ fp64Flavor })` can override this choice. `recommendFp64Flavor` exposes the selector.",
      caption: `One world coordinate drawn twice: ${split[0]} on the left, ${split[1]} on the right. The ${split[0]} half draws the stripes as steps because one ${split[0]} ulp at this distance is coarser than the fraction a stripe needs; the other half draws them smooth.`,
      captionNone: 'Rendered at build time; this browser has no WebGPU or WebGL2.',
    },
  },

  guide: {
    title: 'TypeShade authoring guide: writing shaders in TypeScript',
    description:
      'The authoring surface of TypeShade, section by section: values, control flow, layouts, diagnostics, emulated f64, production emit and migrating a GLSL shader.',
    contents: 'Contents',
    /** A section's page title, from the title in `sections`. */
    sectionTitle: (title: string) => `${title}, TypeShade authoring guide`,
    /** Every section with a page of its own: what the sidebar, the h1 and the title show. */
    sections,
    /** Quick reference has no prose to open a section with, just its table: the heading
     *  src/lib/remark-promote-bold-leads.mjs adds in front of it, so the page still has one. */
    referenceTableHeading: 'Reference table',
    note: `Rendered from [AUTHORING.md](guideSource) at commit ${facts.pinnedCommit}. The package is imported here by its ${facts.nextVersion} name, \`typeshade\`.`,
    noteUntranslated: `Rendered from [AUTHORING.md](guideSource) at commit ${facts.pinnedCommit}. The package is imported here by its ${facts.nextVersion} name, \`typeshade\`.`,
  },

  // The language guide: src/components/pages/LanguagePage.astro and the Language*Page.astro topic pages.
  language: {
    overview: {
      title: 'TypeShade language guide',
      description:
        'Examples explain TypeShade syntax, GPU types, resources, shader stages and execution rules.',
      h1: 'TypeShade language guide',
      intro:
        'TypeShade uses TypeScript syntax for shader source. This guide explains what the compiler accepts and what the GPU runs.',
      boundaryH: '1. What is `use typeshade`?',
      boundaryP:
        '`"use typeshade"` marks a TypeShade shader file. The compiler applies TypeShade rules for GPU types, resources, stages and builtin inputs.',
      boundaryNote: 'The directive must appear first in the file.',
      syntaxH: '2. TypeScript syntax',
      syntaxP:
        'TypeShade uses TypeScript syntax for variables, functions, type aliases, classes, conditionals and loops. The compiler accepts only values and operations it can lower to GPU code.',
      syntaxTableHeader1: 'TypeScript',
      syntaxTableHeader3: 'GPU meaning',
      syntaxTableRows: [
        [
          'function',
          'helper or entry point',
          'The compiler lowers supported function bodies to GPU code.',
        ],
        ['type', 'GPU value type', 'The compiler checks it against GPU type rules.'],
        ['class', 'GPU struct', 'It defines a struct; it does not create a JavaScript object.'],
        [
          'if / for',
          'GPU control flow',
          'The compiler checks conditions and loops for GPU support.',
        ],
      ],
      gpuH: '3. GPU interface',
      gpuP: 'The source declares the GPU interface. Use `declare` for resources, stage decorators for entry points, and `@builtin(...)` parameters for GPU inputs.',
      gpuNote:
        'The shader does not create `camera` or `pixels`; the host provides them. `gid` is a function parameter, not a global.',
      functionH: '4. Functions and entry points',
      functionP:
        'Parameters and return types define a function’s inputs and result. Stage decorators and builtin parameters define an entry point’s GPU role.',
      functionNote:
        '`addBias` is a reusable helper. `paint` is a compute entry point. They use the same function syntax but have different pipeline roles.',
      resourceH: '5. GPU resources',
      resourceP:
        '`uniform<T>` and `storage<T>` name GPU resources supplied by the host. `declare` marks resources that the shader does not create.',
      resourceNote:
        'Declare each resource with `const`. `storage<T>` is read-only; `storage<T, "read_write">` also allows writes.',
      stageH: '6. Shader stages',
      stageP:
        '`@vertex`, `@fragment` and `@compute` mark an entry point’s stage. Declare GPU builtins as parameters; the compiler does not inject them as globals.',
      completeH: '7. Complete example',
      completeP:
        'This example combines the directive, a GPU struct, resources, a compute entry point and a builtin parameter.',
      tsH: '8. TypeScript and TypeShade',
      tsRows: [
        ['`declare`', 'Names a GPU resource supplied by the host.'],
        ['function parameter', 'Holds a GPU value or a stage builtin input.'],
        ['class', 'Defines a GPU struct and its field metadata.'],
        ['number', 'Use GPU numeric types such as `f32`, `i32` and `u32`.'],
      ],
      tsNote:
        'TypeShade keeps TypeScript syntax and gives it GPU semantics. JavaScript runtime behavior does not carry over automatically.',
      refsH: '9. Further reading',
      refsP:
        'Read the TypeScript Handbook for types and functions, review the JavaScript execution model, then continue with the GPU concepts.',
      nextH: '10. Learning path',
      nextP:
        'Start with Quick start, then read Types, Functions, Control flow, GPU types, Resources and Shader stages in order.',
      nextLink: 'Quick start',
    },
    topics: {
      stringKeys: {
        title: 'String keys and Record in TypeShade',
        description:
          'Use closed sets of names as GPU ids, index a Record by a key, and call the shader from JavaScript.',
        h1: 'String keys and Record',
        intro:
          'A union of string literal types is a key type. It names a closed set of values such as channels or modes.',
        keys: 'Key types',
        keysP:
          'The compiler sorts members by UTF-16 code units and assigns a `u32` id to each member. A single string literal type is also a key type. Equal member sets give the same ids. The GPU receives the id on every target.',
        operationsP:
          'A key supports equality and `switch` over its members. Arithmetic, ordering and conversion to a number are refused. A string literal becomes a member where the key type is expected. Open `string` stays refused.',
        record: 'Record',
        recordP:
          '`Record<K, V>` holds one value of `V` per member of `K`, as a fixed array in id order. `by[c]`, `by.r` and `by["r"]` select its elements. An object literal must provide every member, with no extra property. Another key type, a number and `.length` are refused.',
        numeric: 'Numeric keys',
        numericP:
          'An enum or an integer-literal union can key a `Record` when its distinct values are exactly 0 through N-1. Each member indexes by its value. A gap, a negative value or a noninteger is refused with a sentence naming the values. Open `Record<u32, V>` is refused.',
        host: 'Host calls',
        hostP:
          'A key parameter or result is the string on the host. A `Record` parameter or result is an object with every member. An unknown string, a missing property or an extra property produces a `TypeError`.',
        deviationP:
          'In entry bindings and runtime-sized kernel arrays, keys are numeric ids and records are arrays in id order. Proposal 0081 keeps this difference open as D1.',
        collections: 'Map and Set',
        collectionsP:
          'A kernel accepts `Map<Channel, V>` and `Set<Channel>`. The host passes string keys. Before the loops, the call converts them to ids. Afterward, it converts ids back to strings and preserves insertion order. An unknown string produces a `TypeError`. Open `Map<string, V>` and `Set<string>` are refused.',
        exampleP:
          '[string-keys-record](exampleStringKeysRecord) calls a Record-indexed kernel on WebGPU, WebGL2 and the CPU. [Control flow](languageControlFlow) describes collection loops and their supported tiers.',
      },
      types: {
        title: 'TypeShade types',
        description:
          'How TypeScript type and class concepts map to TypeShade GPU values, structs and field layout.',
        h1: 'Types: from TypeScript types to GPU values',
        intro:
          'TypeShade starts from TypeScript’s type surface, but the final meaning is a GPU value model. Learn the TypeScript idea first: structural typing and type aliases describe value shape. When GPU layout metadata is required, use classes and field decorators.',
        ts: 'Start from the TypeScript concept',
        tsP: 'A type alias gives a name to a value shape. TypeShade keeps that surface, while shader semantics determine which types and expressions are valid in a shader.',
        alias: '1. Use type aliases for plain data',
        aliasP:
          'When fields do not need decorators, a type alias is the smallest representation. It is also useful when the same GPU value shape is shared across helper parameters and return values.',
        struct: '2. A class is a struct and its functions',
        structP:
          'A TypeShade class is a GPU struct and the functions written with it. The fields are the bytes the host writes. A constructor, a method and a static function each lower to a plain function, so `new Ray(o, d)` calls `Ray_new` and `r.at(t)` calls `Ray_at(r, t)`. Nothing keeps an object alive between them.',
        attrs: '3. Field decorators describe layout',
        attrsP:
          'A field takes `@location` and `@builtin`, which bind it to the pipeline, and `@interpolate`, `@invariant` and `@blend_src`, which qualify a varying or an output. `@align` is read and refused, and `@size`, `@offset` and `@ignore` are not attributes the compiler knows. The whole set it accepts is `@vertex`, `@fragment`, `@compute`, `@builtin`, `@location`, `@interpolate`, `@invariant`, `@blend_src`, `@diagnostic`, and `@inout` and `@out` on a parameter of a function.',
        boundary: '4. Where TypeScript classes stop',
        boundaryItems: [
          'An entry point is a top-level function, not a method.',
          'A class with no instance fields can be constructed and can have methods, accessors and static members. Its host value is `{}`. Reflection includes the internal GPU storage footprint: 4 bytes in std430 and 16 bytes in std140, with no authored field added.',
          'A derived value can be used where its base class is declared when the compiler proves that the base view is read-only and preserves dispatch. Overrides, receiver writes and observable alias mutation require a concrete type or remain unsupported.',
          'A getter and a setter each lower to a function of their own, and a class has one constructor, as in TypeScript.',
          '`new` builds a value inside a function body, and a module constant takes an object literal.',
          'Prefer a type alias when no field needs a decorator.',
        ],
        mapping: '5. Concept mapping',
        mappingRows: [
          ['TypeScript', 'TypeShade'],
          ['type alias / object shape', 'GPU value shape'],
          ['class fields', 'GPU struct fields'],
          ['class method', 'A function taking the struct first'],
          ['`new`', 'A call of the generated constructor'],
          ['`extends` with `super`', 'The base fields spliced in and the body lowered again'],
          ['decorator metadata', 'GPU layout / stage metadata'],
          ['runtime object', 'not applicable'],
          ['structural compatibility', 'applies within shader type checking'],
        ],
        example: '6. Connect the type to an entry point',
        exampleP:
          'After defining a struct, use it as an entry point parameter. The value shape and field metadata then define the meaning of that shader input.',
        next: 'Next: Functions',
      },
      functions: {
        title: 'TypeShade functions',
        description:
          'A detailed guide to TypeShade functions: TypeScript-style parameters and returns, helpers, shader entries, stages and explicit builtins.',
        h1: 'Functions: from TypeScript functions to GPU functions',
        intro:
          'Functions are the basic unit for naming computation and making inputs and outputs explicit. TypeShade keeps the TypeScript function shape, but every function in a `"use typeshade"` file must describe computation that can be lowered to GPU IR.',
        anatomy: '1. Anatomy of a function',
        anatomyP:
          'A function has a name, parameter list, return type and body. TypeShade keeps that familiar structure while giving parameters and return values GPU semantics.',
        anatomyNote:
          'Here <code>value</code> is the input parameter, <code>f32</code> is the GPU type of both the input and result, and <code>return</code> produces the value for the caller.',
        params: '2. Parameters and return types',
        paramsP:
          'A parameter is an input to the function and the return type describes the shape of its result. Reassigning a value parameter changes a local copy for that invocation and leaves the caller’s value unchanged. This applies to helpers, methods and stage inputs. Types tell the compiler which values and operations are valid.',
        paramsTable: [
          ['Part', 'Role'],
          ['`a`, `b`', 'GPU input values.'],
          ['`amount: f32`', 'A scalar input whose type participates in expression checking.'],
          ['`: vec4`', 'The GPU value shape returned to the caller.'],
        ],
        paramsRefP:
          "A parameter declared `@inout` is the caller's variable itself. The call passes the variable with no mark, and an assignment to the parameter, or to a field, a component or an element of it, writes that variable. A parameter declared `@out` starts with no value: the function writes it before it reads it, and on every path (`TS8075`), so the caller may pass a `let` that has no value yet. One call may not hand one variable to two such parameters when the function writes either (`TS8074`). Only a function declared at the top of the file or in a namespace takes a qualifier; a method, an entry and a local function take values (`TS8073`). A local function inside such a function still reads and writes the parameter, as it does any variable around it. [Parameters that write back](shadeReferenceParameters) shows a struct, an array element and a matrix column passed the same way.",
        helper: '3. Helper functions',
        helperP:
          'A top-level function without a stage decorator is a helper. Helpers let you name repeated calculations and keep shader entries focused on pipeline inputs, resources and outputs.',
        helperNote:
          'A helper has no stage decorator because it is not a pipeline entry. This keeps reusable math separate from the pipeline interface.',
        call: '4. Calling a function',
        callP:
          'A call looks like an ordinary TypeScript call, but its callee and arguments must stay inside the TypeShade GPU type model. Do not treat the shader as a place to call arbitrary JavaScript APIs.',
        callNote:
          'The call looks like a normal function call, but both the argument and the result of `addBias` must be values supported by the TypeShade GPU model.',
        entry: '5. Shader entry functions',
        entryP:
          'A pipeline entry is declared as a top-level `export function` with a stage decorator. `@compute`, `@vertex` and `@fragment` attach the function to a GPU execution stage.',
        entryNote:
          '`export` keeps the familiar module surface and exposes the function to the compiler as an entry candidate. The stage decorator adds the GPU-specific stage information.',
        builtin: '6. Builtins are parameters',
        builtinP:
          'GPU-provided stage inputs are explicit function parameters, not hidden global variables. Reading the signature tells you exactly which external inputs the entry expects.',
        builtinTable: [
          ['Form', 'Meaning'],
          ['`@builtin("global_invocation_id")`', 'Selects the GPU-provided compute input.'],
          ['`gid: vec3u`', 'The TypeShade type and local name for that input.'],
          ['`gid.x`', 'Reads the x component for the current invocation.'],
        ],
        compute: '7. Reading a compute entry',
        computeP:
          '`@compute([64, 1, 1])` declares the workgroup size. `gid` is a parameter receiving the `global_invocation_id` builtin, and `gid.x` reads the current invocation’s x coordinate.',
        computeNote:
          'When reading this function, first identify the stage and workgroup size, then inspect the parameters for external GPU inputs, and finally follow the body’s calculation.',
        graphics: '8. Vertex and fragment entries',
        graphicsP:
          'Graphics stages use the same function model. The decorator selects the stage, while parameters and the return type describe the pipeline interface.',
        graphicsNote:
          'The vertex function has two different inputs: `vid` is a GPU builtin and `vin` is a user-defined struct. The fragment function makes its builtin input, `pid`, explicit as well, so the signature documents the stage interface.',
        scope: '9. Functions and scope',
        scopeP:
          'Local variables belong to the current function invocation. Parameters and body locals may shadow module values; a closure resolves the nearest declaration. Duplicate declarations in the same scope remain errors. Every declaration may use a legal TypeScript name such as `target` or `half`: a variable, a parameter, a resource, an entry, a struct and a field alike. The shader writer gives a name its target reserves a fresh spelling on that target, and the host still binds and calls each one by the name written.',
        scopeNote:
          '`factor` is a local value scoped to the function. Resources such as `camera` and `pixels` belong to the host-facing shader interface, while builtin parameters are inputs supplied by the GPU stage.',
        boundary: '10. Where TypeScript functions stop',
        boundaryItems: [
          'Do not call arbitrary JavaScript runtime APIs.',
          'Do not assume dynamic object creation or general runtime side effects can become shader computation.',
          'Entry points are top-level exported functions, not class methods.',
          'Builtins are explicit parameters, not implicit globals.',
          'Parameters and return types must have valid GPU value semantics.',
        ],
        example: '11. From a small helper to a real entry',
        exampleP:
          'The example below keeps reusable math in a helper and lets the entry connect the builtin input and resources.',
        exampleNote:
          'The important distinction is the boundary: `addBias` is reusable computation, while `paint` connects the stage, builtin input and resources to an actual GPU invocation.',
        next: 'Next: Control flow',
      },
      controlFlow: {
        title: 'Control flow in TypeShade: branches, loops and kernels',
        description:
          'How familiar TypeScript conditionals and loops map to the TypeShade GPU execution model.',
        h1: 'Control flow: familiar syntax, explicit GPU execution',
        intro:
          'TypeShade uses familiar TypeScript conditional and loop syntax, but the code executes on the GPU. Understand control flow in terms of compilable computation, not the full dynamic behavior of the JavaScript runtime.',
        ts: '1. Start from the TypeScript control-flow model',
        tsP: 'Syntax such as if/else and for is familiar, but every condition and loop in TypeShade must be lowerable to GPU code. Matching syntax does not imply that all JavaScript runtime semantics are available.',
        branch: '2. Branching',
        branchP:
          'Use if/else to express calculation paths. Inside a branch, keep values and resources within the TypeShade GPU model.',
        branchValueP: `A value chosen by a condition is written \`c ? a : b\`. WGSL has no \`?:\` operator. For a scalar or a vector, the WGSL emit is \`select(b, a, c)\`, with the false value first and the condition last. WGSL evaluates both values, so put an expensive arm in an \`if\`. ${glsl} keeps \`?:\`. A struct or an array is chosen through a variable and an \`if\` on both targets.`,
        loop: '3. Loops',
        loopP:
          "Write a for loop, a while loop, or for...of over an array. A for loop may count to a value known only at run time, such as a uniform field or the length of an array. An array's map, forEach, some, every, reduce, fill, findIndex, findLastIndex, indexOf, lastIndexOf and includes compile too, each to a counted loop, and map takes an array with a fixed length.",
        // A kernel function (compiler change 0013): the loop the compiler may run on the GPU.
        kernel: '4. A loop that runs as a kernel',
        kernelP:
          "An exported function that is not an entry point and takes an array with no size, `array<T>`, or a 2D storage texture, `texture_storage_2d<F, A>`, is a kernel function (Rule 8.22). A sampled texture alone makes none, so an exported helper that reads one stays a helper. The array or the texture is the caller's, read and written in place. Each `for` at the top of its body is a loop the compiler may run on the GPU, one invocation per iteration, and a host file awaits the function like any import. No `@compute`, binding or `global_invocation_id` is written. `@workgroup_size([128])` before the function sets the workgroup of its loops on WebGPU, which is 64 without it. A loop that reduces always runs in workgroups of 256, so the attribute on a function with such a loop is refused (`TS8077`).",
        kernelRulesP:
          "The compiler runs a loop on the GPU when it proves that no iteration touches what another one does. The loop is a counted `for`, or a `for...of`, that steps by a constant and that nothing returns from or breaks out of. Each write lands on a name declared inside the loop, on an outer array or a texture at an index made from the loop's own, on an integer array the loop combines into at any index, on a variable the loop combines with `+=`, `*=`, `min`, `max`, `&`, `|` or `^`, which the GPU and the CPU fold in one tree order, on an array the loop only appends to with `push`, or on a `Map` or a `Set` the loop adds to. The loop reads an array it writes only where it writes it. It never reads a variable it combines, an array it appends to or a `Map` or a `Set` it adds to. It calls no function that writes a module variable or a binding, and has no barrier, no workgroup memory and no `console` call.",
        kernelLayoutP:
          'An ordinary WebGPU kernel call can upload only live fields of a read-only object array. Flat `f32`, `i32` and `u32` fields keep declaration order. Every declared host field is still validated, with property-read order preserved. Written, resident, fused and unproved inputs keep the full layout; so do modules built with `typeshade({ fuse: true })`. Entry bindings, reflection, manifests and raw bytes keep their external layout. CPU and WebGL2 retain their representation. Smaller uploads do not guarantee a faster complete call; physical-device measurements remain necessary.',
        kernelWarnP:
          'A loop the proof refuses runs on the CPU, and the program is correct either way. The proof never looks at a loop in an entry, a helper or a fragment shader, which stays per-invocation code. The compiler marks a refused loop with the warning `TS8070`: its first sentence names the line and the names in your code, and its second gives the remedy. At the pinned compiler the warnings read:',
        kernelRule: 'Rule',
        kernelWarning: 'Warning',
        // An array's methods, push, and Map and Set in a kernel function (compiler changes 0078,
        // 0079 and 0080).
        methods: "5. An array's methods, push, Map and Set",
        methodsP:
          "The methods of an array but `map` work on a kernel function's array too: `forEach`, `reduce`, `some`, `every`, `fill`, `findIndex`, `findLastIndex`, `indexOf`, `lastIndexOf` and `includes` (Rule 8.18). Each is the loop it stands for, written into the function where the call is, with the function handed over as the loop's body. The proof reads it as it reads a `for` loop, so both loops below run on the GPU: `forEach` writes `out` at its own index, and `reduce` with `+` is a reduction.",
        methodsOrderP:
          'A `reduce` adds in the tree order of a reduction on every tier, and TypeScript adds from left to right, so an `f32` sum may differ in the last places. The determinism report lists it as `order` (Rule 7.2). `some`, `every` and `includes` are an `|` and an `&` over every element. `findIndex`, `indexOf` and their `Last` forms are a `min` or a `max` of the index, which give the answer of the first element that decides. A function handed over runs for every element, so one that writes what it captures is refused.',
        pushP:
          'A loop appends to an array parameter with `out.push(v)`, as a statement, any number of times in an iteration and in any branch. The array starts empty in the function. The elements land in the order a sequential run of the loop appends them, on every tier, and `out.length` after the loop is the count appended.',
        pushHostP:
          'The host array is the capacity. The call writes the first elements up to that capacity and leaves the rest as they were. The count the function returns may exceed the capacity, so a host that sees `n > out.length` can call again with more room. On WebGPU the loop runs in three dispatches: each iteration counts its pushes, one workgroup scans the counts into offsets, and each iteration stores its pushes at its offset. WebGL2 runs no loop that pushes.',
        collectionsP:
          "A parameter may also be ECMAScript's `Set<K>` or `Map<K, V>`, with `K` a `u32`, an `i32`, an `f32` or a [key type](languageStringKeys). A loop adds to it with `s.add(k)` or `m.set(k, v)`. The host passes JavaScript's own `Set` or `Map`, and when the call resolves it holds the entries a sequential run leaves: each key once, in the order first added, with the value set last. A later loop reads it with `has`, `get` and `size`, and reads `m.get(k)!` only where `m.has(k)` guards it. Collection loops run on WebGPU and the CPU tier. WebGL2 cannot run them. String keys convert to ids before the loops and back afterward, preserving insertion order. An unknown host string is a `TypeError`. Open `Map<string, V>` and `Set<string>` stay refused. [kernel-set-unique](exampleKernelSetUnique) and [host-set-unique](exampleHostSetUnique) show both.",
        // A chain of kernel calls (compiler changes 0058, 0069, 0071, 0072, 0074 and 0075).
        fuse: '6. A chain of kernel calls',
        fuseP:
          'A host can call several kernel functions inside `device.fuse()` without a registration import (Rule 11.13). `fuse()` from `typeshade/fuse` remains supported for the default owner. At this compiler pin, `typeshade({ fuse: true })` still supplies the facts needed to combine eligible calls. On WebGPU, calls that read what the call before them wrote at the same index run as one dispatch, in one submission. The report the scope returns names each group, and says why two calls run apart. An entry call in the body forms a group of its own, and so does a loop that pushes onto an array. A call taking a `Map` or `Set` also forms its own group, reporting `b takes a Map or a Set` or its CPU fallback reason. `FuseReport` and `mergeReports`, which adds several reports into one, come from `typeshade/runtime` too, so a host that only reads reports ships no planner.',
        fuseIndirectP:
          'An entry call may take its workgroup count from an array an earlier call wrote. `entry(bindings, { indirect, offset })` reads the three counts at element `offset` of a `Resident<Uint32Array>` when the call runs. A chain of calls then needs no read between them, and in a scope the group of such a call reports `indirect: true`.',
        fuseOverrideP:
          'Inside `device.fuse()`, an imported compute entry takes the same optional `{ constants }` third argument as a direct call. Its runtime-sized storage arrays are Residents of that owner. The call remains a group of its own in the plan’s submission and keeps the owner’s fp64 flavor. On WebGPU its `workgroupShapes` reports the selected dimensions, such as `[[32, 1, 1]]`. Selecting constants adds no submission, fence or readback. The [host-compute example](exampleHostCompute) returns the report and reads its output after the plan.',
        deviceP:
          "`createDevice()` from `typeshade/runtime` opens an owner of the calls. `device.array()` makes the `Resident` arrays its calls take, and `device.fuse()` runs a body's calls as one plan on that device. Ordinary calls infer the unique owner of their arrays and textures. Calls without owned resources use the default owner. Mixing owners is refused before execution, and each `Resident` keeps its owner for its life. `device.release(r)` gives an array back to the device's pool for the next `array()` of the same element and length.",
        chunkP:
          "A kernel that iterates inside one dispatch can run long enough for a GPU watchdog to reset the device. Cut its loop into chunks. `device.chunkSize(key, max)` gives the units of the next chunk under the device's time budget, `createDevice({ timeBudgetMs })`, and `device.fuse(body, { chunk: { key, units } })` runs and times that chunk alone. The report gains a `chunk` row, and `device.chunkRates` holds what the device measured.",
        modulesP:
          '`typeshade/algorithms` and `typeshade/random` are kernel functions written in TypeShade, and they fuse with yours in one scope. [Algorithms](languageAlgorithms) and [Random numbers](languageRandom) list them.',
        boundary: '7. Where JavaScript control flow stops',
        boundaryItems: [
          'Write filter, find and the other array methods that change a length or can give undefined as a loop. findIndex and indexOf give -1 where nothing matches.',
          'Do not rely on general runtime objects.',
          'Keep conditions and loop ranges based on GPU-compilable values.',
          'A control-flow pattern valid in TypeScript is not automatically valid under TypeShade shader semantics.',
        ],
        next: 'Next: GPU types',
      },
      gpuTypes: {
        title: 'TypeShade GPU types',
        description:
          'How TypeScript type syntax maps to TypeShade scalar, vector, matrix and array GPU values.',
        h1: 'GPU types: from TypeScript syntax to GPU values',
        intro:
          'TypeShade uses TypeScript syntax but does not inherit every JavaScript runtime value type as a shader value. This page focuses on the values that are actually represented and computed on the GPU.',
        mapping: '1. TypeScript types and GPU types',
        mappingP:
          'Instead of treating a broad runtime type such as `number` as a shader value, TypeShade uses explicit GPU representations such as `f32`, `i32` and `u32`. `vec*` and `mat*` are GPU arithmetic values, not JavaScript objects.',
        scalar: '2. Scalars',
        scalarP:
          'Single numeric values are represented as GPU scalar types and can be used in resource and struct field declarations.',
        vector: '3. Vectors',
        vectorP:
          'vec2, vec3 and vec4 group scalar values into a GPU value. They are common in shader calculations and stage inputs.',
        matrix: '4. Matrices',
        matrixP:
          'Types such as mat4 represent GPU arithmetic values used for transforms. They are not JavaScript objects.',
        arrays: '5. Arrays',
        arraysP:
          'An array represents a sequence of GPU values. Fixed-length arrays and homogeneous tuples support local const and let binding patterns, including omitted and nested elements. Each binding copies a value. Runtime-sized and specialization-sized arrays do not support these patterns. Combined with a resource element type, an array describes host-provided buffer data.',
        live: '6. Live example',
        liveP:
          'The entry below names a GPU type on every line: `vec2` for the position, `f32` for the distance and the radius, `vec3` for the colour.',
        liveTitle: 'Disc',
        liveCaption: 'A disc placed by a vec2, sized by an f32 and coloured by a vec3.',
        liveAnchor:
          '`d` is the distance from the pixel to the rim of the disc: negative inside it, 0 on the rim, positive outside. `edge` turns that one `f32` into a mask, and `mix` reads the mask to pick a colour.',
        liveExercises: [
          'Change `vec2(ratio, 1.)` to `vec2(1., 1.)` on the `p` line. The disc stretches into an ellipse: `ratio` was scaling the x component alone, which is what a `vec2` lets you do.',
          'Replace the `return` line with `return vec4(vec3(fract(d * 10.)), 1.)`. The rings that appear are `d` itself, and `vec3` spreads that one `f32` across the three colour channels.',
          'Swap `length(p)` for `max(abs(p.x), abs(p.y))` and the disc becomes a square, or for `abs(p.x) + abs(p.y)` and it becomes a diamond. Then write the `f32` for a shape of your own.',
        ],
        liveCenter: 'centre, in uv space',
        liveRadius: 'radius, in uv units',
        liveTint: 'disc colour',
        next: 'Next: Resources',
      },
      resources: {
        title: 'TypeShade resources',
        description:
          'Map TypeScript declaration concepts to TypeShade uniform and storage resources, access modes and the host binding contract.',
        h1: 'Resources: from TypeScript declarations to GPU resources',
        intro:
          'A TypeShade resource is a host-filled binding slot, not a JavaScript object owned by the shader. Product code makes that boundary explicit with `declare`.',
        mapping: '1. Map the TypeScript declaration model',
        mappingP:
          'Just as TypeScript `declare` describes a value at the type level without creating a runtime value, TypeShade `declare` describes a GPU resource supplied by the host. TypeShade additionally uses `uniform<T>` and `storage<T>` to express GPU memory semantics.',
        decl: '2. Declare resources with `declare`',
        declP: 'Declare the resource type and access mode without an initializer.',
        access: '3. The type states the access',
        accessP:
          'A uniform is read-only, and `uniform<T>` takes one type argument. A storage binding is read-only as `storage<T>` and read-write as `storage<T, "read_write">`. The access mode is the second type argument, where WGSL writes it too. Every resource is declared with `const`.',
        slots: '4. Resource slots are a host contract',
        slotsP:
          'Resource slots follow declaration order in the file. Keep binding details as part of the compiler/host reflection contract instead of scattering binding numbers through shader code.',
        workgroup: '5. Workgroup memory',
        workgroupP:
          'A `workgroup<T>` value is shared by invocations in one group. Its outer array length can use the same override as `@compute`. The host chooses that value when it creates the pipeline.',
        invalid: '6. Common mistakes',
        invalidItems: [
          'Do not declare `declare const x: f32`; a resource needs a space such as `uniform<T>` or `storage<T>`.',
          'Do not declare a resource with `let`. The compiler refuses `declare let x: storage<T>` and names the `declare const` line to write instead.',
          'Do not assign to a read-only resource.',
          'Do not model a resource as a class or bind-group instance.',
        ],
        next: 'Next: Shader stages',
      },
      stages: {
        title: 'TypeShade shader stages',
        description:
          'Map TypeScript function and module concepts to compute, vertex and fragment entry points with explicit builtins in TypeShade.',
        h1: 'Shader stages: explicit GPU entry points',
        intro:
          'TypeShade entry points are top-level exported functions. A decorator marks the shader stage and any stage-specific metadata.',
        mapping: '1. Start from TypeScript functions and modules',
        mappingP:
          'In TypeScript, `export function` makes a function part of a module’s public surface. In TypeShade, adding a stage decorator gives that function the GPU meaning of a pipeline entry point. An undecorated function remains a reusable helper.',
        compute: '2. Compute',
        computeP:
          'A compute entry can name an `override<u32>` in its `@compute` dimensions. Numeric dimensions remain valid. Builtins such as `global_invocation_id` are explicit parameters.',
        computeHostP:
          'Choose a size in ordinary TypeScript, then pass it as a named constant to `program.compute()`. Read `pipeline.workgroupShape` to calculate dispatch counts. An imported entry accepts `entry(bindings, groups, { constants: { WG_SIZE: selected } })`, including inside `device.fuse()`. Calculate `groups` for the selected size and guard the last partial group in the shader. WebGL2 requires the default workgroup shape. The [host-compute example](exampleHostCompute) has the complete host and shader.',
        graphics: '3. Vertex and fragment',
        graphicsP:
          '`@vertex` and `@fragment` describe graphics-pipeline entry points. Inputs, outputs and builtins are expressed explicitly in the function signature. [The shader pipeline](conceptsPipeline) says what each stage is handed and what it returns.',
        helper: '4. Helper functions',
        helperP:
          'An undecorated function is a helper, not an entry point. Do not put entry points on classes or treat `this` as a pipeline object.',
        next: 'Next: Algorithms',
      },
      // The common modules (compiler change 0072): typeshade/algorithms (surface §72) and
      // typeshade/random (surface §73), each a page of its own in the Language group.
      algorithms: {
        title: 'typeshade/algorithms: maps, reductions and scans',
        description:
          'The common algorithms TypeShade ships as kernel functions: copy, maps, reductions, scans, compaction and a histogram, on every tier and inside fuse().',
        h1: 'Algorithms: typeshade/algorithms',
        intro:
          '`typeshade/algorithms` is a common module: kernel functions written in `"use typeshade"` and published under a subpath of the package (Rule 11.20). It holds the copy, the fill, the maps, the reductions, the scan, the compaction and the histogram over arrays. Each function runs on WebGPU, on WebGL2 and on the CPU tier, and gives on each the bits the CPU oracle gives. In a `fuse` scope it fuses with the calls around it as far as the facts allow.',
        host: '1. The host face',
        hostP:
          'Host code imports the subpath as it imports any package, and calls each function over `Resident` arrays, alone or inside a `fuse` body. Each function writes every element of its output, so an array from a device pool needs no zeroing. `histogram` is the one exception: it adds into the bins it is given, and the caller zeroes them.',
        functions: '2. The functions',
        functionsP: 'An array parameter is an `array<f32>` unless the row says otherwise.',
        functionsColumns: ['Group', 'Functions', 'What each one does'],
        functionsRows: [
          [
            'Copy and fill',
            '`copy(out, x)`, `fill(out, value)` and `sequence(out, start, step)`',
            'One loop at `i`. `sequence` writes `start + f32(i) * step`.',
          ],
          [
            'Binary maps',
            '`add`, `sub`, `mul` and `div` as `(out, a, b)`, and `scale(out, x, k)`',
            'One loop at `i`.',
          ],
          [
            'Unary maps',
            '`abs`, `neg`, `sqrt`, `rsqrt`, `exp`, `log`, `expm1`, `log1p`, `floor`, `ceil`, `round`, `sign`, `sin`, `cos`, `tan`, `tanh`, `sigmoid` and `relu` as `(out, x)`, and `clip(out, x, lo, hi)`',
            "One loop at `i`. In the shader module each one is `<op>Map`, such as `absMap`, since a kernel function cannot carry a builtin's name.",
          ],
          [
            'Whole reductions',
            '`sum(x)`, `max(x)` and `min(x)`, each an `f32`',
            'One tree order on every tier (Rule 7.2). In the shader module they are `sum`, `maxAll` and `minAll`.',
          ],
          [
            'Axis reductions',
            '`sumAxis`, `meanAxis`, `prodAxis`, `maxAxis`, `minAxis`, `argMaxAxis` and `argMinAxis` as `(out, x, axis, inner)`',
            '`x` is read as `[outer, axis, inner]`. Each element of `out` is a serial fold in ascending order.',
          ],
          [
            'Scan',
            '`inclusiveScan(out, x, sums)` and `exclusiveScan(out, x, sums)` over `array<u32>`',
            "Two loops of one kernel function. `sums` is the caller's scratch, with at least one element and about as many as the square root of the length of `x`.",
          ],
          [
            'Compaction',
            '`compact(out, x, flags, offsets)`',
            'The elements whose flag is 1, in their order, where `offsets` is the exclusive scan of `flags`.',
          ],
          [
            'Histogram',
            '`histogram(bins, x, lo, hi)`',
            'Adds the count of `x` in each of the equal bins over `[lo, hi)` into `bins`. Each add is an atomic on WebGPU.',
          ],
        ],
        fuse: '3. How the calls fuse',
        fuseP:
          'Every map writes `out` at `i` and reads its inputs at `i`, so a chain of maps is one dispatch, and a whole reduction joins a chain as its last call. An axis reduction, a scan and a compaction read their input at another index, so each one starts a group of its own after a call that wrote that input. In the first scope of the sample, `fill`, `add` and `relu` run as one dispatch and `sumAxis` as a second, in one submission.',
        tiers: '4. Where each one runs',
        tiersP:
          "The compiler's differential gate calls every function on WebGPU and on WebGL2 against the CPU oracle. It holds a function bit for bit where the determinism report lists no row for it, and within a bound where it lists one, such as `exp` or `sin`. WebGL2 refuses the three whole reductions, the two scans, `compact` and `histogram`, so each of those calls falls to the next tier of its selected owner's `prefer` policy (Rule 11.8).",
        device: '5. The device face',
        deviceP:
          'A `"use typeshade"` file may import from `typeshade/algorithms` too, which names the shader module under the `typeshade` condition. Its exports are kernel functions, and no function calls a kernel function, so a shader file has nothing to call from it in this version. The helpers a kernel composes over its own workgroup memory are a later delivery.',
        later: '6. Not yet',
        laterP:
          'Sort, partition, a segmented reduction, `reduceByKey`, a nearest-neighbour search, matrix products, `f64` linear algebra and a workgroup-memory scan are later deliveries.',
        next: 'Next: Random numbers',
      },
      random: {
        title: 'typeshade/random: hashes and uniform draws',
        description:
          'The common generators TypeShade ships: hash32, xorshift32 and uniform for a kernel, and fillUniform, fillWords and generator for a host, the same on every tier.',
        h1: 'Random numbers: typeshade/random',
        intro:
          '`typeshade/random` is the second common module (Rule 11.20). It holds the generators and the hashes a kernel draws from, and the fills a host calls. Each one gives the same bits on every tier.',
        device: '1. The device face',
        deviceP:
          'A `"use typeshade"` file imports the three scalar helpers and calls them in its own kernel or entry. The draw in the sample depends on the seed and the index only, so the tier and the dispatch shape do not change it.',
        deviceColumns: ['Function', 'What it does'],
        deviceRows: [
          [
            '`xorshift32(state: u32): u32`',
            'One step of xorshift32. A zero state stays zero, so seed it with a word that is not zero.',
          ],
          [
            '`hash32(x: u32): u32`',
            'A 32-bit integer finaliser, for a draw from an index with no state. `hash32(0)` is 0.',
          ],
          [
            '`uniform(word: u32): f32`',
            'The 24 high bits of `word` as an `f32` in `[0, 1)`. The value is exact in `f32`, so one word gives one number on every tier.',
          ],
        ],
        host: '2. The host face',
        hostP:
          'Host code imports the same subpath. The three helpers are there too, as functions that run on the CPU, and three more stand beside them. `generator(seed)` uses the same `hash32` and `uniform`, so a shuffle on the host and a draw on the device from one seed agree bit for bit.',
        hostColumns: ['Function', 'What it does'],
        hostRows: [
          [
            '`fillUniform(out, seed: u32)`',
            'A kernel function. Element `i` is `uniform(hash32(seed ^ i))`, a draw in `[0, 1)`.',
          ],
          [
            '`fillWords(out: array<u32>, seed: u32)`',
            'A kernel function. Element `i` is `hash32(seed ^ i)`.',
          ],
          [
            '`generator(seed: u32): () => number`',
            'Plain JavaScript. Each call gives the next draw of a counter that starts at 0.',
          ],
        ],
        held: '3. What it is held to',
        heldP:
          "The compiler's tests hold `fillUniform(out, seed)` on the CPU tier to `generator(seed)` element for element. Its differential gate holds the two fills on WebGPU and WebGL2 to the CPU oracle.",
        later: '4. Not yet',
        laterP:
          'A normal distribution, a counter-based generator with a larger state such as Philox or PCG, and a permutation are later deliveries.',
        next: 'Back to the language overview',
      },
    },

    // The four construct-mapping pages: /guide/language/from-typescript/, from-wgsl/,
    // from-glsl/ and builtins/. Each page component reads one block. The builtin table is
    // generated from the compiler's spelling registry (src/lib/builtin-table.ts), so its
    // rows are not copy and only the words around them live here.
    mapping: {
      fromTypescript: {
        title: 'TypeScript constructs and what each one lowers to',
        description: `What ${facts.constructRows} TypeScript constructs become in a "use typeshade" file: declarations, functions, classes, control flow, and the shader text the compiler writes.`,
        h1: 'TypeScript constructs',
        intro: `TypeShade is TypeScript's syntax, checked by a shader compiler. A construct either lowers to shader code or is refused with a reason, and the emitted pane of every card is what the compiler wrote at the pinned commit. There are ${facts.constructRows} of them, on the section pages below.`,
        readingH: 'How to read a card',
        readingP:
          'The head of a card names the construct, and a badge marks one the language refuses. The sentence under it says what becomes of the construct. The left pane is the TypeScript, taken from a `"use typeshade"` program that is compiled while this page is built. The right pane is the emitted WGSL, cut out of that program by name, and a refused card carries the compiler\'s own code and message there instead.',
        guidesP:
          'A card says what happens. The pages before this one say why: [types](languageTypes), [functions](languageFunctions), [control flow](languageControlFlow), [GPU types](languageGpuTypes) and [resources](languageResources). The builtins have [a table of their own](languageBuiltins).',
        paneTs: 'TypeScript',
        paneWgsl: 'Emitted WGSL',
        paneDiagnostic: 'Compiler diagnostic',
        refused: 'Refused',
        /** The index names its sections and links each one; the cards themselves are on
         *  those pages. The count beside a section is that section's own row count, read
         *  off the generator. */
        pagesH: 'Sections',
        constructs: (n: number) => `${n} constructs`,
        pages: {
          declarations: {
            title: 'Declarations in TypeShade and what they lower to',
            description:
              'What a constant, a variable, an enum, a type alias, an interface and a namespace become in a "use typeshade" file, and what is emitted for each.',
          },
          functions: {
            title: 'Functions in TypeShade and what they lower to',
            description:
              'Helpers, arrow functions, overloads, recursion, entry points and the calls the compiler refuses, each with the shader text written for it.',
          },
          classes: {
            title: 'Classes in TypeShade, and what each one lowers to',
            description:
              'Constructors, methods, static members, inheritance, mixins and generics, each with the struct and the functions the compiler writes for it.',
          },
          controlFlow: {
            title: 'Control flow and the ternary in TypeShade, lowered to WGSL',
            description:
              'Conditions, counted loops, while, switch, break, continue, discard and the ternary, which WGSL lacks, each with its WGSL, and the loops refused.',
          },
          expressions: {
            title: 'TypeShade expressions and types, and what they lower to',
            description:
              'Assertions, destructuring, spreads, literals and the values a shader cannot build while it runs, each with the shader text or the refusal it gets.',
          },
          double: {
            title: 'Emulated double precision in a TypeShade file',
            description:
              'Neither target has a 64-bit float, so a double is a pair of single words. What the compiler rewrites, and the calls it puts in place of the arithmetic.',
          },
        },
        /** The headings the cards of a section page run under, one per run of rows
         *  (src/lib/typescript-lowering.ts). The page's outline lists them. */
        crumbs: 'Breadcrumbs',
        groups: {
          constantsAndVariables: 'Constants and variables',
          typeDeclarations: 'Types and namespaces',
          parametersAndNames: 'Parameters and names',
          kindsOfFunction: 'Kinds of function',
          calls: 'Calls',
          fieldsAndConstructors: 'Fields and constructors',
          methods: 'Methods',
          inheritance: 'Inheritance and interfaces',
          accessors: 'Access and accessors',
          mixinsAndGenerics: 'Mixins and generics',
          conditionsAndLoops: 'Conditions and loops',
          choosingAValue: 'Choosing a value',
          leavingEarly: 'Leaving early',
          builtValues: 'Objects, arrays and tuples',
          claims: 'Type claims',
          operators: 'Operators',
          primitives: 'Strings, numbers and booleans',
          writingDoubles: 'Writing a double',
          whereItStops: 'Where a double stops',
        },
        sections: {
          declarations: {
            h: 'Declarations',
            p: 'A declaration names a constant, a variable or a layout. Which of the three it is decides whether anything is emitted for it at all.',
          },
          functions: {
            h: 'Functions',
            p: 'Every function is a function of the module. There are no function values, no environment to close over and no call stack.',
          },
          classes: {
            h: 'Classes',
            p: 'A class is a struct with functions around it. Dispatch is static, so inheritance, a mixin and a generic are settled while the file is compiled.',
          },
          controlFlow: {
            h: 'Control flow',
            p: 'A loop has to be one the GPU can finish, and a choice between two values has to be one the target has an operator for.',
          },
          expressions: {
            h: 'Expressions and types',
            p: 'A type claim is erased, a shape the GPU has a word for is kept, and a value TypeScript would build at run time is refused where it is written.',
          },
          double: {
            h: 'Emulated double',
            p: `Neither target has a 64-bit float. An \`f64\` is a pair of \`f32\` words, rewritten into \`vec2<f32>\` and \`df64_\` calls before either backend sees it. [fp64-lane-stripes](shadeLaneStripes) draws the ${split[0]} and ${split[1]} paths side by side.`,
          },
        },
        rows: {
          constScalar: {
            name: 'Scalar `const`',
            p: 'A module constant. A scalar folds to one value at its declaration. [module-const](shadeModuleConst)',
          },
          constVector: {
            name: 'Vector `const`',
            p: 'A vector or array constant carries its value as an expression each backend evaluates. [palette-const](shadePaletteConst)',
          },
          letNoInit: {
            name: 'Local `let`',
            p: 'A mutable local. The annotation carries the type, and every target starts it at zero. [bitfield-bands](shadeBitfieldBands)',
          },
          unassignedRead: {
            name: 'Read before assignment',
            p: 'A read of a local on a path that has not assigned it is refused with `TS8075`, by the rule TypeScript reports as TS2454. The editor shows `TS8075` in its place.',
          },
          moduleLet: {
            name: 'Module `let`',
            p: 'A module variable, one per invocation. [private-state](shadePrivateState)',
          },
          varRefused: {
            name: '`var`',
            p: '`let` is the per-invocation variable and `const` the module constant.',
          },
          enumRow: {
            name: '`enum`',
            p: 'One module constant per member, named `Enum_Member` and typed `i32`.',
          },
          constEnum: {
            name: '`const enum`',
            p: 'The same constants. A `const enum` is no different here.',
          },
          typeAlias: {
            name: '`type` alias',
            p: 'Another name for its target, resolved wherever a type may stand.',
          },
          interfaceRow: {
            name: '`interface`',
            p: 'A struct, the same one a class of those fields would give.',
          },
          classStruct: {
            name: 'Class as a struct',
            p: 'A struct, whose fields lay out the memory the host fills. [ray-class](shadeRayClass)',
          },
          namespaceRow: {
            name: '`namespace`',
            p: 'The members flatten to `Ns_member`, and the namespace itself emits nothing.',
          },
          topFunction: {
            name: 'Top-level function',
            p: 'A module function of the same name, parameters and return type.',
          },
          mutableParameter: {
            name: 'Parameter reassignment',
            p: 'A local copy receives the input value. Reassigning it leaves the caller’s value unchanged; a parameter declared `@inout` changes it.',
          },
          referenceParameter: {
            name: '`@inout` parameter',
            p: `A parameter declared \`@inout\` is the caller's variable, and the call passes the variable with no mark. WGSL takes a pointer and ${glsl} an \`inout\` parameter, the way a method that writes \`this\` does. [reference-parameters](shadeReferenceParameters)`,
          },
          outParameter: {
            name: '`@out` parameter',
            p: 'The function writes the parameter before it reads it and on every path, so the argument may be a `let` with no value yet. Both targets lower it as they lower `@inout`.',
          },
          referenceAlias: {
            name: 'Two references to one variable',
            p: `One call may not hand one variable to two \`@inout\` or \`@out\` parameters it writes. WGSL refuses the aliased pointers, and ${glsl} would copy the two back in no fixed order.`,
          },
          lexicalShadow: {
            name: 'Shadowing a module value',
            p: 'A parameter or body local can use the name of a module value. Closures resolve the nearest declaration; duplicates in the same scope remain errors.',
          },
          localFunction: {
            name: 'Local function',
            p: 'A function of the module, named after the function that declares it.',
          },
          closure: {
            name: 'Closure over a name',
            p: 'The local function takes each name it reads from the function around it as a parameter, and a name it writes by reference.',
          },
          defaultArgs: {
            name: 'Default argument',
            p: 'Every parameter stays, and the argument left out is written at the call. [default-args](shadeDefaultArgs)',
          },
          overloads: {
            name: 'Overload signature',
            p: 'The signatures are skipped and the implementation is lowered once.',
          },
          recursion: {
            name: 'Recursive call',
            p: 'WGSL has no call stack, and the check reads the call graph.',
          },
          callStatement: {
            name: 'Call as a statement',
            p: 'A statement of its own. A value-returning builtin standing alone computes nothing, so the optimizer drops it.',
          },
          phonyAssign: {
            name: 'Call with an effect',
            p: "A builtin that returns a value and has an effect takes WGSL's phony assignment, `_ =`, since Tint treats it as must-use. [atomic-histogram](shadeAtomicHistogram)",
          },
          mathAlias: {
            name: '`Math` names',
            p: '`Math.sin` is the same builtin as `sin`, and `Math.PI` folds to its value.',
          },
          constructorNew: {
            name: '`constructor` and `new`',
            p: '`new` is a call of `Ray_new`, which builds the struct and hands it back.',
          },
          fieldlessClass: {
            name: 'Class without fields',
            p: 'Construction and method calls work with no instance fields. The host value is `{}`; the GPU receives an internal storage member that is absent from the source value.',
          },
          method: {
            name: 'Method',
            p: 'A function whose first parameter is the struct, and `this` reads as that parameter.',
          },
          staticFn: {
            name: '`static` method',
            p: 'A function with no receiver, under the class name.',
          },
          thisAssign: {
            name: 'Method that writes `this`',
            p: `A method that writes its object takes it by pointer on WGSL, and by \`inout\` on ${glsl}. [orbit-inout](shadeOrbitInout)`,
          },
          extendsSuper: {
            name: '`extends` and `super`',
            p: "The base's fields come first, an inherited method is lowered again, and `super` is a function of its own. [shape-inheritance](shadeShapeInheritance)",
          },
          baseValue: {
            name: 'Derived value in a base position',
            p: 'The compiler builds the base representation once when it proves read-only access and equivalent method dispatch. Overrides, receiver writes and observable alias mutation remain outside that proof.',
          },
          abstractRow: {
            name: '`abstract` class',
            p: 'No struct for the abstract class. Each subclass carries the fields and its own copy of the method.',
          },
          implementsRow: {
            name: '`implements`',
            p: "Checked by TypeScript alone. The struct is the class's own fields.",
          },
          accessModifiers: {
            name: 'Access modifiers',
            p: 'Accepted, and they mean nothing to the shader. TypeScript is what enforces them.',
          },
          getter: {
            name: 'Getter and setter',
            p: 'Each half is a function of the module, `Disc_get_area` and `Disc_set_area`, and a read or a write calls it. [class-syntax](shadeClassSyntax)',
          },
          mixin: {
            name: 'Mixin function',
            p: 'The function runs while the file is compiled. Its members are spliced in, and `Tinted` is emitted nowhere. [mixin-surface](shadeMixinSurface)',
          },
          genericFunction: {
            name: 'Generic function',
            p: 'One function per set of type arguments the program uses, and nothing called `pick`. [generic-helpers](shadeGenericHelpers)',
          },
          genericClass: {
            name: 'Generic class',
            p: 'One struct per set of type arguments, each with its own copy of every method. [generic-class](shadeGenericClass)',
          },
          ifRow: { name: '`if`', p: 'An `if`, as written.' },
          forRow: {
            name: 'Counted `for`',
            p: 'A counted loop: an integer variable, a constant step, and an exit that compares it to a bound the body does not write. [block-scope](shadeBlockScope)',
          },
          forRuntime: {
            name: '`for` to a runtime bound',
            p: 'The start and the bound may be values the program learns at run time, and no trip count is too many.',
          },
          whileRow: {
            name: '`while`',
            p: 'A loop with a counter the compiler adds. Nothing checks that the body moves toward the bound.',
          },
          switchRow: {
            name: '`switch`',
            p: 'A `switch`. Each case ends with a `break`, which the lowering drops. A case whose end is reachable is refused (`TS8017`), because TypeScript would run on into the next case and WGSL runs only the one. [bitfield-bands](shadeBitfieldBands)',
          },
          ternaryScalar: {
            name: 'Ternary on a scalar',
            p: `WGSL has no \`?:\` operator, so the ternary becomes \`select\`: the false value first, the condition last. WGSL evaluates both values. ${glsl} keeps the ternary.`,
          },
          ternaryStruct: {
            name: 'Ternary on a struct',
            p: 'Neither target has an operator for it, so the value is hoisted into a slot and an `if`. [pick-composite](shadePickComposite)',
          },
          breakRow: {
            name: '`break`',
            p: 'A `break`, which is how a counted loop leaves early. [julia-twin](shadeJuliaTwin)',
          },
          continueRow: {
            name: '`continue`',
            p: 'A `continue`. In a `switch` that no loop encloses it is refused.',
          },
          discardRow: {
            name: '`discard`',
            p: 'A `discard`, in a fragment entry or in a function one calls. [cutout](shadeCutout)',
          },
          destructuring: {
            name: 'Destructuring',
            p: 'Object patterns read fields. Local `const` and `let` array patterns copy elements of fixed-length arrays and homogeneous tuples in source order. Omissions consume positions; nested patterns are supported and the source is evaluated once. Bounds, element types and readonly access still apply. Rest elements, defaults, destructuring assignment, parameters, vector array patterns and arrays of runtime or specialization-dependent length are refused.',
          },
          spread: {
            name: 'Object spread',
            p: 'One read per field of the struct, with the fields written after it over them.',
          },
          arrayLiteral: {
            name: 'Array literal',
            p: 'An array initializer with a contextual element type and length, such as `array<T, N>`. A local array binding pattern can also infer a homogeneous literal initializer. [array-literal-ramp](shadeArrayLiteralRamp)',
          },
          tuple: {
            name: 'Tuple',
            p: 'A tuple is an array of a length the type fixes, a return included. [tuple-and-brand](shadeTupleAndBrand)',
          },
          literalUnion: {
            name: 'Literal union',
            p: 'A string-literal union is a [key type](languageStringKeys). Other unions whose members name one type name that type.',
          },
          brand: {
            name: 'Branded type',
            p: 'The brand is erased and the parameter is an `f32`. [tuple-and-brand](shadeTupleAndBrand)',
          },
          typeClaims: {
            name: 'Type claims',
            p: 'A claim about a type, not a conversion, so each emits what its operand emits.',
          },
          power: { name: 'Exponent operator', p: '`pow` on both targets.' },
          logicalScalar: {
            name: '`&&` on a `bool`',
            p: 'The operator both targets have, on one `bool` at a time.',
          },
          logicalVector: {
            name: '`&&` on a mask',
            p: 'Combine masks with `all`, `any` or a `select`. [bool-select](shadeBoolSelect)',
          },
          optionalMember: {
            name: 'Optional field',
            p: 'A struct field is always there in the memory the host fills.',
          },
          stringValue: {
            name: 'String value',
            p: 'A string literal is accepted where a [key type](languageStringKeys) is expected. Open `string` stays refused.',
          },
          numberType: { name: '`number`', p: 'A number on the GPU has a width.' },
          booleanType: { name: '`boolean`', p: 'The shader spelling is `bool`.' },
          integerLiteral: {
            name: 'Integer literal',
            p: 'An integer-written local initializer can take the `i32` or `u32` required by a declared nongeneric function, a constructor or a method argument. Explicitly typed initialization and simple assignment can establish the same demand in either direction when the type is known independently of the local. Conflicting concrete types produce `TS8003`; use an annotation or cast to settle the type. With no integer demand, an unannotated local remains `f32`. Float-written initializers, module constants and loop induction variables keep their existing rules.',
          },
          increment: {
            name: 'Increment and decrement',
            p: 'An assignment of the value one step on.',
          },
          f64Scalar: {
            name: '`f64` scalar',
            p: 'A pair of `f32` words, with a `df64_` call for each operation. [fp64-lane-stripes](shadeLaneStripes)',
          },
          f64Literal: {
            name: '`f64` literal',
            p: 'A literal in a declared `f64` position keeps the whole double.',
          },
          f64Vector: {
            name: '`f64` vector',
            p: 'A vector of doubles, lowered into a hi plane and a lo plane. `vec2d` is the short spelling of `vec2f64`.',
          },
          f64Builtin: {
            name: 'Builtin on an `f64`',
            p: 'Ten builtins have an emulated body on a scalar and thirteen on a vector.',
          },
          f64Refused: {
            name: 'Builtin with no `f64` body',
            p: 'Refused at the call, which names the ten and the narrow to write.',
          },
          f64Guard: {
            name: '`f64` in a uniform',
            p: 'A `_fp64` texture is injected, which the host fills with `1.0`. Reflection lists it like any binding.',
          },
          f64Varying: {
            name: '`f64` across stages',
            p: 'Read the double in the stage that needs it, or narrow it to an `f32` at the boundary.',
          },
        },
        sourceP:
          'Every program on this page is compiled at the pinned commit while the site is built, and a snippet that stops compiling stops the build. The grammar itself is [the surface document](surfaceSource).',
      },
      fromWgsl: {
        title: 'WGSL in TypeShade: types, resources and entries',
        description:
          'The WGSL surface construct by construct, with the TypeShade spelling of each one: scalars, vectors, textures, address spaces, stage attributes and statements.',
        h1: 'WGSL in TypeShade',
        intro: `A reader who already writes WGSL needs one thing from this site, which is the TypeShade spelling of the construct in front of them. This page reads in that direction: a WGSL form on the left, what to write in a \`"use typeshade"\` file on the right, and a note where the two do not line up. [WGSL vs ${glsl}](conceptsWgsl) compiles one shader to both targets and lists where they differ.`,
        readingH: 'How to read a row',
        readingP: `The right column is source text the compiler at commit ${facts.pinnedCommit} accepts, and the left column is the WGSL that same compiler writes for it. Both are measured when this page is built, so a spelling the compiler stops writing arrives here at the next pin as a changed row.`,
        colWgsl: 'WGSL',
        colSource: 'TypeShade',
        colType: 'Type',
        colNote: 'Note',
        colInstead: 'What to write',
        /** The index names its four sections and links each one; the tables are on those
         *  pages. */
        pagesH: 'Sections',
        pages: {
          types: {
            title: 'WGSL scalars, vectors, matrices and their spelling',
            description:
              'The WGSL type surface with the TypeShade spelling of each one: scalars, vectors, matrices, arrays and atomics, textures and samplers.',
          },
          resources: {
            title: 'WGSL resources and address spaces in TypeShade',
            description:
              'A resource is a declare, the address space and the access mode are the wrapper type on the annotation, and the slot index is the source order.',
          },
          entries: {
            title: 'WGSL entry points and attributes in TypeShade',
            description:
              'Stage attributes, workgroup size, what a vertex entry has to return, the builtin ids the pipeline supplies, and the names WGSL does not have.',
          },
          statements: {
            title: 'WGSL statements and expressions, and how to write them',
            description:
              'The statements are TypeScript, and each one means what the WGSL beside it means. The text comes from one file compiled while this page is built.',
          },
        },
        typesH: 'Types',
        typesP:
          'A type is written where WGSL writes one, on a declaration, a parameter, a field and a return. The element type rides inside the name where WGSL takes a type argument, so `vec3<u32>` is `vec3u` and there is nothing in angle brackets to get wrong.',
        scalarsH: 'Scalars',
        f64P: 'A double has no WGSL type behind it. The declaration is written `f64`, and a pass rewrites every one into a pair of `f32` lanes and a library of functions over them before the writer runs. A multiplication of two doubles reaches the WGSL as one call.',
        vectorsH: 'Vectors',
        vectorsP:
          '`vec2` and `vec4` read the same way as the three above. `vec3` and `vec3f` are one type, and so are `vec3d` and `vec3f64`.',
        matricesH: 'Matrices',
        matricesP:
          'A square matrix also answers to the short name both targets give it, so `mat4` and `mat4x4` are the same declaration. The `C` and the `R` mean what they mean in WGSL, columns then rows.',
        arraysH: 'Arrays and atomics',
        arraysP:
          'A tuple is a list of a length the type fixes, which is what an array of a known size is, so `[f32, f32]` and `array<f32, 2>` reach the same type. A runtime-sized array and an atomic each live in a storage binding.',
        texturesH: 'Textures and samplers',
        texturesP:
          'A texture and a sampler are written bare, with no address-space wrapper, because a handle lives in no address space. A sampled texture takes `f32`, `i32` or `u32`, and the element decides both the WGSL spelling and which reads apply to it. A storage texture takes a format and an access mode as string literal types, which `tsc` checks before this compiler does.',
        resourcesH: 'Resources and address spaces',
        resourcesP:
          'A resource is a `declare`, which is TypeScript for a value something else provides. The address space and the access mode are the wrapper type on the annotation: a `storage` binding a shader writes is `storage<T, "read_write">`, and every resource is a `const`.',
        slotsP:
          'There is no `@group` or `@binding` to write. The slot index is the source order of the `declare` in the file, and the WGSL above shows what that came out as. A texture or a sampler takes the next slot the same way.',
        stagesH: 'Entry points and attributes',
        stagesP:
          'A stage attribute is a decorator on an exported function. A function with none of them is a helper. `@compute` takes dimensions as a list of numbers or named overrides, and numeric dimensions remain valid.',
        stagesOverrideP:
          'WGSL declares the value with a module-level `override`, and `@workgroup_size` can use its name. TypeShade can use the same override for the outer length of a workgroup array.',
        returnsP:
          'A vertex entry has to produce a position. A return typed `vec4` carries the position builtin on its own, and a struct return carries it in a field and adds as many `@location` varyings as the program wants. A struct return with no position field, a `void` return and a bare type that is not a `vec4` are each refused, naming the field or the type to write.',
        builtinValuesH: 'Builtin values',
        builtinValuesP: `The \`@builtin(...)\` vocabulary is WGSL's, ${facts.wgslBuiltinIds} names passed through as a string, so the WGSL attribute is the same id with no quotes around it. A typo is a \`tsc\` error at the line the author wrote, since the parameter is a closed union of them. WGSL fixes the type of every id but one, so the type column is what the annotation has to say.`,
        clipDistancesP: "The one id with no fixed type. The array length is the author's.",
        absentH: 'Names WGSL does not have',
        absentP:
          'Three names a GLSL author reaches for have no WGSL builtin behind them. The front end refuses each one at the declaration and lists the names it does take. The right column is the sentence the backends print after the attribute name, which says what to reach for instead.',
        statementsH: 'Statements and expressions',
        statementsP:
          "The statements are TypeScript's, and each one means what the WGSL beside it means. The emitted text comes from one file compiled at build time, so the parentheses and the folded constants are the writer's own.",
        functionsH: 'Builtin functions',
        functionsP:
          'Every builtin the compiler can spell, with the WGSL text it writes for each one, is on [the builtin table](languageBuiltins). A function the file declares wins over a builtin of the same name.',
        refusals: {
          'scalars.f16':
            'No type name in this surface. `"enable f16"` beside `"use typeshade"` emits WGSL\'s `enable f16;`, and the reflection names the capability a host requests as `shader-f16`, but there is still no `f16` to declare a value with.',
          'scalars.f64':
            'WGSL has no 64-bit float. The pass below rewrites the declaration before the writer sees it.',
          'vectors.vec3d': 'WGSL has no 64-bit vector either, and the same pass rewrites this one.',
        },
        notes: {
          'stages.vertex': 'One stage decorator per entry point, on an exported function.',
          'stages.fragment':
            'A fragment entry may also return nothing, which is what a program that only writes to a storage binding does.',
          'stages.compute':
            'The list is the workgroup size. `@compute` with no list is `[64, 1, 1]`.',
          'stages.location':
            'A location sits on an entry parameter, on a class field and on the return.',
          'stages.vertexBare':
            'A return typed `vec4` carries the position builtin on its own, so the smallest vertex shader needs no struct and no parameters.',
          'stages.vertexStruct':
            'A struct return carries the position in a field and adds as many varyings beside it as the program wants.',
          'stages.fragmentReturn':
            'A bare fragment return takes location 0 at any width, so `f32`, `vec2`, `vec3` and `vec4` are all draw-buffer formats. A struct return is the multiple-render-target form.',
          'statements.let':
            'A WGSL `let` is a value that stays as it was, which is what `const` says in TypeScript.',
          'statements.var':
            'A WGSL `var` is a local that changes. `let b: f32` with no initializer declares one and leaves the value for a later assignment. A read on a path that has not assigned it is refused (`TS8075`, Rule 7.6), and every target starts the local at zero.',
          'statements.for':
            'A `for` is counted: an integer induction variable, a constant step, and an exit that compares it to a bound the body does not write. The start and the bound may be runtime values, and no trip count is too many. The step may be `+=`, `-=`, `*=` or `/=`.',
          'statements.while':
            'A `while` takes the place of `loop`. It is an open loop: it ends when its condition fails, or at a `break` or a `return`, and `while (true)` needs one of the two in its body.',
          'statements.switch':
            'Each case ends with `break`, which a WGSL case does without and the lowering drops. A case whose end is reachable would run on into the next case in TypeScript, so it is refused (`TS8017`). The last case needs no `break`. A label is an integer constant that may appear once. Two labels stacked over one body are one case with two selectors, `case 0, 1:` on WGSL.',
          'statements.select':
            'WGSL has no ternary, so a scalar or vector conditional becomes `select`, whose first argument is the arm the condition does not choose. A conditional on a struct or an array is hoisted into a slot and an `if`, since neither target has an operator for that.',
          'statements.call': 'A function called for what it does, with its result dropped.',
          'statements.phony':
            'A value-returning builtin dropped the same way takes the phony assignment, because Tint reads every such builtin as `@must_use`.',
          'statements.discard': 'The same word, and the same statement.',
          'statements.struct':
            'A WGSL struct is a class. A type alias of an object shape and an interface both reach the same declaration.',
          'statements.fn': 'A function with no stage decorator is a helper of the module.',
        },
      },
      fromGlsl: {
        title: `${glsl} in TypeShade: types and uniform blocks`,
        description: `The ${glsl} surface construct by construct, with the TypeShade spelling of each one: samplers, uniform blocks, varyings, builtin variables and functions.`,
        h1: `${glsl} in TypeShade`,
        intro: `A shader written for WebGL2 is written in ${glsl}, and most of it has a TypeShade spelling that emits the same program for both targets. This page reads in that direction, and it says which constructs have no form on WebGPU and which ones the compiler refuses on both. [WGSL vs ${glsl}](conceptsWgsl) compiles one shader to both targets and lists where they differ.`,
        readingH: 'How to read a row',
        readingP: `The right column is source text the compiler at commit ${facts.pinnedCommit} accepts, and the left column is the ${glsl} that same compiler writes for it. Where this target has no form for a row, the cell carries the compiler's own sentence about it instead of a spelling it never writes.`,
        colGlsl: glsl,
        colSource: 'TypeShade',
        colNote: 'Note',
        colMessage: 'What the compiler says',
        colInstead: 'What to write',
        colCapability: 'Capability',
        colDirective: 'Source directive',
        colExtension: 'WebGL2 extension',
        noDirective: 'None. The host turns the extension on before it links the program.',
        /** The index names its four sections and links each one; the tables are on those
         *  pages. */
        pagesH: 'Sections',
        pages: {
          types: {
            title: `${glsl} types and their TypeShade spelling`,
            description: `The ${glsl} type surface with the TypeShade spelling of each one: scalars, vectors, matrices, arrays, samplers, and the types this target refuses.`,
          },
          uniforms: {
            title: `Uniforms and buffers in ${glsl} and TypeShade`,
            description: `A uniform binding is a struct the writer emits as a block, a varying is a field on both sides, and each capability this target knows is one row.`,
          },
          variables: {
            title: `Builtin variables from ${glsl} in TypeShade`,
            description: `A gl_ global is a builtin attribute on a parameter, on a class field or on the return, and the writer decides which global that becomes.`,
          },
          functions: {
            title: `Functions and operators in ${glsl} and TypeShade`,
            description: `A call carries one neutral name and each backend writes its own spelling. The derivative, texture, bit and remainder forms a GLSL author looks for.`,
          },
        },
        typesH: 'Types',
        typesP:
          "The scalar and vector names are WGSL's, since one source has to serve both targets, and the GLSL writer spells each one in this target's terms. A declaration therefore says `f32` where the emitted shader says `float`.",
        scalarsH: 'Scalars',
        vectorsH: 'Vectors',
        vectorsP:
          '`vec2` and `vec4` read the same way, and so do the integer, unsigned and boolean forms of each. A vector of doubles has no form on either target and is rewritten into `f32` lanes before the writer runs.',
        arraysH: 'Matrices and arrays',
        matricesH: 'Matrices',
        matricesP:
          "A square matrix keeps the short name every driver's error messages use, and the other six shapes are written `matCxR`, columns then rows, the same way this target writes them.",
        arraysP:
          'A tuple is a list of a length the type fixes, so `[f32, f32]` and `array<f32, 2>` reach the same type. An array whose length is not known until the program runs is a storage buffer, which this target has no form for, so a module with one is rewritten to read from a data texture instead.',
        samplersH: 'Samplers',
        samplersP:
          'This target fuses the texture and the sampler into one combined sampler, and WebGPU keeps them apart. A TypeShade file declares the two the WebGPU way and the GLSL writer fuses them, so the sampler argument disappears from every read and the binding it stood in is dropped from the layout the host binds.',
        shadowP:
          'A depth texture is the exception that proves the fusing: its combined type depends on how the module reads it, so the binding emit decides it. Every read of one this surface admits is a comparison, which makes it the shadow form.',
        noFormH: 'Types with no GLSL form',
        noFormP:
          'Each of these is refused by the writer, and the cell beside it is the sentence the writer throws. A module carrying one still emits its WGSL, so these are the lines that make a shader WebGPU only.',
        uniformsH: 'Uniforms and buffers',
        uniformsP:
          'A uniform binding is a struct, which the writer emits as a std140 block. A storage buffer has no form on this target at all, so a module with one is rewritten to read from a data texture before the capability gate runs.',
        varyingsH: 'Varyings',
        varyingsP:
          'A value that travels from the vertex stage to the fragment stage is a `@location(n)` field on both sides. This target links them by name and WebGPU by number, so the field name is what has to match in the emitted GLSL.',
        capabilitiesH: 'Extensions and capabilities',
        capabilitiesP: `An \`#extension\` line is one half of a GPU feature and the host's \`getExtension\` call is the other. The profile for this target has ${facts.glslCapabilities} rows, and one of them puts a directive in the source; everything with no row at all fails the module closed here before any text is written.`,
        enablesP:
          'A `"use typeshade"` file has no spelling for these four. `"enable ..."` takes WGSL extension names and none of the four is one, so a host lists the one it needs in the compiled module\'s `enables`: `{ ...compile(source).module, enables: [...] }`. What a module\'s shape implies, such as a storage binding, a compute entry or a `@builtin("clip_distances")`, is derived from the file, and none of those has a row here.',
        variablesH: 'Builtin variables',
        variablesP:
          'A `gl_*` global is a `@builtin(...)` attribute on a parameter, on a class field or on the return. The attribute says which value it is and the writer decides which global that becomes, which is how one file reaches both targets.',
        absentH: 'Variables neither writer takes',
        absentP:
          'Two of them have no name in this surface. The front end refuses the spelling at the declaration, and the sentence below is what the WGSL backend prints for the same name, which says what to reach for instead.',
        functionsH: 'Functions and operators',
        functionsP:
          'A call carries one neutral name through the compiler and each backend writes its own spelling, so the name to write is the one in the right column. These are the ones a GLSL author goes looking for.',
        operatorsP:
          'The operators divide the same way. A comparison of two vectors is written with the operator and reaches this target as the function it has, and a per-component choice is `select` on both.',
        operatorsH: 'Operators',
        restP:
          'Every builtin the compiler can spell, with the text it writes for each one on both targets, is on [the builtin table](languageBuiltins).',
        edslH: 'Related pages',
        edslP: `This page maps one construct at a time. [Migrating a GLSL shader](internalsGlslShader) covers what a whole ${glsl} shader also carries: uniform blocks, \`#ifdef\`, \`#include\` and \`#extension\`. Each row there gives the \`"use typeshade"\` spelling. [WGSL vs ${glsl}](conceptsWgsl) compiles one shader to both targets, and the WGSL side of this page is [WGSL in TypeShade](languageFromWgsl).`,
        refusals: {
          'uniforms.precision': 'Nothing to write.',
        },
        notes: {
          'uniforms.block':
            'The class is the block and the `declare` is the instance. The field order is the layout.',
          'uniforms.loose':
            'A default-block uniform set through `glUniform*` has no spelling here, so a uniform binding of a bare scalar, vector or matrix reaches WebGPU alone.',
          'uniforms.storage':
            'The buffer becomes a data texture, and the host uploads the same numbers as texels.',
          'uniforms.fetch':
            'An index into the buffer becomes a fetch through this function, which the writer defines in the modules that call it.',
          'uniforms.define':
            'A specialization constant has no GLSL form, so the default is written as a preprocessor substitution the host can override before it compiles the stage.',
          'uniforms.precision':
            'The writer puts the qualifier at the top of every stage it emits, and the `floatPrecision` option decides whether the float line reads `highp` or `mediump`. The integer line stays `highp`, since a read back through a data texture needs the whole range.',
          'varyings.out': 'Written on the field of the struct a vertex entry returns.',
          'varyings.in':
            'Written on the fragment entry parameter that reads it, under the same name.',
          'varyings.target':
            'A bare fragment return takes location 0, and the writer names the output itself.',
          'variables.glPosition':
            'The same id on a vertex output. A vertex entry returning a bare `vec4` carries it with nothing written.',
          'variables.glFragCoord':
            'The same id on a fragment input. The y origin differs: this target counts from the bottom of the window and WebGPU from the top, so a shader that reads `.y` needs a flip of its own.',
          'variables.glVertexID':
            'An index is a `u32` here and an `int` there, so the read is wrapped in the declared type.',
          'variables.glInstanceID': 'The same wrap, for the same reason.',
          'variables.glFrontFacing': 'A `bool` on both targets, so the read needs no cast.',
          'variables.glFragDepth':
            'Written as a field of the struct a fragment entry returns, beside its colour.',
          'functions.dpdx': 'The same derivative under the WGSL name.',
          'functions.dpdy': 'The same, along the other axis.',
          'functions.dpdxCoarse':
            'The coarse and fine variants keep their names on WGSL and collapse here, since this target has one derivative per axis.',
          'functions.dpdyFine': 'The same collapse.',
          'functions.mod':
            "The floor remainder, which is what this target's `mod` already is. The `%` operator is the other one.",
          'functions.textureSample':
            'The sampler argument goes, because the combined sampler already holds it.',
          'functions.textureLoad': 'A texel read at an integer coordinate and a mip level.',
          'functions.textureDimensions':
            "The size comes back unsigned, so the writer wraps this target's signed answer.",
          'functions.faceForward': 'A spelling difference and nothing more.',
          'functions.inverseSqrt': 'A spelling difference and nothing more.',
          'functions.round':
            'The rounding both targets share is the one that sends a half to the even neighbour.',
          'functions.countOneBits':
            'This target has none of the bit builtins, so the writer defines a small function over the shifts and masks it does have.',
          'functions.firstLeadingBit': 'Another of those, defined only in a module that calls it.',
          'operators.mod': 'The floor remainder, whose sign follows the divisor.',
          'operators.remainder':
            'The truncating remainder, whose sign follows the dividend. This target has no `%` on floats, so the writer spells it out.',
          'operators.lessThan':
            'A vector comparison is a function on this target and an operator on the other, so it is written as the operator.',
          'operators.equal': 'The same, and the strict form is the one TypeScript takes.',
          'operators.select':
            'A scalar choice is the ternary here and `select` on WGSL, so one name serves both.',
          'operators.vectorSelect':
            'A per-component choice over a boolean vector is `mix` on this target, which is the shape a GLSL author already writes.',
        },
      },
      builtins: {
        title: `Builtin functions and their WGSL and ${glsl} forms`,
        description: `Every builtin the compiler can spell, ${facts.builtins} in all, beside the WGSL and the ${glsl} text it writes for each one, grouped by family.`,
        h1: 'Builtin functions',
        intro: `A builtin is a function the GPU already has. A call carries one neutral name through the compiler, and each backend writes its own spelling for that name, so the call is written once and emitted twice. The registry holds ${facts.builtins} names.`,
        readingH: 'How to read a row',
        readingP: `The first column is the name the call carries, with a placeholder argument in each position it takes. The next two are the text the WGSL backend and the ${glsl} backend write for that call, run from the compiler's own spelling table at the pinned commit. ${facts.portableBuiltins} of the names are spelled the same way on both targets, and ${facts.glslAbsentBuiltins} have no ${glsl} form at all, where the cell carries the compiler's own message. ${facts.mathAliasBuiltins} answer to a \`Math.\` name as well, which the last column of the maths and cast tables shows. [WGSL vs ${glsl}](conceptsWgsl) compiles one shader to both targets and lists where they differ.`,
        idsP: `A few of these names are chosen by the compiler and never written by hand. A layered texture read, a depth comparison, a storage fetch and a texel read at an unsigned coordinate each take a name of their own, so the argument order of a call never depends on the texture it landed on. An \`abs\` of an unsigned value and an integer \`dot\` take one too, because ${glsl} has no overload for either.`,
        precedenceH: 'A name the file declares',
        precedenceP:
          "A function the file declares wins over a builtin of the same name. Such a name meant the author's own function before it was a builtin, and an addition does not change what a program already means.",
        colName: 'TypeShade',
        colWgsl: 'WGSL',
        colGlsl: glsl,
        colMath: 'Math name',
        colBuiltin: 'Builtin',
        colHelper: 'GLSL function',
        noForm: 'No form on this target.',
        preEmit: 'Rewritten into a pair of `f32` lanes before either backend runs.',
        families: {
          maths: 'Maths',
          geometry: 'Geometry',
          derivatives: 'Derivatives',
          bits: 'Bit operations',
          packing: 'Packing',
          casts: 'Casts',
          textures: 'Textures and storage',
          atomics: 'Atomics',
          barriers: 'Barriers',
          f64: 'Emulated double',
        },
        bitsP: `${glsl} has none of the bit builtins, so the column above names a small function the GLSL writer defines over the shifts, masks and comparisons that target does have. A module that calls none of them carries none of the definitions.`,
        helpersH: 'GLSL helper functions',
        helpersP: `A storage buffer has no ${glsl} form, so a read of one is rewritten into a read from a data texture. These are the functions that read stands for, and the GLSL writer emits the definition of each one a module calls.`,
        sourceP:
          'Every row on this page is read from [the spelling registry](intrinsicRegistry) at the pinned commit, and none of it is typed here.',
      },
    },
  },

  // The gallery (gallery.typeshade.dev, worker/gallery.ts): the files people sent in with the
  // Playground's Submit, once the maintainer approves them. The build writes the list page as a
  // template, and the gallery's Worker fills it in from the database. A card opens its entry
  // in the Playground.
  gallery: {
    title: 'Shader gallery, TypeShade',
    description:
      'Shaders people wrote in the TypeShade Playground and sent in. Each one opens in the Playground, ready to change.',
    h1: 'Gallery',
    intro:
      'Shaders people wrote in the Playground and sent in. Each one opens in the Playground, where you can change it.',
    howTo:
      'To add yours, write it in the [Playground](playground) and choose Submit. The maintainer reviews each submission before it appears.',
    empty: 'Nothing has been approved yet.',
    sortLabel: 'Order',
    sortRecent: 'Newest',
    sortPopular: 'Most viewed',
    by: 'by {name}',
    views: '{count} views',
    viewOne: '1 view',
  },

  // The dialog every Report a problem link opens (src/components/IssueDialog.astro): a reader
  // with no GitHub account sends a report, and the Worker files it on GitHub as an issue.
  issue: {
    heading: 'Report a problem',
    titleLabel: 'Title',
    textLabel: 'Description (optional)',
    addImages: 'Paste, drop or choose images',
    note: 'Anyone can read what you send. Leave out anything private.',
    send: 'Send',
    cancel: 'Cancel',
    close: 'Close',
    // What the script writes once it runs (src/scripts/issue-dialog.ts).
    runtime: {
      removeImage: 'Remove the image',
      removeProgram: 'Leave the program out',
      program: "The Playground's program goes with the report.",
      sending: 'Sending…',
      sent: 'Sent. Thank you.',
      preview: 'A preview checks the report and sends nothing.',
      limit: 'No more reports can be sent today. Try again tomorrow.',
      image: `Images go up to ${ISSUE_IMAGE_BYTES / 1024 / 1024} MB each and ${ISSUE_IMAGES_MAX} in all, as PNG, JPEG, GIF or WebP.`,
      challenge: 'The check for a person did not pass. Try again.',
      failed: 'It could not be sent. Try again later.',
    },
  },

  mnist: {
    demo: {
      title: 'Try MNIST in your browser',
      description:
        'Train the actual TypeShade compute program, try test digits, then draw your own digit to classify.',
      codePreviewTitle: 'TypeShade code running this lab: forward pass',
      codePreviewExplanation:
        'This real compute function transforms 28×28 pixels into ten digit scores. Both training and prediction use the same forward stage.',
      codeWalkthroughLink: 'Explore the seven (7) explained code stages below',
      sourceToggle: 'View the TypeShade code running this model',
      sourceDescription:
        'This is the exact softmax.shade.ts file compiled into the WebGPU/WebGL2 model above. All six compute entries are shown, including training and prediction.',
      sourceGitHub: 'Open this exact source revision on GitHub',
      backend: 'Backend',
      auto: 'Auto (WebGPU, then WebGL2)',
      webgpu: 'WebGPU',
      webgl2: 'WebGL2',
      samples: 'Training images',
      epochs: 'Epochs',
      epochsHelp: `Enter a whole number from ${mnistEpochs.min} to ${mnistEpochs.max}. One epoch passes through all selected training images.`,
      epochsError: `Enter a whole number from ${mnistEpochs.min} to ${mnistEpochs.max}.`,
      resourceNote:
        'More epochs repeat GPU work and increase runtime, power use and device heat. Runtime depends on your backend and image count. Higher epochs do not guarantee better test accuracy. Cancel stops after the current batch.',
      learningTitle: 'Watch the model learn',
      learningExplanation:
        'Each training batch predicts digit scores, calculates loss and gradients, then updates weights. After each epoch, evaluation measures the updated model without changing weights.',
      metricsExplanation: `The curves show measured results on the same ${mnistTestSamples} test images after each epoch. Lower loss means less prediction error; accuracy counts correct classifications. This subset does not represent the full MNIST test set.`,
      trainingProgress: 'Training images processed',
      progressNote:
        'The bar counts training images across all epochs. Evaluation runs separately after each epoch.',
      lossCurve: 'Test cross-entropy loss by epoch',
      accuracyCurve: 'Test accuracy by epoch',
      evaluating: 'Evaluating',
      batch: 'Completed batches',
      chartEmpty: 'Results appear after the first completed evaluation.',
      stopping: 'Cancelling: waiting for the current operation and cleanup',
      start: 'Download and train',
      cancel: 'Cancel',
      dataNote:
        'On start, the browser downloads approximately 12 MB of official MNIST gzip files. They are processed locally. No images or drawings are sent to TypeShade servers.',
      idle: 'Choose a backend and start training.',
      downloading: 'Downloading and validating official MNIST data',
      compiling: 'Creating TypeShade compute pipelines',
      running: 'Training',
      completed: 'Training finished',
      cancelled: 'Training cancelled',
      error: 'Unable to run MNIST',
      epoch: 'Epoch',
      testAccuracy: 'Test accuracy',
      loss: 'Loss',
      canvas: 'Draw a digit',
      drawNote:
        'Draw a white digit in the square after training. TypeShade forward and predict kernels classify it.',
      clear: 'Clear',
      sample: 'Next test digit',
      drawFirst: 'Draw a digit before predicting.',
      drawPrompt: 'Draw a digit or select a test image.',
      prediction: 'Prediction:',
      actualLabel: 'MNIST label:',
      distribution: 'Scores for digits 0 to 9',
      resultHeading: 'Training progress',
      computeNote:
        'The host loads images and controls the batches. Training and inference logits run through the selected TypeShade WebGPU or WebGL2 backend. WebGL2 uses lowered GLSL ES 3.00 passes.',
    },
    title: 'MNIST training with TypeShade',
    description:
      'Reproduce handwritten digit classification training through TypeShade compute on the CPU, WebGPU and lowered WebGL2.',
    h1: 'Train MNIST with TypeShade compute',
    short:
      'A real-data softmax regression journey with forward, loss, gradients and SGD computed by TypeShade.',
    open: 'Explore the MNIST training journey',
    intro:
      'This reproducible experiment trains a softmax classifier on handwritten digits. TypeShade executes the model computation; the host loads data and schedules batches.',
    browserH: 'Execution boundary:',
    browserNote:
      'The live lab trains a small real-data subset in your browser. The full-dataset results below are from separate reproducible experiments.',
    walkthrough: {
      intro:
        'These are excerpts from the exact TypeShade source compiled for the browser lab. This model is softmax regression: it receives 28×28 pixels (784 inputs) and produces 10 scores for digits 0 through 9. It is neither a CNN nor a pretrained model.',
      flowTitle: 'MNIST execution paths',
      trainFlow: 'Training:',
      testFlow: 'Evaluation:',
      predictFlow: 'Handwritten inference:',
      readGuide:
        'Read what each stage computes and why, then inspect the real source directly underneath. Every code sample is extracted at build time from the compiled softmax.shade.ts file.',
      steps: [
        {
          title: 'Declare GPU resources in TypeScript',
          purpose:
            'A "use typeshade" file declares pixels, labels, weights, biases, gradients, and output buffers. The batch uniform carries the current mini-batch size and learning rate.',
          explanation:
            'An image contains 784 f32 pixels; 10 classes require 784×10 = 7,840 weights. Weights and biases remain GPU-resident and are reused by the next batch. stableProbability is a shared helper for numerically stable softmax.',
        },
        {
          title: 'Forward pass: turn pixels into class scores',
          purpose:
            'forward multiplies 784 pixel values by class-specific weights, sums them and adds biases, producing 10 logits per image.',
          explanation:
            'gid.x identifies the image row. For class c, it computes z = bias[c] + sum pixels[p]×weights[p×10+c]. @compute([64]) specifies the workgroup size, with an explicit guard for short batches.',
        },
        {
          title: 'Loss and error signal: measure the prediction',
          purpose:
            'objective uses stable softmax and cross-entropy, subtracting the maximum logit before exponentiation.',
          explanation:
            'The delta value is (predicted probability - one-hot label) / batch size. backward uses this error signal to determine each weight gradient. Both exp and log execute in the TypeShade compute program.',
        },
        {
          title: 'Backward pass: accumulate weight gradients',
          purpose:
            'backward computes gradients for 7,840 weights and 10 biases using the batch pixels and delta values.',
          explanation:
            'Each gradW[p×10+c] is sum pixels[row,p]×delta[row,c], while each gradB is a class-wise delta sum. This implementation uses explicitly authored gradients, not automatic differentiation.',
        },
        {
          title: 'SGD: update the GPU-resident model',
          purpose:
            'update multiplies each gradient by the learning rate and subtracts it from the corresponding weight or bias.',
          explanation:
            'weights[k] -= batch.rate × gradW[k] is the key step. JavaScript does not read the model back and update it for every batch. The next forward pass observes the GPU-resident updated values.',
        },
        {
          title: 'Evaluation: aggregate loss and correct answers',
          purpose:
            'reduce calculates mean cross-entropy and the number of correctly classified examples in a batch.',
          explanation:
            'stats[0] is mean loss and stats[1] is the correct count. This is a metric reduction, not weight-gradient reduction. The host reads this small output to compute evaluation totals.',
        },
        {
          title: 'Prediction: calculate digit 0–9 probabilities on GPU',
          purpose:
            'predict normalizes 10 forward logits and picks the highest-scoring digit without needing labels.',
          explanation:
            'The compute entry writes probabilities[c] and predicted[0]. Browser JavaScript only renders those GPU results; it does not run a second Math.exp softmax implementation.',
        },
      ],
      hostTitle: 'How does the browser connect these TypeShade kernels?',
      hostIntro:
        'The JavaScript host downloads official IDX files, normalizes pixels to 0–1, and dispatches the TypeShade compute stages. The methods below come directly from the shared browser session, not from illustrative pseudocode.',
      hostTrainTitle: 'Actual code for one training batch',
      hostTrainExplanation:
        'setBatch writes pixels and labels to GPU input buffers. The session dispatches forward → objective → backward → update in order, retaining the same GPU-resident weights for subsequent batches.',
      hostPredictTitle: 'Actual code for classifying a drawn digit',
      hostPredictExplanation:
        'forward → predict computes probabilities and the top class on the GPU. Only 10 floats and one class index are read back. Training and prediction share a serialized queue to avoid races over mutable buffers.',
      boundary:
        'Execution boundary: TypeShade owns the model math (forward, softmax, loss, gradients, SGD and inference). JavaScript handles downloads, batch scheduling, canvas input, UI updates and aggregating metrics. WebGL2 uses TypeShade-generated GLSL ES 3.00 passes, not native compute.',
    },
    modelH: 'The training pipeline',
    modelP:
      'The model has 784 input features and 10 output classes. Training and inference use six TypeShade compute entries.',
    kernels: [
      'forward computes the class logits.',
      'objective evaluates stable softmax and cross-entropy.',
      'reduce summarizes mean loss and correct predictions for a batch.',
      'backward computes weight and bias gradients.',
      'update applies stochastic gradient descent.',
      'predict produces ten normalised probabilities and the winning class in TypeShade.',
    ],
    resultsH: 'Validated results',
    resultsP:
      'The full-data rows come from the committed result record. The WebGL2 validation is a separate, smaller execution gate.',
    backend: 'Execution backend',
    data: 'Train / test, epochs',
    accuracy: 'Test accuracy',
    cpu: 'Generated CPU',
    webgpu: 'WebGPU (SwiftShader)',
    webgl2: 'WebGL2 passes',
    epochs: 'epochs',
    webgl2Dataset: '1,024 train / 1,000 test subset',
    notEstablished: 'Full-data result not established',
    softwareNote:
      'The measured WebGPU adapter was Google SwiftShader, a software renderer; these results do not demonstrate physical GPU acceleration.',
    webgl2Note:
      'The real WebGL2 test executed every pass, checked against an independent numeric reference and completed subset training. Evidence:',
    validationRun: 'MNIST WebGL2 validation workflow',
    runH: 'Reproduce the experiment',
    runP: 'From the compiler repository root with Node 24 and Bun, install dependencies and run the strict WebGL2 tests:',
    fullP: 'For the full dataset using the WebGPU backend after downloading the dataset:',
    runtimeNote:
      'The commands use the local Chromium runner and download MNIST data on demand. Performance depends on the actual adapter and host environment.',
    limitsH: 'What this does and does not verify',
    limits: [
      'WebGL2 uses generated GLSL ES 3.00 passes, not native compute shaders.',
      'The WebGL2 CI validates numeric stages and a small real-data training subset; full-dataset WebGL2 accuracy and speed remain unverified.',
      'The published full-dataset WebGPU result used software rendering. No physical GPU speedup is claimed.',
      'The live lab executes TypeShade kernels in the visitor’s browser on a selected subset; full-dataset results were recorded separately.',
    ],
    sourceH: 'Source and verification',
    sourceP: 'The source and results are bound to the compiler commit used to build this site.',
    kernelSource: 'MNIST TypeShade shader source',
    instructions: 'Training and validation instructions',
    resultRecord: 'Full-dataset result record',
    typenn: {
      h: 'MNIST in TypeNN',
      p: 'This guide trains a softmax regression with kernels written by hand. TypeNN is a neural-network library built on TypeShade. A model is a stack of layers, and each layer runs as TypeShade kernel functions. The code below defines a model with one hidden layer and trains it on batches.',
      lab: 'Open the TypeNN lab',
      github: 'TypeNN on GitHub',
    },
  },

  notFound: {
    title: 'Page not found, TypeShade',
    description: 'There is nothing at this address on typeshade.dev.',
    h1: 'There is nothing at this address.',
    p: 'The page may have moved. The front page and the authoring guide are still here.',
    links: '[Go to the front page](home), or read the [authoring guide](guide).',
  },
};
