// What crosses between the Playground and its language worker, and the two pure pieces both
// halves agree on: the request and reply shapes, the client that sends requests and drops the
// replies that come back for a document version the editor has moved past, and the encoder
// that turns the service's tokens into the delta-encoded array Monaco takes.
//
// Nothing here imports the compiler or Monaco. The worker imports the types; the page imports
// the client and the encoder; the encoder and the client's version gate can be exercised with
// no browser at all.
import type {
  TypeshadeCompletionItem,
  TypeshadeDiagnostic,
  TypeshadeDocumentSymbol,
  TypeshadeHover,
  TypeshadeLocation,
  TypeshadePosition,
  TypeshadeRange,
  TypeshadeSemanticToken,
  TypeshadeSemanticTokenModifier,
  TypeshadeSemanticTokenType,
  TypeshadeSignatureHelp,
  TypeshadeTextEdit,
} from '../../vendor/shader-dsl/src/language-service/index.ts';
import type { HostBuild } from './playground-host-service.ts';

/** The uri the page and the worker know host.ts by: a file at the workspace's root, beside the
 *  main file, so `./<main>.shade.ts` in it names the main file. */
export const HOST_URI = 'file:///host.ts';

// ── Requests ───────────────────────────────────────────────────────────────────────────────
// `update` carries the text and gets no reply: the service stores it and analyses nothing
// until asked, so it is sent on every keystroke and the editor and the worker never disagree
// about what the document says. Everything else carries the version it was asked against, and
// the reply carries it back, so the page can tell an answer about the document it has from an
// answer about one it no longer has.

export interface UpdateRequest {
  readonly kind: 'update';
  readonly uri: string;
  readonly text: string;
  readonly version: number;
}

/** The files a document may import that the editor does not hold, by uri: an example's
 *  library, such as `imported-noise`'s `lib/noise.shade.ts` (Rule 3.9). Sent once, before the
 *  first `update`, and answered by nothing; the worker reads an import through them, in the
 *  service and in the compile, as `readDocument` reads one. */
export interface FilesRequest {
  readonly kind: 'files';
  readonly files: Readonly<Record<string, string>>;
}

/** Drops a document the editor held: a file the reader deleted, or one an example that is no
 *  longer open brought. No reply. A document that imported it resolves the import again on its
 *  next query and finds nothing, which is the diagnostic the reader should see. */
export interface CloseRequest {
  readonly kind: 'close';
  readonly uri: string;
}

interface Asked {
  readonly id: number;
  readonly uri: string;
  readonly version: number;
}

export type QueryRequest =
  | (Asked & { readonly kind: 'analysis' })
  | (Asked & { readonly kind: 'hover'; readonly position: TypeshadePosition })
  | (Asked & { readonly kind: 'completions'; readonly position: TypeshadePosition })
  | (Asked & { readonly kind: 'definition'; readonly position: TypeshadePosition })
  | (Asked & {
      readonly kind: 'references';
      readonly position: TypeshadePosition;
      readonly includeDeclaration: boolean;
    })
  | (Asked & { readonly kind: 'symbols' })
  | (Asked & { readonly kind: 'signatureHelp'; readonly position: TypeshadePosition })
  | (Asked & { readonly kind: 'prepareRename'; readonly position: TypeshadePosition })
  | (Asked & {
      readonly kind: 'rename';
      readonly position: TypeshadePosition;
      readonly newName: string;
    })
  | (Asked & { readonly kind: 'semanticTokens' })
  // host.ts (playground-host-service.ts), which is plain TypeScript and no document of the
  // service: each request carries its text, and `types` is the URL of the declarations it is
  // checked against. `hostStarter` asks for the host.ts a module opens with when its example
  // brings none, for the document `uri` names.
  | (Asked & { readonly kind: 'hostDiagnostics'; readonly text: string; readonly types: string })
  | (Asked & {
      readonly kind: 'hostHover';
      readonly text: string;
      readonly types: string;
      readonly position: TypeshadePosition;
    })
  | (Asked & {
      readonly kind: 'hostCompletions';
      readonly text: string;
      readonly types: string;
      readonly position: TypeshadePosition;
    })
  | (Asked & { readonly kind: 'hostBuild'; readonly text: string })
  | (Asked & { readonly kind: 'hostStarter' });

