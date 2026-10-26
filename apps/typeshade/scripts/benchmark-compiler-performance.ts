// Local compiler latency is separate from device-submitted application timing.
import { writeFileSync } from 'node:fs';
import { benchmarkCompiler } from './benchmark-compiler.ts';
import catalog from '../src/lib/benchmarks/regression-catalog.json';
import { APPLICATION_SOURCE } from '../src/lib/benchmarks/workloads.ts';
const versions = [];
for (const build of catalog.builds) {
  const { load } = benchmarkCompiler(build.revision);
  const { compile } = await load('src/compiler/ts/compile.ts');
  const { packModule } = await load('src/compiler/ts/pack.ts');
  const { hostFace } = await load('src/compiler/ts/host-face.ts');
  const run = () => {
    for (const job of build.cases) {
      const r = compile(job.source, { fileName: job.id + '.shade.ts' });
      if (r.diagnostics.some((d: { category: string }) => d.category === 'error'))
        throw new Error('Compile failed');
      packModule(r.module, { emit: { level: 'O1', parens: 'minimal' } });
    }
    const face = hostFace(APPLICATION_SOURCE, { fileName: 'applications.shade.ts', fuse: true });
    if (!face.code) throw new Error('Host generation failed');
  };
  const start = performance.now();
  run();
  const firstMs = performance.now() - start;
  run();
  const samples = [];
  for (let i = 0; i < 7; i++) {
    const t = performance.now();
    run();
    samples.push(performance.now() - t);
  }
  versions.push({ revision: build.revision, firstMs, samples });
}
const record = {
  kind: 'local-compiler-latency',
  measuredAt: new Date().toISOString(),
  workload: catalog.workload,
  bun: Bun.version,
  platform: process.platform,
  arch: process.arch,
  versions,
};
writeFileSync('.cache/compiler-performance.json', JSON.stringify(record, null, 2));
console.log(
  'Saved local compiler timings to .cache/compiler-performance.json. Compare only controlled reproductions.',
);
