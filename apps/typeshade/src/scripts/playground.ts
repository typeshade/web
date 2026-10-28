import { bindTabs } from '@typeshade/site-ui/dom/tabs';
import hostTypesAsset from 'virtual:playground-host-types';
import { startHostFrame } from './playground-host-run.ts';
import { holdsItsPixels } from './playground/canvas-capacity.ts';
import { createCaptureController } from './playground/capture-controller.ts';
import { createConsoleView } from './playground/console-view.ts';
import type {
  EmitChoice,
  PlaygroundCopy,
  PlaygroundExample,
  PlaygroundHandle,
  Target,
  View,
} from './playground/contracts.ts';
import { createCpuProgram } from './playground/cpu-program.ts';
import { registerEditorProviders } from './playground/editor-providers.ts';
import { emitGlsl, emitWgsl } from './playground/emission.ts';
import { createGpuProgram } from './playground/gpu-program.ts';
import { createHostController } from './playground/host-controller.ts';
import { hashParams, writeHash } from './playground/links.ts';
import {
  defineTypeshadeThemes,
  followSiteTheme,
  loadMonaco,
  markerSeverity,
} from './playground/monaco.ts';
import { createOpeningLoader } from './playground/opening-loader.ts';
import { createOutputController } from './playground/output-controller.ts';
import { createRasterController } from './playground/raster-controller.ts';
import { renderReflection } from './playground/reflection-view.ts';
import { createResultController } from './playground/result-controller.ts';
import { bindSharing } from './playground/sharing.ts';
import { createSourceCoordinates } from './playground/source-coordinates.ts';
import { createTransportController } from './playground/transport-controller.ts';
import { el, fillNumbers } from './playground/view-helpers.ts';
import { createWorkspaceController } from './playground/workspace-controller.ts';
import { exampleFileName, MAIN_FILE, MAIN_MODEL_URI } from './playground/workspace-paths.ts';

// The Playground's browser half. Astro puts this module through Vite, so it can import the
// compiler and the language service from the vendored checkout. The component's own
// `define:vars` script is emitted inline as a classic script, which has no import at all, so
// everything past the first line of it would die with a SyntaxError; the values it used to
// carry arrive here as data attributes instead.
// Each import below names the module that defines the symbol and not the package barrel. The
// barrel re-exports the front end, which carries the TypeScript compiler, and none of these
// do: the page's own chunk is Monaco's glue, the emitters, reflection and the CPU oracle, and
// the compiler lives in the language worker alone. The raster worker imports `core/oracle.ts`
// this way for the same reason.

import type { ModuleDecl } from '../../vendor/shader-dsl/src/core/ir/nodes.ts';

import { type ConsoleEvent } from '../../vendor/shader-dsl/src/core/console.ts';
import { compileModule } from '../../vendor/shader-dsl/src/core/oracle.ts';

import type { OptLevel } from '../../vendor/shader-dsl/src/core/passes/opt/optimize.ts';
import { reflect } from '../../vendor/shader-dsl/src/core/reflect.ts';
// The ship-time plugins live on their own subpath, the one a host imports for a release build.
import type {
  TypeshadeDiagnostic,
  TypeshadePosition,
} from '../../vendor/shader-dsl/src/language-service/index.ts';
import { errorLink } from './error-links.ts';
import { BindingsModel } from './playground-bindings.ts';
import { diagnosticsForDocument } from './playground-diagnostics.ts';
import { createLanguageClient, type Analysis, type LanguageClient } from './playground-language.ts';
import { installOracleTextures } from './playground-oracle-textures.ts';
import { encodeSource, parseAspect, PLAYGROUND_ASPECT } from './source-link.ts';
import { workspaceFolder, zipStored } from './workspace-folder.ts';
// host.ts (compiler change 0062): the declarations the worker checks it against, as one asset
// it fetches the first time host.ts is opened, and the sandboxed frame a run happens in.

// The runtime every figure on the site draws through. It imports nothing from the compiler:
// the WGSL, both GLSL stages and the std140 offsets arrive as plain data, which is exactly
// what this page already holds after a compile.
import {
  cornersOf,
  drawTile,
  RASTER_PRECISION,
  type CpuFunctions,
  type RasterPlan,
  type ReflectedEntry,
} from './playground-raster.ts';

// The oracle's texture reads answer from the texels the bindings panel binds, on this thread as
// in the raster workers, so the return values and a dispatch read the picture the GPU does.
installOracleTextures();

/** A row of the diagnostics list: what to say and where it points. A row about a line of the
 *  prelude points nowhere, since the editor does not hold that line. */
interface DiagnosticRow {
  readonly uri: string;
  readonly message: string;
  /** The compiler's code: `TS8022` and the like from TypeShade, a number from TypeScript. */
  readonly code: string;
  readonly severity: TypeshadeDiagnostic['severity'];
  readonly source: TypeshadeDiagnostic['source'];
  readonly start: TypeshadePosition;
  readonly located: boolean;
}

