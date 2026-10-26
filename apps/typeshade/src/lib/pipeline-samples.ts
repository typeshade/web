// The code samples of /guide/concepts/the-pipeline/, compiled through the pinned compiler while
// the page is built. The entry and compute samples are whole files, with the `Camera` uniform
// the language guide declares (LanguagePage.astro), so a reader can paste one into the
// Playground; the interpolation sample is a class alone and is checked with the directive in
// front of it. A sample that stops compiling at a later pin stops the build here.
import { compileTsSource } from '../../vendor/shader-dsl/src/compiler/ts/source-file.ts';

const CAMERA = `"use typeshade";

class Camera {
  view: mat4
  pos: vec3
}

declare const camera: uniform<Camera>
`;

export const entrySample = `${CAMERA}
class VsIn {
  @location(0) position: vec3
  @location(1) uv: vec2
}

@vertex
export function vs(@builtin("vertex_index") vid: u32, vin: VsIn): vec4 {
  return camera.view * vec4(vin.position, 1)
}

@fragment
export function fs(@builtin("position") pid: vec4): vec4 {
  return vec4(pid.x, 0, 0, 1)
}`;

export const interpolationSample = `class VsOut {
  @builtin("position") pos: vec4
  @location(0) uv: vec2
  @location(1) id: u32
  @location(2) @interpolate("flat") tint: vec3
}`;

export const computeSample = `${CAMERA}
declare const pixels: storage<array<f32>, "read_write">

@compute([64, 1, 1])
export function paint(@builtin("global_invocation_id") gid: vec3u) {
  pixels[gid.x] = camera.pos.x
}`;

for (const [name, source] of [
  ['entry', entrySample],
  ['interpolation', `"use typeshade";\n\n${interpolationSample}\n`],
  ['compute', computeSample],
] as const) {
  const result = compileTsSource(source, {
    fileName: `pipeline-${name}.shade.ts`,
    requireDirective: true,
    emit: false,
  });
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length > 0) {
    throw new Error(
      `[pipeline-samples] the ${name} sample failed: ${errors.map((e) => `${e.code} ${e.message}`).join('; ')}`,
    );
  }
}
