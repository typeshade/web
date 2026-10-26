// Texture memory for the CPU oracle: the texels the bindings panel uploads to the GPU, read
// back the way a WebGPU sampler reads them.
//
// The oracle has no texture unit. Under `gpuStubs` each texture read answers opaque black and
// each comparison 1, which is right for a reference that holds no texels and makes every
// textured example a different picture on the CPU. The Playground does hold them: the bindings
// panel builds the texels and the sampler's filter and address mode as plain data
// (src/lib/shader-bindings.ts), and the CPU half binds that same data by name. This file gives
// the oracle's GPU-only reads a meaning for a binding that is one of those, and leaves every
// other call to the compiler's placeholder.
//
// The oracle resolves a GPU-only call through the `GPU_STUBS` table by name at the moment of
// the call, so the reads here are installed into that table once per realm: the page's main
// thread and each raster worker. A call whose texture argument is not the panel's data falls
// through to the placeholder it had, so nothing else that runs the oracle on the page moves.
//
// What is modelled is what the runtime creates: one mip level, RGBA8 unorm, uint or sint
// texels, a depth32float depth texture, four samples of the same texel in a multisampled one.
// So a level, a bias and a gradient all read level 0, which is the level there is. A cube is
// read on the face the direction points at, clamped to that face's edge, where a GPU blends
// across the seam; only the texels on a face's border can tell the two apart.
import { GPU_STUBS } from '../../vendor/shader-dsl/src/core/cpu-runtime.ts';
import {
  TEXEL_BYTES,
  type SamplerSpec,
  type StorageTextureSpec,
  type TextureSpec,
} from '../lib/shader-bindings.ts';

type Value = unknown;

const isTexture = (v: Value): v is TextureSpec =>
  typeof v === 'object' && v !== null && (v as { kind?: unknown }).kind === 'texture';
const isSampler = (v: Value): v is SamplerSpec =>
  typeof v === 'object' && v !== null && (v as { kind?: unknown }).kind === 'sampler';

/** The sampler a read goes through; a missing one reads nearest and clamped, which is what a
 *  load does. */
const NEAREST: Pick<SamplerSpec, 'filter' | 'address'> = {
  filter: 'nearest',
  address: 'clamp-to-edge',
};

const num = (v: Value): number => (typeof v === 'number' ? v : Number(v) || 0);
const vec = (v: Value): number[] =>
  Array.isArray(v) ? (v as number[]).map(num) : [num(v), 0, 0, 0];

/** A texel coordinate under an address mode. */
function address(i: number, size: number, mode: SamplerSpec['address']): number {
  if (mode === 'repeat') return ((i % size) + size) % size;
  if (mode === 'mirror-repeat') {
    const period = size * 2;
    const m = ((i % period) + period) % period;
    return m < size ? m : period - 1 - m;
  }
  return Math.min(size - 1, Math.max(0, i));
}

/** One texel as four numbers: a colour texel as WebGPU reads its format (unorm to 0..1, uint
 *  and sint as the integers), a depth texel as its depth in every channel. */
function texel(t: TextureSpec, layer: number, x: number, y: number): number[] {
  const at = y * t.width + x;
  if (t.sample === 'depth') {
    const d = t.depth?.[layer]?.[at] ?? 1;
    return [d, d, d, d];
  }
  const floats = t.floats?.[layer];
  if (floats) {
    const o = at * 4;
    return [floats[o]!, floats[o + 1]!, floats[o + 2]!, floats[o + 3]!];
  }
  const bytes = t.texels[layer];
  if (!bytes) return [0, 0, 0, 1];
  const o = at * 4;
  const raw = [bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!];
  if (t.sample === 'uint') return raw;
  if (t.sample === 'sint') return raw.map((b) => (b << 24) >> 24);
  return raw.map((b) => b / 255);
}

/** The two texels a coordinate falls between along one axis and the weight of the second, or
 *  the one texel it falls in for a nearest filter. */
