// The language worker's half of the Playground's host.ts: the TypeScript an application writes
// around a shader module, checked and built here, run in a sandboxed frame by the page.
//
// host.ts is plain TypeScript, so it is not a document of the TypeShade service. It gets a
// TypeScript language service of its own, over a small virtual file system: TypeScript's lib
// files for ES2022 and the DOM, the declarations of `typeshade/runtime`, `typeshade/runtime/
// internal` and `typeshade/fuse` (one JSON asset, scripts/playground-host-types.mjs, fetched the
// first time host.ts is asked about), and, for each `.shade.ts` file host.ts imports, the host
// view `hostFace()` writes for it (change 0062): the TypeScript a type checker reads in place of
// the shader source, the way the Vite plugin serves it in a project.
//
// A build turns host.ts into CommonJS with `ts.transpileModule`, and each module it imports into
// the generated module `hostFace()` writes, CommonJS too, so the frame can run them with a
// `require` of a few lines. The host's lines are mapped back from the transpiled ones, so a
// console line can name the line of host.ts it was written on.
import ts from 'typescript';
import {
  hostFace,
  type HostFace,
  type TypeshadeCompletionItem,
  type TypeshadeDiagnostic,
  type TypeshadeHover,
  type TypeshadePosition,
} from '../../vendor/shader-dsl/src/language-service/index.ts';
import { defaultHost } from './playground-host-default.ts';
import { HOST_URI } from './playground-language.ts';
const HOST_PATH = '/host.ts';
const LIB_DIR = '/lib/';
const TYPES_ROOT = '/node_modules/typeshade/';

/** The asset scripts/playground-host-types.mjs writes. */
interface HostTypes {
  readonly libs: Readonly<Record<string, string>>;
  readonly files: Readonly<Record<string, string>>;
}

/** What a build hands the frame. */
export interface HostBuild {
  /** host.ts as CommonJS, and for each of its lines the line of host.ts it came from (both
   *  zero-based), so a stack frame can be read back as a line the reader wrote. */
  readonly host: { readonly code: string; readonly lines: readonly number[] };
  /** Each shader module host.ts imports, by the specifier it is imported with: the generated
   *  module, as CommonJS. */
  readonly modules: Readonly<Record<string, string>>;
  /** A module host.ts imports that does not compile, as `file: message`. */
  readonly problems: readonly string[];
}

let typesFetch: Promise<HostTypes> | undefined;
const loadTypes = (url: string): Promise<HostTypes> => {
  typesFetch ??= fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`host types: ${response.status} from ${url}`);
    return (await response.json()) as HostTypes;
  });
  // A failed fetch is asked again next time, so one bad moment does not end host.ts's checking.
  typesFetch.catch(() => {
    typesFetch = undefined;
  });
  return typesFetch;
};

// ── The host face of each module ───────────────────────────────────────────────────────────

/** The last face of each module, with the text of every file it read, so an edit to any of
 *  them, an import included, writes it again. */
const faces = new Map<
  string,
  { readonly texts: readonly (string | undefined)[]; readonly face: HostFace }
>();

function faceOf(uri: string, read: (uri: string) => string | undefined): HostFace | undefined {
  const text = read(uri);
  if (text === undefined) return undefined;
  const hit = faces.get(uri);
  if (hit && hit.face.files.every((file, i) => read(file) === hit.texts[i])) return hit.face;
  const face = hostFace(text, { fileName: uri, readDocument: read, fuse: true });
  faces.set(uri, { texts: face.files.map((file) => read(file)), face });
  return face;
}

/** The `.shade.ts` files host.ts imports: the specifier as written, the uri it names and the
 *  path the type checker knows the view by. */
function shaderImports(
  text: string,
  read: (uri: string) => string | undefined,
): { specifier: string; uri: string; path: string; start: number; length: number }[] {
  const out: { specifier: string; uri: string; path: string; start: number; length: number }[] = [];
  const file = ts.createSourceFile(HOST_PATH, text, ts.ScriptTarget.ES2022, true);
  for (const statement of file.statements) {
    const specifier =
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier
        : undefined;
    if (!specifier || !/^\.\.?\//.test(specifier.text)) continue;
    const written = specifier.text;
    const named = /\.ts$/.test(written) ? written : `${written}.shade.ts`;
    if (!/\.shade\.ts$/.test(named)) continue;
    const uri = new URL(named, HOST_URI).toString();
    if (read(uri) === undefined) continue;
    out.push({
      specifier: written,
      uri,
      path: decodeURI(new URL(uri).pathname),
      start: specifier.getStart(),
      length: specifier.getWidth(),
    });
  }
  return out;
}

// ── The type checker ───────────────────────────────────────────────────────────────────────

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  noEmit: true,
  strict: true,
  skipLibCheck: true,
  esModuleInterop: true,
  types: [],
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.dom.asynciterable.d.ts'],
  baseUrl: '/',
  paths: {
    'typeshade/runtime': [`${TYPES_ROOT}src/runtime.d.ts`],
    'typeshade/runtime/internal': [`${TYPES_ROOT}src/runtime-internal.d.ts`],
    'typeshade/fuse': [`${TYPES_ROOT}src/fuse.d.ts`],
  },
};

