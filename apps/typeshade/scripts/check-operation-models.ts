// Compare deterministic value models with the pinned compiler CPU oracle.
// Resource, derivative, and scheduling models state their assumptions on the page.
import assert from 'node:assert/strict';
import { compile, compileModule } from '../vendor/shader-dsl/src/index.ts';
import { operationLessons, constructorLesson } from '../src/i18n/operation-lessons-en.ts';
import { operationModel } from '../src/lib/operation-models.ts';
import { languageEntries } from '../src/lib/language-reference.ts';
let count = 0;
function run(expression: string, type: string) {
  const source = `"use typeshade"\nexport function sample(): ${type} { return ${expression}; }`;
  const r = compile(source);
  const errors = r.diagnostics.filter((d) => d.category === 'error');
  assert.equal(errors.length, 0, `${expression}: ${JSON.stringify(errors)}`);
  count++;
  return compileModule(r.module).fns.sample!();
}
function close(actual: any, expected: any, label: string) {
  if (Array.isArray(expected)) {
    assert(Array.isArray(actual), label);
    assert.equal(actual.length, expected.length, label);
    expected.forEach((x, i) => close(actual[i], x, label));
  } else if (typeof expected === 'boolean') assert.equal(actual, expected, label);
  else
    assert(
      Math.abs(Number(actual) - Number(expected)) <=
        Math.max(1e-7, Math.abs(Number(expected)) * 1e-6),
      `${label}: ${actual} vs ${expected}`,
    );
}
for (const entry of languageEntries().filter((e) => e.kind === 'function')) {
  const name = entry.name,
    model = operationModel(name);
  if (!model || !(name in operationLessons || constructorLesson(name))) continue;
  if (/^mat/.test(name)) {
    for (const c of model.cases) {
      const grid = c.grid!;
      const expected = grid[0].flatMap((_, column) => grid.map((row) => row[column]));
      close(run(c.input, name), expected, c.input);
    }
  } else if (['reflect', 'refract', 'faceForward'].includes(name)) {
    for (const c of model.cases) {
      const expression =
        name === 'reflect'
          ? `reflect(${c.input.slice(4)},vec3(0.,1.,0.))`
          : name === 'faceForward'
            ? `faceForward(vec3(0.,1.,0.),${c.input.slice(4)},vec3(0.,1.,0.))`
            : c.input.replace('i, n,', 'vec3(0.6,-0.8,0.),vec3(0.,1.,0.),');
      const expected = c.output
        .slice(c.output.indexOf('(') + 1, -1)
        .split(',')
        .map(Number);
      close(run(expression, 'vec3'), expected, expression);
    }
  } else if (/^(count|reverseBits|first|extractBits|insertBits)/.test(name)) {
    for (const c of model.cases)
      close(
        run(c.input.replace(/\((\d+)/, '(u32($1)').replace(/, (\d+)/g, ', u32($1)'), 'u32'),
        parseInt(c.output),
        c.input,
      );
  } else if (/^(un)?pack/.test(name)) {
    const unpack = name.startsWith('unpack');
    const type = !unpack
      ? 'u32'
      : name.includes('U8')
        ? 'vec4u'
        : name.includes('I8')
          ? 'vec4i'
          : name.includes('4x')
            ? 'vec4'
            : 'vec2';
    for (const c of model.cases) {
      const expression = unpack ? c.input.replace(/\((0x[0-9a-f]+)\)/, '(u32($1))') : c.input;
      close(run(expression, type), unpack ? JSON.parse(c.output) : parseInt(c.output), expression);
    }
  } else if (/^vec/.test(name)) {
    for (const c of model.cases) close(run(c.input, name), JSON.parse(c.output), c.input);
  } else if (
    [
      'f32',
      'f64',
      'i32',
      'u32',
      'bool',
      'quantizeToF16',
      'bitcast',
      'cross',
      'select',
      'any',
      'all',
      'none',
      'sum',
      'zip',
      'array',
      'fill',
    ].includes(name)
  ) {
    for (const c of model.cases) {
      let expression = c.input,
        type = name;
      if (name === 'bitcast') type = 'u32';
      if (name === 'cross') type = 'vec3';
      if (name === 'select') type = c.output.startsWith('vec2') ? 'vec2' : 'f32';
      if (['any', 'all', 'none'].includes(name)) type = 'bool';
      if (name === 'sum') type = 'f32';
      if (name === 'zip') {
        type = 'array<f32,3>';
        expression = expression.replace(/\bxs\b/, 'array(1.,2.,3.)');
      }
      if (name === 'array') type = c.output.startsWith('[[') ? 'array<vec2,2>' : 'array<f32,3>';
      if (name === 'fill') type = c.output.startsWith('[[') ? 'array<vec2,2>' : 'array<f32,3>';
      if (name === 'quantizeToF16') type = 'f32';
      let expected;
      if (c.output.startsWith('vec'))
        expected = c.output
          .slice(c.output.indexOf('(') + 1, -1)
          .split(',')
          .map(Number);
      else expected = name === 'bitcast' ? parseInt(c.output) : JSON.parse(c.output);
      close(run(expression, type), expected, expression);
    }
  }
}
console.log(
  `[operation-oracle] ${count} worked expressions agree with the pinned compiler CPU oracle`,
);