function axis(
  coord: number,
  size: number,
  filter: SamplerSpec['filter'],
  mode: SamplerSpec['address'],
  offset = 0,
): { i0: number; i1: number; w: number } {
  if (filter === 'nearest') {
    const i = address(Math.floor(coord * size) + offset, size, mode);
    return { i0: i, i1: i, w: 0 };
  }
  const x = coord * size - 0.5;
  const base = Math.floor(x);
  return {
    i0: address(base + offset, size, mode),
    i1: address(base + 1 + offset, size, mode),
    w: x - base,
  };
}

const mix4 = (a: number[], b: number[], w: number): number[] =>
  w === 0 ? a : a.map((v, k) => v + (b[k]! - v) * w);

/** A filtered read of one 2D layer, a 1D texture being a layer one texel high. `map` turns
 *  each texel into what is filtered: its channels, or a comparison's pass or fail. */
function filter2d(
  t: TextureSpec,
  layer: number,
  u: number,
  v: number,
  s: Pick<SamplerSpec, 'filter' | 'address'>,
  offset: readonly number[] = [0, 0],
  map: (texel: number[]) => number[] = (x) => x,
): number[] {
  const ax = axis(u, t.width, s.filter, s.address, offset[0] ?? 0);
  const ay =
    t.height === 1
      ? { i0: 0, i1: 0, w: 0 }
      : axis(v, t.height, s.filter, s.address, offset[1] ?? 0);
  const at = (x: number, y: number): number[] => map(texel(t, layer, x, y));
  const top = mix4(at(ax.i0, ay.i0), at(ax.i1, ay.i0), ax.w);
  if (ay.w === 0) return top;
  return mix4(top, mix4(at(ax.i0, ay.i1), at(ax.i1, ay.i1), ax.w), ay.w);
}

/** A 3D texture's read: two slices filtered, then mixed by depth. */
function filter3d(
  t: TextureSpec,
  c: readonly number[],
  s: Pick<SamplerSpec, 'filter' | 'address'>,
): number[] {
  const az = axis(c[2] ?? 0, t.layers, s.filter, s.address);
  const near = filter2d(t, az.i0, c[0] ?? 0, c[1] ?? 0, s);
  if (az.w === 0) return near;
  return mix4(near, filter2d(t, az.i1, c[0] ?? 0, c[1] ?? 0, s), az.w);
}

/** The face a cube direction points at, WebGPU's order (+X, -X, +Y, -Y, +Z, -Z), and the
 *  0..1 coordinate on it, by the table every graphics API shares. */
function cubeFace(d: readonly number[]): { face: number; u: number; v: number } {
  const [x = 0, y = 0, z = 0] = d;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let face: number;
  let sc: number;
  let tc: number;
  let ma: number;
  if (ax >= ay && ax >= az) {
    face = x >= 0 ? 0 : 1;
    sc = x >= 0 ? -z : z;
    tc = -y;
    ma = ax;
  } else if (ay >= az) {
    face = y >= 0 ? 2 : 3;
    sc = x;
    tc = y >= 0 ? z : -z;
    ma = ay;
  } else {
    face = z >= 0 ? 4 : 5;
    sc = z >= 0 ? x : -x;
    tc = -y;
    ma = az;
  }
  const m = ma || 1;
  return { face, u: (sc / m + 1) / 2, v: (tc / m + 1) / 2 };
}

const layerOf = (t: TextureSpec, layer: Value, perLayer: number): number =>
  Math.min(Math.floor(t.layers / perLayer) - 1, Math.max(0, Math.trunc(num(layer))));

/** A read through a sampler, whatever the dimension: the texel filtered as the sampler says,
 *  `map` applied to each texel before the filter so a comparison is filtered as a pass rate. */
