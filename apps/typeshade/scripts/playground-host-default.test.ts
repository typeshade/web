import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { hostTypes } from './playground-host-types.mjs';
import { hostBuild, hostDiagnostics, hostStarter } from '../src/scripts/playground-host-service.ts';

const uri = 'file:///kernel-image-invert.shade.ts';
const source = readFileSync('vendor/shader-dsl/examples/kernel-image-invert.shade.ts', 'utf8');
const read = (file: string) => (file === uri ? source : undefined);

test('an image kernel gets a callable, type-checked host instead of an empty entry list', async () => {
  const host = hostStarter(uri, read);
  expect(host).toContain('void invert(image, target, width, height)');
  expect(host).toContain('putImageData');
  expect(host).not.toContain('program.entries');
  const types = `data:application/json;base64,${Buffer.from(hostTypes(process.cwd())).toString('base64')}`;
  expect(await hostDiagnostics(host, types, read)).toEqual([]);
  expect(hostBuild(host, read).problems).toEqual([]);
}, 30_000);

test('the image starter follows renamed files and functions', () => {
  const renamedUri = 'file:///renamed.shade.ts';
  const renamed = source.replace('function invert(', 'function transform(');
  const host = hostStarter(renamedUri, (file) => (file === renamedUri ? renamed : undefined));
  expect(host).toContain("import { transform } from './renamed.shade.ts'");
  expect(host).toContain('void transform(image, target, width, height)');
});

test('a different storage format keeps the fallback instead of displaying bytes as RGBA8', () => {
  const changed = source.replaceAll('rgba8unorm', 'rgba16float');
  const host = hostStarter(uri, (file) => (file === uri ? changed : undefined));
  expect(host).toContain('program.entries');
  expect(host).not.toContain('putImageData');
});