export type LanguageRequest = UpdateRequest | FilesRequest | CloseRequest | QueryRequest;

/** What one analysis of a document comes back as: the service's diagnostics, whether the file
 *  carried the directive, and the lowered module when nothing was an error. The module is the
 *  compiler's IR, plain data, which crosses by structured clone; the page emits every pane
 *  from it with the options bar and never has to hold the compiler itself. */
export interface Analysis {
  readonly diagnostics: readonly TypeshadeDiagnostic[];
  readonly hasDirective: boolean;
  readonly module?: unknown;
}

export interface ResultByKind {
  readonly analysis: Analysis;
  readonly hover: TypeshadeHover | undefined;
  readonly completions: readonly TypeshadeCompletionItem[];
  readonly definition: readonly TypeshadeLocation[];
  readonly references: readonly TypeshadeLocation[];
  readonly symbols: readonly TypeshadeDocumentSymbol[];
  readonly signatureHelp: TypeshadeSignatureHelp | undefined;
  readonly prepareRename:
    { readonly range: TypeshadeRange; readonly placeholder: string } | undefined;
  readonly rename: Readonly<Record<string, readonly TypeshadeTextEdit[]>>;
  readonly semanticTokens: readonly TypeshadeSemanticToken[];
  readonly hostDiagnostics: readonly TypeshadeDiagnostic[];
  readonly hostHover: TypeshadeHover | undefined;
  readonly hostCompletions: readonly TypeshadeCompletionItem[];
  readonly hostBuild: HostBuild;
  readonly hostStarter: string;
}

export type QueryKind = QueryRequest['kind'];

export type LanguageReply =
  | {
      readonly id: number;
      readonly version: number;
      readonly ok: true;
      readonly result: ResultByKind[QueryKind];
    }
  | { readonly id: number; readonly version: number; readonly ok: false; readonly message: string };

// ── The client ─────────────────────────────────────────────────────────────────────────────

export interface LanguageClient {
  /** Hands the worker the files a document may import and the editor does not hold, by uri.
   *  No reply; sent before the first `update`. */
  files(files: Readonly<Record<string, string>>): void;
  /** Hands the worker the document as it is now. No reply; the next query answers for it. */
  update(uri: string, text: string, version: number): void;
  /** Drops a document the worker holds. No reply. */
  close(uri: string): void;
  /** Asks the worker one question about `uri` at `version`. Resolves to the answer, or to
   *  `undefined` when the editor moved past `version` before the answer arrived, or when the
   *  worker failed to answer (in which case `onFailure` has been told why). */
  request<K extends QueryKind>(
    kind: K,
    uri: string,
    version: number,
    extra: Omit<Extract<QueryRequest, { kind: K }>, keyof Asked | 'kind'>,
  ): Promise<ResultByKind[K] | undefined>;
  /** Ends the worker. Every request still pending resolves to `undefined`. */
  dispose(): void;
}

/**
 * Wraps a worker in the request and reply protocol above. `isCurrent` says whether a version
 * is still the one the editor holds: a reply for any other version is dropped, so a slow
 * answer to an old keystroke never paints over a fast answer to a new one, whatever order the
 * two arrive in.
 */
