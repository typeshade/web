// The pixels, and the shapes both halves of the Playground need to compute them.
//
// Nothing here imports the compiler at run time. The main thread already holds it, and the
// raster worker imports only `core/oracle.ts`, which reaches no part of the TypeScript
// compiler, so the worker's chunk is the oracle and this file and not another copy of the
// front end. The compiled functions arrive as a parameter for that reason: whoever calls in
// has already decided where the module was compiled.
import type { ConsoleEvent } from '../../vendor/shader-dsl/src/core/console.ts';

/** The oracle's precision for everything the Result tab draws or dispatches on the CPU: every
 *  f32 operation rounded to f32, the way the GPU computes it. The oracle's default keeps full
 *  JavaScript doubles, which is the reference the reflection's return values report, and a
 *  picture drawn that way hides what an f32 program actually does: the fp64 examples exist
 *  to show f32 losing digits the emulated double keeps. */
export const RASTER_PRECISION = 'f32' as const;

/** One parameter or result of an entry point, as reflect() reports it. */
export interface ReflectedField {
  readonly name?: string;
  readonly type?: string;
  readonly builtin?: string;
  readonly location?: number;
}

/** One entry point of the module. */
export interface ReflectedEntry {
  readonly name: string;
  readonly stage: string;
  /** The DECLARED parameter types, one per parameter. A struct parameter is one entry here
   *  and several in `io.inputs`, which is what `entryArguments` reconciles. */
  readonly inputs?: readonly string[];
  readonly io?: {
    readonly inputs?: readonly ReflectedField[];
    readonly outputs?: readonly ReflectedField[];
  };
}

/** A struct as the module declares it: the field order a struct argument is built in. */
export interface DeclaredStruct {
  readonly name: string;
  readonly fields: readonly { readonly name: string }[];
}

/** The entry points a lowered module exposes, by name. */
export type CpuFunctions = Readonly<Record<string, (...args: never[]) => unknown>>;

/** Everything a worker needs to draw a band, none of it holding a function. It crosses
 *  postMessage, so every field is structured-cloneable. */
export interface RasterPlan {
  readonly width: number;
  readonly height: number;
  readonly vertex: ReflectedEntry;
  readonly fragment: ReflectedEntry;
  readonly structs: readonly DeclaredStruct[];
  /** A value for every uniform and storage binding the module reads, in the oracle's own
   *  shape, keyed by binding name. The bindings panel fills them, so the CPU draws from the
   *  numbers the GPU does. */
  readonly bindings?: Readonly<Record<string, unknown>>;
  /** The three values of each `@location` input of the vertex entry, by input name: the same
   *  vertices the GPU canvas draws from. */
  readonly attributes?: Readonly<Record<string, readonly (number | readonly number[])[]>>;
  /** Keep the fragment entry's console calls, each marked with its pixel (surface §66). */
  readonly console?: boolean;
}

/** The most console lines a draw on the CPU keeps: the most one tile sends, and the most the
 *  page holds across the tiles. The calls past it are counted. */
export const FRAME_LINES = 1 << 16;

/** The zero of a reflected type, for calling an entry point with something valid. A type this
 *  has no case for (a matrix or a texture, say) cannot be synthesised. */
export function zeroFor(type: string | undefined): { ok: true; value: unknown } | { ok: false } {
  if (!type) return { ok: false };
  if (type === 'bool') return { ok: true, value: false };
  if (/^[uif](?:8|16|32|64)$/.test(type)) return { ok: true, value: 0 };
  const vec = /^vec([234])</.exec(type);
  if (vec) return { ok: true, value: Array.from({ length: Number(vec[1]) }, () => 0) };
  return { ok: false };
}

/** The arguments the lowered entry function takes, which is not one per reflected input: a
 *  struct parameter is declared once and reflected as its fields. Handing the flattened list
 *  over leaves the struct's own fields undefined, and every component the entry computes from
 *  them comes back NaN. That reads like a shader returning nothing, when what is wrong is the
 *  call. `valueAt` is asked for the flattened values in order. */
