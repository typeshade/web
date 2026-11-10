import type { FunctionLesson } from './function-lessons-en.ts';

export const operationLessons = {
  // The subgroup built-in functions (compiler change 0117): a fixture of four lanes, and the
  // one-lane subgroup WebGL2 and the CPU oracle run (Rule 11.21).
  subgroupAdd: {
    meaning:
      'A subgroup fold adds the value of every lane of the subgroup and gives the sum to every lane, in one instruction with no barrier.',
    use: 'Use it to pre-reduce before an atomic or a workgroup tree: one atomic per subgroup instead of one per lane.',
    try: "Compare the four-lane sum with the one-lane case: WebGL2 and the CPU oracle run a subgroup of one invocation (Rule 11.21), so the fold is the lane's own value.",
    caution:
      'Every lane of the subgroup must reach the call together (uniform control flow). An integer sum has one value in any order; a float sum does not, and the determinism report lists it as order.',
  },
  subgroupMul: {
    meaning:
      'A subgroup fold multiplies the values of every lane and gives the product to every lane.',
    use: 'Use it for a product over lanes that would otherwise take a loop over workgroup memory.',
    try: "Compare the four-lane product with the one-lane case, where the product is the lane's own value.",
    caution:
      'Every lane must reach the call together. A float product has no fixed order across devices; an integer product wraps at 32 bits.',
  },
  subgroupMin: {
    meaning: 'A subgroup fold gives every lane the smallest value any lane holds.',
    use: 'Use it to find a minimum across lanes without workgroup memory.',
    try: 'Compare the four-lane minimum with the one-lane case.',
    caution:
      'Every lane must reach the call together. The result is exact in any order, so the determinism report lists no row for it.',
  },
  subgroupMax: {
    meaning: 'A subgroup fold gives every lane the largest value any lane holds.',
    use: 'Use it to find a maximum across lanes without workgroup memory.',
    try: 'Compare the four-lane maximum with the one-lane case.',
    caution: 'Every lane must reach the call together. The result is exact in any order.',
  },
  subgroupAnd: {
    meaning: "A subgroup fold gives every lane the bitwise AND of every lane's integer.",
    use: 'Use it to test a bit that every lane set, or to combine masks.',
    try: 'The fixture folds 3, 1, 4 and 1: no bit is set in all four, so the result is 0.',
    caution:
      'Every lane must reach the call together. The argument is an i32 or a u32, or a vector of them.',
  },
  subgroupOr: {
    meaning: "A subgroup fold gives every lane the bitwise OR of every lane's integer.",
    use: 'Use it to collect flags any lane raised.',
    try: 'The fixture folds 3, 1, 4 and 1 into 7: the bits of 3 and 4 together.',
    caution:
      'Every lane must reach the call together. The argument is an i32 or a u32, or a vector of them.',
  },
  subgroupXor: {
    meaning: "A subgroup fold gives every lane the bitwise XOR of every lane's integer.",
    use: 'Use it for a parity over lanes, or to cancel values that appear twice.',
    try: 'The fixture folds 3, 1, 4 and 1: the two equal values cancel and 3 ^ 4 is 7.',
    caution:
      'Every lane must reach the call together. The argument is an i32 or a u32, or a vector of them.',
  },
  subgroupExclusiveAdd: {
    meaning:
      'An exclusive scan gives each lane the sum of the lanes before it, and lane 0 the sum of none, 0.',
    use: 'Use it to assign each lane an offset, such as where to write in a compacted output.',
    try: 'Read the lanes left to right: each value is the running sum before that lane. On one lane the scan is 0.',
    caution:
      'Every lane must reach the call together. A float scan has no fixed order across devices; the report lists it as order.',
  },
  subgroupInclusiveAdd: {
    meaning: 'An inclusive scan gives each lane the sum of the lanes up to and including it.',
    use: "Use it where the offset after each lane's own value is wanted; the last lane holds the subgroup's sum.",
    try: "Read the lanes left to right: each value is the running sum through that lane. On one lane it is the lane's own value.",
    caution:
      'Every lane must reach the call together. A float scan has no fixed order across devices.',
  },
  subgroupExclusiveMul: {
    meaning:
      'An exclusive scan gives each lane the product of the lanes before it, and lane 0 the product of none, 1.',
    use: 'Use it for a running product across lanes.',
    try: 'Read the lanes left to right. On one lane the scan is 1.',
    caution:
      'Every lane must reach the call together. A float scan has no fixed order across devices.',
  },
  subgroupInclusiveMul: {
    meaning: 'An inclusive scan gives each lane the product of the lanes up to and including it.',
    use: "Use it for a running product that includes the lane's own value.",
    try: "Read the lanes left to right. On one lane it is the lane's own value.",
    caution:
      'Every lane must reach the call together. A float scan has no fixed order across devices.',
  },
  subgroupAll: {
    meaning: "A vote gives every lane true when every lane's bool is true.",
    use: 'Use it to take a branch only when the whole subgroup agrees, such as skipping work every lane would skip.',
    try: "The fixture has one false lane, so the vote is false. On one lane the vote is the lane's own bool.",
    caution:
      'Every lane must reach the call together, so the call cannot sit under a condition that differs by lane.',
  },
  subgroupAny: {
    meaning: "A vote gives every lane true when at least one lane's bool is true.",
    use: 'Use it to keep work alive while any lane still needs it.',
    try: "The fixture has three true lanes, so the vote is true. On one lane the vote is the lane's own bool.",
    caution:
      'Every lane must reach the call together. The right side of subgroupElect() && subgroupAny(p) is reached by one lane and is refused.',
  },
  subgroupBallot: {
    meaning:
      "A ballot gives every lane a vec4u with one bit per lane: bit i of word i / 32 is lane i's bool.",
    use: 'Use it to count the lanes that voted, with countOneBits, or to find the first lane that did.',
    try: 'The fixture votes true, false, true, true: bits 0, 2 and 3, which is 13. On one lane only bit 0 can be set.',
    caution: "Every lane must reach the call together. Bits past the subgroup's size are 0.",
  },
  subgroupElect: {
    meaning:
      'An election is true in exactly one lane of the subgroup, the active lane with the lowest id, and false in the others.',
    use: "Use it to let one lane do a subgroup's shared work, such as one atomicAdd of a fold.",
    try: 'Lane 0 is elected in the fixture. On one lane the election is always true.',
    caution:
      'Every lane must reach the call together. Which lane is elected depends on which lanes are active.',
  },
  subgroupBroadcast: {
    meaning: 'A broadcast gives every lane the value the named lane holds.',
    use: "Use it to share one lane's result, such as a value lane 0 computed, with the whole subgroup.",
    try: "The fixture broadcasts lane 2, so every lane reads 4. On one lane the call gives the lane's own value, whatever lane it names.",
    caution:
      "The lane is written as a number in the call (a const-expression in WGSL); a lane computed at run time is subgroupShuffle's. A read of a lane other than 0 is a target row of the determinism report on WebGL2 and the oracle.",
  },
  subgroupBroadcastFirst: {
    meaning: 'A broadcast gives every lane the value the first active lane holds.',
    use: "Use it to share the elected lane's value with the subgroup.",
    try: "Lane 0 is first in the fixture, so every lane reads 3. On one lane it is the lane's own value.",
    caution:
      'Every lane must reach the call together. Which lane is first depends on which lanes are active.',
  },
  subgroupShuffle: {
    meaning: 'A shuffle gives each lane the value of the lane it names, which may differ per lane.',
    use: 'Use it to permute values across lanes, such as reversing or rotating them.',
    try: "The fixture asks lane i for lane 3 - i, which reverses the four values. On one lane the call gives the lane's own value, whatever id names.",
    caution:
      "The lane is a u32 computed at run time; a lane at or past the subgroup's size gives an indeterminate value. A read of another lane is a target row of the determinism report on WebGL2 and the oracle.",
  },
  subgroupShuffleDown: {
    meaning: 'A shuffle gives each lane the value of the lane delta above it.',
    use: 'Use it for a neighbour read, such as a difference between adjacent lanes.',
    try: "With delta 1 each lane reads the next lane; the last lane names a lane past the subgroup, shown as ?. On one lane the call gives the lane's own value.",
    caution:
      "A lane past the subgroup's size gives an indeterminate value. A read of another lane is a target row of the determinism report on WebGL2 and the oracle.",
  },
  subgroupShuffleUp: {
    meaning: 'A shuffle gives each lane the value of the lane delta below it.',
    use: 'Use it for a neighbour read from the lane before.',
    try: "With delta 1 each lane reads the previous lane; lane 0 names a lane below the subgroup, shown as ?. On one lane the call gives the lane's own value.",
    caution:
      'A lane below 0 gives an indeterminate value. A read of another lane is a target row of the determinism report on WebGL2 and the oracle.',
  },
  subgroupShuffleXor: {
    meaning: 'A shuffle gives each lane the value of the lane whose id is its own XOR a mask.',
    use: 'Use it for butterfly exchanges, the step of a tree reduction within a subgroup.',
    try: "With mask 1 lanes 0 and 1 swap, and lanes 2 and 3 swap. On one lane the call gives the lane's own value.",
    caution:
      "A lane at or past the subgroup's size gives an indeterminate value. A read of another lane is a target row of the determinism report on WebGL2 and the oracle.",
  },
  textureSample: {
    meaning:
      'Filtered sampling looks up a texture at normalized coordinates. A sampler controls interpolation and addressing; nearby fragments determine the mip level.',
    use: 'Use it to put an image on a surface while reducing aliasing as the image gets smaller.',
    try: 'Compare a texel centre with the centre of the grid. Linear filtering blends the surrounding texels.',
    caution:
      'This model uses a scalar channel, linear filtering, clamp-to-edge addressing, and the base mip. Real implicit sampling chooses detail from fragment derivatives.',
  },
  textureLoad: {
    meaning:
      'A texel load reads one stored value at integer coordinates, without sampler interpolation.',
    use: 'Use it for exact lookup in image-processing kernels, lookup tables, and multisample inspection.',
    try: 'Compare the integer coordinates with the selected cell. No neighbouring values are blended.',
    caution:
      'The example reads an in-bounds base-mip texel. Multisampled textures take a sample index instead of a mip level. Keep coordinates in bounds.',
  },
  textureSampleLevel: {
    meaning: 'Explicit-level sampling filters a texture at a mip level chosen by the caller.',
    use: 'Use it for compute-shader texture reads or deliberate control of image detail.',
    try: 'Compare base-mip sampling with the averaged mip. The coordinate stays fixed while detail changes.',
    caution:
      'The model contains a base grid and its averaged mip. Actual interpolation between mip levels depends on the sampler. Use a texture with the required mip chain.',
  },
  textureSampleBias: {
    meaning:
      'A mip bias shifts the detail level inferred from nearby fragments. A positive bias favours coarser detail.',
    use: 'Use it to soften a texture lookup or tune the balance between sharpness and aliasing.',
    try: 'Compare the same coordinate with different biases. The model starts with an implicit level at the base mip.',
    caution:
      'The actual implicit level depends on fragment derivatives and sampler limits. Bias is a relative shift, not an absolute mip index; this call is fragment-only.',
  },
  textureSampleGrad: {
    meaning:
      'Gradient sampling chooses texture detail from coordinate changes supplied by the caller.',
    use: 'Use it when coordinates wrap or branch but filtering still needs the original smooth coordinate gradients.',
    try: 'Compare small and large gradients at the same coordinate. A larger footprint selects coarser detail.',
    caution:
      'The model uses isotropic gradients on a square texture with nearest mip selection. Real filtering also depends on the sampler and footprint anisotropy.',
  },
  textureGather: {
    meaning:
      'Gather returns one channel from the four texels around a sampling coordinate without blending them into one value.',
    use: 'Use it to implement a custom image filter that needs individual neighbouring samples.',
    try: 'Follow the output order around the grid: upper left, upper right, lower right, lower left.',
    caution:
      'This model gathers an interior base-mip neighbourhood. Colour textures require a literal channel selector. Gather is WebGPU-only in this compiler target pair.',
  },
  textureGatherCompare: {
    meaning:
      'Depth comparison tests a reference depth against stored depths through a comparison sampler. Gather returns each comparison separately.',
    use: 'Use it for shadow tests: compare a surface depth with the nearest depth recorded from the light.',
    try: 'Raise the reference depth and observe which texels pass. The example sampler uses less-equal comparison.',
    caution:
      'The four outputs follow gather order and are not averaged. This compiler emits this operation for WebGPU only.',
  },
  textureSampleCompare: {
    meaning:
      'Depth comparison tests a reference depth against stored depths through a comparison sampler. Filtering combines the comparison results into a visibility value.',
    use: 'Use it for shadow tests: compare a surface depth with the nearest depth recorded from the light.',
    try: 'Raise the reference depth and observe which texels pass. The example sampler uses less-equal comparison.',
    caution:
      'Compare the reference with each depth before filtering. Comparing with the average depth gives a different answer.',
  },
  textureSampleCompareLevel: {
    meaning:
      'Depth comparison tests a reference depth against stored depths through a comparison sampler. Filtering combines the comparison results into a visibility value.',
    use: 'Use it for shadow tests: compare a surface depth with the nearest depth recorded from the light.',
    try: 'Raise the reference depth and observe which texels pass. The example sampler uses less-equal comparison.',
    caution:
      'Compare the reference with each depth before filtering. Comparing with the average depth gives a different answer. This call uses mip level zero.',
  },
  textureDimensions: {
    meaning: 'Texture dimensions describe the extent of an image, not its colour.',
    use: 'Use them to turn texel offsets into normalized coordinate offsets.',
    try: "Each component of the returned vector gives the texel count along one axis. A cube's face count is not part of that size vector.",
    caution:
      'Array layer counts and sample counts are separate queries. A cube query returns the size of one face.',
  },
  textureNumLayers: {
    meaning:
      'A texture array contains independently addressable image layers. This query returns their count.',
    use: 'Use it to bound a layer selector or iterate over an image array.',
    try: 'The result is the array layer count. For a cube array, it counts cubes, not individual faces.',
    caution:
      'The texture must be an array texture. The highest valid layer index is one less than the count.',
  },
  textureNumSamples: {
    meaning:
      'Multisampling stores several coverage samples in each texel. This query returns that sample count.',
    use: 'Use it when resolving a multisampled image by reading its individual samples.',
    try: 'Textures can have different width and height but return the same sample count.',
    caution:
      'This query requires a multisampled texture. Sample indices start at zero. The compiler has no GLSL ES multisample form.',
  },
  textureStore: {
    meaning: 'A texture store replaces the value of one integer-addressed texel.',
    use: 'Use it to write a compute result into an image.',
    try: 'Only the selected texel changes to the input value. The call returns no value; the display shows the texel before and after the store.',
    caution:
      'Use a writable storage texture and a value matching its format. This model shows separate writes; overlapping writes need an explicit race-free design.',
  },
  atomicLoad: {
    meaning: 'An atomic load reads one shared integer without a torn read.',
    use: 'Use it for reading a shared counter.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicStore: {
    meaning:
      'An atomic store writes one shared integer as an indivisible operation. It returns no value.',
    use: 'Use it for resetting a shared counter.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicAdd: {
    meaning:
      'Adds to an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for counting events or allocating unique slots.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicSub: {
    meaning:
      'Subtracts from an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for tracking remaining work.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicMin: {
    meaning:
      'Keeps the smaller value in an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for finding a shared minimum.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicMax: {
    meaning:
      'Keeps the larger value in an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for finding a shared maximum.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicAnd: {
    meaning:
      'Applies a bitwise AND to an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for clearing shared flag bits.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicOr: {
    meaning:
      'Applies a bitwise OR to an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for setting shared flag bits.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicXor: {
    meaning:
      'Applies a bitwise XOR to an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for toggling shared flag bits.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicExchange: {
    meaning:
      'Replaces an integer memory location atomically. It returns the value from before the update.',
    use: 'Use it for swapping a shared integer.',
    try: 'Compare the returned value with the stored value. Each case starts from its own initial state.',
    caution:
      'The model uses an unsigned integer and one serialized operation. Real invocation order is unspecified. Atomicity does not synchronize unrelated memory; these calls require WebGPU in this compiler.',
  },
  atomicCompareExchangeWeak: {
    meaning:
      'A weak compare-exchange conditionally replaces a shared integer when it matches an expected value. It reports the old value and whether replacement occurred.',
    use: 'Use it in retry loops for conditional updates of a shared integer.',
    try: 'Compare matching and mismatching expected values. Even a match permits a spurious failure.',
    caution:
      'A matching expected value does not guarantee success. Retry according to the algorithm; the model lists both allowed matching outcomes. It does not simulate a GPU scheduler.',
  },
  workgroupBarrier: {
    meaning:
      'A barrier waits for the invocations of one workgroup and orders their accesses to workgroup memory.',
    use: 'Use it between a cooperative write phase and a read phase involving workgroup memory.',
    try: 'Compare the shared workgroup case with independent workgroups. Only invocations in the same workgroup rendezvous.',
    caution:
      'Every invocation of the workgroup must reach the barrier in uniform control flow. It is not a device-wide barrier. These compiler calls are compute-only and WebGPU-only.',
  },
  // The stage calls of compiler change 0111, and the numerical contract of change 0107.
  storageBarrier: {
    meaning:
      'A barrier waits for the invocations of one workgroup and orders their accesses to storage memory.',
    use: 'Use it between a cooperative write phase and a read phase involving storage memory.',
    try: 'Compare the shared workgroup case with independent workgroups. Only invocations in the same workgroup rendezvous.',
    caution:
      'Every invocation of the workgroup must reach the barrier in uniform control flow. It is not a device-wide barrier. These compiler calls are compute-only and WebGPU-only.',
  },
  textureBarrier: {
    meaning:
      'A barrier waits for the invocations of one workgroup and orders their accesses to texture memory.',
    use: 'Use it between a cooperative write phase and a read phase involving texture memory.',
    try: 'Compare the shared workgroup case with independent workgroups. Only invocations in the same workgroup rendezvous.',
    caution:
      'Every invocation of the workgroup must reach the barrier in uniform control flow. It is not a device-wide barrier. These compiler calls are compute-only and WebGPU-only.',
  },
  workgroupUniformLoad: {
    meaning:
      'A uniform workgroup load surrounds a shared-memory read with barriers so the workgroup receives the same value.',
    use: 'Use it to distribute a value written cooperatively in workgroup memory.',
    try: 'Compare a write followed by the collective read with separate workgroups. The latter do not share the location.',
    caution:
      'The argument must be workgroup memory. All invocations must participate in uniform control flow. Storage memory is not accepted; this compiler emits WebGPU only.',
  },
  dpdx: {
    meaning:
      'A screen-space derivative estimates how a value changes between neighbouring fragment invocations along the x axis.',
    use: 'Use it to estimate a pixel footprint, recover a surface gradient, or control filtering.',
    try: 'Compare a constant field with a linear ramp. The result measures change per pixel, not the field value.',
    caution:
      'The model uses an affine field, so coarse and fine estimates agree. Nonlinear fields can differ. Derivatives require fragment-stage uniform control flow; GLSL ES chooses its own granularity.',
  },
  dpdxCoarse: {
    meaning:
      'A screen-space derivative estimates how a value changes between neighbouring fragment invocations along the x axis.',
    use: 'Use it to estimate a pixel footprint, recover a surface gradient, or control filtering.',
    try: 'Compare a constant field with a linear ramp. The result measures change per pixel, not the field value.',
    caution:
      'The model uses an affine field, so coarse and fine estimates agree. Nonlinear fields can differ. Derivatives require fragment-stage uniform control flow; GLSL ES chooses its own granularity.',
  },
  dpdxFine: {
    meaning:
      'A screen-space derivative estimates how a value changes between neighbouring fragment invocations along the x axis.',
    use: 'Use it to estimate a pixel footprint, recover a surface gradient, or control filtering.',
    try: 'Compare a constant field with a linear ramp. The result measures change per pixel, not the field value.',
    caution:
      'The model uses an affine field, so coarse and fine estimates agree. Nonlinear fields can differ. Derivatives require fragment-stage uniform control flow; GLSL ES chooses its own granularity.',
  },
  dpdy: {
    meaning:
      'A screen-space derivative estimates how a value changes between neighbouring fragment invocations along the y axis.',
    use: 'Use it to estimate a pixel footprint, recover a surface gradient, or control filtering.',
    try: 'Compare a constant field with a linear ramp. The result measures change per pixel, not the field value.',
    caution:
      'The model uses an affine field, so coarse and fine estimates agree. Nonlinear fields can differ. Derivatives require fragment-stage uniform control flow; GLSL ES chooses its own granularity.',
  },
  dpdyCoarse: {
    meaning:
      'A screen-space derivative estimates how a value changes between neighbouring fragment invocations along the y axis.',
    use: 'Use it to estimate a pixel footprint, recover a surface gradient, or control filtering.',
    try: 'Compare a constant field with a linear ramp. The result measures change per pixel, not the field value.',
    caution:
      'The model uses an affine field, so coarse and fine estimates agree. Nonlinear fields can differ. Derivatives require fragment-stage uniform control flow; GLSL ES chooses its own granularity.',
  },
  dpdyFine: {
    meaning:
      'A screen-space derivative estimates how a value changes between neighbouring fragment invocations along the y axis.',
    use: 'Use it to estimate a pixel footprint, recover a surface gradient, or control filtering.',
    try: 'Compare a constant field with a linear ramp. The result measures change per pixel, not the field value.',
    caution:
      'The model uses an affine field, so coarse and fine estimates agree. Nonlinear fields can differ. Derivatives require fragment-stage uniform control flow; GLSL ES chooses its own granularity.',
  },
  fwidth: {
    meaning:
      'The screen-space width is the sum of absolute horizontal and vertical derivatives. It estimates how much a value varies across a pixel.',
    use: 'Use it to soften a procedural edge by approximately one pixel.',
    try: 'Compare a flat field, a horizontal ramp, and a diagonal ramp. Both directions contribute positively.',
    caution:
      'The example uses affine fields. It is a pixel footprint estimate, not a gradient length or a CPU derivative. This operation belongs in fragment-stage uniform control flow.',
  },
  fwidthCoarse: {
    meaning:
      'The screen-space width is the sum of absolute horizontal and vertical derivatives. It estimates how much a value varies across a pixel.',
    use: 'Use it to soften a procedural edge by approximately one pixel.',
    try: 'Compare a flat field, a horizontal ramp, and a diagonal ramp. Both directions contribute positively.',
    caution:
      'The example uses affine fields. It is a pixel footprint estimate, not a gradient length or a CPU derivative. This operation belongs in fragment-stage uniform control flow.',
  },
  fwidthFine: {
    meaning:
      'The screen-space width is the sum of absolute horizontal and vertical derivatives. It estimates how much a value varies across a pixel.',
    use: 'Use it to soften a procedural edge by approximately one pixel.',
    try: 'Compare a flat field, a horizontal ramp, and a diagonal ramp. Both directions contribute positively.',
    caution:
      'The example uses affine fields. It is a pixel footprint estimate, not a gradient length or a CPU derivative. This operation belongs in fragment-stage uniform control flow.',
  },
  reflect: {
    meaning: 'Reflection mirrors an incident direction across a surface normal.',
    use: 'Use it to aim an environment-map lookup or trace a reflected ray.',
    try: 'Compare an incoming ray, a grazing ray, and a ray along the normal. The normal component changes sign.',
    caution:
      'Normalize the surface normal. This is a direction calculation; surface roughness and material brightness require separate models.',
  },
  refract: {
    meaning:
      'Refraction changes a ray direction as it crosses a boundary between materials with different refractive indices.',
    use: 'Use it for transmission through water or glass.',
    try: 'Compare equal refractive indices with bending and total internal reflection. The latter returns a zero vector.',
    caution:
      'Normalize the incident direction and normal. The ratio is incident index divided by transmitted index; orient the normal consistently with the incident ray.',
  },
  faceForward: {
    meaning:
      'Face-forward chooses the sign of a normal from the dot product of a reference normal and an incident direction.',
    use: 'Use it to orient a shading normal on a surface visible from either side.',
    try: 'Compare negative, positive, and zero reference dot products. Zero takes the negated-normal branch.',
    caution:
      'The reference normal makes the decision; the returned vector is the supplied normal or its negation. This call does not normalize either vector.',
  },
  cross: {
    meaning:
      'A cross product makes a vector perpendicular to two three-dimensional vectors, using the right-hand rule.',
    use: 'Use it to build a surface normal or measure an oriented parallelogram area.',
    try: 'Swap the input vectors and compare the sign. Parallel inputs give a zero vector.',
    caution:
      'The magnitude depends on both lengths and the angle. Normalize the result only when it is nonzero; use three-component vectors.',
  },
  transpose: {
    meaning: 'Transposing a matrix exchanges its rows and columns.',
    use: 'Use it to change between row and column views of a linear map.',
    try: 'Compare the column-major input with the displayed output. Off-diagonal entries exchange positions.',
    caution:
      'A transpose is not a matrix inverse. This model uses a square matrix; a rectangular transpose also swaps the matrix dimensions.',
  },
  determinant: {
    meaning:
      'A determinant is the signed volume scale of a square linear transformation. A zero determinant means the transformation collapses a dimension.',
    use: 'Use it to detect a singular transform or an orientation reversal.',
    try: 'Compare expansion, reflection, and a collapsed axis. Their determinants have different magnitudes or signs.',
    caution:
      'Only square matrices have a determinant. A value close to zero can make inversion numerically unstable.',
  },
  countOneBits: {
    meaning: 'Counts the set bits in an integer word.',
    use: 'Use it for population counts and compact flag summaries.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution:
      'Zero has no set bits. The operation counts the full word, including the sign bit for signed input.',
  },
  reverseBits: {
    meaning: 'Reverses the order of all bits in an integer word.',
    use: 'Use it for bit-reversed indexing and sampling sequences.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution: 'The full word is reversed, including leading zeros. This is not a byte-order swap.',
  },
  countLeadingZeros: {
    meaning: 'Counts zeros before the highest set bit.',
    use: 'Use it for estimating integer magnitude.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution: 'Zero returns the word width. Signed inputs are treated as bit patterns.',
  },
  countTrailingZeros: {
    meaning: 'Counts zeros after the lowest set bit.',
    use: 'Use it for finding power-of-two alignment.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution: 'Zero returns the word width. Count from the least significant end.',
  },
  firstLeadingBit: {
    meaning: 'Finds the index of the highest significant bit.',
    use: 'Use it for integer logarithm-like indexing.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution:
      'Indices start at the low bit. Unsigned zero returns all ones; signed inputs instead search for the highest bit different from the sign bit.',
  },
  firstTrailingBit: {
    meaning: 'Finds the index of the lowest set bit.',
    use: 'Use it for selecting the first available flag.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution:
      'Indices start at the low bit. Zero returns an all-ones sentinel, not a valid bit index.',
  },
  extractBits: {
    meaning: 'Extracts a contiguous field from an integer word.',
    use: 'Use it for reading compact flags or binary fields.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution:
      'The examples use unsigned input. Signed extraction sign-extends; offset and count are limited by the word width.',
  },
  insertBits: {
    meaning: 'Replaces a contiguous bit field with low bits from another word.',
    use: 'Use it for updating a field without disturbing neighbouring flags.',
    try: 'Compare zero, a sparse word, and a word with several set bits. Read the full binary representation.',
    caution:
      'Only the selected field changes. Bits above the inserted field are discarded; offset and count are limited by the word width.',
  },
  dot4U8Packed: {
    meaning:
      'A packed dot product reads byte-sized lanes from two words and sums their pairwise products.',
    use: 'Use it for compact integer-vector arithmetic, including quantized inference.',
    try: 'Compare the unpacked lanes with the sum of products. Each lane has its own signedness.',
    caution:
      'This example uses unsigned bytes. The compiler requires WebGPU and the packed integer dot-product language feature.',
  },
  dot4I8Packed: {
    meaning:
      'A packed dot product reads byte-sized lanes from two words and sums their pairwise products.',
    use: 'Use it for compact integer-vector arithmetic, including quantized inference.',
    try: 'Compare the unpacked lanes with the sum of products. Each lane has its own signedness.',
    caution:
      'This example uses signed bytes. The compiler requires WebGPU and the packed integer dot-product language feature.',
  },
  pack4x8unorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  pack4x8snorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  pack2x16float: {
    meaning: 'Half-precision packing stores floating-point components as compact binary16 fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Binary16 has less range and precision than f32. The examples avoid halfway rounding cases; do not expect every input to survive a round trip.',
  },
  pack2x16unorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  pack2x16snorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  unpack4x8unorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  unpack4x8snorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  unpack2x16float: {
    meaning: 'Half-precision packing stores floating-point components as compact binary16 fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Binary16 has less range and precision than f32. The examples avoid halfway rounding cases; do not expect every input to survive a round trip.',
  },
  unpack2x16unorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  unpack2x16snorm: {
    meaning: 'Normalized packing maps a bounded floating-point interval onto integer fields.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Packing clamps to the normalized interval and quantizes values. Unpacking approximates the original value; the low field belongs to the first component.',
  },
  pack4xU8: {
    meaning: 'Integer byte packing combines components into one word.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'This variant keeps only the low byte of each component; it does not clamp. These integer byte operations are WebGPU-only in this compiler.',
  },
  pack4xI8: {
    meaning: 'Integer byte packing combines components into one word.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'This variant keeps only the low byte of each component; it does not clamp. These integer byte operations are WebGPU-only in this compiler.',
  },
  pack4xU8Clamp: {
    meaning: 'Integer byte packing combines components into one word.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'This variant clamps each component before storing it. These integer byte operations are WebGPU-only in this compiler.',
  },
  pack4xI8Clamp: {
    meaning: 'Integer byte packing combines components into one word.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'This variant clamps each component before storing it. These integer byte operations are WebGPU-only in this compiler.',
  },
  unpack4xU8: {
    meaning: 'Integer byte packing recovers components from a word.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Components are sign-extended when signed and zero-extended when unsigned. These integer byte operations are WebGPU-only in this compiler.',
  },
  unpack4xI8: {
    meaning: 'Integer byte packing recovers components from a word.',
    use: 'Use it to reduce storage or bandwidth when the reduced precision is acceptable.',
    try: 'Compare the components, hexadecimal word, and recovered values. Notice which component occupies the low field.',
    caution:
      'Components are sign-extended when signed and zero-extended when unsigned. These integer byte operations are WebGPU-only in this compiler.',
  },
  any: {
    meaning: 'Any is true when at least one component of a boolean or a boolean vector is true.',
    use: 'Use it for detecting whether a condition occurs anywhere.',
    try: 'The result is true if any component is true. It is false only when every component is false.',
    caution:
      'A per-component comparison creates a boolean vector; any reduces it to a single boolean.',
  },
  all: {
    meaning: 'All is true when every component of a boolean or a boolean vector is true.',
    use: 'Use it for checking whether every value is valid.',
    try: 'The result is true only when every component is true. One false component makes it false.',
    caution:
      'A per-component comparison creates a boolean vector; all reduces it to a single boolean.',
  },
  zip: {
    meaning: 'Zip combines corresponding elements from two equal-length arrays.',
    use: 'Use it for pairing samples with weights or computing pairwise products.',
    try: 'Each output element multiplies the two input elements at the same index. A zero in either input makes that product zero.',
    caution:
      'Both arrays must have the same fixed length. The combining function decides the output element type.',
  },
  select: {
    meaning:
      'Selection chooses the false or true value from a condition, component by component when the condition is a vector.',
    use: 'Use it for choosing colours or values from a mask.',
    try: 'A false condition selects the first value; a true condition selects the second. With a vector condition, each component can select a different value.',
    caution:
      'The condition is the last argument. Do not rely on selection to guard an invalid memory access or undefined expression.',
  },
  random: {
    meaning:
      'A seeded hash produces a noise-like scalar from its input. Repeated seeds in a mathematical model give repeated outputs.',
    use: 'Use it for visual noise where cross-device equality is unnecessary.',
    try: 'The display shows the fractional part of a sine hash for different seeds. These are illustrative CPU calculations.',
    caution:
      'This compiler uses a sine hash whose GPU result varies by driver. The shown numbers are illustrative CPU calculations, not reproducible GPU random values or cryptographic randomness.',
  },
  quantizeToF16: {
    meaning:
      'Half-precision quantization rounds a value to a binary16-representable value and returns it as f32.',
    use: 'Use it for previewing precision loss before using half-precision storage.',
    try: 'Values between representable binary16 numbers round to the nearest one. A value already representable stays unchanged.',
    caution:
      'Range and precision shrink. Overflow, subnormal handling, and halfway rounding need target-specific care; the examples avoid these cases.',
  },
  bitcast: {
    meaning: 'A bitcast reinterprets the same bits as a different type without numeric conversion.',
    use: 'Use it for inspecting floating-point encoding or decoding packed data.',
    try: "The display shows the same bit pattern as an unsigned integer in base 16. This differs from converting the input's numeric value to an integer.",
    caution:
      'The examples use finite normal floats and zero. NaN and subnormal bit patterns are not portable storage encodings in this compiler.',
  },
  bool: {
    meaning: 'A numeric-to-boolean conversion tests whether a scalar is nonzero.',
    use: 'Use it for turning numeric flags into conditions.',
    try: 'Zero converts to false; negative and positive values convert to true. A fractional value is true whenever it is nonzero.',
    caution:
      'Use scalar input. This is a nonzero test, not rounding or a comparison with a midpoint.',
  },
  f32: {
    meaning: 'A single-precision conversion rounds a number to a representable binary32 value.',
    use: 'Use it for matching the precision used by ordinary shader arithmetic.',
    try: 'Adjacent large integers can round to the same binary32 value. Fractional inputs also round to a representable value.',
    caution:
      'Large adjacent integers may become indistinguishable. Casting does not restore precision already lost.',
  },
  i32: {
    meaning: 'A signed integer conversion removes the fractional part toward zero.',
    use: 'Use it for building integer indices from in-range numeric values.',
    try: 'Positive and negative inputs both lose their fractional part toward zero. Zero stays zero.',
    caution:
      'The examples stay in range. Out-of-range literals are compile errors in this compiler; keep runtime values in range for portable shader code.',
  },
  u32: {
    meaning:
      'An unsigned integer conversion removes the fractional part toward zero for nonnegative in-range values.',
    use: 'Use it for building unsigned counts and indices.',
    try: 'A nonnegative input loses its fractional part. The examples stay within the range of an unsigned integer.',
    caution:
      'The examples stay nonnegative and in range. Out-of-range literals are compile errors; avoid negative or overflowing runtime inputs.',
  },
  f64: {
    meaning:
      'Widening an f32 preserves its value in a representation with more precision for later arithmetic.',
    use: 'Use it for reducing additional rounding during sensitive calculations.',
    try: 'Widening to f64 cannot recover precision lost when the value was first converted to f32. Exactly representable values stay unchanged.',
    caution:
      'Widening cannot recover lost input digits. This compiler emulates f64 in software; it is not a request for native hardware double precision.',
  },
  array: {
    meaning: 'An array groups a fixed number of values of one element type.',
    use: 'Use it for storing a short kernel, lookup table, or set of samples.',
    try: 'The listed elements fill the array in input order. With no arguments, the constructor fills each element with zero.',
    caution:
      "The constructor count must match the fixed length. A zero constructor fills with the element type's zero, not an identity matrix or an arbitrary default.",
  },
  fill: {
    meaning: 'Fill constructs a fixed-size array by repeating one value.',
    use: 'Use it for initializing a short array to a known value.',
    try: 'A scalar fills every element with that scalar. A vector fills every element with that vector.',
    caution:
      'Specify the element type and length. It creates a value, not a storage-buffer allocation or a host-to-GPU upload.',
  },
  uniform: {
    meaning:
      'A uniform declaration describes data supplied by the host and shared by shader invocations during a draw or dispatch.',
    use: 'Use it for passing camera settings, dimensions, and other small parameters.',
    try: 'The shader reads the parameter value supplied by the host. Declaring a uniform does not upload the value.',
    caution:
      'The declaration does not upload data. The host must allocate, bind, and populate a buffer with the reflected layout. Shaders cannot write a uniform binding.',
  },
  storage: {
    meaning:
      'A storage declaration describes a host-bound buffer that shader invocations can index.',
    use: 'Use it for processing large arrays and writing compute results.',
    try: 'A read returns the selected element. A write changes only the selected location and leaves the other elements unchanged.',
    caution:
      'Read-write access must be explicit. The declaration allocates nothing; the host supplies the buffer. Shared writes need ownership, atomics, or suitable synchronization.',
  },
} satisfies Record<string, FunctionLesson>;