function mount(root: HTMLElement): void {
  const coordinates = createSourceCoordinates();
  const {
    compose,
    inPrelude,
    intoDocument,
    outOfDocument,
    toServicePosition,
    toMonacoPosition,
    toMonacoRange,
    toDisplayPosition,
  } = coordinates;
  const editorHost = root.querySelector('[data-editor]');
  const output = root.querySelector('[data-output]');
  const diagnosticsPane = root.querySelector('[data-diagnostics]');
  const status = root.querySelector('[data-status]');
  const run = root.querySelector('[data-run]');
  const reset = root.querySelector('[data-reset]');
  if (
    !(editorHost instanceof HTMLElement) ||
    !(output instanceof HTMLElement) ||
    !(diagnosticsPane instanceof HTMLElement) ||
    !(status instanceof HTMLElement) ||
    !(run instanceof HTMLButtonElement) ||
    !(reset instanceof HTMLButtonElement)
  ) {
    return;
  }

  // The line over the canvas until the program's first frame is up (Playground.astro): the
  // stylesheet takes it away once a canvas draws, and `waitFor(null)` on a failure, which the
  // note under the frame explains.
  const frameWait = root.querySelector('[data-frame-wait]');
  const frameWaitText = root.querySelector('[data-frame-wait-text]');
  const waitFor = (step: 'compiling' | 'drawing' | null): void => {
    if (!(frameWait instanceof HTMLElement)) return;
    frameWait.hidden = step === null;
    const text = step ? frameWait.dataset[step] : undefined;
    if (text && frameWaitText instanceof HTMLElement) frameWaitText.textContent = text;
  };

  const sample = root.dataset.sample ?? '';
  const copy = JSON.parse(root.dataset.copy ?? '{}') as PlaygroundCopy;
  /** The name of the file the canvas runs, as its tab shows it: the opened example's file, or
   *  `main.shade.ts` for a file no example is behind, until the reader renames it. A runtime
   *  page has its name written into the toolbar by the Worker, so it is read from there. */
  const fileNameLabel = root.querySelector('[data-runtime="file-name"]');
  let fileName =
    copy.fileName ||
    (/\.shade\.ts$/.test(fileNameLabel?.textContent?.trim() ?? '')
      ? fileNameLabel!.textContent!.trim()
      : MAIN_FILE);
  /** The uri the worker knows the document by. It follows the name, so a location the service
   *  hands back, an import from another tab and a diagnostic's file all name the file the tab
   *  names. The editor's model keeps one uri of its own (`MAIN_MODEL_URI`), so a rename never
   *  swaps the model under the editor. */
  let documentUri = `file:///${fileName}`;
  /** Gives the file the canvas runs a name, before the editor holds it: what the link or the
   *  example asks for. `renameMain` is the step for a file the worker already holds. */
  const nameMain = (name: string): void => {
    fileName = name;
    documentUri = `file:///${name}`;
    if (fileNameLabel instanceof HTMLElement) fileNameLabel.textContent = name;
  };
  /** The version the editor holds. Every change raises it; every reply names the version it
   *  answers for, and the client drops one for any other, so a slow answer to an old keystroke
   *  never paints over a fast answer to a new one. */
  let version = 0;
  /** The last analysis painted and the version it was of, so a control on the options bar
   *  repaints from it without asking the worker again. */
  let lastAnalysis: Analysis | undefined;
  let analysedVersion = -1;
  const serviceFailed = (message?: string): void => {
    waitFor(null);
    if (status instanceof HTMLElement) status.textContent = copy.serviceFailed;
    root.classList.add('has-errors');
    root.classList.remove('has-output');
    output.textContent = '';
    diagnosticsPane.textContent = message
      ? `${copy.serviceFailed}: ${message}`
      : copy.serviceFailed;
  };
  /** The language worker, opened as early as the page runs so it boots while Monaco is still
   *  loading from the CDN; the two arrive in either order and the first analysis waits for
   *  both. It carries the compiler and the TypeScript it is built on, which is why it is a
   *  worker: that is a megabyte of script the main thread should never parse or run. */
  const openLanguageWorker = (): LanguageClient | undefined => {
    if (typeof Worker !== 'function') return undefined;
    try {
      const worker = new Worker(new URL('./playground-language-worker.ts', import.meta.url), {
        type: 'module',
      });
      return createLanguageClient(
        worker,
        (asked) => asked === version,
        (message) => serviceFailed(message),
      );
    } catch {
      return undefined;
    }
  };
  const client = openLanguageWorker();
  // The files an example imports (Rule 3.9), which the editor does not hold, by the uri an
  // import beside the document resolves to. Sent before the first update, so the worker holds
  // them by the time it reads an import.
  const library = JSON.parse(root.dataset.library ?? '{}') as Record<string, string>;
  client?.files(
    Object.fromEntries(
      Object.entries(library).map(([name, text]) => [new URL(name, documentUri).toString(), text]),
    ),
  );
  const reflectionPane = root.querySelector('[data-reflection]');
  const consolePane = root.querySelector('[data-console]');
  const runCpu = root.querySelector('[data-run-cpu]');
  const examples = JSON.parse(root.dataset.examples ?? '[]') as PlaygroundExample[];
  const examplePicker = root.querySelector('[data-example]');
  const exampleNote = root.querySelector('[data-example-note]');
  /** One line per example that imports another file, naming it, shown while the editor holds
   *  that example. */
  const importsNotes = [...root.querySelectorAll('[data-imports-note]')].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  const showImportsNote = (id: string | undefined): void => {
    for (const note of importsNotes) note.hidden = note.dataset.importsNote !== id;
  };
  const share = root.querySelector('[data-share]');
  const copyOutput = root.querySelector('[data-copy-output]');
  const sizeLabel = root.querySelector('[data-output-size]');
  const levelPicker = root.querySelector('[data-opt-level]');
  const parensPicker = root.querySelector('[data-opt-parens]');
  const precisionPicker = root.querySelector('[data-opt-precision]');
  const minifyToggle = root.querySelector('[data-opt-minify]');
  const numbersPicker = root.querySelector('[data-opt-numbers]');
  const numbersField = root.querySelector('[data-numbers-field]');
  const obfuscateToggle = root.querySelector('[data-opt-obfuscate]');
  const fp64Picker = root.querySelector('[data-opt-fp64]');
  const levelNote = root.querySelector('[data-level-note]');
  const preludeNote = root.querySelector('[data-prelude-note]');
  const canvas = root.querySelector('[data-canvas]');
  const canvasNote = root.querySelector('[data-canvas-note]');
  const enginePicker = root.querySelector('[data-engine]');
  const cpuOnly = [...root.querySelectorAll('[data-cpu-only]')].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  const drawCpu = root.querySelector('[data-draw-cpu]');
  const resolutionPicker = root.querySelector('[data-resolution]');

  /** Whether the compiled module has the vertex and fragment pair a triangle needs. */
  let moduleDrawable = false;
  /** Whether the browser actually backed the canvas at the size it was asked for. */
  let canvasFits = true;

  if (
    !(share instanceof HTMLButtonElement) ||
    !(copyOutput instanceof HTMLButtonElement) ||
    !(sizeLabel instanceof HTMLElement) ||
    !(levelPicker instanceof HTMLSelectElement) ||
    !(parensPicker instanceof HTMLSelectElement) ||
    !(precisionPicker instanceof HTMLSelectElement) ||
    !(minifyToggle instanceof HTMLInputElement) ||
    !(numbersPicker instanceof HTMLSelectElement) ||
    !(numbersField instanceof HTMLElement) ||
    !(obfuscateToggle instanceof HTMLInputElement) ||
    !(fp64Picker instanceof HTMLSelectElement) ||
    !(levelNote instanceof HTMLElement)
  ) {
    return;
  }

  /** What the options bar is set to right now. */
  const currentChoice = (): EmitChoice => ({
    level: levelPicker.value as OptLevel,
    parens: parensPicker.value === 'minimal' ? 'minimal' : 'full',
    minify: minifyToggle.checked,
    numbers: numbersPicker.value === 'f32' ? 'f32' : numbersPicker.value !== 'false',
    obfuscate: obfuscateToggle.checked,
    fp64Flavor: fp64Picker.value === 'integer' ? 'integer' : 'float',
    floatPrecision: precisionPicker.value === 'mediump' ? 'mediump' : 'highp',
    backend:
      enginePicker instanceof HTMLSelectElement &&
      (enginePicker.value === 'webgpu' ||
        enginePicker.value === 'webgl2' ||
        enginePicker.value === 'cpu')
        ? enginePicker.value
        : 'auto',
  });

  let editor: any;
  let model: any;
  let monacoApi: any;
  let timer = 0;
  let urlTimer = 0;
  const schedulePublish = (): void => {
    window.clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => void publishSource(), 600);
  };
  const scheduleEdit = (): void => {
    syncDocument();
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 350);
    schedulePublish();
  };
  const outputView = createOutputController(root, copy, output, sizeLabel, currentChoice, {
    get emitted() {
      return emitted;
    },
    get monacoApi() {
      return monacoApi;
    },
    get workspace() {
      return workspace;
    },
  });
  // What the compiler last emitted, by target, which tab is showing, and which of the three
  // texts the text panel holds. The panel keeps its text while another tab is up.
  let emitted: Partial<Record<Target, string>> = {};
  // The last good compile, kept so the CPU button can call into it without compiling again.
  let compiled: { readonly module: ModuleDecl } | undefined;
  let reflection: ReturnType<typeof reflect> | undefined;
  /** Why the GLSL backend emitted nothing for the last module, or ''. */
  let glslFailure = '';
  let entries: readonly ReflectedEntry[] = [];
  /** What the reader last typed into each argument field, keyed by entry and field name, so a
   *  recompile does not throw their values away. */
  const typedArgs = new Map<string, string>();

  /** Draws the reflection pane for the module that just compiled. */
  const paintReflection = (): void => {
    if (!(reflectionPane instanceof HTMLElement)) return;
    reflectionPane.textContent = '';
    if (runCpu instanceof HTMLButtonElement) runCpu.disabled = entries.length === 0;
    if (drawCpu instanceof HTMLButtonElement) {
      const drawable =
        entries.some(
          (entry) =>
            entry.stage === 'vertex' &&
            (entry.io?.inputs ?? []).some(
              (f) => f.builtin === 'vertex_index' || typeof f.location === 'number',
            ),
        ) && entries.some((entry) => entry.stage === 'fragment');
      moduleDrawable = drawable;
      raster.syncDrawButton();
      if (canvasNote instanceof HTMLElement) {
        canvasNote.textContent = !drawable
          ? copy.canvasNeedsVertex
          : canvasFits
            ? copy.canvasIdle
            : copy.canvasTooBig;
      }
      if (canvas instanceof HTMLCanvasElement)
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      // The pool is opened ahead of the press only where the reader can press: four workers
      // for a canvas the GPU is drawing would be four workers doing nothing.
      if (drawable && engineIsCpu()) window.setTimeout(raster.openPool, 0);
    }

    renderReflection(reflectionPane, entries, reflection, typedArgs, copy, (name) => {
      outputView.selectView('result');
      const target = root.querySelector(
        `[data-bindings] [data-binding-name="${CSS.escape(name)}"]`,
      );
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ block: 'nearest' });
        target.focus({ preventScroll: true });
      }
    });
  };
  const cpuProgram = createCpuProgram(
    root,
    copy,
    {
      get compiled() {
        return compiled;
      },
      get reflection() {
        return reflection;
      },
      get entries() {
        return entries;
      },
      get frozen() {
        return transport.frozen;
      },
      get pointer() {
        return result.pointer;
      },
      get workspace() {
        return workspace;
      },
      get bindings() {
        return bindings;
      },
    },
    currentChoice,
    () => engineIsCpu(),
    () => result.gpuCanvasNow(),
  );
  const raster = createRasterController({
    root,
    copy,
    state: {
      get compiled() {
        return compiled;
      },
      get moduleDrawable() {
        return moduleDrawable;
      },
      get canvasFits() {
        return canvasFits;
      },
    },
    bindings: { prepareCpuResources: () => bindings.prepareCpuResources() },
    engine: () => engine(),
    rasterPlan: () => cpuProgram.rasterPlan(),
    rasterFailure: (message) => rasterFailure(message),
    frameConsoleFor: (plan, job) => capture.frameConsoleFor(plan, job),
  });

  // ── The Result tab ──────────────────────────────────────────────────────────────────
  // The canvas draws the program the WGSL and GLSL tabs hold, on the backend the reader
  // picked: the GPU in the runtime's own order (WebGPU, then WebGL2), WebGPU alone, WebGL2
  // alone, or the CPU oracle's rasteriser. The GPU half goes through src/lib/shader-runtime.ts,
  // the runtime every figure on the site uses; a module whose only entry is `@compute` is
  // dispatched instead, and the canvas plots what it wrote.
  //
  // A canvas holds one kind of context for its whole life, so a change of backend puts a new
  // canvas element in the frame. Nothing else moves: the source, the editor and the compile
  // stay as they are, and only the mount is made again.

  type Engine = 'auto' | 'webgpu' | 'webgl2' | 'cpu';
  const engine = (): Engine => {
    const value = enginePicker instanceof HTMLSelectElement ? enginePicker.value : 'auto';
    return value === 'webgpu' || value === 'webgl2' || value === 'cpu' ? value : 'auto';
  };
  const engineIsCpu = (): boolean => engine() === 'cpu';
  const result = createResultController({
    root,
    copy,
    currentChoice,
    engine,
    engineIsCpu,
    state: {
      get compiled() {
        return compiled;
      },
      get entries() {
        return entries;
      },
      get emitted() {
        return emitted;
      },
      get analysedVersion() {
        return analysedVersion;
      },
      get resourceGeneration() {
        return resourceGeneration;
      },
      get moduleDrawable() {
        return moduleDrawable;
      },
      get canvasFits() {
        return canvasFits;
      },
      get bindings() {
        return bindings;
      },
      get transport() {
        return transport;
      },
      get gpuProgram() {
        return gpuProgram;
      },
      get capture() {
        return capture;
      },
      get raster() {
        return raster;
      },
    },
    isComputeModule: () => isComputeModule(),
    waitFor,
    showConsole: (...args) => showConsole(...args),
  });
  const transport = createTransportController(root, copy, {
    get mounted() {
      return result.mounted;
    },
    get bindings() {
      return bindings;
    },
  });
  /** Moves on every texture, sampler or buffer change, so the signature above moves too. */
  let resourceGeneration = 0;

  const bindingsHost = root.querySelector('[data-bindings]');
  let valuesTimer = 0;
  const bindings = new BindingsModel(copy.bindings, {
    values: () => {
      // The frame the GPU is drawing packs the new value on its next frame. The oracle's
      // rasteriser and a dispatch take their values when they start, so those run again,
      // once the control has settled.
      result.mounted?.redraw();
      if (engineIsCpu() || isComputeModule()) {
        window.clearTimeout(valuesTimer);
        valuesTimer = window.setTimeout(() => void result.runResult(), 250);
      }
    },
    resources: () => {
      resourceGeneration += 1;
      void result.runResult();
    },
    overrides: () => {
      // An override is part of the program: the GLSL tabs spell it as a `#define` and the
      // WebGPU pipeline takes it as a constant, so the texts are emitted again.
      render();
    },
  });

  /** Whether the module has a compute entry and nothing to draw, which is when the tab
   *  dispatches it instead. */
  const isComputeModule = (): boolean =>
    entries.some((entry) => entry.stage === 'compute') &&
    !entries.some((entry) => entry.stage === 'fragment');

  const frame = root.querySelector('[data-gpu-frame]');

  // ── What a live example's link carries beside its file ─────────────────────────────────
  // A live example's canvas has a shape of its own, and its controls a range and a value of
  // their own (src/components/LiveShader.astro). Its link names both (`aspect=`, `controls=`,
  // src/scripts/source-link.ts), so the file opens here on the picture the page draws. Both
  // stay in the fragment while the file is edited, and go when an example or Blank is opened.

  /** The frame's shape the link named, or undefined for the Playground's own 4:3. */
  let linkedAspect: string | undefined;
  /** The `controls=` text the link carried, written back unchanged while it holds. */
  let linkedControls: string | undefined;
  const defaultAspect = parseAspect(PLAYGROUND_ASPECT)!;
  let frameAspect: [number, number] = defaultAspect;
  /** The rasteriser's grid height for a grid `side` wide, at the frame's shape, so a pixel of
   *  it is square on the page. */
  const gridHeight = (side: number): number =>
    Math.max(1, Math.round((side * frameAspect[1]) / frameAspect[0]));
  /** Put the frame, the rasteriser's grid and the resolution labels on `text`'s shape, or back
   *  on 4:3. With `redraw`, a grid that changes size is laid out again the way a pick of
   *  another resolution lays it out. */
  const applyAspect = (text: string | null | undefined, redraw = false): void => {
    const parsed = text === PLAYGROUND_ASPECT ? undefined : parseAspect(text);
    linkedAspect = parsed ? text! : undefined;
    frameAspect = parsed ?? defaultAspect;
    if (frame instanceof HTMLElement)
      frame.style.aspectRatio = parsed ? `${parsed[0]} / ${parsed[1]}` : '';
    if (resolutionPicker instanceof HTMLSelectElement) {
      for (const option of resolutionPicker.options) {
        const side = Number(option.value);
        option.textContent = (option.textContent ?? '').replace(
          /^\d+ × \d+/,
          `${side} × ${gridHeight(side)}`,
        );
      }
    }
    if (!(canvas instanceof HTMLCanvasElement) || canvas.height === gridHeight(canvas.width))
      return;
    if (redraw && resolutionPicker instanceof HTMLSelectElement)
      resolutionPicker.dispatchEvent(new Event('change'));
    else canvas.height = gridHeight(canvas.width);
  };
  const gpuProgram = createGpuProgram(copy, bindings, currentChoice, {
    get compiled() {
      return compiled;
    },
    get reflection() {
      return reflection;
    },
    get emitted() {
      return emitted;
    },
    get entries() {
      return entries;
    },
    get fileName() {
      return fileName;
    },
    get glslFailure() {
      return glslFailure;
    },
    get workspace() {
      return workspace;
    },
  });

  const sourceLine = (e: ConsoleEvent): string => {
    if (!e.span) return '';
    const path = workspace.pathOfUri(e.span.file);
    const file = path === '' ? fileName : (path ?? e.span.file.split(/[\\/]/).pop());
    const line = path === '' ? outOfDocument(e.span.line) : e.span.line;
    return `${file}:${line + 1}`;
  };
  const { sentence, consoleList, paintConsole, showConsole } = createConsoleView(
    consolePane,
    copy,
    sourceLine,
    result.backendName,
  );
  const capture = createCaptureController({
    root,
    copy,
    bindings,
    currentChoice,
    engineIsCpu,
    isComputeModule,
    gpuCanvasNow: result.gpuCanvasNow,
    state: {
      get compiled() {
        return compiled;
      },
      get mounted() {
        return result.mounted;
      },
      get frozen() {
        return transport.frozen;
      },
      get raster() {
        return raster;
      },
    },
    consoleView: { sentence, paintConsole, consoleList },
    rasterPlan: () => cpuProgram.rasterPlan(),
    cpuFrameBindings: (...args) => cpuProgram.cpuFrameBindings(...args),
    outOfDocument,
  });

  // The handle scripts/check-playground.mjs reads. It pins the clock, and asks the rasteriser
  // for single pixels at the GPU canvas's own size, so the two engines are compared on the
  // same pixels of the same frame.
  const handle: PlaygroundHandle = {
    freeze: (seconds) => {
      transport.frozen = seconds;
      // A held frame is held at the size it has, so the pixels a check reads off it and the
      // grid it asks the rasteriser for are one grid.
      result.mounted?.holdScale(seconds !== null);
      result.mounted?.redraw();
    },
    idle: (on) => result.mounted?.idle(on),
    cpuPixels: async (points, width, height) => {
      const current = compiled;
      try {
        await bindings.prepareCpuResources();
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
      if (current !== compiled) return 'the source changed';
      if (!compiled) return 'no module';
      const vertex = entries.find((entry) => entry.stage === 'vertex');
      const fragment = entries.find((entry) => entry.stage === 'fragment');
      if (!vertex || !fragment) return 'no vertex and fragment pair';
      const attributes = bindings.cpuAttributes();
      const plan: RasterPlan = {
        width,
        height,
        vertex,
        fragment,
        structs: compiled.module.structs.map((struct) => ({
          name: struct.name,
          fields: struct.fields.map((f) => ({ name: f.name })),
        })),
        bindings: cpuProgram.cpuFrameBindings(transport.frozen ?? 0, width, height),
        ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      };
      try {
        const oracle = compileModule(compiled.module, {
          gpuStubs: true,
          precision: RASTER_PRECISION,
        });
        for (const [name, value] of Object.entries(plan.bindings ?? {}))
          oracle.setBinding(name, value as never);
        const cpu = oracle.fns as CpuFunctions;
        const corners = cornersOf(cpu, plan);
        if (!corners) return 'no triangle';
        return points.map(([x, y]) => {
          const tile = drawTile(cpu, plan, corners, x, y, x + 1, y + 1);
          return tile.covered > 0 ? Array.from(tile.pixels) : null;
        });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    },
  };
  root.__playground = handle;

  /** Show the canvas the picked engine draws on, and draw on it. Nothing is compiled here: the
   *  program is the one the last compile emitted. */
  const syncEngine = (): void => {
    const cpu = engineIsCpu() && !isComputeModule();
    for (const node of cpuOnly) node.hidden = !cpu;
    const node = result.gpuCanvasNow();
    if (node) node.hidden = cpu;
    if (cpu) result.retireStill();
    // A different backend is a different context, so the mount starts over on a new canvas.
    result.stopMount();
    void result.runResult();
  };

  /** What the canvas had no value for when it ran the vertex entry. It runs that entry at
   *  the indices 0, 1 and 2 and zeroes every other input, so an input the entry reads comes
   *  back as three collapsed corners and there is no triangle. Naming them is the difference
   *  between a reader fixing their shader and reading the page as broken. */
  const zeroedVertexInputs = (): readonly string[] => {
    const vertex = entries.find((entry) => entry.stage === 'vertex');
    return (vertex?.io?.inputs ?? [])
      .filter((field) => field.builtin !== 'vertex_index')
      .map((field, index) => field.name ?? `arg${index}`);
  };

  /** A raster failure as a sentence. The oracle takes entry arguments and no resource
   *  values, so an entry reading a uniform or a storage binding stops at the name. */
  const rasterFailure = (message: string): string => {
    if (message === 'no triangle') {
      const zeroed = zeroedVertexInputs();
      return zeroed.length > 0
        ? fillNumbers(copy.canvasFlatInputs, { fields: zeroed.join(', ') })
        : copy.canvasFlat;
    }
    if (/unknown (?:const|var|binding)|unbound/.test(message)) return copy.cpuNoResources;
    return message || copy.cpuFailed;
  };

  const goTo = (position: TypeshadePosition): void => {
    if (!editor) return;
    if (workspace.activeFile !== '') workspace.showFile('');
    const target = toMonacoPosition(position);
    editor.setPosition(target);
    editor.revealPositionInCenter(target);
    editor.focus();
  };

  /** The compiler writes its diagnostics in English. The one the Playground itself causes, a
   *  file with no directive, is the page's own sentence, so it reads in the page's language. */
  const toRow = (diagnostic: TypeshadeDiagnostic): DiagnosticRow => ({
    uri: diagnostic.uri,
    message: diagnostic.code === 'TS8001' ? copy.directive : diagnostic.message,
    code: String(diagnostic.code ?? ''),
    severity: diagnostic.severity,
    source: diagnostic.source,
    start: diagnostic.range.start,
    located: diagnostic.uri !== documentUri || !inPrelude(diagnostic.range.start.line),
  });

  const paintDiagnostics = (rows: readonly DiagnosticRow[]): void => {
    diagnosticsPane.textContent = '';
    if (rows.length === 0) {
      diagnosticsPane.append(el('li', undefined, copy.clean));
      return;
    }
    for (const row of rows) {
      const button = el('button') as HTMLButtonElement;
      button.type = 'button';
      const main = row.uri === documentUri;
      if (row.located)
        button.append(
          el(
            'span',
            'at',
            main
              ? toDisplayPosition(row.start)
              : `${decodeURI(new URL(row.uri, documentUri).pathname).replace(/^\//, '')}:${row.start.line + 1}:${row.start.character + 1}`,
          ),
        );
      button.append(
        el(
          'span',
          'source',
          ` ${row.source === 'typescript' ? copy.sourceTypescript : copy.sourceTypeshade}`,
        ),
      );
      button.append(el('span', row.severity === 'error' ? 'error' : undefined, ` ${row.message}`));
      if (row.located && workspace.pathOfUri(row.uri) !== undefined)
        button.addEventListener('click', () => {
          workspace.showFile(workspace.pathOfUri(row.uri)!);
          if (main) goTo(row.start);
          else {
            const position = { lineNumber: row.start.line + 1, column: row.start.character + 1 };
            editor.setPosition(position);
            editor.revealPositionInCenter(position);
            editor.focus();
          }
        });
      else button.disabled = true;
      const item = el('li');
      item.append(button);
      // The code sits outside the button, since a link inside one is not a link.
      const code = errorLink(copy.errorsHref, row.code, 'diag-code');
      if (code) item.append(code);
      diagnosticsPane.append(item);
    }
  };

  /** Paints one analysis of the document: the markers, the list, the status, and the panes
   *  emitted from the module it lowered. Nothing here compiles. The worker did, and what
   *  arrived is data: diagnostics, and the IR when they allowed one. */
  const paintAnalysis = (analysis: Analysis): void => {
    if (!editor || !model || !monacoApi) return;
    output.textContent = '';
    diagnosticsPane.textContent = '';
    root.classList.remove('has-errors', 'has-output');

    const found = analysis.diagnostics;
    const rows = found.map(toRow);
    // The compiler stays quiet about a file with no directive, so the Playground says it.
    if (!analysis.hasDirective && rows.length === 0) {
      rows.push({
        uri: documentUri,
        message: copy.directive,
        code: 'TS8001',
        severity: 'error',
        source: 'typeshade',
        start: { line: 0, character: 0 },
        located: true,
      });
    }

    // One marker owner, fed from the service alone. Monaco's own TypeScript checking is off,
    // and TypeScript's diagnostics arrive from the service instead, under `source`; Monaco
    // prints that beside the code after the message, so the two halves read apart there the
    // way the list above tags them.
    monacoApi.editor.setModelMarkers(
      model,
      'typeshade',
      diagnosticsForDocument(found, documentUri)
        .filter((diagnostic) => !inPrelude(diagnostic.range.start.line))
        .map((diagnostic) => ({
          ...toMonacoRange(diagnostic.range),
          message: diagnostic.message,
          source: diagnostic.source === 'typescript' ? copy.sourceTypescript : copy.sourceTypeshade,
          code: String(diagnostic.code),
          severity: markerSeverity(monacoApi, diagnostic.severity),
        })),
    );

    paintDiagnostics(rows);
    if (rows.some((row) => row.severity === 'error')) {
      status.textContent = copy.errors;
      root.classList.add('has-errors');
      waitFor(null);
    } else {
      status.textContent = copy.ready;
      waitFor('drawing');
    }

    // Reflection and the panes read the module the worker lowered. The worker sends none for
    // a file with no directive or one with an error, so those leave the panes empty, which is
    // what the service's own contract asks of an adapter: no compiled output past an error.
    compiled = undefined;
    reflection = undefined;
    entries = [];
    // The panes are emitted from the options bar instead of read off the compile, so the
    // bar is the one thing that decides what they hold. At its defaults the two agree:
    // `compile().wgsl` is `emitModule(module)`, which is `emitModuleAt(module, 'O2')`.
    const choice = currentChoice();
    if (analysis.module) {
      try {
        compiled = { module: analysis.module as ModuleDecl };
        // The same flavour the emit is given. The `float` helpers read an `_fp64` guard
        // texture the lowering injects and the `integer` ones read none, so a reflection
        // computed under the other flavour lists a binding the emitted module does not
        // declare, or leaves out one it does.
        reflection = reflect(compiled.module, { fp64Flavor: choice.fp64Flavor });
        entries = (reflection.entries ?? []) as readonly ReflectedEntry[];
      } catch (error) {
        compiled = undefined;
        reflection = undefined;
        entries = [];
        serviceFailed(error instanceof Error ? error.message : String(error));
      }
    }

    // The bindings panel reads the new reflection first, keeping every value the reader set
    // for a binding that survived the edit, because the GLSL tabs spell an override the
    // reader moved as a `#define` of that value.
    bindings.update(reflection, compiled?.module);
    const glslOrWhy = compiled
      ? emitGlsl(
          compiled.module,
          choice,
          bindings.overridesMoved() ? bindings.constants() : undefined,
        )
      : undefined;
    const glsl = glslOrWhy && 'vertex' in glslOrWhy ? glslOrWhy : undefined;
    glslFailure = glslOrWhy && 'failed' in glslOrWhy ? glslOrWhy.failed : '';
    let wgsl: string | undefined;
    try {
      wgsl = compiled ? emitWgsl(compiled.module, choice) : undefined;
    } catch (error) {
      compiled = undefined;
      serviceFailed(error instanceof Error ? error.message : String(error));
    }
    emitted = {
      wgsl,
      glslVertex: glsl?.vertex,
      glslFragment: glsl?.fragment,
    };
    if (emitted.wgsl) root.classList.add('has-output');
    outputView.paintOutput();
    paintReflection();
    // The canvas and the return values follow the source. The oracle's calls are
    // microseconds, so the return values are not worth a button press; the buttons re-run
    // with edited arguments and redraw. Only the engine the reader is looking at runs: a
    // rasteriser drawing a canvas nobody is shown is the page's own CPU for nothing.
    // Texture-backed return values wait for an explicit CPU request.
    // A GPU-only startup does not decode atlas pixels.
    if (!bindings.needsCpuResources()) void cpuProgram.evaluateOnCpu();
    if (bindingsHost instanceof HTMLElement) bindings.render(bindingsHost);
    transport.syncDropHint();
    // A compute module has no rasteriser half, so the engine's canvases are set for it again.
    const cpu = engineIsCpu() && !isComputeModule();
    for (const node of cpuOnly) node.hidden = !cpu;
    const node = result.gpuCanvasNow();
    if (node) node.hidden = cpu;
    void result.runResult();
  };

  /** Hands the worker the document as the editor holds it now. Sent on every change, so the
   *  worker never answers a hover or a completion about text the editor has already left
   *  behind: storing the text costs the service nothing until something is asked. */
  const syncDocument = (): void => {
    if (!editor || !model || !client) return;
    version += 1;
    root.dataset.version = String(version);
    const composed = compose(model.getValue());
    coordinates.setPrelude(composed);
    if (preludeNote instanceof HTMLElement) preludeNote.hidden = composed.lines === 0;
    client.update(documentUri, composed.text, version);
  };

  /** Asks the worker for the document's analysis and paints it when it arrives. A control on
   *  the options bar calls this too, and for that the last analysis is repainted at once,
   *  since the document has not changed. Debounced by the caller on an edit. */
  const render = (): void => {
    if (!editor || !model || !monacoApi) return;
    if (lastAnalysis && analysedVersion === version) {
      paintAnalysis(lastAnalysis);
      return;
    }
    if (!client) {
      serviceFailed();
      return;
    }
    const asked = version;
    status.textContent = analysedVersion < 0 ? copy.starting : copy.idle;
    if (analysedVersion < 0) waitFor('compiling');
    void client
      .request('analysis', documentUri, asked, {})
      .then(async (analysis) => {
        if (!analysis || asked !== version) return;
        // Each pass is a program of its own (compiler change 0026), compiled beside the main
        // file at the same version, so the canvas draws one consistent set.
        const passes = await Promise.all(
          workspace.passGraph.map(async (p) => {
            const result = await client.request('analysis', workspace.uriOf(p.path), asked, {});
            if (!result && asked === version) throw new Error(copy.serviceFailed);
            return [p.name, result?.module as ModuleDecl | undefined] as const;
          }),
        );
        if (asked !== version) return;
        workspace.passModules = new Map(passes);
        lastAnalysis = analysis;
        analysedVersion = asked;
        paintAnalysis(analysis);
        workspace.paintFileMarkers();
        // host.ts reads the module's host view, so a new program is a new check of it.
        host.checkHost();
      })
      .catch((error: unknown) => {
        if (asked === version)
          serviceFailed(error instanceof Error ? error.message : String(error));
      });
  };

  /** Writes the workspace into the link: the main file as `code`, and the files beside it as
   *  `files`, one JSON object by path, only where they are other than the example's own. */
  const publishSource = async (): Promise<void> => {
    if (!model) return;
    // A graph of passes names files beside the main one, so a link that carries one carries
    // those files too, whatever the main file has become.
    const more =
      workspace.filesMoved() || workspace.passGraph.length > 0
        ? [`files=${await encodeSource(JSON.stringify(workspace.workspaceFiles()))}`]
        : [];
    if (workspace.passGraph.length > 0)
      more.push(`passes=${workspace.passGraph.map((p) => `${p.name}:${p.path}`).join(',')}`);
    // The main file's name rides along where it is other than the one the link would open
    // under without it, so a link written before files had names opens as it always did.
    const text = model.getValue();
    const unnamed = exampleFileName(examples.find((candidate) => candidate.source === text)?.id);
    if (fileName !== unnamed) more.push(`name=${encodeURIComponent(fileName)}`);
    // host.ts rides along where it is other than the one the link opens with without it: the
    // example's own, or the starter the page writes. A link written before host.ts opens as
    // it always did.
    if (host.hostCarried()) more.push(`host=${await encodeSource(host.hostText())}`);
    // A live example's frame shape and controls, as its link carried them.
    if (linkedAspect) more.push(`aspect=${linkedAspect}`);
    if (linkedControls) more.push(`controls=${linkedControls}`);
    writeHash('code', await encodeSource(text), currentChoice(), more);
  };

  const { shareLink } = bindSharing({
    root,
    share,
    copyOutput,
    copy,
    publishSource,
    captureStill: result.captureStill,
    getFileName: () => (model ? fileName : undefined),
    getOutput: () => outputView.emittedFor(workspace.activeFile)[outputView.target] ?? '',
  });

  /** Which example the editor was last filled from. On a page that names the example there
   *  is no picker to read it off, so the id is held here and Reset uses it. */
  let openedExample = root.dataset.defaultExample ?? '';
  /** The file a link opened with no example behind it, and the values its controls started
   *  at, so Reset comes back to it and not to an example the reader never opened. */
  let linkedOpening: { source: string; seed: Record<string, number[]> } | undefined;

  /** Drop what a live example's link carried: the frame goes back to 4:3 and the fields to
   *  their own ranges. */
  const forgetLinkedView = (): void => {
    linkedOpening = undefined;
    linkedControls = undefined;
    bindings.setControls({});
    applyAspect(undefined, true);
  };

  const showExample = (id: string): void => {
    const example = examples.find((candidate) => candidate.id === id);
    if (!example || !editor || !model) return;
    openedExample = example.id;
    if (examplePicker instanceof HTMLSelectElement) examplePicker.value = example.id;
    if (exampleNote instanceof HTMLElement) exampleNote.textContent = example.description;
    showImportsNote(example.id);
    forgetLinkedView();
    bindings.seed(example.defaults ?? {});
    workspace.renameMain(exampleFileName(example.id));
    // The files it imports go in first, so the worker holds them when the new text asks.
    workspace.setFiles(
      openingLoader.filesFor(example.source, example),
      openingLoader.graphFor(example),
    );
    // host.ts goes with the example: its own for a host example, else none until it is needed.
    host.stopHost();
    host.setHost(example.host, example.host);
    model.setValue(example.source);
    // The edit handler queued a render for the new text; this one is immediate, so that one
    // is dropped and the example is painted once.
    window.clearTimeout(timer);
    writeHash('example', example.id, currentChoice());
    render();
  };

  if (examplePicker instanceof HTMLSelectElement) {
    examplePicker.addEventListener('change', () => showExample(examplePicker.value));
  }

  /** Whether the link can stay the short `#example=` form: it names an example, carries no
   *  code, and the main file still has that example's name. */
  const exampleLink = (named: string | null): boolean =>
    Boolean(named) &&
    !hashParams().get('code') &&
    fileName === exampleFileName(named!) &&
    !host.hostCarried();

  const applyOptions = (): void => {
    levelNote.hidden = levelPicker.value === 'O2';
    numbersField.hidden = !minifyToggle.checked;
    render();
    // The bar is part of what a link shows, so changing it rewrites the fragment. An
    // untouched example keeps its short `#example=` form.
    const named = hashParams().get('example');
    if (exampleLink(named)) writeHash('example', named!, currentChoice());
    else void publishSource();
  };
  for (const control of [
    levelPicker,
    parensPicker,
    precisionPicker,
    minifyToggle,
    numbersPicker,
    obfuscateToggle,
    fp64Picker,
  ]) {
    control.addEventListener('change', applyOptions);
  }

  // `width` and `height` on a canvas are its backing store, which is the grid the fragment
  // entry is run over. The box it is shown in is held at one size in the stylesheet, so this
  // changes how much is computed and never how much room the pane takes. A bigger grid is
  // also where the pool earns its keep: the tiles are the same size, so four times the pixels
  // is four times the queue and the same workers draining it.
  if (resolutionPicker instanceof HTMLSelectElement && canvas instanceof HTMLCanvasElement) {
    resolutionPicker.addEventListener('change', () => {
      const side = Number(resolutionPicker.value);
      if (!Number.isFinite(side)) return;
      // A draw already in flight was planned against the old grid, and its tiles carry the
      // old grid's coordinates. Raising the job retires them at the worker and at the page,
      // so none of them lands on the canvas that is about to replace them. At 8K a draw runs
      // for tens of seconds, so this is a control a reader can reach mid-draw.
      raster.stopDrawing();
      // The grid keeps the frame's shape, so a pixel of it is square on the page.
      canvas.width = side;
      canvas.height = gridHeight(side);
      const surface = canvas.getContext('2d');
      surface?.clearRect(0, 0, side, side);
      canvasFits = holdsItsPixels(canvas, surface);
      raster.syncDrawButton();
      if (canvasNote instanceof HTMLElement) {
        canvasNote.textContent = !moduleDrawable
          ? copy.canvasNeedsVertex
          : canvasFits
            ? copy.canvasIdle
            : copy.canvasTooBig;
      }
      if (moduleDrawable && canvasFits) raster.drawOnCpu();
    });
  }

  if (enginePicker instanceof HTMLSelectElement) {
    enginePicker.addEventListener('change', () => {
      syncEngine();
      // The backend is part of what a link shows, the way the emit options are.
      const named = hashParams().get('example');
      if (exampleLink(named)) writeHash('example', named!, currentChoice());
      else void publishSource();
    });
  }
  const openingLoader = createOpeningLoader({
    root,
    copy,
    examples,
    library,
    sample,
    applyAspect,
    nameMain,
    levelPicker,
    parensPicker,
    precisionPicker,
    minifyToggle,
    numbersPicker,
    obfuscateToggle,
    fp64Picker,
    enginePicker,
    context: {
      get fileName() {
        return fileName;
      },
      get linkedControls() {
        return linkedControls;
      },
      set linkedControls(value) {
        linkedControls = value;
      },
    },
  });

  // ── The transport ──────────────────────────────────────────────────────────────────────
  // Play and pause, back to zero, the clock and the frame rate, and the frame on the whole
  // screen: the row an engine's viewport carries. It drives the clock `shaderClock` reads, so
  // it moves the GPU canvas; the rasteriser draws one frame at a time and has no clock to run.

  const workspace = createWorkspaceController({
    root,
    copy,
    examples,
    library,
    bindings,
    context: {
      get client() {
        return client;
      },
      get monacoApi() {
        return monacoApi;
      },
      get editor() {
        return editor;
      },
      get model() {
        return model;
      },
      get version() {
        return version;
      },
      get documentUri() {
        return documentUri;
      },
      get fileName() {
        return fileName;
      },
      get openedExample() {
        return openedExample;
      },
      get host() {
        return host;
      },
    },
    syncDocument,
    onEdit: scheduleEdit,
    serviceFailed,
    retireStill: result.retireStill,
    nameMain,
    paintOutput: outputView.paintOutput,
  });
  const host = createHostController({
    startFrame: startHostFrame,
    hostTypes: new URL(hostTypesAsset, window.location.href).toString(),
    root,
    copy,
    context: {
      get client() {
        return client;
      },
      get monacoApi() {
        return monacoApi;
      },
      get version() {
        return version;
      },
      get documentUri() {
        return documentUri;
      },
      get view() {
        return outputView.view;
      },
      get openedExample() {
        return openedExample;
      },
      get examples() {
        return examples;
      },
    },
    fileMarker: workspace.fileMarker,
    paintTabs: workspace.paintTabs,
    onEdit: schedulePublish,
    selectView: outputView.selectView,
    sentence,
    paintConsole,
  });

  // Download: the workspace as a zip of a folder VS Code opens, the files as the tabs hold them
  // and the pass graph in typeshade.json (src/scripts/workspace-folder.ts).
  const downloadButton = root.querySelector('[data-download]');
  if (downloadButton instanceof HTMLButtonElement)
    downloadButton.addEventListener('click', async () => {
      if (!model) return;
      await host.ensureHost();
      const folder = workspaceFolder(
        { path: fileName, text: model.getValue() },
        workspace.workspaceFiles(),
        workspace.passGraph,
        host.hostReady ? host.hostText() : undefined,
      );
      const url = URL.createObjectURL(new Blob([zipStored(folder)], { type: 'application/zip' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${fileName.replace(/\.shade\.ts$/, '')}.zip`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  // Open in VS Code: the extension's uri handler takes the same link Share copies and opens
  // the workspace it names (vscode-typeshade, docs/playground-bridge.md). An anchor click
  // hands the uri to the browser, which asks the reader before it launches the editor, and
  // the page stays where it is. The link is encoded twice: VS Code decodes the uri's query
  // once before the handler reads it, and the page's own URL carries `&` and `+` that a
  // single encoding would leave the handler to split on.
  // The browser says nothing when no editor answers the address, so the click also opens a
  // line under the file bar that links to the page on installing the extension. It closes
  // itself, and it takes no room until the reader has clicked.
  const openInVsCodeButton = root.querySelector('[data-open-vscode]');
  const openInVsCodeHint = root.querySelector('[data-vscode-hint]');
  let hintTimer = 0;
  if (openInVsCodeButton instanceof HTMLButtonElement)
    openInVsCodeButton.addEventListener('click', () => {
      if (!model) return;
      void shareLink().then((link) => {
        const anchor = document.createElement('a');
        anchor.href = `vscode://typeshade.vscode-typeshade/open?link=${encodeURIComponent(encodeURIComponent(link))}`;
        anchor.click();
        if (!(openInVsCodeHint instanceof HTMLElement)) return;
        openInVsCodeHint.hidden = false;
        window.clearTimeout(hintTimer);
        hintTimer = window.setTimeout(() => {
          openInVsCodeHint.hidden = true;
        }, 20_000);
      });
    });

  // ── The gallery ────────────────────────────────────────────────────────────────────────
  // A link that names nothing opens on the examples as tiles; a tile opens the editor on that
  // example, as a new entry in the history, so Back returns to the tiles. The editor stays
  // mounted under the gallery, so its state survives a look at the tiles and back.

  const gallery = root.querySelector('[data-gallery]');
  const openGallery = root.querySelector('[data-open-gallery]');
  const blankSource = root.dataset.blank ?? '';
  /** An example a tile asked for before the editor was up, opened once it is. */
  let pendingOpen: string | undefined;
  /** Opens the Blank tile's file: one file, no example behind it, so Reset comes back here. */
  const openBlank = (): void => {
    if (!editor || !model) return;
    openedExample = '';
    if (examplePicker instanceof HTMLSelectElement) examplePicker.selectedIndex = -1;
    if (exampleNote instanceof HTMLElement) exampleNote.textContent = '';
    showImportsNote(undefined);
    forgetLinkedView();
    bindings.seed({});
    workspace.renameMain(MAIN_FILE);
    workspace.setFiles({});
    host.stopHost();
    host.setHost(undefined, undefined);
    model.setValue(blankSource);
    window.clearTimeout(timer);
    writeHash('blank', '1', currentChoice());
    render();
  };
  /** Reset on a file a link opened with no example behind it: the file comes back as the link
   *  had it, its controls at the values the link named, under the frame shape it named. */
  const reopenLinked = (): void => {
    if (!editor || !model || !linkedOpening) return;
    bindings.seed(linkedOpening.seed);
    model.setValue(linkedOpening.source);
    window.clearTimeout(timer);
    render();
  };
  const setView = (view: 'gallery' | 'editor'): void => {
    if (!(gallery instanceof HTMLElement)) return;
    root.dataset.view = view;
    if (view === 'editor') editor?.layout();
    else host.stopHost();
  };
  const hashOpensEditor = (): boolean =>
    /(^|&)(example|code|blank|share)(=|&|$)/.test(window.location.hash.replace(/^#/, ''));
  const pushHash = (hash: string): void => {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.pushState(null, '', url);
  };
  if (gallery instanceof HTMLElement) {
    gallery.addEventListener('click', (event) => {
      const tile = (event.target as Element | null)?.closest(
        'a[data-open-example], a[data-open-blank]',
      );
      if (!(tile instanceof HTMLAnchorElement)) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      const id = tile.dataset.openExample ?? 'blank';
      pushHash(id === 'blank' ? 'blank' : `example=${id}`);
      setView('editor');
      window.scrollTo({ top: 0 });
      if (!editor) pendingOpen = id;
      else if (id === 'blank') openBlank();
      else showExample(id);
    });
    if (openGallery instanceof HTMLButtonElement) {
      openGallery.addEventListener('click', () => {
        // The link keeps what the editor holds, so Back returns to it; the bare address is the
        // gallery's.
        void publishSource().finally(() => {
          pushHash('');
          setView('gallery');
          window.scrollTo({ top: 0 });
        });
      });
    }
    window.addEventListener('popstate', () => {
      if (!hashOpensEditor()) {
        setView('gallery');
        return;
      }
      setView('editor');
      const named = hashParams().get('example');
      if (named && !hashParams().get('code') && named !== openedExample) showExample(named);
    });
  }

  status.textContent = copy.loading;
  Promise.all([loadMonaco(), openingLoader.openingSource()])
    .then(([monaco, opening]) => {
      monacoApi = monaco;
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2022,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
        experimentalDecorators: true,
      });
      // TypeShade is TypeScript syntax with a compiler of its own behind it, and Monaco's
      // bundled TypeScript disagrees with it on the sample the page opens with: `builtin` is
      // an unknown name to it (TS2304), a field an entry point fills has no initialiser
      // (TS2564), `@location(0)` reads as the DOM's global Location (TS2349), and a decorator
      // on a function is a syntax error it has no option to relax (TS1206). The TypeShade
      // compiler reports none of those. So Monaco's own checking is off and the markers on
      // the model are the compiler's diagnostics.
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true,
      });
      // And its providers are off too. The page registers one provider per service method
      // below, and the service answers for TypeScript's half as well as TypeShade's, so with
      // Monaco's own left on a hover would show two answers, `i: number` from its worker over
      // `i: u32` from the compiler. Off, the widget holds one. The language stays registered:
      // its tokenizer and bracket rules are what colour the text before the semantic tokens
      // arrive and what pair the braces.
      monaco.languages.typescript.typescriptDefaults.setModeConfiguration({
        completionItems: false,
        hovers: false,
        documentSymbols: false,
        definitions: false,
        references: false,
        documentHighlights: false,
        rename: false,
        diagnostics: false,
        documentRangeFormattingEdits: false,
        signatureHelp: false,
        onTypeFormattingEdits: false,
        codeActions: false,
        inlayHints: false,
      });
      defineTypeshadeThemes(monaco);

      // Colourising bakes the theme into the markup, so the pane is painted again on a change.
      followSiteTheme(monaco, outputView.paintOutput);
      showImportsNote(opening.example?.id);
      if (opening.example) {
        openedExample = opening.example.id;
        bindings.seed(opening.example.defaults ?? {});
        if (examplePicker instanceof HTMLSelectElement) examplePicker.value = opening.example.id;
        if (exampleNote instanceof HTMLElement)
          exampleNote.textContent = opening.example.description;
      } else {
        // A file with no example behind it: the picker names none, the way it does for Blank.
        // The first example's title would name code that is not that example.
        if (examplePicker instanceof HTMLSelectElement) examplePicker.selectedIndex = -1;
        if (exampleNote instanceof HTMLElement) exampleNote.textContent = '';
        if (opening.linked) {
          openedExample = '';
          linkedOpening = { source: opening.source, seed: openingLoader.seedOf(opening.controls) };
        }
      }
      if (opening.controls) {
        bindings.setControls(opening.controls);
        if (!opening.example) bindings.seed(openingLoader.seedOf(opening.controls));
      }
      model = monaco.editor.createModel(
        opening.source,
        'typescript',
        monaco.Uri.parse(MAIN_MODEL_URI),
      );
      // host.ts's model, after the main one: the main file stays the first model. Its text is
      // the link's, else its example's, else none until it is needed.
      host.hostModel = monaco.editor.createModel(
        '',
        'typescript',
        monaco.Uri.parse('inmemory://playground/host.ts'),
      );
      host.hostModel.onDidChangeContent(host.hostEdited);
      if (opening.host !== undefined) host.setHost(opening.host, opening.example?.host);
      else if (opening.example?.host !== undefined)
        host.setHost(opening.example.host, opening.example.host);
      editor = monaco.editor.create(editorHost, {
        model,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 21,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'off',
        scrollBeyondLastLine: false,
        padding: { top: 14, bottom: 14 },
        quickSuggestions: true,
        roundedSelection: false,
        'semanticHighlighting.enabled': true,
      });

      registerEditorProviders(
        monaco,
        () => ({
          model,
          documentUri,
          version,
          hostModel: host.hostModel,
          hostTypes: host.hostTypes,
          client,
        }),
        workspace.pathOfUri,
        coordinates,
        {
          modelForPath: (path) => workspace.extras.get(path)?.model,
          openFile: (path, selection) => {
            workspace.showFile(path);
            if (selection) {
              if ('startLineNumber' in selection) {
                editor.setSelection(selection);
                editor.revealRangeInCenter(selection);
              } else {
                editor.setPosition(selection);
                editor.revealPositionInCenter(selection);
              }
            }
            editor.focus();
          },
        },
      );

      // The files beside it first, then the document: the worker holds each from the moment
      // its model exists, so the first analysis reads the imports the tabs show.
      workspace.setFiles(
        opening.files ?? openingLoader.filesFor(opening.source, opening.example),
        opening.graph ?? openingLoader.graphFor(opening.example),
      );
      syncDocument();

      model.onDidChangeContent((event: { isFlush?: boolean }) => {
        // A keystroke makes the still a picture of a file the editor no longer holds. Loading
        // an example is a flush and leaves it, so the example's own still covers its first frame.
        if (!event.isFlush) result.retireStill();
        scheduleEdit();
      });
      run.addEventListener('click', render);
      if (runCpu instanceof HTMLButtonElement)
        runCpu.addEventListener('click', cpuProgram.evaluateOnCpu);
      if (drawCpu instanceof HTMLButtonElement) {
        drawCpu.addEventListener('click', () => {
          if (raster.drawing !== 0) raster.stopDrawing();
          else raster.drawOnCpu();
        });
      }
      bindTabs(outputView.tabs, (index, focus) =>
        outputView.selectView((outputView.tabs[index].dataset.target ?? 'result') as View, focus),
      );
      reset.addEventListener('click', () => {
        if (openedExample === '' && linkedOpening) reopenLinked();
        else if (openedExample === '' && blankSource) openBlank();
        else showExample(openedExample);
        editor.focus();
      });
      levelNote.hidden = levelPicker.value === 'O2';
      numbersField.hidden = !minifyToggle.checked;
      syncEngine();
      transport.syncPlay();
      workspace.paintTabs();
      render();
      // A tile picked while the editor was loading.
      if (pendingOpen === 'blank') openBlank();
      else if (pendingOpen) showExample(pendingOpen);
      pendingOpen = undefined;
    })
    .catch((error) => {
      status.textContent = copy.errors;
      root.classList.add('has-errors');
      waitFor(null);
      // The reader gets the sentence; the console keeps the cause.
      diagnosticsPane.textContent = copy.unavailable;
      console.error('[playground]', error);
    });
}

const root = document.querySelector('[data-playground]');
if (root instanceof HTMLElement) mount(root);
