import { type ConsoleEvent } from '../../../vendor/shader-dsl/src/core/console.ts';
import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import { compileModule } from '../../../vendor/shader-dsl/src/core/oracle.ts';
import {
  consoleBuffer,
  hasConsoleCall,
  type ConsoleBufferResult,
} from '../../../vendor/shader-dsl/src/core/passes/console-buffer.ts';
import { reflect } from '../../../vendor/shader-dsl/src/core/reflect.ts';
import { type MountedShader } from '../../lib/shader-runtime.ts';
import type { BindingsModel } from '../playground-bindings.ts';
import {
  cornersOf,
  FRAME_LINES,
  pixelArguments,
  RASTER_PRECISION,
  type CpuFunctions,
  type RasterPlan,
} from '../playground-raster.ts';
import type { createConsoleView } from './console-view.ts';
import type { EmitChoice, PlaygroundCopy } from './contracts.ts';
import { emitWgsl, programManifest } from './emission.ts';
import { type FrameConsole } from './raster-controller.ts';
import { fillNumbers } from './view-helpers.ts';
interface CaptureState {
  readonly compiled: { readonly module: ModuleDecl } | undefined;
  readonly mounted: MountedShader | undefined;
  readonly frozen: number | null;
  readonly raster: { readonly job: number };
}
interface CaptureOptions {
  root: HTMLElement;
  copy: PlaygroundCopy;
  state: CaptureState;
  bindings: BindingsModel;
  consoleView: Pick<
    ReturnType<typeof createConsoleView>,
    'sentence' | 'paintConsole' | 'consoleList'
  >;
  currentChoice(): EmitChoice;
  engineIsCpu(): boolean;
  isComputeModule(): boolean;
  gpuCanvasNow(): HTMLCanvasElement | undefined;
  rasterPlan(): RasterPlan | undefined;
  cpuFrameBindings(seconds: number, width: number, height: number): Record<string, unknown>;
  outOfDocument(line: number): number;
}
/** Owns pixel/frame capture and its report revisions, independently of file editing. */
export function createCaptureController({
  root,
  copy,
  state,
  bindings,
  consoleView,
  currentChoice,
  engineIsCpu,
  isComputeModule,
  gpuCanvasNow,
  rasterPlan,
  cpuFrameBindings,
  outOfDocument,
}: CaptureOptions) {
  const { sentence, paintConsole, consoleList } = consoleView;
  const consolePane = root.querySelector('[data-console]');
  const frame = root.querySelector('[data-gpu-frame]');

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
    state.compiled !== undefined && !isComputeModule() && hasConsoleCall(state.compiled.module);

  /** The canvas WebGPU is drawing this module on, which is the one a capture can record. */
  const recordingCanvas = (): HTMLCanvasElement | undefined =>
    !engineIsCpu() && state.mounted?.backend === 'webgpu' ? gpuCanvasNow() : undefined;

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
    if (!state.compiled) return undefined;
    const choice = currentChoice();
    const key = JSON.stringify(choice);
    if (recording?.module === state.compiled.module && recording.choice === key) return recording;
    const result = consoleBuffer(state.compiled.module);
    // The buffer takes the slot the guard had, so the guard is found in the rewritten module.
    const guards = result.log
      ? reflect(result.module, { fp64Flavor: choice.fp64Flavor })
          .bindGroups.flatMap((group) => group.entries)
          .filter((entry) => entry.name === '_fp64')
          .map((entry) => ({ name: entry.name, binding: entry.binding }))
      : [];
    recording = {
      module: state.compiled.module,
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
      manifest: programManifest(state.compiled!.module, currentChoice(), true),
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
    if (!state.compiled || !base) return { vertex, pixel: lines, why: copy.consolePixelNoRaster };
    const plan: RasterPlan = {
      ...base,
      width,
      height,
      bindings: cpuFrameBindings(state.frozen ?? 0, width, height),
    };
    // Which entry is running, so each line is filed under the entry that made it.
    let running: 'vertex' | 'fragment' | undefined;
    let index = -1;
    try {
      const oracle = compileModule(state.compiled.module, {
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
    const current = state.compiled;
    try {
      await bindings.prepareCpuResources();
    } catch {
      return;
    }
    if (current !== state.compiled) return;
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
    const shader = state.mounted;
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

  /** Every pixel of the frame on the canvas, recorded on WebGPU. */
  const recordFrame = async (): Promise<void> => {
    const shader = state.mounted;
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
        if (!plan.console || run !== consoleRun || mine !== state.raster.job) return;
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
  if (frame instanceof HTMLElement) {
    // On the frame and not the canvas, because the GPU canvas is replaced on every mount.
    frame.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLCanvasElement) logPixel(target, event);
    });
  }
  if (recordFrameButton instanceof HTMLButtonElement)
    recordFrameButton.addEventListener('click', () => void recordFrame());
  return { syncRecordFrame, showPixelHint, frameConsoleFor };
}
