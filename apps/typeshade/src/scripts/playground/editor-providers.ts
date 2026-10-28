import type {
  TypeshadeRange,
  TypeshadeDocumentSymbol,
} from '../../../vendor/shader-dsl/src/language-service/index.ts';
import {
  HOST_URI,
  SEMANTIC_TOKEN_MODIFIERS,
  SEMANTIC_TOKEN_TYPES,
  encodeSemanticTokens,
  type LanguageClient,
} from '../playground-language.ts';
import { completionKind, symbolKind } from './monaco.ts';
import { createSourceCoordinates, type MonacoPosition } from './source-coordinates.ts';
interface EditorState {
  model: any;
  documentUri: string;
  version: number;
  hostModel: any;
  hostTypes: string;
  client: LanguageClient | undefined;
}
export function registerEditorProviders(
  monaco: any,
  state: () => EditorState,
  pathOfUri: (uri: string) => string | undefined,
  coordinates: ReturnType<typeof createSourceCoordinates>,
  workspace: {
    modelForPath: (path: string) => any;
    openFile: (path: string, selection: any) => void;
  },
) {
  const { inPrelude, outOfDocument, toMonacoRange, toServicePosition } = coordinates;
  // ── The providers, one per service method ─────────────────────────────────────────
  // Each asks the worker about the document at the version the editor holds and hands
  // back what it answers; the client resolves `undefined` for an answer about a version
  // the editor has left, and each provider turns that into nothing. Positions cross in
  // the four helpers at the top of this file and nowhere else.
  // Every file of the workspace is a document the service holds, so every provider
  // answers for whichever one the editor shows. The main file's lines cross through the
  // prelude helpers; a file beside it has no prelude, so its lines are the service's.
  /** The document a model is, or undefined for a model that is not the workspace's. */
  const docOf = (
    currentModel: any,
  ):
    | {
        uri: string;
        main: boolean;
      }
    | undefined => {
    const uri = currentModel.uri.toString();
    if (uri === state().model.uri.toString()) return { uri: state().documentUri, main: true };
    const path = pathOfUri(uri);
    return path ? { uri, main: false } : undefined;
  };
  const isOurs = (currentModel: any): boolean => docOf(currentModel) !== undefined;
  const uriIn = (currentModel: any): string => docOf(currentModel)?.uri ?? state().documentUri;
  const mainModel = (currentModel: any): boolean => docOf(currentModel)?.main ?? true;
  const monacoRange = (range: TypeshadeRange, main = true) => {
    if (!main) {
      return new monaco.Range(
        range.start.line + 1,
        range.start.character + 1,
        range.end.line + 1,
        range.end.character + 1,
      );
    }
    const r = toMonacoRange(range);
    return new monaco.Range(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn);
  };
  const here = (position: MonacoPosition, main = true) => ({
    position: main
      ? toServicePosition(position)
      : { line: position.lineNumber - 1, character: position.column - 1 },
  });
  monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['@', '"', ':', '.'],
    provideCompletionItems: async (currentModel: any, position: MonacoPosition) => {
      const { client } = state();
      const onHost = currentModel === state().hostModel;
      if ((!onHost && !isOurs(currentModel)) || !client) return { suggestions: [] };
      // host.ts is TypeScript, answered by its own checker in the worker.
      const items = onHost
        ? await client.request('hostCompletions', HOST_URI, state().version, {
            text: currentModel.getValue(),
            types: state().hostTypes,
            ...here(position, false),
          })
        : await client.request(
            'completions',
            uriIn(currentModel),
            state().version,
            here(position, mainModel(currentModel)),
          );
      if (!items) return { suggestions: [] };
      const word = currentModel.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      // Monaco's word does not include a leading `@`, so an attribute offered after one
      // has already been typed would insert it twice unless the item says otherwise.
      const before = currentModel.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: word.startColumn,
      });
      return {
        suggestions: items.map((item) => ({
          label: item.label,
          kind: completionKind(monaco, item.kind),
          insertText:
            item.insertText ??
            (item.label.startsWith('@') && before.endsWith('@') ? item.label.slice(1) : item.label),
          insertTextRules:
            item.insertTextFormat === 'snippet'
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
          detail: item.detail,
          documentation: item.documentation ? { value: item.documentation } : undefined,
          sortText: item.sortText,
          filterText: item.filterText,
          range: item.textEdit ? monacoRange(item.textEdit.range, mainModel(currentModel)) : range,
        })),
      };
    },
  });
  monaco.languages.registerHoverProvider('typescript', {
    provideHover: async (currentModel: any, position: MonacoPosition) => {
      const { client } = state();
      const onHost = currentModel === state().hostModel;
      if ((!onHost && !isOurs(currentModel)) || !client) return null;
      const hover = onHost
        ? await client.request('hostHover', HOST_URI, state().version, {
            text: currentModel.getValue(),
            types: state().hostTypes,
            ...here(position, false),
          })
        : await client.request(
            'hover',
            uriIn(currentModel),
            state().version,
            here(position, mainModel(currentModel)),
          );
      if (!hover) return null;
      return {
        contents: [{ value: hover.contents }],
        range: monacoRange(hover.range, !onHost && mainModel(currentModel)),
      };
    },
  });
  // A location in a workspace file lands on that file's model, and the opener below
  // brings its tab up. One inside the prelude is dropped, since the editor does not hold
  // those lines, and so is one outside the workspace.
  const ownLocations = (
    locations:
      | readonly {
          uri: string;
          range: TypeshadeRange;
        }[]
      | undefined,
  ) =>
    (locations ?? []).flatMap((location) => {
      const path = pathOfUri(location.uri);
      if (path === undefined) return [];
      if (path === '') {
        if (inPrelude(location.range.start.line)) return [];
        return [{ uri: state().model.uri, range: monacoRange(location.range) }];
      }
      const target = workspace.modelForPath(path);
      return target ? [{ uri: target.uri, range: monacoRange(location.range, false) }] : [];
    });
  // Go to definition into another file: the standalone editor opens nothing on its own,
  // so the page switches the tab and puts the cursor where the definition is.
  monaco.editor.registerEditorOpener?.({
    openCodeEditor: (_source: any, resource: any, selectionOrPosition: any) => {
      const path = pathOfUri(resource.toString());
      if (path === undefined) return false;
      workspace.openFile(path, selectionOrPosition);
      return true;
    },
  });
  monaco.languages.registerDefinitionProvider('typescript', {
    provideDefinition: async (currentModel: any, position: MonacoPosition) => {
      const { client } = state();
      if (!isOurs(currentModel) || !client) return null;
      return ownLocations(
        await client.request(
          'definition',
          uriIn(currentModel),
          state().version,
          here(position, mainModel(currentModel)),
        ),
      );
    },
  });
  monaco.languages.registerReferenceProvider('typescript', {
    provideReferences: async (
      currentModel: any,
      position: MonacoPosition,
      context: {
        includeDeclaration: boolean;
      },
    ) => {
      const { client } = state();
      if (!isOurs(currentModel) || !client) return null;
      return ownLocations(
        await client.request('references', uriIn(currentModel), state().version, {
          ...here(position, mainModel(currentModel)),
          includeDeclaration: context.includeDeclaration,
        }),
      );
    },
  });
  const toDocumentSymbol = (symbol: TypeshadeDocumentSymbol, main = true): any => ({
    name: symbol.name,
    detail: symbol.detail ?? '',
    kind: symbolKind(monaco, symbol.kind),
    tags: [],
    range: monacoRange(symbol.range, main),
    selectionRange: monacoRange(symbol.selectionRange, main),
    children: symbol.children?.map((child) => toDocumentSymbol(child, main)),
  });
  monaco.languages.registerDocumentSymbolProvider('typescript', {
    provideDocumentSymbols: async (currentModel: any) => {
      const { client } = state();
      if (!isOurs(currentModel) || !client) return null;
      const symbols = await client.request('symbols', uriIn(currentModel), state().version, {});
      const main = mainModel(currentModel);
      return symbols ? symbols.map((symbol) => toDocumentSymbol(symbol, main)) : null;
    },
  });
  monaco.languages.registerSignatureHelpProvider('typescript', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    provideSignatureHelp: async (currentModel: any, position: MonacoPosition) => {
      const { client } = state();
      if (!isOurs(currentModel) || !client) return null;
      const help = await client.request(
        'signatureHelp',
        uriIn(currentModel),
        state().version,
        here(position, mainModel(currentModel)),
      );
      if (!help) return null;
      return {
        value: {
          signatures: help.signatures.map((signature) => ({
            label: signature.label,
            documentation: signature.documentation ? { value: signature.documentation } : undefined,
            parameters: signature.parameters.map((parameter) => ({
              label: parameter.label,
              documentation: parameter.documentation
                ? { value: parameter.documentation }
                : undefined,
            })),
          })),
          activeSignature: help.activeSignature,
          activeParameter: help.activeParameter,
        },
        dispose: () => {},
      };
    },
  });
  monaco.languages.registerRenameProvider('typescript', {
    resolveRenameLocation: async (currentModel: any, position: MonacoPosition) => {
      const { client } = state();
      if (!isOurs(currentModel) || !client) return null;
      const prepared = await client.request(
        'prepareRename',
        uriIn(currentModel),
        state().version,
        here(position, mainModel(currentModel)),
      );
      return prepared
        ? {
            range: monacoRange(prepared.range, mainModel(currentModel)),
            text: prepared.placeholder,
          }
        : null;
    },
    provideRenameEdits: async (currentModel: any, position: MonacoPosition, newName: string) => {
      const { client } = state();
      if (!isOurs(currentModel) || !client) return null;
      const edits = await client.request('rename', uriIn(currentModel), state().version, {
        ...here(position, mainModel(currentModel)),
        newName,
      });
      if (!edits) return null;
      // A name the prelude also declares would be renamed in there too, and the editor
      // holds none of those lines, so the edit has nowhere to land. The rename is
      // refused whole instead of applied to half the occurrences. So is one that reaches
      // a file outside the workspace.
      if ((edits[state().documentUri] ?? []).some((edit) => inPrelude(edit.range.start.line)))
        return null;
      const out: {
        resource: any;
        textEdit: any;
        versionId: undefined;
      }[] = [];
      for (const [uri, list] of Object.entries(edits)) {
        const path = pathOfUri(uri);
        if (path === undefined) return null;
        const target = path === '' ? state().model : workspace.modelForPath(path);
        if (!target) return null;
        for (const edit of list) {
          out.push({
            resource: target.uri,
            textEdit: { range: monacoRange(edit.range, path === ''), text: edit.newText },
            versionId: undefined,
          });
        }
      }
      return { edits: out };
    },
  });
  // The colouring: the compiler's own classification of every token, delta-encoded the way
  // Monaco takes it. Monaco asks again after each edit and keeps the last tokens it was
  // given until then, so an answer dropped for being stale costs nothing but a moment.
  monaco.languages.registerDocumentSemanticTokensProvider('typescript', {
    getLegend: () => ({
      tokenTypes: [...SEMANTIC_TOKEN_TYPES],
      tokenModifiers: [...SEMANTIC_TOKEN_MODIFIERS],
    }),
    provideDocumentSemanticTokens: async (currentModel: any) => {
      const { client } = state();
      if (!isOurs(currentModel) || !client) return null;
      const tokens = await client.request(
        'semanticTokens',
        uriIn(currentModel),
        state().version,
        {},
      );
      if (!tokens) return null;
      if (!mainModel(currentModel)) return { data: encodeSemanticTokens(tokens) };
      // The compiler classified the composed text, so the prelude's tokens come back
      // too. They are dropped and the rest move up, since the encoding is a delta over
      // the lines the editor actually holds.
      const own = tokens
        .filter((token) => !inPrelude(token.line))
        .map((token) => ({ ...token, line: outOfDocument(token.line) }));
      return { data: encodeSemanticTokens(own) };
    },
    releaseDocumentSemanticTokens: () => {},
  });
}
