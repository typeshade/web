// What runs inside the Playground's host frame: an `<iframe sandbox="allow-scripts">` the page
// makes when the reader clicks Run, and removes on Stop. The frame has an opaque origin, so
// host.ts reaches nothing of the page: not its storage, not its cookies, not its DOM. It can
// draw into its own canvas and post messages to the page, which is all a run needs.
//
// Vite builds this file as a script of its own (`?worker&url`, an IIFE with no imports), so
// the frame loads one file: the program runtime, `typeshade/runtime/internal` that a generated
// module imports, and `typeshade/fuse`, one copy of each that host.ts and the modules share.
// The page writes the build into the frame before this script (`window.__typeshadeHost`):
// host.ts and each module it imports, as CommonJS, which a `require` of a few lines below runs.
//
// The run contract: host.ts runs top to bottom; then `animate(canvas)` is called when it exports
// one, else `run(...)`. A compiler host example (`examples/hosts/`) gets the inputs
// `examples/hosts/_drive.ts` calls it with, from the same `INPUTS`; any other `run` gets the
// canvas. What `run` resolves to is shown in the Console tab, beside every console line and
// every error host.ts gives, each with the line of host.ts it came from.
import * as runtime from '../../vendor/shader-dsl/src/runtime.ts';
import * as internal from '../../vendor/shader-dsl/src/runtime-internal.ts';
import * as fuse from '../../vendor/shader-dsl/src/fuse.ts';
import { INPUTS } from '../../vendor/shader-dsl/examples/hosts/_reference.ts';

/** What the page writes into the frame. */
export interface FramePlan {
  readonly host: { readonly code: string; readonly lines: readonly number[] };
  readonly modules: Readonly<Record<string, string>>;
  /** The compiler host example the workspace opened, whose inputs `run` gets. */
  readonly example?: string;
}

/** What the frame posts to the page. `line` is a one-based line of host.ts. */
export type FrameMessage =
  | {
      readonly kind: 'console';
      readonly method: 'log' | 'info' | 'warn' | 'error' | 'debug';
      readonly text: string;
      readonly line?: number;
    }
  | { readonly kind: 'error'; readonly text: string; readonly line?: number }
  | { readonly kind: 'started'; readonly call: 'animate' | 'run' | 'none' }
  | {
      readonly kind: 'returned';
      readonly call: 'run';
      readonly text: string;
      /** Whether anything asked the frame's canvas for a context, so the canvas may show what
       *  the run drew. A run that drew nothing has only its value and its lines to show. */
      readonly drew: boolean;
    };

const post = (message: FrameMessage): void => {
  window.parent.postMessage({ typeshadeHost: message }, '*');
};

const plan = (window as unknown as { __typeshadeHost?: FramePlan }).__typeshadeHost;

// ── Values, as the Console tab shows them ──────────────────────────────────────────────────

const SHOWN = 12;
function show(value: unknown, depth = 0): string {
  if (typeof value === 'string') return depth === 0 ? value : JSON.stringify(value);
  if (value === null || typeof value !== 'object') {
    return typeof value === 'function' ? `[function ${value.name || 'anonymous'}]` : String(value);
  }
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  const name = value.constructor?.name ?? 'Object';
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const items = value as unknown as ArrayLike<number | bigint>;
    const head = Array.from({ length: Math.min(items.length, SHOWN) }, (_, i) => String(items[i]));
    return `${name}(${items.length}) [${head.join(', ')}${items.length > SHOWN ? ', …' : ''}]`;
  }
  if (depth > 2) return Array.isArray(value) ? '[…]' : '{…}';
  // A Set and a Map, as a kernel function that collects into one gives it back (compiler
  // change 0080): the entries in insertion order, which is what the run promises.
  if (value instanceof Set) {
    const head = [...value].slice(0, SHOWN).map((item) => show(item, depth + 1));
    return `Set(${value.size}) {${head.join(', ')}${value.size > SHOWN ? ', …' : ''}}`;
  }
  if (value instanceof Map) {
    const head = [...value]
      .slice(0, SHOWN)
      .map(([key, item]) => `${show(key, depth + 1)} => ${show(item, depth + 1)}`);
    return `Map(${value.size}) {${head.join(', ')}${value.size > SHOWN ? ', …' : ''}}`;
  }
  if (Array.isArray(value)) {
    const head = value.slice(0, SHOWN).map((item) => show(item, depth + 1));
    return `[${head.join(', ')}${value.length > SHOWN ? ', …' : ''}]`;
  }
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return `<${name}>`;
  const fields = Object.entries(value as Record<string, unknown>)
    .slice(0, SHOWN)
    .map(([key, item]) => `${key}: ${show(item, depth + 1)}`);
  const body = fields.length === 0 ? '{}' : `{ ${fields.join(', ')} }`;
  return name === 'Object' ? body : `${name} ${body}`;
}

// ── Lines of host.ts ───────────────────────────────────────────────────────────────────────
// Each module is run as a `Function` named by `//# sourceURL`, so a stack frame names it and a
// line of its body. How far the body's first line is from the line a frame reports is measured
// once, since engines wrap a `Function`'s body differently.

const HOST_URL = 'host.ts';
const firstLine = (() => {
  const stack = new Function('return new Error().stack;\n//# sourceURL=probe.ts')() as string;
  return Number(/probe\.ts:(\d+):\d+/.exec(stack ?? '')?.[1] ?? 1);
})();

