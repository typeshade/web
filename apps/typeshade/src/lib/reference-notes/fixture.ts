// The record of the fixture note (scripts/fixtures/reference-notes/), a note for `exp2` that no
// page publishes. It uses every token the notes have, one live example and one code sample, so
// a fault planted into any part of it shows that the check guarding that part fails
// (scripts/reference-notes.test.ts).
import { compile, compileModule } from '../../../vendor/shader-dsl/src/index.ts';
import type { NoteRecord, NoteStill } from './index.ts';

const curve = `"use typeshade"

class Uniforms {
  k: f32
}
declare const u: uniform<Uniforms>

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const y = exp2(u.k * uv.x) / exp2(u.k)
  const inside = step(uv.y, y)
  return vec4(mix(vec3(0.94), vec3(0.09, 0.47, 1.0), inside), 1.)
}
`;

/** The oracle's exp2 against JavaScript's power of two, on whole exponents, where both are
 *  exact. */
function oracleIsPowerOfTwo(): boolean {
  const { module } = compile(
    `"use typeshade"\n\nexport function probe(x: f32): f32 {\n  return exp2(x)\n}\n`,
  );
  const probe = compileModule(module).fns.probe!;
  for (let x = -8; x <= 8; x += 1) if (probe(x) !== Math.pow(2, x)) return false;
  return true;
}

export const fixtureExp2: NoteRecord = {
  scope: 'x: f32, k: f32',
  samples: {
    doubled: {
      file: 'doubled.shade.ts',
      code: `"use typeshade"\n\nexport function doubled(x: f32): f32 {\n  return exp2(x + 1.0)\n}\n`,
    },
  },
  live: {
    'reference-fixture-exp2': {
      file: 'exp2-curve.shade.ts',
      aspect: '2/1',
      code: curve,
      controls: { k: { min: 0.5, max: 4, step: 0.01, value: 2 } },
    },
  },
  compile: {
    'int-argument': {
      source: `"use typeshade"\n\nexport function f(n: i32): f32 {\n  return exp2(n)\n}\n`,
    },
    stays: {
      source: `"use typeshade"\n\nexport function f(x: f32): f32 {\n  return exp2(x)\n}\n`,
      wgsl: 'exp2(',
    },
  },
  asserts: { oracleIsPowerOfTwo },
  literals: {},
};

/** The fixture's live example is captured nowhere; the check reads this beside STILLS. */
export const FIXTURE_STILLS: readonly NoteStill[] = [
  { id: 'reference-fixture-exp2', live: true, page: '/reference/functions/exp2/' },
];