export function constructorLesson(name: string): FunctionLesson | undefined {
  const matrix = /^mat([234])(?:x([234]))?f?$/.exec(name);
  if (matrix) {
    const columns = Number(matrix[1]);
    const rows = Number(matrix[2] ?? matrix[1]);
    return {
      meaning: `${name} builds a matrix with ${columns} columns and ${rows} rows. Each column describes the image of one input basis direction.`,
      use: 'Use a matrix to represent a linear transformation. Reading it by columns makes the constructor order visible.',
      try: 'Compare the zero matrix with distinct columns and a diagonal pattern. Read the displayed matrix across rows and the constructor down columns.',
      caution:
        'Components are supplied in column-major order. An argument-free constructor makes a zero matrix. Rectangular matrices do not have a determinant.',
    };
  }
  const vector = /^vec([234])(f64|[fiub])?$/.exec(name);
  if (!vector) return undefined;
  const count = Number(vector[1]);
  return {
    meaning: `${name} groups ${count} components into a vector. A single scalar broadcasts to every component.`,
    use: 'Use vectors to represent coordinates, directions, colours, or several independent values of the same type.',
    try: 'Compare a broadcast with distinct components and a zero value. Each component retains its position.',
    caution:
      'A constructor does not normalize a direction. Integer, boolean, and floating-point vectors have different component types; this compiler emulates f64 vectors in software.',
  };
}
