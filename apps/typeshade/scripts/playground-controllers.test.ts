import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createRasterController } from '../src/scripts/playground/raster-controller.ts';
import { createOutputController } from '../src/scripts/playground/output-controller.ts';
import { createHostController } from '../src/scripts/playground/host-controller.ts';
import { createWorkspaceController } from '../src/scripts/playground/workspace-controller.ts';
import {
  normalisePath,
  FILE_PATH,
  rewriteImports,
} from '../src/scripts/playground/workspace-paths.ts';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
class ElementStub {
  textContent = '';
  innerHTML = '';
  dataset: Record<string, string> = {};
  hidden = false;
  disabled = false;
  setAttribute() {}
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  addEventListener() {}
}
class CanvasStub extends ElementStub {
  paints = 0;
  getContext() {
    return { clearRect() {}, putImageData: () => this.paints++, strokeRect: () => this.paints++ };
  }
}
const globals = [
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLCanvasElement',
  'Worker',
  'ImageData',
  'window',
  'getComputedStyle',
];
const originals = new Map(
  globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
let frames: (() => void)[];
let workers: WorkerStub[];
class WorkerStub {
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  messages: any[] = [];
  stopped = false;
  constructor() {
    workers.push(this);
  }
  postMessage(message: unknown) {
    this.messages.push(message);
  }
  terminate() {
    this.stopped = true;
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}
beforeEach(() => {
  frames = [];
  workers = [];
  Object.assign(globalThis, {
    HTMLElement: ElementStub,
    HTMLButtonElement: ElementStub,
    HTMLCanvasElement: CanvasStub,
    Worker: WorkerStub,
    ImageData: class {},
    getComputedStyle: () => ({ getPropertyValue: () => '#123456' }),
    window: {
      requestAnimationFrame: (fn: () => void) => frames.push(fn),
      setTimeout,
      clearTimeout,
    },
  });
});
afterEach(() => {
  for (const key of globals) {
    const descriptor = originals.get(key);
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as any)[key];
  }
});
function rasterFixture(prepare = async () => {}) {
  const note = new ElementStub(),
    button = new ElementStub(),
    canvas = new CanvasStub();
  const root = {
    querySelector: (key: string) =>
      ({ '[data-canvas-note]': note, '[data-draw-cpu]': button, '[data-canvas]': canvas })[key],
  };
  const controller = createRasterController({
    root,
    copy: { canvasIdle: 'idle', canvasProgress: 'progress', draw: 'draw', stop: 'stop' },
    state: { compiled: { module: {} }, moduleDrawable: true, canvasFits: true },
    bindings: { prepareCpuResources: prepare },
    engine: () => 'cpu',
    rasterPlan: () => ({ width: 128, height: 128 }),
    rasterFailure: (message) => message,
    frameConsoleFor: () => ({ add() {}, show() {} }),
  } as any);
  return { controller, note, button, canvas };
}
describe('CPU drawing cancellation', () => {
  test.each(['resolve', 'reject'] as const)(
    'Stop retires pending resource preparation (%s)',
    async (kind) => {
      const ready = deferred<void>();
      const { controller, note } = rasterFixture(() => ready.promise);
      const drawing = controller.drawOnCpu();
      controller.stopDrawing();
      if (kind === 'resolve') ready.resolve();
      else ready.reject(new Error('old texture failure'));
      await drawing;
      expect(workers).toHaveLength(0);
      expect(note.textContent).toBe('idle');
      expect(controller.drawing).toBe(0);
    },
  );
  test('Stop discards queued animation frames as well as late worker tiles', async () => {
    const { controller, note, canvas } = rasterFixture();
    await controller.drawOnCpu();
    const worker = workers[0],
      job = worker.messages[0].job;
    worker.emit({ kind: 'ready', job });
    worker.emit({
      kind: 'tile',
      job,
      x0: 0,
      y0: 0,
      x1: 64,
      y1: 64,
      covered: 4,
      pixels: new Uint8ClampedArray(16),
    });
    // Test both queued paint and a message arriving after terminate.
    controller.stopDrawing();
    const paints = canvas.paints;
    worker.emit({ kind: 'failed', job, message: 'old failure' });
    for (const fn of frames) fn();
    expect(canvas.paints).toBe(paints);
    expect(note.textContent).toBe('idle');
    expect(workers.every((worker) => worker.stopped)).toBe(true);
  });
});

test('output colouring follows the latest source and restores ordinary spaces', async () => {
  const old = deferred<string>(),
    latest = deferred<string>();
  const output = new ElementStub(),
    size = new ElementStub();
  const state = {
    emitted: { wgsl: 'first' },
    workspace: { activeFile: '', passGraph: [], passModules: new Map() },
    monacoApi: { editor: { colorize: () => old.promise } },
  };
  const root = new ElementStub();
  const view = createOutputController(
    root as any,
    {} as any,
    output as any,
    size as any,
    () => ({}) as any,
    state,
  );
  view.selectView('wgsl');
  state.emitted.wgsl = 'second';
  state.monacoApi.editor.colorize = () => latest.promise;
  view.paintOutput();
  old.resolve('obsolete');
  await old.promise;
  await Promise.resolve();
  expect(output.innerHTML).toBe('');
  latest.resolve('<span>two&nbsp;words\u00a0here</span>');
  await latest.promise;
  await Promise.resolve();
  expect(output.innerHTML).toBe('<span>two words here</span>');
  expect(size.textContent).toBe('6 B');
});

test('a host starter cannot overwrite a newly opened host file', async () => {
  const starter = deferred<string>();
  let value = '';
  const host = createHostController({
    root: new ElementStub(),
    hostTypes: '/types.d.ts',
    copy: { workspace: {} },
    context: {
      client: { request: () => starter.promise },
      version: 1,
      documentUri: 'file:///main.shade.ts',
      examples: [],
      view: 'result',
    },
    fileMarker() {},
    paintTabs() {},
    onEdit() {},
    selectView() {},
    sentence() {},
    paintConsole() {},
  } as any);
  host.hostModel = {
    getValue: () => value,
    setValue: (next: string) => {
      value = next;
    },
  };
  const opening = host.ensureHost();
  host.setHost('new host', 'new host');
  starter.resolve('old starter');
  await opening;
  expect(host.hostText()).toBe('new host');
  expect(host.hostCarried()).toBe(false);
});

test('replacing workspace files disposes models and listeners and closes worker documents', () => {
  const disposed: string[] = [];
  const closed: string[] = [];
  const context: any = {
    monacoApi: {
      Uri: { parse: (uri: string) => uri },
      editor: {
        getModel() {},
        createModel: (text: string, uriType: string, uri: string) => ({
          getValue: () => text,
          dispose: () => disposed.push(uri),
          onDidChangeContent: () => ({ dispose: () => disposed.push('listener:' + uri) }),
        }),
      },
    },
    client: { update() {}, close: (uri: string) => closed.push(uri) },
    documentUri: 'file:///main.shade.ts',
    fileName: 'main.shade.ts',
    version: 1,
  };
  const workspace = createWorkspaceController({
    root: new ElementStub(),
    copy: { workspace: {} },
    context,
    examples: [],
    library: {},
    bindings: { setPasses() {} },
    syncDocument() {},
    onEdit() {},
    serviceFailed() {},
    retireStill() {},
    nameMain() {},
    paintOutput() {},
  } as any);
  workspace.setFiles({ 'lib/first.shade.ts': 'first' }, [
    { name: 'first', path: 'lib/first.shade.ts' },
  ]);
  workspace.setFiles({ 'next.shade.ts': 'next' }, [{ name: 'missing', path: 'gone.shade.ts' }]);
  expect(closed).toEqual(['file:///lib/first.shade.ts']);
  expect(disposed).toEqual(['listener:file:///lib/first.shade.ts', 'file:///lib/first.shade.ts']);
  expect(workspace.workspaceFiles()).toEqual({ 'next.shade.ts': 'next' });
  expect(workspace.passGraph).toEqual([]);
});

test('workspace paths keep nested imports relative and reject parent traversal', () => {
  expect(normalisePath(' ./lib/noise ')).toBe('lib/noise.shade.ts');
  for (const path of ['../bad.shade.ts', '/bad.shade.ts', 'lib/../bad.shade.ts'])
    expect(FILE_PATH.test(path)).toBe(false);
  expect(
    rewriteImports(
      'import { x } from "../noise"',
      'lib/main.shade.ts',
      'noise.shade.ts',
      'shaders/noise.shade.ts',
    ),
  ).toBe('import { x } from "../shaders/noise"');
});