function sample(
  t: TextureSpec,
  s: Pick<SamplerSpec, 'filter' | 'address'>,
  coords: Value,
  layer: Value,
  offset?: Value,
  map?: (texel: number[]) => number[],
): number[] {
  const c = vec(coords);
  const off = offset === undefined ? undefined : vec(offset);
  switch (t.dim) {
    case '1d':
      return filter2d(t, 0, num(coords), 0.5, s, off, map);
    case '3d':
      // No depth texture is 3D, so there is no comparison to map here.
      return filter3d(t, c, s);
    case 'cube':
    case 'cube-array': {
      const { face, u, v } = cubeFace(c);
      const base = t.dim === 'cube-array' ? layerOf(t, layer, 6) * 6 : 0;
      return filter2d(t, base + face, u, v, { ...s, address: 'clamp-to-edge' }, undefined, map);
    }
    case '2d-array':
      return filter2d(t, layerOf(t, layer, 1), c[0] ?? 0, c[1] ?? 0, s, off, map);
    default:
      return filter2d(t, 0, c[0] ?? 0, c[1] ?? 0, s, off, map);
  }
}

/** A read at integer coordinates, no sampler. A coordinate out of range is clamped, which is
 *  one of the answers WebGPU allows for it. */
function load(t: TextureSpec, coords: Value, layer: Value): number[] {
  const c = vec(coords);
  if (t.dim === '1d')
    return texel(t, 0, address(Math.trunc(num(coords)), t.width, 'clamp-to-edge'), 0);
  const x = address(Math.trunc(c[0] ?? 0), t.width, 'clamp-to-edge');
  const y = address(Math.trunc(c[1] ?? 0), t.height, 'clamp-to-edge');
  const k =
    t.dim === '3d'
      ? address(Math.trunc(c[2] ?? 0), t.layers, 'clamp-to-edge')
      : t.dim === '2d-array'
        ? layerOf(t, layer, 1)
        : 0;
  return texel(t, k, x, y);
}

/** A result as the shader's type holds it: a depth read is one number, a colour one four, and
 *  a float is rounded to f32, the precision the oracle draws at. */
const out = (t: TextureSpec, v: number[]): number | number[] => {
  const f = t.sample === 'float' || t.sample === 'depth' ? v.map(Math.fround) : v;
  return t.sample === 'depth' ? f[0]! : f;
};

/** A depth comparison as WebGPU's `less-equal` sampler makes it: 1 where the reference is at
 *  or in front of the stored depth, filtered over the footprint as a pass rate. */
const compare =
  (ref: Value) =>
  (x: number[]): number[] => {
    const pass = num(ref) <= x[0]! ? 1 : 0;
    return [pass, pass, pass, pass];
  };

/** Four texels a gather reads, one channel of each, in WGSL's order: (min u, max v),
 *  (max u, max v), (max u, min v), (min u, min v). */
function gather(
  t: TextureSpec,
  s: SamplerSpec | undefined,
  coords: Value,
  layer: Value,
  pick: (texel: number[]) => number,
): number[] {
  const c = vec(coords);
  let k = 0;
  let u = c[0] ?? 0;
  let v = c[1] ?? 0;
  if (t.dim === 'cube' || t.dim === 'cube-array') {
    const f = cubeFace(c);
    k = (t.dim === 'cube-array' ? layerOf(t, layer, 6) * 6 : 0) + f.face;
    u = f.u;
    v = f.v;
  } else if (t.dim === '2d-array') k = layerOf(t, layer, 1);
  const mode = t.dim.startsWith('cube') ? 'clamp-to-edge' : (s?.address ?? 'clamp-to-edge');
  const ax = axis(u, t.width, 'linear', mode);
  const ay = axis(v, t.height, 'linear', mode);
  const at = (x: number, y: number): number => Math.fround(pick(texel(t, k, x, y)));
  return [at(ax.i0, ay.i1), at(ax.i1, ay.i1), at(ax.i1, ay.i0), at(ax.i0, ay.i0)];
}

// ── Storage textures ───────────────────────────────────────────────────────────────────
// A storage texture is memory the shader writes by texel and reads back. The oracle's copy
// holds the texels in the format's own bytes, laid out the way a WebGPU readback of the same
// texture is, so a dispatch on the CPU shows the same image and the same rows as one on the
// GPU. It starts at zero, as a texture the runtime creates does.

/** A storage texture as the oracle holds it: the panel's description and the texel bytes,
 *  written in place by `textureStore`. The bindings panel makes one. */
type OracleStorageTexture = StorageTextureSpec & { readonly bytes: Uint8Array<ArrayBuffer> };

