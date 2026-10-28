export interface FrameConsole {
  add(lines: readonly ConsoleEvent[], logged: number): void;
  show(): void;
}
import { type ConsoleEvent } from '../../../vendor/shader-dsl/src/core/console.ts';
import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import { compileModule } from '../../../vendor/shader-dsl/src/core/oracle.ts';
import {
  cornersOf,
  drawTile,
  RASTER_PRECISION,
  type CpuFunctions,
  type RasterPlan,
  type RasterReply,
  type RasterRequest,
} from '../playground-raster.ts';
import type { EmitChoice, PlaygroundCopy } from './contracts.ts';
import { fillNumbers } from './view-helpers.ts';
interface RasterState {
  readonly compiled: { readonly module: ModuleDecl } | undefined;
  readonly moduleDrawable: boolean;
  readonly canvasFits: boolean;
}
interface RasterOptions {
  root: HTMLElement;
  copy: PlaygroundCopy;
  state: RasterState;
  bindings: { prepareCpuResources(): Promise<void> };
  engine(): EmitChoice['backend'];
  rasterPlan(): RasterPlan | undefined;
  rasterFailure(message: string): string;
  frameConsoleFor(plan: RasterPlan, job: number): FrameConsole;
}
/** Owns CPU worker lifetime, tile scheduling, cancellation and the fallback renderer. */
export function createRasterController({
  root,
  copy,
  state,
  bindings,
  engine,
  rasterPlan,
  rasterFailure,
  frameConsoleFor,
}: RasterOptions) {
  const drawCpu = root.querySelector('[data-draw-cpu]');
  const canvasNote = root.querySelector('[data-canvas-note]');
  const canvas = root.querySelector('[data-canvas]');

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
          new Worker(new URL('../playground-raster-worker.ts', import.meta.url), {
            type: 'module',
          }),
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
    drawCpu.disabled = !state.moduleDrawable || !state.canvasFits;
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
    cpuPreparation += 1;
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
        channel.port1.close();
        channel.port2.close();
        resume();
      };
      channel.port2.postMessage(undefined);
    });

  /** What the rasteriser says when it is done. */
  const drawnNote = (px: number, ms: number, workers: number): string =>
    fillNumbers(copy.canvasDrawn, { px, ms: Math.round(ms), workers });

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

  const drawHere = async (
    plan: RasterPlan,
    context: CanvasRenderingContext2D,
    mine: number,
    frameConsole: FrameConsole,
  ): Promise<void> => {
    let pixel: [number, number, number] | undefined;
    const oracle = compileModule(state.compiled!.module, {
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
    if (mine !== job) return;
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
    const current = state.compiled;
    try {
      await bindings.prepareCpuResources();
    } catch (error) {
      if (
        preparation !== cpuPreparation ||
        current !== state.compiled ||
        selectedEngine !== engine()
      )
        return;
      if (canvasNote instanceof HTMLElement)
        canvasNote.textContent = error instanceof Error ? error.message : String(error);
      return;
    }
    if (preparation !== cpuPreparation || current !== state.compiled || selectedEngine !== engine())
      return;
    if (!(canvas instanceof HTMLCanvasElement) || !(canvasNote instanceof HTMLElement)) return;
    const context = canvas.getContext('2d');
    const plan = rasterPlan();
    if (!state.compiled || !context || !plan) {
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
          if (mine === job)
            canvasNote.textContent = rasterFailure(error instanceof Error ? error.message : '');
        })
        .finally(finish);
      return;
    }

    if (!openPool()) {
      void drawHere(plan, context, mine, frameConsole)
        .catch((error) => {
          if (mine === job)
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
    const module = state.compiled.module;

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
      if (retired) return true;
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
      if (retire()) return;
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
        if (complete || retire()) return;
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
          retirePool();
          job += 1;
          retire();
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
        if (retire() || finished) return;
        finished = true;
        retired = true;
        pending.length = 0;
        inFlight.clear();
        // A worker that cannot start at all leaves the drawing to this thread.
        for (const other of pool) other.terminate();
        pool = [];
        void drawHere(plan, context, mine, frameConsoleFor(plan, mine))
          .catch((error) => {
            if (mine === job)
              canvasNote.textContent = rasterFailure(error instanceof Error ? error.message : '');
          })
          .finally(finish);
      };
      worker.postMessage({ kind: 'prepare', job: mine, module, plan } satisfies RasterRequest);
    }
    say();
  };
  return {
    openPool,
    syncDrawButton,
    stopDrawing,
    drawOnCpu,
    get job() {
      return job;
    },
    get drawing() {
      return drawing;
    },
  };
}