/** host.ts and the views it imports, each with a version the service compares. */
const scripts = new Map<string, { text: string; version: number }>();
const setScript = (path: string, text: string): void => {
  const current = scripts.get(path);
  if (current?.text !== text) scripts.set(path, { text, version: (current?.version ?? 0) + 1 });
};

let service: ts.LanguageService | undefined;
function languageService(types: HostTypes): ts.LanguageService {
  if (service) return service;
  const read = (path: string): string | undefined =>
    scripts.get(path)?.text ??
    (path.startsWith(LIB_DIR) ? types.libs[path.slice(LIB_DIR.length)] : types.files[path]);
  const directories = new Set<string>();
  for (const file of Object.keys(types.files)) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join('/') || '/');
  }
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => OPTIONS,
    getScriptFileNames: () => [HOST_PATH],
    getScriptVersion: (path) => String(scripts.get(path)?.version ?? 0),
    getScriptSnapshot: (path) => {
      const text = read(path);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => '/',
    getDefaultLibFileName: () => `${LIB_DIR}lib.d.ts`,
    fileExists: (path) => read(path) !== undefined,
    readFile: read,
    directoryExists: (path) => path === '/' || directories.has(path.replace(/\/$/, '')),
    getDirectories: () => [],
  };
  service = ts.createLanguageService(host, ts.createDocumentRegistry());
  return service;
}

/** Puts host.ts and the view of each module it imports into the service, and says which of
 *  those modules does not compile, on the import that names it. */
function prepare(text: string, read: (uri: string) => string | undefined): TypeshadeDiagnostic[] {
  setScript(HOST_PATH, text);
  const problems: TypeshadeDiagnostic[] = [];
  for (const found of shaderImports(text, read)) {
    const face = faceOf(found.uri, read);
    setScript(found.path, face?.view ?? 'export {};\n');
    const first = face?.diagnostics.find((d) => d.category === 'error');
    if (face?.view === undefined)
      problems.push(
        diagnostic(
          text,
          found.start,
          found.length,
          `${found.path.slice(1)}: ${first?.message ?? 'the module does not compile'}`,
          'error',
          first?.code ?? '',
        ),
      );
  }
  return problems;
}

const lineStarts = (text: string): number[] => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
};
const positionAt = (text: string, offset: number): TypeshadePosition => {
  const starts = lineStarts(text);
  let line = 0;
  while (line + 1 < starts.length && starts[line + 1]! <= offset) line += 1;
  return { line, character: offset - starts[line]! };
};
const offsetAt = (text: string, position: TypeshadePosition): number => {
  const starts = lineStarts(text);
  const start = starts[Math.min(position.line, starts.length - 1)] ?? 0;
  return Math.min(text.length, start + position.character);
};

function diagnostic(
  text: string,
  start: number,
  length: number,
  message: string,
  severity: TypeshadeDiagnostic['severity'],
  code: string | number,
): TypeshadeDiagnostic {
  return {
    uri: HOST_URI,
    range: { start: positionAt(text, start), end: positionAt(text, start + length) },
    span: { start, length },
    severity,
    message,
    code,
    source: 'typescript',
  };
}

/** host.ts's diagnostics: TypeScript's, syntax and types, against the DOM, the runtime and the
 *  host view of each module it imports. */
export async function hostDiagnostics(
  text: string,
  typesUrl: string,
  read: (uri: string) => string | undefined,
): Promise<TypeshadeDiagnostic[]> {
  const types = await loadTypes(typesUrl);
  const problems = prepare(text, read);
  const ls = languageService(types);
  const found = [
    ...ls.getSyntacticDiagnostics(HOST_PATH),
    ...ls.getSemanticDiagnostics(HOST_PATH),
  ].map((d) =>
    diagnostic(
      text,
      d.start ?? 0,
      d.length ?? 0,
      ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      d.category === ts.DiagnosticCategory.Error
        ? 'error'
        : d.category === ts.DiagnosticCategory.Warning
          ? 'warning'
          : 'information',
      d.code,
    ),
  );
  return [...problems, ...found];
}