const isStorage = (v: Value): v is OracleStorageTexture =>
  typeof v === 'object' &&
  v !== null &&
  (v as { kind?: unknown }).kind === 'storage-texture' &&
  (v as { bytes?: unknown }).bytes instanceof Uint8Array;

/** An f32 as the bits of the nearest binary16, for a 16-bit float format. */
function f16Bits(value: number): number {
  const f = new Float32Array([value]);
  const x = new Uint32Array(f.buffer)[0]!;
  const sign = (x >>> 16) & 0x8000;
  const exp = ((x >>> 23) & 0xff) - 127 + 15;
  const mant = x & 0x7fffff;
  if (((x >>> 23) & 0xff) === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0);
  if (exp >= 0x1f) return sign | 0x7c00;
  if (exp <= 0) {
    if (exp < -10) return sign;
    const m = (mant | 0x800000) >> (1 - exp);
    return sign | ((m + 0x1000) >> 13);
  }
  return sign | ((exp << 10) + ((mant + 0x1000) >> 13));
}

function fromF16Bits(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exp = (bits >> 10) & 0x1f;
  const mant = bits & 0x3ff;
  if (exp === 0) return sign * mant * 2 ** -24;
  if (exp === 0x1f) return mant ? NaN : sign * Infinity;
  return sign * (1 + mant / 1024) * 2 ** (exp - 15);
}

/** How a format lays out a texel: its channel count, and the scalar each channel is. */
function channelsOf(format: string): { count: number; kind: string } {
  const m = /^(r|rg|rgba)(8|16|32)(unorm|snorm|uint|sint|float)$/.exec(format);
  if (!m) return { count: 4, kind: '8unorm' };
  return { count: m[1]!.length, kind: `${m[2]}${m[3]}` };
}

/** The texel index a coordinate addresses, or -1 when it is outside the texture. */
function storageIndex(t: OracleStorageTexture, coords: Value): number {
  const c = vec(coords);
  const x = Math.trunc(c[0] ?? 0);
  const y = Math.trunc(c[1] ?? 0);
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return -1;
  return y * t.width + x;
}

/** Write one texel, converted to the format the way a store converts it. A store outside the
 *  texture is dropped, which WebGPU allows. */
function storeTexel(t: OracleStorageTexture, coords: Value, value: Value): void {
  const at = storageIndex(t, coords);
  if (at < 0) return;
  const v = vec(value);
  const { count, kind } = channelsOf(t.format);
  const view = new DataView(t.bytes.buffer, t.bytes.byteOffset, t.bytes.byteLength);
  const size = TEXEL_BYTES[t.format] ?? 4;
  const base = at * size;
  const step = size / count;
  for (let k = 0; k < count; k++) {
    const n = v[k] ?? 0;
    const o = base + k * step;
    if (kind === '8unorm')
      view.setUint8(o, Math.round(Math.fround(Math.min(1, Math.max(0, n)) * 255)));
    else if (kind === '8snorm')
      view.setInt8(o, Math.round(Math.fround(Math.min(1, Math.max(-1, n)) * 127)));
    else if (kind === '8uint') view.setUint8(o, n & 0xff);
    else if (kind === '8sint') view.setInt8(o, (n << 24) >> 24);
    else if (kind === '16float') view.setUint16(o, f16Bits(n), true);
    else if (kind === '16uint') view.setUint16(o, n & 0xffff, true);
    else if (kind === '16sint') view.setInt16(o, (n << 16) >> 16, true);
    else if (kind === '32float') view.setFloat32(o, n, true);
    else if (kind === '32uint') view.setUint32(o, n >>> 0, true);
    else view.setInt32(o, n | 0, true);
  }
}

/** Read one texel back as the four numbers a load returns: a missing channel is 0, a missing
 *  alpha 1. Outside the texture a load returns zero, one of the answers WebGPU allows. */
