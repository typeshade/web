// The code samples of /guide/concepts/the-pipeline/, compiled through the pinned compiler while
// the page is built. The entry and compute samples are whole files, with the `Camera` uniform
// the language guide declares (LanguagePage.astro), so a reader can paste one into the
// Playground; the interpolation sample is a class alone and is checked with the directive in
// front of it. A sample that stops compiling at a later pin stops the build here.
import { compileTsSource } from '../../vendor/shader-dsl/src/compiler/ts/source-file.ts';

const CAMERA = `"use typeshade";

class Camera {
  view!: mat4
  pos!: vec3
}

declare const camera: uniform<Camera>
`;

export const entrySample = `${CAMERA}
interface VsIn {
  position: location<0, vec3>
  uv: location<1, vec2>
}

export const vs = vertex(function vs(vid: builtin<"vertex_index", u32>, vin: VsIn): vec4 {
  return camera.view * vec4(vin.position, 1)
});

export const fs = fragment(function fs(pid: builtin<"position", vec4>): vec4 {
  return vec4(pid.x, 0, 0, 1)
});`;

export const interpolationSample = `class VsOut {
  pos!: builtin<"position", vec4>
  uv!: location<0, vec2>
  id!: location<1, u32>
  tint!: location<2, vec3, { interpolate: "flat" }>
}`;

export const computeSample = `${CAMERA}
declare const pixels: storage<array<f32>, "read_write">

export const paint = compute([64, 1, 1], function paint(gid: builtin<"global_invocation_id", vec3u>) {
  pixels[gid.x] = camera.pos.x
});`;

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
