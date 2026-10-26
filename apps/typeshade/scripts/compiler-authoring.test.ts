import { expect, test } from 'bun:test';
import { compile } from '../vendor/shader-dsl/src/compiler/ts/compile.ts';
import { createTypeshadeLanguageService } from '../vendor/shader-dsl/src/language-service/index.ts';
import { wgslLayout } from '../vendor/shader-dsl/src/core/reflect.ts';

function checked(body: string) {
  const source = `"use typeshade";\n${body}`;
  const result = compile(source, { fileName: 'file:///authoring.shade.ts' });
  const service = createTypeshadeLanguageService();
  service.openDocument('file:///authoring.shade.ts', source);
  expect(
    service.getDiagnostics('file:///authoring.shade.ts').filter((d) => d.severity === 'error'),
  ).toEqual([]);
  expect(result.diagnostics.filter((d) => d.category === 'error')).toEqual([]);
  expect(result.wgsl).toBeDefined();
  return result;
}

test('parameter reassignment leaves the calling value unchanged', () => {
  const result = checked(
    'function brighter(value: f32): f32 { value += 0.25; return value; }\nexport function answer(): f32 { const value = 1.0; return brighter(value) + value; }',
  );
  expect(result.eval('answer')).toBe(2.25);
});

test('backend reserved variables preserve their source behavior', () => {
  const result = checked(
    'export function answer(target: f32): f32 { let sample = target; sample += 1.0; return sample; }',
  );
  expect(result.eval('answer', [2])).toBe(3);
  expect(result.glsl?.fragment).toBeDefined();
});

test('a method-only class has an empty host value', () => {
  const result = checked(
    'class Counter { next(value: f32): f32 { return value + 1.0; } }\nexport function make(): Counter { return new Counter(); }\nexport function answer(): f32 { return new Counter().next(2.0); }',
  );
  expect(result.eval('make')).toEqual({});
  expect(result.eval('answer')).toBe(3);
  expect(result.module.structs.find((s) => s.name === 'Counter')?.fields).toEqual([]);
  const structs = new Map(result.module.structs.map((s) => [s.name, s]));
  expect(wgslLayout(structs.get('Counter')!, 'std430', structs).size).toBe(4);
  expect(wgslLayout(structs.get('Counter')!, 'std140', structs).size).toBe(16);
});

test('a declared integer parameter constrains the unannotated local', () => {
  const result = checked(
    'function offset(value: i32): i32 { return value; }\nexport function answer(): i32 { const value = -1; return offset(value); }',
  );
  expect(result.eval('answer')).toBe(-1);
  expect(result.wgsl).toContain('i32');
});

test('conflicting declared argument types remain visible diagnostics', () => {
  const source =
    '"use typeshade";\nfunction integer(value: i32): i32 { return value; }\nfunction real(value: f32): f32 { return value; }\nexport function answer(): f32 { const value = 1; integer(value); return real(value); }';
  const result = compile(source, { fileName: 'file:///authoring.shade.ts' });
  const service = createTypeshadeLanguageService();
  service.openDocument('file:///authoring.shade.ts', source);
  expect(result.diagnostics.some((d) => d.code === 'TS8003')).toBe(true);
  expect(
    service.getDiagnostics('file:///authoring.shade.ts').some((d) => d.code === 'TS8003'),
  ).toBe(true);
  expect(result.wgsl).toBeUndefined();
});

test('an integer-written local without a declared integer demand keeps the f32 default', () => {
  const result = checked('export function answer(): f32 { const value = 1; return value; }');
  expect(result.eval('answer')).toBe(1);
  expect(result.wgsl).toContain('-> f32');
});

test('TS8018 still rejects assignment to a temporary component', () => {
  const source =
    '"use typeshade";\n@fragment export function main(@location(0) uv: vec2): vec4 { vec2(uv).x = 1.0; return vec4(uv, 0.0, 1.0); }';
  const result = compile(source);
  expect(result.diagnostics.some((d) => d.code === 'TS8018')).toBe(true);
  expect(result.wgsl).toBeUndefined();
});

test('constructor, method and field assignment demands agree in compiler and editor', () => {
  const body =
    'class Hit { constructor(public index: i32) {} offset(value: i32): i32 { return this.index + value; } }\nexport function answer(): i32 { let value = -1; const hit = new Hit(value); value = hit.index; return hit.offset(value); }';
  const result = checked(body);
  expect(result.eval('answer')).toBe(-2);
  const source = `"use typeshade";\n${body}`;
  const service = createTypeshadeLanguageService();
  service.openDocument('file:///index.shade.ts', source);
  expect(
    service.getHover(
      'file:///index.shade.ts',
      service.positionAt('file:///index.shade.ts', source.indexOf('let value') + 4),
    )?.contents,
  ).toContain('value: i32');
});

test('a proven read-only derived value can supply the base representation', () => {
  const result = checked(
    'class Material { color: f32 = 0.5; response(): f32 { return this.color; } }\nclass LeafMaterial extends Material { thickness: f32 = 1.0; }\nfunction response(material: Material): f32 { return material.response(); }\nexport function answer(): f32 { const material = new LeafMaterial(); return response(material); }',
  );
  expect(result.eval('answer')).toBe(0.5);
});

test('a derived override keeps the unsupported base-dispatch diagnostic', () => {
  const source =
    '"use typeshade";\nclass Material { response(): f32 { return 0.5; } }\nclass LeafMaterial extends Material { response(): f32 { return 1.0; } }\nfunction response(material: Material): f32 { return material.response(); }\nexport function answer(): f32 { return response(new LeafMaterial()); }';
  const result = compile(source);
  const service = createTypeshadeLanguageService();
  service.openDocument('file:///override.shade.ts', source);
  expect(result.diagnostics.some((d) => d.code === 'TS8003')).toBe(true);
  expect(service.getDiagnostics('file:///override.shade.ts').some((d) => d.code === 'TS8003')).toBe(
    true,
  );
  expect(result.wgsl).toBeUndefined();
});

test('function parameters, locals and closures shadow module values', () => {
  const result = checked(
    'const gain: f32 = 0.25;\nfunction scale(gain: f32): f32 { return gain * 2.0; }\nexport function answer(): f32 { const gain: f32 = 1.0; const read = (): f32 => gain; return scale(gain) + read(); }',
  );
  expect(result.eval('answer')).toBe(3);
});

test('a local that repeats a parameter remains a duplicate declaration', () => {
  const source =
    '"use typeshade";\nexport function answer(gain: f32): f32 { const gain: f32 = 1.0; return gain; }';
  expect(compile(source).diagnostics.some((d) => d.code === 'TS8023')).toBe(true);
});