function loadTexel(t: OracleStorageTexture, coords: Value): number[] {
  const at = storageIndex(t, coords);
  const out = [0, 0, 0, 1];
  if (at < 0) return [0, 0, 0, 0];
  const { count, kind } = channelsOf(t.format);
  const view = new DataView(t.bytes.buffer, t.bytes.byteOffset, t.bytes.byteLength);
  const size = TEXEL_BYTES[t.format] ?? 4;
  const step = size / count;
  for (let k = 0; k < count; k++) {
    const o = at * size + k * step;
    out[k] =
      kind === '8unorm'
        ? view.getUint8(o) / 255
        : kind === '8snorm'
          ? Math.max(-1, view.getInt8(o) / 127)
          : kind === '8uint'
            ? view.getUint8(o)
            : kind === '8sint'
              ? view.getInt8(o)
              : kind === '16float'
                ? fromF16Bits(view.getUint16(o, true))
                : kind === '16uint'
                  ? view.getUint16(o, true)
                  : kind === '16sint'
                    ? view.getInt16(o, true)
                    : kind === '32float'
                      ? view.getFloat32(o, true)
                      : kind === '32uint'
                        ? view.getUint32(o, true)
                        : view.getInt32(o, true);
  }
  return /float|norm/.test(kind) ? out.map(Math.fround) : out;
}

type Read = (...args: Value[]) => Value;

/** The reads, by the oracle's own id, each taking the arguments in the order WGSL spells
 *  them. Undefined means the call is not one this file can answer. */
const READS: Readonly<Record<string, Read>> = {
  textureSample: (t, s, c, off) => sampleOrUndefined(t, s, c, 0, off),
  textureSampleLevel: (t, s, c, _level, off) => sampleOrUndefined(t, s, c, 0, off),
  textureSampleBias: (t, s, c, _bias, off) => sampleOrUndefined(t, s, c, 0, off),
  textureSampleGrad: (t, s, c, _dx, _dy, off) => sampleOrUndefined(t, s, c, 0, off),
  textureSampleArray: (t, s, c, layer, off) => sampleOrUndefined(t, s, c, layer, off),
  textureSampleLevelArray: (t, s, c, layer, _level, off) => sampleOrUndefined(t, s, c, layer, off),
  textureSampleBiasArray: (t, s, c, layer, _bias, off) => sampleOrUndefined(t, s, c, layer, off),
  textureSampleGradArray: (t, s, c, layer, _dx, _dy, off) => sampleOrUndefined(t, s, c, layer, off),
  textureSampleCubeArray: (t, s, c, layer) => sampleOrUndefined(t, s, c, layer),
  textureSampleLevelCubeArray: (t, s, c, layer) => sampleOrUndefined(t, s, c, layer),
  textureSampleBiasCubeArray: (t, s, c, layer) => sampleOrUndefined(t, s, c, layer),
  textureSampleGradCubeArray: (t, s, c, layer) => sampleOrUndefined(t, s, c, layer),

  textureSampleCompare: (t, s, c, ref, off) => compareOrUndefined(t, s, c, 0, ref, off),
  textureSampleCompareLevel: (t, s, c, ref, off) => compareOrUndefined(t, s, c, 0, ref, off),
  textureSampleCompareCube: (t, s, c, ref) => compareOrUndefined(t, s, c, 0, ref),
  textureSampleCompareLevelCube: (t, s, c, ref) => compareOrUndefined(t, s, c, 0, ref),
  textureSampleCompareArray: (t, s, c, layer, ref, off) =>
    compareOrUndefined(t, s, c, layer, ref, off),
  textureSampleCompareLevelArray: (t, s, c, layer, ref, off) =>
    compareOrUndefined(t, s, c, layer, ref, off),
  textureSampleCompareCubeArray: (t, s, c, layer, ref) => compareOrUndefined(t, s, c, layer, ref),
  textureSampleCompareLevelCubeArray: (t, s, c, layer, ref) =>
    compareOrUndefined(t, s, c, layer, ref),

  textureGather: (component, t, s, c) =>
    isTexture(t)
      ? gather(t, isSampler(s) ? s : undefined, c, 0, (x) => x[Math.trunc(num(component))] ?? 0)
      : undefined,
  textureGatherArray: (component, t, s, c, layer) =>
    isTexture(t)
      ? gather(t, isSampler(s) ? s : undefined, c, layer, (x) => x[Math.trunc(num(component))] ?? 0)
      : undefined,
  textureGatherDepth: (t, s, c) =>
    isTexture(t) ? gather(t, isSampler(s) ? s : undefined, c, 0, (x) => x[0]!) : undefined,
  textureGatherDepthArray: (t, s, c, layer) =>
    isTexture(t) ? gather(t, isSampler(s) ? s : undefined, c, layer, (x) => x[0]!) : undefined,
  textureGatherCompare: (t, s, c, ref) =>
    isTexture(t)
      ? gather(t, isSampler(s) ? s : undefined, c, 0, (x) => (num(ref) <= x[0]! ? 1 : 0))
      : undefined,
  textureGatherCompareArray: (t, s, c, layer, ref) =>
    isTexture(t)
      ? gather(t, isSampler(s) ? s : undefined, c, layer, (x) => (num(ref) <= x[0]! ? 1 : 0))
      : undefined,

  textureLoad: (t, c, level) => (isStorage(t) ? loadTexel(t, c) : loadOrUndefined(t, c, 0, level)),
  textureLoadU: (t, c, level) => loadOrUndefined(t, c, 0, level),
  textureLoad3dU: (t, c, level) => loadOrUndefined(t, c, 0, level),
  textureLoadArray: (t, c, layer) => loadOrUndefined(t, c, layer),
  textureLoadArrayU: (t, c, layer) => loadOrUndefined(t, c, layer),
  // Every sample of a multisampled texel holds the same colour: the runtime fills one by
  // drawing over all four.
  textureLoadMs: (t, c) => loadOrUndefined(t, c, 0),
  textureLoadDepthMs: (t, c) => loadOrUndefined(t, c, 0),

  textureDimensions: (t) => (isTexture(t) || isStorage(t) ? [t.width, t.height] : undefined),
  // The runtime makes every storage texture a single 2D layer.
  textureNumLayersStorage: (t) => (isStorage(t) ? 1 : undefined),
  // The value is the last argument: an array texture puts its layer before it.
  textureStore: (t, c, ...rest) => {
    if (!isStorage(t)) return undefined;
    storeTexel(t, c, rest[rest.length - 1]);
    return 0;
  },
  textureDimensionsMs: (t) => (isTexture(t) ? [t.width, t.height] : undefined),
  textureDimensions3d: (t) => (isTexture(t) ? [t.width, t.height, t.layers] : undefined),
  textureDimensions1d: (t) => (isTexture(t) ? t.width : undefined),
  textureNumLayers: (t) =>
    isTexture(t) ? (t.dim === 'cube-array' ? t.layers / 6 : t.layers) : undefined,
  textureNumSamples: (t) => (isTexture(t) ? (t.dim === '2d-ms' ? 4 : 1) : undefined),
};

