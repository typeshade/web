// The Playground's language worker. It holds the one thing the page must not: the TypeShade
// front end and the TypeScript compiler it is built on, about a megabyte gzipped, which is
// what a language service costs and what a main thread cannot carry without stuttering on
// every keystroke.
//
// It owns one `createTypeshadeLanguageService` and answers the page's questions against it.
// An `update` stores the text and answers nothing; a query answers for the document at the
// version it names, and the reply carries that version back so the page can drop an answer
// about a document it no longer holds. Every method of the service is synchronous, so each
// message is one call and one reply, in order.
//
// A document can import another shader file (Rule 3.9). The editor holds every file of the
// workspace as a document of its own, sent with `update` like the one the canvas runs, and the
// page may also send files it does not hold as `files`. Both halves read an import through the
// same lookup, an open document first: the service through its host's `readDocument`, and the
// compile that lowers the module through `compile()`'s, so the two read one program and an
// edit to an imported file reaches both.
import { compile } from '../../vendor/shader-dsl/src/compiler/ts/compile.ts';
import {
  createTypeshadeLanguageService,
  type TypeshadeLanguageService,
} from '../../vendor/shader-dsl/src/language-service/index.ts';
import type { Analysis, LanguageReply, LanguageRequest } from './playground-language.ts';
import { mergeCompileDiagnostics } from './playground-diagnostics.ts';
import {
  hostBuild,
  hostCompletions,
  hostDiagnostics,
  hostHover,
  hostStarter,
} from './playground-host-service.ts';

let service: TypeshadeLanguageService | undefined;
/** The text of every open document, since the service keeps its own copy and does not hand
 *  it back, and an analysis compiles the text again for the module. */
const texts = new Map<string, string>();
/** The files a document may import and the editor does not hold, by uri. */
const files = new Map<string, string>();
const readDocument = (uri: string): string | undefined => texts.get(uri) ?? files.get(uri);

const reply = (message: LanguageReply): void => {
  (self as unknown as Worker).postMessage(message);
};

/**
 * The diagnostics, and the module when they allow one. The service lowers the document once
 * for its diagnostics and keeps that analysis for hover, symbols and tokens, but it does not
 * expose the IR it built, so a clean document is compiled a second time here for the module
 * the page's panes and canvas are drawn from. That is one extra lowering per settled edit,
 * off the main thread, and never when an error means there is nothing to emit anyway.
 */
function analyse(languageService: TypeshadeLanguageService, uri: string): Analysis {
  const diagnostics = languageService.getDiagnostics(uri);
  const hasDirective = !diagnostics.some((diagnostic) => diagnostic.code === 'TS8001');
  const failed = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (failed || !hasDirective) return { diagnostics, hasDirective };
  const text = texts.get(uri);
  if (text === undefined) return { diagnostics, hasDirective };
  const result = compile(text, { fileName: uri, readDocument });
  const merged = mergeCompileDiagnostics(diagnostics, result.diagnostics);
  if (result.diagnostics.some((diagnostic) => diagnostic.category === 'error'))
    return { diagnostics: merged, hasDirective };
  return { diagnostics: merged, hasDirective, module: result.module };
}

self.addEventListener('message', (event: MessageEvent<LanguageRequest>) => {
  const request = event.data;
  try {
    if (request.kind === 'files') {
      files.clear();
      for (const [uri, text] of Object.entries(request.files)) files.set(uri, text);
      return;
    }

    service ??= createTypeshadeLanguageService({ readDocument });

    if (request.kind === 'close') {
      if (texts.delete(request.uri)) service.closeDocument(request.uri);
      return;
    }

    if (request.kind === 'update') {
      if (texts.has(request.uri))
        service.updateDocument(request.uri, request.text, request.version);
      else service.openDocument(request.uri, request.text, request.version);
      texts.set(request.uri, request.text);
      return;
    }

    const { id, uri, version } = request;
    // host.ts's questions (playground-host-service.ts). Three of them wait for the declarations
    // host.ts is checked against, so their answers come back when those have arrived; the
    // worker meanwhile answers whatever comes next. A host.ts the worker cannot check answers
    // with nothing, since a failure would read as the whole service failing.
    const later = <T>(result: Promise<T>, fallback: T): void => {
      void result
        .catch((error: unknown) => {
          console.error('[playground] host.ts', error);
          return fallback;
        })
        .then((value) => reply({ id, version, ok: true, result: value as never }));
    };
    switch (request.kind) {
      case 'hostDiagnostics':
        later(hostDiagnostics(request.text, request.types, readDocument), []);
        return;
      case 'hostHover':
        later(hostHover(request.text, request.types, readDocument, request.position), undefined);
        return;
      case 'hostCompletions':
        later(hostCompletions(request.text, request.types, readDocument, request.position), []);
        return;
      case 'hostBuild': {
        const { text } = request;
        later(
          Promise.resolve().then(() => hostBuild(text, readDocument)),
          { host: { code: '', lines: [] }, modules: {}, problems: [] },
        );
        return;
      }
      case 'hostStarter':
        later(
          Promise.resolve().then(() => hostStarter(uri, readDocument)),
          '',
        );
        return;
      case 'analysis':
        reply({ id, version, ok: true, result: analyse(service, uri) });
        return;
      case 'hover':
        reply({ id, version, ok: true, result: service.getHover(uri, request.position) });
        return;
      case 'completions':
        reply({ id, version, ok: true, result: service.getCompletions(uri, request.position) });
        return;
      case 'definition':
        reply({ id, version, ok: true, result: service.getDefinition(uri, request.position) });
        return;
      case 'references':
        reply({
          id,
          version,
          ok: true,
          result: service.getReferences(uri, request.position, {
            includeDeclaration: request.includeDeclaration,
          }),
        });
        return;
      case 'symbols':
        reply({ id, version, ok: true, result: service.getDocumentSymbols(uri) });
        return;
      case 'signatureHelp':
        reply({ id, version, ok: true, result: service.getSignatureHelp(uri, request.position) });
        return;
      case 'prepareRename':
        reply({ id, version, ok: true, result: service.prepareRename(uri, request.position) });
        return;
      case 'rename':
        reply({
          id,
          version,
          ok: true,
          result: service.rename(uri, request.position, request.newName),
        });
        return;
      case 'semanticTokens':
        reply({ id, version, ok: true, result: service.getSemanticTokens(uri) });
        return;
    }
  } catch (error) {
    if (request.kind === 'update' || request.kind === 'files' || request.kind === 'close') return;
    reply({
      id: request.id,
      version: request.version,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