/** What TypeScript says about the name at `position`, as the editor's hover shows it. */
export async function hostHover(
  text: string,
  typesUrl: string,
  read: (uri: string) => string | undefined,
  position: TypeshadePosition,
): Promise<TypeshadeHover | undefined> {
  const types = await loadTypes(typesUrl);
  prepare(text, read);
  const info = languageService(types).getQuickInfoAtPosition(HOST_PATH, offsetAt(text, position));
  if (!info) return undefined;
  const signature = ts.displayPartsToString(info.displayParts);
  const docs = ts.displayPartsToString(info.documentation);
  return {
    contents: `\`\`\`typescript\n${signature}\n\`\`\`${docs ? `\n\n${docs}` : ''}`,
    range: {
      start: positionAt(text, info.textSpan.start),
      end: positionAt(text, info.textSpan.start + info.textSpan.length),
    },
  };
}

const COMPLETION_KINDS: Partial<Record<string, TypeshadeCompletionItem['kind']>> = {
  [ts.ScriptElementKind.keyword]: 'keyword',
  [ts.ScriptElementKind.functionElement]: 'function',
  [ts.ScriptElementKind.localFunctionElement]: 'function',
  [ts.ScriptElementKind.memberFunctionElement]: 'function',
  [ts.ScriptElementKind.classElement]: 'type',
  [ts.ScriptElementKind.interfaceElement]: 'type',
  [ts.ScriptElementKind.typeElement]: 'type',
  [ts.ScriptElementKind.enumElement]: 'type',
  [ts.ScriptElementKind.memberVariableElement]: 'field',
  [ts.ScriptElementKind.memberGetAccessorElement]: 'field',
  [ts.ScriptElementKind.memberSetAccessorElement]: 'field',
  [ts.ScriptElementKind.moduleElement]: 'struct',
};

/** What may be written at `position`. */
export async function hostCompletions(
  text: string,
  typesUrl: string,
  read: (uri: string) => string | undefined,
  position: TypeshadePosition,
): Promise<TypeshadeCompletionItem[]> {
  const types = await loadTypes(typesUrl);
  prepare(text, read);
  const result = languageService(types).getCompletionsAtPosition(
    HOST_PATH,
    offsetAt(text, position),
    { includeCompletionsWithInsertText: true },
  );
  return (result?.entries ?? []).slice(0, 400).map((entry) => ({
    label: entry.name,
    kind: COMPLETION_KINDS[entry.kind] ?? 'variable',
    sortText: entry.sortText,
    ...(entry.insertText ? { insertText: entry.insertText } : {}),
  }));
}

// ── The build ──────────────────────────────────────────────────────────────────────────────

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** For each line of the transpiled code, the line of host.ts its first mapping names, read off
 *  the source map's VLQ `mappings`. A line with no mapping keeps the line before it. */
function lineMap(mappings: string): number[] {
  const out: number[] = [];
  let source = 0;
  let last = 0;
  for (const line of mappings.split(';')) {
    let first: number | undefined;
    for (const segment of line.split(',')) {
      if (segment === '') continue;
      const fields: number[] = [];
      let value = 0;
      let shift = 0;
      for (const char of segment) {
        const digit = BASE64.indexOf(char);
        value += (digit & 31) << shift;
        if (digit & 32) shift += 5;
        else {
          fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
          value = 0;
          shift = 0;
        }
      }
      if (fields.length >= 4) {
        source += fields[2]!;
        first ??= source;
      }
    }
    if (first !== undefined) last = first;
    out.push(last);
  }
  return out;
}

const COMMONJS: ts.CompilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
};

/** host.ts and the modules it imports, as the frame runs them. */
export function hostBuild(text: string, read: (uri: string) => string | undefined): HostBuild {
  const modules: Record<string, string> = {};
  const problems: string[] = [];
  for (const found of shaderImports(text, read)) {
    const face = faceOf(found.uri, read);
    if (face?.code === undefined) {
      const first = face?.diagnostics.find((d) => d.category === 'error');
      problems.push(`${found.path.slice(1)}: ${first?.message ?? 'the module does not compile'}`);
      continue;
    }
    modules[found.specifier] = ts.transpileModule(face.code, {
      compilerOptions: COMMONJS,
      fileName: `${found.path.slice(1)}.js`,
    }).outputText;
  }
  const out = ts.transpileModule(text, {
    compilerOptions: { ...COMMONJS, sourceMap: true },
    fileName: 'host.ts',
  });
  const code = out.outputText.replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n');
  const map = JSON.parse(out.sourceMapText ?? '{"mappings":""}') as { mappings: string };
  return { host: { code, lines: lineMap(map.mappings) }, modules, problems };
}

/** The host.ts a workspace opens with when its example brings none (playground-host-default.ts),
 *  for the main file at `uri`. */
export function hostStarter(uri: string, read: (uri: string) => string | undefined): string {
  const face = faceOf(uri, read);
  const file = decodeURI(new URL(uri).pathname).slice(1);
  return defaultHost(file, face?.exports ?? []);
}
