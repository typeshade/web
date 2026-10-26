// Dependency-free WebGPU / WebGL2 runner for one emitted example: a single pass of three
// vertices, from `vertex_index` or from a vertex buffer the host hands it.
//
// This file imports the compiler-free program runtime. The WGSL, the GLSL ES 3.00 stages, the
// std140 field offsets and the entry-point names are emitted at build time by
// hero-shader.ts and arrive here as plain data.

import { type Pack } from '../../vendor/shader-dsl/src/runtime.ts';
import type { ConsoleEvent } from '../../vendor/shader-dsl/src/core/console.ts';
import {
  uniformBindings,
  reachedBindings,
  renderProgram,
  captureRenderFrame,
} from './render-runtime.ts';

import type {
  ResourceSpec,
  SamplerSpec,
  TextureSpec,
  VertexBufferSpec,
} from './shader-bindings.ts';

/** Device-pixel-ratio ceiling. A fullscreen fragment shader is fill-rate bound, so a 3× phone
 *  would pay 4× the pixels for detail nobody can see behind body text. */
const MAX_DPR = 1.5;
/** The clock value of the single frame drawn under `prefers-reduced-motion: reduce` ,
 *  far enough in for the noise-driven examples to have settled into their steady look. */
const STILL_SECONDS = 3;
/** The frames a still of a program drawn in several passes draws before its one frame, at
 *  1/60 s apart: a second of history for a pass that reads the frame before. */
const STILL_WARMUP = 60;
/** What an adaptive mount aims a frame at, in milliseconds, and the least of the box it will
 *  draw at: an eighth of its side. */
const FRAME_BUDGET = 33;
const MIN_SCALE = 0.125;

/** How the host fills one uniform-struct field each frame.
 *
 *  A structural copy of `examples/_shared.ts` `Control` in the compiler. It is copied so the
 *  browser bundle does not import the compiler's module graph. `hero-shader.ts` translates
 *  the mirror's union into this one at build time and throws on a kind that is missing here,
 *  so the two cannot drift silently. */
export type Control =
  | { readonly kind: 'time' } // elapsed seconds → f32
  | { readonly kind: 'resolution' } // drawing-buffer size in px → vec2<f32>
  // Pointer state as vec4 [x, y, down, used]. The page has no pointer input, so it packs
  // [0,0,0,0], and `used = 0` is exactly the flag the examples read to render their canonical
  // autopilot framing (the one thumbnails and render gates see). A `.shade.ts` example's
  // `mouse` is a vec2 under src/lib/live-shader-contract.ts instead, 0 to 1 over the canvas,
  // and gets the (0.5, 0.5) an untouched Playground canvas holds, so a still shows the frame
  // the Playground opens on.
  | { readonly kind: 'mouse' }
  // The frame count since the clock started, and the seconds since the frame before, the
  // fields a pass that reads its own frame before (compiler change 0026) seeds and steps by.
  | { readonly kind: 'frame' }
  | { readonly kind: 'timeDelta' }
  | { readonly kind: 'const'; readonly value: readonly number[] }
  | { readonly kind: 'slider'; readonly value: number } // held at the author's default
  | { readonly kind: 'toggle'; readonly value: boolean } // f32 1 / 0
  // Log-magnitude sweep → a SCALAR f64 field: `base·10^s + offset`, where s is the default of
  // the `magField` slider. Packed as two f32 (hi, lo) into the field's 8 std140 bytes, the
  // host half of the emulated-double story.
  | {
      readonly kind: 'logmag1d';
      readonly magField: string;
      readonly base: number;
      readonly offset: number;
    }
  // The two-component forms of the same two: a drag-to-pan center held at its default, and a
  // log sweep, each packed as the hi and lo planes of a vec2<f64> (see splitF64Pair).
  | { readonly kind: 'pan2d'; readonly value: readonly [number, number] }
  | {
      readonly kind: 'logmag2d';
      readonly magField: string;
      readonly base: readonly [number, number];
      readonly offset: readonly [number, number];
    };

/** One std140 field of the module's uniform block, as `reflect()` recovered it. */
export interface UniformField {
  readonly name: string;
  /** DSL type key, `'f32'`, `'vec2<f32>'`, `'f64'`. Reported for the page builder; the
   *  packer switches on the control. */
  readonly type: string;
  /** Byte offset inside the block. Always a multiple of 4, so `offset / 4` indexes the
   *  Float32Array view. */
  readonly offset: number;
}

/** Everything the runtime needs about the module's interface, all of it from `reflect()`. */
export interface ShaderLayout {
  /** Uniform-block size in bytes, already padded to its std140 alignment. 0 = no block. */
  readonly size: number;
  /** GLSL binds the block by its struct name (`layout(std140) uniform <block> { … } U;`),
   *  which is not the WGSL variable name, getting this wrong does not fail to link, it
   *  silently lands on binding point 0. */
  readonly block: string;
  readonly group: number;
  readonly binding: number;
  /** The name the shader reads the block through (`u` in `u.time`). GLSL needs it to write
   *  the block's declaration; WGSL carries it in the emitted source already. */
  readonly instance?: string;
  readonly fields: readonly UniformField[];
  /** WGSL entry points. GLSL ES 3.00 always emits `main`. */
  readonly vertexEntry: string;
  readonly fragmentEntry: string;
  /** The compiler's auto-injected `_fp64` fast-math guard, which wants a 1×1 opaque-white
   *  texel. `hero-shader.ts` throws at build time on any other texture, so a figure never
   *  reaches here with one; a texture with data of its own arrives in `resources`. */
  readonly textures: readonly { readonly name: string; readonly binding: number }[];
  /** Every other resource the module binds, with the data to fill it: the textures and
   *  samplers the Playground's bindings panel supplies. A build-time payload has none, so a
   *  figure on a guide page binds exactly what it bound before this existed. */
  readonly resources?: readonly ResourceSpec[];
  /** The vertex buffer a vertex entry with `@location` inputs reads. Without one the pass
   *  draws three vertices from `vertex_index` alone, as every figure does. */
  readonly vertexBuffer?: VertexBufferSpec;
  /** Every uniform block after the first, packed every frame like the first one: a module
   *  the Playground runs can declare several. A figure has one and passes none. */
  readonly moreBlocks?: readonly UniformBlockLayout[];
}

/** One more uniform block: where it binds, what GLSL calls it, and its std140 fields. */
export interface UniformBlockLayout {
  readonly size: number;
  /** The struct's name, which GLSL binds the block by. */
  readonly block: string;
  readonly group: number;
  readonly binding: number;
  /** The name the shader reads it through, which `uniformValues` is asked about it by. */
  readonly instance: string;
  readonly fields: readonly UniformField[];
}

/** The build-time payload for one example: both targets, the layout, the controls. */
export interface ShaderData {
  readonly id: string;
  readonly title: string;
  /** One WGSL module carrying both entry points. */
  readonly wgsl: string;
  readonly manifest: Pack;
  readonly vertex: string; // GLSL ES 3.00, vertex stage
  readonly fragment: string; // GLSL ES 3.00, fragment stage
  readonly layout: ShaderLayout;
  /** Per-field fill strategy, keyed by uniform-field name. */
  readonly controls: Readonly<Record<string, Control>>;
  /** A value for each WGSL `override`, by name, handed to the WebGPU pipeline. The GLSL
   *  stages carry theirs as `#define`s already, written at emit. */
  readonly constants?: Readonly<Record<string, number>>;
  /** The optional WebGPU features the module needs, as WebGPU names them (`clip-distances`).
   *  The device is asked for them; an adapter without one refuses the mount by name. */
  readonly features?: readonly string[];
  /** The passes drawn before this program each frame, in draw order (compiler change 0026).
   *  Each draws into a texture the size of the canvas; a binding of this program or of a pass
   *  that reads one by name (`TextureSpec.pass`) gets this frame's output of a pass drawn
   *  earlier and the frame before's of itself or a later one. */
  readonly passes?: readonly ShaderPassData[];
}

/** One pass of a program drawn in several: a program of its own, named by the bindings that
 *  read its output. */
export interface ShaderPassData extends ShaderData {
  readonly name: string;
}

/** Where the mount's frame count stands: the frames drawn since it started or since the last
 *  `restart()`, and the seconds since the frame before. The reserved `frame` and `timeDelta`
 *  fields read it. */
export interface FrameClock {
  readonly frame: number;
  readonly delta: number;
}

export type Backend = 'webgpu' | 'webgl2' | 'none';

/** The state a mount's strings are written for. `still-*` is the one-frame path, taken under
 *  `prefers-reduced-motion` or by `still`, and is a separate key because the hero says
 *  something different there while a `still` mount says exactly what its backend row says
 *  . */
export type LabelState = Backend | 'still-webgpu' | 'still-webgl2';

/** One string per state. Full, never partial: a missing key is a label that would go blank on
 *  the path nobody tested. */
