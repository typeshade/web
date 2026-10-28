export const useTypeshadeSample = `"use typeshade";

class Clip {
  @builtin("position") pos: vec4;
}

class Color {
  @location(0) color: vec4;
}

@vertex
export function vs(@builtin("vertex_index") i: u32): Clip {
  const x = i === 1 ? 0.8 : i === 2 ? 0. : -0.8;
  const y = i === 2 ? 0.8 : -0.8;
  return { pos: vec4(x, y, 0., 1.) };
}

@fragment
export function fs(): Color {
  return { color: vec4(1., 0., 0., 1.) };
}
`;
