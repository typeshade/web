import { z } from 'zod';
import data from './catalog-v1.json';
import { EXPERIMENTS, PROFILES, SUITES, type Experiment, type Profile } from './definitions.ts';

type Case = Omit<(typeof data.cases)[number], 'suite' | 'kind'> &
  Pick<Experiment, 'suite' | 'kind'>;
export const catalog = data as Omit<typeof data, 'cases'> & { cases: Case[] };
const text = z
  .string()
  .max(512)
  .refine((s) => !/[\u0000-\u001f]/.test(s));
const time = z.number().finite().min(0).max(600_000);
const samples = z.array(time).max(15);
export const resultSchema = z
  .object({
    id: z.string(),
    n: z.number().int().positive(),
    status: z.enum(['passed', 'failed', 'skipped']),
    reason: z.enum(['none', 'validation', 'device-lost', 'unsupported', 'cancelled', 'timeout']),
    setupMs: time,
    wallMs: samples,
    gpuNs: z.array(z.number().finite().positive().max(1e12)).max(15).nullable(),
    gpuTiming: z.enum(['available', 'unsupported', 'unresolved']),
    checkedValues: z.number().int().min(0).max(1e8),
    corruptionDetected: z.boolean(),
    storageBytes: z
      .number()
      .int()
      .min(0)
      .max(64 * 1024 * 1024),
  })
  .strict();
export type BenchResult = z.infer<typeof resultSchema>;
export const metadataSchema = z
  .object({
    userAgent: text,
    runtime: z
      .object({
        build: z
          .object({
            version: text,
            revision: z
              .string()
              .regex(/^[a-f0-9]{40,64}$/)
              .nullable(),
          })
          .strict(),
        tier: z.enum(['webgpu', 'webgl2', 'cpu']),
        webgpu: z
          .object({
            provenance: z.enum(['device', 'adapter', 'unavailable']),
            vendor: text.nullable(),
            architecture: text.nullable(),
            device: text.nullable(),
            description: text.nullable(),
            fallback: z.boolean().nullable(),
            features: z.array(z.string().max(80)).max(128),
            limits: z
              .record(z.string().max(80), z.number().finite().nonnegative())
              .refine((v) => Object.keys(v).length <= 128),
          })
          .strict()
          .nullable(),
        webgl: z
          .object({
            vendor: text.nullable(),
            renderer: text.nullable(),
            unmaskedVendor: text.nullable(),
            unmaskedRenderer: text.nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict()
      .refine((info) =>
        info.tier === 'webgpu'
          ? info.webgpu !== null && info.webgl === null
          : info.tier === 'webgl2'
            ? info.webgpu === null && info.webgl !== null
            : info.webgpu === null && info.webgl === null,
      )
      .optional(),
    webgpu: z
      .object({
        available: z.boolean(),
        vendor: text,
        architecture: text,
        device: text,
        description: text,
        fallback: z.boolean().nullable(),
        timestamps: z.boolean(),
        features: z.array(z.string().max(80)).max(128),
        limits: z
          .object({
            maxBufferSize: z.number().nonnegative(),
            maxStorageBufferBindingSize: z.number().nonnegative(),
            maxComputeInvocationsPerWorkgroup: z.number().nonnegative(),
          })
          .strict(),
      })
      .strict(),
    webgl: z
      .object({
        state: z.enum(['available', 'unavailable']),
        debugExtension: z.boolean(),
        vendor: text.nullable(),
        renderer: text.nullable(),
        unmaskedVendor: text.nullable(),
        unmaskedRenderer: text.nullable(),
      })
      .strict(),
  })
  .strict();
export type Metadata = z.infer<typeof metadataSchema>;
export const recordSchema = z
  .object({
    schema: z.literal(1),
    revision: z.literal(catalog.revision),
    compiler: z.literal(catalog.compiler),
    digest: z.literal(catalog.digest),
    id: z.string().uuid(),
    started: z.string().datetime(),
    finished: z.string().datetime(),
    profile: z.enum(['quick', 'standard', 'extended']),
    suites: z.array(z.enum(SUITES)).min(1).max(SUITES.length),
    status: z.enum(['complete', 'cancelled', 'failed', 'unsupported']),
    orderSeed: z.number().int().min(0).max(65535),
    metadata: metadataSchema,
    results: z.array(resultSchema).max(EXPERIMENTS.length * 3),
  })
  .strict()
  .superRefine((r, ctx) => {
    const fail = () => ctx.addIssue({ code: 'custom', message: 'Inconsistent benchmark record' });
    if (
      new Set(r.suites).size !== r.suites.length ||
      Date.parse(r.finished) < Date.parse(r.started) ||
      Date.parse(r.finished) - Date.parse(r.started) > (PROFILES[r.profile].seconds + 60) * 1000
    )
      fail();
    const seen = new Set<string>();
    for (const row of r.results) {
      const e = EXPERIMENTS.find((e) => e.id === row.id);
      const key = `${row.id}:${row.n}`;
      if (
        !e ||
        !r.suites.includes(e.suite) ||
        !(PROFILES[r.profile].sizes as readonly number[]).includes(row.n) ||
        seen.has(key)
      ) {
        fail();
        continue;
      }
      seen.add(key);
      if (row.storageBytes !== storageBytes(e, row.n)) fail();
      const count = PROFILES[r.profile].samples;
      if (
        row.status === 'passed' &&
        (row.reason !== 'none' ||
          row.wallMs.length !== count ||
          row.checkedValues !== outputLength(e, row.n) ||
          !row.corruptionDetected)
      )
        fail();
      if (
        row.gpuNs !== null &&
        (row.gpuTiming !== 'available' ||
          row.gpuNs.length !== row.wallMs.length ||
          !r.metadata.webgpu.timestamps ||
          e.kind === 'upload' ||
          e.kind === 'readback')
      )
        fail();
      if ((row.gpuNs === null) === (row.gpuTiming === 'available')) fail();
      if (row.status !== 'passed' && row.reason === 'none') fail();
    }
    const expected =
      EXPERIMENTS.filter((e) => r.suites.includes(e.suite)).length *
      PROFILES[r.profile].sizes.length;
    if (
      r.status === 'complete' &&
      (r.results.length !== expected ||
        r.results.some((r) => r.status !== 'passed') ||
        !r.metadata.webgpu.available)
    )
      fail();
  });
export type BenchRecord = z.infer<typeof recordSchema>;
export const parseRecord = (value: unknown): BenchRecord => recordSchema.parse(value);
export function outputLength(e: Experiment, n: number): number {
  return e.kind === 'reduce' ? n / 64 : e.kind === 'atomic' ? e.factor : n;
}
export function storageBytes(e: Experiment, n: number): number {
  return n * e.fields * 4 + outputLength(e, n) * 4;
}
export function expectedRows(profile: Profile, suites: readonly string[]): number {
  return (
    EXPERIMENTS.filter((e) => suites.includes(e.suite)).length * PROFILES[profile].sizes.length
  );
}