export function entryArguments(
  entry: ReflectedEntry,
  structs: readonly DeclaredStruct[],
  valueAt: (index: number) => unknown,
): unknown[] {
  let next = 0;
  return (entry.inputs ?? []).map((key) => {
    const named = /^struct:(.+)$/.exec(key);
    if (!named) return valueAt(next++);
    const declared = structs.find((candidate) => candidate.name === named[1]);
    const built: Record<string, unknown> = {};
    for (const field of declared?.fields ?? []) built[field.name] = valueAt(next++);
    return built;
  });
}

/** The triangle in pixels: the vertex entry run for indices 0, 1 and 2, its clip positions
 *  divided by w and put through the viewport transform, which flips y. Also the vertex
 *  outputs themselves, which the varyings are interpolated from. */
export interface Corners {
  readonly screen: readonly (readonly number[])[];
  readonly area: number;
  readonly outputs: readonly Record<string, unknown>[];
}

export function cornersOf(cpu: CpuFunctions, plan: RasterPlan): Corners | undefined {
  const flat = plan.vertex.io?.inputs ?? [];
  const indexAt = flat.findIndex((field) => field.builtin === 'vertex_index');
  const positionName = plan.vertex.io?.outputs?.find((field) => field.builtin === 'position')?.name;
  const run = cpu[plan.vertex.name];
  // Three vertices come from `vertex_index` or from the vertex buffer the page generated;
  // an entry that reads neither has no corners to give.
  if ((indexAt < 0 && !plan.attributes) || !positionName || !run) return undefined;

  const outputs = [0, 1, 2].map((index) => {
    const returned = run(
      ...(entryArguments(plan.vertex, plan.structs, (at) => {
        if (at === indexAt) return index;
        const given = flat[at]?.name ? plan.attributes?.[flat[at]!.name!]?.[index] : undefined;
        if (given !== undefined) return given;
        const zero = zeroFor(flat[at]?.type);
        return zero.ok ? zero.value : 0;
      }) as never[]),
    );
    // A vertex entry that returns a bare `vec4` hands back the position itself, which the
    // reflection names `_ret`; it is filed under that name so the fragment half finds it.
    return (Array.isArray(returned) ? { [positionName]: returned } : returned) as Record<
      string,
      unknown
    >;
  });
  const screen = outputs.map((corner) => {
    const [x, y, , w] = corner[positionName] as number[];
    return [((x / w) * 0.5 + 0.5) * plan.width, (1 - ((y / w) * 0.5 + 0.5)) * plan.height];
  });
  const [a, b, c] = screen;
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  if (!Number.isFinite(area) || area === 0) return undefined;
  return { screen, area, outputs };
}

/** The fragment entry's arguments at pixel (`px`, `py`), or undefined where the triangle does
 *  not cover it: `position` at the pixel's centre, and every varying interpolated from the
 *  three vertex outputs. The draw and the Playground's "click a pixel" console run read the
 *  same numbers from here, so a pixel logs what it drew. */
export function pixelArguments(
  plan: RasterPlan,
  corners: Corners,
  px: number,
  py: number,
): unknown[] | undefined {
  const [a, b, c] = corners.screen;
  const fragmentFlat = plan.fragment.io?.inputs ?? [];
  const vertexOuts = plan.fragment.io ? (plan.vertex.io?.outputs ?? []) : [];
  const x = px + 0.5;
  const y = py + 0.5;
  const w0 = ((b[0] - x) * (c[1] - y) - (c[0] - x) * (b[1] - y)) / corners.area;
  const w1 = ((c[0] - x) * (a[1] - y) - (a[0] - x) * (c[1] - y)) / corners.area;
  const w2 = 1 - w0 - w1;
  if (w0 < 0 || w1 < 0 || w2 < 0) return undefined;
  const values = fragmentFlat.map((field) => {
    if (field.builtin === 'position') return [x, y, 0, 1];
    const from = vertexOuts.find((candidate) => candidate.name === field.name);
    if (!from?.name) {
      const zero = zeroFor(field.type);
      return zero.ok ? zero.value : 0;
    }
    const at = corners.outputs.map((corner) => corner[from.name as string]);
    // An integer varying is never interpolated: WGSL makes it flat, and a flat varying
    // takes the first vertex's value, which is WebGPU's provoking vertex.
    if (/^(?:[iu]32|vec[234]<[iu]32>)$/.test(field.type ?? '')) return at[0];
    if (Array.isArray(at[0])) {
      const first = at[0] as number[];
      return first.map(
        (_, k) => w0 * first[k] + w1 * (at[1] as number[])[k] + w2 * (at[2] as number[])[k],
      );
    }
    return w0 * (at[0] as number) + w1 * (at[1] as number) + w2 * (at[2] as number);
  });
  return entryArguments(plan.fragment, plan.structs, (at) => values[at]);
}