/** The line of host.ts the first frame of host.ts in `stack` names, one-based. */
function hostLine(stack: string | undefined): number | undefined {
  const match = /(?:^|[\s(@])host\.ts:(\d+):\d+/m.exec(stack ?? '');
  if (!match || !plan) return undefined;
  const generated = Number(match[1]) - firstLine;
  const line = plan.host.lines[Math.max(0, Math.min(generated, plan.host.lines.length - 1))];
  return line === undefined ? undefined : line + 1;
}

const errorOf = (error: unknown): FrameMessage => ({
  kind: 'error',
  text: show(error),
  line: error instanceof Error ? hostLine(error.stack) : undefined,
});

// ── The console ────────────────────────────────────────────────────────────────────────────

for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = console[method].bind(console);
  console[method] = (...args: unknown[]) => {
    original(...args);
    post({
      kind: 'console',
      method,
      text: args.map((arg) => show(arg)).join(' '),
      line: hostLine(new Error().stack),
    });
  };
}
console.table = console.log;
window.addEventListener('error', (event) => post(errorOf(event.error ?? event.message)));
window.addEventListener('unhandledrejection', (event) => post(errorOf(event.reason)));

// ── The modules ────────────────────────────────────────────────────────────────────────────

const BUILTIN: Readonly<Record<string, unknown>> = {
  'typeshade/runtime': runtime,
  'typeshade/runtime/internal': internal,
  'typeshade/fuse': fuse,
};
const loaded = new Map<string, { exports: Record<string, unknown> }>();

function evaluate(name: string, code: string): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  loaded.set(name, module);
  const body = new Function('require', 'module', 'exports', `${code}\n//# sourceURL=${name}`);
  body(requireModule, module, module.exports);
  return module.exports;
}

function requireModule(specifier: string): unknown {
  if (specifier in BUILTIN) return BUILTIN[specifier];
  const done = loaded.get(specifier);
  if (done) return done.exports;
  const code = plan?.modules[specifier];
  if (code === undefined)
    throw new Error(`host.ts imports "${specifier}", which is not in the workspace`);
  return evaluate(specifier, code);
}

// ── The run ────────────────────────────────────────────────────────────────────────────────

/** The arguments `_drive.ts` calls each compiler host example's `run` with. */
const DRIVE: Readonly<Record<string, (canvas: HTMLCanvasElement) => unknown[]>> = {
  'host-draw': (canvas) => [canvas, INPUTS.draw.times],
  'host-compute': () => [INPUTS.compute.n],
  'host-kernel': () => [INPUTS.kernel.n],
  'host-resident': () => [INPUTS.resident.n, INPUTS.resident.steps],
  'host-helper': (canvas) => [canvas, INPUTS.helper.cursor],
  'host-program': () => [INPUTS.program.size, INPUTS.program.size, INPUTS.program.times],
  'loop-fuse': () => [
    Float32Array.from(INPUTS.fuse.a),
    Float32Array.from(INPUTS.fuse.b),
    Float32Array.from(INPUTS.fuse.c),
  ],
  'host-set-unique': () => [INPUTS.collect.n],
};

/** `host-program` reads its frame back as RGBA bytes; the canvas shows them. */
function paintPixels(canvas: HTMLCanvasElement, pixels: Uint8Array, size: number): void {
  const surface = canvas.getContext('2d');
  if (!surface) return;
  const image = new ImageData(new Uint8ClampedArray(pixels), size, size);
  const small = document.createElement('canvas');
  small.width = size;
  small.height = size;
  small.getContext('2d')?.putImageData(image, 0, 0);
  surface.imageSmoothingEnabled = false;
  const side = Math.min(canvas.width, canvas.height);
  surface.drawImage(small, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side);
}

async function start(): Promise<void> {
  if (!plan) return;
  const canvas = document.querySelector('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio));
  // A run draws by asking the canvas for a context: the runtime's WebGPU or WebGL2 one, or a
  // 2D one. Whether anything asked says whether the canvas holds a picture.
  let drew = false;
  const getContext = canvas.getContext.bind(canvas) as (...args: unknown[]) => unknown;
  (canvas as unknown as { getContext: (...args: unknown[]) => unknown }).getContext = (
    ...args: unknown[]
  ) => {
    drew = true;
    return getContext(...args);
  };
  let host: Record<string, unknown>;
  try {
    host = evaluate(HOST_URL, plan.host.code);
  } catch (error) {
    post(errorOf(error));
    return;
  }
  try {
    if (typeof host.animate === 'function') {
      post({ kind: 'started', call: 'animate' });
      await (host.animate as (canvas: HTMLCanvasElement) => unknown)(canvas);
    } else if (typeof host.run === 'function') {
      post({ kind: 'started', call: 'run' });
      const args = (plan.example && DRIVE[plan.example]?.(canvas)) || [canvas];
      const result = await (host.run as (...args: unknown[]) => unknown)(...args);
      const size = INPUTS.program.size;
      if (
        plan.example === 'host-program' &&
        result instanceof Uint8Array &&
        result.length === size * size * 4
      )
        paintPixels(canvas, result, size);
      // `undefined` is shown too: a run that returns nothing says so.
      post({ kind: 'returned', call: 'run', text: show(result), drew });
    } else {
      post({ kind: 'started', call: 'none' });
    }
  } catch (error) {
    post(errorOf(error));
  }
}

void start();
