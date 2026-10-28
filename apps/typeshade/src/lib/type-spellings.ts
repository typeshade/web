// What each backend writes for a scalar, vector or matrix type of the language, for the title
// and the description of its reference page. The name goes through the front end as a
// per-invocation variable and comes back as each backend spells it (src/lib/target-mapping.ts),
// so a spelling the compiler changes reaches the page at the next pin. A texture or a sampler
// has no one-to-one GLSL ES 3.00 spelling (GLSL fuses the two into one sampler type), and an
// f64 type is emulated before either backend runs, so neither is spelled here.
import { glslEs300Backend, wgslBackend } from '../../vendor/shader-dsl/src/index.ts';
import { probe, typeRows } from './target-mapping.ts';

/** The scalar, vector and matrix names the reference documents. */
const VALUE_TYPE = /^(f32|i32|u32|bool|vec[234][fiub]?|mat[234](x[234])?f?)$/;

const cache = new Map<string, { readonly wgsl: string; readonly glsl: string } | undefined>();

/** Both targets' spelling of a type, or undefined where the page names no pair. */
export function typeSpellings(
  name: string,
): { readonly wgsl: string; readonly glsl: string } | undefined {
  if (!VALUE_TYPE.test(name)) return undefined;
  if (cache.has(name)) return cache.get(name);
  const probes = [probe(name, name, 'private')];
  const wgsl = typeRows(wgslBackend, probes)[0]!.target;
  const glsl = typeRows(glslEs300Backend, probes)[0]!.target;
  const pair = wgsl && glsl ? { wgsl, glsl } : undefined;
  if (!pair) throw new Error(`[type-spellings] '${name}' has no spelling on one target`);
  cache.set(name, pair);
  return pair;
}
