// One plotting program for the mathematical function catalogue. Every page compiles the
// actual function call to both backends through LiveShader, including the highlighted point.
import { plotShaderFiles } from 'typeplot/shaders';
import { FUNCTION_DEMOS, type FunctionDemo } from './function-demo-catalog.mjs';
import type { ControlProps } from './live-shader-contract.ts';
import { compile, compileModule } from '../../vendor/shader-dsl/src/index.ts';

export { FUNCTION_DEMOS };

/** Real shader dependencies, kept as separate documents through compilation and editing. */
export const FUNCTION_PLOT_FILES: Readonly<Record<string, string>> = plotShaderFiles;

export const functionDemo = (name: string): FunctionDemo | undefined =>
  FUNCTION_DEMOS.find((demo) => demo.name === name);

const calculationCache = new Map<string, string>();

/** A worked input, evaluated through the same documented function at the compiler pin.
 *  The approximation sign and rounded output describe a reference calculation, not a GPU
 *  precision guarantee. */
export function demoCalculation(demo: FunctionDemo): string {
  const cached = calculationCache.get(demo.name);
  if (cached) return cached;
  const inputs: Record<string, number> = {
    sin: Math.PI / 2,
    cos: 0,
    tan: Math.PI / 4,
    asin: 0.5,
    acos: 0.5,
    atan: 1,
    atan2: 3.5,
    sinh: 1,
    cosh: 1,
    tanh: 1,
    asinh: 1,
    acosh: 2,
    atanh: 0.5,
    exp: 1,
    exp2: 1,
    log: Math.E,
    log2: 2,
    log10: 10,
    log1p: 1,
    expm1: 1,
    sqrt: 4,
    inverseSqrt: 4,
    cbrt: -8,
    abs: -2,
    sign: -2,
    floor: -1.2,
    ceil: -1.2,
    round: 1.6,
    trunc: -1.2,
    fract: -1.2,
    saturate: 1.5,
    degrees: Math.PI,
    radians: 180,
    mod: -0.5,
    min: 1.5,
    max: -0.5,
    step: -0.5,
    clamp: 1.5,
    mix: 0.25,
    smoothstep: 0.5,
    fma: 2,
    ldexp: 1,
    hypot: 3,
    length: 3,
    distance: 3,
    dot: 2,
    normalize: 1,
  };
  const x = inputs[demo.name];
  if (x === undefined) throw new Error(`[function-demos] ${demo.name} has no worked input`);
  const k = demo.k?.value ?? 1;
  const expression = demo.expression.replaceAll('u.k', 'k');
  const result = compile(
    `"use typeshade"\nexport function sample(x: f32, k: f32): f32 {\n  return ${expression}\n}\n`,
  );
  if (result.diagnostics.some((d) => d.category === 'error'))
    throw new Error(`[function-demos] ${demo.name} worked example does not compile`);
  const sample = compileModule(result.module).fns.sample!;
  const value = Number(sample(x, k));
  if (!Number.isFinite(value))
    throw new Error(`[function-demos] ${demo.name} worked example is not finite`);
  const shownInput = (n: number): string =>
    Number.isInteger(n) ? `${n}.0` : String(Number(n.toPrecision(8)));
  const shownExpression = demo.expression
    .replaceAll('u.k', shownInput(k))
    .replace(/(?<![\w.])x\b/g, shownInput(x));
  const calculation = `${shownExpression} ≈ ${Number(value.toPrecision(6))}`;
  calculationCache.set(demo.name, calculation);
  return calculation;
}

export function relatedDemos(name: string): readonly string[] {
  const groups = [
    ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'degrees', 'radians'],
    ['sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh'],
    ['exp', 'exp2', 'log', 'log2', 'log10', 'log1p', 'expm1', 'ldexp'],
    ['sqrt', 'inverseSqrt', 'cbrt', 'pow', 'hypot'],
    ['abs', 'sign', 'floor', 'ceil', 'round', 'trunc', 'fract', 'mod'],
    ['min', 'max', 'clamp', 'saturate', 'step', 'smoothstep', 'mix', 'fma'],
    ['length', 'distance', 'dot', 'normalize', 'hypot'],
  ];
  return (groups.find((group) => group.includes(name)) ?? [])
    .filter((other) => other !== name)
    .slice(0, 4);
}

/** Conditions for the plotted expression, independent of its viewport. */
export function demoCondition(demo: FunctionDemo): string {
  const positive = ['log', 'log2', 'log10', 'inverseSqrt'];
  let condition = positive.includes(demo.name) ? 'x > 0' : 'x \\in \\mathbb{R}';
  if (['asin', 'acos'].includes(demo.name)) condition = '-1 \\le x \\le 1';
  if (demo.name === 'sqrt') condition = 'x \\ge 0';
  if (demo.name === 'acosh') condition = 'x \\ge 1';
  if (demo.name === 'atanh') condition = '-1 < x < 1';
  if (demo.name === 'log1p') condition = 'x > -1';
  if (demo.name === 'tan') condition = 'x \\ne \\frac{\\pi}{2} + n\\pi,\\ n \\in \\mathbb{Z}';
  if (demo.name === 'ldexp') condition += ',\\ k \\in \\mathbb{Z}';
  else if (demo.k && ['atan2', 'mod', 'clamp', 'smoothstep'].includes(demo.name))
    condition += ',\\ k > 0';
  return `$${condition}$`;
}

export function demoSource(demo: FunctionDemo): string {
  const jumps = [
    'tan',
    'atan2',
    'sign',
    'floor',
    'ceil',
    'round',
    'trunc',
    'fract',
    'mod',
    'step',
  ].includes(demo.name);
  const domain = ['log', 'log2', 'log10', 'inverseSqrt'].includes(demo.name)
    ? 'x <= 0.'
    : ['asin', 'acos'].includes(demo.name)
      ? 'abs(x) > 1.'
      : demo.name === 'sqrt'
        ? 'x < 0.'
        : demo.name === 'acosh'
          ? 'x < 1.'
          : demo.name === 'atanh'
            ? 'abs(x) >= 1.'
            : demo.name === 'log1p'
              ? 'x <= -1.'
              : undefined;
  return `"use typeshade";

import { PlotUniforms, plot2D, plot3D } from "./function-plot.shade.ts";

${demo.k ? 'class Uniforms extends PlotUniforms { k: f32; }' : 'class Uniforms extends PlotUniforms {}'}
declare const u: uniform<Uniforms>;

// Inputs outside the mathematical domain are omitted, including after pan or zoom.
function sample(x: f32): f32 {
  ${domain ? `if (${domain}) { return 1e20; }` : ''}
  return ${demo.expression};
}

function trajectory(t: f32): vec3 {
  return vec3(t, sample(t), 0.);
}

@fragment
export function main(@location(0) uv: vec2): vec4 {
  const flat = plot2D(sample, uv, u, ${jumps});
  if (u.plotBlend <= 0.) { return flat; }
  const space = plot3D(trajectory, uv, u, ${jumps});
  return mix(flat, space, clamp(u.plotBlend, 0., 1.));
}
`;
}

export function demoControls(
  demo: FunctionDemo,
  probeLabel: string,
  parameterLabel: string,
): ControlProps {
  return {
    probe: {
      label: probeLabel,
      min: demo.x[0],
      max: demo.x[1],
      step: (demo.x[1] - demo.x[0]) / 200,
      value: (demo.x[0] + demo.x[1]) / 2,
    },
    ...(demo.k ? { k: { label: parameterLabel, ...demo.k } } : {}),
  };
}