export type StateStrings = Readonly<Record<LabelState, string>>;

/** A text node this mount owns, plus what it says in each state. */
export interface LabelSlot {
  readonly el: HTMLElement | null;
  readonly text: StateStrings;
}

/** Everything on this mount whose wording names a backend. Written together, from one value
 *  , so a caption and an accessible name can never disagree. */
export interface MountLabels {
  /** The `<figcaption>`, the caption plate. */
  readonly caption?: LabelSlot;
  /** The canvas's own accessible name. */
  readonly ariaLabel?: StateStrings;
}

export interface MountOptions {
  /** Skip the WebGPU probe and go straight to WebGL2. `?forcegl2=1` on the page URL sets
   *  this too, so a verification run can exercise the GLSL half without a code change. */
  readonly forceWebGl2?: boolean;
  /** Run on this backend and no other. A reader who asked for WebGPU on a browser that has
   *  none gets no frame and `failure` saying why, instead of a WebGL2 frame under a WebGPU
   *  label. Unset, the runtime tries WebGPU and then WebGL2. */
  readonly backend?: 'webgpu' | 'webgl2';
  /** Draw exactly one frame at the pinned clock and stop, no rAF, no observers. The same
   *  path `prefers-reduced-motion: reduce` takes, so a still mount is not a second code path
   *  . An example with no `time` control redraws an identical frame forever
   *  without it. */
  readonly still?: boolean;
  /** The mount's own per-state strings and the elements they are written into. */
  readonly labels?: MountLabels;
  /** Draw only when asked. The observers and the swap path stay, and `redraw()` is what puts
   *  a frame up. A live example sets this when the reader asked for less motion: the canvas
   *  still follows a control they move, and nothing runs between their moves. */
  readonly onDemand?: boolean;
  /** Keep drawing under `prefers-reduced-motion: reduce` instead of taking the one-frame
   *  path, and leave the clock to the host. A live example sets this: it pins its own clock
   *  through `uniformValues` when a reader asks for less motion, and the loop is what redraws
   *  the canvas when they move a control. */
  readonly interactive?: boolean;
  /** A value for one uniform field this frame, or null to leave the field to `data.controls`.
   *  Read once per field per frame, before the controls. A live example (LiveShader.astro)
   *  drives every field through this, the reserved three included, so its controls can move
   *  while the shader runs; the front page passes nothing and keeps the packer it had. */
  readonly uniformValues?: (
    name: string,
    seconds: number,
    /** The block the field is in, given for a block after the first. */
    instance?: string,
    /** The frame this is and the seconds since the one before. */
    clock?: FrameClock,
  ) => readonly number[] | null;
  /** Lower the drawing buffer's resolution while a frame takes longer than a budget to draw,
   *  and raise it back once frames are cheap. A program too heavy for this GPU then draws at
   *  fewer pixels and leaves the page responsive, where it would otherwise hold every frame
   *  of the page for as long as it takes. The Playground sets this: it runs whatever a reader
   *  writes. */
  readonly adaptive?: boolean;
}

/** A frame drawn once more with its console calls recorded, the compiler's `console: 'gpu'`.
 *  The recorded program arrives as data, like every other program this file runs. */
export interface ConsoleCapture {
  readonly manifest: Pack;
  readonly words: number;
  readonly scissor?: readonly [number, number, number, number];
}

export interface CapturedConsole {
  readonly events: readonly ConsoleEvent[];
  readonly dropped: number;
  readonly width: number;
  readonly height: number;
}

export interface MountedShader {
  /** Which backend is drawing. `'none'` means both failed, or the device was lost after
   *  mount, and the canvas was left transparent over whatever the page paints behind it.
   *  A live getter that always agrees with `canvas.dataset.backend`. */
  readonly backend: Backend;
  /** Frames drawn since mount. Exactly 1, and final, on the still path. */
  readonly frames: number;
  /** Why the last backend tried could not draw, or '' when one did. A page that asked for
   *  one backend by name prints this instead of guessing. */
  readonly failure: string;
  /** The fraction of the box's pixels the drawing buffer holds: 1, unless an adaptive mount
   *  has lowered it. */
  readonly scale: number;
  /** Hold the drawing buffer at the box's full size, or let an adaptive mount steer it again.
   *  A check that compares this canvas with another engine pixel for pixel holds it first, so
   *  the comparison is at the resolution a reader on a fast GPU sees. */
  holdScale(hold: boolean): void;
  /** Run a newly emitted program on the same canvas and the same backend. The pass that is
   *  drawing stays up until the new one has drawn a frame, so a program that fails to build
   *  leaves the last good frame on screen and resolves false. A live example recompiles this
   *  way on every edit. */
  swap(next: ShaderData): Promise<boolean>;
  /** Draw one frame now, at the clock the loop is on. What an `onDemand` mount runs on. */
  redraw(): void;
  /** Hold the frame on the canvas, or let the frames move on again. While it is held, the
   *  loop and `redraw()` draw that frame again, with the frame count it had and, for a
   *  program drawn in several passes, from the same frame before, so a control a reader moves
   *  still shows and a pass that reads its frame before stands still. A host's Pause holds it. */
  holdFrames(hold: boolean): void;
  /** Leave the frame on the canvas and draw nothing more, or draw again. A check that
   *  photographs a canvas a software GPU draws slowly idles it first: a GPU that never rests
   *  composites nothing else, and a page photograph waits on the compositor. */
  idle(on: boolean): void;
  /** The bytes the packer last wrote into the uniform buffer, copied. Empty when the module
   *  binds no block. scripts/check-live.mjs reads it to see a control reach the shader. */
  uniformBytes(): Float32Array;
  /** Draw the frame on the canvas once more from a program that records its console calls,
   *  with the uniforms and resources that frame was drawn with, and read the console buffer
   *  back. The draw goes into a texture of its own, so the canvas keeps its frame. Null on
   *  WebGL2, whose GLSL ES 3.00 has no storage buffer to record into, and once the mount has
   *  stopped. */
  captureConsole(capture: ConsoleCapture): Promise<CapturedConsole | null>;
  /** Start the frame count again from 0, and for a program drawn in several passes drop what
   *  each pass drew, so the frame after reads zeroes as the first frame did. */
  restart(): void;
  /** What the passes of a program drawn in several draw into: `rgba16float`, or `rgba8` where
   *  WebGL2 cannot render to floats. '' for a program drawn in one pass. */
  readonly passFormat: string;
  stop(): void;
}

declare global {
  /** The per-element handle. A page mounts several canvases, so the state a verification run
   *  reads (scripts/capture-stills.ts) hangs off the element, one handle per mount. */
  interface HTMLCanvasElement {
    __shader?: MountedShader;
  }
}

// ── per-frame state: size, clock, uniform packing ───────────────────────────

const fr = Math.fround;
/** A JS double as the two f32 the emulated-double lowering expects: hi + lo. */
const splitF64 = (x: number): [number, number] => [fr(x), fr(x - fr(x))];
/** A vec2<f64> as the compiler's DF64Vec2 lays it out: the hi plane (x, y), then the lo plane. */
const splitF64Pair = (x: number, y: number): [number, number, number, number] => [
  fr(x),
  fr(y),
  fr(x - fr(x)),
  fr(y - fr(y)),
];

interface FrameState {
  /** Packed std140 bytes for the current frame; null when the module binds no block. */
  readonly data: Float32Array<ArrayBuffer> | null;
  readonly byteLength: number;
  /** The blocks after the first, each packed every frame with the first. */
  readonly more: readonly {
    readonly layout: UniformBlockLayout;
    readonly data: Float32Array<ArrayBuffer>;
  }[];
  /** The fraction of the box's device pixels the drawing buffer takes. 1 unless an adaptive
   *  mount has lowered it for a program this GPU draws slowly. */
  scale: number;
  /** Match the drawing buffer to the CSS box × capped DPR × `scale`. True when it changed. */
  resize(): boolean;
  /** Repack every uniform field at shader time `seconds`. */
  pack(seconds: number): void;
  /** The shader time the last `pack` was at, which the passes of a frame are packed at too. */
  readonly seconds: number;
}

/** Writes one field's numbers at its std140 offset in `buf`, under the field's own type.
 *  std140 gives an i32, a u32 and a bool four bytes each, and the shader reads those bytes as
 *  an integer. Writing 3 through the float view would hand it the bit pattern of 3.0, so an
 *  integer field is written through a view of its own over the same buffer. */
function writer(
  buf: Float32Array<ArrayBuffer>,
): (field: UniformField, v: readonly number[]) => void {
  const ints = new Int32Array(buf.buffer);
  const uints = new Uint32Array(buf.buffer);
  return (field, v) => {
    const base = field.offset / 4;
    if (/\b(i32|bool)\b/.test(field.type)) {
      for (let k = 0; k < v.length; k++) ints[base + k] = Math.round(v[k] ?? 0);
      return;
    }
    if (/\bu32\b/.test(field.type)) {
      for (let k = 0; k < v.length; k++) uints[base + k] = Math.max(0, Math.round(v[k] ?? 0));
      return;
    }
    buf.set(v, base);
  };
}

