import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { hostTypes } from './playground-host-types.mjs';
import {
  hostBuild,
  hostCallable,
  hostDiagnostics,
  hostStarter,
} from '../src/scripts/playground-host-service.ts';

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

// The Result tab is host.ts's frame only where the starter calls an entry. A starter that lists
// the entries draws nothing, so the site's runner keeps such a module
// (docs/playground-one-runtime.md, Decisions, 1).
test('only a module whose starter calls an entry hands the Result tab to host.ts', () => {
  const example = (id: string): boolean => {
    const file = `file:///${id}.shade.ts`;
    const text = readFileSync(`vendor/shader-dsl/examples/${id}.shade.ts`, 'utf8');
    const reads = (asked: string) => (asked === file ? text : undefined);
    const calls = hostCallable(file, reads);
    expect(hostStarter(file, reads).includes('program.entries')).toBe(!calls);
    return calls;
  };
  // An image kernel, and a fragment entry that reads only its position.
  expect(example('kernel-image-invert')).toBe(true);
  expect(example('bare-position')).toBe(true);
  // A fragment entry that reads its vertex entry's output (Rule 8.24).
  expect(example('null-values')).toBe(false);
  // A compute entry and a kernel loop whose bindings the starter cannot write.
  expect(example('array-length')).toBe(false);
  expect(example('loop-kernel')).toBe(false);
});
