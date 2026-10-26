// The forms one builtin takes on each target, by the texture it reads, for the Targets section
// of its language reference page. An author writes the same call on every texture, and the
// compiler picks what each target needs: GLSL ES 3.00's `texelFetch` has no unsigned coordinate
// and no layer argument, and no multisampled or 1d texture at all. Each row is one whole file
// through the pinned compiler (src/lib/target-mapping.ts, emitted()), so a form the compiler
// stops writing changes the row at the next pin, and a call it stops accepting stops the build.
import { emitted } from './target-mapping.ts';

/** One row: the texture type, the call as written, and what each target writes for it. A
 *  target with no form is null. */
export interface TextureForm {
  readonly texture: string;
  readonly call: string;
  readonly wgsl: string;
  readonly glsl: string | null;
}

/** The probes, by builtin. A call that returns a scalar is wrapped so the entry returns a vec4;
 *  only the call itself is read back. */
const PROBES: Readonly<
  Record<string, readonly (readonly [texture: string, call: string, wrap?: true])[]>
> = {
  textureLoad: [
    ['texture_2d<f32>', 'textureLoad(t, vec2i(1, 2), 0)'],
    ['texture_2d<f32>', 'textureLoad(t, vec2u(1, 2), 0)'],
    ['texture_3d<f32>', 'textureLoad(t, vec3i(1, 2, 3), 0)'],
    ['texture_3d<f32>', 'textureLoad(t, vec3u(1, 2, 3), 0)'],
    ['texture_2d_array<f32>', 'textureLoad(t, vec2i(1, 2), 3, 0)'],
    ['texture_2d_array<f32>', 'textureLoad(t, vec2u(1, 2), 3, 0)'],
    ['texture_1d<f32>', 'textureLoad(t, 1, 0)'],
    ['texture_multisampled_2d<f32>', 'textureLoad(t, vec2i(1, 2), 0)'],
    ['texture_depth_multisampled_2d', 'textureLoad(t, vec2i(1, 2), 0)', true],
  ],
};

/** The call to `name` in an emitted line, with its arguments, brackets balanced. */
function callIn(text: string, name: string, where: string): string {
  const line = text.split('\n').find((l) => l.includes(`${name}(`));
  if (line === undefined) throw new Error(`[texture-load-forms] no ${name}( in the ${where}`);
  const start = line.indexOf(`${name}(`);
  let depth = 0;
  for (let i = start + name.length; i < line.length; i++) {
    if (line[i] === '(') depth++;
    else if (line[i] === ')' && --depth === 0) return line.slice(start, i + 1);
  }
  throw new Error(`[texture-load-forms] an unbalanced ${name}( in the ${where}`);
}

const cache = new Map<string, readonly TextureForm[]>();

/** The forms of `name` by texture, or undefined for a builtin with no probes. */
export function textureForms(name: string): readonly TextureForm[] | undefined {
  const probes = PROBES[name];
  if (!probes) return undefined;
  const hit = cache.get(name);
  if (hit) return hit;
  const forms = probes.map(([texture, call, wrap]): TextureForm => {
    const value = wrap ? `vec4(${call}, 0., 0., 1.)` : call;
    const e = emitted(
      `declare const t: ${texture}\n\n@fragment\nexport function fs(): vec4 {\n  return ${value}\n}\n`,
    );
    return {
      texture,
      call,
      wgsl: callIn(e.wgsl, name, `WGSL for ${texture}`),
      glsl: e.glslFragment ? callIn(e.glslFragment, 'texelFetch', `GLSL for ${texture}`) : null,
    };
  });
  cache.set(name, forms);
  return forms;
}
