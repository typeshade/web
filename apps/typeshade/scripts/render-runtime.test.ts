import { expect, test } from 'bun:test';
import { compile, packModule } from '../vendor/shader-dsl/src/index.ts';
import {
  captureRenderFrame,
  readUniform,
  reachedBindings,
  renderProgram,
  uniformBindings,
} from '../src/lib/render-runtime.ts';
import { compileLive } from '../src/scripts/live-shader-compile.ts';
import { heroShader } from '../src/lib/hero-shader.ts';
import type { ShaderLayout } from '../src/lib/shader-runtime.ts';

const source = `"use typeshade";
class Uniforms { value: f32; }
declare const u: uniform<Uniforms>;
declare const quality: override<f32> = 1.0;
@vertex function vertex(@builtin("vertex_index") index: u32): vec4f {
  return vec4f(f32(index), 0.0, 0.0, 1.0);
}
@fragment function fragment(): vec4f { return vec4f(u.value * quality, 0.0, 0.0, 1.0); }
`;
const compiled = compile(source);
const manifest = packModule(compiled.module, { emit: { level: 'O1', parens: 'minimal' } });

test('render pipelines consume the manifest and override controls on the shared device', async () => {
  const modules: string[] = [];
  const descriptors: { vertex: { constants: object }; fragment: { constants: object } }[] = [];
  const device = {
    features: new Set(),
    createShaderModule(d: { code: string }) {
      modules.push(d.code);
      return {};
    },
    createBindGroupLayout() {
      return {};
    },
    createPipelineLayout() {
      return {};
    },
    async createRenderPipelineAsync(d: (typeof descriptors)[number]) {
      descriptors.push(d);
      return {};
    },
    destroy() {
      throw new Error('the host device must survive');
    },
  };
  const made = await renderProgram(device, manifest, 'vertex', 'fragment', 'rgba16float', {
    quality: 3,
  });
  expect(modules).toEqual([manifest.wgsl]);
  expect(descriptors[0]?.vertex.constants).toEqual({ quality: 3 });
  expect(descriptors[0]?.fragment.constants).toEqual({ quality: 3 });
  made.runtime.destroy();
  await expect(
    renderProgram(device, manifest, 'vertex', 'fragment', 'rgba8unorm', { missing: 1 }),
  ).rejects.toThrow('missing');
  await expect(
    renderProgram(device, manifest, 'vertex', 'fragment', 'rgba8unorm', { quality: Infinity }),
  ).rejects.toThrow('finite');
});

test('uniform host values retain integer bits, f64 planes, matrices and empty objects', () => {
  const bytes = new ArrayBuffer(96);
  const view = new DataView(bytes);
  view.setInt32(0, -4, true);
  view.setUint32(4, 0xffffffff, true);
  view.setFloat32(8, 3, true);
  view.setFloat32(12, 0.125, true);
  view.setFloat32(16, 1, true);
  view.setFloat32(20, 2, true);
  view.setFloat32(24, 0.25, true);
  view.setFloat32(28, 0.5, true);
  view.setFloat32(32, 5, true);
  view.setFloat32(36, 6, true);
  view.setFloat32(48, 7, true);
  view.setFloat32(52, 8, true);
  expect(readUniform({ kind: 'scalar', type: 'i32' }, view)).toBe(-4);
  expect(readUniform({ kind: 'scalar', type: 'u32' }, view, 4)).toBe(0xffffffff);
  expect(readUniform({ kind: 'scalar', type: 'f64' }, view, 8)).toBe(3.125);
  expect(readUniform({ kind: 'vector', type: 'f64', size: 2, lo: 8 }, view, 16)).toEqual([
    1.25, 2.5,
  ]);
  expect(readUniform({ kind: 'matrix', columns: 2, rows: 2, columnStride: 16 }, view, 32)).toEqual([
    5, 6, 7, 8,
  ]);
  expect(
    readUniform(
      { kind: 'array', length: 2, stride: 16, element: { kind: 'struct', size: 16, fields: [] } },
      view,
    ),
  ).toEqual([{}, {}]);
});

test('uniform values bind by manifest name and entries exclude stale resources', () => {
  const layout = { group: 0, binding: 0 } as ShaderLayout;
  const data = new Float32Array([0.75, 0, 0, 0]);
  expect(uniformBindings(manifest, layout, { data, more: [] })).toEqual({ u: { value: 0.75 } });
  expect(
    reachedBindings(manifest, 'vertex', 'fragment', { u: { value: 0.75 }, stale: {} }),
  ).toEqual({ u: { value: 0.75 } });
});

