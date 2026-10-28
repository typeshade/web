// The record of the reference note on `pow` (content/reference/en/function-pow.md): its three
// live examples, the programs its {{compile}} tokens read, the scope its code spans compile in,
// what it asserts and the spans that are no expression. The live examples name their entries
// after what they draw.
import { plotShaderFiles } from 'typeplot/shaders';
import { compile, compileModule } from '../../../vendor/shader-dsl/src/index.ts';
import type { NoteRecord } from './index.ts';

const plotFiles: Readonly<Record<string, string>> = plotShaderFiles;

const curve = `"use typeshade"

import { PlotViewport, plotFilled } from "./function-plot.shade.ts";

class Uniforms extends PlotViewport { k: f32; }
declare const u: uniform<Uniforms>;

// At k = 2, pow(0.5, 2.) = 0.25. The imported renderer draws the reference diagonal y = x.
function sample(x: f32): f32 {
  // uv is a data coordinate here, so the expression remains editable after pan and zoom.
  const uv = vec2(x, 0.);
  if (uv.x < 0.) { return 1e20; }
  const y = pow(uv.x, u.k);
  return y;
}

@fragment
export function curve(@location(0) uv: vec2): vec4 {
  return plotFilled(sample, uv, u);
}
`;

const negative = `"use typeshade"

import { PlotViewport, plotComparison } from "./function-plot.shade.ts";

class Uniforms extends PlotViewport { k: f32; }
declare const u: uniform<Uniforms>;

function signedCurve(x: f32): f32 {
  const p = vec2(x, 0.);
  const signed = sign(p.x) * pow(abs(p.x), u.k);
  return signed;
}

function rawCurve(x: f32): f32 {
  const p = vec2(x, 0.);
  const bare = pow(p.x, u.k);
  return bare;
}

@fragment
export function plot(@location(0) uv: vec2): vec4 {
  return plotComparison(signedCurve, rawCurve, uv, u);
}
`;

const specular = `"use typeshade"

class Uniforms {
  resolution: vec2
  light: vec2
  shininess: f32
}

declare const u: uniform<Uniforms>

@fragment
export function sphere(@location(0) uv: vec2): vec4 {
  // A sphere of radius 1 at the centre. x is scaled by the aspect so the sphere stays round.
  const p = (uv - 0.5) * vec2(u.resolution.x / u.resolution.y, 1.) * 2.4
  const r2 = dot(p, p)
  const n = vec3(p, sqrt(max(1. - r2, 0.)))
  // The light sits over the point on the pad, in front of the canvas. The eye looks straight in.
  const toLight = normalize(vec3(u.light * 2. - 1., 0.8))
  // Blinn-Phong: the highlight peaks where the normal points midway between the light and the eye.
  const halfway = normalize(toLight + vec3(0., 0., 1.))
  // The dot product is negative where the surface turns away, so max keeps the base of pow at 0 or above.
  const highlight = pow(max(dot(n, halfway), 0.), u.shininess)
  const diffuse = max(dot(n, toLight), 0.)
  const ball = vec3(0.1, 0.32, 0.7) * (0.2 + 0.8 * diffuse) + highlight
  const background = vec3(0.93, 0.94, 0.96)
  // The last pixel inside the outline blends into the background, so the edge is smooth.
  const edge = smoothstep(1. - fwidth(r2), 1., r2)
  return vec4(r2 < 1. ? mix(ball, background, edge) : background, 1.)
}
`;

/** A small function of `x` and `y` with `body` returning an f32. */
const fn = (body: string, params = 'x: f32, y: f32'): string =>
  `"use typeshade"\n\nexport function f(${params}): f32 {\n${body}\n}\n`;

/** The three spellings of the call emit the same WGSL and the same GLSL. */
function sameEmit(): boolean {
  const emits = ['pow(x, y)', 'Math.pow(x, y)', 'x ** y'].map((call) => {
    const r = compile(fn(`  return ${call}`));
    return `${r.wgsl}\n${r.glsl?.fragment ?? ''}`;
  });
  return emits.every((e) => e === emits[0]) && emits[0]!.includes('pow(x, y)');
}

/** The oracle's pow is JavaScript's Math.pow, at f64, on a grid that includes negative and zero
 *  bases and whole and fractional exponents. */
function oracleIsMathPow(): boolean {
  const probe = compileModule(compile(fn('  return pow(x, y)')).module).fns.f!;
  const bases = [-8, -2, -1, -0.5, 0, 0.5, 1, 2, 10];
  const exponents = [-2, -1, -0.5, 0, 0.5, 1 / 3, 1, 2, 3];
  for (const x of bases)
    for (const y of exponents) if (!Object.is(probe(x, y), Math.pow(x, y))) return false;
  return true;
}

