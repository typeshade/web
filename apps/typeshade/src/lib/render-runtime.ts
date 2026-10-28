import {
  createRuntime,
  type Pack,
  type RenderState,
  type Geometry,
  type Texture,
} from '../../vendor/shader-dsl/src/runtime.ts';
import type { ConsoleEvent } from '../../vendor/shader-dsl/src/core/console.ts';
import type { ShaderLayout, UniformBlockLayout } from './shader-runtime.ts';

type Layout = NonNullable<Pack['bindings'][number]['layout']>;

export async function renderProgram<D extends object>(
  device: D,
  manifest: Pack,
  vertex: string,
  fragment: string,
  format: string,
  constants?: Readonly<Record<string, number>>,
) {
  const runtime = await createRuntime({ device, console: () => {} });
  try {
    const program = runtime.load(manifest, { console: false });
    const pipeline = await program.render({ vertex, fragment, targets: [format], constants });
    return { runtime, pipeline };
  } catch (error) {
    runtime.destroy();
    throw error;
  }
}

export async function captureRenderFrame<D extends object>(
  device: D,
  manifest: Pack,
  state: RenderState,
  values: Record<string, unknown>,
  geometry: Geometry,
  width: number,
  height: number,
  words: number,
  scissor?: readonly [number, number, number, number],
) {
  const events: ConsoleEvent[] = [];
  const runtime = await createRuntime({
    device,
    console: (event) => events.push(event),
    consoleBytes: 8 + 4 * Math.max(1, Math.floor(words)),
  });
  let target: Texture | undefined;
  try {
    const program = runtime.load(manifest, { console: true });
    const pipeline = await program.render(state);
    const format = state.targets?.[0];
    target = runtime.texture({
      size: [width, height],
      format: typeof format === 'string' ? format : (format?.format ?? 'rgba8unorm'),
    });
    const frame = runtime.frame();
    frame.pass({ color: [target] }, (pass) => {
      if (scissor) {
        const [sx, sy, sw, sh] = scissor;
        const x = Math.min(width, Math.max(0, Math.floor(sx)));
        const y = Math.min(height, Math.max(0, Math.floor(sy)));
        (
          pass.raw as { setScissorRect(x: number, y: number, width: number, height: number): void }
        ).setScissorRect(
          x,
          y,
          Math.max(0, Math.min(width - x, Math.floor(sw))),
          Math.max(0, Math.min(height - y, Math.floor(sh))),
        );
      }
      pass.draw(pipeline, values, geometry);
    });
    const result = await frame.submit();
    return {
      events,
      dropped: result.console.reduce((sum, row) => sum + row.dropped, 0),
      width,
      height,
    };
  } finally {
    target?.destroy();
    runtime.destroy();
  }
}

/** Recover the host values shared with the WebGL2 packer. The program runtime packs these
 * values using the manifest, including f64 planes and nested layouts. */
export function readUniform(layout: Layout, view: DataView, offset = 0): unknown {
  const scalar = (type: string, at: number): number =>
    type === 'i32'
      ? view.getInt32(at, true)
      : type === 'u32'
        ? view.getUint32(at, true)
        : view.getFloat32(at, true);
  switch (layout.kind) {
    case 'scalar':
      return layout.type === 'f64'
        ? scalar('f32', offset) + scalar('f32', offset + 4)
        : scalar(layout.type, offset);
    case 'vector':
      return Array.from({ length: layout.size }, (_, i) =>
        layout.type === 'f64'
          ? scalar('f32', offset + i * 4) +
            scalar('f32', offset + (layout.lo ?? layout.size * 4) + i * 4)
          : scalar(layout.type, offset + i * 4),
      );
    case 'matrix':
      return Array.from({ length: layout.columns }, (_, c) =>
        Array.from({ length: layout.rows }, (_, r) =>
          scalar('f32', offset + c * layout.columnStride + r * 4),
        ),
      ).flat();
    case 'array':
      if (layout.length === null) throw new Error('a uniform array needs a fixed length');
      return Array.from({ length: layout.length }, (_, i) =>
        readUniform(layout.element, view, offset + i * layout.stride),
      );
    case 'struct':
      return Object.fromEntries(
        layout.fields.map((f) => [f.name, readUniform(f.layout, view, offset + f.offset)]),
      );
  }
}

export function uniformBindings(
  manifest: Pack,
  first: ShaderLayout,
  state: {
    readonly data: Float32Array<ArrayBuffer> | null;
    readonly more: readonly {
      readonly layout: UniformBlockLayout;
      readonly data: Float32Array<ArrayBuffer>;
    }[];
  },
): Record<string, unknown> {
  const blocks = [...(state.data ? [{ layout: first, data: state.data }] : []), ...state.more];
  const out: Record<string, unknown> = {};
  for (const block of blocks) {
    const binding = manifest.bindings.find(
      (b) =>
        b.group === block.layout.group &&
        b.binding === block.layout.binding &&
        b.resource.resourceKind === 'uniform-buffer',
    );
    if (!binding?.layout) continue;
    out[binding.name] = readUniform(
      binding.layout,
      new DataView(block.data.buffer, block.data.byteOffset, block.data.byteLength),
    );
  }
  return out;
}

/** Entries can stop reaching a binding after an edit. The runtime refuses extra names. */
export function reachedBindings(
  manifest: Pack,
  vertex: string,
  fragment: string,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const entries = manifest.entries.filter((e) => e.name === vertex || e.name === fragment);
  const names = new Set(entries.flatMap((e) => (e.bindings ?? []).map((b) => b.name)));
  return Object.fromEntries(Object.entries(values).filter(([name]) => names.has(name)));
}
