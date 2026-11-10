// The subgroup cases of the unified benchmark, as TypeShade source. Since compiler change 0117
// (pin cdb12dc) an author writes the subgroup built-in functions, so these programs are compiled
// by each build of the comparison like every other case. A build whose compiler predates the
// change refuses the source, and the catalog records the refusal on that build instead of a
// program (`refused`); its rows say so (reason `refused`) and measure nothing. The cases measure
// what a subgroup fold saves a workgroup reduction and an atomic accumulation on the visitor's
// device, before the compiler decides on such a lowering.
import type { Experiment } from './definitions.ts';

export interface SubgroupCase extends Experiment {
  /** The TypeShade program, in the compiled cases' layout: `args`, `src` and `out`. */
  source: string;
  /** Device features the compiled program needs, which the catalog holds to the program's
   *  `enable` directives. A device without one skips the case as unsupported. */
  features: string[];
}

const HEAD = `"use typeshade";
class Args { n!: u32; }

declare const args: uniform<Args>;
declare const src: storage<array<u32>>;
`;
// The sources write the stage as an attribute (compiler change 0130) and a built-in value in
// its short form, `builtin<"global_invocation_id">` (change 0135). The regression catalog
// compiles every case at two builds, the pin and the pin before it. A baseline that predates the
// short form refuses these cases, and the catalog records the refusal: the comparison of
// e30bbe57 and 34cea187 did. At the pins 50234ad6 and 68b57a03 both builds compile them.
const subgroupCase = (
  id: string,
  suite: Experiment['suite'],
  kind: Experiment['kind'],
  variant: string,
  source: string,
  features: string[],
): SubgroupCase => ({
  id,
  suite,
  kind,
  variant,
  fields: 1,
  reads: 1,
  wg: 64,
  factor: 1,
  dispatches: 1,
  separate: false,
  source,
  features,
});

/** One `subgroupAdd` per subgroup, then lane 0 sums the `num_subgroups` partials. The sum is
 *  right on any assignment of lanes to subgroups. */
const reductionSubgroup = `${HEAD}declare const out: storage<array<u32>, "read_write">;

let tile: workgroup<array<u32, 64>>;
@compute([64])
export function main(
  gid: builtin<"global_invocation_id">,
  lid: builtin<"local_invocation_id">,
  wid: builtin<"workgroup_id">,
  sgi: builtin<"subgroup_invocation_id">,
  sgid: builtin<"subgroup_id">,
  nsg: builtin<"num_subgroups">,
): void {
  const v = subgroupAdd(src[gid.x]);
  if (sgi === 0) { tile[sgid] = v; }
  workgroupBarrier();
  if (lid.x === 0) {
    let s: u32 = 0;
    for (let j: u32 = 0; j < nsg; j++) { s += tile[j]; }
    out[wid.x] = s;
  }
}
`;
/** A second `subgroupAdd` level over the partials. It is right only where a subgroup's lanes
 *  are consecutive `local_invocation_index` values, which the device probe reports; a device
 *  that assigns lanes otherwise fails this case's value check. */
const reductionSubgroupLevels = `${HEAD}declare const out: storage<array<u32>, "read_write">;

let tile: workgroup<array<u32, 64>>;
@compute([64])
export function main(
  gid: builtin<"global_invocation_id">,
  lid: builtin<"local_invocation_id">,
  wid: builtin<"workgroup_id">,
  sgi: builtin<"subgroup_invocation_id">,
  sgs: builtin<"subgroup_size">,
  sgid: builtin<"subgroup_id">,
  nsg: builtin<"num_subgroups">,
): void {
  const v = subgroupAdd(src[gid.x]);
  if (sgi === 0) { tile[sgid] = v; }
  workgroupBarrier();
  let y: u32 = 0;
  if (lid.x < nsg) { y = tile[lid.x]; }
  const w = subgroupAdd(y);
  workgroupBarrier();
  if (sgi === 0) { tile[sgid] = w; }
  workgroupBarrier();
  if (lid.x === 0) {
    let s: u32 = 0;
    const m = (nsg + sgs - 1) / sgs;
    for (let j: u32 = 0; j < m; j++) { s += tile[j]; }
    out[wid.x] = s;
  }
}
`;
/** A subgroup fold, then one `atomicAdd` per subgroup into the one bin: the pre-reduction the
 *  compiler could emit before an atomic accumulation. */