function createFrameState(
  canvas: HTMLCanvasElement,
  data: ShaderData,
  override?: MountOptions['uniformValues'],
  clock: () => FrameClock = () => ({ frame: 0, delta: 0 }),
): FrameState {
  let packedAt = 0;
  const { layout, controls } = data;
  const byteLength = layout.size;
  const buf = byteLength > 0 ? new Float32Array(byteLength / 4) : null;
  const write = buf ? writer(buf) : () => {};
  const more = (layout.moreBlocks ?? [])
    .filter((block) => block.size > 0)
    .map((block) => {
      const blockData = new Float32Array(block.size / 4);
      return { layout: block, data: blockData, write: writer(blockData) };
    });

  /** The live value of a `slider`/`toggle` field by name, `logmag1d` reads its `magField`. */
  const sliderValue = (field: string): number => {
    const c = controls[field];
    if (c?.kind === 'slider') return c.value;
    if (c?.kind === 'toggle') return c.value ? 1 : 0;
    return 0;
  };

  const valueFor = (name: string, type: string, seconds: number): readonly number[] | null => {
    const c = controls[name];
    if (!c) return null; // declared but uncontrolled → leave the zeros already in the buffer
    switch (c.kind) {
      case 'time':
        return [seconds];
      case 'resolution':
        return [canvas.width, canvas.height];
      case 'mouse':
        return type === 'vec2<f32>' ? [0.5, 0.5] : [0, 0, 0, 0];
      case 'frame':
        return [clock().frame];
      case 'timeDelta':
        return [clock().delta];
      case 'const':
        return c.value;
      case 'slider':
        return [c.value];
      case 'toggle':
        return [c.value ? 1 : 0];
      case 'logmag1d':
        return splitF64(c.base * Math.pow(10, sliderValue(c.magField)) + c.offset);
      case 'pan2d':
        return splitF64Pair(c.value[0], c.value[1]);
      case 'logmag2d': {
        const scale = Math.pow(10, sliderValue(c.magField));
        return splitF64Pair(c.base[0] * scale + c.offset[0], c.base[1] * scale + c.offset[1]);
      }
    }
  };

  return {
    data: buf,
    byteLength,
    more,
    scale: 1,
    resize(): boolean {
      // A canvas with no box, its panel hidden, keeps the size it was drawn at. Its frame is
      // the one the reader last saw, and a console capture reads that frame at that size.
      if (canvas.clientWidth === 0 && canvas.clientHeight === 0) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * this.scale;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return false;
      canvas.width = w;
      canvas.height = h;
      return true;
    },
    get seconds(): number {
      return packedAt;
    },
    pack(seconds: number): void {
      packedAt = seconds;
      const now = clock();
      if (buf) {
        for (const f of layout.fields) {
          const v =
            override?.(f.name, seconds, undefined, now) ?? valueFor(f.name, f.type, seconds);
          if (v) write(f, v);
        }
      }
      // A later block has no controls of its own: only the host's values reach it.
      for (const block of more) {
        for (const f of block.layout.fields) {
          const v = override?.(f.name, seconds, block.layout.instance, now);
          if (v) block.write(f, v);
        }
      }
    },
  };
}

// ── backends ────────────────────────────────────────────────────────────────

/** One compiled, bound, ready-to-draw fullscreen pass. */
interface Pass {
  /** Draw the next frame, or with `again` the frame last drawn once more: a program drawn in
   *  several passes writes the textures it wrote then and reads the frame before it read. */
  draw(again?: boolean): void;
  /** Whether the frame last submitted is still being drawn. The loop waits for it, so the GPU
   *  is never handed a second frame while the first is running. */
  busy(): boolean;
  /** How long the last frame the GPU finished took, submit to done, in milliseconds. */
  lastFrameMs(): number;
  /** Drop this pass's own objects. `release` also gives up the canvas's rendering context,
   *  which is what puts the canvas back to transparent; a swap passes false, so the frame the
   *  old pass drew stays on screen until the new pass draws over it. */
  dispose(release: boolean): void;
  /** Register a handler for device/context loss, the loop stops and the canvas goes clear. */
  onLost(handler: () => void): void;
  /** The frame this pass last drew, drawn once more with its console recorded. Only a backend
   *  with storage buffers has it. */
  captureConsole?(capture: ConsoleCapture): Promise<CapturedConsole>;
  /** Drop every pass's output, so the next frame reads zeroes where it would read the frame
   *  before. Only a program drawn in several passes has any. */
  reset?(): void;
  /** The format the passes draw into, or '' for a program drawn in one. */
  readonly passFormat?: string;
}

// One WebGPU device for the whole page. A guide page mounts several canvases and a live
// example rebuilds its pipeline on every edit; a device per pass would ask the driver for a
// new one each time. The promise is cached, and a lost device clears the cache so the next
// mount asks for a fresh one.
let devicePromise: Promise<GPUDevice | null> | null = null;

/** The WebGPU features the shared device was asked for. A module that needs one it lacks
 *  gets a new device with the union; the old one stays with the mounts already on it. */
let deviceFeatures: readonly string[] = [];

/** The page's WebGPU device, holding every optional feature in `features`. A feature the
 *  adapter does not offer is refused by name, and the device every other canvas is drawing
 *  on is left as it was. */
export function sharedDevice(features: readonly string[] = []): Promise<GPUDevice | null> {
  const wanted = [...new Set([...deviceFeatures, ...features])];
  if (devicePromise && wanted.length === deviceFeatures.length) return devicePromise;
  const pending = (async (): Promise<GPUDevice | null> => {
    // `in` alone is not enough: a browser can carry the property and hold nothing in it.
    if (typeof navigator === 'undefined' || !('gpu' in navigator) || !navigator.gpu) return null;
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    const absent = features.filter((f) => !adapter.features.has(f));
    if (absent.length > 0) throw new Error(`missing WebGPU feature: ${absent.join(', ')}`);
    const device = await adapter.requestDevice(
      wanted.length > 0 ? { requiredFeatures: wanted as GPUFeatureName[] } : undefined,
    );
    void device.lost.then(() => {
      if (devicePromise === pending) {
        devicePromise = null;
        deviceFeatures = [];
      }
    });
    return device;
  })();
  const previous = devicePromise;
  const previousFeatures = deviceFeatures;
  devicePromise = pending;
  deviceFeatures = wanted;
  // A failed request must not be remembered: the next mount asks again, and a device that
  // was working before it goes on serving.
  void pending.catch(() => {
    if (devicePromise === pending) {
      devicePromise = previous;
      deviceFeatures = previousFeatures;
    }
  });
  return pending;
}

// Building a pipeline reads an error scope off the device, and an error scope is a stack the
// whole device shares. Two mounts building at once would pop each other's scope, so building
// runs one at a time.
let buildQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(build: () => Promise<T>): Promise<T> {
  const next = buildQueue.then(build, build);
  buildQueue = next.catch(() => {});
  return next;
}

const WHITE_TEXEL = new Uint8Array([255, 255, 255, 255]);

