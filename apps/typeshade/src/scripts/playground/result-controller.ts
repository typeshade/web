import { type ConsoleEvent } from '../../../vendor/shader-dsl/src/core/console.ts';
import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import { compileModule } from '../../../vendor/shader-dsl/src/core/oracle.ts';
import { hasConsoleCall } from '../../../vendor/shader-dsl/src/core/passes/console-buffer.ts';
import { runComputeOnGpu } from '../../lib/compute-runner.ts';
import {
  GALLERY_STILL_BYTES,
  GALLERY_STILL_HEIGHT,
  GALLERY_STILL_WIDTH,
} from '../../lib/gallery-data.ts';
import { isReserved } from '../../lib/live-shader-compile-contract.ts';
import { isPlotLayout, reservedValue } from '../../lib/live-shader-contract.ts';
import { mountShader, type MountedShader } from '../../lib/shader-runtime.ts';
import { RASTER_PRECISION, type ReflectedEntry } from '../playground-raster.ts';
import type { BindingsModel } from '../playground-bindings.ts';
import type { createCaptureController } from './capture-controller.ts';
import type { createConsoleView } from './console-view.ts';
import type { EmitChoice, PlaygroundCopy, Target } from './contracts.ts';
import { programManifest } from './emission.ts';
import type { createGpuProgram } from './gpu-program.ts';
import type { createRasterController } from './raster-controller.ts';
import type { createTransportController } from './transport-controller.ts';
import { fillNumbers } from './view-helpers.ts';
type Engine = EmitChoice['backend'];
interface ResultState {
  readonly compiled: { readonly module: ModuleDecl } | undefined;
  readonly entries: readonly ReflectedEntry[];
  readonly emitted: Partial<Record<Target, string>>;
  readonly analysedVersion: number;
  readonly resourceGeneration: number;
  readonly moduleDrawable: boolean;
  readonly canvasFits: boolean;
  readonly bindings: BindingsModel;
  readonly transport: ReturnType<typeof createTransportController>;
  readonly gpuProgram: ReturnType<typeof createGpuProgram>;
  readonly capture: Pick<
    ReturnType<typeof createCaptureController>,
    'syncRecordFrame' | 'showPixelHint'
  >;
  readonly raster: Pick<ReturnType<typeof createRasterController>, 'drawOnCpu'>;
}
interface ResultOptions {
  root: HTMLElement;
  copy: PlaygroundCopy;
  state: ResultState;
  engine(): Engine;
  engineIsCpu(): boolean;
  isComputeModule(): boolean;
  currentChoice(): EmitChoice;
  waitFor(step: 'compiling' | 'drawing' | null): void;
  showConsole: ReturnType<typeof createConsoleView>['showConsole'];
}
/** Owns canvas mounts and result revisions across GPU draws, CPU draws and dispatches. */
export function createResultController({
  root,
  copy,
  state,
  engine,
  engineIsCpu,
  isComputeModule,
  currentChoice,
  waitFor,
  showConsole,
}: ResultOptions) {
  const w = copy.workspace;
  const frame = root.querySelector('[data-gpu-frame]');
  const canvas = root.querySelector('[data-canvas]');
  const gpuNote = root.querySelector('[data-gpu-note]');
  const bindingsHost = root.querySelector('[data-bindings]');

  /** The pointer over the canvas, 0 to 1 from the bottom left, which is the space the
   *  prelude's `uv` is in. A canvas nobody has touched holds the middle. */
  let pointer: readonly [number, number] = [0.5, 0.5];

  let mounted: MountedShader | undefined;

  /** The engine and the program the mount is running, so a compile that changes neither does
   *  not rebuild the pipeline. */
  let mountedEngine: Engine | undefined;

  let mountedSignature = '';

  /** Each run of the Result tab takes the next number; a run that finds a later one has
   *  started lets that one finish instead of painting over it. */
  let resultRun = 0;

  /** Put a new canvas where the old one was, carrying its name and its handlers. */
  const freshCanvas = (): HTMLCanvasElement | undefined => {
    const old = root.querySelector('[data-gpu-canvas]');
    if (!(old instanceof HTMLCanvasElement)) return undefined;
    const next = document.createElement('canvas');
    // Every attribute the page gave it, the stylesheet's scoping one among them: without that
    // the new element misses the rules that size it to the frame and draws at 300 by 150.
    for (const { name, value } of [...old.attributes]) {
      if (name === 'width' || name === 'height' || name === 'data-plotted' || name === 'hidden')
        continue;
      next.setAttribute(name, value);
    }
    next.dataset.backend = 'none';
    next.hidden = old.hidden;
    next.addEventListener('pointermove', (event) => {
      const box = next.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      pointer = [
        Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
        Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height)),
      ];
    });
    old.replaceWith(next);
    return next;
  };

  const gpuCanvasNow = (): HTMLCanvasElement | undefined => {
    const node = root.querySelector('[data-gpu-canvas]');
    return node instanceof HTMLCanvasElement ? node : undefined;
  };

  const stopMount = (): void => {
    mounted?.stop();
    mounted = undefined;
    mountedEngine = undefined;
    mountedSignature = '';
    state.capture.syncRecordFrame();
  };

  /** The still under the canvas goes for good once the reader's own program has drawn, or once
   *  they change the file: past that point it is a picture of something else. */
  const retireStill = (): void => {
    if (frame instanceof HTMLElement) frame.dataset.drawn = '';
  };

  const sayGpu = (text: string): void => {
    if (gpuNote instanceof HTMLElement) gpuNote.textContent = text;
  };

  const backendName = (which: Engine | 'none'): string =>
    which === 'webgpu'
      ? 'WebGPU'
      : which === 'webgl2'
        ? 'WebGL2'
        : which === 'cpu'
          ? copy.engineCpu
          : 'GPU';

  /** What the canvas says after a mount: which backend drew, or why none did, in the terms of
   *  what the reader picked. A WebGPU pick on a browser with none is said as that, and not as
   *  a WebGL2 frame under a WebGPU label. */
  const backendNote = (picked: Engine): string => {
    const backend = mounted?.backend ?? 'none';
    if (backend === 'webgpu') return copy.gpuWebgpu;
    if (backend === 'webgl2') return copy.gpuWebgl2;
    const failure = mounted?.failure ?? '';
    const feature = /missing WebGPU feature: ([^;]+)/.exec(failure)?.[1];
    if (feature) return fillNumbers(copy.gpuNoFeature, { features: feature });
    if (picked === 'auto' && !state.emitted.glslVertex && /no WebGPU/.test(failure))
      return `${copy.gpuNone} ${state.gpuProgram.noGlslNote()}`;
    if (picked === 'webgpu' && /no WebGPU/.test(failure)) return copy.gpuNoWebgpu;
    if (picked === 'webgl2' && /no WebGL2/.test(failure)) return copy.gpuNoWebgl2;
    if (picked === 'auto' && (/no WebGL2/.test(failure) || failure === '')) return copy.gpuNone;
    return fillNumbers(copy.gpuFailed, {
      backend: backendName(picked === 'auto' ? 'none' : picked),
      reason: failure,
    });
  };

  /** Put the program the last compile emitted on the canvas, on the backend the reader
   *  picked. The same backend swaps, so the pass that is drawing stays up until the new one
   *  has drawn; a new backend, or a program the swap cannot take, mounts on a new canvas. */
  const runOnGpu = async (): Promise<void> => {
    const mine = ++resultRun;
    const picked = engine();
    const payload = state.gpuProgram.gpuPayload(picked);
    if ('why' in payload) {
      stopMount();
      const node = gpuCanvasNow();
      if (node) node.dataset.backend = 'none';
      sayGpu(payload.why);
      waitFor(null);
      return;
    }
    const signature = `${payload.data.wgsl}\n${payload.data.vertex}\n${payload.data.fragment}\n${state.resourceGeneration}\n${JSON.stringify(payload.data.constants)}\n${(payload.data.passes ?? []).map((p) => `${p.name}\n${p.wgsl}\n${p.fragment}`).join('\n')}`;
    if (mounted && mountedEngine === picked && mounted.backend !== 'none') {
      if (signature === mountedSignature) return;
      const swapped = await mounted.swap(payload.data);
      if (mine !== resultRun) return;
      if (swapped) {
        mountedSignature = signature;
        retireStill();
        sayGpu(backendNote(picked));
        state.capture.syncRecordFrame();
        return;
      }
    }
    stopMount();
    const target = freshCanvas();
    if (!target) return;
    // A new mount counts from zero, so the offset Restart left against the old one goes. A
    // held clock stays where the reader held it.
    state.transport.resetMount();
    const next = await mountShader(target, payload.data, {
      // The Playground's canvas is the reader's own program running, so it keeps its clock
      // under `prefers-reduced-motion` the way a live example does and redraws on a change.
      interactive: true,
      // A reader's program can be far heavier than any figure on the site, so the buffer
      // gives up pixels before the page gives up its frames.
      adaptive: true,
      // With no GLSL there is nothing for WebGL2 to try, so the order is WebGPU alone and the
      // reason printed is WebGPU's own.
      ...(picked === 'webgpu' || picked === 'webgl2'
        ? { backend: picked }
        : state.emitted.glslVertex
          ? {}
          : { backend: 'webgpu' as const }),
      // A pass's field the main file does not declare (compiler change 0026) is filled when
      // the page reserves its name, so a pass reads the clock the program reads.
      uniformValues: (name, seconds, instance, clock) => {
        const plot = isPlotLayout(payload.data.layout);
        const box = target.getBoundingClientRect();
        const width = plot ? Math.max(1, box.width) : target.width;
        const height = plot ? Math.max(1, box.height) : target.height;
        if (plot && instance === 'font' && name === 'pixelRatio') return [target.width / width];
        return (
          state.bindings.renderValue(
            name,
            state.transport.shaderClock(seconds),
            width,
            height,
            pointer,
            instance,
            clock,
          ) ??
          (isReserved(name, state.gpuProgram.passFieldTypes.get(name))
            ? reservedValue(
                name,
                state.transport.shaderClock(seconds),
                width,
                height,
                pointer,
                clock,
              )
            : null)
        );
      },
    });
    if (mine !== resultRun) {
      next.stop();
      return;
    }
    mounted = next;
    mountedEngine = picked;
    mountedSignature = signature;
    // A paused clock holds the new mount's frame too.
    next.holdFrames(state.transport.clockHeld !== null);
    if (next.backend !== 'none') retireStill();
    // No backend drew: the note under the frame says why.
    else waitFor(null);
    sayGpu(
      next.passFormat === 'rgba8' ? `${backendNote(picked)} ${w.passesRgba8}` : backendNote(picked),
    );
    state.capture.syncRecordFrame();
  };

  /** The frame on the canvas as Submit sends it to the gallery, as base64: drawn once more and
   *  copied in the same task, while a WebGPU or WebGL2 canvas still holds it, then cropped to
   *  fill the gallery's still. Undefined where nothing has drawn, and a submission goes in
   *  without one. */
  const captureStill = async (): Promise<string | undefined> => {
    const gpu = gpuCanvasNow();
    let source: HTMLCanvasElement | undefined;
    if (gpu && !gpu.hidden && mounted && mounted.backend !== 'none') {
      mounted.redraw();
      source = gpu;
    } else if (canvas instanceof HTMLCanvasElement && !canvas.hidden) source = canvas;
    if (!source || source.width === 0 || source.height === 0) return undefined;
    const out = document.createElement('canvas');
    out.width = GALLERY_STILL_WIDTH;
    out.height = GALLERY_STILL_HEIGHT;
    const context = out.getContext('2d');
    if (!context) return undefined;
    const scale = Math.max(out.width / source.width, out.height / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    // The CPU canvas is a few pixels a side, drawn pixelated on the page, and stays so here.
    context.imageSmoothingEnabled = source !== canvas;
    try {
      context.drawImage(source, (out.width - width) / 2, (out.height - height) / 2, width, height);
    } catch {
      return undefined;
    }
    const encode = (type: string, quality: number): Promise<Blob | null> =>
      new Promise((resolve) => out.toBlob(resolve, type, quality));
    // WebP where the browser writes it, and JPEG where it does not (Safari answers PNG).
    let blob = await encode('image/webp', 0.82);
    if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.85);
    if (!blob || blob.size > GALLERY_STILL_BYTES) return undefined;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  };

  // ── A compute entry, dispatched ───────────────────────────────────────────────────────

  const accent = (): string =>
    getComputedStyle(root).getPropertyValue('--color-accent').trim() || '#1677ff';

  /** Draw a buffer's first number per element as bars, or a storage texture as the image it
   *  is, onto a new 2D canvas in the frame. */
  const plot = (
    values: readonly number[] | undefined,
    image: { width: number; height: number; format: string; bytes: Uint8Array } | undefined,
    backend: string,
  ): void => {
    const node = freshCanvas();
    if (!node) return;
    const box = node.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    node.width = Math.max(1, Math.round((box.width || 320) * dpr));
    node.height = Math.max(1, Math.round((box.height || 240) * dpr));
    const context = node.getContext('2d');
    if (!context) return;
    context.fillStyle =
      getComputedStyle(root).getPropertyValue('--color-ground').trim() || '#ffffff';
    context.fillRect(0, 0, node.width, node.height);
    if (image) {
      const { width, height, format, bytes } = image;
      const rgba = new Uint8ClampedArray(width * height * 4);
      const floats =
        format === 'r32float'
          ? new Float32Array(bytes.buffer, bytes.byteOffset, width * height)
          : undefined;
      let top = 0;
      if (floats) for (const v of floats) if (Number.isFinite(v)) top = Math.max(top, Math.abs(v));
      for (let i = 0; i < width * height; i++) {
        if (floats) {
          const g = top > 0 ? Math.round((Math.abs(floats[i]!) / top) * 255) : 0;
          rgba.set([g, g, g, 255], i * 4);
        } else {
          rgba.set([bytes[i * 4]!, bytes[i * 4 + 1]!, bytes[i * 4 + 2]!, 255], i * 4);
        }
      }
      const scratch = document.createElement('canvas');
      scratch.width = width;
      scratch.height = height;
      scratch.getContext('2d')?.putImageData(new ImageData(rgba, width, height), 0, 0);
      const side = Math.min(node.width, node.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(scratch, (node.width - side) / 2, (node.height - side) / 2, side, side);
    } else if (values && values.length > 0) {
      // A buffer longer than what the entry wrote ends in the zeros it started from, so the
      // plot stops a little past the last element that is not zero.
      let last = values.length - 1;
      while (last > 0 && values[last] === 0) last -= 1;
      const series = values.slice(
        0,
        Math.min(values.length, Math.max(8, last + 1 + Math.ceil((last + 1) / 8))),
      );
      const shown =
        series.length > 256
          ? Array.from({ length: 256 }, (_, i) => series[Math.floor((i * series.length) / 256)]!)
          : [...series];
      const finite = shown.filter(Number.isFinite);
      const low = Math.min(0, ...finite);
      const high = Math.max(0, ...finite);
      const span = high - low || 1;
      const pad = 12 * dpr;
      const h = node.height - pad * 2;
      const zero = pad + h * (high / span);
      const w = (node.width - pad * 2) / shown.length;
      context.fillStyle = accent();
      shown.forEach((v, i) => {
        if (!Number.isFinite(v)) return;
        const y = pad + h * ((high - v) / span);
        context.fillRect(
          pad + i * w,
          Math.min(y, zero),
          Math.max(1, w - (w > 3 ? 1 : 0)),
          Math.max(1, Math.abs(zero - y)),
        );
      });
      context.fillStyle =
        getComputedStyle(root).getPropertyValue('--color-text-3').trim() || '#999';
      context.fillRect(pad, zero, node.width - pad * 2, Math.max(1, dpr));
    }
    node.dataset.backend = backend;
    node.dataset.plotted = '1';
    retireStill();
  };

  /** Room for this many words of console entries in the WebGPU run's buffer. */
  const CONSOLE_WORDS = 1 << 16;

  const runCompute = async (): Promise<void> => {
    const mine = ++resultRun;
    stopMount();
    const picked = engine();
    const entry = state.entries.find((candidate) => candidate.stage === 'compute');
    if (!state.compiled || !entry || !state.emitted.wgsl) return;
    if (picked === 'webgl2') {
      const node = freshCanvas();
      if (node) node.dataset.backend = 'none';
      sayGpu(copy.computeNeedsWebgpu);
      return;
    }
    const missing = state.bindings.missing();
    if (missing.length > 0) {
      sayGpu(fillNumbers(copy.gpuNeedsBindings, { names: missing.join(', ') }));
      return;
    }
    const size = (entry as { workgroupSize?: number }).workgroupSize ?? 64;
    const invocations = state.bindings.invocations();
    const groups = Math.max(1, Math.ceil(invocations / size));
    const results = new Map<string, string>();
    let series: number[] | undefined;
    let image: { width: number; height: number; format: string; bytes: Uint8Array } | undefined;
    let ranOn: 'webgpu' | 'cpu';
    let ms = 0;
    // The console lines the run delivers: the oracle's sink on the CPU, the decoded buffer on
    // WebGPU, where a module that logs is emitted with the console buffer (surface §66).
    const lines: ConsoleEvent[] = [];
    let dropped = 0;
    const logs = hasConsoleCall(state.compiled.module);
    try {
      if (picked === 'cpu') {
        await state.bindings.prepareCpuResources();
        if (mine !== resultRun) return;
        const started = performance.now();
        // With the GPU-only reads allowed: a texture read and a storage texture's load and
        // store answer from the panel's data (src/scripts/playground-oracle-textures.ts).
        const cpu = compileModule(state.compiled.module, {
          gpuStubs: true,
          precision: RASTER_PRECISION,
          consoleSink: (e) => lines.push(e),
        });
        const values = state.bindings.cpuBindings(0, 0, 0, pointer);
        for (const [name, value] of Object.entries(values)) cpu.setBinding(name, value as never);
        cpu.dispatch(entry.name, groups);
        ms = performance.now() - started;
        for (const name of state.bindings.writableStorage()) {
          const read = state.bindings.readCpu(name, values[name]);
          results.set(name, read.rows.join('\n'));
          series ??= read.series;
        }
        // The storage textures, in the same bytes and rows a readback from the GPU gives.
        for (const spec of state.bindings.resources(true)) {
          if (spec.kind !== 'storage-texture') continue;
          const held = values[spec.name] as { bytes?: Uint8Array } | undefined;
          if (!held?.bytes) continue;
          const texture = { width: spec.width, height: spec.height, format: spec.format };
          if (spec.name === state.bindings.firstStorageTexture())
            image = { ...texture, bytes: held.bytes };
          results.set(spec.name, `${spec.width} × ${spec.height} ${spec.format}`);
        }
        ranOn = 'cpu';
      } else {
        const result = await runComputeOnGpu({
          manifest: programManifest(state.compiled.module, currentChoice(), logs),
          entry: entry.name,
          workgroups: [groups, 1, 1],
          resources: state.bindings.resources(true),
          constants: state.bindings.constants(),
          features: state.gpuProgram.gpuFeatures(),
          console: logs,
          consoleBytes: 8 + 4 * CONSOLE_WORDS,
        });
        ms = result.ms;
        lines.push(...result.consoleEvents);
        dropped = result.dropped;
        for (const name of state.bindings.writableStorage()) {
          const bytes = result.buffers.get(name);
          if (!bytes) continue;
          const read = state.bindings.readBack(name, bytes);
          results.set(name, read.rows.join('\n'));
          series ??= read.series;
        }
        const shown = state.bindings.firstStorageTexture();
        if (shown) image = result.textures.get(shown);
        for (const [name, t] of result.textures)
          results.set(name, `${t.width} × ${t.height} ${t.format}`);
        ranOn = 'webgpu';
      }
    } catch (error) {
      if (mine !== resultRun) return;
      const node = freshCanvas();
      if (node) node.dataset.backend = 'none';
      const message = error instanceof Error ? error.message : String(error);
      const feature = /missing WebGPU feature: ([^;]+)/.exec(message)?.[1];
      sayGpu(
        feature
          ? fillNumbers(copy.gpuNoFeature, { features: feature })
          : picked !== 'cpu' && /no WebGPU/.test(message)
            ? copy.gpuNoWebgpu
            : fillNumbers(copy.gpuFailed, {
                backend: backendName(picked === 'auto' ? 'webgpu' : picked),
                reason: message,
              }),
      );
      return;
    }
    if (mine !== resultRun) return;
    state.bindings.showResults(results);
    if (logs) showConsole(lines, dropped, ranOn);
    if (bindingsHost instanceof HTMLElement) state.bindings.render(bindingsHost);
    plot(series, image, ranOn);
    sayGpu(
      fillNumbers(copy.computeRan, {
        entry: entry.name,
        invocations: groups * size,
        backend: backendName(ranOn),
        ms: Math.max(1, Math.round(ms)),
      }),
    );
  };

  /** Run whatever the Result tab should show for the module that compiled last, then mark
   *  the frame with the document version it shows. A check that selects an example waits for
   *  that mark to reach the editor's version, so it never photographs the example before. */
  let lastResult = 0;

  const runResult = async (): Promise<void> => {
    const at = state.analysedVersion;
    // A picked example is painted twice, once for the pick and once when the debounced edit
    // lands, and the first run gives way to the second. Only the latest may mark the frame.
    const mine = ++lastResult;
    if (frame instanceof HTMLElement) delete frame.dataset.settled;
    if (!isComputeModule()) state.capture.showPixelHint();
    if (isComputeModule()) {
      await runCompute();
      // A dispatch plots what it wrote, or says why it could not, under the frame.
      waitFor(null);
    } else if (engineIsCpu()) {
      resultRun += 1;
      stopMount();
      if (state.moduleDrawable && state.canvasFits) await state.raster.drawOnCpu();
    } else await runOnGpu();
    if (frame instanceof HTMLElement && at === state.analysedVersion && mine === lastResult)
      frame.dataset.settled = String(at);
  };
  return {
    stopMount,
    retireStill,
    gpuCanvasNow,
    backendName,
    captureStill,
    runResult,
    get mounted() {
      return mounted;
    },
    get pointer() {
      return pointer;
    },
  };
}
