import { packModule } from '../../vendor/shader-dsl/src/index.ts';
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
import { emitModule, wgslBackend } from '../../vendor/shader-dsl/src/core/backends/wgsl.ts';
import { hostFeaturesFor } from '../../vendor/shader-dsl/src/core/backend.ts';
import {
  emitGlslStages,
  type GlslEmitOptions,
} from '../../vendor/shader-dsl/src/core/backends/glsl.ts';
import type { EmitOptions } from '../../vendor/shader-dsl/src/core/emit.ts';
import type { ModuleDecl } from '../../vendor/shader-dsl/src/core/ir/nodes.ts';
import type { Fp64Flavor } from '../../vendor/shader-dsl/src/core/passes/fp64-lower.ts';
import { compileModule } from '../../vendor/shader-dsl/src/core/oracle.ts';
import { type ConsoleEvent } from '../../vendor/shader-dsl/src/core/console.ts';
import type { ConsoleTier } from '../../vendor/shader-dsl/src/core/console-print.ts';
import {
  consoleBuffer,
  hasConsoleCall,
  type ConsoleBufferResult,
} from '../../vendor/shader-dsl/src/core/passes/console-buffer.ts';
import type { OptLevel } from '../../vendor/shader-dsl/src/core/passes/opt/optimize.ts';
import { reflect } from '../../vendor/shader-dsl/src/core/reflect.ts';
// The ship-time plugins live on their own subpath, the one a host imports for a release build.
import { minify, obfuscate } from '../../vendor/shader-dsl/src/emit-prod.ts';
import type {
  TypeshadeCompletionItem,
  TypeshadeDiagnostic,
  TypeshadeDocumentSymbol,
  TypeshadePosition,
  TypeshadeRange,
} from '../../vendor/shader-dsl/src/language-service/index.ts';
import {
  SEMANTIC_TOKEN_MODIFIERS,
  SEMANTIC_TOKEN_TYPES,
  HOST_URI,
  createLanguageClient,
  encodeSemanticTokens,
  type Analysis,
  type LanguageClient,
} from './playground-language.ts';
import {
  isPlotLayout,
  reservedValue,
  type ControlProp,
  type ControlProps,
} from '../lib/live-shader-contract.ts';
import {
  codeOnly,
  FRAGMENT_PRELUDE,
  isReserved,
  sampleShape,
} from '../lib/live-shader-compile-contract.ts';
import { runComputeOnGpu } from '../lib/compute-runner.ts';
import { BindingsModel, type BindingsCopy } from './playground-bindings.ts';
import { installOracleTextures } from './playground-oracle-textures.ts';
import { errorLink } from './error-links.ts';
import { diagnosticsForDocument } from './playground-diagnostics.ts';
import { decodeSource, encodeSource, parseAspect, PLAYGROUND_ASPECT } from './source-link.ts';
import { workspaceFolder, zipStored } from './workspace-folder.ts';
// host.ts (compiler change 0062): the declarations the worker checks it against, as one asset
// it fetches the first time host.ts is opened, and the sandboxed frame a run happens in.
import hostTypesAsset from 'virtual:playground-host-types';
import { startHostFrame, type HostEvent, type HostRun } from './playground-host-run.ts';
import { provideProgram } from './report-context.ts';
import {
  fetchExample,
  fetchIndex,
  fetchShare,
  pageLocale,
  shortLink,
  submitToGallery,
} from './example-data-client.ts';
import {
  GALLERY_STILL_BYTES,
  GALLERY_STILL_HEIGHT,
  GALLERY_STILL_WIDTH,
} from '../lib/gallery-data.ts';
// The runtime every figure on the site draws through. It imports nothing from the compiler:
// the WGSL, both GLSL stages and the std140 offsets arrive as plain data, which is exactly
// what this page already holds after a compile.
import {
  mountShader,
  type MountedShader,
  type ShaderData,
  type ShaderPassData,
} from '../lib/shader-runtime.ts';
import type { ResourceSpec } from '../lib/shader-bindings.ts';
import {
  cornersOf,
  drawTile,
  FRAME_LINES,
  pixelArguments,
  RASTER_PRECISION,
  entryArguments,
  zeroFor,
  type CpuFunctions,
  type RasterPlan,
  type RasterReply,
  type RasterRequest,
  type ReflectedEntry,
  type ReflectedField,
} from './playground-raster.ts';

// The oracle's texture reads answer from the texels the bindings panel binds, on this thread as
// in the raster workers, so the return values and a dispatch read the picture the GPU does.
installOracleTextures();

/** One example as the page carries it: the source from the vendored file, the words from i18n. */
interface PlaygroundExample {
  readonly id: string;
  readonly source: string;
  readonly title: string;
  readonly description: string;
  /** The files it imports, by their path in the examples directory, which the page carries
   *  in its library. An example the build does not have carries none. */
  readonly imports?: readonly string[];
  /** The passes drawn before it each frame, in draw order (compiler change 0026). */
  readonly passes?: readonly { readonly name: string; readonly file: string }[];
  /** Where a source twin's uniform fields start, by field name. */
  readonly defaults?: Readonly<Record<string, readonly number[]>>;
  /** A host example's host.ts (compiler change 0061), which opens in the tab beside it. */
  readonly host?: string;
}

/** What the options bar is set to. Every field is a value the compiler's emit API takes. */
interface EmitChoice {
  readonly level: OptLevel;
  readonly parens: 'full' | 'minimal';
  readonly minify: boolean;
  /** `minify({ numbers })`: how a float literal is re-spelled. */
  readonly numbers: boolean | 'f32';
  readonly obfuscate: boolean;
  /** Which primitives back the emulated-double helpers, for the emit and for reflect(). */
  readonly fp64Flavor: Fp64Flavor;
  readonly floatPrecision: 'highp' | 'mediump';
  /** The backend the Result tab draws on. Not an emit option, but it rides in the link with
   *  them, so a link shows the canvas the sender was looking at. */
  readonly backend: 'auto' | 'webgpu' | 'webgl2' | 'cpu';
}

/** The words the component wrote into `data-copy`; they live in src/i18n. */
interface PlaygroundCopy {
  readonly fileName: string;
  /** The picker's group for the examples newer than the build. */
  readonly releaseGroup: string;
  readonly idle: string;
  readonly ready: string;
  readonly errors: string;
  readonly loading: string;
  readonly clean: string;
  readonly noOutput: string;
  readonly directive: string;
  readonly unavailable: string;
  readonly copy: string;
  readonly copied: string;
  readonly share: string;
  readonly shared: string;
  /** Submit's dialog, which sends the file to the gallery (gallery.typeshade.dev). */
  readonly submit: {
    readonly cancel: string;
    readonly close: string;
    readonly sending: string;
    readonly sent: string;
    readonly already: string;
    readonly limit: string;
    readonly failed: string;
  };
  /** The error codes' index in the page's language, which a code links under. */
  readonly errorsHref: string;
  readonly emit: {
    readonly title: string;
    readonly optimization: string;
    readonly levels: Record<OptLevel, string>;
    readonly parens: string;
    readonly minify: string;
    readonly numbers: string;
    readonly obfuscate: string;
    readonly fp64: string;
    readonly precision: string;
    readonly levelNote: string;
  };
  readonly entryPoints: string;
  readonly resources: string;
  readonly inputs: string;
  readonly outputs: string;
  readonly returns: string;
  readonly runCpu: string;
  readonly running: string;
  readonly cpuIdle: string;
  readonly noResources: string;
  readonly noEntryPoints: string;
  readonly requiredFeatures: string;
  readonly cpuFailed: string;
  readonly canvas: string;
  readonly draw: string;
  readonly stop: string;
  readonly canvasIdle: string;
  readonly engineGpu: string;
  readonly engineCpu: string;
  readonly gpuIdle: string;
  readonly gpuWebgpu: string;
  readonly gpuWebgl2: string;
  readonly gpuNone: string;
  readonly gpuNeedsStages: string;
  readonly gpuNeedsAttributes: string;
  readonly gpuNeedsBindings: string;
  readonly gpuNoWebgpu: string;
  readonly gpuNoWebgl2: string;
  readonly gpuNoGlsl: string;
  readonly gpuNoGlslFeatures: string;
  readonly gpuNoFeature: string;
  readonly gpuFailed: string;
  readonly computeNeedsWebgpu: string;
  readonly computeRan: string;
  readonly consoleIdle: string;
  readonly consoleLines: string;
  readonly consoleNone: string;
  readonly consoleDropped: string;
  readonly consoleMore: string;
  readonly consoleIndex: string;
  readonly consolePixelHint: string;
  readonly consolePixel: string;
  readonly consolePixelGl: string;
  readonly consolePixelGpu: string;
  readonly consolePixelGpuNone: string;
  readonly consolePixelGpuFailed: string;
  readonly consolePixelNone: string;
  readonly consolePixelOutside: string;
  readonly consolePixelFailed: string;
  readonly consolePixelNoRaster: string;
  readonly consoleNotRecorded: string;
  readonly consoleNotRecordedFrame: string;
  readonly consoleVertex: string;
  readonly consoleVertexGpu: string;
  readonly consoleVertexAt: string;
  readonly consoleRecording: string;
  readonly consoleFrameGpu: string;
  readonly consoleFrameDropped: string;
  readonly consoleFrameFailed: string;
  readonly consoleFrameCpu: string;
  readonly consoleFrameKept: string;
  readonly pixelNote: string;
  readonly pixelNoteRecording: string;
  readonly consoleValue: string;
  readonly bindings: BindingsCopy;
  readonly canvasNeedsVertex: string;
  readonly canvasFlat: string;
  readonly canvasFlatInputs: string;
  readonly canvasProgress: string;
  readonly canvasDrawn: string;
  readonly resolution: string;
  readonly canvasTooBig: string;
  readonly args: string;
  readonly argsInvalid: string;
  readonly cpuNoResources: string;
  readonly entryCountOne: string;
  readonly noGlsl: string;
  readonly resultTab: string;
  readonly starting: string;
  readonly serviceFailed: string;
  readonly sourceTypescript: string;
  readonly sourceTypeshade: string;
  /** The gallery, the file tabs and the transport, in src/i18n under `playground.workspace`. */
  readonly workspace: {
    readonly files: string;
    readonly newFile: string;
    readonly download: string;
    readonly openInVsCode: string;
    readonly newFileName: string;
    readonly badName: string;
    readonly takenName: string;
    readonly renameHint: string;
    readonly renameLabel: string;
    readonly emptyName: string;
    readonly mainNameSlash: string;
    readonly importsRenamed: string;
    readonly deleteFile: string;
    readonly confirmDelete: string;
    readonly play: string;
    readonly pause: string;
    readonly fullscreen: string;
    readonly exitFullscreen: string;
    readonly dropHint: string;
    readonly pass: string;
    readonly passTitle: string;
    readonly passFailed: string;
    readonly passTexture: string;
    readonly passesRgba8: string;
    readonly runHost: string;
    readonly stopHost: string;
    readonly hostFrame: string;
    readonly hostConsole: string;
    readonly hostNone: string;
    readonly hostUnloaded: string;
    readonly hostStopped: string;
  };
}

/** The files the compiler emits, one per tab over the text panel. */
type Target = 'wgsl' | 'glslVertex' | 'glslFragment';

/** What the one tab strip over the result column selects: the canvas, one of the three
 *  emitted files, or the reflection. */
type View = 'result' | Target | 'reflection' | 'console';

/** What scripts/check-playground.mjs reads off the tool's element. */
interface PlaygroundHandle {
  /** Hold the shader clock at `seconds` on both engines, or let it run with null. */
  freeze(seconds: number | null): void;
  /** Stop drawing and leave the frame up, or draw again (`MountedShader.idle`). */
  idle(on: boolean): void;
  /** The rasteriser's RGBA at each pixel of a `width` by `height` grid, one 1-pixel tile each,
   *  or null where the triangle does not cover it; a sentence when it cannot run at all. */
  cpuPixels(
    points: readonly (readonly [number, number])[],
    width: number,
    height: number,
  ): Promise<(number[] | null)[] | string>;
}

declare global {
  interface HTMLElement {
    __playground?: PlaygroundHandle;
  }
}

/** Whether a view is one of the three the text panel holds. */
const isTarget = (view: View): view is Target =>
  view === 'wgsl' || view === 'glslVertex' || view === 'glslFragment';

// Monaco ships a WGSL grammar. It ships none for GLSL, and GLSL ES 3.00 is close enough to C
// for Monaco's C++ tokenizer to colour its keywords, types, numbers and `#version` line.
const TARGET_LANGUAGE: Readonly<Record<Target, string>> = {
  wgsl: 'wgsl',
  glslVertex: 'cpp',
  glslFragment: 'cpp',
};

// ── Reflection ─────────────────────────────────────────────────────────────────────────────
// What reflect() recovers from the compiled module, shaped for the pane. Names and types in
// here come from the source in the editor, so every one of them reaches the page as text on a
// node and none of it is ever written as markup.

/** How the zero of a type reads in an argument field, and how what is typed back reads as a
 *  value. A vector is a comma-separated list, which is how the source spells one too. */
const argText = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : String(value);

function parseArg(text: string, zero: unknown): unknown {
  const trimmed = text.trim();
  if (typeof zero === 'boolean') {
    if (/^(?:true|1)$/i.test(trimmed)) return true;
    if (/^(?:false|0)$/i.test(trimmed)) return false;
    throw new Error('not a boolean');
  }
  const parts = trimmed.split(',').map((part) => Number(part.trim()));
  if (parts.length === 0 || parts.some((part) => !Number.isFinite(part)))
    throw new Error('not a number');
  if (Array.isArray(zero)) {
    if (parts.length !== zero.length) throw new Error('wrong length');
    return parts;
  }
  if (parts.length !== 1) throw new Error('not a single number');
  return parts[0];
}

/** How a field reads on one line: `name: type` and the attribute that placed it, when it has one. */
function fieldLabel(field: ReflectedField): { text: string; attr: string } {
  const text =
    field.name && field.type ? `${field.name}: ${field.type}` : (field.type ?? field.name ?? '');
  if (field.builtin) return { text, attr: `@builtin(${field.builtin})` };
  if (typeof field.location === 'number') return { text, attr: `@location(${field.location})` };
  return { text, attr: '' };
}

