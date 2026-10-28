import type { RegressionRecord } from './regression-contract.ts';
import { median } from './fixtures.ts';
const quantile = (xs: number[], p: number) =>
  [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)] ?? null;
export function pairedResults(record: RegressionRecord) {
  const sameAdapter =
    record.peers.length === 2 &&
    JSON.stringify(record.peers[0]!.webgpu) === JSON.stringify(record.peers[1]!.webgpu);
  if (record.status !== 'complete' || !sameAdapter) return [];
  return record.results
    .filter((a) => a.build === 'baseline' && a.status === 'passed')
    .flatMap((a) => {
      const b = record.results.find(
        (b) => b.build === 'candidate' && b.id === a.id && b.n === a.n && b.status === 'passed',
      );
      if (!b || a.dispatches !== b.dispatches) return [];
      const ratio = (x: number | null, y: number | null) =>
        x !== null && y !== null && x > 0 && y > 0 ? x / y : null;
      return [
        {
          id: a.id,
          n: a.n,
          kind: a.kind,
          dispatches: a.dispatches,
          wallRatio: ratio(median(a.wallMs), median(b.wallMs)),
          gpuRatio: ratio(median(a.gpuNs ?? []), median(b.gpuNs ?? [])),
          bufferRatio: ratio(a.peakBufferBytes, b.peakBufferBytes),
          coldRatio: ratio(a.coldMs, b.coldMs),
          readbackRatio: ratio(median(a.readbackMs ?? []), median(b.readbackMs ?? [])),
          validationRatio: ratio(median(a.validationMs ?? []), median(b.validationMs ?? [])),
          packingRatio: ratio(median(a.packingMs ?? []), median(b.packingMs ?? [])),
          uploadRatio: ratio(median(a.uploadBytes ?? []), median(b.uploadBytes ?? [])),
          baselineWallP10: quantile(a.wallMs, 0.1),
          baselineWallP90: quantile(a.wallMs, 0.9),
          candidateWallP10: quantile(b.wallMs, 0.1),
          candidateWallP90: quantile(b.wallMs, 0.9),
          baselineSubmissions: a.gpuSubmissions,
          candidateSubmissions: b.gpuSubmissions,
        },
      ];
    });
}

export function summarizePaired(records: readonly RegressionRecord[]) {
  const groups = new Map<string, { key: object; ratios: number[]; runs: Set<string> }>();
  for (const r of new Map(records.map((r) => [r.id, r])).values()) {
    const adapter = r.metadata.webgpu;
    const software =
      adapter.fallback === true ||
      /swiftshader|llvmpipe|software rasterizer/i.test(
        `${adapter.device} ${adapter.description} ${adapter.architecture}`,
      );
    for (const pair of pairedResults(r))
      for (const metric of [
        'wallRatio',
        'gpuRatio',
        'bufferRatio',
        'coldRatio',
        'readbackRatio',
        'validationRatio',
        'packingRatio',
        'uploadRatio',
      ] as const) {
        const ratio = pair[metric];
        if (ratio === null) continue;
        const key = {
          digest: r.digest,
          workload: r.workload,
          instrument: r.instrument,
          builds: r.builds,
          runtimes: r.runtimes,
          profile: r.profile,
          id: pair.id,
          n: pair.n,
          dispatches: pair.dispatches,
          metric,
          adapter,
          browser: r.metadata.userAgent,
          rendererClass: software ? 'reported-software' : 'unclassified',
        };
        const id = JSON.stringify(key);
        const group = groups.get(id) ?? { key, ratios: [], runs: new Set<string>() };
        group.ratios.push(ratio);
        group.runs.add(r.id);
        groups.set(id, group);
      }
  }
  return [...groups.values()].map((g) => ({
    ...g.key,
    runs: g.runs.size,
    median: median(g.ratios),
    p10: quantile(g.ratios, 0.1),
    p90: quantile(g.ratios, 0.9),
  }));
}
