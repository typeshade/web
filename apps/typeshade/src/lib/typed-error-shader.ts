// The fixture the verification page's author-time section checks and reflects: a whole
// `"use typeshade"` file. typed-error.ts reads it, breaks its one read of `u.top` into a
// misspelt field, and asks the language service (the editor) and `compile()` what they say
// about each copy. Keep exactly one `u.top` in it.

/** The name the page gives the file. */
export const typedErrorFile = 'typed-error.shade.ts';

export const typedErrorSource = `"use typeshade"

class Uniforms {
  time: f32
  top: vec4
  bottom: vec4
}

declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const t = uv.y + u.time * 0.05
  return vec4(mix(u.bottom.rgb, u.top.rgb, t), 1.0)
}
`;
