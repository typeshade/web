/** Fixed application inputs and programs. Change this revision when their work changes. */
export const WORKLOAD_REVISION = 'applications-3';
export const INSTRUMENT_REVISION = 'unified-2';
export const LEGACY_APPLICATIONS = [
  'image',
  'particles',
  'peak',
  'collect',
  'resident-image',
] as const;
export const APPLICATIONS = [...LEGACY_APPLICATIONS, 'fields-1', 'fields-4', 'fields-8'] as const;
export type Application = (typeof APPLICATIONS)[number];
export const FIELD_NAMES = ['x', 'y', 'vx', 'vy', 'cold0', 'cold1', 'cold2', 'cold3'] as const;
export const fieldCount = (id: string) =>
  id === 'fields-1' ? 1 : id === 'fields-4' ? 4 : id === 'fields-8' ? 8 : 0;
// Compile these separately without fuse:true, which deliberately retains full input layouts.
export const PROJECTION_SOURCE = `"use typeshade";
class Sample { ${FIELD_NAMES.map((f) => `${f}:f32;`).join(' ')} }
${[1, 4, 8]
  .map(
    (count) => `export function fields${count}(ps:array<Sample>,out:array<f32>) {
  for(let i:u32=0;i<ps.length;i++) {out[i]=${FIELD_NAMES.slice(0, count)
    .map((f) => `ps[i].${f}`)
    .join('+')};}
}`,
  )
  .join('\n')}
`;
export const APPLICATION_SOURCE = `"use typeshade";
class Particle { x:f32; y:f32; vx:f32; vy:f32; cold0:f32; cold1:f32; cold2:f32; cold3:f32; }
export function image(xs:array<f32>) {
  for(let i:u32=0;i<xs.length;i++) { xs[i]=1.-xs[i]; }
}
export function particles(ps:array<Particle>) {
  for(let i:u32=0;i<ps.length;i++) { ps[i].x+=ps[i].vx; ps[i].y+=ps[i].vy; }
}
export function peak(xs:array<f32>):f32 {
  let m=0.; for(const x of xs) {m=max(m,x);} return m;
}
export function collect(keys:array<u32>,values:array<f32>,last:Map<u32,f32>,seen:Set<u32>) {
  for(let i:u32=0;i<keys.length;i++) {last.set(keys[i],values[i]);}
  for(let i:u32=0;i<keys.length;i++) {seen.add(keys[i]);}
}
`;
export const RESIDENT_CALLS = 16;
export function applicationInput(n: number, id?: Application) {
  const values = Float32Array.from({ length: n }, (_, i) => (i % 256) / 256);
  const keys = Uint32Array.from({ length: !id || id === 'collect' ? n : 0 }, (_, i) => i % 127);
  const particles = Array.from(
    { length: !id || id === 'particles' || fieldCount(id) ? n : 0 },
    (_, i) => ({
      x: (i % 64) / 8,
      y: (i % 32) / 8,
      vx: 0.125,
      vy: -0.25,
      cold0: 1,
      cold1: 2,
      cold2: 3,
      cold3: 4,
    }),
  );
  return { values, keys, particles, last: new Map<number, number>(), seen: new Set<number>() };
}
export type ApplicationInput = ReturnType<typeof applicationInput>;
export function expectedApplication(id: Application, input: ApplicationInput): number[] {
  const fields = fieldCount(id);
  if (fields)
    return input.particles.map((p) =>
      FIELD_NAMES.slice(0, fields).reduce((sum, key) => Math.fround(sum + p[key]), 0),
    );
  if (id === 'image') return Array.from(input.values, (x) => 1 - x);
  if (id === 'resident-image') return Array.from(input.values);
  if (id === 'particles')
    return input.particles.flatMap((p) => [
      p.x + p.vx,
      p.y + p.vy,
      p.vx,
      p.vy,
      p.cold0,
      p.cold1,
      p.cold2,
      p.cold3,
    ]);
  if (id === 'peak') return [Math.max(...input.values.subarray(0, 256))];
  const last = new Map<number, number>();
  const seen = new Set<number>();
  input.keys.forEach((key, i) => {
    last.set(key, input.values[i]!);
    seen.add(key);
  });
  return [...last].flatMap(([k, v]) => [k, v]).concat([...seen]);
}
export function applicationOutput(
  id: Application,
  input: ApplicationInput,
  result: unknown,
): number[] {
  if (id === 'peak') return [result as number];
  if (id === 'particles')
    return input.particles.flatMap((p) => [
      p.x,
      p.y,
      p.vx,
      p.vy,
      p.cold0,
      p.cold1,
      p.cold2,
      p.cold3,
    ]);
  if (id === 'collect') return [...input.last].flatMap(([k, v]) => [k, v]).concat([...input.seen]);
  return Array.from(result instanceof Float32Array ? result : input.values);
}
export function numbersMatch(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
}
