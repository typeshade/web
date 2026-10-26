import { describe, expect, test } from 'bun:test';
import { compose, createSourceCoordinates } from '../src/scripts/playground/source-coordinates.ts';
import { registerEditorProviders } from '../src/scripts/playground/editor-providers.ts';

describe('editor and compiler source coordinates', () => {
  const fragment = '"use typeshade";\n@fragment\nfunction main(): vec4 { return vec4(1.0); }\n';

  test('maps diagnostics back through the inserted vertex prelude', () => {
    const source = compose(fragment);
    expect(source.lines).toBeGreaterThan(0);
    const coordinates = createSourceCoordinates();
    coordinates.setPrelude(source);
    const position = { lineNumber: 3, column: 7 };
    expect(coordinates.toMonacoPosition(coordinates.toServicePosition(position))).toEqual(position);
    expect(coordinates.toDisplayPosition({ line: 2 + source.lines, character: 6 })).toBe('3:7');
    expect(coordinates.inPrelude(source.at)).toBe(true);
    expect(coordinates.inPrelude(source.at + source.lines)).toBe(false);
    expect(
      coordinates.toMonacoRange({
        start: { line: 2 + source.lines, character: 6 },
        end: { line: 2 + source.lines, character: 6 },
      }),
    ).toEqual({ startLineNumber: 3, startColumn: 7, endLineNumber: 3, endColumn: 8 });
  });

  test('keeps editors independent and clears the mapping when the program changes', () => {
    const first = createSourceCoordinates();
    const second = createSourceCoordinates();
    first.setPrelude(compose(fragment));
    expect(first.intoDocument(2)).toBeGreaterThan(2);
    expect(second.intoDocument(2)).toBe(2);
    first.setPrelude(compose('"use typeshade";\n@compute\nfunction main() {}'));
    expect(first.intoDocument(2)).toBe(2);
  });

  test('preserves files with no directive, a vertex entry, or a prelude name', () => {
    for (const source of [
      fragment.replace('"use typeshade";\n', ''),
      fragment + '\n@vertex\nfunction vertex() {}',
      fragment + '\nclass VsOut {}',
    ]) {
      expect(compose(source)).toEqual({ text: source, at: 0, lines: 0 });
    }
  });
});

test('registered providers follow the current document and client after a rename', async () => {
  const providers: Record<string, any> = {};
  const calls: unknown[][] = [];
  const uri = (value: string) => ({ toString: () => value });
  const state: any = {
    model: { uri: uri('file:///before.shade.ts') },
    documentUri: 'file:///before.shade.ts',
    version: 1,
    hostTypes: '',
    client: undefined,
  };
  const monaco: any = {
    languages: new Proxy(
      {},
      {
        get: (_, name) => (_language: string, provider: unknown) => {
          providers[String(name)] = provider;
        },
      },
    ),
    editor: {},
  };
  registerEditorProviders(
    monaco,
    () => state,
    () => undefined,
    createSourceCoordinates(),
    { modelForPath: () => undefined, openFile: () => {} },
  );
  const symbols = providers.registerDocumentSymbolProvider;
  expect(await symbols.provideDocumentSymbols(state.model)).toBeNull();
  state.model = { uri: uri('file:///renamed.shade.ts') };
  state.documentUri = 'file:///renamed.shade.ts';
  state.version = 7;
  state.client = {
    request: async (...args: unknown[]) => {
      calls.push(args);
      return [];
    },
  };
  expect(await symbols.provideDocumentSymbols(state.model)).toEqual([]);
  expect(calls).toEqual([['symbols', 'file:///renamed.shade.ts', 7, {}]]);
  state.client = undefined;
  expect(await symbols.provideDocumentSymbols(state.model)).toBeNull();
});
