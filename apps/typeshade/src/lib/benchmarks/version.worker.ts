/// <reference types="@webgpu/types" />
import { regressionCatalog, type RegressionResult } from './regression-contract.ts';
import { benchmarkMetadata } from './metadata.ts';
import { prepareCompiled } from './regression-gpu.ts';
import { nextBatch, validDeviceSamples } from './timing.ts';
import {
  applicationInput,
  applicationOutput,
  expectedApplication,
  numbersMatch,
  RESIDENT_CALLS,
  FIELD_NAMES,
  fieldCount,
  type Application,
} from './workloads.ts';
import { storageBytes } from './contract.ts';
import type { Experiment } from './definitions.ts';

// Each build runs in its own worker, so runtime globals and pipeline caches cannot mix.
let device: GPUDevice;
let api: Record<string, (...args: any[]) => any>;
let session: { owner: any; close(): Promise<void> };
let compiled: Awaited<ReturnType<typeof prepareCompiled>> | undefined;
let resident: any;
let row: RegressionResult;
let gpu: (number | null)[] = [];
let live = 0,
  peak = 0,
  allocations = 0,
  submissions = 0;
let lost = false,
  invalid = false;
let timing: { query: GPUQuerySet; resolved: GPUBuffer; read: GPUBuffer } | undefined;
let measuring = false,
  passes = 0,
  uploaded = 0;
