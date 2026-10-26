import { expect, test } from 'bun:test';
import { compile } from '../vendor/shader-dsl/src/compiler/ts/compile.ts';
import { packModule } from '../vendor/shader-dsl/src/compiler/ts/pack.ts';
import { runComputeOnGpu } from '../src/lib/compute-runner.ts';

interface Buffer {
  size: number;
  usage: number;
  bytes: ArrayBuffer;
  destroy(): void;
  mapAsync(): Promise<void>;
  getMappedRange(): ArrayBuffer;
  unmap(): void;
}
const descriptors: { compute: { constants?: Record<string, number> } }[] = [];
const workgroups: number[][] = [];
const allocated: { destroyed: boolean }[] = [];
let dropped = 0;
let rejectPipeline = false;
let rejectReadback = false;
const shaderText: string[] = [];
const device = {
  features: new Set<string>(),
  lost: new Promise(() => {}),
  destroy() {
    throw new Error('the shared device must survive');
  },
  pushErrorScope() {},
  async popErrorScope() {
    return null;
  },
  createShaderModule(d: { code: string }) {
    shaderText.push(d.code);
    return {};
  },
  createBindGroupLayout() {
    return {};
  },
  createPipelineLayout() {
    return {};
  },
  createBindGroup(d: { entries: { resource: { buffer?: Buffer } }[] }) {
    return d;
  },
  async createComputePipelineAsync(d: (typeof descriptors)[number]) {
    if (rejectPipeline) throw new Error('broken shader');
    descriptors.push(d);
    return {};
  },
  createBuffer(d: { size: number; usage: number }): Buffer {
    const state = { destroyed: false };
    allocated.push(state);
    return {
      ...d,
      bytes: new ArrayBuffer(d.size),
      destroy() {
        state.destroyed = true;
      },
      async mapAsync() {
        if (rejectReadback) throw new Error('readback failed');
      },
      getMappedRange() {
        return this.bytes;
      },
      unmap() {},
    };
  },
  createTexture(d: { size: number[]; format: string }) {
    const state = { destroyed: false };
    allocated.push(state);
    return {
      ...d,
      createView() {
        return {};
      },
      destroy() {
        state.destroyed = true;
      },
    };
  },
  createCommandEncoder() {
    const effects: (() => void)[] = [];
    const groups: { entries: { resource: { buffer?: Buffer } }[] }[] = [];
    return {
      beginComputePass() {
        return {
          setPipeline() {},
          setBindGroup(i: number, group: (typeof groups)[number]) {
            groups[i] = group;
          },
          dispatchWorkgroups(...n: number[]) {
            workgroups.push(n);
            if (dropped)
              effects.push(() => {
                const consoleBuffer = groups.flatMap((g) => g.entries).at(-1)?.resource.buffer;
                if (consoleBuffer)
                  new Uint32Array(consoleBuffer.bytes).set([4, dropped, 0, 2, 3, 4]);
              });
          },
          end() {},
        };
      },
      copyBufferToBuffer(from: Buffer, at: number, to: Buffer, offset: number, size: number) {
        effects.push(() =>
          new Uint8Array(to.bytes, offset, size).set(new Uint8Array(from.bytes, at, size)),
        );
      },
      copyTextureToBuffer(
        _from: object,
        to: { buffer: Buffer; bytesPerRow: number },
        size: number[],
      ) {
        effects.push(() => {
          for (let y = 0; y < size[1]!; y++)
            new Uint8Array(to.buffer.bytes, y * to.bytesPerRow, size[0]! * 4).fill(y + 1);
        });
      },
      finish() {
        return effects;
      },
    };
  },
  queue: {
    writeBuffer(
      buffer: Buffer,
      offset: number,
      data: ArrayBufferView,
      at = 0,
      size = data.byteLength,
    ) {
      new Uint8Array(buffer.bytes, offset, size).set(
        new Uint8Array(data.buffer, data.byteOffset + at, size),
      );
    },
    submit(commands: (() => void)[][]) {
      for (const effects of commands) for (const run of effects) run();
    },
    async onSubmittedWorkDone() {},
  },
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    gpu: {
      async requestAdapter() {
        return {
          features: device.features,
          async requestDevice() {
            return device;
          },
        };
      },
    },
  },
});
Object.assign(globalThis, {
  GPUBufferUsage: { MAP_READ: 1, COPY_SRC: 4, COPY_DST: 8, UNIFORM: 64, STORAGE: 128 },
  GPUTextureUsage: { COPY_SRC: 1, STORAGE_BINDING: 8 },
  GPUMapMode: { READ: 1 },
});
function manifest(body: string, console = false) {
  const compiled = compile('"use typeshade";\n' + body);
  expect(compiled.diagnostics.filter((d) => d.category === 'error')).toEqual([]);
  return packModule(compiled.module, { console, emit: { level: 'O0', parens: 'minimal' } });
}

