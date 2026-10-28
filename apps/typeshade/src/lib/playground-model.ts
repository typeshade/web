import { SHADE_STILL_EXAMPLES } from '../../scripts/artifacts.mjs';
import { hostExamples } from '../../vendor/shader-dsl/examples/hosts/index.ts';
import { copyFor, localePath, type Locale } from '../i18n/index.ts';
import { twinUniformDefaults } from './hero-shader.ts';
import { links } from './links.ts';
import {
  defaultPlaygroundExample,
  playgroundExamples,
  playgroundLibrary,
} from './playground-examples.ts';
import { SHADE_GROUPS, shadeExampleList } from './shade-examples.ts';

export function createPlaygroundModel(locale: Locale, seed?: string, runtime = false) {
  const t = copyFor(locale).playground;

  // The examples arrive from the vendored checkout at build time: the source text from the
  // file, the title and the description from this locale's dictionary. `_shade.ts` reads the
  // filesystem, so the browser half never imports it. The words are the gallery's, under
  // `examples.shade`, so the picker and the tile on /guide/examples/ cannot disagree.
  const shade = copyFor(locale).examples.shade;
  interface Entry {
    id: string;
    source: string;
    imports: readonly string[];
    passes?: readonly { readonly name: string; readonly file: string }[];
    title: string;
    description: string;
    defaults: ReturnType<typeof twinUniformDefaults>;
    /** A host example's host.ts. */
    host?: string;
  }
  const all: Entry[] = playgroundExamples().map((example) => ({
    id: example.id,
    source: example.source,
    imports: example.imports,
    ...(example.passes ? { passes: example.passes } : {}),
    title: shade.titles[example.id]!,
    description: shade.descriptions[example.id]!,
    // Where a source twin's uniform fields start: its `fn()` original's values, the frame its
    // still shows. The panel starts every other field from its own defaults.
    defaults: twinUniformDefaults(
      shadeExampleList.find((entry) => entry.id === example.id)?.twinOf,
    ),
  }));
  // The host examples (compiler change 0061) follow, each a module and the host.ts that runs it:
  // the editor opens the module as the main file and host.ts in the tab beside it. Their words
  // are the examples page's, under `examples.host`.
  const host = copyFor(locale).examples.host;
  all.push(
    ...hostExamples.map((example) => ({
      id: example.id,
      source: example.shadeSource,
      imports: [],
      host: example.hostSource,
      title: host.titles[example.id]!,
      description: host.descriptions[example.id]!,
      defaults: twinUniformDefaults(undefined),
    })),
  );
  if (seed && !all.some((example) => example.id === seed)) {
    throw new Error(`[playground] no .shade.ts example '${seed}' to seed the editor with`);
  }
  const examples = runtime ? [] : seed ? all.filter((example) => example.id === seed) : all;
  const seeded = seed !== undefined || runtime;
  // The files the examples on this page import (Rule 3.9), which the editor does not hold: the
  // language worker reads an import through them, and a line under the emit options names them,
  // each a link to the file at the pinned commit, beside the other notes on how the file is
  // compiled.
  const library = playgroundLibrary(examples);
  const opening = runtime ? '' : (seed ?? defaultPlaygroundExample);
  const [importsBefore, importsAfter] = t.importsNote.split('{files}');
  // The name over the toolbar is the file the editor holds: the example's own file, whose stem
  // is the example's id. The script names it again after the example the link opens, and after a
  // rename (src/scripts/playground.ts).
  const fileName = runtime ? '' : `${opening}.shade.ts`;
  const sample = `"use typeshade";

class Clip {
  @builtin("position") pos: vec4;
}

class Color {
  @location(0) color: vec4;
}

@vertex
export function vs(@builtin("vertex_index") i: u32): Clip {
  const x = i === 1 ? 0.8 : i === 2 ? 0. : -0.8;
  const y = i === 2 ? 0.8 : -0.8;
  return { pos: vec4(x, y, 0., 1.) };
}

@fragment
export function fs(): Color {
  return { color: vec4(1., 0., 0., 1.) };
}
`;
  // The gallery the page opens on when its link names nothing: every example the picker holds,
  // in the gallery's groups, each tile its still where the build captured one. A page that names
  // its example has no gallery, since the page already chose.
  const w = t.workspace;
  const shadeStills = new Set<string>(SHADE_STILL_EXAMPLES);
  const galleryGroups = seeded
    ? []
    : SHADE_GROUPS.map(
        (group): { key: string; heading: string; tiles: (Entry & { still: boolean })[] } => ({
          key: group.key,
          heading: shade.groups[group.key],
          tiles: examples
            .filter((example) => (group.ids as readonly string[]).includes(example.id))
            .map((example) => ({ ...example, still: shadeStills.has(example.id) })),
        }),
      )
        .concat([
          {
            key: 'host',
            heading: host.h,
            tiles: examples
              .filter((example) => example.host !== undefined)
              .map((example) => ({ ...example, still: false })),
          },
        ])
        .filter((group) => group.tiles.length > 0);
  // The file the Blank tile opens. Code is not copy, so it lives here beside the sample: the
  // three fields the runtime fills and one fragment entry that reads all of them.
  const blank = `"use typeshade"

class Uniforms {
  time: f32
  resolution: vec2
  mouse: vec2
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const aspect = u.resolution.x / max(u.resolution.y, 1.0)
  const p = (uv - u.mouse) * vec2(aspect, 1.0)
  const ring = 0.5 + 0.5 * sin(length(p) * 24.0 - u.time * 3.0)
  const tint = vec3(0.35, 0.55, 0.95) + vec3(0.4, 0.2, -0.3) * uv.x
  return vec4(mix(vec3(0.05, 0.06, 0.1), tint, ring * ring), 1.0)
}
`;

  // The words the browser half needs once it is running. It reads them off the element, since
  // the script that holds the logic is a bundled module and takes no `define:vars`.
  const runtimeCopy = {
    fileName,
    releaseGroup: copyFor(locale).examples.runtime.h,
    idle: t.idle,
    ready: t.ready,
    errors: t.errors,
    loading: t.loading,
    clean: t.clean,
    noOutput: t.noOutput,
    directive: t.directive,
    unavailable: t.unavailable,
    starting: t.starting,
    serviceFailed: t.serviceFailed,
    sourceTypescript: t.sourceTypescript,
    sourceTypeshade: t.sourceTypeshade,
    entryPoints: t.entryPoints,
    resources: t.resources,
    inputs: t.inputs,
    outputs: t.outputs,
    returns: t.returns,
    runCpu: t.runCpu,
    running: t.running,
    cpuIdle: t.cpuIdle,
    noResources: t.noResources,
    noEntryPoints: t.noEntryPoints,
    requiredFeatures: t.requiredFeatures,
    cpuFailed: t.cpuFailed,
    canvas: t.canvas,
    draw: t.draw,
    stop: t.stop,
    canvasIdle: t.canvasIdle,
    engineGpu: t.engineGpu,
    engineCpu: t.engineCpu,
    gpuIdle: t.gpuIdle,
    gpuWebgpu: t.gpuWebgpu,
    gpuWebgl2: t.gpuWebgl2,
    gpuNone: t.gpuNone,
    gpuNeedsStages: t.gpuNeedsStages,
    gpuNeedsAttributes: t.gpuNeedsAttributes,
    gpuNeedsBindings: t.gpuNeedsBindings,
    gpuNoWebgpu: t.gpuNoWebgpu,
    gpuNoWebgl2: t.gpuNoWebgl2,
    gpuNoGlsl: t.gpuNoGlsl,
    gpuNoGlslFeatures: t.gpuNoGlslFeatures,
    gpuNoFeature: t.gpuNoFeature,
    gpuFailed: t.gpuFailed,
    computeNeedsWebgpu: t.computeNeedsWebgpu,
    computeRan: t.computeRan,
    consoleIdle: t.consoleIdle,
    consoleLines: t.consoleLines,
    consoleNone: t.consoleNone,
    consoleDropped: t.consoleDropped,
    consoleMore: t.consoleMore,
    consoleIndex: t.consoleIndex,
    consoleValue: t.consoleValue,
    consolePixelHint: t.consolePixelHint,
    consolePixel: t.consolePixel,
    consolePixelGl: t.consolePixelGl,
    consolePixelGpu: t.consolePixelGpu,
    consolePixelGpuNone: t.consolePixelGpuNone,
    consolePixelGpuFailed: t.consolePixelGpuFailed,
    consolePixelNone: t.consolePixelNone,
    consolePixelOutside: t.consolePixelOutside,
    consolePixelFailed: t.consolePixelFailed,
    consolePixelNoRaster: t.consolePixelNoRaster,
    consoleNotRecorded: t.consoleNotRecorded,
    consoleNotRecordedFrame: t.consoleNotRecordedFrame,
    consoleVertex: t.consoleVertex,
    consoleVertexGpu: t.consoleVertexGpu,
    consoleVertexAt: t.consoleVertexAt,
    consoleRecording: t.consoleRecording,
    consoleFrameGpu: t.consoleFrameGpu,
    consoleFrameDropped: t.consoleFrameDropped,
    consoleFrameFailed: t.consoleFrameFailed,
    consoleFrameCpu: t.consoleFrameCpu,
    consoleFrameKept: t.consoleFrameKept,
    pixelNote: t.pixelNote,
    pixelNoteRecording: t.pixelNoteRecording,
    bindings: t.bindings,
    canvasNeedsVertex: t.canvasNeedsVertex,
    canvasFlat: t.canvasFlat,
    canvasFlatInputs: t.canvasFlatInputs,
    canvasTooBig: t.canvasTooBig,
    canvasProgress: t.canvasProgress,
    resolution: t.resolution,
    canvasDrawn: t.canvasDrawn,
    args: t.args,
    argsInvalid: t.argsInvalid,
    cpuNoResources: t.cpuNoResources,
    entryCountOne: t.entryCount(1),
    noGlsl: t.noGlsl,
    resultTab: t.resultTab,
    copy: t.copy,
    copied: t.copied,
    share: t.share,
    shared: t.shared,
    submit: t.submit,
    emit: t.emit,
    workspace: w,
    errorsHref: localePath(locale, links.errors.href),
  };

  return {
    t,
    host,
    examples,
    seeded,
    library,
    opening,
    importsBefore,
    importsAfter,
    fileName,
    sample,
    w,
    galleryGroups,
    blank,
    runtimeCopy,
  };
}