export const functionPow: NoteRecord = {
  scope: 'x: f32, y: f32, a: f32, b: f32, k: f32, v: vec3, c: vec3, gamma: f32, q: vec2, uv: vec2',
  samples: {},
  live: {
    'reference-pow-curve': {
      file: 'pow-curve.shade.ts',
      aspect: '1/1',
      plot: { x: [0, 1], y: [0, 1] },
      code: curve,
      files: plotFiles,
      controls: { k: { min: 0.1, max: 5, step: 0.01, value: 2 } },
    },
    'reference-pow-negative': {
      file: 'pow-negative.shade.ts',
      aspect: '1/1',
      plot: { x: [-1, 1], y: [-1, 1] },
      code: negative,
      files: plotFiles,
      controls: { k: { min: 0.5, max: 5, step: 0.5, value: 3 } },
    },
    'reference-pow-specular': {
      file: 'pow-specular.shade.ts',
      aspect: '2/1',
      code: specular,
      controls: {
        light: { value: [0.25, 0.75] },
        shininess: { min: 4, max: 128, step: 1, value: 24 },
      },
    },
  },
  compile: {
    'int-literal': { source: fn('  return pow(x, 2)', 'x: f32'), wgsl: 'pow(' },
    'int-literal-glsl': { source: fn('  return pow(x, 2)', 'x: f32'), glsl: 'pow(' },
    'starstar-int-literal': { source: fn('  return x ** 2', 'x: f32'), wgsl: 'pow(' },
    'square-stays': { source: fn('  return pow(x, 2.0)', 'x: f32'), wgsl: 'pow(' },
    'glsl-precision': { source: fn('  return pow(x, y)'), glsl: 'precision highp float' },
    'vector-scalar': {
      source: `"use typeshade"\n\nexport function f(v: vec3): vec3 {\n  return pow(v, 2.2)\n}\n`,
    },
    'starstar-vector-scalar': {
      source: `"use typeshade"\n\nexport function f(v: vec3): vec3 {\n  return v ** 2.2\n}\n`,
    },
    'int-operands': {
      source: `"use typeshade"\n\nexport function f(a: i32, b: i32): i32 {\n  return pow(a, b)\n}\n`,
    },
    'starstar-int': {
      source: `"use typeshade"\n\nexport function f(a: i32, b: i32): i32 {\n  return a ** b\n}\n`,
    },
    'starstar-assign': { source: fn('  let a = x\n  a **= b\n  return a', 'x: f32, b: f32') },
    'starstar-rewrite': {
      source: fn('  let a = x\n  a = a ** b\n  return a', 'x: f32, b: f32'),
      wgsl: 'pow(',
    },
    'negative-literal': { source: fn('  return pow(-2.0, 0.5) + x', 'x: f32') },
    'negative-whole': { source: fn('  return pow(-2.0, 2.0) + x', 'x: f32') },
    'runtime-base': { source: fn('  return pow(x, 0.5)', 'x: f32'), wgsl: 'pow(' },
    'module-const-no-value': {
      source: `"use typeshade"\n\nconst K: f32 = pow(-2., 0.5)\n\nexport function f(x: f32): f32 {\n  return K + x\n}\n`,
    },
    'module-const-value': {
      source: `"use typeshade"\n\nconst K: f32 = pow(-2., 2.)\n\nexport function f(x: f32): f32 {\n  return K + x\n}\n`,
    },
  },
  asserts: { sameEmit, oracleIsMathPow },
  literals: {
    int: 'a GLSL type, named where GLSL refuses an int exponent',
    float: 'a GLSL type, in the GLSL column of the definition table',
    genType: "the GLSL specification's name for its float types",
    'genType pow(genType x, genType y)': 'the declaration the GLSL specification prints',
    'fn pow(e1: T, e2: T) -> T': 'the declaration the WGSL specification prints',
    T: "the WGSL declaration's type parameter",
    f16: 'a WGSL type TypeShade does not declare',
    AbstractFloat: 'a WGSL type of constant expressions',
    '@const': 'the WGSL attribute that marks pow as a constant function',
    const: 'the WGSL and TypeScript keyword',
    mediump: 'a GLSL precision qualifier',
    'u.k': 'the uniform the live examples read',
    'uv.x ** u.k': 'an edit to the first live example',
    'pow(dist, 2)': 'quoted from the introduction of the WGSL specification',
    'pow(max(dot(reflect(fromLight, nf), toEye), 0.), 16.)': 'quoted from the bit-bump example',
    'pow(10.0, -u.zoom_exp)': 'quoted from the fp64-julia-twin example',
    'pow(-2.0, 2.0)':
      'a constant call outside the WGSL domain; the compiler refuses it, and In TypeShade draws the refusal',
    'pow(-2.0, 0.5)':
      'a constant call outside the WGSL domain; the compiler refuses it, and In TypeShade draws the refusal',
    'pow(v, 2.2)': 'a call the compiler refuses; the row beside it draws the refusal',
    'v ** 2.2': 'a call the compiler refuses; the row beside it draws the refusal',
    'v: vec3': "a declaration, the type of the refused call's argument",
    'a, b: i32': "a declaration, the type of the refused call's arguments",
    'a **= b': 'a statement the compiler refuses; the row beside it draws the refusal',
    'a = a ** b': 'a statement; the token after it draws what it emits',
    'const K: f32 = pow(-2., 0.5)':
      'a module-scope declaration; the token after it draws the refusal',
    'const K: f32 = pow(-2., 2.)':
      'a module-scope declaration; the token after it draws what it emits',
    'compile()': "the compiler's entry point, an export of the API reference",
    '1. - pow(1. - uv.x, u.k)': 'an edit the first live example asks for',
    'pow(uv.x, 1. / u.k)': 'an edit the first live example asks for',
    'p.x * p.x * p.x': 'an edit the second live example asks for',
    'pow(diffuse, 0.5)': 'an edit the third live example asks for',
    'pow(\u2026, vec3(1. / 2.2))': 'an edit the third live example asks for',
    '1. / 2.2': "the scalar exponent the third live example's exercise names",
  },
};
