import { benchmarkCompiler } from './benchmark-compiler.ts';
// Build both versions from exact git trees. The documentation submodule stays unchanged.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { format } from 'prettier';
import {
  APPLICATION_SOURCE,
  PROJECTION_SOURCE,
  APPLICATIONS,
  WORKLOAD_REVISION,
  INSTRUMENT_REVISION,
} from '../src/lib/benchmarks/workloads.ts';
import legacy from '../src/lib/benchmarks/catalog-v1.json';

const sha = (s: string | Uint8Array) => createHash('sha256').update(s).digest('hex');
const pin = execFileSync('git', ['-C', 'vendor/shader-dsl', 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const file = 'src/lib/benchmarks/regression-catalog.json';
const registryFile = 'src/lib/benchmarks/regression-catalogs.json';
if (Bun.version !== '1.4.3') throw new Error('Reproduce artifacts with Bun 1.4.3');
const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
const revisions =
  process.argv.includes('--new') || !previous
    ? [
        previous?.builds[1].revision === pin
          ? previous.builds[0].revision
          : (previous?.builds[1].revision ?? '82d7ba527e72975df15c35eb16d27239401ea3eb'),
        pin,
      ]
    : previous.builds.map((b: { revision: string }) => b.revision);
const builds = [];
for (const revision of revisions) {
  const { root, load } = benchmarkCompiler(revision);
  const { compile } = await load('src/compiler/ts/compile.ts');
  const { packModule } = await load('src/compiler/ts/pack.ts');
  const { hostFace } = await load('src/compiler/ts/host-face.ts');
  const cases = legacy.cases.map((e) => {
    if (!e.source) return e;
    const result = compile(e.source, { fileName: `${e.id}.shade.ts` });
    if (result.diagnostics.some((d: { category: string }) => d.category === 'error'))
      throw new Error(JSON.stringify(result.diagnostics));
    const pack = packModule(result.module, { emit: { level: 'O1', parens: 'minimal' } });
    return {
      ...e,
      wgsl: pack.wgsl,
      shader: sha(pack.wgsl),
      bindings: pack.bindings.map(
        ({ name, binding, group }: { name: string; binding: number; group: number }) => ({
          name,
          binding,
          group,
        }),
      ),
    };
  });
  const face = hostFace(APPLICATION_SOURCE, {
    fileName: 'applications.shade.ts',
    fuse: true,
    runtime: path.join(root, 'src/core/host-runtime.ts'),
  });
  if (!face.code || face.diagnostics.some((d: { category: string }) => d.category === 'error'))
    throw new Error(JSON.stringify(face.diagnostics));
  const projected = hostFace(PROJECTION_SOURCE, {
    fileName: 'fields.shade.ts',
    runtime: path.join(root, 'src/core/host-runtime.ts'),
  });
  if (
    !projected.code ||
    projected.diagnostics.some((d: { category: string }) => d.category === 'error')
  )
    throw new Error(JSON.stringify(projected.diagnostics));
  writeFileSync(path.join(root, 'fields.ts'), projected.code);
  const faces = Object.fromEntries(
    projected.exports
      .filter((e: { kind: string }) => e.kind === 'kernel')
      .map((e: { name: string; face: unknown }) => [e.name, e.face]),
  );
  const projection = readFileSync(path.join(root, 'src/core/host-entry.ts'), 'utf8').includes(
    'export function projectInputLayout',
  );
  const probe = `
import {checkCall} from './src/core/host-kernel.ts';
import {packed${projection ? ',projectInputLayout' : ''}} from './src/core/host-entry.ts';
const inputFaces=${JSON.stringify(faces)};
export {fields1,fields4,fields8} from './fields.ts';
export function inputProbe(id,xs,out) {
  const face=inputFaces[id.replace('-','')];
  const logical=face.params.find(p=>p.name==='ps');
  const binding=(face.gpu.projected?.arrays??face.gpu.arrays).find(p=>p.name==='ps');
  ${projection ? 'if(binding.layout.st!==logical.layout.st)projectInputLayout(logical.layout,binding.layout);' : ''}
  let start=performance.now();
  checkCall({F:{},$:{bindings:{},vars:{}}},{...face,gpu:undefined},2,[xs,out]);
  const validationMs=performance.now()-start;
  start=performance.now();
  const input=packed(binding,xs);
  return {validationMs,packingMs:performance.now()-start,inputBytes:input.byteLength};
}
`;
  const entry = path.join(root, 'benchmark.ts');
  writeFileSync(
    entry,
    `${face.code}\n${probe}\nimport './src/fuse.ts';\nimport {createDevice,createRuntime,configure} from './src/runtime.ts';
export async function open(device) {
  const rt = await createRuntime({device});
  configure({runtime:rt, prefer:['webgpu']});
  const owner = await createDevice({runtime:rt});
  return {owner, close: async () => {await owner.dispose(); rt.destroy();}};
}\n`,
  );
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'esm',
    minify: true,
  });
  if (!result.success) throw new Error(String(result.logs));
  const js = await result.outputs[0]!.text();
  const runtimeDigest = sha(js);
  const url = `/benchmarks/artifacts/${runtimeDigest}.js`;
  const dest = `public${url}`;
  if (process.argv.includes('--check')) {
    if (!existsSync(dest) || sha(readFileSync(dest)) !== runtimeDigest)
      throw new Error('Runtime artifact changed');
  } else {
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, js);
  }
  builds.push({
    revision,
    runtime: revision,
    runtimeDigest,
    inputProjection: Boolean((faces.fields1 as { gpu?: { projected?: unknown } }).gpu?.projected),
    url,
    bytes: Buffer.byteLength(js),
    cases,
  });
}
const workload = sha(
  JSON.stringify({
    application: APPLICATION_SOURCE,
    projection: PROJECTION_SOURCE,
    cases: builds[0]!.cases.map(({ source, id }) => ({ source, id })),
  }),
);
const identity = {
  bundler: 'bun@1.4.3',
  measurement: sha(
    JSON.stringify(
      [
        'regression.worker.ts',
        'version.worker.ts',
        'regression-gpu.ts',
        'timing.ts',
        'metadata.ts',
        'workloads.ts',
        'fixtures.ts',
        'definitions.ts',
        'regression-contract.ts',
        'contract.ts',
      ].map((file) => ({
        file,
        source: sha(readFileSync(`src/lib/benchmarks/${file}`, 'utf8').replace(/\r\n/g, '\n')),
      })),
    ),
  ),
  workloadRevision: WORKLOAD_REVISION,
  instrument: INSTRUMENT_REVISION,
  workload,
  applications: APPLICATIONS,
  builds,
};
const data = { ...identity, digest: sha(JSON.stringify(identity)) };
const output = await format(JSON.stringify(data), { parser: 'json' });
if (process.argv.includes('--check')) {
  if (Bun.version !== '1.4.3') throw new Error('Reproduce artifacts with Bun 1.4.3');
  if (builds[1]!.revision !== pin)
    throw new Error('Refresh the comparison with --new after moving the pin');
  if (readFileSync(file, 'utf8') !== output)
    throw new Error('Regression catalog or compiler artifacts changed');
} else {
  if (previous && previous.digest !== data.digest && !process.argv.includes('--new'))
    throw new Error('Use --new to retain the prior comparison and add a build');
  const registry = existsSync(registryFile) ? JSON.parse(readFileSync(registryFile, 'utf8')) : [];
  if (!registry.some((c: { digest: string }) => c.digest === data.digest)) registry.push(data);
  writeFileSync(registryFile, await format(JSON.stringify(registry), { parser: 'json' }));
  writeFileSync(file, output);
}
console.log(`regression catalog: ${builds.length} exact builds, workload ${workload}`);
