// The contract between the API extractor (src/lib/api.ts, generated from the compiler at the
// pinned commit) and the reference page (src/components/pages/ApiReferencePage.astro). One
// entry is one page, laid out the way an MDN reference page is: summary, Syntax, Parameters,
// Return value, Exceptions, Description, Examples, Targets, members, In the guide, See also,
// Source. A field that is empty is a section the page leaves out.

export type ApiKind = 'function' | 'constant' | 'interface' | 'type' | 'class';

export interface ApiCategory {
  /** The URL segment, for example 'authoring'. */
  readonly slug: string;
  /** The English name, for example 'Authoring'. Korean comes from the dictionary by slug. */
  readonly name: string;
  /** One English sentence for the index page. */
  readonly summary: string;
}

export interface ApiSignature {
  /** TypeScript as a reader would write it, one overload per entry, package name already the release name. */
  readonly text: string;
}

export interface ApiParameter {
  readonly name: string;
  /** The type as text, for example 'Node<K>' or 'readonly Stmt[]'. */
  readonly type: string;
  readonly optional: boolean;
  /** Markdown; may be empty when the JSDoc says nothing about it. */
  readonly description: string;
}

export interface ApiReturn {
  readonly type: string;
  /** Markdown; may be empty. */
  readonly description: string;
}

export interface ApiException {
  /** The error class or code, for example 'ShaderDslError' or 'E_FN_RET'. */
  readonly name: string;
  /** Markdown: when it is thrown. */
  readonly description: string;
}

export interface ApiExample {
  /** Code, TypeScript unless `lang` says otherwise. */
  readonly code: string;
  readonly lang?: 'ts' | 'wgsl' | 'glsl' | 'bash';
  /** Markdown shown above the code; may be empty. */
  readonly description: string;
}

/** How one target handles the thing, the row of the Targets table (MDN's compatibility table). */
export interface ApiTargetSupport {
  /** 'wgsl' | 'glsl' | 'cpu' */
  readonly target: 'wgsl' | 'glsl' | 'cpu';
  /** 'native' | 'emulated' | 'stub' | 'none' | 'n/a' */
  readonly support: 'native' | 'emulated' | 'stub' | 'none' | 'n/a';
  /** Markdown; for example the spelling the target emits, or why it is a stub. */
  readonly note: string;
}

/** A property or method of an interface or class, one row of the members list. */
export interface ApiMember {
  readonly name: string;
  readonly kind: 'property' | 'method' | 'constructor';
  /** The type or signature as text. */
  readonly type: string;
  readonly optional: boolean;
  readonly readonly: boolean;
  /** True when the member's JSDoc carries @deprecated. */
  readonly deprecated: boolean;
  /** Markdown; may be empty. */
  readonly description: string;
}

export interface ApiLink {
  readonly label: string;
  readonly href: string;
}

/** The markdown fields of an entry rendered to HTML by the content loader, in the same order.
 *  `summary` is not here: it is one plain sentence and the page prints it as text. */
export interface ApiEntryHtml {
  readonly description: string;
  readonly parameters: readonly string[];
  readonly returns: string;
  readonly exceptions: readonly string[];
  readonly examples: readonly string[];
  readonly targets: readonly string[];
  readonly members: readonly string[];
}

/** One entry in another language: its summary and its markdown fields rendered to HTML, from a
 *  current translation (src/lib/api-translations.ts). */
export interface ApiTranslated {
  readonly summary: string;
  readonly html: ApiEntryHtml;
}

export interface ApiEntry {
  /** True for a fixture that only shows the template; such a page is noindex and out of the sitemap. */
  readonly preview?: boolean;
  /** The export's name as written in code, for example 'fn' or 'ShaderDslError'. */
  readonly name: string;
  /** The URL segment under /api/, lower case, unique. */
  readonly slug: string;
  readonly kind: ApiKind;
  readonly category: ApiCategory;
  /** True when the export's JSDoc carries @deprecated. */
  readonly deprecated: boolean;
  /** One plain-text sentence, whole: the page's first paragraph and the base of its meta description. */
  readonly summary: string;
  /** Markdown, the rest of the JSDoc after the summary; may be empty. */
  readonly description: string;
  /** One or more, in declaration order. Empty for interfaces and types, which show `declaration` instead. */
  readonly signatures: readonly ApiSignature[];
  /** For an interface, type alias or class: the declaration text as a code block, members left to `members`. */
  readonly declaration: string;
  readonly parameters: readonly ApiParameter[];
  readonly returns: ApiReturn | null;
  readonly exceptions: readonly ApiException[];
  readonly examples: readonly ApiExample[];
  /** Present for builtins and emit-facing functions; empty otherwise. */
  readonly targets: readonly ApiTargetSupport[];
  /** Properties and methods of an interface or class; empty otherwise. */
  readonly members: readonly ApiMember[];
  /** Sections of the authoring guide that mention the name in a code span. */
  readonly guideSections: readonly ApiLink[];
  /** Other reference pages this one links to ({@link} targets and @see). */
  readonly seeAlso: readonly ApiLink[];
  /** The declaration's file (relative to the compiler root) and 1-based line, for the permalink. */
  readonly source: { readonly file: string; readonly line: number };
  /** The specifiers a host imports it from, `typeshade` or a subpath such as
   *  `typeshade/runtime`: the first is the page's import line. */
  readonly modules: readonly string[];
}
