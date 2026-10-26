/** Revisioned workload contract. Changing a workload requires a new catalog revision. */
export const SUITES = [
  'layout',
  'transfer',
  'memory',
  'arithmetic',
  'reduction',
  'atomics',
  'workgroup',
  'submission',
] as const;
export type Suite = (typeof SUITES)[number];
export const PROFILES = {
  quick: { sizes: [16384], samples: 3, warmup: 1, seconds: 60 },
  standard: { sizes: [16384, 65536], samples: 7, warmup: 2, seconds: 180 },
  extended: { sizes: [16384, 65536, 262144], samples: 15, warmup: 3, seconds: 600 },
} as const;
export type Profile = keyof typeof PROFILES;
export interface Experiment {
  id: string;
  suite: Suite;
  kind: 'layout' | 'copy' | 'arithmetic' | 'reduce' | 'atomic' | 'upload' | 'readback';
  variant: string;
  fields: number;
  reads: number;
  wg: number;
  factor: number;
  dispatches: number;
  separate: boolean;
}
const experiment = (
  id: string,
  suite: Suite,
  kind: Experiment['kind'],
  options: Partial<Experiment> = {},
): Experiment => ({
  id,
  suite,
  kind,
  variant: id,
  fields: 1,
  reads: 1,
  wg: 64,
  factor: 1,
  dispatches: 1,
  separate: false,
  ...options,
});
export const EXPERIMENTS: Experiment[] = [
  ...[1, 8].flatMap((reads) =>
    [8, ...(reads === 1 ? [1] : [])].flatMap((fields) =>
      ['aos', 'soa'].map((variant) =>
        experiment(`layout-${variant}-${fields}-read-${reads}`, 'layout', 'layout', {
          variant,
          fields,
          reads,
        }),
      ),
    ),
  ),
  experiment('transfer-upload', 'transfer', 'upload'),
  experiment('transfer-readback', 'transfer', 'readback'),
  ...[1, 17, 4097].map((factor) =>
    experiment(`memory-step-${factor}`, 'memory', 'copy', { factor }),
  ),
  ...[4, 64].map((factor) =>
    experiment(`arithmetic-rounds-${factor}`, 'arithmetic', 'arithmetic', { factor }),
  ),
  experiment('reduction-serial', 'reduction', 'reduce', { variant: 'serial' }),
  experiment('reduction-workgroup', 'reduction', 'reduce', { variant: 'shared' }),
  ...[1, 256].map((factor) =>
    experiment(`atomics-bins-${factor}`, 'atomics', 'atomic', { factor }),
  ),
  ...[64, 128, 256].map((wg) => experiment(`workgroup-${wg}`, 'workgroup', 'copy', { wg })),
  experiment('submission-batched', 'submission', 'copy', { dispatches: 16 }),
  experiment('submission-separate', 'submission', 'copy', { dispatches: 16, separate: true }),
];
export const RECORD_BYTES = 256 * 1024;
export const RETENTION_DAYS = 90;
export const HOURLY_LIMIT = 6;
export const DAILY_LIMIT = 2000;