const atomicsSubgroup = `${HEAD}declare const out: storage<array<atomic<u32>>, "read_write">;

@compute([64])
export function main(gid: builtin<"global_invocation_id">): void {
  const i = gid.x;
  let x: u32 = 0;
  if (i < args.n) { x = src[i]; }
  const v = subgroupAdd(x);
  if (subgroupElect()) { atomicAdd(out[0], v); }
}
`;
/** The workgroup tree, then one `atomicAdd` per workgroup: the same pre-reduction with no
 *  extension, which any device runs. */
const atomicsWorkgroup = `${HEAD}declare const out: storage<array<atomic<u32>>, "read_write">;

let tile: workgroup<array<u32, 64>>;
@compute([64])
export function main(
  gid: builtin<"global_invocation_id">,
  lid: builtin<"local_invocation_id">,
): void {
  const i = gid.x;
  let x: u32 = 0;
  if (i < args.n) { x = src[i]; }
  tile[lid.x] = x;
  workgroupBarrier();
  for (let stride: u32 = 32; stride > 0; stride /= 2) {
    if (lid.x < stride) { tile[lid.x] += tile[lid.x + stride]; }
    workgroupBarrier();
  }
  if (lid.x === 0) { atomicAdd(out[0], tile[0]); }
}
`;
export const SUBGROUP_CASES: SubgroupCase[] = [
  subgroupCase('reduction-subgroup', 'reduction', 'reduce', 'subgroup', reductionSubgroup, [
    'subgroups',
  ]),
  subgroupCase(
    'reduction-subgroup-levels',
    'reduction',
    'reduce',
    'subgroup-levels',
    reductionSubgroupLevels,
    ['subgroups'],
  ),
  subgroupCase('atomics-bins-1-subgroup', 'atomics', 'atomic', 'subgroup', atomicsSubgroup, [
    'subgroups',
  ]),
  subgroupCase('atomics-bins-1-workgroup', 'atomics', 'atomic', 'workgroup', atomicsWorkgroup, []),
];

/** One workgroup of 64 lanes writes what it saw of its subgroups: `subgroup_id` per lane, then
 *  `subgroup_invocation_id` per lane, then `subgroup_size` and `num_subgroups`. The probe is
 *  fixed WGSL: it belongs to the instrument, not to a build under comparison. */
export const SUBGROUP_PROBE = `enable subgroups;

@group(0) @binding(0) var<storage, read_write> out: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_index) lid: u32, @builtin(subgroup_invocation_id) sgi: u32, @builtin(subgroup_size) sgs: u32, @builtin(subgroup_id) sgid: u32, @builtin(num_subgroups) nsg: u32) {
  out[lid] = sgid;
  out[64u + lid] = sgi;
  if ((lid == 0u)) {
    out[128] = sgs;
    out[129] = nsg;
  }
}
`;
export const PROBE_WORDS = 130;
export interface SubgroupProbe {
  /** The adapter's `subgroupMinSize` and `subgroupMaxSize`, where the browser reports them. */
  minSize: number | null;
  maxSize: number | null;
  /** What one workgroup of 64 lanes saw. */
  size: number;
  numSubgroups: number;
  /** Whether lane `i` was lane `i % size` of subgroup `i / size`. */
  consecutive: boolean;
}
/** Reads the probe's words into the observation, or null when the words are not a probe. */
export function readSubgroupProbe(
  words: Uint32Array,
  adapter: { subgroupMinSize?: number; subgroupMaxSize?: number },
): SubgroupProbe | null {
  const size = words[128] ?? 0;
  const numSubgroups = words[129] ?? 0;
  if (words.length < PROBE_WORDS || size < 1 || numSubgroups < 1) return null;
  let consecutive = true;
  for (let lid = 0; lid < 64; lid++)
    if (words[lid] !== Math.floor(lid / size) || words[64 + lid] !== lid % size)
      consecutive = false;
  return {
    minSize: adapter.subgroupMinSize ?? null,
    maxSize: adapter.subgroupMaxSize ?? null,
    size,
    numSubgroups,
    consecutive,
  };
}
