import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import { compileModule } from '../../../vendor/shader-dsl/src/core/oracle.ts';
import { hasConsoleCall } from '../../../vendor/shader-dsl/src/core/passes/console-buffer.ts';
import { reflect } from '../../../vendor/shader-dsl/src/core/reflect.ts';
import { isReserved } from '../../lib/live-shader-compile-contract.ts';
import { isPlotLayout, reservedValue } from '../../lib/live-shader-contract.ts';
import {
  cornersOf,
  drawTile,
  entryArguments,
  RASTER_PRECISION,
  zeroFor,
  type CpuFunctions,
  type RasterPlan,
  type ReflectedEntry,
} from '../playground-raster.ts';
import type { BindingsModel } from '../playground-bindings.ts';
import type { EmitChoice, PlaygroundCopy } from './contracts.ts';
import { formatValue, parseArg } from './view-helpers.ts';
interface CpuState {
  readonly compiled: { readonly module: ModuleDecl } | undefined;
  readonly reflection: ReturnType<typeof reflect> | undefined;
  readonly entries: readonly ReflectedEntry[];
  readonly frozen: number | null;
  readonly pointer: readonly [number, number];
  readonly bindings: BindingsModel;
  readonly workspace: {
    readonly passGraph: readonly { name: string; path: string }[];
    readonly passModules: ReadonlyMap<string, ModuleDecl | undefined>;
  };
}
/** CPU entry evaluation and render plans; worker scheduling lives in raster-controller. */
export function createCpuProgram(
  root: HTMLElement,
  copy: PlaygroundCopy,
  state: CpuState,
  currentChoice: () => EmitChoice,
  engineIsCpu: () => boolean,
  gpuCanvasNow: () => HTMLCanvasElement | undefined,
) {
  const reflectionPane = root.querySelector('[data-reflection]');
  const canvas = root.querySelector('[data-canvas]');

  /** Runs every entry point on the CPU oracle and writes what each returned. */
  const evaluateOnCpu = async (): Promise<void> => {
    const current = state.compiled;
    try {
      await state.bindings.prepareCpuResources();
    } catch (error) {
      if (reflectionPane instanceof HTMLElement)
        for (const node of reflectionPane.querySelectorAll<HTMLElement>('.io-value'))
          node.textContent = error instanceof Error ? error.message : String(error);
      return;
    }
    if (current !== state.compiled || !state.compiled || !(reflectionPane instanceof HTMLElement))
      return;
    for (const entry of state.entries) {
      const slot = reflectionPane.querySelector(
        `[data-returns="${CSS.escape(entry.name)}"] .io-value`,
      );
      const target =
        slot instanceof HTMLElement
          ? slot
          : reflectionPane.querySelector(`[data-returns="${CSS.escape(entry.name)}"]`)
              ?.lastElementChild;
      if (!(target instanceof HTMLElement)) continue;
      const inputs = entry.io?.inputs ?? [];
      const args: unknown[] = [];
      let invalid = false;
      for (const [index, field] of inputs.entries()) {
        const name = field.name ?? `arg${index}`;
        const typed = reflectionPane.querySelector(
          `[data-arg="${CSS.escape(`${entry.name}/${name}`)}"]`,
        );
        const zero = zeroFor(field.type);
        const text = typed instanceof HTMLInputElement ? typed.value : '';
        try {
          args.push(parseArg(text, zero.ok ? zero.value : 0));
        } catch {
          invalid = true;
          break;
        }
      }
      if (invalid) {
        target.textContent = copy.argsInvalid;
        target.className = 'io-value failed';
        continue;
      }
      try {
        // The IR is compiled to the oracle here the way the raster worker compiles it, and the
        // entry is called directly; the old `compiled.eval` did the same work per call.
        const oracle = compileModule(state.compiled.module, { gpuStubs: true });
        for (const [name, value] of Object.entries(
          state.bindings.cpuBindings(state.frozen ?? 0, 1, 1, state.pointer),
        ))
          oracle.setBinding(name, value as never);
        const run = (oracle.fns as CpuFunctions)[entry.name];
        if (!run) throw new Error(entry.name);
        const value = run(
          ...(entryArguments(entry, state.compiled.module.structs, (i) => args[i]) as never[]),
        );
        const shownArgs = inputs
          .map((f, i) => `${f.name ?? `arg${i}`} = ${formatValue(args[i])}`)
          .join(', ');
        target.textContent = shownArgs
          ? `${formatValue(value)}   (${shownArgs})`
          : formatValue(value);
        target.className = 'io-value';
      } catch (error) {
        // `compileModule` takes `gpuStubs` and `precision` and no resource values, so an entry
        // reading a uniform or a storage binding has nothing to read and the oracle stops at
        // the name. The reader gets that sentence instead of the compiler's.
        const message = error instanceof Error ? error.message : '';
        const binds = (state.reflection?.bindGroups ?? []).some(
          (group) => (group.entries ?? []).length > 0,
        );
        target.textContent =
          binds && /unknown (?:const|var|binding)/.test(message)
            ? copy.cpuNoResources
            : message || copy.cpuFailed;
        target.className = 'io-value failed';
      }
    }
  };

  /** The bindings the CPU oracle draws a frame with: the panel's, and for a program drawn in
   *  several passes (compiler change 0026) each pass's output, drawn here in order at the
   *  frame's size. The CPU draws frame 0, so a pass read as the frame before reads zeroes, as
   *  the first frame on the GPU does. A pass's colour is kept as floats, so a value outside 0
   *  to 1 reaches the next program as it does on the GPU. */
  const cpuFrameBindings = (
    seconds: number,
    width: number,
    height: number,
  ): Record<string, unknown> => {
    const plot = isPlotLayout(state.bindings.renderBlock() ?? { fields: [] });
    const target = engineIsCpu() ? canvas : gpuCanvasNow();
    const box = target instanceof HTMLCanvasElement ? target.getBoundingClientRect() : undefined;
    const cssWidth = plot && box && box.width > 0 ? box.width : width;
    const cssHeight = plot && box && box.height > 0 ? box.height : height;
    const out = state.bindings.cpuBindings(
      seconds,
      cssWidth,
      cssHeight,
      state.pointer,
      width / Math.max(cssWidth, 1),
    );
    if (state.workspace.passGraph.length === 0) return out;
    const names = state.workspace.passGraph.map((p) => p.name);
    const drawn = new Map<string, Float32Array<ArrayBuffer>>();
    const specFor = (
      name: string,
      group: number,
      binding: number,
      floats: Float32Array<ArrayBuffer>,
    ) => ({
      kind: 'texture' as const,
      name,
      group,
      binding,
      dim: '2d' as const,
      sample: 'float' as const,
      width,
      height,
      layers: 1,
      texels: [],
      pass: name,
      floats: [floats],
    });
    const zeroes = new Float32Array(width * height * 4);
    state.workspace.passGraph.forEach((p, i) => {
      const module = state.workspace.passModules.get(p.name);
      if (!module) return;
      const r = reflect(module, { fp64Flavor: currentChoice().fp64Flavor });
      const vertex = r.entries.find((e) => e.stage === 'vertex');
      const fragment = r.entries.find((e) => e.stage === 'fragment');
      if (!vertex || !fragment) return;
      const values: Record<string, unknown> = {};
      for (const group of r.bindGroups) {
        for (const e of group.entries) {
          if (e.resourceKind === 'texture' && names.includes(e.name)) {
            // An earlier pass is read as this frame's, itself or a later one as frame 0's before.
            const j = names.indexOf(e.name);
            values[e.name] = specFor(
              e.name,
              group.group,
              e.binding,
              (j < i && drawn.get(e.name)) || zeroes,
            );
          } else if (e.resourceKind === 'sampler') {
            values[e.name] = {
              kind: 'sampler',
              name: e.name,
              group: group.group,
              binding: e.binding,
              comparison: false,
              filter: 'linear',
              address: 'clamp-to-edge',
            };
          } else if (e.resourceKind === 'uniform-buffer') {
            const block = r.uniforms[0];
            const fields: Record<string, unknown> = {};
            for (const f of block?.fields ?? []) {
              const v = isReserved(f.name, f.type)
                ? reservedValue(f.name, seconds, width, height, state.pointer)
                : null;
              fields[f.name] = v === null ? 0 : v.length === 1 ? v[0] : [...v];
            }
            values[e.name] = fields;
          }
        }
      }
      const plan: RasterPlan = {
        width,
        height,
        vertex,
        fragment,
        structs: module.structs.map((struct) => ({
          name: struct.name,
          fields: struct.fields.map((f) => ({ name: f.name })),
        })),
        bindings: values,
      };
      const oracle = compileModule(module, { gpuStubs: true, precision: RASTER_PRECISION });
      for (const [name, value] of Object.entries(values)) oracle.setBinding(name, value as never);
      const cpu = oracle.fns as CpuFunctions;
      const corners = cornersOf(cpu, plan);
      const floats = new Float32Array(width * height * 4);
      if (corners) drawTile(cpu, plan, corners, 0, 0, width, height, undefined, floats);
      drawn.set(p.name, floats);
    });
    // The program reads every pass as this frame's.
    for (const [key, value] of Object.entries(out)) {
      const spec = value as { kind?: string; pass?: string; group?: number; binding?: number };
      if (spec?.kind === 'texture' && spec.pass && drawn.has(spec.pass))
        out[key] = specFor(spec.pass, spec.group ?? 0, spec.binding ?? 0, drawn.get(spec.pass)!);
    }
    return out;
  };

  const rasterPlan = (): RasterPlan | undefined => {
    if (!state.compiled || !(canvas instanceof HTMLCanvasElement)) return undefined;
    const vertex = state.entries.find((entry) => entry.stage === 'vertex');
    const fragment = state.entries.find((entry) => entry.stage === 'fragment');
    if (!vertex || !fragment) return undefined;
    const attributes = state.bindings.cpuAttributes();
    if (
      !(vertex.io?.inputs ?? []).some((field) => field.builtin === 'vertex_index') &&
      Object.keys(attributes).length === 0
    )
      return undefined;
    if (!vertex.io?.outputs?.some((field) => field.builtin === 'position')) return undefined;
    return {
      width: canvas.width,
      height: canvas.height,
      vertex,
      fragment,
      structs: state.compiled.module.structs.map((struct) => ({
        name: struct.name,
        fields: struct.fields.map((f) => ({ name: f.name })),
      })),
      bindings: cpuFrameBindings(state.frozen ?? 0, canvas.width, canvas.height),
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      ...(hasConsoleCall(state.compiled.module) ? { console: true } : {}),
    };
  };
  return { evaluateOnCpu, cpuFrameBindings, rasterPlan };
}
