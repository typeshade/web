// Build-time TypeShade compilation. No compiler runs in the visitor's browser.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { format } from 'prettier';
import original from '../src/lib/benchmarks/catalog-v1.json';
import { benchmarkCompiler } from './benchmark-compiler.ts';
import { EXPERIMENTS, type Experiment } from '../src/lib/benchmarks/definitions.ts';

function source(e: Experiment): string {
  if (e.kind === 'upload' || e.kind === 'readback') return '';
  const layout = e.kind === 'layout';
  const aos = layout && e.variant === 'aos';
  const fields = Array.from({ length: e.fields }, (_, f) => `f${f}: f32;`).join(' ');
  const declarations = `"use typeshade";
class Args { n: u32; }
${aos ? `class Item { ${fields} }` : ''}
declare const args: uniform<Args>;
declare const src: storage<array<${aos ? 'Item' : layout ? 'f32' : 'u32'}>>;
declare const out: storage<array<${e.kind === 'atomic' ? 'atomic<u32>' : layout ? 'f32' : 'u32'}>, "read_write">;
`;
  let body = '';
  if (layout)
    body = `out[i] = ${Array.from({ length: e.reads }, (_, f) => (aos ? `src[i].f${f}` : `src[${f} * args.n + i]`)).join(' + ')};`;
  else if (e.kind === 'copy') body = `out[i] = src[(i * ${e.factor}) % args.n];`;
  else if (e.kind === 'arithmetic')
    body = `let x: u32 = src[i]; for (let k: u32 = 0; k < ${e.factor}; k++) { x = x * 1664525 + 1013904223; } out[i] = x;`;
  else if (e.kind === 'atomic') body = `atomicAdd(out[i % ${e.factor}], src[i]);`;
  else if (e.variant === 'serial')
    body = `let sum: u32 = 0; for (let k: u32 = 0; k < 64; k++) { sum += src[i * 64 + k]; } out[i] = sum;`;
  else
    return `${declarations}
let tile: workgroup<array<u32, 64>>;
@compute([64])
export function main(@builtin("global_invocation_id") gid: vec3u, @builtin("local_invocation_id") lid: vec3u, @builtin("workgroup_id") wid: vec3u): void {
 tile[lid.x] = src[gid.x]; workgroupBarrier();
 for (let stride: u32 = 32; stride > 0; stride /= 2) {
   if (lid.x < stride) { tile[lid.x] += tile[lid.x + stride]; }
   workgroupBarrier();
 }
 if (lid.x === 0) { out[wid.x] = tile[0]; }
}`;
  return `${declarations}
@compute([${e.wg}])
export function main(@builtin("global_invocation_id") gid: vec3u): void {
 const i: u32 = gid.x;
 if (i >= ${e.kind === 'reduce' ? 'args.n / 64' : 'args.n'}) { return; }
 ${body}
}`;
}
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const compiler = original.compiler;
const { load } = benchmarkCompiler(compiler);
const { compile } = await load('src/compiler/ts/compile.ts');
const { packModule } = await load('src/compiler/ts/pack.ts');
const cases = EXPERIMENTS.map((e) => {
  const text = source(e);
  if (!text) return { ...e, source: '', wgsl: '', shader: hash(''), bindings: [] };
  const result = compile(text, { fileName: `${e.id}.shade.ts` });
  const errors = result.diagnostics.filter((d) => d.category === 'error');
  if (errors.length) throw new Error(`${e.id}: ${JSON.stringify(errors)}`);
  const pack = packModule(result.module, { emit: { level: 'O1', parens: 'minimal' } });
  return {
    ...e,
    source: text,
    wgsl: pack.wgsl,
    shader: hash(pack.wgsl),
    bindings: pack.bindings.map(({ name, binding, group }) => ({ name, binding, group })),
  };
});
const data = { revision: '2026-10-22.1', compiler, digest: hash(JSON.stringify(cases)), cases };
const path = 'src/lib/benchmarks/catalog-v1.json';
const output = await format(JSON.stringify(data), { parser: 'json' });
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output)
    throw new Error('Benchmark catalog changed. Record a new revision before shipping.');
  console.log(`benchmark catalog: ${cases.length} fixtures match compiler ${compiler}`);
} else {
  if (existsSync(path) && readFileSync(path, 'utf8') !== output)
    throw new Error(
      'Refuse to overwrite a revisioned catalog. Add a new revision and retain the old contract.',
    );
  writeFileSync(path, output);
}
