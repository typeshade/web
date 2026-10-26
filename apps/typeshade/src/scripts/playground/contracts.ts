import type { OptLevel } from '../../../vendor/shader-dsl/src/core/passes/opt/optimize.ts';
import type { Fp64Flavor } from '../../../vendor/shader-dsl/src/core/passes/fp64-lower.ts';
import type { BindingsCopy } from '../playground-bindings.ts';
/** One example as the page carries it: the source from the vendored file, the words from i18n. */
export interface PlaygroundExample {
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
export interface EmitChoice {
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
export interface PlaygroundCopy {
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
export type Target = 'wgsl' | 'glslVertex' | 'glslFragment';

/** What the one tab strip over the result column selects: the canvas, one of the three
 *  emitted files, or the reflection. */
export type View = 'result' | Target | 'reflection' | 'console';

/** What scripts/check-playground.mjs reads off the tool's element. */
export interface PlaygroundHandle {
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
