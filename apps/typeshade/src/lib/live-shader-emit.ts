// Build-time compilation for one live example. Runs in Astro frontmatter only (it imports the
// vendored compiler, which pulls TypeScript in), and produces everything LiveShader.astro
// puts on the page: the source the editor opens with, the WGSL and the two GLSL ES 3.00
// stages, the reflected layout the runtime binds against, and the controls the reflection
// asks for. A sample the compiler reports an error on fails the build.
//
// The browser half compiles the same way after an edit (src/scripts/live-shader.ts), through
// the same compile contract (src/lib/live-shader-compile-contract.ts), so the first frame a reader sees and
// the frame after their first keystroke come from one set of rules.

import { projectOptions, type LiveProject } from './live-shader-project.ts';
import { compile, reflect, packModule } from '../../vendor/shader-dsl/src/index.ts';
import {
  composeSource,
  controlsFor,
  isControllable,
  isReserved,
  isPlotHostField,
  layoutFor,
  strayProps,
  RESERVED_UNIFORMS,
  type ControlProps,
  type LiveControl,
} from './live-shader-compile-contract.ts';
import type { ShaderData } from './shader-runtime.ts';

/** Everything one live example puts on the page. */
export interface LiveShaderPayload extends LiveProject {
  readonly id: string;
  /** The text the editor opens with, which is the reader's half alone. */
  readonly source: string;
  /** The text the compiler saw, and how many lines sit in front of the reader's first one. */
  readonly composed: string;
  readonly offset: number;
  readonly data: ShaderData;
  readonly controls: readonly LiveControl[];
  /** What the page's author wrote for each field. The browser half compiles with the same
   *  props, so an edit that keeps a field keeps its range, its label and its colour picker. */
  readonly props: ControlProps;
  /** The reserved fields this sample declares, in declaration order. The page names them
   *  under the controls, so a reader knows `time` moves without a slider. */
  readonly reserved: readonly string[];
  readonly wgsl: string;
  readonly glsl: { readonly vertex: string; readonly fragment: string };
  /** Entry points, for the reflection the page prints. */
  readonly entries: readonly { readonly name: string; readonly stage: string }[];
}

/** Compile one sample and derive its controls. `props` is what the page's author wrote for
 *  each uniform field; a prop for a field the module has no uniform for stops the build. */
export function liveShader(
  id: string,
  title: string,
  source: string,
  props: ControlProps = {},
  project: LiveProject = {},
): LiveShaderPayload {
  const { text, offset } = composeSource(source);
  const options = projectOptions(project);
  // compile() throws on a module the validator rejects instead of reporting it, and the most
  // common authoring mistake (a path that falls through without a return) is one of those.
  let result: ReturnType<typeof compile>;
  try {
    result = compile(text, options);
  } catch (error) {
    throw new Error(
      `[live-shader] '${id}' does not compile: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    const lines = errors
      .map(
        (e) =>
          `  ${e.fileName ?? ''} line ${Math.max(1, e.line - (options.fileName && e.fileName && e.fileName !== options.fileName ? 0 : offset))}: ${e.message}`,
      )
      .join('\n');
    throw new Error(`[live-shader] '${id}' does not compile:\n${lines}`);
  }
  if (!result.wgsl) throw new Error(`[live-shader] '${id}' emitted no WGSL`);
  if (!result.glsl) {
    throw new Error(`[live-shader] '${id}' emitted no GLSL ES 3.00, so it has no WebGL2 fallback`);
  }

  const reflection = reflect(result.module);
  const layout = layoutFor(id, reflection);

  const stray = strayProps(layout, props);
  if (stray.length > 0) {
    const known = layout.fields.map((f) => f.name).join(', ');
    throw new Error(
      `[live-shader] '${id}' has control props for ${stray.join(', ')}, which its uniform ` +
        `block does not declare. Its fields are: ${known || 'none'}`,
    );
  }

  for (const field of layout.fields) {
    if (isPlotHostField(layout, field)) continue;
    if (isReserved(field.name)) {
      const wanted = RESERVED_UNIFORMS[field.name];
      if (field.type !== wanted) {
        throw new Error(
          `[live-shader] '${id}' declares the reserved field '${field.name}' as ${field.type}; ` +
            `the runtime fills it as ${wanted}`,
        );
      }
      continue;
    }
    if (!isControllable(field.type)) {
      throw new Error(
        `[live-shader] '${id}' declares '${field.name}: ${field.type}', which no control ` +
          `covers, so the page would leave it at zero and say nothing`,
      );
    }
  }

  const controls = controlsFor(layout, props);
  const instance = layout.instance ?? '';
  const { vertex, fragment } = result.glsl;
  // A stage that reads the block and still has no declaration for it would not link, and the
  // page would report a browser with no WebGL2 to a reader who has one. The compiler dropped
  // the declaration for a TypeScript-front-end module until the pin this is built against, so
  // the assertion stays: it is one line, and it is the only thing between a silent relink
  // failure and a reader being told their browser has no WebGL2.
  for (const [stage, text2] of [
    ['vertex', vertex],
    ['fragment', fragment],
  ] as const) {
    if (
      layout.size > 0 &&
      new RegExp(`\\b${instance}\\.`).test(text2) &&
      !text2.includes(`uniform ${layout.block}`)
    ) {
      throw new Error(
        `[live-shader] '${id}' emits a GLSL ${stage} stage that reads ${instance} and declares no block for it`,
      );
    }
  }
  const data: ShaderData = {
    id,
    title,
    wgsl: result.wgsl,
    manifest: packModule(result.module),
    vertex,
    fragment,
    layout,
    // Every field of a live example is filled through MountOptions.uniformValues, so the
    // build-time control table the front page uses stays empty here.
    controls: {},
  };

  return {
    id,
    source,
    ...project,
    composed: text,
    offset,
    data,
    controls,
    props,
    reserved: layout.fields.filter((f) => isReserved(f.name)).map((f) => f.name),
    wgsl: result.wgsl,
    glsl: { vertex, fragment },
    entries: reflection.entries.map((e) => ({ name: e.name, stage: e.stage })),
  };
}

/** The bytes LiveShader.astro inlines for one example, with `<` escaped so a `</script` in
 *  the JSON cannot close the block early. */
export function livePayloadJson(payload: LiveShaderPayload): string {
  const inline = {
    id: payload.id,
    source: payload.source,
    fileName: payload.fileName,
    files: payload.files,
    offset: payload.offset,
    data: payload.data,
    controls: payload.controls,
    props: payload.props,
  };
  return JSON.stringify(inline).replace(/</g, '\\u003c');
}
