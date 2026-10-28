import { expect, test } from 'bun:test';
import { compile } from '../vendor/shader-dsl/src/compiler/ts/compile.ts';
import { createLanguageClient } from '../src/scripts/playground-language.ts';
import {
  diagnosticsForDocument,
  mergeCompileDiagnostics,
} from '../src/scripts/playground-diagnostics.ts';

const entry = 'file:///main.shade.ts';
const imported = 'file:///lib/helper.shade.ts';

test('imported compiler errors retain their URI and range, deduplicate, and recover', () => {
  const source =
    '"use typeshade";\nimport { value } from "./lib/helper.shade.ts";\nfunction result(): f32 { return value(); }';
  let helper =
    '"use typeshade";\nexport function value(): f32 { const v = vec2f(1.0, 2.0); return v.bad; }';
  const readDocument = (uri: string) => (uri === imported ? helper : undefined);
  const broken = compile(source, { fileName: entry, readDocument });
  expect(broken.diagnostics.some((d) => d.category === 'error' && d.fileName === imported)).toBe(
    true,
  );
  const merged = mergeCompileDiagnostics([], broken.diagnostics);
  expect(mergeCompileDiagnostics(merged, broken.diagnostics)).toEqual(merged);
  expect(diagnosticsForDocument(merged, entry)).toEqual([]);
  expect(diagnosticsForDocument(merged, imported).length).toBeGreaterThan(0);
  const diagnostic = broken.diagnostics[0]!;
  expect(merged[0]!.range.start).toEqual({
    line: diagnostic.line - 1,
    character: diagnostic.character - 1,
  });
  expect(merged[0]!.range.end).toEqual({
    line: diagnostic.endLine - 1,
    character: diagnostic.endCharacter - 1,
  });
  helper = '"use typeshade";\nexport function value(): f32 { return 1.0; }';
  expect(compile(source, { fileName: entry, readDocument }).diagnostics).toEqual([]);
});

test('unlocated backend errors and warnings are retained', () => {
  const base = {
    fileName: entry,
    message: 'backend failure',
    start: 0,
    length: 0,
    line: 1,
    character: 1,
    endLine: 1,
    endCharacter: 1,
  };
  const merged = mergeCompileDiagnostics(
    [],
    [
      { ...base, category: 'error', code: 'TS8999' },
      { ...base, category: 'warning', message: 'backend warning' },
    ],
  );
  expect(merged.map((d) => d.severity)).toEqual(['error', 'warning']);
  expect(merged[0]!.uri).toBe(entry);
});

test('a real backend warning survives alongside usable WGSL', () => {
  const result = compile(
    '"use typeshade";\ndeclare const u: uniform<f32>;\n@fragment function main(): vec4 { return vec4(u, u, u, 1.0); }',
    { fileName: entry },
  );
  expect(result.wgsl).toBeDefined();
  expect(result.diagnostics.some((d) => d.category === 'warning' && d.code === 'TS8015')).toBe(
    true,
  );
  expect(
    mergeCompileDiagnostics([], result.diagnostics).some(
      (d) => d.severity === 'warning' && d.code === 'TS8015',
    ),
  ).toBe(true);
});

test('an old worker failure reply cannot replace diagnostics for the current document', async () => {
  let receive: (event: any) => void = () => {};
  const worker = {
    addEventListener: (name: string, listener: typeof receive) => {
      if (name === 'message') receive = listener;
    },
    postMessage() {},
    terminate() {},
  } as unknown as Worker;
  const failures: string[] = [];
  const client = createLanguageClient(
    worker,
    (version) => version === 2,
    (message) => failures.push(message),
  );
  const old = client.request('analysis', entry, 1, {});
  receive({ data: { id: 1, version: 1, ok: false, message: 'stale failure' } });
  expect(await old).toBeUndefined();
  expect(failures).toEqual([]);
  const current = client.request('analysis', entry, 2, {});
  receive({ data: { id: 2, version: 2, ok: false, message: 'current failure' } });
  expect(await current).toBeUndefined();
  expect(failures).toEqual(['current failure']);
});

test('native worker failure releases every pending query and reports its cause', async () => {
  const listeners = new Map<string, (event: any) => void>();
  const worker = {
    addEventListener: (name: string, listener: (event: any) => void) =>
      listeners.set(name, listener),
    postMessage() {},
    terminate() {},
  } as unknown as Worker;
  const failures: string[] = [];
  const client = createLanguageClient(
    worker,
    () => true,
    (message) => failures.push(message),
  );
  const first = client.request('analysis', entry, 1, {});
  const second = client.request('analysis', imported, 1, {});
  listeners.get('error')!({ message: 'worker crashed' });
  expect(await Promise.all([first, second])).toEqual([undefined, undefined]);
  expect(failures).toEqual(['worker crashed']);
  expect(await client.request('analysis', entry, 2, {})).toBeUndefined();
});

test('worker analysis surfaces imported errors and recovers after a dependency repair', async () => {
  let receive: (event: { data: any }) => void = () => {};
  const replies: any[] = [];
  const previous = globalThis.self;
  Object.assign(globalThis, {
    self: {
      addEventListener: (_: string, listener: typeof receive) => {
        receive = listener;
      },
      postMessage: (reply: any) => replies.push(reply),
    },
  });
  try {
    await import('../src/scripts/playground-language-worker.ts');
    receive({
      data: {
        kind: 'files',
        files: {
          [imported]:
            '"use typeshade";\nexport function value(): f32 { const v = vec2f(1.0, 2.0); return v.bad; }',
        },
      },
    });
    receive({
      data: {
        kind: 'update',
        uri: entry,
        version: 1,
        text: '"use typeshade";\nimport { value } from "./lib/helper.shade.ts";\nfunction result(): f32 { return value(); }',
      },
    });
    receive({ data: { kind: 'analysis', uri: entry, version: 1, id: 1 } });
    expect(replies[0].ok).toBe(true);
    expect(
      replies[0].result.diagnostics.some((d: any) => d.uri === imported && d.severity === 'error'),
    ).toBe(true);
    expect(replies[0].result.module).toBeUndefined();
    receive({
      data: {
        kind: 'files',
        files: { [imported]: '"use typeshade";\nexport function value(): f32 { return 1.0; }' },
      },
    });
    receive({ data: { kind: 'analysis', uri: entry, version: 2, id: 2 } });
    expect(replies[1].result.diagnostics).toEqual([]);
    expect(replies[1].result.module).toBeDefined();
  } finally {
    Object.assign(globalThis, { self: previous });
  }
});
