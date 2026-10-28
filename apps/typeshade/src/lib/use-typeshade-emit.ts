// Build-time WGSL and GLSL ES 3.00 for hello.shade.ts. The front page shows the same module
// three times: the file, the WGSL, and the GLSL fragment stage, so all three come from one
// compile of one source.
import { compile } from '../../vendor/shader-dsl/src/index.ts';
import { useTypeshadeSample } from './use-typeshade-sample.ts';

function emitSample(): { wgsl: string; glsl: string } {
  const result = compile(useTypeshadeSample);
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    throw new Error(`[use-typeshade] sample failed: ${errors.map((e) => e.message).join('; ')}`);
  }
  if (!result.wgsl) {
    throw new Error('[use-typeshade] sample emitted no WGSL');
  }
  if (!result.glsl) {
    throw new Error('[use-typeshade] sample emitted no GLSL ES 3.00');
  }
  return { wgsl: result.wgsl, glsl: result.glsl.fragment };
}

export const useTypeshadeHero = emitSample();
