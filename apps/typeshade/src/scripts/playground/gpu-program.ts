import { hostFeaturesFor } from '../../../vendor/shader-dsl/src/core/backend.ts';
import { wgslBackend } from '../../../vendor/shader-dsl/src/core/backends/wgsl.ts';
import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import { reflect } from '../../../vendor/shader-dsl/src/core/reflect.ts';
import type { ResourceSpec } from '../../lib/shader-bindings.ts';
import { type ShaderData, type ShaderPassData } from '../../lib/shader-runtime.ts';
import type { BindingsModel } from '../playground-bindings.ts';
import type { ReflectedEntry } from '../playground-raster.ts';
import type { EmitChoice, PlaygroundCopy, Target } from './contracts.ts';
import { emitGlsl, emitWgsl, programManifest } from './emission.ts';
import { fillNumbers } from './view-helpers.ts';
interface ProgramState {
  readonly compiled: { readonly module: ModuleDecl } | undefined;
  readonly reflection: ReturnType<typeof reflect> | undefined;
  readonly emitted: Partial<Record<Target, string>>;
  readonly entries: readonly ReflectedEntry[];
  readonly fileName: string;
  readonly glslFailure: string;
  readonly workspace: {
    readonly passGraph: readonly { name: string; path: string }[];
    readonly passModules: ReadonlyMap<string, ModuleDecl | undefined>;
  };
}
type Engine = EmitChoice['backend'];
/** Builds runtime data from compiler output; never mounts a canvas or changes the editor. */
export function createGpuProgram(
  copy: PlaygroundCopy,
  bindings: BindingsModel,
  currentChoice: () => EmitChoice,
  state: ProgramState,
) {
  const w = copy.workspace;

  /** What the GPU canvas should run, or why it cannot run this module. */
  const gpuPayload = (picked: Engine): { readonly data: ShaderData } | { readonly why: string } => {
    if (!state.compiled || !state.reflection || !state.emitted.wgsl) return { why: copy.gpuIdle };
    const missing = bindings.missing();
    if (missing.length > 0)
      return { why: fillNumbers(copy.gpuNeedsBindings, { names: missing.join(', ') }) };
    // The runtime draws three vertices and binds no vertex buffer, so a vertex entry that
    // reads an attribute from one has nothing to read. Saying which attribute beats letting
    // the pipeline fail and reporting that the browser has no GPU API.
    const vertex = state.entries.find((entry) => entry.stage === 'vertex');
    const fragment = state.entries.find((entry) => entry.stage === 'fragment');
    if (!vertex || !fragment) return { why: copy.gpuNeedsStages };
    const vertexBuffer = bindings.vertexBuffer();
    if (vertexBuffer === null) {
      const attributes = (vertex.io?.inputs ?? [])
        .filter((field) => typeof field.location === 'number')
        .map((field, index) => field.name ?? `arg${index}`);
      return { why: fillNumbers(copy.gpuNeedsAttributes, { fields: attributes.join(', ') }) };
    }
    if (picked === 'webgl2' && !state.emitted.glslVertex) return { why: noGlslNote() };
    // The passes drawn before the program (compiler change 0026), each from its own module.
    const passes: ShaderPassData[] = [];
    const passNames = state.workspace.passGraph.map((p) => p.name);
    for (const p of state.workspace.passGraph) {
      const made = passPayload(p.name, passNames, picked);
      if ('why' in made) return made;
      passes.push(made.data);
    }
    const block = bindings.renderBlock();
    const guards = state.reflection.bindGroups
      .flatMap((group) => group.entries)
      .filter((entry) => entry.name === '_fp64')
      .map((entry) => ({ name: entry.name, binding: entry.binding }));
    return {
      data: {
        id: 'playground',
        title: state.fileName,
        wgsl: state.emitted.wgsl,
        manifest: programManifest(state.compiled.module, currentChoice()),
        // A module the GLSL backend cannot express still runs on WebGPU; the WebGL2 half is
        // what it loses, and the note says which backend drew when neither is left.
        vertex: state.emitted.glslVertex ?? '',
        fragment: state.emitted.glslFragment ?? '',
        layout: {
          size: block?.size ?? 0,
          block: block?.block ?? '',
          group: block?.group ?? 0,
          binding: block?.binding ?? 0,
          instance: block?.instance ?? '',
          fields: block?.fields ?? [],
          vertexEntry: vertex.name,
          fragmentEntry: fragment.name,
          textures: guards,
          resources: bindings.resources(false),
          moreBlocks: bindings.moreBlocks(),
          ...(vertexBuffer ? { vertexBuffer } : {}),
        },
        controls: {},
        constants: bindings.constants(),
        features: gpuFeatures(),
        ...(passes.length > 0 ? { passes } : {}),
      },
    };
  };

  /** One pass's program as the runtime draws it: emitted under the options bar, laid out from
   *  its own reflection. A texture named like a pass reads that pass's output and a sampler
   *  reads it linearly, clamped to the edge; any other texture has nothing to show, so it is
   *  refused by name. Its uniform fields are the page's reserved ones or the main file's of the
   *  same name, and zero otherwise. */
  /** The type of each uniform field the passes declare, by name, for the reserved values a
   *  pass reads (a `frame` is the page's only as a `u32`). */
  const passFieldTypes = new Map<string, string>();

  const passPayload = (
    name: string,
    passNames: readonly string[],
    picked: Engine,
  ): { readonly data: ShaderPassData } | { readonly why: string } => {
    const failed = { why: w.passFailed.replace('{name}', name) };
    const module = state.workspace.passModules.get(name);
    if (!module) return failed;
    const choice = currentChoice();
    const r = reflect(module, { fp64Flavor: choice.fp64Flavor });
    const vertex = r.entries.find((e) => e.stage === 'vertex');
    const fragment = r.entries.find((e) => e.stage === 'fragment');
    if (!vertex || !fragment) return failed;
    const glsl = emitGlsl(module, choice);
    if (picked === 'webgl2' && 'failed' in glsl) return failed;
    const resources: ResourceSpec[] = [];
    const guards: { name: string; binding: number }[] = [];
    for (const group of r.bindGroups) {
      for (const e of group.entries) {
        if (e.name === '_fp64') guards.push({ name: e.name, binding: e.binding });
        else if (e.resourceKind === 'texture') {
          if (!passNames.includes(e.name))
            return {
              why: w.passTexture.replace('{name}', name).replace('{texture}', e.name),
            };
          resources.push({
            kind: 'texture',
            name: e.name,
            group: group.group,
            binding: e.binding,
            dim: '2d',
            sample: 'float',
            width: 0,
            height: 0,
            layers: 1,
            texels: [],
            pass: e.name,
          });
        } else if (e.resourceKind === 'sampler')
          resources.push({
            kind: 'sampler',
            name: e.name,
            group: group.group,
            binding: e.binding,
            comparison: false,
            filter: 'linear',
            address: 'clamp-to-edge',
          });
      }
    }
    const block = r.uniforms[0];
    for (const f of block?.fields ?? []) passFieldTypes.set(f.name, f.type);
    const uniform = r.bindGroups
      .flatMap((g) => g.entries.map((e) => ({ ...e, group: g.group })))
      .find((e) => e.resourceKind === 'uniform-buffer');
    return {
      data: {
        id: `playground.${name}`,
        name,
        title: name,
        wgsl: emitWgsl(module, choice),
        manifest: programManifest(module, choice),
        vertex: 'failed' in glsl ? '' : glsl.vertex,
        fragment: 'failed' in glsl ? '' : glsl.fragment,
        layout: {
          size: block?.size ?? 0,
          block: block?.name ?? '',
          group: uniform?.group ?? 0,
          binding: uniform?.binding ?? 0,
          instance: uniform?.name ?? '',
          fields: (block?.fields ?? []).map((f) => ({
            name: f.name,
            type: f.type,
            offset: f.offset,
          })),
          vertexEntry: vertex.name,
          fragmentEntry: fragment.name,
          textures: guards,
          resources,
        },
        controls: {},
        features: [...hostFeaturesFor(wgslBackend, r.requiredFeatures)],
      },
    };
  };

  /** The optional WebGPU features the module asks for, as WebGPU names them. */
  const gpuFeatures = (): string[] => [
    ...hostFeaturesFor(wgslBackend, state.reflection?.requiredFeatures ?? []),
  ];

  /** Why WebGL2 has nothing to run: the capabilities GLSL ES 3.00 lacks when the emit names
   *  them, and the plain sentence otherwise. */
  const noGlslNote = (): string => {
    const missing = /missing capabilities?:\s*([\w, ]+)/.exec(state.glslFailure)?.[1]?.trim();
    return missing ? fillNumbers(copy.gpuNoGlslFeatures, { features: missing }) : copy.gpuNoGlsl;
  };
  return { gpuPayload, gpuFeatures, noGlslNote, passFieldTypes };
}