function verify(actual: number[], expected: number[]) {
  if (!numbersMatch(actual, expected)) throw new Error('validation');
  const corrupt = [...actual];
  corrupt[0] = corrupt[0]! + 1;
  if (numbersMatch(corrupt, expected)) throw new Error('validation');
  row.checkedValues = expected.length;
  row.corruptionDetected = true;
}
async function application() {
  const id = row.id as Application;
  const input = applicationInput(row.n, id);
  const expected = expectedApplication(id, input);
  const fields = fieldCount(id);
  const original = fields ? input.particles.flatMap((p) => FIELD_NAMES.map((key) => p[key])) : [];
  const probe = fields ? api.inputProbe!(id, input.particles, input.values) : undefined;
  passes = 0;
  uploaded = 0;
  measuring = fields > 0;
  const start = performance.now();
  let result: unknown;
  try {
    if (id === 'resident-image') {
      await session.owner.fuse(() => {
        for (let i = 0; i < RESIDENT_CALLS; i++) void api.image!(resident);
      });
      await session.owner.wait();
    } else if (id === 'image') await api.image!(input.values);
    else if (id === 'particles') await api.particles!(input.particles);
    else if (id === 'peak') result = await api.peak!(input.values);
    else if (fields) await api[`fields${fields}`]!(input.particles, input.values);
    else await api.collect!(input.keys, input.values, input.last, input.seen);
  } finally {
    measuring = false;
  }
  const wallMs = performance.now() - start;
  let elapsedNs: number | null = null;
  if (fields) {
    if (passes !== 1) throw new Error('validation');
    if (timing) {
      await timing.read.mapAsync(GPUMapMode.READ);
      try {
        const t = new BigUint64Array(timing.read.getMappedRange());
        elapsedNs = Number(t[1]! - t[0]!);
      } finally {
        timing.read.unmap();
      }
    }
    if (
      !numbersMatch(
        original,
        input.particles.flatMap((p) => FIELD_NAMES.map((key) => p[key])),
      )
    )
      throw new Error('validation');
  }
  let readbackMs: number | null = null;
  if (id === 'resident-image') {
    const readStart = performance.now();
    result = await resident.read();
    readbackMs = performance.now() - readStart;
  }
  verify(applicationOutput(id, input, result), expected);
  if (fields) row.checkedValues += original.length;
  return { wallMs, readbackMs, elapsedNs, probe, uploaded };
}
async function command(data: any) {
  if (data.command === 'init') {
    const build = regressionCatalog.builds[data.build]!;
    const start = performance.now();
    const response = await fetch(build.url);
    if (!response.ok) throw new Error('artifact');
    const bytes = await response.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('');
    if (digest !== build.runtimeDigest) throw new Error('artifact');
    const blob = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
    try {
      api = await import(/* @vite-ignore */ blob);
    } finally {
      URL.revokeObjectURL(blob);
    }
    const adapter = (await navigator.gpu?.requestAdapter()) ?? null;
    let metadata = benchmarkMetadata(adapter);
    if (!adapter) return { metadata, unsupported: true, loadMs: performance.now() - start };
    device = await adapter.requestDevice({
      requiredFeatures: metadata.webgpu.timestamps ? ['timestamp-query'] : [],
    });
    void device.lost.then(() => {
      lost = true;
    });
    device.addEventListener('uncapturederror', () => {
      invalid = true;
    });
    const create = device.createBuffer.bind(device);
    device.createBuffer = (descriptor) => {
      const b = create(descriptor);
      allocations++;
      live += descriptor.size;
      peak = Math.max(peak, live);
      const destroy = b.destroy.bind(b);
      let destroyed = false;
      b.destroy = () => {
        if (!destroyed) {
          destroyed = true;
          live -= descriptor.size;
        }
        destroy();
      };
      return b;
    };
    const submit = device.queue.submit.bind(device.queue);
    device.queue.submit = (commands) => {
      submissions++;
      submit(commands);
    };
    // Timestamp copies are instrument overhead, outside the tracked workload buffers.
    if (device.features.has('timestamp-query'))
      timing = {
        query: device.createQuerySet({ type: 'timestamp', count: 2 }),
        resolved: create({
          size: 16,
          usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        }),
        read: create({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }),
      };
    const encoder = device.createCommandEncoder.bind(device);
    device.createCommandEncoder = (descriptor) => {
      const enc = encoder(descriptor);
      let measured = false;
      const begin = enc.beginComputePass.bind(enc);
      enc.beginComputePass = (desc = {}) => {
        if (!measuring) return begin(desc);
        if (measured) throw new Error('validation');
        measured = true;
        passes++;
        return begin(
          timing
            ? {
                ...desc,
                timestampWrites: {
                  querySet: timing.query,
                  beginningOfPassWriteIndex: 0,
                  endOfPassWriteIndex: 1,
                },
              }
            : desc,
        );
      };
      const finish = enc.finish.bind(enc);
      enc.finish = (desc) => {
        if (measured && timing) {
          enc.resolveQuerySet(timing.query, 0, 2, timing.resolved, 0);
          enc.copyBufferToBuffer(timing.resolved, 0, timing.read, 0, 16);
        }
        return finish(desc);
      };
      return enc;
    };
    const write = device.queue.writeBuffer.bind(device.queue);
    device.queue.writeBuffer = (buffer, offset, data, at = 0, size) => {
      if (measuring) {
        const unit = 'BYTES_PER_ELEMENT' in data ? Number(data.BYTES_PER_ELEMENT) : 1;
        uploaded += size === undefined ? data.byteLength - at * unit : size * unit;
      }
      write(buffer, offset, data, at, size);
    };
    session = await api.open!(device);
    // Only a runtime that implements the API supplies this snapshot. Adapter observations and
    // the independent WebGL probe retain their original, separate provenance.
    metadata = { ...metadata, ...(session.owner.info ? { runtime: session.owner.info } : {}) };
    return { metadata, loadMs: performance.now() - start };
  }
  if (data.command === 'prepare') {
    peak = live;
    allocations = 0;
    submissions = 0;
    gpu = [];
    invalid = false;
    device.pushErrorScope('validation');
    const job = regressionCatalog.builds[data.build]!.cases.find((e) => e.id === data.id);
    row = {
      id: data.id,
      n: data.n,
      build: data.build === 0 ? 'baseline' : 'candidate',
      kind: job ? 'compiled' : data.id === 'resident-image' ? 'resident' : 'host',
      status: 'passed',
      reason: 'none',
      setupMs: 0,
      coldMs: 0,
      wallMs: [],
      readbackMs: data.id === 'resident-image' ? [] : null,
      gpuNs: null,
      gpuTiming: 'unsupported',
      dispatches: job?.dispatches ?? (data.id === 'resident-image' ? RESIDENT_CALLS : 1),
      checkedValues: 0,
      corruptionDetected: false,
      logicalBytes: job
        ? storageBytes(job as Experiment, data.n)
        : data.n *
          (fieldCount(data.id) ? 36 : data.id === 'particles' ? 32 : data.id === 'collect' ? 8 : 4),
      peakBufferBytes: 0,
      bufferAllocations: 0,
      gpuSubmissions: 0,
      validationMs: fieldCount(data.id) ? [] : null,
      packingMs: fieldCount(data.id) ? [] : null,
      uploadBytes: fieldCount(data.id) ? [] : null,
      inputBytes: null,
    };
    const start = performance.now();
    if (job) compiled = await prepareCompiled(device, job, data.n);
    if (fieldCount(data.id)) {
      let refused = false;
      try {
        await api[`fields${fieldCount(data.id)}`]!(
          [{ ...applicationInput(1, data.id).particles[0], cold3: 'invalid' }],
          new Float32Array(1),
        );
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        refused = true;
      }
      if (!refused) throw new Error('validation');
    }
    if (row.kind === 'resident')
      resident = session.owner.array(applicationInput(row.n, 'resident-image').values);
    row.setupMs = performance.now() - start;
    const cold = compiled ? await compiled.dispatch(compiled.dispatches) : await application();
    row.coldMs = cold.wallMs * (compiled?.dispatches ?? 1) + row.setupMs;
    if (compiled) await compiled.verify(row);
    let count = compiled?.dispatches ?? 1;
    if (compiled?.batchable) {
      for (;;) {
        const x = await compiled.dispatch(count);
        const next =
          x.wallMs * count > 50
            ? count
            : nextBatch(count, compiled.supported ? x.elapsedNs : x.wallMs * count * 1e6);
        if (next === count) break;
        count = next;
      }
    }
    return { count };
  }
  if (data.command === 'warmup') {
    row.dispatches = row.kind === 'compiled' ? data.count : row.dispatches;
    for (let i = 0; i < data.warmup; i++) {
      if (compiled) await compiled.dispatch(row.dispatches);
      else await application();
    }
    if (compiled) await compiled.verify(row);
    return {};
  }
  if (data.command === 'sample') {
    if (lost || invalid) throw new Error('validation');
    if (compiled) {
      const x = await compiled.dispatch(row.dispatches);
      row.wallMs.push(x.wallMs);
      gpu.push(x.elapsedNs === null ? null : x.elapsedNs / row.dispatches);
    } else {
      const x = await application();
      row.wallMs.push(x.wallMs);
      if (x.probe) {
        row.validationMs!.push(x.probe.validationMs);
        row.packingMs!.push(x.probe.packingMs);
        row.uploadBytes!.push(x.uploaded);
        row.inputBytes = x.probe.inputBytes;
        gpu.push(x.elapsedNs);
      }
      if (x.readbackMs !== null) row.readbackMs!.push(x.readbackMs);
    }
    return {};
  }
  if (data.command === 'finish') {
    if (compiled) await compiled.verify(row);
    if ((await device.popErrorScope()) || lost || invalid) throw new Error('validation');
    row.gpuNs = validDeviceSamples(gpu);
    row.gpuTiming = row.gpuNs
      ? 'available'
      : compiled?.supported || (fieldCount(row.id) && timing)
        ? 'unresolved'
        : 'unsupported';
    row.peakBufferBytes = peak;
    row.bufferAllocations = allocations;
    row.gpuSubmissions = submissions;
    compiled?.destroy();
    compiled = undefined;
    resident?.destroy();
    resident = undefined;
    return { row };
  }
  if (data.command === 'close') {
    await session?.close();
    timing?.query.destroy();
    timing?.resolved.destroy();
    timing?.read.destroy();
    device?.destroy();
    return {};
  }
  throw new Error('command');
}
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({ sequence: data.sequence, value: await command(data) });
  } catch (error) {
    console.error(error);
    if (row) {
      row.status = 'failed';
      row.reason = lost ? 'device-lost' : 'validation';
    }
    self.postMessage({ sequence: data.sequence, error: true, row });
  }
};
