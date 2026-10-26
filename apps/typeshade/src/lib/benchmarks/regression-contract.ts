import { z } from 'zod';
import data from './regression-catalog.json';
import registry from './regression-catalogs.json';
import type { Experiment } from './definitions.ts';
import { metadataSchema, outputLength, storageBytes } from './contract.ts';
import { PROFILES } from './definitions.ts';
import { LEGACY_APPLICATIONS, APPLICATION_SOURCE, fieldCount } from './workloads.ts';
import { MAX_DISPATCHES } from './timing.ts';

export const regressionCatalog = data;
const ms = z.number().finite().nonnegative().max(600_000);
const samples = z.array(ms).max(15);
const bytes = z
  .number()
  .int()
  .nonnegative()
  .max(512 * 1024 * 1024);
export const regressionResultSchema = z
  .object({
    id: z.string().max(80),
    n: z.number().int().positive(),
    build: z.enum(['baseline', 'candidate']),
    kind: z.enum(['compiled', 'host', 'resident']),
    status: z.enum(['passed', 'failed']),
    reason: z.enum(['none', 'validation', 'device-lost']),
    setupMs: ms,
    coldMs: ms,
    wallMs: samples,
    readbackMs: samples.nullable(),
    gpuNs: z.array(z.number().finite().positive().max(1e12)).max(15).nullable(),
    gpuTiming: z.enum(['available', 'unsupported', 'unresolved']),
    dispatches: z.number().int().min(1).max(MAX_DISPATCHES),
    checkedValues: z.number().int().nonnegative().max(1e8),
    corruptionDetected: z.boolean(),
    logicalBytes: bytes,
    peakBufferBytes: bytes,
    bufferAllocations: z.number().int().nonnegative().max(1e6),
    gpuSubmissions: z.number().int().nonnegative().max(1e6),
    validationMs: samples.nullable().optional(),
    packingMs: samples.nullable().optional(),
    uploadBytes: z.array(bytes).max(15).nullable().optional(),
    inputBytes: bytes.nullable().optional(),
  })
  .strict();