/** A returned value as the pane prints it: arrays inline, everything else as JSON. */
function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => formatValue(v)).join(', ')}]`;
  if (value && typeof value === 'object') {
    return `{ ${Object.entries(value)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(', ')} }`;
  }
  return typeof value === 'number'
    ? String(Number(value.toFixed(6)))
    : (JSON.stringify(value) ?? String(value));
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One `label   value` line. */
function ioRow(label: string, text: string, attr = '', valueClass = 'io-value'): HTMLElement {
  const row = el('div', 'io-row');
  row.append(el('span', 'io-label', label));
  const value = el('span', valueClass, text);
  if (attr) {
    value.append(document.createTextNode('  '));
    value.append(el('span', 'attr', attr));
  }
  row.append(value);
  return row;
}

/** Monaco's one-based cursor position. */
interface MonacoPosition {
  readonly lineNumber: number;
  readonly column: number;
}

/** Monaco's one-based, end-exclusive range, which a marker and a hover both take. */
interface MonacoRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

// ── The fullscreen vertex half ─────────────────────────────────────────────────────────────
// A file that declares no `@vertex` entry is compiled behind the fullscreen triangle every
// Book of Shaders page draws on, which is what `<LiveShader>` does on a guide page and what
// src/lib/live-shader-compile-contract.ts fixes as the site's one rule for it. So a reader can write
// a fragment program alone, take the `uv` the triangle hands them, and see it cover the
// canvas, instead of reading that the canvas needs a vertex entry they did not want to write.
//
// The directive has to stay the first thing in the file, so the prelude goes in after it and
// everything below moves down by its lines. The compiler answers about the composed text and
// the editor holds the reader's, so the two line numbers differ from that point on, and the
// four functions below are where they meet.

/** The directive line as the compiler wants it: first in the file. The Playground's own
 *  sample writes a semicolon after it and the `.shade.ts` examples do not. */
const DIRECTIVE_LINE = /^[\s\uFEFF]*(['"])use typeshade\1[ \t]*;?[ \t]*\r?\n/;

/** The two top-level names the prelude brings. A file that declares one of its own would get
 *  a duplicate and stop compiling, so that file keeps what it wrote and the prelude stays
 *  out. A file that only names one of them gets the prelude and the declaration with it. */
const PRELUDE_DECLARES =
  /^[\t ]*(?:export[\t ]+)?(?:class|function|const|let|var|type|interface)[\t ]+(?:VsOut|fullscreen)\b/m;

/** The reader's text as the compiler sees it, and where the prelude went in. A file with no
 *  directive is left alone: the page's own message about the directive is what that reader
 *  needs, and it would never appear if a directive were supplied for them. */
function compose(source: string): {
  readonly text: string;
  readonly at: number;
  readonly lines: number;
} {
  const directive = DIRECTIVE_LINE.exec(source);
  const code = codeOnly(source);
  // A file with no fragment entry has nothing for the triangle to hand a `uv` to: a compute
  // kernel gets no vertex half it would never run.
  if (
    !directive ||
    sampleShape(source) === 'module' ||
    !/@fragment\b/.test(code) ||
    PRELUDE_DECLARES.test(code)
  ) {
    return { text: source, at: 0, lines: 0 };
  }
  const head = source.slice(0, directive[0].length);
  const inserted = `\n${FRAGMENT_PRELUDE}\n`;
  return {
    text: head + inserted + source.slice(directive[0].length),
    at: head.split('\n').length - 1,
    lines: inserted.split('\n').length - 1,
  };
}

/** How many lines the prelude took, and the line it went in at. Zero while the reader's file
 *  declares its own vertex entry, which is when the two texts are the same text. */
let preludeLines = 0;
let preludeAt = 0;

/** Whether a line of the compiled text is one of the prelude's, which the editor does not
 *  hold and the reader never wrote. */
const inPrelude = (line: number): boolean =>
  preludeLines > 0 && line >= preludeAt && line < preludeAt + preludeLines;

/** A line of the editor's text, as the compiled text numbers it. */
const intoDocument = (line: number): number =>
  preludeLines > 0 && line >= preludeAt ? line + preludeLines : line;

/** A line of the compiled text, back in the editor's. One of the prelude's own lands on the
 *  directive line, which is the nearest line the reader can see. */
const outOfDocument = (line: number): number => {
  if (preludeLines === 0 || line < preludeAt) return line;
  return line >= preludeAt + preludeLines ? line - preludeLines : Math.max(0, preludeAt - 1);
};

// ── The one place the two coordinate systems meet ──────────────────────────────────────────
// Monaco counts lines and columns from 1. The language service counts both from 0, the way
// the Language Server Protocol does. Every crossing goes through these four functions, so a
// +1 or a -1, and the prelude's own lines, live here and in no other file.

const toServicePosition = (position: MonacoPosition): TypeshadePosition => ({
  line: intoDocument(position.lineNumber - 1),
  character: position.column - 1,
});

const toMonacoPosition = (position: TypeshadePosition): MonacoPosition => ({
  lineNumber: outOfDocument(position.line) + 1,
  column: position.character + 1,
});

const toMonacoRange = (range: TypeshadeRange): MonacoRange => {
  const startLineNumber = outOfDocument(range.start.line) + 1;
  const startColumn = range.start.character + 1;
  const endLineNumber = outOfDocument(range.end.line) + 1;
  const endColumn = range.end.character + 1;
  // A zero-width range draws no squiggle, so an empty one is widened by a column.
  const empty = endLineNumber === startLineNumber && endColumn <= startColumn;
  return {
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn: empty ? startColumn + 1 : endColumn,
  };
};

/** How a diagnostic's position reads in the diagnostics pane: the line and column an editor shows. */
const toDisplayPosition = (position: TypeshadePosition): string =>
  `${outOfDocument(position.line) + 1}:${position.character + 1}`;

// ── Monaco, from the CDN ───────────────────────────────────────────────────────────────────
// The editor is loaded the way its own samples load it, through its AMD loader. `MONACO_VS`
// is the directory the loader knows as `vs`, with no trailing slash: the loader joins
// `/editor/editor.main.js` onto it, and a trailing slash would make that a doubled separator
// the CDN answers with a 400.
const MONACO_VERSION = '0.52.2';
const MONACO_MIN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;
const MONACO_VS = `${MONACO_MIN}/vs`;

function monacoWorkerUrl(_label: string): string {
  // A worker script fetched straight from the CDN is cross-origin, so each worker is a small
  // same-origin shim that names Monaco's own baseUrl and pulls the real worker in from there.
  //
  // Every label loads the same bootstrap. workerMain.js carries the AMD loader and reads the
  // module to run from the message Monaco sends it, so it serves the TypeScript worker and
  // the plain editor worker alike. Importing language/typescript/tsWorker.js directly, as
  // this did, hands the worker an AMD module with no loader under it, and the browser reports
  // that as the script failing to load; the CDN serves that file, so it read as a network
  // problem and was not one.
  //
  // baseUrl is the directory above vs, since the paths workerMain.js resolves start with vs/.
  const source =
    `self.MonacoEnvironment={baseUrl:${JSON.stringify(`${MONACO_MIN}/`)}};` +
    `importScripts(${JSON.stringify(`${MONACO_VS}/base/worker/workerMain.js`)});`;
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
}

function loadMonaco(): Promise<any> {
  const w = window as any;
  if (w.monaco) return Promise.resolve(w.monaco);
  return new Promise((resolve, reject) => {
    const start = (): void => {
      const amdRequire = w.require;
      if (typeof amdRequire !== 'function') {
        reject(new Error('The Monaco loader ran without defining its AMD require.'));
        return;
      }
      amdRequire.config({ paths: { vs: MONACO_VS } });
      w.MonacoEnvironment = {
        getWorkerUrl: (_moduleId: string, label: string) => monacoWorkerUrl(label),
      };
      amdRequire(['vs/editor/editor.main'], () => resolve(w.monaco), reject);
    };
    const existing = document.querySelector('script[data-monaco-loader]');
    if (existing) {
      if (w.require) start();
      else existing.addEventListener('load', start, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = `${MONACO_VS}/loader.js`;
    script.async = true;
    script.dataset.monacoLoader = 'true';
    script.addEventListener('load', start, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error(`The Monaco loader did not load from ${MONACO_VS}/loader.js`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

// ── The site's dark mode ───────────────────────────────────────────────────────────────────
// Base.astro puts the reader's choice on `documentElement.dataset.theme` and leaves it unset
// while the choice is the system's. Monaco keeps a theme of its own, so it is told which one
// on load, on the toggle, and when the system setting moves under an unset choice.
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function siteIsDark(): boolean {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === 'dark' : darkQuery.matches;
}

function followSiteTheme(monaco: any, repaint: () => void): void {
  const apply = () => {
    monaco.editor.setTheme(siteIsDark() ? 'typeshade-dark' : 'typeshade-light');
    repaint();
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, {
    attributeFilter: ['data-theme'],
  });
  darkQuery.addEventListener('change', apply);
}

function completionKind(monaco: any, kind: TypeshadeCompletionItem['kind']): number {
  const kinds = monaco.languages.CompletionItemKind;
  const byKind: Record<TypeshadeCompletionItem['kind'], number> = {
    keyword: kinds.Keyword,
    type: kinds.TypeParameter,
    function: kinds.Function,
    attribute: kinds.Keyword,
    builtin: kinds.Constant,
    variable: kinds.Variable,
    field: kinds.Field,
    struct: kinds.Struct,
    resource: kinds.Variable,
    snippet: kinds.Snippet,
  };
  return byKind[kind] ?? kinds.Text;
}

function symbolKind(monaco: any, kind: TypeshadeDocumentSymbol['kind']): number {
  const kinds = monaco.languages.SymbolKind;
  const byKind: Record<TypeshadeDocumentSymbol['kind'], number> = {
    function: kinds.Function,
    struct: kinds.Struct,
    field: kinds.Field,
    resource: kinds.Variable,
    constant: kinds.Constant,
    variable: kinds.Variable,
    parameter: kinds.Variable,
    entry: kinds.Function,
  };
  return byKind[kind] ?? kinds.Variable;
}

function markerSeverity(monaco: any, severity: TypeshadeDiagnostic['severity']): number {
  const levels = monaco.MarkerSeverity;
  return severity === 'error'
    ? levels.Error
    : severity === 'warning'
      ? levels.Warning
      : severity === 'information'
        ? levels.Info
        : levels.Hint;
}

/** The service's semantic tokens, coloured. Monaco matches a semantic token against a theme
 *  rule by its type followed by its modifiers, `type.gpu` for a GPU type, so a decorator, a
 *  GPU type, an entry point and a bound resource each read as what the compiler says they
 *  are. The values are Monaco's own light and dark TypeScript palette, so nothing here is a
 *  colour the editor does not already use. */
function defineTypeshadeThemes(monaco: any): void {
  const rules = (dark: boolean) => [
    { token: 'decorator', foreground: dark ? 'c586c0' : 'af00db' },
    { token: 'type', foreground: dark ? '4ec9b0' : '267f99' },
    { token: 'type.gpu', foreground: dark ? '4ec9b0' : '267f99', fontStyle: 'bold' },
    { token: 'struct', foreground: dark ? '4ec9b0' : '267f99' },
    { token: 'builtin', foreground: dark ? 'dcdcaa' : '795e26' },
    { token: 'resource', foreground: dark ? '9cdcfe' : '0070c1', fontStyle: 'italic' },
    { token: 'function', foreground: dark ? 'dcdcaa' : '795e26' },
    { token: 'function.entry', foreground: dark ? 'dcdcaa' : '795e26', fontStyle: 'bold' },
    { token: 'parameter', foreground: dark ? '9cdcfe' : '001080' },
    { token: 'variable', foreground: dark ? '9cdcfe' : '001080' },
    { token: 'property', foreground: dark ? '9cdcfe' : '001080' },
  ];
  monaco.editor.defineTheme('typeshade-light', {
    base: 'vs',
    inherit: true,
    rules: rules(false),
    colors: {},
  });
  monaco.editor.defineTheme('typeshade-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: rules(true),
    colors: {},
  });
}

// ── The source in the URL ──────────────────────────────────────────────────────────────────
// A link can carry the whole file in its fragment (`code=`), so the page opens it with no
// service to hand the source back. The encoding is src/scripts/source-link.ts, which a live
// example's link to the Playground writes too. Share stores that fragment with the Worker and
// copies a short link (/s/<id>, worker/index.ts), which opens the page at `#share=<id>`: the
// page fetches the fragment by its id, so the address stays short whatever the file's size.
// Where there is no Worker, Share copies the long link.

