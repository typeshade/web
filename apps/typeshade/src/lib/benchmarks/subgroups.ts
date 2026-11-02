// Fixed WGSL cases for the `subgroups` extension. TypeShade does not author subgroup built-ins
// (compiler roadmap, after 1.0; compiler issue #536), so these programs are written by hand in
// the layout of the compiled cases and run unchanged on both builds. They measure what a
// subgroup fold would save a workgroup reduction and an atomic accumulation on the visitor's
// device, before the compiler decides on such a lowering.
import type { Experiment } from './definitions.ts';

export interface FixedCase extends Experiment {
  /** Empty: nothing is compiled. The WGSL below is the complete program. */
  source: '';
  wgsl: string;
  /** Device features the program needs. A device without one skips the case as unsupported. */
  features: string[];
}

const HEAD = `struct Args {
  n: u32,
}

var<workgroup> tile: array<u32, 64>;

@group(0) @binding(0) var<uniform> args: Args;
@group(0) @binding(1) var<storage, read> src: array<u32>;
`;
const SUBGROUP_PARAMS =
  '@builtin(subgroup_invocation_id) sgi: u32, @builtin(subgroup_size) sgs: u32, ' +
  '@builtin(subgroup_id) sgid: u32, @builtin(num_subgroups) nsg: u32';
/** The compiled `reduction-workgroup` tree, barrier for barrier, over a value already in `tile`. */
const TREE = `  workgroupBarrier();
  for (var stride: u32 = 32u; (stride > 0u); stride /= 2u) {
    if ((lid.x < stride)) {
      tile[lid.x] += tile[lid.x + stride];
    }
    workgroupBarrier();
  }
`;
const fixed = (
  id: string,
  suite: Experiment['suite'],
  kind: Experiment['kind'],
  variant: string,
  wgsl: string,
  features: string[],
): FixedCase => ({
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
  source: '',
  wgsl,
  features,
});

/** One `subgroupAdd` per subgroup, then lane 0 sums the `num_subgroups` partials. The sum is
 *  right on any assignment of lanes to subgroups. */
const reductionSubgroup = `enable subgroups;

${HEAD}@group(0) @binding(2) var<storage, read_write> out: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>, ${SUBGROUP_PARAMS}) {
  let v = subgroupAdd(src[gid.x]);
  if ((sgi == 0u)) {
    tile[sgid] = v;
  }
  workgroupBarrier();
  if ((lid.x == 0u)) {
    var s: u32 = 0u;
    for (var j: u32 = 0u; (j < nsg); j++) {
      s += tile[j];
    }
    out[wid.x] = s;
  }
}
`;
/** A second `subgroupAdd` level over the partials. It is right only where a subgroup's lanes
 *  are consecutive `local_invocation_index` values, which the device probe reports; a device
 *  that assigns lanes otherwise fails this case's value check. */
const reductionSubgroupLevels = `enable subgroups;

${HEAD}@group(0) @binding(2) var<storage, read_write> out: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>, ${SUBGROUP_PARAMS}) {
  let v = subgroupAdd(src[gid.x]);
  if ((sgi == 0u)) {
    tile[sgid] = v;
  }
  workgroupBarrier();
  var y: u32 = 0u;
  if ((lid.x < nsg)) {
    y = tile[lid.x];
  }
  let w = subgroupAdd(y);
  workgroupBarrier();
  if ((sgi == 0u)) {
    tile[sgid] = w;
  }
  workgroupBarrier();
  if ((lid.x == 0u)) {
    var s: u32 = 0u;
    let m = (nsg + sgs - 1u) / sgs;
    for (var j: u32 = 0u; (j < m); j++) {
      s += tile[j];
    }
    out[wid.x] = s;
  }
}
`;
/** A subgroup fold, then one `atomicAdd` per subgroup into the one bin: the pre-reduction the
 *  compiler could emit before an atomic accumulation. */
const atomicsSubgroup = `enable subgroups;

${HEAD}@group(0) @binding(2) var<storage, read_write> out: array<atomic<u32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>, ${SUBGROUP_PARAMS}) {
  let i = gid.x;
  var x: u32 = 0u;
  if ((i < args.n)) {
    x = src[i];
  }
  let v = subgroupAdd(x);
  if (subgroupElect()) {
    _ = atomicAdd(&out[0], v);
  }
}
`;
/** The workgroup tree, then one `atomicAdd` per workgroup: the same pre-reduction with no
 *  extension, which any device runs. */
const atomicsWorkgroup = `${HEAD}@group(0) @binding(2) var<storage, read_write> out: array<atomic<u32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
  let i = gid.x;
  var x: u32 = 0u;
  if ((i < args.n)) {
    x = src[i];
  }
  tile[lid.x] = x;
${TREE}  if ((lid.x == 0u)) {
    _ = atomicAdd(&out[0], tile[0]);
  }
}
`;
export const FIXED_CASES: FixedCase[] = [
  fixed('reduction-subgroup', 'reduction', 'reduce', 'subgroup', reductionSubgroup, ['subgroups']),
  fixed(
    'reduction-subgroup-levels',
    'reduction',
    'reduce',
    'subgroup-levels',
    reductionSubgroupLevels,
    ['subgroups'],
  ),
  fixed('atomics-bins-1-subgroup', 'atomics', 'atomic', 'subgroup', atomicsSubgroup, ['subgroups']),
  fixed('atomics-bins-1-workgroup', 'atomics', 'atomic', 'workgroup', atomicsWorkgroup, []),
];
/** The bindings every fixed case declares, in the compiled cases' order. */
export const FIXED_BINDINGS = [
  { name: 'args', binding: 0, group: 0 },
  { name: 'src', binding: 1, group: 0 },
  { name: 'out', binding: 2, group: 0 },
];

/** One workgroup of 64 lanes writes what it saw of its subgroups: `subgroup_id` per lane, then
 *  `subgroup_invocation_id` per lane, then `subgroup_size` and `num_subgroups`. */
export const SUBGROUP_PROBE = `enable subgroups;

@group(0) @binding(0) var<storage, read_write> out: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_index) lid: u32, ${SUBGROUP_PARAMS}) {
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