function sampleOrUndefined(t: Value, s: Value, c: Value, layer: Value, off?: Value): Value {
  if (!isTexture(t)) return undefined;
  return out(t, sample(t, isSampler(s) ? s : NEAREST, c, layer, off));
}

function compareOrUndefined(
  t: Value,
  s: Value,
  c: Value,
  layer: Value,
  ref: Value,
  off?: Value,
): Value {
  if (!isTexture(t)) return undefined;
  return Math.fround(sample(t, isSampler(s) ? s : NEAREST, c, layer, off, compare(ref))[0]!);
}

function loadOrUndefined(t: Value, c: Value, layer: Value, _level?: Value): Value {
  if (!isTexture(t)) return undefined;
  return out(t, load(t, c, layer));
}

let installed = false;

/** Give the oracle's texture reads the panel's texels, once for this realm. A read whose
 *  texture is not the panel's data answers what it answered before. */
export function installOracleTextures(): void {
  if (installed) return;
  installed = true;
  const table = GPU_STUBS as Record<string, (...args: never[]) => unknown>;
  for (const [id, read] of Object.entries(READS)) {
    const placeholder = table[id];
    if (!placeholder) continue;
    table[id] = ((...args: Value[]) => {
      const got = read(...args);
      return got === undefined ? (placeholder as (...a: Value[]) => unknown)(...args) : got;
    }) as never;
  }
}
