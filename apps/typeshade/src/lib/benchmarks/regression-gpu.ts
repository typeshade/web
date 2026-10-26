import type { regressionCatalog, RegressionResult } from './regression-contract.ts';
import { fixture, matches } from './fixtures.ts';
import type { Experiment } from './definitions.ts';
export type CompiledCase = (typeof regressionCatalog.builds)[number]['cases'][number];
export async function prepareCompiled(device: GPUDevice, job: CompiledCase, n: number) {
  const owned: GPUBuffer[] = [];
  const make = (size: number, usage: number) => {
    const b = device.createBuffer({ size, usage });
    owned.push(b);
    return b;
  };
  try {
    const { input, expected } = fixture(job as Experiment, n);
    const src = make(
      input.byteLength,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    );
    const out = make(
      expected.byteLength,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    );
    const args = make(16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    device.queue.writeBuffer(src, 0, input.buffer);
    device.queue.writeBuffer(args, 0, new Uint32Array([n, 0, 0, 0]));
    const layout = job.wgsl
      ? device.createBindGroupLayout({
          entries: job.bindings.map((b) => ({
            binding: b.binding,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type:
                b.name === 'args'
                  ? ('uniform' as const)
                  : b.name === 'src'
                    ? ('read-only-storage' as const)
                    : ('storage' as const),
            },
          })),
        })
      : undefined;
    const pipeline = layout
      ? await device.createComputePipelineAsync({
          layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
          compute: { module: device.createShaderModule({ code: job.wgsl }), entryPoint: 'main' },
        })
      : undefined;
    const bindings = layout
      ? device.createBindGroup({
          layout,
          entries: job.bindings.map((b) => ({
            binding: b.binding,
            resource: { buffer: b.name === 'args' ? args : b.name === 'src' ? src : out },
          })),
        })
      : undefined;
    const query =
      pipeline && !job.separate && device.features.has('timestamp-query')
        ? device.createQuerySet({ type: 'timestamp', count: 2 })
        : undefined;
    const resolved = query
      ? make(16, GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC)
      : undefined;
    const staging = query ? make(16, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ) : undefined;
    const read = async (b: GPUBuffer, bytes: number) => {
      const s = device.createBuffer({
        size: bytes,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      try {
        const enc = device.createCommandEncoder();
        enc.copyBufferToBuffer(b, 0, s, 0, bytes);
        device.queue.submit([enc.finish()]);
        await s.mapAsync(GPUMapMode.READ);
        return new Uint32Array(s.getMappedRange().slice(0));
      } finally {
        s.destroy();
      }
    };
    return {
      supported: !!query,
      batchable: !!pipeline && job.kind !== 'atomic' && job.dispatches === 1,
      dispatches: job.dispatches,
      async dispatch(count: number) {
        // Reset atomics outside the measured interval so every call has the same input.
        if (job.kind === 'atomic') {
          device.queue.writeBuffer(out, 0, new Uint32Array(expected.length));
          await device.queue.onSubmittedWorkDone();
        }
        const start = performance.now();
        if (job.kind === 'upload') {
          device.queue.writeBuffer(src, 0, input.buffer);
          await device.queue.onSubmittedWorkDone();
          return { wallMs: performance.now() - start, elapsedNs: null };
        }
        if (job.kind === 'readback') {
          await read(src, input.byteLength);
          return { wallMs: performance.now() - start, elapsedNs: null };
        }
        const encode = (dispatches: number) => {
          const enc = device.createCommandEncoder();
          const pass = enc.beginComputePass(
            query
              ? {
                  timestampWrites: {
                    querySet: query,
                    beginningOfPassWriteIndex: 0,
                    endOfPassWriteIndex: 1,
                  },
                }
              : {},
          );
          pass.setPipeline(pipeline!);
          pass.setBindGroup(0, bindings!);
          const groups = Math.ceil(
            (job.kind === 'reduce' && job.variant === 'serial' ? n / 64 : n) / job.wg,
          );
          for (let i = 0; i < dispatches; i++) pass.dispatchWorkgroups(groups);
          pass.end();
          if (query) {
            enc.resolveQuerySet(query, 0, 2, resolved!, 0);
            enc.copyBufferToBuffer(resolved!, 0, staging!, 0, 16);
          }
          return enc.finish();
        };
        if (job.separate) {
          for (let i = 0; i < count; i++) device.queue.submit([encode(1)]);
        } else device.queue.submit([encode(count)]);
        await device.queue.onSubmittedWorkDone();
        const wallMs = (performance.now() - start) / count;
        let elapsedNs: number | null = null;
        if (staging) {
          await staging.mapAsync(GPUMapMode.READ);
          try {
            const ts = new BigUint64Array(staging.getMappedRange());
            const delta = Number(ts[1]! - ts[0]!);
            elapsedNs = delta > 0 ? delta : null;
          } finally {
            staging.unmap();
          }
        }
        return { wallMs, elapsedNs };
      },
      async verify(row: RegressionResult) {
        const result = await read(job.wgsl ? out : src, expected.byteLength);
        if (!matches(result, expected) || !matches(await read(src, input.byteLength), input))
          throw new Error('validation');
        result[0] = result[0]! ^ 1;
        if (matches(result, expected)) throw new Error('validation');
        row.checkedValues = expected.length;
        row.corruptionDetected = true;
      },
      destroy() {
        owned.forEach((b) => b.destroy());
        query?.destroy();
      },
    };
  } catch (error) {
    owned.forEach((b) => b.destroy());
    throw error;
  }
}