test('hero and edited live payloads carry their emitted program manifest', () => {
  const hero = heroShader('mandelbrot-twin');
  expect(hero.manifest.wgsl).toBe(hero.wgsl);
  for (const pass of hero.passes ?? []) expect(pass.manifest.wgsl).toBe(pass.wgsl);
  const live = compileLive(
    'test',
    'test',
    `@fragment export function main(@location(0) uv: vec2): vec4 { return vec4(uv, 0.0, 1.0); }
`,
  );
  expect(live.diagnostics.filter((d) => d.category === 'error')).toEqual([]);
  expect(live.data?.manifest.wgsl).toBe(live.data?.wgsl);
  expect(live.data?.manifest.entries.some((e) => e.stage === 'vertex')).toBe(true);
});

test('frame captures use the recorded manifest, retain source events and report dropped calls', async () => {
  const module = compile(
    source.replace(
      'return vec4f(u.value * quality',
      'console.log("hello"); return vec4f(u.value * quality',
    ),
    { fileName: 'capture.shade.ts' },
  ).module;
  const pack = packModule(module, { console: true });
  const text: string[] = [];
  const scissors: number[][] = [];
  const allocated: { destroyed: boolean }[] = [];
  type Buffer = {
    size: number;
    usage: number;
    bytes: ArrayBuffer;
    destroy(): void;
    mapAsync(): Promise<void>;
    getMappedRange(): ArrayBuffer;
    unmap(): void;
  };
  const device = {
    features: new Set(),
    createShaderModule(d: { code: string }) {
      text.push(d.code);
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
    async createRenderPipelineAsync() {
      return {};
    },
    createBuffer(d: { size: number; usage: number }): Buffer {
      const held = { destroyed: false };
      allocated.push(held);
      return {
        ...d,
        bytes: new ArrayBuffer(d.size),
        destroy() {
          held.destroyed = true;
        },
        async mapAsync() {},
        getMappedRange() {
          return this.bytes;
        },
        unmap() {},
      };
    },
    createTexture() {
      const held = { destroyed: false };
      allocated.push(held);
      return {
        createView() {
          return {};
        },
        destroy() {
          held.destroyed = true;
        },
      };
    },
    pushErrorScope() {},
    async popErrorScope() {
      return null;
    },
    createCommandEncoder() {
      const effects: (() => void)[] = [];
      let consoleBuffer: Buffer | undefined;
      return {
        beginRenderPass() {
          return {
            setPipeline() {},
            setBindGroup(_i: number, group: { entries: { resource: { buffer?: Buffer } }[] }) {
              consoleBuffer = group.entries.find((e) => e.resource.buffer?.usage === (128 | 4 | 8))
                ?.resource.buffer;
            },
            setScissorRect(...r: number[]) {
              scissors.push(r);
            },
            draw() {
              effects.push(() => {
                if (consoleBuffer) new Uint32Array(consoleBuffer.bytes).set([4, 7, 0, 2, 3, 0]);
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
        finish() {
          return effects;
        },
      };
    },
    queue: {
      writeBuffer(buffer: Buffer, offset: number, data: ArrayBufferView) {
        new Uint8Array(buffer.bytes, offset, data.byteLength).set(
          new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
        );
      },
      submit(commands: (() => void)[][]) {
        for (const effects of commands) for (const run of effects) run();
      },
      async onSubmittedWorkDone() {},
    },
    destroy() {
      throw new Error('the shared device must survive');
    },
  };
  const result = await captureRenderFrame(
    device,
    pack,
    { vertex: 'vertex', fragment: 'fragment', targets: ['rgba8unorm'], constants: { quality: 2 } },
    { u: { value: 0.5 } },
    { count: 3 },
    8,
    6,
    64,
    [7, -1, 5, 2],
  );
  expect(text).toEqual([pack.console?.wgsl]);
  expect(result.dropped).toBe(7);
  expect(result.events[0]?.args).toEqual(['hello']);
  expect(result.events[0]?.invocation).toEqual([2, 3, 0]);
  expect(result.events[0]?.span?.file).toBe('capture.shade.ts');
  expect(scissors).toEqual([[7, 0, 1, 2]]);
  expect(allocated.every((a) => a.destroyed)).toBe(true);
});