// Keep compressed source bytes shared across mounts and edits. Decoded images belong to
// one upload and are closed immediately; neither payloads nor this cache own GPU objects.
const textureImages = new Map<string, Promise<Blob>>();
async function textureImage(spec: TextureSpec): Promise<ImageBitmap | null> {
  if (spec.imageUrl === undefined) return null;
  if (spec.dim !== '2d' || spec.sample !== 'float' || spec.layers !== 1 || spec.pass !== undefined)
    throw new Error(`'${spec.name}' image requires a single-layer float 2D texture`);
  let bytes = textureImages.get(spec.imageUrl);
  if (!bytes) {
    const url = spec.imageUrl;
    bytes = fetch(url).then((response) => {
      if (!response.ok)
        throw new Error(`Cannot load image for '${spec.name}' (${response.status})`);
      return response.blob();
    });
    textureImages.set(url, bytes);
    void bytes.catch(() => textureImages.delete(url));
  }
  try {
    return await createImageBitmap(await bytes, {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
  } catch (error) {
    // Discard undecodable bytes so the next mount can retry.
    textureImages.delete(spec.imageUrl);
    throw error;
  }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? '';
    gl.deleteShader(sh);
    throw new Error(log || 'GLSL compile failed');
  }
  return sh;
}

// ── resources the reader binds ──────────────────────────────────────────────

interface GlTextures {
  /** Put every texture and sampler back on its unit. A program that shares its context with
   *  the other passes of a frame finds the units as the last pass left them. */
  rebind(): void;
  dispose(): void;
}

/** What a pass draws into and reads beside its own resources, when it is one of several drawn
 *  each frame (compiler change 0026). A pass drawn alone has neither. */
interface GlPassIo {
  /** The framebuffer this pass draws into; null is the canvas. */
  readonly target?: () => WebGLFramebuffer | null;
  /** The texture a binding named like a pass reads this frame. */
  readonly readPass?: (name: string) => WebGLTexture | null;
}

/** The sampler a WebGL2 texture unit reads through. GLSL pairs a texture with its sampler at
 *  emit and keeps one name, so the pairing is by kind: a depth texture takes the comparison
 *  sampler when the module has one, every other texture the first plain sampler. */
function samplerFor(
  texture: TextureSpec,
  samplers: readonly SamplerSpec[],
): SamplerSpec | undefined {
  if (texture.sample === 'depth')
    return samplers.find((s) => s.comparison) ?? samplers.find((s) => !s.comparison);
  return samplers.find((s) => !s.comparison);
}

const GL_WRAP = (gl: WebGL2RenderingContext, mode: SamplerSpec['address']): number =>
  mode === 'repeat' ? gl.REPEAT : mode === 'mirror-repeat' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;

function bindGlTextures(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  resources: readonly ResourceSpec[],
  firstUnit: number,
  readPass?: (name: string) => WebGLTexture | null,
  images: ReadonlyMap<TextureSpec, ImageBitmap> = new Map(),
): GlTextures {
  const textures: WebGLTexture[] = [];
  const samplers: WebGLSampler[] = [];
  /** Each unit this program reads, with what goes on it: its own texture, or a pass's. */
  const units: {
    unit: number;
    target: number;
    texture: WebGLTexture | null;
    pass?: string;
    sampler: WebGLSampler;
  }[] = [];
  const dispose = (): void => {
    for (const t of textures) gl.deleteTexture(t);
    for (const s of samplers) gl.deleteSampler(s);
  };
  const specs = resources.filter((r): r is TextureSpec => r.kind === 'texture');
  const samplerSpecs = resources.filter((r): r is SamplerSpec => r.kind === 'sampler');
  try {
    specs.forEach((spec, i) => {
      const loc = gl.getUniformLocation(prog, spec.name);
      // A texture the emitted GLSL never reads has no uniform: nothing to bind.
      if (!loc) return;
      const unit = firstUnit + i;
      const target =
        spec.dim === '2d'
          ? gl.TEXTURE_2D
          : spec.dim === '2d-array'
            ? gl.TEXTURE_2D_ARRAY
            : spec.dim === 'cube'
              ? gl.TEXTURE_CUBE_MAP
              : spec.dim === '3d'
                ? gl.TEXTURE_3D
                : null;
      if (target === null) throw new Error(`WebGL2 has no ${spec.dim} texture for '${spec.name}'`);
      if (spec.pass !== undefined) {
        // A pass's output: the composite owns the texture and hands this frame's one to
        // `rebind`. Only the sampler state is this program's.
        const chosen = samplerFor(spec, samplerSpecs);
        const sampler = gl.createSampler();
        if (!sampler) throw new Error('createSampler failed');
        samplers.push(sampler);
        const filter = chosen?.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
        gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, filter);
        gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, filter);
        const wrap = GL_WRAP(gl, chosen?.address ?? 'clamp-to-edge');
        gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, wrap);
        gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, wrap);
        gl.uniform1i(loc, unit);
        units.push({ unit, target, texture: null, pass: spec.pass, sampler });
        return;
      }
      const tex = gl.createTexture();
      if (!tex) throw new Error('createTexture failed');
      textures.push(tex);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      const depth = spec.sample === 'depth';
      const internal = depth
        ? gl.DEPTH_COMPONENT32F
        : spec.sample === 'uint'
          ? gl.RGBA8UI
          : spec.sample === 'sint'
            ? gl.RGBA8I
            : gl.RGBA8;
      const format = depth
        ? gl.DEPTH_COMPONENT
        : spec.sample === 'float'
          ? gl.RGBA
          : gl.RGBA_INTEGER;
      const type = depth ? gl.FLOAT : spec.sample === 'sint' ? gl.BYTE : gl.UNSIGNED_BYTE;
      const layer = (k: number): ArrayBufferView => {
        if (depth) return spec.depth![k]!;
        const bytes = spec.texels[k]!;
        return spec.sample === 'sint'
          ? new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length)
          : bytes;
      };
      if (target === gl.TEXTURE_2D) {
        const image = images.get(spec);
        if (image) {
          const limit = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
          if (image.width > limit || image.height > limit)
            throw new Error(`Image for '${spec.name}' exceeds the WebGL2 texture size limit`);
          gl.texImage2D(target, 0, internal, format, type, image);
        } else {
          gl.texImage2D(target, 0, internal, spec.width, spec.height, 0, format, type, layer(0));
        }
      } else if (target === gl.TEXTURE_CUBE_MAP) {
        for (let f = 0; f < 6; f++) {
          gl.texImage2D(
            gl.TEXTURE_CUBE_MAP_POSITIVE_X + f,
            0,
            internal,
            spec.width,
            spec.height,
            0,
            format,
            type,
            layer(f),
          );
        }
      } else {
        gl.texImage3D(
          target,
          0,
          internal,
          spec.width,
          spec.height,
          spec.layers,
          0,
          format,
          type,
          null,
        );
        for (let k = 0; k < spec.layers; k++) {
          gl.texSubImage3D(target, 0, 0, 0, k, spec.width, spec.height, 1, format, type, layer(k));
        }
      }
      gl.texParameteri(target, gl.TEXTURE_MAX_LEVEL, 0);
      const chosen = samplerFor(spec, samplerSpecs);
      const sampler = gl.createSampler();
      if (!sampler) throw new Error('createSampler failed');
      samplers.push(sampler);
      // A depth or an integer texture is not filterable in WebGL2, so it reads nearest
      // whatever the reader picked; linear on one of them leaves the unit incomplete and
      // every read returns zero.
      const filter =
        chosen?.filter === 'linear' && spec.sample === 'float' ? gl.LINEAR : gl.NEAREST;
      gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, filter);
      gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, filter);
      const wrap = GL_WRAP(gl, chosen?.address ?? 'clamp-to-edge');
      gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, wrap);
      gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, wrap);
      gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_R, wrap);
      if (depth && chosen?.comparison) {
        gl.samplerParameteri(sampler, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.samplerParameteri(sampler, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      }
      gl.bindSampler(unit, sampler);
      gl.uniform1i(loc, unit);
      units.push({ unit, target, texture: tex, sampler });
    });
  } catch (error) {
    dispose();
    throw error;
  }
  const rebind = (): void => {
    for (const u of units) {
      gl.activeTexture(gl.TEXTURE0 + u.unit);
      gl.bindTexture(u.target, u.pass !== undefined ? (readPass?.(u.pass) ?? null) : u.texture);
      gl.bindSampler(u.unit, u.sampler);
    }
    gl.activeTexture(gl.TEXTURE0);
  };
  return { rebind, dispose };
}

async function createWebGl2Pass(
  canvas: HTMLCanvasElement,
  data: ShaderData,
  state: FrameState,
  io: GlPassIo = {},
): Promise<Pass> {
  const images = new Map<TextureSpec, ImageBitmap>();
  try {
    for (const resource of data.layout.resources ?? []) {
      if (resource.kind !== 'texture') continue;
      const image = await textureImage(resource);
      if (image) images.set(resource, image);
    }
    // No asynchronous work occurs while GL state is being assembled: the previous pass
    // may still render during image loading without changing a half-built pass's state.
    return createWebGl2PassReady(canvas, data, state, io, images);
  } finally {
    for (const image of images.values()) image.close();
  }
}