/** One tile of the canvas, drawn a pixel at a time. Returns the tile's own RGBA rows and how
 *  many of its pixels the triangle covered, so the caller can put it straight onto the canvas
 *  without waiting for the rest.
 *
 *  A tile and not a row: a row spans the whole canvas, so a triangle in the middle leaves the
 *  rows above and below it nearly free and the ones across it expensive, which is the worst
 *  shape for a queue to balance. Square tiles spread that unevenness out. */
export function drawTile(
  cpu: CpuFunctions,
  plan: RasterPlan,
  corners: Corners,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  /** Told each pixel before its fragment entry runs, so a console sink can mark its lines. */
  atPixel?: (px: number, py: number) => void,
  /** The colour each pixel returned, unclamped, at `(py * plan.width + px) * 4`: a pass's
   *  output, which the next program reads as a float texture (compiler change 0026). */
  floats?: Float32Array<ArrayBuffer>,
): { pixels: Uint8ClampedArray<ArrayBuffer>; covered: number } {
  const tileWidth = x1 - x0;
  const rows = y1 - y0;
  const pixels = new Uint8ClampedArray(tileWidth * rows * 4);
  const colourField = plan.fragment.io?.outputs?.[0]?.name;
  const run = cpu[plan.fragment.name];
  let covered = 0;
  if (!run) return { pixels, covered };

  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const args = pixelArguments(plan, corners, px, py);
      if (!args) continue;
      atPixel?.(px, py);
      const returned = run(...(args as never[]));
      // A fragment entry that returns a bare `vec4` is reflected with one output named `_ret`,
      // and the oracle hands back the vector itself, so only a struct is read by field name.
      // Reading `_ret` off the vector is how a covered canvas came back fully transparent.
      const colour = (
        Array.isArray(returned)
          ? returned
          : colourField
            ? (returned as Record<string, unknown>)[colourField]
            : returned
      ) as number[];
      if (!Array.isArray(colour)) continue;
      // Counted once its colour is written, so the note never claims a pixel it dropped.
      covered += 1;
      const offset = ((py - y0) * tileWidth + (px - x0)) * 4;
      if (floats) {
        const at = (py * plan.width + px) * 4;
        for (let k = 0; k < 4; k += 1) {
          const v = colour[k];
          floats[at + k] = Number.isFinite(v) ? (v as number) : k === 3 ? 1 : 0;
        }
      }
      for (let channel = 0; channel < 3; channel += 1) {
        const value = colour[channel];
        pixels[offset + channel] = Number.isFinite(value)
          ? Math.round(Math.max(0, Math.min(1, value)) * 255)
          : 0;
      }
      const alpha = colour[3];
      pixels[offset + 3] = Number.isFinite(alpha)
        ? Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        : 255;
    }
  }
  return { pixels, covered };
}

// ── What crosses the worker boundary ───────────────────────────────────────────────────────
// Every message carries the job it belongs to. A draw at a new resolution, or of a new
// module, raises the job number, and a band that arrives late under an old one is dropped
// instead of painted over the new picture.

export type RasterRequest =
  | {
      readonly kind: 'prepare';
      readonly job: number;
      readonly module: unknown;
      readonly plan: RasterPlan;
    }
  | {
      readonly kind: 'tile';
      readonly job: number;
      readonly x0: number;
      readonly y0: number;
      readonly x1: number;
      readonly y1: number;
    };

export type RasterReply =
  | { readonly kind: 'ready'; readonly job: number }
  | { readonly kind: 'failed'; readonly job: number; readonly message: string }
  | {
      readonly kind: 'tile';
      readonly job: number;
      readonly x0: number;
      readonly y0: number;
      readonly x1: number;
      readonly y1: number;
      readonly covered: number;
      readonly pixels: Uint8ClampedArray<ArrayBuffer>;
      /** With `plan.console`: the console lines the tile's pixels logged, no more than
       *  FRAME_LINES of them, and how many calls they made in all. */
      readonly lines?: readonly ConsoleEvent[];
      readonly logged?: number;
    };
