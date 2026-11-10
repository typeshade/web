// Build-time WGSL and GLSL for the concept pages. On the page that compares the two targets,
// the `"use typeshade"` file the front page shows goes through the pinned compiler three
// times; on the bridge page, its first sample goes through once for WGSL. Each page prints
// what the compiler writes and never a sample typed by hand.
import { compileTsSource } from '../../vendor/shader-dsl/src/compiler/ts/source-file.ts';
import { emitModule, emitGlslModule } from '../../vendor/shader-dsl/src/index.ts';
import { useTypeshadeSample } from './use-typeshade-sample.ts';

function emitBothTargets(): { wgsl: string; glslVertex: string; glslFragment: string } {
  const result = compileTsSource(useTypeshadeSample, {
    fileName: 'hello.shade.ts',
    requireDirective: true,
    emit: false,
  });
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    throw new Error(`[concepts-emit] sample failed: ${errors.map((e) => e.message).join('; ')}`);
  }
  const module = {
    consts: [...result.consts],
    structs: result.structs.map((s) => s.decl),
    bindings: [...result.bindings],
    funcs: [...result.funcs],
  };
  const emitted = {
    wgsl: emitModule(module),
    glslVertex: emitGlslModule(module, 'vertex'),
    glslFragment: emitGlslModule(module, 'fragment'),
  };
  for (const [target, text] of Object.entries(emitted)) {
    if (text.trim().length === 0)
      throw new Error(`[concepts-emit] the sample emitted no ${target}`);
  }
  return emitted;
}

/** The sample compiled for both targets, for /guide/concepts/wgsl-and-glsl/. */
export const bothTargets = emitBothTargets();

/** The first sample on /guide/typescript-and-webgpu/, a whole `"use typeshade"` file. */
export const bridgeSample = `"use typeshade";

@vertex
export function main(): vec4 {
  return vec4(0., 0., 0., 1.);
}`;

/** The WGSL the pinned compiler writes for one whole file. A file that does not compile stops
 *  the build with the diagnostics an author would see, and so does one that emits nothing. */
function emitWgsl(source: string, fileName: string): string {
  const result = compileTsSource(source, { fileName, requireDirective: true, emit: false });
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    throw new Error(
      `[concepts-emit] ${fileName} failed: ${errors.map((e) => e.message).join('; ')}`,
    );
  }
  const wgsl = emitModule({
    consts: [...result.consts],
    structs: result.structs.map((s) => s.decl),
    bindings: [...result.bindings],
    funcs: [...result.funcs],
  });
  if (wgsl.trim().length === 0) throw new Error(`[concepts-emit] ${fileName} emitted no WGSL`);
  return wgsl;
}

/** The bridge sample's WGSL, for /guide/typescript-and-webgpu/. */
export const bridgeWgsl = emitWgsl(bridgeSample, 'main.shade.ts');