test('compute runtime binds by name, forwards overrides and preserves storage readback', async () => {
  const pack = manifest(
    'const scale: override<u32> = 1; declare const values: storage<array<u32>, "read_write">; @compute([1]) function main(@builtin("global_invocation_id") id: vec3u): void { values[id.x] = scale; }',
  );
  const result = await runComputeOnGpu({
    manifest: pack,
    entry: 'main',
    constants: { scale: 3 },
    workgroups: [2, 3, 4],
    resources: [
      {
        kind: 'storage-buffer',
        name: 'values',
        group: 0,
        binding: 0,
        readOnly: false,
        bytes: new Uint8Array([1, 2, 3, 4]),
      },
    ],
  });
  expect(descriptors.at(-1)?.compute.constants).toEqual({ scale: 3 });
  expect(shaderText.at(-1)).toBe(pack.wgsl);
  expect(workgroups.at(-1)).toEqual([2, 3, 4]);
  expect([...result.buffers.get('values')!]).toEqual([1, 2, 3, 4]);
  expect(result.dropped).toBe(0);
  expect(allocated.every((a) => a.destroyed)).toBe(true);
});

test('runtime refuses an unknown override before any dispatch', async () => {
  const pack = manifest('@compute([1]) function main(): void {}');
  const count = workgroups.length;
  await expect(
    runComputeOnGpu({
      manifest: pack,
      entry: 'main',
      constants: { absent: 1 },
      workgroups: [1, 1, 1],
      resources: [],
    }),
  ).rejects.toThrow('absent');
  expect(workgroups.length).toBe(count);
});

test('submit returns console overflow counts without a manual console resource', async () => {
  const pack = manifest('@compute([1]) function main(): void { console.log("hello"); }', true);
  dropped = 7;
  try {
    const result = await runComputeOnGpu({
      manifest: pack,
      console: true,
      consoleBytes: 64,
      entry: 'main',
      workgroups: [1, 1, 1],
      resources: [],
    });
    expect(result.dropped).toBe(7);
    expect(result.consoleEvents).toHaveLength(1);
    expect(result.consoleEvents[0]?.args).toEqual(['hello']);
    expect(result.consoleEvents[0]?.invocation).toEqual([2, 3, 4]);
    expect(result.buffers.has('_console')).toBe(false);
  } finally {
    dropped = 0;
  }
});

test('storage texture readback removes padded rows and releases resources', async () => {
  const pack = manifest(
    'declare const image: texture_storage_2d<"rgba8unorm", "write">; @compute([1]) function main(): void { textureStore(image, vec2i(0, 0), vec4f(1.0)); }',
  );
  const result = await runComputeOnGpu({
    manifest: pack,
    entry: 'main',
    workgroups: [1, 1, 1],
    resources: [
      {
        kind: 'storage-texture',
        name: 'image',
        group: 0,
        binding: 0,
        width: 2,
        height: 2,
        format: 'rgba8unorm',
        access: 'write-only',
      },
    ],
  });
  expect([...result.textures.get('image')!.bytes]).toEqual([
    ...new Uint8Array(8).fill(1),
    ...new Uint8Array(8).fill(2),
  ]);
  expect(allocated.every((a) => a.destroyed)).toBe(true);
});

test('pipeline failures propagate before dispatch and leave the shared device alive', async () => {
  const pack = manifest('@compute([1]) function main(): void {}');
  rejectPipeline = true;
  try {
    await expect(
      runComputeOnGpu({ manifest: pack, entry: 'main', workgroups: [1, 1, 1], resources: [] }),
    ).rejects.toThrow('broken shader');
  } finally {
    rejectPipeline = false;
  }
});

test('readback failure releases both host and runtime allocations', async () => {
  const pack = manifest(
    'declare const values: storage<array<u32>, "read_write">; @compute([1]) function main(): void { values[0] = 1; }',
  );
  rejectReadback = true;
  try {
    await expect(
      runComputeOnGpu({
        manifest: pack,
        entry: 'main',
        workgroups: [1, 1, 1],
        resources: [
          {
            kind: 'storage-buffer',
            name: 'values',
            group: 0,
            binding: 0,
            readOnly: false,
            bytes: new Uint8Array(4),
          },
        ],
      }),
    ).rejects.toThrow('readback failed');
    expect(allocated.every((a) => a.destroyed)).toBe(true);
  } finally {
    rejectReadback = false;
  }
});