const hashParams = (): URLSearchParams =>
  new URLSearchParams(window.location.hash.replace(/^#/, ''));

/** The fragment: what to open, and the options to open it under. Only a setting that differs
 *  from the default is written, so a link to an untouched Playground stays short. */
function writeHash(key: string, value: string, choice?: EmitChoice, more: string[] = []): void {
  const parts = [`${key}=${value}`, ...more];
  if (choice) {
    if (choice.level !== 'O2') parts.push(`opt=${choice.level}`);
    if (choice.parens !== 'full') parts.push(`parens=${choice.parens}`);
    if (choice.minify) parts.push('minify=1');
    if (choice.numbers !== true)
      parts.push(`numbers=${choice.numbers === 'f32' ? 'f32' : 'false'}`);
    if (choice.obfuscate) parts.push('obfuscate=1');
    if (choice.fp64Flavor !== 'float') parts.push(`fp64=${choice.fp64Flavor}`);
    if (choice.floatPrecision !== 'highp') parts.push(`precision=${choice.floatPrecision}`);
    if (choice.backend !== 'auto') parts.push(`backend=${choice.backend}`);
  }
  const url = new URL(window.location.href);
  url.hash = parts.join('&');
  window.history.replaceState(null, '', url);
}

// ── The emit options ───────────────────────────────────────────────────────────────────────

/** The options both backends share. `minify` and `obfuscate` are plugins, so they ride in
 *  `plugins`. `obfuscate()` is the compiler's own preset and expands to four plugins, the
 *  last of them a `minify({ numbers: 'f32' })`; the reader's own minify follows it, because
 *  the text-stage hooks run in array order and the reader's number mode is the one they
 *  chose. Running minify twice changes nothing the first run did not already do. */
const sharedEmitOptions = (choice: EmitChoice): EmitOptions => {
  const plugins = [
    ...(choice.obfuscate ? obfuscate() : []),
    ...(choice.minify ? [minify({ numbers: choice.numbers })] : []),
  ];
  return {
    parens: choice.parens,
    fp64Flavor: choice.fp64Flavor,
    ...(plugins.length > 0 ? { plugins } : {}),
  };
};

/** WGSL at the chosen level. `emitModuleAt` takes a level and no other options, and
 *  `emitModule` takes the options at O2, so O0 and O1 reach the compiler with the level
 *  alone. The note under the options bar says so where a reader can see it. */
const programManifest = (module: ModuleDecl, choice: EmitChoice, console = false) =>
  packModule(module, {
    console,
    emit:
      choice.level === 'O2'
        ? { ...sharedEmitOptions(choice), level: choice.level }
        : { level: choice.level },
  });
const emitWgsl = (module: Parameters<typeof emitModule>[0], choice: EmitChoice): string =>
  programManifest(module, choice).wgsl;

/** Both GLSL stages. The GLSL backend fixes its own optimizer at a fixpoint, so it takes the
 *  options and no level. */
const emitGlsl = (
  module: Parameters<typeof emitGlslStages>[0],
  choice: EmitChoice,
  overrideValues?: Readonly<Record<string, number>>,
): { vertex: string; fragment: string } | { failed: string } => {
  // An override the reader moved is pinned as a hard `#define`; one left at its default keeps
  // the `#ifndef` guard the emit writes, so an untouched module emits the bytes it always did.
  const options: GlslEmitOptions = {
    ...sharedEmitOptions(choice),
    floatPrecision: choice.floatPrecision,
    ...(overrideValues ? { overrideValues } : {}),
  };
  try {
    return emitGlslStages(module, options);
  } catch (error) {
    // A module the GLSL backend cannot express at all, a uniform scalar among them. The
    // reason is kept, since WebGL2 has to say why it has nothing to run.
    return { failed: error instanceof Error ? error.message : String(error) };
  }
};

/** The name of a file no example is behind: the Blank tile's, and a link's whose code is no
 *  example's and that names no file. */
const MAIN_FILE = 'main.shade.ts';
/** The name the file of an example opens under: the example's own file in the compiler's
 *  examples directory, whose stem is the id the picker and the link use. */
const exampleFileName = (id: string | undefined): string => (id ? `${id}.shade.ts` : MAIN_FILE);
/** The uri of the editor's model for the file the canvas runs. The worker knows that file by
 *  `documentUri`, which follows its name; the model keeps this one, so a tab beside it can take
 *  any name the main file once had. */
const MAIN_MODEL_URI = 'inmemory://playground/main';

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
  const sizeLabel = root.querySelector('[data-size]');
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
  const gpuNote = root.querySelector('[data-gpu-note]');
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

  /** Every browser caps how large a canvas may be, and they disagree: desktops allow tens of
   *  megapixels, while an iPhone stops around 4096 by 4096. Past the cap the element still
   *  reports the width and height that were set and then draws nothing, so asking it its size
   *  proves nothing. This writes one pixel into the far corner and reads it back, which is the
   *  only answer the browser cannot be wrong about. It runs on the canvas the page already
   *  has, and never on a second one, since a spare 8K canvas is another 236 MB. */
  const holdsItsPixels = (
    node: HTMLCanvasElement,
    surface: CanvasRenderingContext2D | null,
  ): boolean => {
    if (!surface) return false;
    const x = node.width - 1;
    const y = node.height - 1;
    if (x < 0 || y < 0) return false;
    try {
      surface.fillStyle = '#ffffff';
      surface.fillRect(x, y, 1, 1);
      const held = surface.getImageData(x, y, 1, 1).data[3] === 255;
      surface.clearRect(x, y, 1, 1);
      return held;
    } catch {
      return false;
    }
  };
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
  let painted = 0;
  // What the compiler last emitted, by target, which tab is showing, and which of the three
  // texts the text panel holds. The panel keeps its text while another tab is up.
  let emitted: Partial<Record<Target, string>> = {};
  let view: View = 'result';
  let target: Target = 'wgsl';
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
      syncDrawButton();
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
      if (drawable && engineIsCpu()) window.setTimeout(openPool, 0);
    }

    const entryGroup = el('div', 'group');
    entryGroup.append(el('p', 'group-title', copy.entryPoints));
    if (entries.length === 0) {
      entryGroup.append(el('p', 'empty', copy.noEntryPoints));
    }
    for (const entry of entries) {
      const box = el('div', 'entry');
      const head = el('div', 'entry-head');
      head.append(el('span', 'stage', `@${entry.stage}`));
      head.append(el('span', 'entry-name', entry.name));
      box.append(head);
      for (const field of entry.io?.inputs ?? []) {
        const { text, attr } = fieldLabel(field);
        box.append(ioRow(copy.inputs, text, attr));
      }
      for (const field of entry.io?.outputs ?? []) {
        const { text, attr } = fieldLabel(field);
        box.append(ioRow(copy.outputs, text, attr));
      }
      // The oracle used to run every entry at the zero of its type, which is how a triangle
      // was only ever seen at its first corner and a shader dividing by a zero input returned
      // NaN for every component. The zeros are the starting values of a form now.
      const inputs = entry.io?.inputs ?? [];
      if (inputs.length > 0) {
        const row = el('div', 'io-row arg-row');
        row.append(el('span', 'io-label', copy.args));
        const fields = el('span', 'io-value');
        inputs.forEach((field, index) => {
          const zero = zeroFor(field.type);
          const name = field.name ?? `arg${index}`;
          const key = `${entry.name}/${name}`;
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'arg-input';
          input.dataset.arg = key;
          input.setAttribute('aria-label', `${entry.name} ${name}`);
          input.value = typedArgs.get(key) ?? (zero.ok ? argText(zero.value) : '');
          // A type the form cannot start off, a matrix or a texture among them, is left for
          // the reader to fill in instead of guessed at.
          input.placeholder = field.type ?? '';
          input.addEventListener('input', () => typedArgs.set(key, input.value));
          const label = el('span', 'arg-name', `${name}:`);
          fields.append(label, input);
        });
        row.append(fields);
        box.append(row);
      }

      const returns = ioRow(copy.returns, copy.cpuIdle, '', 'io-value empty');
      returns.dataset.returns = entry.name;
      box.append(returns);
      entryGroup.append(box);
    }
    reflectionPane.append(entryGroup);

    // Resources, and the features the module asks the device for, each only when it has any.
    const resources = reflection
      ? [
          ...reflection.bindGroups.flatMap((group) =>
            (group.entries ?? []).map((entry) => ({
              label: `@group(${group.group ?? 0})`,
              text: `${entry.name}: ${entry.resourceKind}`,
            })),
          ),
          ...reflection.overrides.map((o) => ({ label: 'override', text: String(o.name ?? o) })),
        ]
      : [];
    const resourceGroup = el('div', 'group');
    resourceGroup.append(el('p', 'group-title', copy.resources));
    if (resources.length === 0) resourceGroup.append(el('p', 'empty', copy.noResources));
    else {
      for (const r of resources) {
        const row = ioRow(r.label, r.text);
        // A binding is supplied in the panel under the canvas, so its row here goes there.
        const name = r.text.split(':')[0]!.trim();
        if (r.label !== 'override' && name !== '_fp64') {
          const go = document.createElement('button');
          go.type = 'button';
          go.className = 'to-binding';
          go.textContent = copy.bindings.title;
          go.addEventListener('click', () => {
            selectView('result');
            const target = root.querySelector(
              `[data-bindings] [data-binding-name="${CSS.escape(name)}"]`,
            );
            if (target instanceof HTMLElement) {
              target.scrollIntoView({ block: 'nearest' });
              target.focus({ preventScroll: true });
            }
          });
          row.append(go);
        }
        resourceGroup.append(row);
      }
    }
    reflectionPane.append(resourceGroup);

    const features: readonly string[] = reflection?.requiredFeatures ?? [];
    if (features.length > 0) {
      const featureGroup = el('div', 'group');
      featureGroup.append(el('p', 'group-title', copy.requiredFeatures));
      for (const f of features) featureGroup.append(ioRow('', String(f)));
      reflectionPane.append(featureGroup);
    }
  };

  /** Runs every entry point on the CPU oracle and writes what each returned. */
  const evaluateOnCpu = async (): Promise<void> => {
    const current = compiled;
    try {
      await bindings.prepareCpuResources();
    } catch (error) {
      if (reflectionPane instanceof HTMLElement)
        for (const node of reflectionPane.querySelectorAll<HTMLElement>('.io-value'))
          node.textContent = error instanceof Error ? error.message : String(error);
      return;
    }
    if (current !== compiled || !compiled || !(reflectionPane instanceof HTMLElement)) return;
    for (const entry of entries) {
      const slot = reflectionPane.querySelector(
        `[data-returns="${CSS.escape(entry.name)}"] .io-value`,
      );
      const target =
        slot instanceof HTMLElement
          ? slot
          : reflectionPane.querySelector(`[data-returns="${CSS.escape(entry.name)}"]`)
              ?.lastElementChild;
      if (!(target instanceof HTMLElement)) continue;
      const inputs = entry.io?.inputs ?? [];
      const args: unknown[] = [];
      let invalid = false;
      for (const [index, field] of inputs.entries()) {
        const name = field.name ?? `arg${index}`;
        const typed = reflectionPane.querySelector(
          `[data-arg="${CSS.escape(`${entry.name}/${name}`)}"]`,
        );
        const zero = zeroFor(field.type);
        const text = typed instanceof HTMLInputElement ? typed.value : '';
        try {
          args.push(parseArg(text, zero.ok ? zero.value : 0));
        } catch {
          invalid = true;
          break;
        }
      }
      if (invalid) {
        target.textContent = copy.argsInvalid;
        target.className = 'io-value failed';
        continue;
      }
      try {
        // The IR is compiled to the oracle here the way the raster worker compiles it, and the
        // entry is called directly; the old `compiled.eval` did the same work per call.
        const oracle = compileModule(compiled.module, { gpuStubs: true });
        for (const [name, value] of Object.entries(
          bindings.cpuBindings(frozen ?? 0, 1, 1, pointer),
        ))
          oracle.setBinding(name, value as never);
        const run = (oracle.fns as CpuFunctions)[entry.name];
        if (!run) throw new Error(entry.name);
        const value = run(
          ...(entryArguments(entry, compiled.module.structs, (i) => args[i]) as never[]),
        );
        const shownArgs = inputs
          .map((f, i) => `${f.name ?? `arg${i}`} = ${formatValue(args[i])}`)
          .join(', ');
        target.textContent = shownArgs
          ? `${formatValue(value)}   (${shownArgs})`
          : formatValue(value);
        target.className = 'io-value';
      } catch (error) {
        // `compileModule` takes `gpuStubs` and `precision` and no resource values, so an entry
        // reading a uniform or a storage binding has nothing to read and the oracle stops at
        // the name. The reader gets that sentence instead of the compiler's.
        const message = error instanceof Error ? error.message : '';
        const binds = (reflection?.bindGroups ?? []).some(
          (group) => (group.entries ?? []).length > 0,
        );
        target.textContent =
          binds && /unknown (?:const|var|binding)/.test(message)
            ? copy.cpuNoResources
            : message || copy.cpuFailed;
        target.className = 'io-value failed';
      }
    }
  };

  /** Puts the selected target in the output pane, plain first and coloured once Monaco has
   *  tokenised it. The plain text lands synchronously, so the pane reads correctly to a screen
   *  reader and to anything measuring it even when the colouring is slow or unavailable. */
  // ── The canvas, drawn by a pool of workers ──────────────────────────────────────────────
  // The pipeline, walked with the CPU oracle standing in for both stages: the vertex entry
  // runs for indices 0, 1 and 2, its clip positions become a triangle in pixels, and every
  // pixel that triangle covers runs the fragment entry once, with `@builtin(position)` set to
  // that pixel's centre and every `@location` varying interpolated across the three vertices.
  // No varying is a stand-in: the values are the ones the vertex entry returned.
  //
  // The canvas is cut into bands and the bands go through a queue, so the work is neither one
  // blocking pass nor a fixed slice per worker: a worker that finishes its band takes the next
  // one waiting, which is what keeps them busy when a triangle covers the middle of the canvas
  // and none of the top. Each band is painted the moment it arrives, so the picture fills in.
  // How big a tile is, which is the whole trade. A unit has to be worth the message that
  // carries it: measured at 768 by 768 on four cores, drawing takes 380 ms on this thread
  // alone, and through the pool it is 779 ms at 32 pixels a tile, 333 at 64, 169 at 128 and
  // 116 at 256. Small tiles lose to their own round trips; large ones leave too few to
  // balance and too few to watch. This keeps the count near six by six whatever the canvas
  // is, so the ratio of drawing to messaging holds as the canvas grows.
  //
  // The ceiling is what makes the big grids usable. Six by six of 3840 is a tile of 640 and
  // of 7680 a tile of 1280, and a tile that large is seconds of drawing: the progress note
  // jumps in sixths, and whichever worker draws the last one holds the other seven waiting.
  // Holding tiles at 256 turns 8K into 900 of them, which balances to the end and costs about
  // 54 ms of messaging across a draw that takes tens of seconds. Below 1536 the ceiling never
  // binds, so every size measured above keeps the tile it was measured with.
  const tileSize = (side: number): number =>
    Math.min(256, Math.max(64, Math.round(side / 6 / 16) * 16));
  /** How many tiles the single-threaded fallback draws between handing the page back. */
  const YIELD_EVERY = 8;
  /** How many tiles each worker is kept holding. With one, a worker draws its tile and then
   *  waits out a whole round trip before the next arrives, and at 1.7 ms of drawing against a
   *  round trip of the same order that is half its time spent idle. Handing it a few keeps a
   *  backlog in its own queue, so the return of one tile overlaps the drawing of the next. */
  const FEED = 3;

  /** The outline on a tile that is being drawn, taken from the page's own accent so it
   *  follows the theme the reader chose. */
  const outlineColour = (): string =>
    getComputedStyle(root).getPropertyValue('--color-accent').trim() || '#3178c6';
  /** One worker per core the browser admits to, and a ceiling so a 64-thread machine does not
   *  open 64 workers to draw a triangle. */
  const poolSize = (): number => Math.max(1, Math.min(navigator.hardwareConcurrency || 2, 8));

  let job = 0;
  let pool: Worker[] = [];
  /** Opening a worker costs more than drawing this canvas once does, so the pool is opened as
   *  soon as a module that can be drawn compiles and the button press finds it already there.
   *  On this machine starting four workers is 130 ms; drawing 192 by 192 once is 34. */
  const openPool = (): boolean => {
    if (typeof Worker !== 'function') return false;
    try {
      while (pool.length < poolSize()) {
        pool.push(
          new Worker(new URL('./playground-raster-worker.ts', import.meta.url), { type: 'module' }),
        );
      }
      return true;
    } catch {
      for (const worker of pool) worker.terminate();
      pool = [];
      return false;
    }
  };
  /** Set while a draw is in flight, so a second press does not race the first. */
  /** The job whose draw owns the button and the note, or 0 when none is running. A number and
   *  not a flag, so a draw that was superseded by the next one can tell that its finish is no
   *  longer its to perform. */
  let drawing = 0;
  /** The button reads Stop while a draw runs and Draw otherwise, and is only ever disabled
   *  when there is nothing a press could do. */
  const syncDrawButton = (): void => {
    if (!(drawCpu instanceof HTMLButtonElement)) return;
    if (drawing !== 0) {
      drawCpu.textContent = copy.stop;
      drawCpu.disabled = false;
      return;
    }
    drawCpu.textContent = copy.draw;
    drawCpu.disabled = !moduleDrawable || !canvasFits;
  };
  /** Ends the running draw where it is. Moving `job` retires it at every worker and at the
   *  page; clearing `drawing` first makes its own finish a no-op, so the button and the note
   *  are this press's to set and not the retired draw's. */
  /** Close every worker, so the next draw opens a pool that holds nothing from before. */
  const retirePool = (): void => {
    for (const worker of pool) worker.terminate();
    pool = [];
  };

  const stopDrawing = (): void => {
    if (drawing !== 0) retirePool();
    job += 1;
    drawing = 0;
    syncDrawButton();
    if (canvasNote instanceof HTMLElement) canvasNote.textContent = copy.canvasIdle;
  };

  /** Hand the page back to the browser without the nested-setTimeout clamp, which is about
   *  4ms a turn and would cost more than the drawing between two of them. A MessageChannel
   *  posts a real task with no floor. */
  const yieldToPage = (): Promise<void> =>
    new Promise((resume) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        resume();
      };
      channel.port2.postMessage(undefined);
    });

  const fillNumbers = (text: string, values: Record<string, string | number>): string =>
    text.replace(/\{(\w+)\}/g, (whole, key: string) =>
      key in values ? String(values[key]) : whole,
    );

  /** What the rasteriser says when it is done. */
  const drawnNote = (px: number, ms: number, workers: number): string =>
    fillNumbers(copy.canvasDrawn, { px, ms: Math.round(ms), workers });

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

  /** The pointer over the canvas, 0 to 1 from the bottom left, which is the space the
   *  prelude's `uv` is in. A canvas nobody has touched holds the middle. */
  let pointer: readonly [number, number] = [0.5, 0.5];
  /** The shader clock when it is held: under `prefers-reduced-motion`, at the three seconds a
   *  live example holds it at, or wherever a check pins it to compare two engines on one
   *  frame. Null lets it run. The rasteriser draws at this time, or at 0 when it runs. */
  let frozen: number | null =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 3
      : null;
  /** The transport's clock over the runtime's. The runtime counts seconds from its mount and
   *  the canvas draws at that count less `clockOffset`, which Restart moves to the count it
   *  has reached; Pause holds the drawn time at `clockHeld` until Play takes it up again from
   *  there. A check's `frozen` wins over both. */
  let clockOffset = 0;
  let clockHeld: number | null = null;
  let runtimeSeconds = 0;
  const shaderClock = (seconds: number): number => {
    runtimeSeconds = seconds;
    return frozen ?? clockHeld ?? Math.max(0, seconds - clockOffset);
  };
  let mounted: MountedShader | undefined;
  /** The engine and the program the mount is running, so a compile that changes neither does
   *  not rebuild the pipeline. */
  let mountedEngine: Engine | undefined;
  let mountedSignature = '';
  /** Moves on every texture, sampler or buffer change, so the signature above moves too. */
  let resourceGeneration = 0;
  /** Each run of the Result tab takes the next number; a run that finds a later one has
   *  started lets that one finish instead of painting over it. */
  let resultRun = 0;

  const bindingsHost = root.querySelector('[data-bindings]');
  let valuesTimer = 0;
  const bindings = new BindingsModel(copy.bindings, {
    values: () => {
      // The frame the GPU is drawing packs the new value on its next frame. The oracle's
      // rasteriser and a dispatch take their values when they start, so those run again,
      // once the control has settled.
      mounted?.redraw();
      if (engineIsCpu() || isComputeModule()) {
        window.clearTimeout(valuesTimer);
        valuesTimer = window.setTimeout(() => void runResult(), 250);
      }
    },
    resources: () => {
      resourceGeneration += 1;
      void runResult();
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
    syncRecordFrame();
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
    if (picked === 'auto' && !emitted.glslVertex && /no WebGPU/.test(failure))
      return `${copy.gpuNone} ${noGlslNote()}`;
    if (picked === 'webgpu' && /no WebGPU/.test(failure)) return copy.gpuNoWebgpu;
    if (picked === 'webgl2' && /no WebGL2/.test(failure)) return copy.gpuNoWebgl2;
    if (picked === 'auto' && (/no WebGL2/.test(failure) || failure === '')) return copy.gpuNone;
    return fillNumbers(copy.gpuFailed, {
      backend: backendName(picked === 'auto' ? 'none' : picked),
      reason: failure,
    });
  };

  /** What the GPU canvas should run, or why it cannot run this module. */
  const gpuPayload = (picked: Engine): { readonly data: ShaderData } | { readonly why: string } => {
    if (!compiled || !reflection || !emitted.wgsl) return { why: copy.gpuIdle };
    const missing = bindings.missing();
    if (missing.length > 0)
      return { why: fillNumbers(copy.gpuNeedsBindings, { names: missing.join(', ') }) };
    // The runtime draws three vertices and binds no vertex buffer, so a vertex entry that
    // reads an attribute from one has nothing to read. Saying which attribute beats letting
    // the pipeline fail and reporting that the browser has no GPU API.
    const vertex = entries.find((entry) => entry.stage === 'vertex');
    const fragment = entries.find((entry) => entry.stage === 'fragment');
    if (!vertex || !fragment) return { why: copy.gpuNeedsStages };
    const vertexBuffer = bindings.vertexBuffer();
    if (vertexBuffer === null) {
      const attributes = (vertex.io?.inputs ?? [])
        .filter((field) => typeof field.location === 'number')
        .map((field, index) => field.name ?? `arg${index}`);
      return { why: fillNumbers(copy.gpuNeedsAttributes, { fields: attributes.join(', ') }) };
    }
    if (picked === 'webgl2' && !emitted.glslVertex) return { why: noGlslNote() };
    // The passes drawn before the program (compiler change 0026), each from its own module.
    const passes: ShaderPassData[] = [];
    const passNames = passGraph.map((p) => p.name);
    for (const p of passGraph) {
      const made = passPayload(p.name, passNames, picked);
      if ('why' in made) return made;
      passes.push(made.data);
    }
    const block = bindings.renderBlock();
    const guards = reflection.bindGroups
      .flatMap((group) => group.entries)
      .filter((entry) => entry.name === '_fp64')
      .map((entry) => ({ name: entry.name, binding: entry.binding }));
    return {
      data: {
        id: 'playground',
        title: fileName,
        wgsl: emitted.wgsl,
        manifest: programManifest(compiled.module, currentChoice()),
        // A module the GLSL backend cannot express still runs on WebGPU; the WebGL2 half is
        // what it loses, and the note says which backend drew when neither is left.
        vertex: emitted.glslVertex ?? '',
        fragment: emitted.glslFragment ?? '',
        layout: {
          size: block?.size ?? 0,
          block: block?.block ?? '',
          group: block?.group ?? 0,
          binding: block?.binding ?? 0,
          instance: block?.instance ?? '',
          fields: block?.fields ?? [],
          vertexEntry: vertex.name,
          fragmentEntry: fragment.name,
          textures: guards,
          resources: bindings.resources(false),
          moreBlocks: bindings.moreBlocks(),
          ...(vertexBuffer ? { vertexBuffer } : {}),
        },
        controls: {},
        constants: bindings.constants(),
        features: gpuFeatures(),
        ...(passes.length > 0 ? { passes } : {}),
      },
    };
  };

  /** One pass's program as the runtime draws it: emitted under the options bar, laid out from
   *  its own reflection. A texture named like a pass reads that pass's output and a sampler
   *  reads it linearly, clamped to the edge; any other texture has nothing to show, so it is
   *  refused by name. Its uniform fields are the page's reserved ones or the main file's of the
   *  same name, and zero otherwise. */
  /** The type of each uniform field the passes declare, by name, for the reserved values a
   *  pass reads (a `frame` is the page's only as a `u32`). */
  const passFieldTypes = new Map<string, string>();
  const passPayload = (
    name: string,
    passNames: readonly string[],
    picked: Engine,
  ): { readonly data: ShaderPassData } | { readonly why: string } => {
    const failed = { why: w.passFailed.replace('{name}', name) };
    const module = passModules.get(name);
    if (!module) return failed;
    const choice = currentChoice();
    const r = reflect(module, { fp64Flavor: choice.fp64Flavor });
    const vertex = r.entries.find((e) => e.stage === 'vertex');
    const fragment = r.entries.find((e) => e.stage === 'fragment');
    if (!vertex || !fragment) return failed;
    const glsl = emitGlsl(module, choice);
    if (picked === 'webgl2' && 'failed' in glsl) return failed;
    const resources: ResourceSpec[] = [];
    const guards: { name: string; binding: number }[] = [];
    for (const group of r.bindGroups) {
      for (const e of group.entries) {
        if (e.name === '_fp64') guards.push({ name: e.name, binding: e.binding });
        else if (e.resourceKind === 'texture') {
          if (!passNames.includes(e.name))
            return {
              why: w.passTexture.replace('{name}', name).replace('{texture}', e.name),
            };
          resources.push({
            kind: 'texture',
            name: e.name,
            group: group.group,
            binding: e.binding,
            dim: '2d',
            sample: 'float',
            width: 0,
            height: 0,
            layers: 1,
            texels: [],
            pass: e.name,
          });
        } else if (e.resourceKind === 'sampler')
          resources.push({
            kind: 'sampler',
            name: e.name,
            group: group.group,
            binding: e.binding,
            comparison: false,
            filter: 'linear',
            address: 'clamp-to-edge',
          });
      }
    }
    const block = r.uniforms[0];
    for (const f of block?.fields ?? []) passFieldTypes.set(f.name, f.type);
    const uniform = r.bindGroups
      .flatMap((g) => g.entries.map((e) => ({ ...e, group: g.group })))
      .find((e) => e.resourceKind === 'uniform-buffer');
    return {
      data: {
        id: `playground.${name}`,
        name,
        title: name,
        wgsl: emitWgsl(module, choice),
        manifest: programManifest(module, choice),
        vertex: 'failed' in glsl ? '' : glsl.vertex,
        fragment: 'failed' in glsl ? '' : glsl.fragment,
        layout: {
          size: block?.size ?? 0,
          block: block?.name ?? '',
          group: uniform?.group ?? 0,
          binding: uniform?.binding ?? 0,
          instance: uniform?.name ?? '',
          fields: (block?.fields ?? []).map((f) => ({
            name: f.name,
            type: f.type,
            offset: f.offset,
          })),
          vertexEntry: vertex.name,
          fragmentEntry: fragment.name,
          textures: guards,
          resources,
        },
        controls: {},
        features: [...hostFeaturesFor(wgslBackend, r.requiredFeatures)],
      },
    };
  };

  /** The optional WebGPU features the module asks for, as WebGPU names them. */
  const gpuFeatures = (): string[] => [
    ...hostFeaturesFor(wgslBackend, reflection?.requiredFeatures ?? []),
  ];

  /** Why WebGL2 has nothing to run: the capabilities GLSL ES 3.00 lacks when the emit names
   *  them, and the plain sentence otherwise. */
  const noGlslNote = (): string => {
    const missing = /missing capabilities?:\s*([\w, ]+)/.exec(glslFailure)?.[1]?.trim();
    return missing ? fillNumbers(copy.gpuNoGlslFeatures, { features: missing }) : copy.gpuNoGlsl;
  };

  /** Put the program the last compile emitted on the canvas, on the backend the reader
   *  picked. The same backend swaps, so the pass that is drawing stays up until the new one
   *  has drawn; a new backend, or a program the swap cannot take, mounts on a new canvas. */
  const runOnGpu = async (): Promise<void> => {
    const mine = ++resultRun;
    const picked = engine();
    const payload = gpuPayload(picked);
    if ('why' in payload) {
      stopMount();
      const node = gpuCanvasNow();
      if (node) node.dataset.backend = 'none';
      sayGpu(payload.why);
      waitFor(null);
      return;
    }
    const signature = `${payload.data.wgsl}\n${payload.data.vertex}\n${payload.data.fragment}\n${resourceGeneration}\n${JSON.stringify(payload.data.constants)}\n${(payload.data.passes ?? []).map((p) => `${p.name}\n${p.wgsl}\n${p.fragment}`).join('\n')}`;
    if (mounted && mountedEngine === picked && mounted.backend !== 'none') {
      if (signature === mountedSignature) return;
      const swapped = await mounted.swap(payload.data);
      if (mine !== resultRun) return;
      if (swapped) {
        mountedSignature = signature;
        retireStill();
        sayGpu(backendNote(picked));
        syncRecordFrame();
        return;
      }
    }
    stopMount();
    const target = freshCanvas();
    if (!target) return;
    // A new mount counts from zero, so the offset Restart left against the old one goes. A
    // held clock stays where the reader held it.
    clockOffset = 0;
    runtimeSeconds = 0;
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
        : emitted.glslVertex
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
          bindings.renderValue(
            name,
            shaderClock(seconds),
            width,
            height,
            pointer,
            instance,
            clock,
          ) ??
          (isReserved(name, passFieldTypes.get(name))
            ? reservedValue(name, shaderClock(seconds), width, height, pointer, clock)
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
    next.holdFrames(clockHeld !== null);
    if (next.backend !== 'none') retireStill();
    // No backend drew: the note under the frame says why.
    else waitFor(null);
    sayGpu(
      next.passFormat === 'rgba8' ? `${backendNote(picked)} ${w.passesRgba8}` : backendNote(picked),
    );
    syncRecordFrame();
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

  /** The Console tab. A report is sentences that say where its lines came from, and lists of
   *  the lines. Only the first CONSOLE_SHOWN of a list are drawn; a sentence says the rest. */
  const CONSOLE_SHOWN = 500;
  const shown = (v: unknown): string =>
    typeof v === 'string' ? v : typeof v === 'number' ? String(v) : JSON.stringify(v);
  const sentence = (text: string): HTMLParagraphElement => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  };
  /** The file and line a console call was written on, as `file:line` (surface §66): the file
   *  by the name its tab has, and the line as the editor numbers it, past the prelude the file
   *  the canvas runs is compiled with. Empty for an event with no span. */
  const sourceLine = (e: ConsoleEvent): string => {
    if (!e.span) return '';
    const path = pathOfUri(e.span.file);
    const file = path === '' ? fileName : (path ?? e.span.file.split(/[\\/]/).pop());
    const line = path === '' ? outOfDocument(e.span.line) : e.span.line;
    return `${file}:${line + 1}`;
  };
  /** One list of console lines, marked with `block` for a check to find. Each line leads with
   *  where it ran, the way a host's printed console line does (surface §66): the tier that ran
   *  it, the file and line of the call, then its invocation, unless `at` says otherwise. */
  const consoleList = (
    events: readonly ConsoleEvent[],
    block: string,
    tier: ConsoleTier,
    at: (e: ConsoleEvent, index: number) => string = (e) =>
      e.invocation ? `[${e.invocation.join(', ')}]` : '',
  ): HTMLElement[] => {
    if (events.length === 0) return [];
    const list = document.createElement('ol');
    list.dataset.consoleBlock = block;
    const span = (className: string, text: string): HTMLSpanElement => {
      const node = document.createElement('span');
      node.className = className;
      node.textContent = text;
      return node;
    };
    events.slice(0, CONSOLE_SHOWN).forEach((e, index) => {
      const li = document.createElement('li');
      if (e.method === 'warn' || e.method === 'error') li.className = e.method;
      const label = span('tier', tier);
      label.dataset.tier = tier;
      const body =
        e.method === 'table' && e.args.length === 1 && typeof e.args[0] === 'object'
          ? consoleTable(e.args[0], shown)
          : document.createElement('span');
      if (!(body instanceof HTMLTableElement)) body.textContent = e.args.map(shown).join(' ');
      li.append(label, span('source', sourceLine(e)), span('at', at(e, index)), body);
      list.append(li);
    });
    return events.length > CONSOLE_SHOWN
      ? [list, sentence(fillNumbers(copy.consoleMore, { more: events.length - CONSOLE_SHOWN }))]
      : [list];
  };
  /** How many reports the tab has shown, so a check can wait for the next one. */
  let consolePaints = 0;
  /** Replace the tab's contents with one report. `report` says what it is and where it ran,
   *  and a capture adds how many lines came back and how many were dropped, for a check that
   *  waits on one. */
  const paintConsole = (
    report: { readonly report: string; readonly lines?: number; readonly dropped?: number },
    ...parts: (HTMLElement | HTMLElement[])[]
  ): void => {
    if (!(consolePane instanceof HTMLElement)) return;
    consolePane.replaceChildren(...parts.flat());
    consolePane.dataset.report = report.report;
    consolePane.dataset.paint = String(++consolePaints);
    if (report.lines === undefined) delete consolePane.dataset.lines;
    else consolePane.dataset.lines = String(report.lines);
    if (report.dropped === undefined) delete consolePane.dataset.dropped;
    else consolePane.dataset.dropped = String(report.dropped);
  };

  /** The lines the last compute run delivered, in the order the CPU runs the invocations
   *  (surface §66). */
  const showConsole = (
    events: readonly ConsoleEvent[],
    dropped: number,
    backend: 'webgpu' | 'cpu',
  ): void => {
    const name = backendName(backend);
    if (events.length === 0 && dropped === 0) {
      paintConsole(
        { report: `compute/${backend}`, lines: 0, dropped: 0 },
        sentence(fillNumbers(copy.consoleNone, { backend: name })),
      );
      return;
    }
    paintConsole(
      { report: `compute/${backend}`, lines: events.length, dropped },
      sentence(fillNumbers(copy.consoleLines, { lines: events.length, backend: name })),
      consoleList(events, 'lines', backend === 'webgpu' ? 'GPU' : 'CPU'),
      dropped > 0 ? [sentence(fillNumbers(copy.consoleDropped, { dropped }))] : [],
    );
  };

  /** A `console.table` value as the browser's own console lays one out (changes/0019): a row per
   *  array element or struct field, and a column per field or component when the rows are
   *  structs or vectors, else one value column. A matrix arrives as its columns already. */
  const consoleTable = (value: unknown, shown: (v: unknown) => string): HTMLTableElement => {
    const rows: [string, unknown][] = Array.isArray(value)
      ? value.map((v, i) => [String(i), v])
      : Object.entries(value as Record<string, unknown>);
    const columns: string[] = [];
    for (const [, v] of rows) {
      if (v === null || typeof v !== 'object') continue;
      for (const k of Object.keys(v)) if (!columns.includes(k)) columns.push(k);
    }
    const table = document.createElement('table');
    const cell = (tag: 'th' | 'td', text: string): HTMLTableCellElement => {
      const c = document.createElement(tag);
      c.textContent = text;
      return c;
    };
    const head = document.createElement('tr');
    head.append(cell('th', copy.consoleIndex));
    for (const k of columns.length > 0 ? columns : [copy.consoleValue]) head.append(cell('th', k));
    table.append(head);
    for (const [key, v] of rows) {
      const tr = document.createElement('tr');
      tr.append(cell('th', key));
      if (columns.length === 0) tr.append(cell('td', shown(v)));
      else {
        const o = (v !== null && typeof v === 'object' ? v : {}) as Record<string, unknown>;
        for (const k of columns) tr.append(cell('td', k in o ? shown(o[k]) : ''));
      }
      table.append(tr);
    }
    return table;
  };

  // ── The console of a module that draws ─────────────────────────────────────────────────
  // Its fragment entry runs once per pixel, far too many lines to list as they come, so its
  // console calls are read one clicked pixel or one recorded frame at a time (surface §66). On
  // WebGPU the frame on the canvas is drawn once more from the module the compiler rewrote to
  // record its calls, over that one pixel or over all of them. WebGL2 records nothing, so a
  // click there, like a click on the CPU canvas, runs the pixel's fragment entry on the CPU
  // oracle with the inputs the CPU draw gives it. A vertex entry records nothing on any GPU:
  // its calls are the CPU oracle's, for the three vertices it places.

  const pixelNote = root.querySelector('[data-pixel-note]');
  const recordFrameButton = root.querySelector('[data-record-frame]');
  /** The idle line the page was served with, which carries its code span. */
  const consoleIdle =
    consolePane instanceof HTMLElement
      ? [...consolePane.childNodes].map((n) => n.cloneNode(true))
      : [];
  /** Room for one pixel's console entries on WebGPU, in words, and for a whole frame's. A
   *  fragment that logs in a loop fills far more than one entry. */
  const PIXEL_WORDS = 1 << 14;
  const FRAME_WORDS = 1 << 18;
  /** Each report takes the next number, so a capture a later click overtook paints nothing. */
  let consoleRun = 0;

  /** Whether the module draws and calls `console.*`, which is when a pixel or a frame logs. */
  const logsWhileDrawing = (): boolean =>
    compiled !== undefined && !isComputeModule() && hasConsoleCall(compiled.module);

  /** The canvas WebGPU is drawing this module on, which is the one a capture can record. */
  const recordingCanvas = (): HTMLCanvasElement | undefined =>
    !engineIsCpu() && mounted?.backend === 'webgpu' ? gpuCanvasNow() : undefined;

  /** The record button is there while WebGPU draws a module that logs. */
  const syncRecordFrame = (): void => {
    if (recordFrameButton instanceof HTMLButtonElement)
      recordFrameButton.hidden = !logsWhileDrawing() || !recordingCanvas();
  };

  const showPixelHint = (): void => {
    if (pixelNote instanceof HTMLElement) pixelNote.hidden = true;
    const logs = logsWhileDrawing();
    if (logs) paintConsole({ report: 'hint' }, sentence(copy.consolePixelHint));
    else if (consolePane instanceof HTMLElement) {
      consolePane.replaceChildren(...consoleIdle.map((n) => n.cloneNode(true)));
      consolePane.dataset.report = 'idle';
    }
    if (frame instanceof HTMLElement) frame.dataset.logs = logs ? '1' : '0';
    syncRecordFrame();
  };

  /** The last compile's module rewritten to record its console calls: the WGSL that writes the
   *  console buffer, the slots the fp64 guards moved to, and the calls it leaves out with the
   *  reason for each. Made on the first capture after a compile, for the options it is made
   *  under. */
  let recording:
    | {
        readonly module: ModuleDecl;
        readonly choice: string;
        readonly result: ConsoleBufferResult;
        readonly wgsl: string;
        readonly guards: readonly { readonly name: string; readonly binding: number }[];
      }
    | undefined;
  const recordingNow = (): NonNullable<typeof recording> | undefined => {
    if (!compiled) return undefined;
    const choice = currentChoice();
    const key = JSON.stringify(choice);
    if (recording?.module === compiled.module && recording.choice === key) return recording;
    const result = consoleBuffer(compiled.module);
    // The buffer takes the slot the guard had, so the guard is found in the rewritten module.
    const guards = result.log
      ? reflect(result.module, { fp64Flavor: choice.fp64Flavor })
          .bindGroups.flatMap((group) => group.entries)
          .filter((entry) => entry.name === '_fp64')
          .map((entry) => ({ name: entry.name, binding: entry.binding }))
      : [];
    recording = {
      module: compiled.module,
      choice: key,
      result,
      wgsl: result.log ? emitWgsl(result.module, choice) : '',
      guards,
    };
    return recording;
  };

  /** Draw the frame on the canvas once more on WebGPU with its console calls recorded, over
   *  `scissor` or over all of it, and decode what came back. A module whose every call is left
   *  out records nothing, and the frame is not drawn. */
  const captureOnGpu = async (
    shader: MountedShader,
    target: HTMLCanvasElement,
    words: number,
    scissor?: readonly [number, number, number, number],
  ): Promise<{
    readonly result: ConsoleBufferResult;
    readonly events: readonly ConsoleEvent[];
    readonly dropped: number;
    readonly width: number;
    readonly height: number;
  }> => {
    const made = recordingNow();
    if (!made) throw new Error('no module');
    const log = made.result.log;
    if (!log)
      return {
        result: made.result,
        events: [],
        dropped: 0,
        width: target.width,
        height: target.height,
      };
    const captured = await shader.captureConsole({
      manifest: programManifest(compiled!.module, currentChoice(), true),
      words,
      ...(scissor ? { scissor } : {}),
    });
    if (!captured) throw new Error('the canvas has stopped drawing');
    return {
      result: made.result,
      events: captured.events,
      dropped: captured.dropped,
      width: captured.width,
      height: captured.height,
    };
  };

  /** What the CPU oracle logs for the grid of a `width` by `height` canvas, with the inputs the
   *  CPU draw gives it: the vertex entry's lines for the three vertices it places, each with
   *  its index, and at `pixel` the fragment entry's lines, marked with that pixel. `why` is the
   *  sentence to show when the fragment entry did not run there, and `outside` says the reason
   *  was that the triangle does not cover the pixel. */
  interface CpuConsole {
    readonly vertex: readonly { readonly index: number; readonly event: ConsoleEvent }[];
    readonly pixel: readonly ConsoleEvent[];
    readonly why?: string;
    readonly outside?: boolean;
  }
  const consoleOnCpu = (
    width: number,
    height: number,
    pixel?: { readonly x: number; readonly y: number },
  ): CpuConsole => {
    const vertex: { index: number; event: ConsoleEvent }[] = [];
    const lines: ConsoleEvent[] = [];
    const base = rasterPlan();
    if (!compiled || !base) return { vertex, pixel: lines, why: copy.consolePixelNoRaster };
    const plan: RasterPlan = {
      ...base,
      width,
      height,
      bindings: cpuFrameBindings(frozen ?? 0, width, height),
    };
    // Which entry is running, so each line is filed under the entry that made it.
    let running: 'vertex' | 'fragment' | undefined;
    let index = -1;
    try {
      const oracle = compileModule(compiled.module, {
        gpuStubs: true,
        precision: RASTER_PRECISION,
        consoleSink: (e) => {
          if (running === 'vertex') vertex.push({ index, event: e });
          else if (running === 'fragment' && pixel)
            lines.push({ ...e, invocation: [pixel.x, pixel.y, 0] });
        },
      });
      for (const [name, value] of Object.entries(plan.bindings ?? {}))
        oracle.setBinding(name, value as never);
      const cpu = oracle.fns as CpuFunctions;
      const place = cpu[plan.vertex.name];
      // `cornersOf` runs the vertex entry for the indices 0, 1 and 2, in that order.
      running = 'vertex';
      const corners = place
        ? cornersOf(
            {
              [plan.vertex.name]: (...args: never[]) => {
                index += 1;
                return place(...args);
              },
            },
            plan,
          )
        : undefined;
      running = undefined;
      if (!pixel) return { vertex, pixel: lines };
      const args = corners && pixelArguments(plan, corners, pixel.x, pixel.y);
      if (!args)
        return {
          vertex,
          pixel: lines,
          why: fillNumbers(copy.consolePixelOutside, pixel),
          outside: true,
        };
      running = 'fragment';
      cpu[plan.fragment.name]!(...(args as never[]));
      running = undefined;
    } catch (error) {
      running = undefined;
      return {
        vertex,
        pixel: lines,
        ...(pixel
          ? {
              why: fillNumbers(copy.consolePixelFailed, {
                ...pixel,
                reason: error instanceof Error ? error.message : String(error),
              }),
            }
          : {}),
      };
    }
    return { vertex, pixel: lines };
  };

  const spanKey = (span: ConsoleEvent['span']): string =>
    span ? `${span.start}:${span.length}` : '';

  /** The vertex entry's lines, under the sentence that says why they come from the CPU. */
  const vertexPart = (cpu: CpuConsole, onGpu: boolean): HTMLElement[] =>
    cpu.vertex.length === 0
      ? []
      : [
          sentence(onGpu ? copy.consoleVertexGpu : copy.consoleVertex),
          ...consoleList(
            cpu.vertex.map((v) => v.event),
            'vertex',
            'CPU',
            (_, i) => fillNumbers(copy.consoleVertexAt, { index: cpu.vertex[i]!.index }),
          ),
        ];

  /** The calls the recorded module leaves out, a sentence each with the compiler's reason,
   *  and at a pixel what each logged there on the CPU oracle. A call the vertex entry logged
   *  is the vertex part's, and at a pixel a call the pixel did not reach is left unsaid. */
  const notRecordedPart = (
    result: ConsoleBufferResult,
    cpu: CpuConsole,
    atPixel: boolean,
  ): HTMLElement[] => {
    const byVertex = new Set(cpu.vertex.map((v) => spanKey(v.event.span)));
    const said = new Set<string>();
    const out: HTMLElement[] = [];
    for (const call of result.notRecorded) {
      const key = spanKey(call.span);
      if (!call.span || said.has(key) || byVertex.has(key)) continue;
      said.add(key);
      const line = outOfDocument(call.span.line) + 1;
      if (!atPixel) {
        out.push(
          sentence(fillNumbers(copy.consoleNotRecordedFrame, { line, reason: call.reason })),
        );
        continue;
      }
      const lines = cpu.pixel.filter((e) => spanKey(e.span) === key);
      if (lines.length === 0) continue;
      out.push(
        sentence(fillNumbers(copy.consoleNotRecorded, { line, reason: call.reason })),
        ...consoleList(lines, 'not-recorded', 'CPU'),
      );
    }
    return out;
  };

  const logPixel = async (target: HTMLCanvasElement, event: MouseEvent): Promise<void> => {
    if (!logsWhileDrawing()) return;
    const current = compiled;
    try {
      await bindings.prepareCpuResources();
    } catch {
      return;
    }
    if (current !== compiled) return;
    const box = target.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const width = target.width;
    const height = target.height;
    const x = Math.min(
      width - 1,
      Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * width)),
    );
    const y = Math.min(
      height - 1,
      Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * height)),
    );
    const at = { x, y };
    const mine = ++consoleRun;
    const cpu = consoleOnCpu(width, height, at);
    const note = (text: string): void => {
      if (pixelNote instanceof HTMLElement) {
        pixelNote.textContent = text;
        pixelNote.hidden = false;
      }
    };
    const onCpu = (heading: string): void => {
      paintConsole(
        { report: 'pixel/cpu', lines: cpu.pixel.length, dropped: 0 },
        sentence(
          cpu.why ?? (cpu.pixel.length === 0 ? fillNumbers(copy.consolePixelNone, at) : heading),
        ),
        consoleList(cpu.pixel, 'pixel', 'CPU'),
        vertexPart(cpu, false),
      );
      note(fillNumbers(copy.pixelNote, { x, y, lines: cpu.pixel.length }));
    };
    const shader = mounted;
    if (!shader || target !== recordingCanvas()) {
      // The CPU canvas, or a GPU canvas that cannot record: the CPU oracle's lines.
      const onGl = target === gpuCanvasNow() && shader?.backend === 'webgl2';
      onCpu(fillNumbers(onGl ? copy.consolePixelGl : copy.consolePixel, at));
      return;
    }
    note(fillNumbers(copy.pixelNoteRecording, at));
    void captureOnGpu(shader, target, PIXEL_WORDS, [x, y, 1, 1]).then(
      (got) => {
        if (mine !== consoleRun) return;
        const none = got.events.length === 0 && got.dropped === 0;
        paintConsole(
          { report: 'pixel/webgpu', lines: got.events.length, dropped: got.dropped },
          sentence(
            none && cpu.outside
              ? (cpu.why ?? '')
              : fillNumbers(none ? copy.consolePixelGpuNone : copy.consolePixelGpu, at),
          ),
          consoleList(got.events, 'pixel', 'GPU'),
          got.dropped > 0
            ? [sentence(fillNumbers(copy.consoleDropped, { dropped: got.dropped }))]
            : [],
          notRecordedPart(got.result, cpu, true),
          vertexPart(cpu, true),
        );
        note(fillNumbers(copy.pixelNote, { x, y, lines: got.events.length }));
      },
      (error: unknown) => {
        if (mine !== consoleRun) return;
        onCpu(
          fillNumbers(copy.consolePixelGpuFailed, {
            ...at,
            reason: error instanceof Error ? error.message : String(error),
          }),
        );
      },
    );
  };
  if (frame instanceof HTMLElement) {
    // On the frame and not the canvas, because the GPU canvas is replaced on every mount.
    frame.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLCanvasElement) logPixel(target, event);
    });
  }

  /** Every pixel of the frame on the canvas, recorded on WebGPU. */
  const recordFrame = async (): Promise<void> => {
    const shader = mounted;
    const target = recordingCanvas();
    if (!logsWhileDrawing() || !shader || !target) return;
    const mine = ++consoleRun;
    if (pixelNote instanceof HTMLElement) pixelNote.hidden = true;
    paintConsole({ report: 'frame/pending' }, sentence(copy.consoleRecording));
    try {
      await bindings.prepareCpuResources();
    } catch (error) {
      paintConsole(
        { report: 'frame/failed' },
        sentence(error instanceof Error ? error.message : String(error)),
      );
      return;
    }
    if (mine !== consoleRun) return;
    const cpu = consoleOnCpu(target.width, target.height);
    try {
      const got = await captureOnGpu(shader, target, FRAME_WORDS);
      if (mine !== consoleRun) return;
      paintConsole(
        { report: 'frame/webgpu', lines: got.events.length, dropped: got.dropped },
        sentence(
          fillNumbers(copy.consoleFrameGpu, {
            width: got.width,
            height: got.height,
            lines: got.events.length,
          }),
        ),
        consoleList(got.events, 'frame', 'GPU'),
        got.dropped > 0
          ? [sentence(fillNumbers(copy.consoleFrameDropped, { dropped: got.dropped }))]
          : [],
        notRecordedPart(got.result, cpu, false),
        vertexPart(cpu, true),
      );
    } catch (error) {
      if (mine !== consoleRun) return;
      paintConsole(
        { report: 'frame/failed' },
        sentence(
          fillNumbers(copy.consoleFrameFailed, {
            reason: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  };
  if (recordFrameButton instanceof HTMLButtonElement)
    recordFrameButton.addEventListener('click', () => void recordFrame());

  /** Room for this many words of console entries in the WebGPU run's buffer. */
  const CONSOLE_WORDS = 1 << 16;

  const runCompute = async (): Promise<void> => {
    const mine = ++resultRun;
    stopMount();
    const picked = engine();
    const entry = entries.find((candidate) => candidate.stage === 'compute');
    if (!compiled || !entry || !emitted.wgsl) return;
    if (picked === 'webgl2') {
      const node = freshCanvas();
      if (node) node.dataset.backend = 'none';
      sayGpu(copy.computeNeedsWebgpu);
      return;
    }
    const missing = bindings.missing();
    if (missing.length > 0) {
      sayGpu(fillNumbers(copy.gpuNeedsBindings, { names: missing.join(', ') }));
      return;
    }
    const size = (entry as { workgroupSize?: number }).workgroupSize ?? 64;
    const invocations = bindings.invocations();
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
    const logs = hasConsoleCall(compiled.module);
    try {
      if (picked === 'cpu') {
        await bindings.prepareCpuResources();
        if (mine !== resultRun) return;
        const started = performance.now();
        // With the GPU-only reads allowed: a texture read and a storage texture's load and
        // store answer from the panel's data (src/scripts/playground-oracle-textures.ts).
        const cpu = compileModule(compiled.module, {
          gpuStubs: true,
          precision: RASTER_PRECISION,
          consoleSink: (e) => lines.push(e),
        });
        const values = bindings.cpuBindings(0, 0, 0, pointer);
        for (const [name, value] of Object.entries(values)) cpu.setBinding(name, value as never);
        cpu.dispatch(entry.name, groups);
        ms = performance.now() - started;
        for (const name of bindings.writableStorage()) {
          const read = bindings.readCpu(name, values[name]);
          results.set(name, read.rows.join('\n'));
          series ??= read.series;
        }
        // The storage textures, in the same bytes and rows a readback from the GPU gives.
        for (const spec of bindings.resources(true)) {
          if (spec.kind !== 'storage-texture') continue;
          const held = values[spec.name] as { bytes?: Uint8Array } | undefined;
          if (!held?.bytes) continue;
          const texture = { width: spec.width, height: spec.height, format: spec.format };
          if (spec.name === bindings.firstStorageTexture())
            image = { ...texture, bytes: held.bytes };
          results.set(spec.name, `${spec.width} × ${spec.height} ${spec.format}`);
        }
        ranOn = 'cpu';
      } else {
        const result = await runComputeOnGpu({
          manifest: programManifest(compiled.module, currentChoice(), logs),
          entry: entry.name,
          workgroups: [groups, 1, 1],
          resources: bindings.resources(true),
          constants: bindings.constants(),
          features: gpuFeatures(),
          console: logs,
          consoleBytes: 8 + 4 * CONSOLE_WORDS,
        });
        ms = result.ms;
        lines.push(...result.consoleEvents);
        dropped = result.dropped;
        for (const name of bindings.writableStorage()) {
          const bytes = result.buffers.get(name);
          if (!bytes) continue;
          const read = bindings.readBack(name, bytes);
          results.set(name, read.rows.join('\n'));
          series ??= read.series;
        }
        const shown = bindings.firstStorageTexture();
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
    bindings.showResults(results);
    if (logs) showConsole(lines, dropped, ranOn);
    if (bindingsHost instanceof HTMLElement) bindings.render(bindingsHost);
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
    const at = analysedVersion;
    // A picked example is painted twice, once for the pick and once when the debounced edit
    // lands, and the first run gives way to the second. Only the latest may mark the frame.
    const mine = ++lastResult;
    if (frame instanceof HTMLElement) delete frame.dataset.settled;
    if (!isComputeModule()) showPixelHint();
    if (isComputeModule()) {
      await runCompute();
      // A dispatch plots what it wrote, or says why it could not, under the frame.
      waitFor(null);
    } else if (engineIsCpu()) {
      resultRun += 1;
      stopMount();
      if (moduleDrawable && canvasFits) await drawOnCpu();
    } else await runOnGpu();
    if (frame instanceof HTMLElement && at === analysedVersion && mine === lastResult)
      frame.dataset.settled = String(at);
  };

  // The handle scripts/check-playground.mjs reads. It pins the clock, and asks the rasteriser
  // for single pixels at the GPU canvas's own size, so the two engines are compared on the
  // same pixels of the same frame.
  const handle: PlaygroundHandle = {
    freeze: (seconds) => {
      frozen = seconds;
      // A held frame is held at the size it has, so the pixels a check reads off it and the
      // grid it asks the rasteriser for are one grid.
      mounted?.holdScale(seconds !== null);
      mounted?.redraw();
    },
    idle: (on) => mounted?.idle(on),
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
        bindings: cpuFrameBindings(frozen ?? 0, width, height),
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
    const node = gpuCanvasNow();
    if (node) node.hidden = cpu;
    if (cpu) retireStill();
    // A different backend is a different context, so the mount starts over on a new canvas.
    stopMount();
    void runResult();
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

  /** The bindings the CPU oracle draws a frame with: the panel's, and for a program drawn in
   *  several passes (compiler change 0026) each pass's output, drawn here in order at the
   *  frame's size. The CPU draws frame 0, so a pass read as the frame before reads zeroes, as
   *  the first frame on the GPU does. A pass's colour is kept as floats, so a value outside 0
   *  to 1 reaches the next program as it does on the GPU. */
  const cpuFrameBindings = (
    seconds: number,
    width: number,
    height: number,
  ): Record<string, unknown> => {
    const plot = isPlotLayout(bindings.renderBlock() ?? { fields: [] });
    const target = engineIsCpu() ? canvas : gpuCanvasNow();
    const box = target instanceof HTMLCanvasElement ? target.getBoundingClientRect() : undefined;
    const cssWidth = plot && box && box.width > 0 ? box.width : width;
    const cssHeight = plot && box && box.height > 0 ? box.height : height;
    const out = bindings.cpuBindings(
      seconds,
      cssWidth,
      cssHeight,
      pointer,
      width / Math.max(cssWidth, 1),
    );
    if (passGraph.length === 0) return out;
    const names = passGraph.map((p) => p.name);
    const drawn = new Map<string, Float32Array<ArrayBuffer>>();
    const specFor = (
      name: string,
      group: number,
      binding: number,
      floats: Float32Array<ArrayBuffer>,
    ) => ({
      kind: 'texture' as const,
      name,
      group,
      binding,
      dim: '2d' as const,
      sample: 'float' as const,
      width,
      height,
      layers: 1,
      texels: [],
      pass: name,
      floats: [floats],
    });
    const zeroes = new Float32Array(width * height * 4);
    passGraph.forEach((p, i) => {
      const module = passModules.get(p.name);
      if (!module) return;
      const r = reflect(module, { fp64Flavor: currentChoice().fp64Flavor });
      const vertex = r.entries.find((e) => e.stage === 'vertex');
      const fragment = r.entries.find((e) => e.stage === 'fragment');
      if (!vertex || !fragment) return;
      const values: Record<string, unknown> = {};
      for (const group of r.bindGroups) {
        for (const e of group.entries) {
          if (e.resourceKind === 'texture' && names.includes(e.name)) {
            // An earlier pass is read as this frame's, itself or a later one as frame 0's before.
            const j = names.indexOf(e.name);
            values[e.name] = specFor(
              e.name,
              group.group,
              e.binding,
              (j < i && drawn.get(e.name)) || zeroes,
            );
          } else if (e.resourceKind === 'sampler') {
            values[e.name] = {
              kind: 'sampler',
              name: e.name,
              group: group.group,
              binding: e.binding,
              comparison: false,
              filter: 'linear',
              address: 'clamp-to-edge',
            };
          } else if (e.resourceKind === 'uniform-buffer') {
            const block = r.uniforms[0];
            const fields: Record<string, unknown> = {};
            for (const f of block?.fields ?? []) {
              const v = isReserved(f.name, f.type)
                ? reservedValue(f.name, seconds, width, height, pointer)
                : null;
              fields[f.name] = v === null ? 0 : v.length === 1 ? v[0] : [...v];
            }
            values[e.name] = fields;
          }
        }
      }
      const plan: RasterPlan = {
        width,
        height,
        vertex,
        fragment,
        structs: module.structs.map((struct) => ({
          name: struct.name,
          fields: struct.fields.map((f) => ({ name: f.name })),
        })),
        bindings: values,
      };
      const oracle = compileModule(module, { gpuStubs: true, precision: RASTER_PRECISION });
      for (const [name, value] of Object.entries(values)) oracle.setBinding(name, value as never);
      const cpu = oracle.fns as CpuFunctions;
      const corners = cornersOf(cpu, plan);
      const floats = new Float32Array(width * height * 4);
      if (corners) drawTile(cpu, plan, corners, 0, 0, width, height, undefined, floats);
      drawn.set(p.name, floats);
    });
    // The program reads every pass as this frame's.
    for (const [key, value] of Object.entries(out)) {
      const spec = value as { kind?: string; pass?: string; group?: number; binding?: number };
      if (spec?.kind === 'texture' && spec.pass && drawn.has(spec.pass))
        out[key] = specFor(spec.pass, spec.group ?? 0, spec.binding ?? 0, drawn.get(spec.pass)!);
    }
    return out;
  };

  const rasterPlan = (): RasterPlan | undefined => {
    if (!compiled || !(canvas instanceof HTMLCanvasElement)) return undefined;
    const vertex = entries.find((entry) => entry.stage === 'vertex');
    const fragment = entries.find((entry) => entry.stage === 'fragment');
    if (!vertex || !fragment) return undefined;
    const attributes = bindings.cpuAttributes();
    if (
      !(vertex.io?.inputs ?? []).some((field) => field.builtin === 'vertex_index') &&
      Object.keys(attributes).length === 0
    )
      return undefined;
    if (!vertex.io?.outputs?.some((field) => field.builtin === 'position')) return undefined;
    return {
      width: canvas.width,
      height: canvas.height,
      vertex,
      fragment,
      structs: compiled.module.structs.map((struct) => ({
        name: struct.name,
        fields: struct.fields.map((f) => ({ name: f.name })),
      })),
      bindings: cpuFrameBindings(frozen ?? 0, canvas.width, canvas.height),
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      ...(hasConsoleCall(compiled.module) ? { console: true } : {}),
    };
  };

  /** The fallback for a browser with no worker, and for one whose worker fails to start: the
   *  same bands, on this thread, yielding between them so the page still repaints. */
  /** Every tile of the canvas, in order, as [x0, y0]. */
  const tilesOf = (plan: RasterPlan): [number, number][] => {
    const out: [number, number][] = [];
    const tile = tileSize(plan.width);
    for (let y0 = 0; y0 < plan.height; y0 += tile) {
      for (let x0 = 0; x0 < plan.width; x0 += tile) out.push([x0, y0]);
    }
    return out;
  };

  /** The console lines one CPU draw collects from its tiles, and the report it paints once
   *  the draw is done. A report the reader moved past, by a click or a newer draw, paints
   *  nothing. */
  interface FrameConsole {
    add(lines: readonly ConsoleEvent[], logged: number): void;
    show(): void;
  }
  const frameConsoleFor = (plan: RasterPlan, mine: number): FrameConsole => {
    const kept: ConsoleEvent[] = [];
    let logged = 0;
    const run = plan.console ? ++consoleRun : consoleRun;
    return {
      add(lines, calls) {
        logged += calls;
        for (const line of lines) {
          if (kept.length >= FRAME_LINES) break;
          kept.push(line);
        }
      },
      show() {
        if (!plan.console || run !== consoleRun || mine !== job) return;
        // Tiles land in the order the workers finish them. The lines are listed row by row,
        // and one pixel's in the order it made them.
        const rows = [...kept].sort(
          (a, b) =>
            (a.invocation?.[1] ?? 0) - (b.invocation?.[1] ?? 0) ||
            (a.invocation?.[0] ?? 0) - (b.invocation?.[0] ?? 0),
        );
        const cpu = consoleOnCpu(plan.width, plan.height);
        paintConsole(
          { report: 'frame/cpu', lines: rows.length, dropped: logged - rows.length },
          sentence(
            fillNumbers(copy.consoleFrameCpu, {
              width: plan.width,
              height: plan.height,
              lines: rows.length,
            }),
          ),
          consoleList(rows, 'frame', 'CPU'),
          logged > rows.length
            ? [sentence(fillNumbers(copy.consoleFrameKept, { more: logged - rows.length }))]
            : [],
          vertexPart(cpu, false),
        );
      },
    };
  };

  const drawHere = async (
    plan: RasterPlan,
    context: CanvasRenderingContext2D,
    mine: number,
    frameConsole: FrameConsole,
  ): Promise<void> => {
    let pixel: [number, number, number] | undefined;
    const oracle = compileModule(compiled!.module, {
      gpuStubs: true,
      precision: RASTER_PRECISION,
      ...(plan.console
        ? {
            consoleSink: (e: ConsoleEvent) => {
              if (pixel) frameConsole.add([{ ...e, invocation: pixel }], 1);
            },
          }
        : {}),
    });
    for (const [name, value] of Object.entries(plan.bindings ?? {}))
      oracle.setBinding(name, value as never);
    const cpu = oracle.fns as CpuFunctions;
    const corners = cornersOf(cpu, plan);
    if (!corners) throw new Error('no triangle');
    const started = performance.now();
    let covered = 0;
    const tile = tileSize(plan.width);
    const tiles = tilesOf(plan);
    for (const [index, [x0, y0]] of tiles.entries()) {
      if (mine !== job) return;
      const x1 = Math.min(plan.width, x0 + tile);
      const y1 = Math.min(plan.height, y0 + tile);
      const drawn = drawTile(
        cpu,
        plan,
        corners,
        x0,
        y0,
        x1,
        y1,
        plan.console
          ? (px, py) => {
              pixel = [px, py, 0];
            }
          : undefined,
      );
      pixel = undefined;
      covered += drawn.covered;
      context.putImageData(new ImageData(drawn.pixels, x1 - x0, y1 - y0), x0, y0);
      // Handing the page back costs a task turn, so it happens every few tiles and not every
      // one: at one a tile the yielding cost more than the drawing between two of them.
      if (index % YIELD_EVERY === YIELD_EVERY - 1 || index === tiles.length - 1) {
        if (canvasNote instanceof HTMLElement) {
          canvasNote.textContent = fillNumbers(copy.canvasProgress, {
            done: index + 1,
            total: tiles.length,
            running: 1,
            waiting: tiles.length - index - 1,
          });
        }
        await yieldToPage();
      }
    }
    if (canvasNote instanceof HTMLElement) {
      canvasNote.textContent = drawnNote(covered, performance.now() - started, 1);
      canvasNote.dataset.px = String(covered);
      canvasNote.dataset.workers = '1';
    }
    frameConsole.show();
  };

  let cpuPreparation = 0;
  const drawOnCpu = async (): Promise<void> => {
    const preparation = ++cpuPreparation;
    const selectedEngine = engine();
    const current = compiled;
    try {
      await bindings.prepareCpuResources();
    } catch (error) {
      if (canvasNote instanceof HTMLElement)
        canvasNote.textContent = error instanceof Error ? error.message : String(error);
      return;
    }
    if (preparation !== cpuPreparation || current !== compiled || selectedEngine !== engine())
      return;
    if (!(canvas instanceof HTMLCanvasElement) || !(canvasNote instanceof HTMLElement)) return;
    const context = canvas.getContext('2d');
    const plan = rasterPlan();
    if (!compiled || !context || !plan) {
      canvasNote.textContent = copy.canvasNeedsVertex;
      return;
    }
    // Raising the job retires whatever draw is still running; taking `drawing` makes that
    // draw's finish a no-op, so the button stays Stop across the handover. A worker still
    // holding the old draw's tiles would take the new one's only after finishing them, which
    // at a slow shader is seconds of a canvas reading 0 tiles; a new pool costs 130 ms.
    if (drawing !== 0) retirePool();
    job += 1;
    const mine = job;
    drawing = mine;
    syncDrawButton();
    context.clearRect(0, 0, plan.width, plan.height);
    delete canvasNote.dataset.px;
    delete canvasNote.dataset.workers;

    const finish = (): void => {
      if (drawing !== mine) return;
      drawing = 0;
      syncDrawButton();
    };
    const frameConsole = frameConsoleFor(plan, mine);

    if (typeof Worker !== 'function') {
      void drawHere(plan, context, mine, frameConsole)
        .catch((error) => {
          canvasNote.textContent = rasterFailure(error instanceof Error ? error.message : '');
        })
        .finally(finish);
      return;
    }

    if (!openPool()) {
      void drawHere(plan, context, mine, frameConsole)
        .catch((error) => {
          canvasNote.textContent = rasterFailure(error instanceof Error ? error.message : '');
        })
        .finally(finish);
      return;
    }

    // The queue every worker pulls from, and the counters the note reads.
    const tile = tileSize(plan.width);
    const queue = tilesOf(plan);
    const total = queue.length;
    let done = 0;
    let running = 0;
    let covered = 0;
    let finished = false;
    const started = performance.now();
    const module = compiled.module;

    // Writing the note is a DOM write, and at one a tile that is six hundred of them in a
    // draw. It is coalesced to one a frame; the numbers it reads are live either way.
    // Every tile arrives in its own task, and a canvas written once a task is flushed once a
    // task. Thirty-six flushes cost more than the drawing; the single-threaded path pays far
    // fewer because it draws several tiles between yields. Arrivals are collected and put on
    // the canvas together, once a frame, which is as often as anyone can see anyway.
    const pending: { image: ImageData; x0: number; y0: number }[] = [];
    let flushQueued = false;
    // Which tiles a worker is holding right now. Outlining them is a canvas write too, so it
    // happens in this same frame and not in the task that handed the tile out.
    const inFlight = new Set<string>();
    /** A draw belongs to the grid it was planned against, and `drawHere` already stops on
     *  `mine !== job` for that reason. The pool has to stop on it too: its tiles carry the old
     *  grid's coordinates, so once the reader changes the resolution, painting what is still
     *  in flight would scatter the old picture over the new canvas. At 8K a draw runs for tens
     *  of seconds, which is long enough for that to be the normal way one ends. */
    let retired = false;
    const retire = (): boolean => {
      if (mine === job) return false;
      if (!retired) {
        retired = true;
        finished = true;
        pending.length = 0;
        inFlight.clear();
        finish();
      }
      return true;
    };
    const flush = (): void => {
      if (retired) return;
      for (const { image, x0, y0 } of pending) context.putImageData(image, x0, y0);
      pending.length = 0;
      context.strokeStyle = outlineColour();
      context.lineWidth = 1;
      for (const key of inFlight) {
        const [x0, y0, x1, y1] = key.split(',').map(Number);
        context.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
      }
    };
    const scheduleFlush = (): void => {
      if (flushQueued) return;
      flushQueued = true;
      window.requestAnimationFrame(() => {
        flushQueued = false;
        flush();
      });
    };

    let noteQueued = false;
    // The last tile schedules a frame and the queue empties in the same turn, so without this
    // the progress line lands after the result and paints over it.
    let complete = false;
    const say = (): void => {
      if (noteQueued || complete) return;
      noteQueued = true;
      window.requestAnimationFrame(() => {
        noteQueued = false;
        if (complete || retired) return;
        canvasNote.textContent = fillNumbers(copy.canvasProgress, {
          done,
          total,
          running,
          waiting: queue.length,
        });
      });
    };

    const settleIfDone = (): void => {
      if (retire()) return;
      if (finished || queue.length > 0 || running > 0) return;
      finished = true;
      flush();
      complete = true;
      canvasNote.textContent = drawnNote(covered, performance.now() - started, pool.length);
      canvasNote.dataset.px = String(covered);
      canvasNote.dataset.workers = String(pool.length);
      finish();
      frameConsole.show();
    };

    const handOut = (worker: Worker): void => {
      if (retire()) return;
      const next = queue.shift();
      if (next === undefined) {
        settleIfDone();
        return;
      }
      const [x0, y0] = next;
      const x1 = Math.min(plan.width, x0 + tile);
      const y1 = Math.min(plan.height, y0 + tile);
      running += 1;
      // The tile a worker has just taken is outlined, so the canvas shows where the work is
      // and not only where it has been. The outline sits inside the tile, so the pixels that
      // come back cover it exactly.
      inFlight.add(`${x0},${y0},${x1},${y1}`);
      scheduleFlush();
      say();
      worker.postMessage({ kind: 'tile', job: mine, x0, y0, x1, y1 } satisfies RasterRequest);
    };

    for (const worker of pool) {
      worker.onmessage = (event: MessageEvent<RasterReply>) => {
        const message = event.data;
        if (message.job !== mine) return;
        if (retire()) return;
        if (message.kind === 'ready') {
          for (let i = 0; i < FEED; i += 1) handOut(worker);
          return;
        }
        if (message.kind === 'failed') {
          canvasNote.textContent = rasterFailure(message.message);
          finish();
          return;
        }
        running -= 1;
        done += 1;
        covered += message.covered;
        if (message.lines) frameConsole.add(message.lines, message.logged ?? 0);
        inFlight.delete(`${message.x0},${message.y0},${message.x1},${message.y1}`);
        pending.push({
          image: new ImageData(message.pixels, message.x1 - message.x0, message.y1 - message.y0),
          x0: message.x0,
          y0: message.y0,
        });
        scheduleFlush();
        say();
        handOut(worker);
      };
      worker.onerror = () => {
        // A worker that cannot start at all leaves the drawing to this thread.
        for (const other of pool) other.terminate();
        pool = [];
        void drawHere(plan, context, mine, frameConsoleFor(plan, mine))
          .catch((error) => {
            canvasNote.textContent = rasterFailure(error instanceof Error ? error.message : '');
          })
          .finally(finish);
      };
      worker.postMessage({ kind: 'prepare', job: mine, module, plan } satisfies RasterRequest);
    }
    say();
  };

  /** The three texts the file at `path` emits: a pass's own, or the program's. */
  const emittedFor = (path: string): Partial<Record<Target, string>> => {
    const pass = passGraph.find((p) => p.path === path);
    const module = pass ? passModules.get(pass.name) : undefined;
    if (!pass || !module) return emitted;
    const choice = currentChoice();
    const glsl = emitGlsl(module, choice);
    return {
      wgsl: emitWgsl(module, choice),
      glslVertex: 'failed' in glsl ? undefined : glsl.vertex,
      glslFragment: 'failed' in glsl ? undefined : glsl.fragment,
    };
  };

  const paintOutput = (): void => {
    const token = ++painted;
    // The three texts are emitted on every compile whichever tab is up; only the one the
    // text panel is showing is written into it, and the panel is repainted on a tab switch.
    if (!isTarget(view)) return;
    // The text tabs follow the file tabs: with a pass's file in the editor they show what that
    // pass emits (compiler change 0026), and with any other file the program's.
    const source = emittedFor(activeFile)[target];
    if (!source) {
      output.textContent = target === 'wgsl' ? copy.noOutput : copy.noGlsl;
      sizeLabel.textContent = '';
      return;
    }
    output.textContent = source;
    sizeLabel.textContent = `${source.length} B`;
    if (!monacoApi) return;
    monacoApi.editor
      .colorize(source, TARGET_LANGUAGE[target], { tabSize: 2 })
      .then((html: string) => {
        // colorize writes every space as a non-breaking space, which a reader copying the
        // output would paste into a shader file as U+00A0 and no compiler accepts. It emits
        // the character itself, and reading innerHTML back spells that as an entity, so both
        // forms are replaced. The pane is a <pre>, so an ordinary space holds the same column.
        if (token === painted) output.innerHTML = html.replace(/&nbsp;|\u00a0/g, ' ');
      })
      .catch(() => {});
  };

  /** The one tab strip over the result column, and the panel and the controls each tab owns. */
  const tabs = [...root.querySelectorAll('[data-target]')].filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
  );
  const resultPanel = root.querySelector('#pg-panel-result');
  const metas = [...root.querySelectorAll('[data-meta]')].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  /** Which of the three control groups in the tab row belongs to a view. */
  const metaFor = (next: View): string =>
    next === 'result' || next === 'reflection' || next === 'console' ? next : 'text';

  /** Shows one tab's panel and moves the selected state onto its tab. Nothing here compiles,
   *  emits or draws: every panel already holds what the last compile put in it, and the
   *  canvas keeps the pixels it was drawn with while it is behind another tab. */
  const selectView = (next: View, focus = false): void => {
    view = next;
    if (isTarget(next)) target = next;
    for (const tab of tabs) {
      const on = tab.dataset.target === next;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      // One roving tabindex, so Tab reaches the strip once and the arrows move inside it.
      tab.tabIndex = on ? 0 : -1;
      if (on) {
        if (isTarget(next)) output.setAttribute('aria-labelledby', tab.id);
        if (focus) tab.focus();
      }
    }
    if (resultPanel instanceof HTMLElement) resultPanel.hidden = next !== 'result';
    output.hidden = !isTarget(next);
    if (reflectionPane instanceof HTMLElement) reflectionPane.hidden = next !== 'reflection';
    if (consolePane instanceof HTMLElement) consolePane.hidden = next !== 'console';
    const wanted = metaFor(next);
    for (const meta of metas) meta.hidden = meta.dataset.meta !== wanted;
    if (isTarget(next)) paintOutput();
  };

  const goTo = (position: TypeshadePosition): void => {
    if (!editor) return;
    if (activeFile !== '') showFile('');
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
      if (row.located && pathOfUri(row.uri) !== undefined)
        button.addEventListener('click', () => {
          showFile(pathOfUri(row.uri)!);
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
    paintOutput();
    paintReflection();
    // The canvas and the return values follow the source. The oracle's calls are
    // microseconds, so the return values are not worth a button press; the buttons re-run
    // with edited arguments and redraw. Only the engine the reader is looking at runs: a
    // rasteriser drawing a canvas nobody is shown is the page's own CPU for nothing.
    // Texture-backed return values wait for an explicit CPU request.
    // A GPU-only startup does not decode atlas pixels.
    if (!bindings.needsCpuResources()) void evaluateOnCpu();
    if (bindingsHost instanceof HTMLElement) bindings.render(bindingsHost);
    syncDropHint();
    // A compute module has no rasteriser half, so the engine's canvases are set for it again.
    const cpu = engineIsCpu() && !isComputeModule();
    for (const node of cpuOnly) node.hidden = !cpu;
    const node = gpuCanvasNow();
    if (node) node.hidden = cpu;
    void runResult();
  };

  /** Hands the worker the document as the editor holds it now. Sent on every change, so the
   *  worker never answers a hover or a completion about text the editor has already left
   *  behind: storing the text costs the service nothing until something is asked. */
  const syncDocument = (): void => {
    if (!editor || !model || !client) return;
    version += 1;
    root.dataset.version = String(version);
    const composed = compose(model.getValue());
    preludeAt = composed.at;
    preludeLines = composed.lines;
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
          passGraph.map(async (p) => {
            const result = await client.request('analysis', uriOf(p.path), asked, {});
            if (!result && asked === version) throw new Error(copy.serviceFailed);
            return [p.name, result?.module as ModuleDecl | undefined] as const;
          }),
        );
        if (asked !== version) return;
        passModules = new Map(passes);
        lastAnalysis = analysis;
        analysedVersion = asked;
        paintAnalysis(analysis);
        paintFileMarkers();
        // host.ts reads the module's host view, so a new program is a new check of it.
        checkHost();
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
      filesMoved() || passGraph.length > 0
        ? [`files=${await encodeSource(JSON.stringify(workspaceFiles()))}`]
        : [];
    if (passGraph.length > 0)
      more.push(`passes=${passGraph.map((p) => `${p.name}:${p.path}`).join(',')}`);
    // The main file's name rides along where it is other than the one the link would open
    // under without it, so a link written before files had names opens as it always did.
    const text = model.getValue();
    const unnamed = exampleFileName(examples.find((candidate) => candidate.source === text)?.id);
    if (fileName !== unnamed) more.push(`name=${encodeURIComponent(fileName)}`);
    // host.ts rides along where it is other than the one the link opens with without it: the
    // example's own, or the starter the page writes. A link written before host.ts opens as
    // it always did.
    if (hostCarried()) more.push(`host=${await encodeSource(hostText())}`);
    // A live example's frame shape and controls, as its link carried them.
    if (linkedAspect) more.push(`aspect=${linkedAspect}`);
    if (linkedControls) more.push(`controls=${linkedControls}`);
    writeHash('code', await encodeSource(text), currentChoice(), more);
  };

  const flash = (button: HTMLButtonElement, word: string, back: string): void => {
    button.textContent = word;
    window.setTimeout(() => {
      button.textContent = back;
    }, 1400);
  };

  /** The link Share copies: the short one the Worker stores (/s/<id>, docs/cloudflare.md), or
   *  the page's own URL, which carries the whole file, where there is no Worker to store it. */
  const shareLink = async (): Promise<string> => {
    await publishSource();
    const { pathname, hash, href } = window.location;
    const link = await shortLink(pathname, hash.replace(/^#/, ''));
    // The address bar follows the short link, so a reload or a copy of it stays short too.
    const id = link && /\/s\/([A-Za-z0-9_-]+)\/?$/.exec(link)?.[1];
    if (id) writeHash('share', id);
    return link ?? href;
  };

  share.addEventListener('click', () => {
    // Safari keeps the click's permission to write the clipboard only for a write started in
    // the handler, so the link goes in as a promise where the browser takes one.
    const link = shareLink();
    const written =
      typeof ClipboardItem === 'function' && ClipboardItem.supports?.('text/plain') !== false
        ? navigator.clipboard
            .write([
              new ClipboardItem({
                'text/plain': link.then((text) => new Blob([text], { type: 'text/plain' })),
              }),
            ])
            .catch(async () => navigator.clipboard.writeText(await link))
        : link.then((text) => navigator.clipboard.writeText(text));
    void written.then(() => flash(share, copy.shared, copy.share)).catch(() => {});
  });

  // Submit: the file goes to the gallery as a share with a title and a still of the canvas, and
  // waits there for the maintainer's approval (worker/index.ts). The dialog stays open to say what happened.
  const submitButton = root.querySelector('[data-submit]');
  const submitDialog = root.querySelector('[data-submit-dialog]');
  const submitForm = root.querySelector('[data-submit-form]');
  const submitStatus = root.querySelector('[data-submit-status]');
  const submitSend = root.querySelector('[data-submit-send]');
  const submitCancel = root.querySelector('[data-submit-cancel]');
  if (
    submitButton instanceof HTMLButtonElement &&
    submitDialog instanceof HTMLDialogElement &&
    submitForm instanceof HTMLFormElement &&
    submitStatus instanceof HTMLElement &&
    submitSend instanceof HTMLButtonElement &&
    submitCancel instanceof HTMLButtonElement
  ) {
    const say = (text: string): void => {
      submitStatus.textContent = text;
      submitStatus.hidden = !text;
    };
    submitButton.addEventListener('click', () => {
      say('');
      submitSend.hidden = false;
      submitSend.disabled = false;
      submitCancel.textContent = copy.submit.cancel;
      submitDialog.showModal();
    });
    submitCancel.addEventListener('click', () => submitDialog.close());
    submitForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const fields = new FormData(submitForm);
      const title = String(fields.get('title') ?? '').trim();
      if (!title) return;
      submitSend.disabled = true;
      say(copy.submit.sending);
      void publishSource()
        .then(async () =>
          submitToGallery({
            path: window.location.pathname,
            fragment: window.location.hash.replace(/^#/, ''),
            title,
            author: String(fields.get('author') ?? '').trim(),
            locale: pageLocale(),
            still: await captureStill().catch(() => undefined),
          }),
        )
        .then((outcome) => {
          say(copy.submit[outcome]);
          const done = outcome === 'sent' || outcome === 'already';
          submitSend.hidden = done;
          submitSend.disabled = done;
          if (done) {
            submitCancel.textContent = copy.submit.close;
            submitForm.reset();
          }
        });
    });
  }

  // The issue dialog (src/scripts/issue-dialog.ts) takes the program this page holds, carried
  // in the fragment the way Share carries it. While the gallery is up, no program is open.
  provideProgram(async () => {
    if (root.dataset.view === 'gallery' || !model) return undefined;
    await publishSource();
    return {
      page: window.location.pathname,
      fragment: window.location.hash.replace(/^#/, ''),
      file: fileName,
    };
  });

  copyOutput.addEventListener('click', () => {
    void navigator.clipboard
      .writeText(emittedFor(activeFile)[target] ?? '')
      .then(() => flash(copyOutput, copy.copied, copy.copy))
      .catch(() => {});
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
    renameMain(exampleFileName(example.id));
    // The files it imports go in first, so the worker holds them when the new text asks.
    setFiles(filesFor(example.source, example), graphFor(example));
    // host.ts goes with the example: its own for a host example, else none until it is needed.
    stopHost();
    setHost(example.host, example.host);
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
    !hostCarried();

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
      if (drawing !== 0) retirePool();
      job += 1;
      // The grid keeps the frame's shape, so a pixel of it is square on the page.
      canvas.width = side;
      canvas.height = gridHeight(side);
      const surface = canvas.getContext('2d');
      surface?.clearRect(0, 0, side, side);
      canvasFits = holdsItsPixels(canvas, surface);
      drawing = 0;
      syncDrawButton();
      if (canvasNote instanceof HTMLElement) {
        canvasNote.textContent = !moduleDrawable
          ? copy.canvasNeedsVertex
          : canvasFits
            ? copy.canvasIdle
            : copy.canvasTooBig;
      }
      if (moduleDrawable && canvasFits) drawOnCpu();
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

  /** The examples the compiler has and this build does not, from the example data the Worker
   *  serves (src/scripts/example-data-client.ts), added to the picker in a group of their own
   *  so a link can name one. Where there is no Worker, the picker keeps the build's list. */
  const addReleaseExamples = async (): Promise<void> => {
    if (!(examplePicker instanceof HTMLSelectElement)) return;
    const index = await fetchIndex();
    const fresh = (index?.examples ?? []).filter(
      (x) => x.corpus === 'shade' && !examples.some((e) => e.id === x.id),
    );
    if (fresh.length === 0) return;
    const records = await Promise.all(fresh.map((x) => fetchExample(x.id)));
    const locale = pageLocale();
    const group = document.createElement('optgroup');
    group.label = copy.releaseGroup;
    for (const record of records) {
      if (!record) continue;
      examples.push({
        id: record.id,
        source: record.source,
        title: record.title[locale],
        description: record.blurb[locale],
      });
      group.append(new Option(record.title[locale], record.id));
    }
    if (group.childElementCount > 0) examplePicker.append(group);
  };

  /** The files a link carries beside the main one, or undefined where it carries none or
   *  what it carries is not a set of files the workspace can hold. */
  const linkedFiles = async (
    packed: string | null,
  ): Promise<Record<string, string> | undefined> => {
    if (!packed) return undefined;
    const text = await decodeSource(packed);
    if (text === undefined) return undefined;
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
      const files: Record<string, string> = {};
      for (const [path, value] of Object.entries(parsed)) {
        if (typeof value !== 'string' || !FILE_PATH.test(path) || path === fileName) continue;
        files[path] = value;
      }
      return files;
    } catch {
      return undefined;
    }
  };

  /** The passes an example draws, as the workspace holds them. */
  const graphFor = (example: PlaygroundExample | undefined): { name: string; path: string }[] =>
    (example?.passes ?? []).map((p) => ({ name: p.name, path: p.file }));

  /** The pass graph a link carries, `name:path` pairs joined by commas, or undefined. */
  const linkedGraph = (packed: string | null): { name: string; path: string }[] | undefined => {
    if (!packed) return undefined;
    const graph = packed
      .split(',')
      .map((pair) => pair.split(':'))
      .filter(
        (pair): pair is [string, string] =>
          pair.length === 2 &&
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(pair[0]!) &&
          FILE_PATH.test(pair[1]!),
      )
      .map(([name, path]) => ({ name, path }));
    return graph.length > 0 ? graph : undefined;
  };

  /** The files an example brings, or, for a file with no example behind it, the library files
   *  it names in an import, so a link written before the workspace had tabs still opens them. */
  const filesFor = (
    source: string,
    example: PlaygroundExample | undefined,
  ): Record<string, string> => {
    const out: Record<string, string> = {};
    const paths =
      example?.imports ?? Object.keys(library).filter((path) => source.includes(`./${path}`));
    for (const path of paths) if (library[path] !== undefined) out[path] = library[path];
    return out;
  };

  /** The controls a live example's link carries (`controls=`): for each field, its range, its
   *  step and the value it stood at. Undefined where the link carries none, or carries
   *  anything but numbers, lists of numbers and the two flags. */
  const linkedControlsOf = async (packed: string | null): Promise<ControlProps | undefined> => {
    if (!packed) return undefined;
    const text = await decodeSource(packed);
    if (text === undefined) return undefined;
    const numbers = (v: unknown): boolean =>
      (typeof v === 'number' && Number.isFinite(v)) ||
      (Array.isArray(v) &&
        v.length <= 16 &&
        v.every((n) => typeof n === 'number' && Number.isFinite(n)));
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
      const out: Record<string, ControlProp> = {};
      for (const [name, prop] of Object.entries(parsed)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || !prop || typeof prop !== 'object') continue;
        const p = prop as Record<string, unknown>;
        const keep: { -readonly [K in keyof ControlProp]?: ControlProp[K] } = {};
        for (const key of ['min', 'max', 'step', 'value'] as const)
          if (numbers(p[key])) keep[key] = p[key] as number | number[];
        if (p.color === true) keep.color = true;
        if (p.toggle === true) keep.toggle = true;
        out[name] = keep;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    } catch {
      return undefined;
    }
  };

  /** The starting values a link's controls name, by field. */
  const seedOf = (controls: ControlProps | undefined): Record<string, number[]> =>
    Object.fromEntries(
      Object.entries(controls ?? {})
        .filter(([, prop]) => prop.value !== undefined && typeof prop.value !== 'boolean')
        .map(([name, prop]) => [name, ([] as number[]).concat(prop.value as number | number[])]),
    );

  /** What the page opens with: the source in the link, else the example the link names, else
   *  the first example. */
  const openingSource = async (): Promise<{
    source: string;
    example?: PlaygroundExample;
    controls?: ControlProps;
    /** Whether the source came in the link (`code=`). */
    linked?: boolean;
    files?: Record<string, string>;
    graph?: { name: string; path: string }[];
    host?: string;
  }> => {
    await addReleaseExamples();
    let params = hashParams();
    // A short link's id: the fragment it stands for is the Worker's to hand back.
    const shared = params.get('share');
    if (shared) {
      const fragment = await fetchShare(shared);
      if (fragment) params = new URLSearchParams(fragment);
    }
    // The options come off the fragment before the first render, so the panes are painted
    // once, under the settings the link carried.
    const level = params.get('opt');
    if (level === 'O0' || level === 'O1' || level === 'O2') levelPicker.value = level;
    if (params.get('parens') === 'minimal') parensPicker.value = 'minimal';
    if (params.get('minify') === '1') minifyToggle.checked = true;
    const numbers = params.get('numbers');
    if (numbers === 'f32' || numbers === 'false') numbersPicker.value = numbers;
    if (params.get('obfuscate') === '1') obfuscateToggle.checked = true;
    if (params.get('fp64') === 'integer') fp64Picker.value = 'integer';
    if (params.get('precision') === 'mediump') precisionPicker.value = 'mediump';
    const backend = params.get('backend');
    if (
      enginePicker instanceof HTMLSelectElement &&
      (backend === 'webgpu' || backend === 'webgl2' || backend === 'cpu')
    ) {
      enginePicker.value = backend;
    }
    const linkedHost = params.get('host');
    const host = linkedHost ? await decodeSource(linkedHost) : undefined;
    const code = params.get('code');
    if (code) {
      const source = await decodeSource(code);
      if (source !== undefined) {
        const example = examples.find((candidate) => candidate.source === source);
        applyAspect(params.get('aspect'));
        const controls = await linkedControlsOf(params.get('controls'));
        if (controls) linkedControls = params.get('controls')!;
        // A link written before the main file had a name of its own names none: it opens
        // under its example's name, or `main.shade.ts`.
        const linkedName = params.get('name');
        nameMain(
          linkedName !== null && FILE_PATH.test(linkedName) && !linkedName.includes('/')
            ? linkedName
            : exampleFileName(example?.id),
        );
        return {
          source,
          example,
          linked: true,
          ...(controls ? { controls } : {}),
          files: await linkedFiles(params.get('files')),
          graph: linkedGraph(params.get('passes')),
          ...(host !== undefined ? { host } : {}),
        };
      }
    }
    if (params.has('blank') && root.dataset.blank) {
      nameMain(MAIN_FILE);
      return { source: root.dataset.blank };
    }
    const named = params.get('example');
    const chosen =
      examples.find((candidate) => candidate.id === named) ??
      examples.find((candidate) => candidate.id === root.dataset.defaultExample) ??
      examples[0];
    if (chosen) nameMain(exampleFileName(chosen.id));
    return { source: chosen?.source ?? sample, example: chosen };
  };

  // ── The transport ──────────────────────────────────────────────────────────────────────
  // Play and pause, back to zero, the clock and the frame rate, and the frame on the whole
  // screen: the row an engine's viewport carries. It drives the clock `shaderClock` reads, so
  // it moves the GPU canvas; the rasteriser draws one frame at a time and has no clock to run.

  const w = copy.workspace;
  const playButton = root.querySelector('[data-play]');
  const restartButton = root.querySelector('[data-restart]');
  const clockOut = root.querySelector('[data-clock]');
  const fpsOut = root.querySelector('[data-fps]');
  const fullscreenButton = root.querySelector('[data-fullscreen]');
  const dropHint = root.querySelector('[data-drop-hint]');
  const shownTime = (): number => frozen ?? clockHeld ?? Math.max(0, runtimeSeconds - clockOffset);
  const paintClock = (): void => {
    if (clockOut instanceof HTMLElement) clockOut.textContent = `${shownTime().toFixed(2)}s`;
  };
  const syncPlay = (): void => {
    if (!(playButton instanceof HTMLButtonElement)) return;
    const held = clockHeld !== null;
    const word = held ? w.play : w.pause;
    playButton.setAttribute('aria-pressed', String(held));
    playButton.setAttribute('aria-label', word);
    playButton.title = word;
    playButton.querySelector('[data-icon-pause]')?.toggleAttribute('hidden', held);
    playButton.querySelector('[data-icon-play]')?.toggleAttribute('hidden', !held);
  };
  if (playButton instanceof HTMLButtonElement) {
    playButton.addEventListener('click', () => {
      if (clockHeld === null) clockHeld = shownTime();
      else {
        clockOffset = runtimeSeconds - clockHeld;
        clockHeld = null;
      }
      syncPlay();
      paintClock();
      // Pause holds the frame with the clock, so a pass that reads its frame before stands
      // still with it (compiler change 0026).
      mounted?.holdFrames(clockHeld !== null);
      mounted?.redraw();
    });
  }
  if (restartButton instanceof HTMLButtonElement) {
    restartButton.addEventListener('click', () => {
      clockOffset = runtimeSeconds;
      if (clockHeld !== null) clockHeld = 0;
      // Back to frame 0, and every pass's output dropped, so a pass that reads its frame
      // before starts again from nothing (compiler change 0026).
      mounted?.restart();
      paintClock();
      mounted?.redraw();
    });
  }
  // The readout follows the canvas four times a second, and the rate is the frames the mount
  // counted over the last second. Nothing is written while the tool is out of view.
  let lastFrames = 0;
  let lastSample = performance.now();
  window.setInterval(() => {
    if (document.hidden || root.dataset.view === 'gallery') return;
    paintClock();
    const now = performance.now();
    if (now - lastSample < 1000) return;
    const frames = mounted?.frames ?? 0;
    const rate =
      mounted && mounted.backend !== 'none'
        ? ((frames - lastFrames) * 1000) / (now - lastSample)
        : 0;
    lastFrames = frames;
    lastSample = now;
    if (fpsOut instanceof HTMLElement)
      fpsOut.textContent = rate > 0 && clockHeld === null ? `${Math.round(rate)} fps` : '';
  }, 250);
  if (fullscreenButton instanceof HTMLButtonElement && frame instanceof HTMLElement) {
    fullscreenButton.hidden = typeof frame.requestFullscreen !== 'function';
    fullscreenButton.addEventListener('click', () => {
      if (document.fullscreenElement === frame) void document.exitFullscreen().catch(() => {});
      else void frame.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === frame;
      fullscreenButton.setAttribute('aria-label', on ? w.exitFullscreen : w.fullscreen);
      fullscreenButton.title = on ? w.exitFullscreen : w.fullscreen;
    });
  }

  // A picture dropped on the canvas goes to the module's first 2D texture, the way a
  // Shadertoy pane takes a file on its first channel. The line under the transport names the
  // texture while the module has one.
  const syncDropHint = (): void => {
    if (!(dropHint instanceof HTMLElement)) return;
    const target = bindings.imageTarget();
    dropHint.hidden = target === undefined;
    dropHint.textContent = '';
    if (target === undefined) return;
    const [before, after] = w.dropHint.split(`\`{texture}\``);
    dropHint.append(before ?? '', el('code', undefined, target), after ?? '');
  };
  if (frame instanceof HTMLElement) {
    frame.addEventListener('dragover', (event) => {
      if (bindings.imageTarget() === undefined) return;
      event.preventDefault();
      frame.classList.add('dropping');
    });
    frame.addEventListener('dragleave', () => frame.classList.remove('dropping'));
    frame.addEventListener('drop', (event) => {
      frame.classList.remove('dropping');
      const file = event.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      event.preventDefault();
      void bindings.dropImage(file);
    });
  }

  // ── The workspace ──────────────────────────────────────────────────────────────────────
  // The file the canvas runs, and beside it the files it imports and any the reader adds, each
  // a model of its own under one editor and a tab over it. Every file is an open document in
  // the language worker, so an import reads the text the reader sees and an edit to an
  // imported file recompiles the program. Only the first file is a program the canvas runs;
  // the others are what it imports.

  interface WorkspaceFile {
    readonly model: any;
    readonly listener: { dispose(): void };
    markers: number;
  }
  /** The files beside the one the canvas runs, by their path from it (`lib/noise.shade.ts`),
   *  in the order they were opened. */
  const extras = new Map<string, WorkspaceFile>();
  /** The file the editor shows: '' for the one the canvas runs, else a key of `extras`. */
  let activeFile = '';
  /** The files drawn as passes before the main file each frame (compiler change 0026), in
   *  draw order: each file's path and the name its output is read by. */
  let passGraph: { name: string; path: string }[] = [];
  /** The module each pass compiled to at the version the panes show, by the pass's name;
   *  undefined for one that did not compile. */
  let passModules = new Map<string, ModuleDecl | undefined>();
  /** A pass's name from its file: the stem, as an identifier, since the bindings that read the
   *  pass are named by it. `passes/blur-x.shade.ts` reads as `blur_x`. */
  const passNameOf = (path: string): string => {
    const stem = (path.split('/').pop() ?? path).replace(/\.shade\.ts$/, '').replace(/\.ts$/, '');
    const name = stem.replace(/[^A-Za-z0-9_]/g, '_');
    return /^[A-Za-z_]/.test(name) ? name : `_${name}`;
  };
  const syncPasses = (): void => {
    bindings.setPasses(passGraph.map((p) => p.name));
  };
  const fileTabs = root.querySelector('[data-file-tabs]');
  const newFileButton = root.querySelector('[data-new-file]');
  const fileError = root.querySelector('[data-file-error]');
  const uriOf = (path: string): string => new URL(path, documentUri).toString();
  /** The path of a workspace file by its uri, '' for the one the canvas runs. */
  const pathOfUri = (uri: string): string | undefined => {
    if (uri === documentUri || uri === MAIN_MODEL_URI || uri === model?.uri.toString()) return '';
    for (const path of extras.keys()) if (uriOf(path) === uri) return path;
    return undefined;
  };
  const sayFileError = (text: string): void => {
    if (!(fileError instanceof HTMLElement)) return;
    fileError.textContent = text;
    fileError.hidden = text === '';
  };

  /** The files the example the editor was filled from brings, as the library holds them. */
  const pristineFiles = (): Record<string, string> => {
    const example = examples.find((candidate) => candidate.id === openedExample);
    const out: Record<string, string> = {};
    for (const path of example?.imports ?? [])
      if (library[path] !== undefined) out[path] = library[path];
    return out;
  };
  /** The passes the example the editor was filled from draws. */
  const pristineGraph = (): { name: string; path: string }[] =>
    (examples.find((candidate) => candidate.id === openedExample)?.passes ?? []).map((p) => ({
      name: p.name,
      path: p.file,
    }));
  const workspaceFiles = (): Record<string, string> =>
    Object.fromEntries([...extras].map(([path, file]) => [path, file.model.getValue() as string]));
  /** Whether the files beside the main one are other than the example's own, which is when a
   *  link has to carry them. */
  const filesMoved = (): boolean => {
    const now = workspaceFiles();
    const was = pristineFiles();
    const keys = Object.keys(now);
    return keys.length !== Object.keys(was).length || keys.some((key) => now[key] !== was[key]);
  };

  const paintTabs = (): void => {
    if (!(fileTabs instanceof HTMLElement)) return;
    // A name being typed, for a new file or a rename, keeps the strip as it is until the
    // field closes; an analysis arriving meanwhile repaints the markers on the next paint.
    if (fileTabs.querySelector('input')) return;
    fileTabs.textContent = '';
    const pristine = pristineFiles();
    const tab = (path: string, label: string): HTMLButtonElement => {
      const button = el('button', 'file-tab', label) as HTMLButtonElement;
      button.type = 'button';
      button.dataset.fileTab = path || fileName;
      button.title = w.renameHint;
      if (path === activeFile) button.setAttribute('aria-current', 'true');
      // A click on the tab already shown changes nothing, so the strip is not repainted
      // under a double click that is about to rename it.
      button.addEventListener('click', () => {
        if (path !== activeFile) showFile(path);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'F2' || (event.key === 'Enter' && path === activeFile)) {
          event.preventDefault();
          startRename(path);
        }
      });
      return button;
    };
    fileTabs.append(tab('', fileName));
    // host.ts beside the main file. It keeps its name, so it has no rename and no close.
    const hostTab = el('button', 'file-tab', HOST_TAB) as HTMLButtonElement;
    hostTab.type = 'button';
    hostTab.dataset.fileTab = HOST_TAB;
    if (activeFile === HOST_TAB) hostTab.setAttribute('aria-current', 'true');
    if (hostMarkers > 0) hostTab.classList.add('file-errors');
    if (hostReady && hostPristine !== undefined && hostText() !== hostPristine)
      hostTab.classList.add('file-dirty');
    hostTab.addEventListener('click', () => {
      if (activeFile !== HOST_TAB) showFile(HOST_TAB);
    });
    fileTabs.append(hostTab);
    for (const [path, file] of extras) {
      const pass = passGraph.find((p) => p.path === path);
      const button = tab(path, path);
      if (pass) button.classList.add('file-pass');
      if (pristine[path] !== undefined && pristine[path] !== file.model.getValue())
        button.classList.add('file-dirty');
      if (file.markers > 0) button.classList.add('file-errors');
      const close = el('button', 'file-close', '×') as HTMLButtonElement;
      close.type = 'button';
      const label = w.deleteFile.replace('{file}', path);
      close.setAttribute('aria-label', label);
      close.title = label;
      close.addEventListener('click', () => {
        if (window.confirm(w.confirmDelete.replace('{file}', path))) removeFile(path);
      });
      // Whether this file is drawn as a pass before the main file (compiler change 0026).
      const toggle = el(
        'button',
        'file-pass-toggle',
        pass ? `${w.pass} ${pass.name}` : w.pass,
      ) as HTMLButtonElement;
      toggle.type = 'button';
      toggle.setAttribute('aria-pressed', String(Boolean(pass)));
      toggle.title = w.passTitle.replace('{file}', path);
      toggle.addEventListener('click', () => {
        passGraph = pass
          ? passGraph.filter((p) => p.path !== path)
          : [
              ...passGraph,
              // Draw order is the order of the tabs.
              { name: passNameOf(path), path },
            ].sort(
              (a, b) => [...extras.keys()].indexOf(a.path) - [...extras.keys()].indexOf(b.path),
            );
        syncPasses();
        paintTabs();
        workspaceEdited();
      });
      const pair = el('span', 'file-pair');
      pair.append(button, toggle, close);
      fileTabs.append(pair);
    }
  };

  /** A diagnostic of a file with no prelude, as a marker on its model: its lines are the ones
   *  the service counts. */
  const fileMarker = (diagnostic: TypeshadeDiagnostic) => ({
    startLineNumber: diagnostic.range.start.line + 1,
    startColumn: diagnostic.range.start.character + 1,
    endLineNumber: diagnostic.range.end.line + 1,
    endColumn: Math.max(
      diagnostic.range.end.character + 1,
      diagnostic.range.start.line === diagnostic.range.end.line
        ? diagnostic.range.start.character + 2
        : 1,
    ),
    message: diagnostic.message,
    source: diagnostic.source === 'typescript' ? copy.sourceTypescript : copy.sourceTypeshade,
    code: String(diagnostic.code),
    severity: markerSeverity(monacoApi, diagnostic.severity),
  });

  /** Asks the worker about each file beside the main one and puts its diagnostics on its own
   *  model, since the list under the editor is the program's. A file with no prelude has its
   *  lines as the service counts them. */
  const paintFileMarkers = (): void => {
    if (!client || !monacoApi) return;
    const asked = version;
    for (const [path, file] of extras) {
      void client
        .request('analysis', uriOf(path), asked, {})
        .then((analysis) => {
          if (!analysis || asked !== version || extras.get(path) !== file) return;
          const found = diagnosticsForDocument(analysis.diagnostics, uriOf(path));
          file.markers = found.filter((diagnostic) => diagnostic.severity === 'error').length;
          monacoApi.editor.setModelMarkers(file.model, 'typeshade', found.map(fileMarker));
          paintTabs();
        })
        .catch((error: unknown) => {
          if (asked === version)
            serviceFailed(error instanceof Error ? error.message : String(error));
        });
    }
  };

  /** An edit anywhere in the workspace is an edit to the program: the main document is sent
   *  again under a new version, so every answer about the old program is dropped, and the
   *  panes and the link follow once the typing settles. */
  const workspaceEdited = (): void => {
    syncDocument();
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 350);
    window.clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => {
      void publishSource();
    }, 600);
  };

  const addFile = (path: string, text: string): void => {
    if (!monacoApi || !client) return;
    const uri = monacoApi.Uri.parse(uriOf(path));
    monacoApi.editor.getModel(uri)?.dispose();
    const fileModel = monacoApi.editor.createModel(text, 'typescript', uri);
    client.update(uriOf(path), text, version);
    const listener = fileModel.onDidChangeContent(() => {
      client.update(uriOf(path), fileModel.getValue(), version + 1);
      retireStill();
      workspaceEdited();
      paintTabs();
    });
    extras.set(path, { model: fileModel, listener, markers: 0 });
  };

  const removeFile = (path: string): void => {
    const file = extras.get(path);
    if (!file) return;
    extras.delete(path);
    passGraph = passGraph.filter((p) => p.path !== path);
    syncPasses();
    file.listener.dispose();
    file.model.dispose();
    client?.close(uriOf(path));
    if (activeFile === path) showFile('');
    else paintTabs();
    workspaceEdited();
  };

  // ── host.ts ────────────────────────────────────────────────────────────────────────────
  // The TypeScript an application writes around the module (compiler change 0062), in a tab
  // beside the main file. The language worker checks it against the DOM, the runtime and the
  // host view of each module it imports (playground-host-service.ts), and builds it for Run,
  // which runs it in a sandboxed frame over the canvas (playground-host-run.ts) and never on its
  // own: not on a keystroke, not from a link. A host example opens with its own host.ts; any
  // other file gets a starter written from its host face (playground-host-default.ts) the first
  // time host.ts is shown, run or downloaded.

  const HOST_TAB = 'host.ts';
  /** Where the markers on host.ts come from: its own check, apart from the compiler's. */
  const HOST_MARKERS = 'typeshade-host';
  const hostTypes = new URL(hostTypesAsset, window.location.href).toString();
  let hostModel: any;
  /** Whether host.ts holds a text: its example's, the link's or the starter. Until then the
   *  model is empty, nothing checks it and the link carries none. */
  let hostReady = false;
  /** The text host.ts opened with, which the link need not carry; undefined for one a link
   *  brought with nothing to compare it with. */
  let hostPristine: string | undefined;
  /** Whether the reader has looked at host.ts or run it: until then it is not checked, so a
   *  reader who never opens it never downloads the declarations it is checked against. */
  let hostSeen = false;
  let hostMarkers = 0;
  let hostChecks = 0;
  let hostTimer = 0;
  /** Raised each time the page sets host.ts's text, so a starter asked for before is dropped. */
  let hostEpoch = 0;
  /** True while the page itself writes host.ts, which is no edit of the reader's. */
  let hostSetting = false;

  const hostText = (): string => (hostReady && hostModel ? (hostModel.getValue() as string) : '');
  /** Whether the link has to carry host.ts. */
  const hostCarried = (): boolean => hostReady && hostText() !== hostPristine;

  /** Asks the worker for host.ts's diagnostics and puts them on its model. */
  const checkHost = (): void => {
    if (!client || !hostModel || !hostReady || !hostSeen || !monacoApi) return;
    const asked = ++hostChecks;
    const text = hostText();
    void client
      .request('hostDiagnostics', HOST_URI, version, { text, types: hostTypes })
      .then((found) => {
        if (!found || asked !== hostChecks || text !== hostText()) return;
        hostMarkers = found.filter((diagnostic) => diagnostic.severity === 'error').length;
        monacoApi.editor.setModelMarkers(hostModel, HOST_MARKERS, found.map(fileMarker));
        paintTabs();
      });
  };

  /** Gives host.ts a text, or none (`undefined`), as the workspace opens. */
  const setHost = (text: string | undefined, pristine: string | undefined): void => {
    hostEpoch += 1;
    hostReady = text !== undefined;
    hostPristine = pristine;
    hostMarkers = 0;
    if (hostModel) {
      hostSetting = true;
      hostModel.setValue(text ?? '');
      hostSetting = false;
      monacoApi?.editor.setModelMarkers(hostModel, HOST_MARKERS, []);
    }
    checkHost();
    paintTabs();
  };

  /** Writes the starter into a host.ts that has no text yet. The starter is of the main file the
   *  worker holds, so an answer about a version the editor has left is asked again. */
  const ensureHost = async (): Promise<void> => {
    if (hostReady || !client) return;
    const epoch = hostEpoch;
    for (let tries = 0; tries < 4; tries += 1) {
      const asked = version;
      const starter = await client.request('hostStarter', documentUri, asked, {});
      if (epoch !== hostEpoch || hostReady) return;
      if (starter) {
        setHost(starter, starter);
        return;
      }
      if (asked === version) return;
    }
  };

  /** An edit of the reader's to host.ts: checked once the typing settles, and carried by the
   *  link. It runs only on Run. */
  const hostEdited = (): void => {
    if (hostSetting) return;
    window.clearTimeout(hostTimer);
    hostTimer = window.setTimeout(checkHost, 350);
    window.clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => {
      void publishSource();
    }, 600);
    paintTabs();
  };

  // Run: host.ts and the modules it imports, built by the worker, in a frame over the canvas.
  // Its console lines and errors fill the Console tab as they come, each with the line of
  // host.ts it came from; a second click stops it and removes the frame.
  const runHostButton = root.querySelector('[data-run-host]');
  const runHostLabel = root.querySelector('[data-run-host-label]');
  const hostNote = root.querySelector('[data-host-note]');
  const hostResult = root.querySelector('[data-host-result]');
  /** The line under the frame that shows what run() returned, or hides it. */
  const showHostResult = (text: string | undefined): void => {
    if (!(hostResult instanceof HTMLElement)) return;
    hostResult.textContent = text === undefined ? '' : `run() ${text}`;
    hostResult.hidden = text === undefined;
  };
  let hostRun: HostRun | undefined;
  /** Raised by every Run and Stop, so a build that comes back after either is dropped. */
  let hostTicket = 0;
  let hostList: HTMLOListElement | undefined;
  let hostLines = 0;
  let hostMore: HTMLParagraphElement | undefined;

  const syncRunHost = (): void => {
    if (!(runHostButton instanceof HTMLButtonElement)) return;
    const running = hostRun !== undefined;
    runHostButton.setAttribute('aria-pressed', String(running));
    runHostButton.querySelector('[data-icon-run]')?.toggleAttribute('hidden', running);
    runHostButton.querySelector('[data-icon-stop]')?.toggleAttribute('hidden', !running);
    // The name stays on the button when a narrow file bar shows its icon alone.
    runHostButton.setAttribute('aria-label', running ? w.stopHost : w.runHost);
    if (runHostLabel instanceof HTMLElement)
      runHostLabel.textContent = running ? w.stopHost : w.runHost;
    if (hostNote instanceof HTMLElement) hostNote.hidden = !running;
  };

  /** Removes the frame of a run, if one is up. `say` adds a line saying so to its report. */
  const stopHost = (say = false): void => {
    hostTicket += 1;
    showHostResult(undefined);
    if (!hostRun) return;
    hostRun.stop();
    hostRun = undefined;
    syncRunHost();
    if (say && consolePane instanceof HTMLElement && consolePane.dataset.report === 'host')
      consolePane.append(sentence(w.hostStopped));
  };

  /** One line of the run's report, the way a console line of the module's is drawn: where it
   *  ran, the line of host.ts it came from, then what it printed. */
  const hostLine = (method: string, source: string, text: string): void => {
    if (!hostList || !(consolePane instanceof HTMLElement)) return;
    hostLines += 1;
    consolePane.dataset.lines = String(hostLines);
    if (hostLines > CONSOLE_SHOWN) {
      hostMore ??= sentence('');
      hostMore.textContent = fillNumbers(copy.consoleMore, { more: hostLines - CONSOLE_SHOWN });
      if (!hostMore.isConnected) consolePane.append(hostMore);
      return;
    }
    const li = document.createElement('li');
    if (method === 'warn' || method === 'error') li.className = method;
    const part = (className: string, value: string): HTMLSpanElement => {
      const node = document.createElement('span');
      node.className = className;
      node.textContent = value;
      return node;
    };
    const tier = part('tier', 'host');
    tier.dataset.tier = 'host';
    li.append(tier, part('source', source), part('at', ''), part('value', text));
    hostList.append(li);
  };

  /** Brings the run's report to the front from the Result tab, where the frame shows none of
   *  it. A reader on another tab chose it and stays there. */
  const showHostReport = (): void => {
    if (view === 'result') selectView('console');
  };

  const onHostEvent = (event: HostEvent): void => {
    const at = (line: number | undefined): string => (line ? `${HOST_TAB}:${line}` : HOST_TAB);
    switch (event.kind) {
      case 'console':
        hostLine(event.method, at(event.line), event.text);
        return;
      case 'error':
        hostLine('error', at(event.line), event.text);
        showHostReport();
        return;
      case 'returned':
        hostLine('log', 'run()', event.text);
        // What a run returns is written to the Console tab. A run that drew nothing leaves
        // the Result tab an empty frame, so the tab with its value comes to the front; one
        // that drew keeps its picture, with the value on a line under it.
        if (event.drew) showHostResult(event.text);
        else showHostReport();
        return;
      case 'started':
        if (event.call === 'none' && consolePane instanceof HTMLElement)
          consolePane.append(sentence(w.hostNone));
        return;
      case 'unloaded':
        if (consolePane instanceof HTMLElement) consolePane.append(sentence(w.hostUnloaded));
        return;
    }
  };

  const runHost = async (): Promise<void> => {
    if (!client || !hostModel || !(frame instanceof HTMLElement)) return;
    stopHost();
    const ticket = hostTicket;
    hostSeen = true;
    await ensureHost();
    if (!hostReady || ticket !== hostTicket) return;
    let build = await client.request('hostBuild', HOST_URI, version, { text: hostText() });
    // The main file moved under the build: once more, against the text the worker now holds.
    build ??= await client.request('hostBuild', HOST_URI, version, { text: hostText() });
    if (!build || ticket !== hostTicket) return;
    checkHost();
    if (view !== 'result' && view !== 'console') selectView('result');
    hostList = document.createElement('ol');
    hostList.dataset.consoleBlock = 'host';
    hostLines = 0;
    hostMore = undefined;
    paintConsole({ report: 'host', lines: 0 }, sentence(w.hostConsole), hostList);
    for (const problem of build.problems) hostLine('error', HOST_TAB, problem);
    if (!build.host.code) return;
    const example = examples.find((candidate) => candidate.id === openedExample);
    hostRun = startHostFrame(
      frame,
      {
        host: build.host,
        modules: build.modules,
        ...(example?.host !== undefined ? { example: example.id } : {}),
      },
      onHostEvent,
      { background: getComputedStyle(frame).backgroundColor, title: w.hostFrame },
    );
    syncRunHost();
  };

  if (runHostButton instanceof HTMLButtonElement)
    runHostButton.addEventListener('click', () => {
      if (hostRun) stopHost(true);
      else void runHost();
    });

  // ── Names ────────────────────────────────────────────────────────────────────────────
  // The main file opens under its example's name and every tab can be renamed: a double
  // click, or F2 (and Enter on the tab shown) from the keyboard, turns the tab into a field
  // for the stem; the `.shade.ts` ending stays. An import of the renamed file in another tab
  // is rewritten to the new name, and the line under the bar says which tabs changed.

  /** Moves the file the canvas runs to a new name in the worker: the old document is closed
   *  and the text sent again under the new uri, so every answer names the new file. */
  const renameMain = (name: string): void => {
    if (name === fileName) return;
    const before = documentUri;
    nameMain(name);
    if (model && client) {
      client.close(before);
      syncDocument();
    }
    paintTabs();
  };

  /** A relative specifier from the file at `from` to the file at `to`, both workspace paths. */
  const relativeSpecifier = (from: string, to: string): string => {
    const dir = from.split('/').slice(0, -1);
    const parts = to.split('/');
    let common = 0;
    while (common < dir.length && common < parts.length - 1 && dir[common] === parts[common])
      common += 1;
    const up = dir.length - common;
    return `${up === 0 ? './' : '../'.repeat(up)}${parts.slice(common).join('/')}`;
  };
  /** `text`, the file at `importer`, with every relative import of `from` naming `to`. A
   *  specifier keeps its form: one written without the `.shade.ts` ending is written without. */
  const rewriteImports = (text: string, importer: string, from: string, to: string): string =>
    text.replace(
      /(\b(?:from|import)\s*)(["'])(\.{1,2}\/[^"'\n]*)\2/g,
      (whole, lead: string, quote: string, specifier: string) => {
        const resolved = decodeURI(new URL(specifier, `file:///${importer}`).pathname).slice(1);
        const bare = !/\.ts$/.test(specifier);
        if ((bare ? `${resolved}.shade.ts` : resolved) !== from) return whole;
        const next = relativeSpecifier(importer, to);
        return `${lead}${quote}${bare ? next.replace(/\.shade\.ts$/, '') : next}${quote}`;
      },
    );

  /** Renames a workspace file ('' for the main one) to `next`, and rewrites the imports of it
   *  in the other tabs. Returns the names of the tabs whose imports changed. */
  const renameFile = (path: string, next: string): string[] => {
    const before = path === '' ? fileName : path;
    if (path === '') renameMain(next);
    else {
      const file = extras.get(path);
      if (!file) return [];
      const text = file.model.getValue() as string;
      const order = [...extras.keys()];
      file.listener.dispose();
      file.model.dispose();
      client?.close(uriOf(path));
      extras.delete(path);
      addFile(next, text);
      // The tab keeps its place in the strip, and a pass keeps its name, since the main file's
      // bindings read the pass by it.
      const moved = new Map(extras);
      extras.clear();
      for (const key of order) {
        const kept = moved.get(key === path ? next : key);
        if (kept) extras.set(key === path ? next : key, kept);
      }
      passGraph = passGraph.map((p) => (p.path === path ? { ...p, path: next } : p));
      if (activeFile === path) {
        activeFile = next;
        editor?.setModel(extras.get(next)?.model);
      }
    }
    const touched: string[] = [];
    const others: [string, any][] = [
      ['', model],
      ...[...extras].map(([key, file]): [string, any] => [key, file.model]),
      // host.ts imports the main file by its name, so its import follows a rename too.
      ...(hostReady && hostModel ? [[HOST_TAB, hostModel] as [string, any]] : []),
    ];
    for (const [key, other] of others) {
      if (key === (path === '' ? '' : next) || !other) continue;
      const importer = key === '' ? fileName : key;
      const text = other.getValue() as string;
      const out = rewriteImports(text, importer, before, next);
      if (out === text) continue;
      other.pushEditOperations([], [{ range: other.getFullModelRange(), text: out }], () => null);
      touched.push(importer);
    }
    workspaceEdited();
    return touched;
  };

  /** Turns the tab of `path` ('' for the main file) into a field for its new name. */
  function startRename(path: string): void {
    if (!(fileTabs instanceof HTMLElement) || !editor || path === HOST_TAB) return;
    if (fileTabs.querySelector('input')) return;
    const current = path === '' ? fileName : path;
    const button = [...fileTabs.querySelectorAll('[data-file-tab]')].find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.fileTab === current,
    );
    if (!button) return;
    const field = el('span', 'file-rename');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current.replace(/\.shade\.ts$/, '');
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', w.renameLabel.replace('{file}', current));
    input.dataset.renameFile = current;
    field.append(input, el('span', 'file-suffix', '.shade.ts'));
    button.replaceWith(field);
    input.focus();
    input.select();
    let done = false;
    const close = (focus: string): void => {
      done = true;
      field.remove();
      paintTabs();
      const tab = [...fileTabs.querySelectorAll('[data-file-tab]')].find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.dataset.fileTab === focus,
      );
      tab?.focus();
    };
    const finish = (commit: boolean): void => {
      if (done) return;
      if (!commit) {
        sayFileError('');
        close(current);
        return;
      }
      const stem = input.value
        .trim()
        .replace(/^\.\//, '')
        .replace(/\.shade\.ts$/, '');
      const next = `${stem}.shade.ts`;
      const why =
        stem === ''
          ? w.emptyName
          : !FILE_PATH.test(next)
            ? w.badName
            : path === '' && next.includes('/')
              ? w.mainNameSlash
              : next !== current && (next === fileName || extras.has(next))
                ? w.takenName
                : '';
      if (why) {
        input.setAttribute('aria-invalid', 'true');
        sayFileError(why);
        input.focus();
        return;
      }
      sayFileError('');
      if (next === current) {
        close(current);
        return;
      }
      done = true;
      field.remove();
      const touched = renameFile(path, next);
      close(next);
      if (touched.length > 0)
        sayFileError(
          w.importsRenamed
            .replace('{old}', current)
            .replace('{new}', next)
            .replace('{files}', touched.join(', ')),
        );
    };
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(false));
  }
  if (fileTabs instanceof HTMLElement)
    fileTabs.addEventListener('dblclick', (event) => {
      const tab = (event.target as Element | null)?.closest('[data-file-tab]');
      if (!(tab instanceof HTMLElement)) return;
      const name = tab.dataset.fileTab ?? '';
      startRename(name === fileName ? '' : name);
    });

  /** Empties the workspace down to the main file and fills it with `files`. */
  const setFiles = (
    files: Readonly<Record<string, string>>,
    graph: readonly { name: string; path: string }[] = [],
  ): void => {
    for (const [path, file] of extras) {
      file.listener.dispose();
      file.model.dispose();
      client?.close(uriOf(path));
    }
    extras.clear();
    for (const [path, text] of Object.entries(files)) addFile(path, text);
    passGraph = graph.filter((p) => extras.has(p.path));
    passModules = new Map();
    syncPasses();
    activeFile = '';
    if (editor && model) editor.setModel(model);
    sayFileError('');
    paintTabs();
  };

  function showFile(path: string): void {
    if (!editor || !model) return;
    if (path === HOST_TAB) {
      if (!hostModel) return;
      activeFile = HOST_TAB;
      hostSeen = true;
      editor.setModel(hostModel);
      paintTabs();
      paintOutput();
      void ensureHost().then(checkHost);
      return;
    }
    const file = path === '' ? undefined : extras.get(path);
    if (path !== '' && !file) return;
    activeFile = path;
    editor.setModel(file ? file.model : model);
    paintTabs();
    paintOutput();
  }

  /** A path the workspace can hold: relative, no `..`, the characters a URL keeps as they are,
   *  and the `.shade.ts` ending the compiler reads a shader import by. A bare name gets the
   *  ending. */
  const FILE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9_\-./]+\.shade\.ts$/;
  const normalisePath = (typed: string): string => {
    const trimmed = typed.trim().replace(/^\.\//, '');
    return /\.ts$/.test(trimmed) ? trimmed : `${trimmed}.shade.ts`;
  };
  const newFileText = (path: string): string => `"use typeshade"

// ${fileName} imports this file with: import { wave } from "./${path}"
export function wave(x: f32, t: f32): f32 {
  return 0.5 + 0.5 * sin(x * 6.0 + t)
}
`;

  const askFileName = (): void => {
    if (!(fileTabs instanceof HTMLElement) || !editor) return;
    if (fileTabs.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'lib/name.shade.ts';
    input.setAttribute('aria-label', w.newFileName);
    input.spellcheck = false;
    fileTabs.append(input);
    input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    input.focus();
    let done = false;
    const finish = (commit: boolean): void => {
      if (done) return;
      const typed = input.value.trim();
      if (commit && typed !== '') {
        const path = normalisePath(typed);
        const why = !FILE_PATH.test(path)
          ? w.badName
          : path === fileName || extras.has(path)
            ? w.takenName
            : '';
        if (why) {
          input.setAttribute('aria-invalid', 'true');
          sayFileError(why);
          input.focus();
          return;
        }
        done = true;
        sayFileError('');
        input.remove();
        addFile(path, newFileText(path));
        showFile(path);
        workspaceEdited();
        return;
      }
      done = true;
      sayFileError('');
      input.remove();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        editor.focus();
      }
    });
    input.addEventListener('blur', () => {
      if (input.value.trim() === '') finish(false);
    });
  };
  if (newFileButton instanceof HTMLButtonElement)
    newFileButton.addEventListener('click', askFileName);
  // Download: the workspace as a zip of a folder VS Code opens, the files as the tabs hold them
  // and the pass graph in typeshade.json (src/scripts/workspace-folder.ts).
  const downloadButton = root.querySelector('[data-download]');
  if (downloadButton instanceof HTMLButtonElement)
    downloadButton.addEventListener('click', async () => {
      if (!model) return;
      await ensureHost();
      const folder = workspaceFolder(
        { path: fileName, text: model.getValue() },
        workspaceFiles(),
        passGraph,
        hostReady ? hostText() : undefined,
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
    renameMain(MAIN_FILE);
    setFiles({});
    stopHost();
    setHost(undefined, undefined);
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
    else stopHost();
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
  Promise.all([loadMonaco(), openingSource()])
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
      followSiteTheme(monaco, paintOutput);
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
          linkedOpening = { source: opening.source, seed: seedOf(opening.controls) };
        }
      }
      if (opening.controls) {
        bindings.setControls(opening.controls);
        if (!opening.example) bindings.seed(seedOf(opening.controls));
      }
      model = monaco.editor.createModel(
        opening.source,
        'typescript',
        monaco.Uri.parse(MAIN_MODEL_URI),
      );
      // host.ts's model, after the main one: the main file stays the first model. Its text is
      // the link's, else its example's, else none until it is needed.
      hostModel = monaco.editor.createModel(
        '',
        'typescript',
        monaco.Uri.parse('inmemory://playground/host.ts'),
      );
      hostModel.onDidChangeContent(hostEdited);
      if (opening.host !== undefined) setHost(opening.host, opening.example?.host);
      else if (opening.example?.host !== undefined)
        setHost(opening.example.host, opening.example.host);
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

      // ── The providers, one per service method ─────────────────────────────────────────
      // Each asks the worker about the document at the version the editor holds and hands
      // back what it answers; the client resolves `undefined` for an answer about a version
      // the editor has left, and each provider turns that into nothing. Positions cross in
      // the four helpers at the top of this file and nowhere else.
      // Every file of the workspace is a document the service holds, so every provider
      // answers for whichever one the editor shows. The main file's lines cross through the
      // prelude helpers; a file beside it has no prelude, so its lines are the service's.
      /** The document a model is, or undefined for a model that is not the workspace's. */
      const docOf = (currentModel: any): { uri: string; main: boolean } | undefined => {
        const uri = currentModel.uri.toString();
        if (uri === model.uri.toString()) return { uri: documentUri, main: true };
        const path = pathOfUri(uri);
        return path ? { uri, main: false } : undefined;
      };
      const isOurs = (currentModel: any): boolean => docOf(currentModel) !== undefined;
      const uriIn = (currentModel: any): string => docOf(currentModel)?.uri ?? documentUri;
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
          const onHost = currentModel === hostModel;
          if ((!onHost && !isOurs(currentModel)) || !client) return { suggestions: [] };
          // host.ts is TypeScript, answered by its own checker in the worker.
          const items = onHost
            ? await client.request('hostCompletions', HOST_URI, version, {
                text: currentModel.getValue(),
                types: hostTypes,
                ...here(position, false),
              })
            : await client.request(
                'completions',
                uriIn(currentModel),
                version,
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
                (item.label.startsWith('@') && before.endsWith('@')
                  ? item.label.slice(1)
                  : item.label),
              insertTextRules:
                item.insertTextFormat === 'snippet'
                  ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                  : undefined,
              detail: item.detail,
              documentation: item.documentation ? { value: item.documentation } : undefined,
              sortText: item.sortText,
              filterText: item.filterText,
              range: item.textEdit
                ? monacoRange(item.textEdit.range, mainModel(currentModel))
                : range,
            })),
          };
        },
      });

      monaco.languages.registerHoverProvider('typescript', {
        provideHover: async (currentModel: any, position: MonacoPosition) => {
          const onHost = currentModel === hostModel;
          if ((!onHost && !isOurs(currentModel)) || !client) return null;
          const hover = onHost
            ? await client.request('hostHover', HOST_URI, version, {
                text: currentModel.getValue(),
                types: hostTypes,
                ...here(position, false),
              })
            : await client.request(
                'hover',
                uriIn(currentModel),
                version,
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
        locations: readonly { uri: string; range: TypeshadeRange }[] | undefined,
      ) =>
        (locations ?? []).flatMap((location) => {
          const path = pathOfUri(location.uri);
          if (path === undefined) return [];
          if (path === '') {
            if (inPrelude(location.range.start.line)) return [];
            return [{ uri: model.uri, range: monacoRange(location.range) }];
          }
          const file = extras.get(path);
          return file ? [{ uri: file.model.uri, range: monacoRange(location.range, false) }] : [];
        });
      // Go to definition into another file: the standalone editor opens nothing on its own,
      // so the page switches the tab and puts the cursor where the definition is.
      monaco.editor.registerEditorOpener?.({
        openCodeEditor: (_source: any, resource: any, selectionOrPosition: any) => {
          const path = pathOfUri(resource.toString());
          if (path === undefined) return false;
          showFile(path);
          if (selectionOrPosition) {
            if ('startLineNumber' in selectionOrPosition) {
              editor.setSelection(selectionOrPosition);
              editor.revealRangeInCenter(selectionOrPosition);
            } else {
              editor.setPosition(selectionOrPosition);
              editor.revealPositionInCenter(selectionOrPosition);
            }
          }
          editor.focus();
          return true;
        },
      });

      monaco.languages.registerDefinitionProvider('typescript', {
        provideDefinition: async (currentModel: any, position: MonacoPosition) => {
          if (!isOurs(currentModel) || !client) return null;
          return ownLocations(
            await client.request(
              'definition',
              uriIn(currentModel),
              version,
              here(position, mainModel(currentModel)),
            ),
          );
        },
      });

      monaco.languages.registerReferenceProvider('typescript', {
        provideReferences: async (
          currentModel: any,
          position: MonacoPosition,
          context: { includeDeclaration: boolean },
        ) => {
          if (!isOurs(currentModel) || !client) return null;
          return ownLocations(
            await client.request('references', uriIn(currentModel), version, {
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
          if (!isOurs(currentModel) || !client) return null;
          const symbols = await client.request('symbols', uriIn(currentModel), version, {});
          const main = mainModel(currentModel);
          return symbols ? symbols.map((symbol) => toDocumentSymbol(symbol, main)) : null;
        },
      });

      monaco.languages.registerSignatureHelpProvider('typescript', {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp: async (currentModel: any, position: MonacoPosition) => {
          if (!isOurs(currentModel) || !client) return null;
          const help = await client.request(
            'signatureHelp',
            uriIn(currentModel),
            version,
            here(position, mainModel(currentModel)),
          );
          if (!help) return null;
          return {
            value: {
              signatures: help.signatures.map((signature) => ({
                label: signature.label,
                documentation: signature.documentation
                  ? { value: signature.documentation }
                  : undefined,
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
          if (!isOurs(currentModel) || !client) return null;
          const prepared = await client.request(
            'prepareRename',
            uriIn(currentModel),
            version,
            here(position, mainModel(currentModel)),
          );
          return prepared
            ? {
                range: monacoRange(prepared.range, mainModel(currentModel)),
                text: prepared.placeholder,
              }
            : null;
        },
        provideRenameEdits: async (
          currentModel: any,
          position: MonacoPosition,
          newName: string,
        ) => {
          if (!isOurs(currentModel) || !client) return null;
          const edits = await client.request('rename', uriIn(currentModel), version, {
            ...here(position, mainModel(currentModel)),
            newName,
          });
          if (!edits) return null;
          // A name the prelude also declares would be renamed in there too, and the editor
          // holds none of those lines, so the edit has nowhere to land. The rename is
          // refused whole instead of applied to half the occurrences. So is one that reaches
          // a file outside the workspace.
          if ((edits[documentUri] ?? []).some((edit) => inPrelude(edit.range.start.line)))
            return null;
          const out: { resource: any; textEdit: any; versionId: undefined }[] = [];
          for (const [uri, list] of Object.entries(edits)) {
            const path = pathOfUri(uri);
            if (path === undefined) return null;
            const target = path === '' ? model : extras.get(path)?.model;
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
          if (!isOurs(currentModel) || !client) return null;
          const tokens = await client.request('semanticTokens', uriIn(currentModel), version, {});
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

      // The files beside it first, then the document: the worker holds each from the moment
      // its model exists, so the first analysis reads the imports the tabs show.
      setFiles(
        opening.files ?? filesFor(opening.source, opening.example),
        opening.graph ?? graphFor(opening.example),
      );
      syncDocument();

      model.onDidChangeContent((event: { isFlush?: boolean }) => {
        // A keystroke makes the still a picture of a file the editor no longer holds. Loading
        // an example is a flush and leaves it, so the example's own still covers its first frame.
        if (!event.isFlush) retireStill();
        syncDocument();
        window.clearTimeout(timer);
        timer = window.setTimeout(render, 350);
        window.clearTimeout(urlTimer);
        urlTimer = window.setTimeout(() => {
          void publishSource();
        }, 600);
      });
      run.addEventListener('click', render);
      if (runCpu instanceof HTMLButtonElement) runCpu.addEventListener('click', evaluateOnCpu);
      if (drawCpu instanceof HTMLButtonElement) {
        drawCpu.addEventListener('click', () => {
          if (drawing !== 0) stopDrawing();
          else drawOnCpu();
        });
      }
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectView((tab.dataset.target ?? 'result') as View));
        tab.addEventListener('keydown', (event) => {
          const steps: Record<string, number> = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: tabs.length - 1,
          };
          const next = steps[event.key];
          if (next === undefined) return;
          event.preventDefault();
          const moved = tabs[(next + tabs.length) % tabs.length];
          selectView((moved.dataset.target ?? 'result') as View, true);
        });
      });
      reset.addEventListener('click', () => {
        if (openedExample === '' && linkedOpening) reopenLinked();
        else if (openedExample === '' && blankSource) openBlank();
        else showExample(openedExample);
        editor.focus();
      });
      levelNote.hidden = levelPicker.value === 'O2';
      numbersField.hidden = !minifyToggle.checked;
      syncEngine();
      syncPlay();
      paintTabs();
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