export function createLanguageClient(
  worker: Worker,
  isCurrent: (version: number) => boolean,
  onFailure: (message: string) => void,
): LanguageClient {
  let nextId = 1;
  let failed = false;
  const pending = new Map<number, (value: ResultByKind[QueryKind] | undefined) => void>();
  const failPending = (message: string): void => {
    failed = true;
    onFailure(message);
    for (const resolve of pending.values()) resolve(undefined);
    pending.clear();
  };
  worker.addEventListener('error', (event) => failPending(event.message));
  worker.addEventListener('messageerror', () => failPending('DataCloneError'));

  worker.addEventListener('message', (event: MessageEvent<LanguageReply>) => {
    const reply = event.data;
    const resolve = pending.get(reply.id);
    if (!resolve) return;
    pending.delete(reply.id);
    if (!isCurrent(reply.version)) {
      resolve(undefined);
      return;
    }
    if (reply.ok) {
      resolve(reply.result);
      return;
    }
    onFailure(reply.message);
    resolve(undefined);
  });

  return {
    files(files) {
      worker.postMessage({ kind: 'files', files } satisfies FilesRequest);
    },
    update(uri, text, version) {
      worker.postMessage({ kind: 'update', uri, text, version } satisfies UpdateRequest);
    },
    close(uri) {
      worker.postMessage({ kind: 'close', uri } satisfies CloseRequest);
    },
    request(kind, uri, version, extra) {
      if (failed) return Promise.resolve(undefined);
      const id = nextId;
      nextId += 1;
      return new Promise((resolve) => {
        pending.set(id, resolve as (value: ResultByKind[QueryKind] | undefined) => void);
        try {
          worker.postMessage({ ...extra, kind, id, uri, version } as QueryRequest);
        } catch (error) {
          failPending(error instanceof Error ? error.message : String(error));
        }
      });
    },
    dispose() {
      worker.terminate();
      for (const resolve of pending.values()) resolve(undefined);
      pending.clear();
    },
  };
}

// ── Semantic tokens ────────────────────────────────────────────────────────────────────────
// The legend is the service's own vocabulary, in a fixed order, so an index into it is stable
// across every document. The two arrays are typed against the service's unions: a type the
// service adds and this does not name fails to compile here, instead of falling out of the
// colouring at run time.

export const SEMANTIC_TOKEN_TYPES = [
  'type',
  'struct',
  'function',
  'parameter',
  'variable',
  'property',
  'decorator',
  'keyword',
  'number',
  'string',
  'operator',
  'builtin',
  'resource',
] as const satisfies readonly TypeshadeSemanticTokenType[];

export const SEMANTIC_TOKEN_MODIFIERS = [
  'declaration',
  'readonly',
  'entry',
  'gpu',
  'defaultLibrary',
] as const satisfies readonly TypeshadeSemanticTokenModifier[];

/**
 * Monaco takes semantic tokens the way the Language Server Protocol does: five integers a
 * token, in document order, each line and start relative to the token before it. Both sides of
 * this are zero-based, so no coordinate conversion belongs here; the one place the page adds 1
 * is its Monaco boundary, and this is not it.
 *
 *   [ deltaLine, deltaStart, length, typeIndex, modifierBits ]
 *
 * `deltaStart` is relative to the previous token's start on the same line and absolute on a
 * new line. A token whose type the legend does not carry is left out.
 */
export function encodeSemanticTokens(tokens: readonly TypeshadeSemanticToken[]): Uint32Array {
  const sorted = [...tokens].sort((a, b) => a.line - b.line || a.character - b.character);
  const data: number[] = [];
  let previousLine = 0;
  let previousStart = 0;
  for (const token of sorted) {
    const typeIndex = SEMANTIC_TOKEN_TYPES.indexOf(token.type);
    if (typeIndex < 0 || token.length <= 0) continue;
    let bits = 0;
    for (const modifier of token.modifiers) {
      const at = SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
      if (at >= 0) bits |= 1 << at;
    }
    const deltaLine = token.line - previousLine;
    const deltaStart = deltaLine === 0 ? token.character - previousStart : token.character;
    data.push(deltaLine, deltaStart, token.length, typeIndex, bits);
    previousLine = token.line;
    previousStart = token.character;
  }
  return Uint32Array.from(data);
}