function createWebGl2PassReady(
  canvas: HTMLCanvasElement,
  data: ShaderData,
  state: FrameState,
  io: GlPassIo = {},
  images: ReadonlyMap<TextureSpec, ImageBitmap> = new Map(),
): Pass {
  // alpha:true + a transparent clear: a pass that stops drawing reveals the page behind it.
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false });
  if (!gl) throw new Error('no WebGL2 context');

  // Every object made from here is dropped if a later step throws: a live example rebuilds
  // its pass on every edit, and a leaked program per failed edit is a leak per keystroke.
  const built: { vs?: WebGLShader; fs?: WebGLShader; prog?: WebGLProgram } = {};
  const abandon = (error: unknown): never => {
    if (built.prog) gl.deleteProgram(built.prog);
    if (built.vs) gl.deleteShader(built.vs);
    if (built.fs) gl.deleteShader(built.fs);
    throw error;
  };
  let vs: WebGLShader;
  let fs: WebGLShader;
  let prog: WebGLProgram;
  try {
    vs = built.vs = compile(gl, gl.VERTEX_SHADER, data.vertex);
    fs = built.fs = compile(gl, gl.FRAGMENT_SHADER, data.fragment);
    const created = gl.createProgram();
    if (!created) throw new Error('createProgram failed');
    prog = built.prog = created;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'GLSL link failed');
    }
  } catch (error) {
    return abandon(error);
  }
  gl.useProgram(prog);

  let ubo: WebGLBuffer | null = null;
  if (state.data) {
    // GLSL binds the block by the struct name reflect() reported, see ShaderLayout.block.
    const idx = gl.getUniformBlockIndex(prog, data.layout.block);
    if (idx === gl.INVALID_INDEX) abandon(new Error(`no uniform block '${data.layout.block}'`));
    ubo = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, state.byteLength, gl.DYNAMIC_DRAW);
    gl.uniformBlockBinding(prog, idx, 0);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);
  }
  // Every later block on a binding point of its own, after the first block's 0. A block the
  // linked program does not read has no index and nothing to bind.
  const moreUbos: { ubo: WebGLBuffer; data: Float32Array<ArrayBuffer> }[] = [];
  state.more.forEach((block, i) => {
    const idx = gl.getUniformBlockIndex(prog, block.layout.block);
    if (idx === gl.INVALID_INDEX) return;
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, block.data.byteLength, gl.DYNAMIC_DRAW);
    gl.uniformBlockBinding(prog, idx, i + 1);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, i + 1, buffer);
    moreUbos.push({ ubo: buffer, data: block.data });
  });

  // The compiler's fp64 fast-math guard: a 1×1 white texel the emitted df64 helpers multiply
  // by, so no driver can constant-fold the error terms away.
  const guards: WebGLTexture[] = [];
  const guardUnits: number[] = [];
  data.layout.textures.forEach((t, i) => {
    const loc = gl.getUniformLocation(prog, t.name);
    if (!loc) return;
    const tex = gl.createTexture();
    if (!tex) return;
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, WHITE_TEXEL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(loc, i);
    guards.push(tex);
    guardUnits.push(i);
  });
  // The textures the reader bound, each on a unit after the guards, with the sampler it is
  // read through. GLSL ES 3.00 has no separate sampler: the emit folds each texture and its
  // sampler into one `sampler2D`, so the sampler's state goes on the unit as a sampler object.
  let bound: GlTextures;
  try {
    bound = bindGlTextures(
      gl,
      prog,
      data.layout.resources ?? [],
      data.layout.textures.length,
      io.readPass,
      images,
    );
  } catch (error) {
    for (const t of guards) gl.deleteTexture(t);
    if (ubo) gl.deleteBuffer(ubo);
    for (const m of moreUbos) gl.deleteBuffer(m.ubo);
    return abandon(error);
  }
  gl.activeTexture(gl.TEXTURE0);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  // The reader's vertices, when the vertex entry reads them. GLSL declares each input with
  // its `layout(location = n)`, so the attribute is bound by that number.
  let vbo: WebGLBuffer | null = null;
  const vertices = data.layout.vertexBuffer;
  if (vertices) {
    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices.data, gl.STATIC_DRAW);
    for (const a of vertices.attributes) {
      gl.enableVertexAttribArray(a.location);
      gl.vertexAttribPointer(a.location, a.components, gl.FLOAT, false, vertices.stride, a.offset);
    }
  }

  // A fence after each frame says when the GPU has finished it.
  let fence: WebGLSync | null = null;
  let submitted = 0;
  let frameMs = 0;
  /** The binding point each later block went on, beside the first block's 0. */
  const morePoints = moreUbos.map((_, i) => i + 1);
  return {
    draw(): void {
      // Every piece of state this program reads goes back on the context first: the other
      // passes of a frame (change 0026) share it and leave their own program, vertex array,
      // blocks and units behind. A program drawn alone finds them as it left them.
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      if (ubo && state.data) {
        gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, state.data);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);
      }
      moreUbos.forEach((m, i) => {
        gl.bindBuffer(gl.UNIFORM_BUFFER, m.ubo);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, m.data);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, morePoints[i]!, m.ubo);
      });
      guards.forEach((t, i) => {
        const unit = guardUnits[i]!;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.bindSampler(unit, null);
      });
      bound.rebind();
      gl.bindFramebuffer(gl.FRAMEBUFFER, io.target?.() ?? null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (fence) gl.deleteSync(fence);
      fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      submitted = performance.now();
      gl.flush();
    },
    busy(): boolean {
      if (!fence) return false;
      if (gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) return true;
      gl.deleteSync(fence);
      fence = null;
      frameMs = performance.now() - submitted;
      return false;
    },
    lastFrameMs: () => frameMs,
    dispose(release: boolean): void {
      // Clear before tearing down, so a stopped mount shows the still image beneath it. A
      // swap keeps the frame: the new pass is about to draw over it.
      if (release) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      if (fence) gl.deleteSync(fence);
      for (const t of guards) gl.deleteTexture(t);
      bound.dispose();
      if (vbo) gl.deleteBuffer(vbo);
      if (ubo) gl.deleteBuffer(ubo);
      for (const m of moreUbos) gl.deleteBuffer(m.ubo);
      if (vao) gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (release) gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
    onLost(handler): void {
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        handler();
      });
    },
  };
}

/** The layout entry one of the reader's resources takes. A resource a render pass writes is
 *  visible to the fragment stage alone, since WebGPU gives the vertex stage no writable
 *  storage. */
export function gpuLayoutEntry(r: ResourceSpec, visibility: number): GPUBindGroupLayoutEntry {
  const writable =
    (r.kind === 'storage-buffer' && !r.readOnly) ||
    (r.kind === 'storage-texture' && r.access !== 'read-only');
  const stages = writable ? visibility & ~GPUShaderStage.VERTEX : visibility;
  switch (r.kind) {
    case 'texture':
      return {
        binding: r.binding,
        visibility: stages,
        texture: {
          // A multisampled float texture cannot be filtered, and WebGPU asks for it by name.
          sampleType:
            r.sample === 'float' ? (r.dim === '2d-ms' ? 'unfilterable-float' : 'float') : r.sample,
          viewDimension: r.dim === '2d-ms' ? '2d' : r.dim,
          multisampled: r.dim === '2d-ms',
        },
      };
    case 'sampler':
      return {
        binding: r.binding,
        visibility: stages,
        sampler: {
          type: r.comparison ? 'comparison' : r.filter === 'linear' ? 'filtering' : 'non-filtering',
        },
      };
    case 'storage-buffer':
      return {
        binding: r.binding,
        visibility: stages,
        buffer: { type: r.readOnly ? 'read-only-storage' : 'storage' },
      };
    case 'storage-texture':
      return {
        binding: r.binding,
        visibility: stages,
        storageTexture: {
          access: r.access,
          format: r.format as GPUTextureFormat,
          viewDimension: '2d',
        },
      };
    case 'uniform-buffer':
      return { binding: r.binding, visibility: stages, buffer: { type: 'uniform' } };
  }
}

const align = (n: number, to: number): number => Math.ceil(Math.max(n, to) / to) * to;

/** The two small programs that fill a texture WebGPU will not take bytes for: a depth texture,
 *  which no copy may write, and a multisampled one, which only a render pass can. Each draws
 *  one fullscreen triangle per layer and reads the layer it is on from the instance index. */
const FILL_VERTEX = `struct V { @builtin(position) p: vec4f, @location(0) @interpolate(flat) layer: u32 }
@vertex fn vs(@builtin(vertex_index) i: u32, @builtin(instance_index) layer: u32) -> V {
  let x = select(-1.0, 3.0, i == 1u);
  let y = select(-1.0, 3.0, i == 2u);
  return V(vec4f(x, y, 0.5, 1.0), layer);
}
`;
const FILL_DEPTH = `${FILL_VERTEX}@group(0) @binding(0) var src: texture_2d_array<f32>;
@fragment fn fs(v: V) -> @builtin(frag_depth) f32 {
  return textureLoad(src, vec2i(v.p.xy), i32(v.layer), 0).r;
}
`;
const FILL_COLOUR = `${FILL_VERTEX}@group(0) @binding(0) var src: texture_2d_array<f32>;
@fragment fn fs(v: V) -> @location(0) vec4f {
  return textureLoad(src, vec2i(v.p.xy), i32(v.layer), 0);
}
`;

const fillPipelines = new WeakMap<GPUDevice, Map<string, GPURenderPipeline>>();

