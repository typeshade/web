// One compute dispatch on WebGPU, and the bytes it left behind. The Playground runs a module
// whose only entry is `@compute` through this: it fills the storage buffers the reader chose,
// dispatches the entry over the invocations they asked for, and reads back every buffer and
// storage texture the entry may have written.
//
// It shares the page's one device and the resource builders with src/lib/shader-runtime.ts,
// and like that file it imports nothing from the compiler.
import { TEXEL_BYTES, type ResourceSpec } from './shader-bindings.ts';
import { gpuResource, sharedDevice } from './shader-runtime.ts';
import {
  createRuntime,
  type Pack,
  type RuntimeOptions,
} from '../../vendor/shader-dsl/src/runtime.ts';

type ConsoleEvent = Parameters<Exclude<RuntimeOptions['console'], 'print' | undefined>>[0];

export interface ComputeJob {
  readonly manifest: Pack;
  readonly console?: boolean;
  readonly consoleBytes?: number;
  readonly entry: string;
  /** Workgroups along x, y and z. */
  readonly workgroups: readonly [number, number, number];
  readonly resources: readonly ResourceSpec[];
  readonly constants?: Readonly<Record<string, number>>;
  /** The optional WebGPU features the module needs. */
  readonly features?: readonly string[];
}

export interface ComputeResult {
  /** The bytes of every writable storage buffer after the dispatch, by binding name. */
  readonly buffers: ReadonlyMap<string, Uint8Array>;
  /** Every writable storage texture after the dispatch, row by row, tightly packed. */
  readonly textures: ReadonlyMap<
    string,
    {
      readonly width: number;
      readonly height: number;
      readonly format: string;
      readonly bytes: Uint8Array;
    }
  >;
  readonly ms: number;
  readonly consoleEvents: readonly ConsoleEvent[];
  readonly dropped: number;
}

/** Run one dispatch. Throws with the device's own words when the module, the layout or a
 *  resource is refused, and when there is no WebGPU device at all. */
export async function runComputeOnGpu(job: ComputeJob): Promise<ComputeResult> {
  const device = await sharedDevice([
    ...new Set([...job.manifest.features, ...(job.features ?? [])]),
  ]);
  if (!device) throw new Error('no WebGPU device');
  const started = performance.now();
  const consoleEvents: ConsoleEvent[] = [];
  const rt = await createRuntime({
    device,
    console: (event) => consoleEvents.push(event),
    ...(job.consoleBytes !== undefined ? { consoleBytes: job.consoleBytes } : {}),
  });
  const owned: { destroy(): void }[] = [];
  const made = new Map<string, GPUBindingResource>();
  const textureOf = new Map<string, GPUTexture>();
  const bindings: Record<string, unknown> = {};
  const reads: {
    name: string;
    staging: GPUBuffer;
    texture?: { width: number; height: number; format: string; padded: number; row: number };
  }[] = [];
  try {
    const program = rt.load(job.manifest, { console: job.console ?? false });
    const pipeline = await program.compute(job.entry, { constants: job.constants });
    const reached = new Set(
      job.manifest.entries.find((e) => e.name === job.entry)?.bindings?.map((b) => b.name),
    );
    for (const r of job.resources) {
      const { resource, owned: o } = await gpuResource(device, r);
      if (o) owned.push(o);
      if (r.kind === 'storage-texture') textureOf.set(r.name, o as GPUTexture);
      made.set(r.name, resource);
      if (reached.has(r.name))
        bindings[r.name] =
          r.kind === 'storage-buffer' || r.kind === 'uniform-buffer'
            ? (resource as GPUBufferBinding).buffer
            : resource;
    }
    const frame = rt.frame();
    frame.dispatch(pipeline, bindings, job.workgroups);
    const encoder = frame.encoder as GPUCommandEncoder;

    // Every buffer and texture the entry may have written is copied out to a buffer the page can
    // map. A texture's rows are padded to 256 bytes on the way, which the read below undoes.
    for (const r of job.resources) {
      if (!made.has(r.name)) continue;
      if (r.kind === 'storage-buffer' && !r.readOnly) {
        const buffer = (made.get(r.name) as GPUBufferBinding).buffer;
        const staging = device.createBuffer({
          size: buffer.size,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        encoder.copyBufferToBuffer(buffer, 0, staging, 0, buffer.size);
        reads.push({ name: r.name, staging });
      }
      if (r.kind === 'storage-texture' && r.access !== 'read-only') {
        const texel = TEXEL_BYTES[r.format] ?? 4;
        const row = r.width * texel;
        const padded = Math.ceil(row / 256) * 256;
        const staging = device.createBuffer({
          size: padded * r.height,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        const texture = textureOf.get(r.name);
        if (!texture) continue;
        encoder.copyTextureToBuffer({ texture }, { buffer: staging, bytesPerRow: padded }, [
          r.width,
          r.height,
        ]);
        reads.push({
          name: r.name,
          staging,
          texture: { width: r.width, height: r.height, format: r.format, padded, row },
        });
      }
    }
    const submitted = await frame.submit();
    const dropped = submitted.console.reduce((n, row) => n + row.dropped, 0);

    const buffers = new Map<string, Uint8Array>();
    const textures = new Map<
      string,
      { width: number; height: number; format: string; bytes: Uint8Array }
    >();
    for (const r of reads) {
      await r.staging.mapAsync(GPUMapMode.READ);
      const bytes = new Uint8Array(r.staging.getMappedRange().slice(0));
      r.staging.unmap();
      if (!r.texture) {
        buffers.set(r.name, bytes);
        continue;
      }
      const { width, height, format, padded, row } = r.texture;
      const tight = new Uint8Array(row * height);
      for (let y = 0; y < height; y++)
        tight.set(bytes.subarray(y * padded, y * padded + row), y * row);
      textures.set(r.name, { width, height, format, bytes: tight });
    }
    return { buffers, textures, ms: performance.now() - started, consoleEvents, dropped };
  } finally {
    for (const r of reads) r.staging.destroy();
    for (const o of owned) o.destroy();
    rt.destroy();
  }
}
