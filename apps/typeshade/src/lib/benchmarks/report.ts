import {
  regressionCatalog,
  type RegressionRecord,
  type RegressionResult,
} from './regression-contract.ts';
import { median } from './fixtures.ts';

export const REPORT_SECTIONS = ['applications', 'data', 'compute', 'execution'] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];
export const REPORT_METRICS = [
  'wall',
  'gpu',
  'buffers',
  'cold',
  'readback',
  'validation',
  'packing',
  'upload',
] as const;
export type ReportMetric = (typeof REPORT_METRICS)[number];
export function formatChange(value: number): string {
  return Number(value.toFixed(1)).toFixed(1);
}
const sectionFor = (id: string): ReportSection => {
  if (id.startsWith('fields-')) return 'data';
  const job = regressionCatalog.builds[0]!.cases.find((c) => c.id === id);
  if (!job) return 'applications';
  if (['layout', 'transfer', 'memory'].includes(job.suite)) return 'data';
  if (['workgroup', 'submission'].includes(job.suite)) return 'execution';
  return 'compute';
};
function measurement(row: RegressionResult | undefined, metric: ReportMetric) {
  if (!row || row.status !== 'passed') return null;
  const samples =
    metric === 'wall'
      ? row.wallMs
      : metric === 'gpu'
        ? row.gpuNs
        : metric === 'validation'
          ? row.validationMs
          : metric === 'packing'
            ? row.packingMs
            : metric === 'upload'
              ? row.uploadBytes
              : metric === 'readback'
                ? row.readbackMs
                : [metric === 'cold' ? row.coldMs : row.peakBufferBytes];
  if (!samples?.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const value = median(sorted)!;
  if (!(value > 0)) return null;
  const percentile = (p: number) => {
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    return sorted[lower]! + (sorted[Math.ceil(index)]! - sorted[lower]!) * (index - lower);
  };
  return {
    value,
    low: percentile(0.1),
    high: percentile(0.9),
  };
}
export function reportGroups(record: RegressionRecord, n: number, metric: ReportMetric) {
  const sameAdapter =
    record.peers.length === 2 &&
    JSON.stringify(record.peers[0]!.webgpu) === JSON.stringify(record.peers[1]!.webgpu);
  const eligible = record.status === 'complete' && sameAdapter;
  const ids = [...new Set(record.results.filter((r) => r.n === n).map((r) => r.id))];
  return REPORT_SECTIONS.map((section) => ({
    section,
    items: ids
      .filter((id) => sectionFor(id) === section)
      .map((id) => {
        const baseline = measurement(
          record.results.find((r) => r.n === n && r.id === id && r.build === 'baseline'),
          metric,
        );
        const candidate = measurement(
          record.results.find((r) => r.n === n && r.id === id && r.build === 'candidate'),
          metric,
        );
        const change =
          eligible && baseline && candidate ? (candidate.value / baseline.value - 1) * 100 : null;
        const state =
          change === null
            ? 'unavailable'
            : metric === 'buffers' || metric === 'cold' || metric === 'upload'
              ? change < 0
                ? 'lower'
                : change > 0
                  ? 'higher'
                  : 'same'
              : baseline!.high < candidate!.low
                ? 'higher'
                : candidate!.high < baseline!.low
                  ? 'lower'
                  : 'overlap';
        return { id, baseline, candidate, change, state };
      }),
  }));
}
