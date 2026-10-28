// One raster worker. It compiles the module it is handed to the CPU oracle once, then draws
// whatever tiles the page asks it for, a pixel at a time, and sends each one back the moment
// it is finished so the canvas fills in as the work lands.
//
// It imports `core/oracle.ts` and not the package barrel. The barrel re-exports the whole
// front end, which carries the TypeScript compiler; the oracle reaches none of it, so each
// worker's chunk is the CPU backend and the shared raster code, and not another megabyte of
// parser. The module arrives already compiled, as IR, which is plain data and crosses
// postMessage by structured clone.
import { compileModule } from '../../vendor/shader-dsl/src/core/oracle.ts';
import type { ConsoleEvent } from '../../vendor/shader-dsl/src/core/console.ts';
import {
  cornersOf,
  drawTile,
  FRAME_LINES,
  RASTER_PRECISION,
  type Corners,
  type CpuFunctions,
  type RasterPlan,
  type RasterReply,
  type RasterRequest,
} from './playground-raster.ts';
import { installOracleTextures } from './playground-oracle-textures.ts';

// The oracle's texture reads answer from the texels the page binds, in this worker as on the
// page.
installOracleTextures();

let job = -1;
let plan: RasterPlan | undefined;
let corners: Corners | undefined;
let cpu: CpuFunctions | undefined;
/** The console lines of the tile being drawn, the calls it made, and the pixel running. The
 *  vertex entry's calls, made once per worker while it prepares, belong to no pixel. */
let lines: ConsoleEvent[] = [];
let logged = 0;
let pixel: [number, number, number] | undefined;

const reply = (message: RasterReply, transfer?: Transferable[]): void => {
  (self as unknown as Worker).postMessage(message, transfer ?? []);
};

self.addEventListener('message', (event: MessageEvent<RasterRequest>) => {
  const request = event.data;

  if (request.kind === 'prepare') {
    job = request.job;
    plan = request.plan;
    try {
      // Compiled once per module, never per band and never per pixel. `evalEntry` in the
      // compiler compiles on every call, which at one call per pixel is a compile per pixel.
      const compiledModule = compileModule(request.module as never, {
        gpuStubs: true,
        precision: RASTER_PRECISION,
        ...(plan.console
          ? {
              consoleSink: (e: ConsoleEvent) => {
                if (!pixel) return;
                logged += 1;
                if (lines.length < FRAME_LINES) lines.push({ ...e, invocation: pixel });
              },
            }
          : {}),
      });
      for (const [name, value] of Object.entries(plan.bindings ?? {}))
        compiledModule.setBinding(name, value as never);
      cpu = compiledModule.fns as CpuFunctions;
      corners = cornersOf(cpu, plan);
      if (!corners) {
        reply({ kind: 'failed', job, message: 'no triangle' });
        return;
      }
      reply({ kind: 'ready', job });
    } catch (error) {
      reply({
        kind: 'failed',
        job,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  // A tile for a job this worker has moved past, or was never prepared for, is dropped.
  if (request.job !== job || !plan || !corners || !cpu) return;
  try {
    lines = [];
    logged = 0;
    const { pixels, covered } = drawTile(
      cpu,
      plan,
      corners,
      request.x0,
      request.y0,
      request.x1,
      request.y1,
      plan.console
        ? (px, py) => {
            pixel = [px, py, 0];
          }
        : undefined,
    );
    pixel = undefined;
    reply(
      {
        kind: 'tile',
        job,
        x0: request.x0,
        y0: request.y0,
        x1: request.x1,
        y1: request.y1,
        covered,
        pixels,
        ...(plan.console ? { lines, logged } : {}),
      },
      [pixels.buffer],
    );
  } catch (error) {
    pixel = undefined;
    reply({ kind: 'failed', job, message: error instanceof Error ? error.message : String(error) });
  }
});
