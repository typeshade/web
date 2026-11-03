export const useTypeshadeSample = `"use typeshade";

interface Clip {
  pos: builtin<"position", vec4>;
}

interface Color {
  color: location<0, vec4>;
}

export const vs = vertex(function vs(i: builtin<"vertex_index", u32>): Clip {
  const x = i === 1 ? 0.8 : i === 2 ? 0. : -0.8;
  const y = i === 2 ? 0.8 : -0.8;
  return { pos: vec4(x, y, 0., 1.) };
});

export const fs = fragment(function fs(): Color {
  return { color: vec4(1., 0., 0., 1.) };
});
`;