function fillPipeline(device: GPUDevice, depth: boolean, samples: number): GPURenderPipeline {
  let cache = fillPipelines.get(device);
  if (!cache) fillPipelines.set(device, (cache = new Map()));
  const key = `${depth ? 'depth' : 'colour'}/${samples}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const module = device.createShaderModule({ code: depth ? FILL_DEPTH : FILL_COLOUR });
  const made = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: depth ? [] : [{ format: 'rgba8unorm' }] },
    primitive: { topology: 'triangle-list' },
    multisample: { count: samples },
    ...(depth
      ? {
          depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'always' },
        }
      : {}),
  });
  cache.set(key, made);
  return made;
}

/** A texture as the reader chose it: written byte for byte where WebGPU allows that, and drawn
 *  into from a staging copy where it does not. */
function gpuTexture(device: GPUDevice, spec: TextureSpec): GPUTexture {
  const depth = spec.sample === 'depth';
  const samples = spec.dim === '2d-ms' ? 4 : 1;
  const drawn = depth || samples > 1;
  const format: GPUTextureFormat = depth
    ? 'depth32float'
    : spec.sample === 'uint'
      ? 'rgba8uint'
      : spec.sample === 'sint'
        ? 'rgba8sint'
        : 'rgba8unorm';
  const texture = device.createTexture({
    size: [spec.width, spec.height, spec.dim === '1d' ? 1 : spec.layers],
    dimension: spec.dim === '1d' ? '1d' : spec.dim === '3d' ? '3d' : '2d',
    format,
    sampleCount: samples,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      (drawn ? GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.COPY_DST),
  });
  if (!drawn) {
    for (let k = 0; k < spec.layers; k++) {
      device.queue.writeTexture(
        { texture, origin: [0, 0, k] },
        spec.texels[k]!,
        { bytesPerRow: spec.width * 4, rowsPerImage: spec.height },
        [spec.width, spec.height, 1],
      );
    }
    return texture;
  }
  // The staging copy is float per texel for depth and RGBA8 for colour, in a 2d array the
  // fill program reads a layer of at a time.
  const staging = device.createTexture({
    size: [spec.width, spec.height, spec.layers],
    format: depth ? 'r32float' : 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  for (let k = 0; k < spec.layers; k++) {
    const bytes = depth ? spec.depth![k]! : spec.texels[k]!;
    device.queue.writeTexture(
      { texture: staging, origin: [0, 0, k] },
      bytes,
      { bytesPerRow: spec.width * 4, rowsPerImage: spec.height },
      [spec.width, spec.height, 1],
    );
  }
  const pipeline = fillPipeline(device, depth, samples);
  const group = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: staging.createView({ dimension: '2d-array' }) }],
  });
  const encoder = device.createCommandEncoder();
  for (let k = 0; k < spec.layers; k++) {
    const view = texture.createView({ dimension: '2d', baseArrayLayer: k, arrayLayerCount: 1 });
    const pass = encoder.beginRenderPass(
      depth
        ? {
            colorAttachments: [],
            depthStencilAttachment: {
              view,
              depthClearValue: 1,
              depthLoadOp: 'clear',
              depthStoreOp: 'store',
            },
          }
        : {
            colorAttachments: [
              { view, clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store' },
            ],
          },
    );
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.draw(3, 1, 0, k);
    pass.end();
  }
  device.queue.submit([encoder.finish()]);
  staging.destroy();
  return texture;
}

/** One of the reader's resources as a WebGPU object, and what to destroy with the pass. */
export async function gpuResource(
  device: GPUDevice,
  r: ResourceSpec,
): Promise<{ resource: GPUBindingResource; owned?: { destroy(): void } }> {
  switch (r.kind) {
    case 'texture': {
      if (r.imageUrl !== undefined) {
        const image = await textureImage(r);
        let texture: GPUTexture | undefined;
        try {
          if (!image) throw new Error(`No image for '${r.name}'`);
          const limit = device.limits.maxTextureDimension2D;
          if (image.width > limit || image.height > limit)
            throw new Error(`Image for '${r.name}' exceeds the WebGPU texture size limit`);
          texture = device.createTexture({
            size: [image.width, image.height],
            format: 'rgba8unorm',
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_DST |
              GPUTextureUsage.RENDER_ATTACHMENT,
          });
          device.queue.copyExternalImageToTexture({ source: image }, { texture }, [
            image.width,
            image.height,
          ]);
          return { resource: texture.createView(), owned: texture };
        } catch (error) {
          texture?.destroy();
          throw error;
        } finally {
          image?.close();
        }
      }
      const texture = gpuTexture(device, r);
      const dimension = r.dim === '2d-ms' ? '2d' : r.dim;
      return { resource: texture.createView({ dimension }), owned: texture };
    }
    case 'sampler':
      return {
        resource: device.createSampler({
          magFilter: r.filter,
          minFilter: r.filter,
          addressModeU: r.address,
          addressModeV: r.address,
          addressModeW: r.address,
          ...(r.comparison ? { compare: 'less-equal' as const } : {}),
        }),
      };
    case 'storage-buffer':
    case 'uniform-buffer': {
      const buffer = device.createBuffer({
        size: align(r.bytes.length, r.kind === 'uniform-buffer' ? 16 : 4),
        usage:
          (r.kind === 'uniform-buffer' ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE) |
          GPUBufferUsage.COPY_DST |
          GPUBufferUsage.COPY_SRC,
      });
      if (r.bytes.length > 0)
        device.queue.writeBuffer(buffer, 0, r.bytes, 0, r.bytes.length - (r.bytes.length % 4));
      return { resource: { buffer }, owned: buffer };
    }
    case 'storage-texture': {
      const texture = device.createTexture({
        size: [r.width, r.height],
        format: r.format as GPUTextureFormat,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
      });
      return { resource: texture.createView(), owned: texture };
    }
  }
}

/** What a WebGPU pass draws into and reads beside its own resources, when it is one of
 *  several drawn each frame (compiler change 0026). A pass drawn alone has neither. */
interface GpuPassIo {
  /** The texture this pass draws into, in place of the canvas. */
  readonly target?: { readonly format: GPUTextureFormat; view(): GPUTextureView };
  /** The texture view a binding named like a pass reads this frame. */
  readonly readPass?: (name: string) => GPUTextureView | null;
}

async function createWebGpuPass(
  canvas: HTMLCanvasElement,
  data: ShaderData,
  state: FrameState,
  io: GpuPassIo = {},
): Promise<Pass> {
  const device = await sharedDevice(data.manifest.features);
  if (!device) throw new Error('no WebGPU device');
  const format = io.target?.format ?? navigator.gpu.getPreferredCanvasFormat();
  const renderState = {
    vertex: data.layout.vertexEntry,
    fragment: data.layout.fragmentEntry,
    targets: [format],
    constants: data.constants,
  };
  const { runtime, pipeline } = await renderProgram(
    device,
    data.manifest,
    renderState.vertex,
    renderState.fragment,
    format,
    data.constants,
  );
  const resources: Record<string, unknown> = {};
  const owned: { destroy(): void }[] = [];
  const passTextures: { name: string; pass: string }[] = [];
  try {
    for (const r of data.layout.resources ?? []) {
      if (r.kind === 'texture' && r.pass !== undefined) {
        passTextures.push({ name: r.name, pass: r.pass });
        continue;
      }
      const made = await gpuResource(device, r);
      if (made.owned) owned.push(made.owned);
      resources[r.name] = 'buffer' in made.resource ? made.resource.buffer : made.resource;
    }
  } catch (error) {
    for (const o of owned) o.destroy();
    runtime.destroy();
    throw error;
  }
  const ctx = io.target ? null : canvas.getContext('webgpu');
  if (!io.target && !ctx) {
    for (const o of owned) o.destroy();
    runtime.destroy();
    throw new Error('no WebGPU canvas context');
  }
  ctx?.configure({ device, format, alphaMode: 'premultiplied' });
  const targetView = (): GPUTextureView =>
    io.target ? io.target.view() : ctx!.getCurrentTexture().createView();
  const geometry = { count: 3, vertices: data.layout.vertexBuffer?.data };
  const bindingsNow = (manifest: Pack): Record<string, unknown> => {
    const values = { ...resources, ...uniformBindings(manifest, data.layout, state) };
    for (const t of passTextures) {
      const view = io.readPass?.(t.pass);
      if (!view) throw new Error(`no output for the pass '${t.pass}'`);
      values[t.name] = view;
    }
    return reachedBindings(manifest, renderState.vertex, renderState.fragment, values);
  };
  let disposed = false;
  let inFlight = false;
  let frameMs = 0;
  let lost: (() => void) | undefined;
  let failed: unknown;
  return {
    busy() {
      if (failed) throw failed;
      return inFlight;
    },
    lastFrameMs: () => frameMs,
    draw() {
      if (disposed) return;
      const frame = runtime.frame();
      frame.pass({ color: [targetView()] }, (pass) =>
        pass.draw(pipeline, bindingsNow(data.manifest), geometry),
      );
      const started = performance.now();
      inFlight = true;
      void frame.submit().then(
        () => {
          inFlight = false;
          frameMs = performance.now() - started;
        },
        (error: unknown) => {
          inFlight = false;
          failed = error;
          lost?.();
        },
      );
    },
    async captureConsole(capture) {
      if (disposed) throw new Error('the program on the canvas has been replaced');
      const values = bindingsNow(capture.manifest);
      const width = canvas.width;
      const height = canvas.height;
      return captureRenderFrame(
        device,
        capture.manifest,
        renderState,
        values,
        geometry,
        width,
        height,
        capture.words,
        capture.scissor,
      );
    },
    dispose(release) {
      disposed = true;
      for (const o of owned) o.destroy();
      runtime.destroy();
      if (release) ctx?.unconfigure();
    },
    onLost(handler) {
      lost = handler;
      void device.lost.then(() => {
        if (!disposed) handler();
      });
    },
  };
}

// ── mount ───────────────────────────────────────────────────────────────────

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const forceGl2FromUrl = (): boolean =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('forcegl2') === '1';

/** Which state's strings this mount prints. `'none'` has no still variant: there is no frame
 *  to be still about. */
const labelStateOf = (backend: Backend, still: boolean): LabelState =>
  backend === 'none' ? 'none' : still ? (`still-${backend}` as LabelState) : backend;

/**
 * Compile and run one build-time-emitted example on this canvas: WebGPU when a device is
 * reachable, else WebGL2, else nothing at all, the canvas is left transparent so the page's
 * own background shows through. Never a black box, and no exception reaches the console.
 *
 * The canvas gets `data-backend` and the handle at `canvas.__shader`.
 */
export async function mountShader(
  canvas: HTMLCanvasElement,
  data: ShaderData,
  opts: MountOptions = {},
): Promise<MountedShader> {
  /** The frame count and the step since the frame before, which `frame` and `timeDelta` read.
   *  `last` is null before the first frame and after a restart, when the step is 0. */
  const clock = { frame: 0, delta: 0, last: null as number | null };
  const readClock = (): FrameClock => ({ frame: clock.frame, delta: clock.delta });
  let state = createFrameState(canvas, data, opts.uniformValues, readClock);
  const still = opts.still === true || (prefersReducedMotion() && opts.interactive !== true);
  const skipWebGpu = opts.forceWebGl2 === true || forceGl2FromUrl();
  state.resize();

  /** Caption and accessible name, written from one value in one tick , so no string on this
   *  mount can name a backend that is not the one in `data-backend`. */
  const applyLabels = (labelState: LabelState): void => {
    const l = opts.labels;
    if (!l) return;
    if (l.caption?.el) l.caption.el.textContent = l.caption.text[labelState];
    if (l.ariaLabel) canvas.setAttribute('aria-label', l.ariaLabel[labelState]);
  };

  const qa = { backend: 'none' as Backend, frames: 0, failure: '' };
  /** Draw one frame at `seconds`, counting it. The first call is also the backend's audition:
   *  a pass that compiled but cannot draw throws here and the next backend gets its turn. */
  const drawOnce = (pass: Pass, frame: FrameState, seconds: number, again = false): void => {
    // The frame last drawn, drawn once more: its own frame count and step, and its passes'
    // textures as they were. Before the first frame there is none, and this draws the first.
    if (again && clock.last !== null) {
      clock.frame--;
      try {
        frame.pack(seconds);
        pass.draw(true);
      } finally {
        clock.frame++;
      }
      qa.frames++;
      return;
    }
    clock.delta = clock.last === null ? 0 : Math.max(0, seconds - clock.last);
    clock.last = seconds;
    frame.pack(seconds);
    pass.draw();
    qa.frames++;
    clock.frame++;
  };
  /** Whether the frame on the canvas is held: drawn again, and the next not drawn. */
  let held = false;

  /** A program drawn in several passes (compiler change 0026) as one pass: each of its passes
   *  draws into a texture the size of the canvas, in order, and then the program draws into
   *  the canvas. A pass has two textures, written in turn, so a reader of the pass itself or of
   *  a later one gets the frame before's and a reader of an earlier one gets this frame's. */
  const buildMultipass = async (
    backend: 'webgpu' | 'webgl2',
    d: ShaderData,
    frame: FrameState,
  ): Promise<Pass> => {
    const passes = d.passes ?? [];
    const states = passes.map((p) => createFrameState(canvas, p, opts.uniformValues, readClock));
    /** Which of each pass's two textures this frame writes. */
    let parity = 0;
    const indexOf = (name: string): number => passes.findIndex((p) => p.name === name);
    /** The texture `reader` (a pass's index, or `passes.length` for the program) reads as `name`. */
    const slot = (reader: number, name: string): [number, number] | null => {
      const j = indexOf(name);
      return j < 0 ? null : [j, j < reader ? parity : 1 - parity];
    };
    const subs: Pass[] = [];
    let main: Pass;
    let passFormat: string;
    let ensure: () => void;
    let drop: () => void;
    if (backend === 'webgpu') {
      const device = await sharedDevice([
        ...d.manifest.features,
        ...passes.flatMap((p) => p.manifest.features),
      ]);
      if (!device) throw new Error('no WebGPU device');
      const format: GPUTextureFormat = 'rgba16float';
      passFormat = format;
      let textures: GPUTexture[][] = [];
      let size = '';
      drop = () => {
        for (const pair of textures) for (const t of pair) t.destroy();
        textures = [];
        size = '';
      };
      ensure = () => {
        const want = `${String(canvas.width)}x${String(canvas.height)}`;
        if (want === size && textures.length > 0) return;
        drop();
        textures = passes.map(() =>
          [0, 1].map(() =>
            device.createTexture({
              size: [canvas.width, canvas.height],
              format,
              usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            }),
          ),
        );
        size = want;
      };
      ensure();
      const reads = (reader: number) => (name: string) => {
        const at = slot(reader, name);
        return at ? textures[at[0]]![at[1]]!.createView() : null;
      };
      try {
        for (const [i, p] of passes.entries()) {
          subs.push(
            await createWebGpuPass(canvas, p, states[i]!, {
              target: { format, view: () => textures[i]![parity]!.createView() },
              readPass: reads(i),
            }),
          );
        }
        main = await createWebGpuPass(canvas, d, frame, { readPass: reads(passes.length) });
      } catch (error) {
        for (const sub of subs) sub.dispose(false);
        drop();
        throw error;
      }
    } else {
      const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false });
      if (!gl) throw new Error('no WebGL2 context');
      // Rendering to a float texture is an extension in WebGL2. Without it the passes draw
      // into 8 bits a channel, and a value outside 0 to 1 is clamped: the mount says so.
      const float = gl.getExtension('EXT_color_buffer_float') !== null;
      passFormat = float ? 'rgba16float' : 'rgba8';
      let targets: { texture: WebGLTexture; framebuffer: WebGLFramebuffer }[][] = [];
      let size = '';
      drop = () => {
        for (const pair of targets)
          for (const t of pair) {
            gl.deleteTexture(t.texture);
            gl.deleteFramebuffer(t.framebuffer);
          }
        targets = [];
        size = '';
      };
      ensure = () => {
        const want = `${String(canvas.width)}x${String(canvas.height)}`;
        if (want === size && targets.length > 0) return;
        drop();
        targets = passes.map(() =>
          [0, 1].map(() => {
            const texture = gl.createTexture();
            const framebuffer = gl.createFramebuffer();
            if (!texture || !framebuffer) throw new Error('no WebGL2 render target');
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              float ? gl.RGBA16F : gl.RGBA8,
              canvas.width,
              canvas.height,
              0,
              gl.RGBA,
              float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
              null,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(
              gl.FRAMEBUFFER,
              gl.COLOR_ATTACHMENT0,
              gl.TEXTURE_2D,
              texture,
              0,
            );
            return { texture, framebuffer };
          }),
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        size = want;
      };
      ensure();
      const reads = (reader: number) => (name: string) => {
        const at = slot(reader, name);
        return at ? targets[at[0]]![at[1]]!.texture : null;
      };
      try {
        for (const [i, p] of passes.entries()) {
          subs.push(
            await createWebGl2Pass(canvas, p, states[i]!, {
              target: () => targets[i]![parity]!.framebuffer,
              readPass: reads(i),
            }),
          );
        }
        main = await createWebGl2Pass(canvas, d, frame, { readPass: reads(passes.length) });
      } catch (error) {
        for (const sub of subs) sub.dispose(false);
        drop();
        throw error;
      }
    }
    return {
      passFormat,
      draw(again?: boolean): void {
        ensure();
        // The frame last drawn wrote the textures of the parity before this one.
        if (again) parity = 1 - parity;
        subs.forEach((sub, i) => {
          states[i]!.pack(frame.seconds);
          sub.draw();
        });
        main.draw();
        parity = 1 - parity;
      },
      busy: () => main.busy() || subs.some((sub) => sub.busy()),
      lastFrameMs: () => Math.max(main.lastFrameMs(), ...subs.map((sub) => sub.lastFrameMs())),
      dispose(release: boolean): void {
        for (const sub of subs) sub.dispose(false);
        drop();
        main.dispose(release);
      },
      onLost: (handler) => main.onLost(handler),
      ...(main.captureConsole ? { captureConsole: main.captureConsole } : {}),
      reset(): void {
        drop();
        parity = 0;
        ensure();
      },
    };
  };

  /** Build one pass for `d` on one backend. Building is queued across the page, because the
   *  WebGPU error scope it reads belongs to the device every mount shares. */
  const build = (backend: 'webgpu' | 'webgl2', d: ShaderData, frame: FrameState): Promise<Pass> =>
    serialize(async () =>
      d.passes !== undefined && d.passes.length > 0
        ? await buildMultipass(backend, d, frame)
        : backend === 'webgpu'
          ? await createWebGpuPass(canvas, d, frame)
          : await createWebGl2Pass(canvas, d, frame),
    );

  let pass: Pass | null = null;
  const order: readonly ('webgpu' | 'webgl2')[] = opts.backend
    ? [opts.backend]
    : skipWebGpu
      ? ['webgl2']
      : ['webgpu', 'webgl2'];
  for (const backend of order) {
    try {
      const p = await build(backend, data, state);
      // A still of a program whose passes read the frame before (compiler change 0026) is
      // the frame after a second of them, at a fixed step, so it shows what the history
      // builds up to. The handle still counts the one frame the still path promises.
      if (still && (data.passes?.length ?? 0) > 0) {
        for (let k = STILL_WARMUP; k > 0; k--) drawOnce(p, state, STILL_SECONDS - k / 60);
        qa.frames = 0;
      }
      drawOnce(p, state, still ? STILL_SECONDS : 0);
      pass = p;
      qa.backend = backend;
      qa.failure = '';
      break;
    } catch (error) {
      pass = null;
      qa.frames = 0;
      // Every backend's reason is kept: in the runtime's own order it is WebGPU's that says
      // what went wrong, and WebGL2's only says it could not stand in.
      const reason = error instanceof Error ? error.message : String(error);
      qa.failure = qa.failure ? `${qa.failure}; ${backend}: ${reason}` : `${backend}: ${reason}`;
    }
  }

  canvas.dataset.backend = qa.backend;
  applyLabels(labelStateOf(qa.backend, still));

  /** Everything that happens in one tick when this mount stops drawing. `dispose()` has
   *  already put the canvas back on the fallback ground; this moves `data-backend` and
   *  rewrites every string that named the backend that is gone, a stale image under a live
   *  backend name is the lie the asymmetric-backend row exists to prevent . */
  const degrade = (): void => {
    qa.backend = 'none';
    canvas.dataset.backend = 'none';
    applyLabels('none');
  };

  /** The packed bytes, copied, so a reader of the handle cannot write into the frame. */
  const uniformBytes = (): Float32Array => (state.data ? state.data.slice() : new Float32Array(0));

  let scaleHeld = false;
  // Set by `idle()`: the loop keeps its place and draws nothing.
  let idled = false;
  /** The pass on the canvas, for the handle's methods, which exist before it does. */
  let current: Pass | null = null;
  const handle = (
    stop: () => void,
    swap: MountedShader['swap'],
    redraw: () => void,
    captureConsole: MountedShader['captureConsole'],
  ): MountedShader => {
    const mounted: MountedShader = {
      get backend() {
        return qa.backend;
      },
      get frames() {
        return qa.frames;
      },
      get failure() {
        return qa.failure;
      },
      get scale() {
        return state.scale;
      },
      holdScale(hold: boolean) {
        scaleHeld = hold;
        if (hold && state.scale !== 1) {
          state.scale = 1;
          state.resize();
        }
      },
      swap,
      redraw,
      uniformBytes,
      captureConsole,
      restart() {
        clock.frame = 0;
        clock.last = null;
        clock.delta = 0;
        current?.reset?.();
      },
      holdFrames(hold: boolean) {
        held = hold;
      },
      idle(on: boolean) {
        idled = on;
      },
      get passFormat() {
        return current?.passFormat ?? '';
      },
      stop,
    };
    // The per-element handle is the census source , so the runtime parks it rather
    // than trusting each host to.
    canvas.__shader = mounted;
    return mounted;
  };
  if (!pass)
    return handle(
      () => {},
      async () => false,
      () => {},
      async () => null,
    );
  let live = pass;
  current = live;

  let stopped = false;
  let raf = 0;
  let running = false;
  let visible = true;
  let seconds = 0;
  let last = 0;

  /** Put a newly emitted program on the canvas. The pass that is drawing is disposed after
   *  the new one has drawn, and only its own objects go: the canvas keeps its context, so a
   *  program that fails to build leaves the frame on screen and this answers false. */
  const swap = async (next: ShaderData): Promise<boolean> => {
    if (stopped || qa.backend === 'none') return false;
    const frame = createFrameState(canvas, next, opts.uniformValues);
    frame.scale = state.scale;
    frame.resize();
    try {
      const built = await build(qa.backend, next, frame);
      if (stopped) {
        built.dispose(false);
        return false;
      }
      try {
        drawOnce(built, frame, seconds, held);
      } catch (error) {
        // The new pass is bound but cannot draw. Drop it and leave the old one running.
        built.dispose(false);
        throw error;
      }
      const previous = live;
      live = built;
      current = built;
      // The loop may have moved the scale while this pass was building.
      if (frame.scale !== state.scale) {
        frame.scale = state.scale;
        frame.resize();
      }
      state = frame;
      previous.dispose(false);
      qa.failure = '';
      return true;
    } catch (error) {
      qa.failure = error instanceof Error ? error.message : String(error);
      return false;
    }
  };

  /** Draw one frame at the clock the loop is on: the next, or the one held on the canvas. */
  const redraw = (): void => {
    if (stopped) return;
    try {
      drawOnce(live, state, seconds, held);
    } catch {
      stop();
    }
  };

  /** The frame on the canvas, drawn once more by the pass that drew it, with its console
   *  recorded. A pass that cannot record answers null. */
  const captureConsole = async (capture: ConsoleCapture): Promise<CapturedConsole | null> => {
    if (stopped || !live.captureConsole) return null;
    return live.captureConsole(capture);
  };

  // Still: one frame is drawn and that is the whole contract, no loop, and no observers
  // either, since a resize redraw would be frame two .
  if (still) {
    return handle(
      () => {
        if (stopped) return;
        stopped = true;
        live.dispose(true);
        degrade();
      },
      swap,
      redraw,
      captureConsole,
    );
  }

  const tick = (now: number): void => {
    raf = requestAnimationFrame(tick);
    seconds += (now - last) / 1000;
    last = now;
    if (idled) return;
    // One frame on the GPU at a time. Submitting another every animation frame while the
    // first is still being drawn queues work faster than it drains, and a GPU process that
    // is never idle composites nothing else: the whole page stops, not just this canvas.
    try {
      if (live.busy()) return;
    } catch {
      stop();
      return;
    }
    if (opts.adaptive && !scaleHeld) adapt(live.lastFrameMs());
    // A driver that fails mid-flight must not spray the console: stop, go transparent, and
    // relabel, `stop()` does all three. A held frame is drawn again.
    try {
      drawOnce(live, state, seconds, held);
    } catch {
      stop();
    }
  };
  /** Steer the drawing buffer toward a frame that takes FRAME_BUDGET: a frame's cost goes
   *  with its pixel count, so the side scales by the square root of the ratio. It drops at
   *  once and climbs back slowly, so a program on the edge settles instead of pumping. */
  const adapt = (ms: number): void => {
    if (ms <= 0) return;
    let next = state.scale;
    if (ms > FRAME_BUDGET * 2)
      next = Math.max(MIN_SCALE, state.scale * Math.max(0.25, Math.sqrt(FRAME_BUDGET / ms)));
    else if (ms < FRAME_BUDGET / 2 && state.scale < 1) next = Math.min(1, state.scale * 1.1);
    if (Math.abs(next - state.scale) < 0.01) return;
    state.scale = next;
    state.resize();
  };
  const start = (): void => {
    if (running || stopped) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const pause = (): void => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
  };
  function stop(): void {
    if (stopped) return;
    stopped = true;
    pause();
    // `swap` hands `stop` to a pass before the observers below exist on the still path, so
    // the teardown asks whether each one was ever installed.
    io?.disconnect();
    ro?.disconnect();
    document.removeEventListener('visibilitychange', sync);
    live.dispose(true);
    degrade();
  }
  const onDemand = opts.onDemand === true;
  const sync = (): void => {
    if (stopped) return;
    if (onDemand) return;
    if (visible && !document.hidden) start();
    else pause();
  };

  let io: IntersectionObserver | undefined;
  let ro: ResizeObserver | undefined;
  io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    sync();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  // The drawing buffer follows the CSS box from here instead of a per-frame layout read. A
  // paused canvas needs the extra redraw to look right; a running one gets one anyway.
  ro = new ResizeObserver(() => {
    if (stopped) return;
    const changed = state.resize();
    if (!changed || running) return;
    redraw();
  });
  ro.observe(canvas);
  live.onLost(stop);

  sync();
  // An on-demand mount still owes the page its first frame; the loop is what it does without.
  if (onDemand) redraw();
  return handle(stop, swap, redraw, captureConsole);
}
