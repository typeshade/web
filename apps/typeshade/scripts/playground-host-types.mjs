// The declarations the Playground's host.ts is type-checked against, as one JSON asset the
// language worker fetches the first time a reader opens host.ts or runs it: TypeScript's own
// lib files for ES2022 and the DOM, and the declarations of the three entries a host imports,
// `typeshade/runtime`, `typeshade/runtime/internal` (what a generated module's host view names)
// and `typeshade/fuse`, emitted from the vendored compiler at build time. Nothing here is
// written by hand, so the types follow the pin.
//
// It is a Vite plugin with one virtual module, `virtual:playground-host-types`, whose default
// export is the asset's URL. The asset is not in the page's bundle: a reader who never opens
// host.ts never downloads it.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const ID = 'virtual:playground-host-types';
const RESOLVED = `\0${ID}`;
const DEV_PATH = '/@playground-host-types.json';

/** The lib files a host is checked against, before their `/// <reference lib>` closure. */
const LIBS = ['es2022', 'dom', 'dom.iterable', 'dom.asynciterable'];
/** The entries a host can import, by specifier, and the source each one is. */
export const HOST_ENTRIES = {
  'typeshade/runtime': 'src/runtime.ts',
  'typeshade/runtime/internal': 'src/runtime-internal.ts',
  'typeshade/fuse': 'src/fuse.ts',
};
/** Where the declarations sit in the worker's virtual file system. */
export const TYPES_ROOT = '/node_modules/typeshade/';

/** `lib.<name>.d.ts` and every lib file it references, by file name. */
function libFiles(libDir) {
  const out = {};
  const queue = LIBS.map((name) => `lib.${name}.d.ts`);
  while (queue.length > 0) {
    const file = queue.pop();
    if (out[file] !== undefined) continue;
    const text = readFileSync(path.join(libDir, file), 'utf8');
    out[file] = text;
    for (const ref of ts.preProcessFile(text, true, true).libReferenceDirectives)
      queue.push(`lib.${ref.fileName.toLowerCase()}.d.ts`);
  }
  return out;
}

/** The declarations of the host entries and of every file they name, by path under
 *  TYPES_ROOT. The emit covers every file the entries import, and only the ones a declaration
 *  reaches are kept: an implementation detail the types never name stays out. */
function runtimeDeclarations(compilerRoot) {
  const emitted = {};
  const entries = Object.values(HOST_ENTRIES).map((file) => path.join(compilerRoot, file));
  const program = ts.createProgram(entries, {
    declaration: true,
    emitDeclarationOnly: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    skipLibCheck: true,
    experimentalDecorators: true,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    rootDir: compilerRoot,
    outDir: '/out',
  });
  const result = program.emit(undefined, (name, text) => {
    emitted[name] = text;
  });
  if (result.emitSkipped) throw new Error('[playground-host-types] the declaration emit failed');
  const kept = {};
  const queue = Object.values(HOST_ENTRIES).map((file) =>
    path.posix.join('/out', file.replace(/\.ts$/, '.d.ts')),
  );
  while (queue.length > 0) {
    const file = queue.pop();
    if (kept[file] !== undefined) continue;
    const text = emitted[file];
    if (text === undefined)
      throw new Error(`[playground-host-types] a declaration names ${file}, which was not emitted`);
    kept[file] = text;
    for (const { fileName } of ts.preProcessFile(text, true, true).importedFiles) {
      if (!fileName.startsWith('.'))
        throw new Error(`[playground-host-types] ${file} imports ${fileName}, outside the package`);
      queue.push(path.posix.resolve(path.posix.dirname(file), fileName).replace(/\.js$/, '.d.ts'));
    }
  }
  return Object.fromEntries(
    Object.entries(kept).map(([file, text]) => [
      `${TYPES_ROOT}${file.slice('/out/'.length)}`,
      text,
    ]),
  );
}

/** The asset's text: `{ libs: { 'lib.dom.d.ts': text }, files: { '/node_modules/…': text } }`. */
export function hostTypes(root) {
  const require = createRequire(path.join(root, 'package.json'));
  const libDir = path.dirname(require.resolve('typescript/lib/lib.d.ts'));
  return JSON.stringify({
    libs: libFiles(libDir),
    files: runtimeDeclarations(path.join(root, 'vendor/shader-dsl')),
  });
}

/** The Vite plugin. In a build the asset is emitted under `_astro/` with a content hash; under
 *  `astro dev` the server answers for it at one fixed path. */
export function playgroundHostTypes(root) {
  let text;
  const build = () => (text ??= hostTypes(root));
  let serving = false;
  return {
    name: 'typeshade:playground-host-types',
    configResolved(config) {
      serving = config.command === 'serve';
    },
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      if (serving) return `export default ${JSON.stringify(DEV_PATH)};`;
      const ref = this.emitFile({ type: 'asset', name: 'host-types.json', source: build() });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
    configureServer(server) {
      server.middlewares.use(DEV_PATH, (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.end(build());
      });
    },
  };
}