export type RegressionResult = z.infer<typeof regressionResultSchema>;
export const regressionRecordSchema = z
  .object({
    schema: z.literal(2),
    revision: z.string().max(80),
    instrument: z.string().max(80),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    workload: z.string().regex(/^[a-f0-9]{64}$/),
    builds: z.tuple([z.string().regex(/^[a-f0-9]{40}$/), z.string().regex(/^[a-f0-9]{40}$/)]),
    runtimes: z.tuple([z.string().regex(/^[a-f0-9]{64}$/), z.string().regex(/^[a-f0-9]{64}$/)]),
    id: z.string().uuid(),
    started: z.string().datetime(),
    finished: z.string().datetime(),
    profile: z.enum(['quick', 'standard', 'extended']),
    status: z.enum(['complete', 'cancelled', 'failed', 'unsupported']),
    orderSeed: z.number().int().min(0).max(65535),
    metadata: metadataSchema,
    peers: z.array(metadataSchema).max(2),
    loadMs: z.array(ms).max(2),
    results: z.array(regressionResultSchema).max(180),
  })
  .strict()
  .superRefine((r, ctx) => {
    const fail = () => ctx.addIssue({ code: 'custom', message: 'Inconsistent paired benchmark' });
    if (
      Date.parse(r.finished) < Date.parse(r.started) ||
      Date.parse(r.finished) - Date.parse(r.started) > (PROFILES[r.profile].seconds + 60) * 1000
    )
      fail();
    const active = registry.find((c) => c.digest === r.digest);
    if (!active) {
      fail();
      return;
    }
    if (
      r.revision !== active.workloadRevision ||
      r.instrument !== active.instrument ||
      r.workload !== active.workload ||
      r.builds.some((b, i) => b !== active.builds[i]!.revision) ||
      r.runtimes.some((b, i) => b !== active.builds[i]!.runtimeDigest)
    )
      fail();
    // New comparisons can have projection on both builds. Exact source revisions share
    // their generated capability across retained catalogs. Older catalogs without it keep
    // the original unified-2 baseline/candidate contract.
    const projected = active.builds.map((build, index) => {
      for (const catalog of registry)
        for (const known of catalog.builds)
          if (known.revision === build.revision && 'inputProjection' in known)
            return known.inputProjection === true;
      return index === 1;
    });
    const seen = new Map<string, RegressionResult>();
    const applications =
      'applications' in active ? (active.applications as readonly string[]) : LEGACY_APPLICATIONS;
    const ids = [...active.builds[0]!.cases.map((c) => c.id), ...applications];
    if (
      active.instrument === 'unified-2' &&
      r.status === 'complete' &&
      r.peers[1]?.runtime?.tier !== 'webgpu'
    )
      fail();
    for (const row of r.results) {
      const key = `${row.id}:${row.n}:${row.build}`;
      if (
        seen.has(key) ||
        !ids.includes(row.id) ||
        !(PROFILES[r.profile].sizes as readonly number[]).includes(row.n)
      )
        fail();
      seen.set(key, row);
      const e = active.builds[0]!.cases.find((c) => c.id === row.id);
      const kind = e ? 'compiled' : row.id === 'resident-image' ? 'resident' : 'host';
      if (row.kind !== kind || (e && row.logicalBytes !== storageBytes(e as Experiment, row.n)))
        fail();
      if (
        row.status === 'passed' &&
        (row.reason !== 'none' ||
          !row.corruptionDetected ||
          row.checkedValues < 1 ||
          row.wallMs.length !== PROFILES[r.profile].samples)
      )
        fail();
      const fields = fieldCount(row.id);
      const checked = fields
        ? row.n * 9
        : e
          ? outputLength(e as Experiment, row.n)
          : row.id === 'particles'
            ? row.n * 8
            : row.id === 'peak'
              ? 1
              : row.id === 'collect'
                ? 127 * 3
                : row.n;
      if (row.status === 'passed' && row.checkedValues !== checked) fail();
      if (row.status === 'failed' && row.reason === 'none') fail();
      if ((row.gpuNs === null) === (row.gpuTiming === 'available')) fail();
      if (
        row.gpuNs &&
        ((row.kind !== 'compiled' && !fields) ||
          e?.kind === 'upload' ||
          e?.kind === 'readback' ||
          e?.separate ||
          row.gpuNs.length !== row.wallMs.length ||
          !r.metadata.webgpu.timestamps)
      )
        fail();
      if (
        ['unified-1', 'unified-2'].includes(active.instrument) &&
        e &&
        (e.kind === 'atomic' || e.kind === 'upload' || e.kind === 'readback' || e.dispatches > 1) &&
        row.dispatches !== e.dispatches
      )
        fail();
      if ((row.kind === 'resident') !== (row.readbackMs !== null)) fail();
      if (row.readbackMs && row.readbackMs.length !== row.wallMs.length) fail();
      if (active.instrument === 'unified-2' && fields && row.status === 'passed') {
        if (row.logicalBytes !== row.n * 36) fail();
        const inputBytes = row.n * (projected[row.build === 'baseline' ? 0 : 1] ? fields : 8) * 4;
        if (row.inputBytes !== inputBytes) fail();
        for (const values of [row.validationMs, row.packingMs, row.uploadBytes])
          if (!values || values.length !== row.wallMs.length) fail();
        if (row.uploadBytes?.some((v) => v < inputBytes + row.n * 4)) fail();
      }
      const other = seen.get(
        `${row.id}:${row.n}:${row.build === 'baseline' ? 'candidate' : 'baseline'}`,
      );
      if (other && other.dispatches !== row.dispatches) fail();
    }
    if (
      r.status === 'complete' &&
      (r.results.length !== ids.length * 2 * PROFILES[r.profile].sizes.length ||
        r.results.some((x) => x.status !== 'passed') ||
        r.peers.length !== 2 ||
        r.loadMs.length !== 2 ||
        !r.peers.every((x) => x.webgpu.available))
    )
      fail();
  });
export type RegressionRecord = z.infer<typeof regressionRecordSchema>;
export function regressionRows(sizes: readonly number[], digest = data.digest): number {
  const active = registry.find((c) => c.digest === digest) ?? data;
  const applications =
    'applications' in active ? (active.applications as readonly string[]) : LEGACY_APPLICATIONS;
  return (active.builds[0]!.cases.length + applications.length) * 2 * sizes.length;
}
export { APPLICATION_SOURCE };
