// Private maintainer tools. Run with Bun; Wrangler supplies its own authenticated D1 access.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import type { BenchRecord } from '../src/lib/benchmarks/contract.ts';
import { parseAnyRecord as parseRecord } from '../src/lib/benchmarks/records.ts';
import { pairedResults, summarizePaired } from '../src/lib/benchmarks/comparison.ts';
import { median } from '../src/lib/benchmarks/fixtures.ts';

const [mode, file] = process.argv.slice(2);
if (!file || !['export', 'analyze'].includes(mode ?? ''))
  throw new Error('Usage: bun scripts/benchmark-data.ts export|analyze records.json [--local]');
if (mode === 'export') {
  const records: unknown[] = [];
  let after = '';
  const now = Date.now();
  for (;;) {
    // UUIDs are validated before interpolation. Server creation time fixes the export cutoff.
    const query = `SELECT id, record FROM benchmark_records WHERE expires > ${now} AND created <= ${now} AND id > '${after}' ORDER BY id LIMIT 100`;
    const output = execFileSync(
      'node_modules/.bin/wrangler',
      [
        'd1',
        'execute',
        'typeshade',
        process.argv.includes('--local') ? '--local' : '--remote',
        '--json',
        '--command',
        query,
      ],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    const page = JSON.parse(output).flatMap(
      (r: { results: { id: string; record: string }[] }) => r.results,
    );
    for (const row of page) records.push(parseRecord(JSON.parse(row.record)));
    if (page.length < 100) break;
    after = page.at(-1).id;
    if (!/^[0-9a-f-]{36}$/i.test(after)) throw new Error('Invalid export cursor');
  }
  writeFileSync(file, JSON.stringify({ exported: new Date().toISOString(), records }, null, 2));
  console.log(
    `Exported ${records.length} private records to ${file}. Do not commit device reports.`,
  );
} else {
  const input = JSON.parse(readFileSync(file, 'utf8'));
  const allRecords = (Array.isArray(input) ? input : input.schema ? [input] : input.records).map(
    parseRecord,
  );
  const records = allRecords.filter((r: { schema: number }) => r.schema === 1) as BenchRecord[];
  const regressionRuns = [
    ...new Map(allRecords.filter((r: any) => r.schema === 2).map((r: any) => [r.id, r])).values(),
  ];
  const comparisons = regressionRuns.map((r: any) => ({
    run: r.id,
    digest: r.digest,
    workload: r.workload,
    instrument: r.instrument,
    builds: r.builds,
    runtimes: r.runtimes,
    profile: r.profile,
    peers: r.peers,
    pairs: pairedResults(r),
  }));
  const unique = new Map(records.map((r) => [r.id, r]));
  const pairs = [
    ['layout-aos-8-read-1', 'layout-soa-8-read-1'],
    ['layout-aos-8-read-1', 'layout-aos-1-read-1'],
    ['layout-soa-8-read-1', 'layout-soa-1-read-1'],
    ['layout-aos-8-read-8', 'layout-soa-8-read-8'],
    ['reduction-serial', 'reduction-workgroup'],
    ['atomics-bins-1', 'atomics-bins-256'],
    ['submission-separate', 'submission-batched'],
  ];
  const groups = new Map<string, { key: unknown; ratios: number[]; runs: Set<string> }>();
  let excluded = 0;
  for (const r of unique.values()) {
    if (r.status !== 'complete') {
      excluded++;
      continue;
    }
    const gpu = r.metadata.webgpu;
    const software =
      gpu.fallback === true ||
      /swiftshader|llvmpipe|software rasterizer/i.test(
        `${gpu.device} ${gpu.description} ${gpu.architecture}`,
      );
    for (const [base, candidate] of pairs)
      for (const a of r.results.filter((row) => row.id === base)) {
        const b = r.results.find((row) => row.id === candidate && row.n === a.n);
        if (!b || a.status !== 'passed' || b.status !== 'passed') continue;
        for (const metric of ['wallMs', 'gpuNs'] as const) {
          const x = median(a[metric] ?? []);
          const y = median(b[metric] ?? []);
          if (x === null || y === null || x <= 0 || y <= 0) continue;
          const key = {
            revision: r.revision,
            digest: r.digest,
            compiler: r.compiler,
            profile: r.profile,
            n: a.n,
            base,
            candidate,
            metric,
            reportedAdapter: gpu,
            browser: r.metadata.userAgent,
            rendererClass: software ? 'reported-software' : 'unclassified',
          };
          const id = JSON.stringify(key);
          const group = groups.get(id) ?? { key, ratios: [], runs: new Set<string>() };
          group.ratios.push(x / y);
          group.runs.add(r.id);
          groups.set(id, group);
        }
      }
  }
  const summary = [...groups.values()].map(({ key, ratios, runs }) => {
    ratios.sort((a, b) => a - b);
    const quantile = (p: number) => ratios[Math.floor((ratios.length - 1) * p)];
    return {
      ...(key as object),
      runs: runs.size,
      baselineOverCandidateMedian: median(ratios),
      p10: quantile(0.1),
      p90: quantile(0.9),
    };
  });
  console.log(
    JSON.stringify(
      {
        notice:
          'Untrusted client reports. Counts are runs, not independent devices. Ratios pair alternatives within a run. Hardware performance requires controlled reproduction.',
        excludedIncomplete: excluded,
        duplicatesRemoved: records.length - unique.size,
        summary,
        comparisons,
        regressionSummary: summarizePaired(regressionRuns),
      },
      null,
      2,
    ),
  );
}
