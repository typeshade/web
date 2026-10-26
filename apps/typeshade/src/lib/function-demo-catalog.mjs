/**
 * A bounded plot of one documented function. Ranges keep the default and every control
 * value within the function's domain. `k` is an optional second scalar input.
 * @typedef {object} FunctionDemo
 * @property {string} name
 * @property {string} expression
 * @property {[number, number]} x
 * @property {[number, number]} y
 * @property {{min: number, max: number, step: number, value: number}} [k]
 */

/** @type {readonly FunctionDemo[]} */
export const FUNCTION_DEMOS = [
  { name: 'sin', expression: 'sin(x)', x: [-6.28, 6.28], y: [-1.25, 1.25] },
  { name: 'cos', expression: 'cos(x)', x: [-6.28, 6.28], y: [-1.25, 1.25] },
  { name: 'tan', expression: 'tan(x)', x: [-1.2, 1.2], y: [-3, 3] },
  { name: 'asin', expression: 'asin(x)', x: [-1, 1], y: [-2, 2] },
  { name: 'acos', expression: 'acos(x)', x: [-1, 1], y: [-0.25, 3.5] },
  { name: 'atan', expression: 'atan(x)', x: [-4, 4], y: [-1.6, 1.6] },
  { name: 'atan2', expression: 'atan2(sin(x), cos(x))', x: [-6.28, 6.28], y: [-3.5, 3.5] },
  { name: 'sinh', expression: 'sinh(x)', x: [-2, 2], y: [-4, 4] },
  { name: 'cosh', expression: 'cosh(x)', x: [-2, 2], y: [0, 4] },
  { name: 'tanh', expression: 'tanh(x)', x: [-4, 4], y: [-1.25, 1.25] },
  { name: 'asinh', expression: 'asinh(x)', x: [-4, 4], y: [-2.5, 2.5] },
  { name: 'acosh', expression: 'acosh(x)', x: [1, 5], y: [-0.25, 2.5] },
  { name: 'atanh', expression: 'atanh(x)', x: [-0.9, 0.9], y: [-2, 2] },
  { name: 'exp', expression: 'exp(x)', x: [-2, 2], y: [-0.5, 8] },
  { name: 'exp2', expression: 'exp2(x)', x: [-2, 2], y: [-0.25, 4.5] },
  { name: 'log', expression: 'log(x)', x: [0.1, 4], y: [-2.5, 2] },
  { name: 'log2', expression: 'log2(x)', x: [0.125, 4], y: [-3.5, 2.5] },
  { name: 'log10', expression: 'log10(x)', x: [0.1, 10], y: [-1.25, 1.25] },
  { name: 'log1p', expression: 'log1p(x)', x: [-0.8, 4], y: [-2, 2] },
  { name: 'expm1', expression: 'expm1(x)', x: [-2, 2], y: [-1.5, 7] },
  { name: 'sqrt', expression: 'sqrt(x)', x: [0, 4], y: [-0.25, 2.25] },
  { name: 'inverseSqrt', expression: 'inverseSqrt(x)', x: [0.25, 4], y: [0, 2.25] },
  { name: 'cbrt', expression: 'cbrt(x)', x: [-8, 8], y: [-2.5, 2.5] },
  { name: 'abs', expression: 'abs(x)', x: [-2, 2], y: [-0.25, 2.5] },
  { name: 'sign', expression: 'sign(x)', x: [-2, 2], y: [-1.5, 1.5] },
  { name: 'floor', expression: 'floor(x)', x: [-2, 2], y: [-2.5, 2.5] },
  { name: 'ceil', expression: 'ceil(x)', x: [-2, 2], y: [-2.5, 2.5] },
  { name: 'round', expression: 'round(x)', x: [-2, 2], y: [-2.5, 2.5] },
  { name: 'trunc', expression: 'trunc(x)', x: [-2, 2], y: [-2.5, 2.5] },
  { name: 'fract', expression: 'fract(x)', x: [-2, 2], y: [-0.25, 1.25] },
  { name: 'saturate', expression: 'saturate(x)', x: [-1, 2], y: [-0.25, 1.25] },
  { name: 'degrees', expression: 'degrees(x)', x: [-3.14, 3.14], y: [-200, 200] },
  { name: 'radians', expression: 'radians(x)', x: [-180, 180], y: [-3.5, 3.5] },
  {
    name: 'mod',
    expression: 'mod(x, u.k)',
    x: [-3, 3],
    y: [-0.25, 2.25],
    k: { min: 0.5, max: 2, step: 0.1, value: 1 },
  },
  {
    name: 'min',
    expression: 'min(x, u.k)',
    x: [-2, 2],
    y: [-2.5, 2.5],
    k: { min: -1, max: 1, step: 0.05, value: 0.5 },
  },
  {
    name: 'max',
    expression: 'max(x, u.k)',
    x: [-2, 2],
    y: [-2.5, 2.5],
    k: { min: -1, max: 1, step: 0.05, value: 0.5 },
  },
  {
    name: 'step',
    expression: 'step(u.k, x)',
    x: [-1, 1],
    y: [-0.25, 1.25],
    k: { min: -0.75, max: 0.75, step: 0.05, value: 0 },
  },
  {
    name: 'clamp',
    expression: 'clamp(x, -u.k, u.k)',
    x: [-2, 2],
    y: [-2, 2],
    k: { min: 0.25, max: 1.5, step: 0.05, value: 1 },
  },
  {
    name: 'mix',
    expression: 'mix(0., u.k, x)',
    x: [0, 1],
    y: [-0.25, 2.25],
    k: { min: 0.25, max: 2, step: 0.05, value: 1 },
  },
  {
    name: 'smoothstep',
    expression: 'smoothstep(0., u.k, x)',
    x: [-0.5, 2],
    y: [-0.25, 1.25],
    k: { min: 0.25, max: 1.5, step: 0.05, value: 1 },
  },
  {
    name: 'fma',
    expression: 'fma(x, u.k, 0.5)',
    x: [-2, 2],
    y: [-5, 5],
    k: { min: -2, max: 2, step: 0.05, value: 1 },
  },
  {
    name: 'ldexp',
    expression: 'ldexp(x, i32(u.k))',
    x: [-1, 1],
    y: [-4.5, 4.5],
    k: { min: -2, max: 2, step: 1, value: 1 },
  },
  {
    name: 'hypot',
    expression: 'hypot(x, u.k)',
    x: [-3, 3],
    y: [-0.25, 4],
    k: { min: 0.25, max: 2, step: 0.05, value: 1 },
  },
  {
    name: 'length',
    expression: 'length(vec2(x, u.k))',
    x: [-3, 3],
    y: [-0.25, 4],
    k: { min: 0.25, max: 2, step: 0.05, value: 1 },
  },
  {
    name: 'distance',
    expression: 'distance(vec2(x, 0.), vec2(0., u.k))',
    x: [-3, 3],
    y: [-0.25, 4],
    k: { min: 0.25, max: 2, step: 0.05, value: 1 },
  },
  {
    name: 'dot',
    expression: 'dot(vec2(x, 1.), vec2(u.k, 0.5))',
    x: [-2, 2],
    y: [-5, 5],
    k: { min: -2, max: 2, step: 0.05, value: 1 },
  },
  { name: 'normalize', expression: 'normalize(vec2(x, 1.)).x', x: [-3, 3], y: [-1.25, 1.25] },
];
