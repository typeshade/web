import type { FunctionLesson } from './function-lessons-en.ts';

export const operationLessons = {
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
    try: 'Compare the resource shape or selected location with the returned count or stored value.',
    caution:
      'Array layer counts and sample counts are separate queries. A cube query returns the size of one face.',
  },
  textureNumLayers: {
    meaning:
      'A texture array contains independently addressable image layers. This query returns their count.',
    use: 'Use it to bound a layer selector or iterate over an image array.',
    try: 'Compare the resource shape or selected location with the returned count or stored value.',
    caution:
      'The texture must be an array texture. The highest valid layer index is one less than the count.',
  },
  textureNumSamples: {
    meaning:
      'Multisampling stores several coverage samples in each texel. This query returns that sample count.',
    use: 'Use it when resolving a multisampled image by reading its individual samples.',
    try: 'Compare the resource shape or selected location with the returned count or stored value.',
    caution:
      'This query requires a multisampled texture. Sample indices start at zero. The compiler has no GLSL ES multisample form.',
  },
  arrayLength: {
    meaning:
      'A runtime-sized storage array gets its usable element count from the bound buffer range.',
    use: 'Use the count for bounds checks in compute kernels.',
    try: 'Compare the resource shape or selected location with the returned count or stored value.',
    caution:
      'Query the storage array itself or a trailing array field. Buffer padding and element stride affect the count; a byte count is not an element count.',
  },
  textureStore: {
    meaning: 'A texture store replaces the value of one integer-addressed texel.',
    use: 'Use it to write a compute result into an image.',
    try: 'Compare the resource shape or selected location with the returned count or stored value.',
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
    meaning: 'Any is true when at least one tested component or element passes.',
    use: 'Use it for detecting whether a condition occurs anywhere.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'A per-component comparison creates a boolean vector; any reduces it to a single boolean.',
  },
  all: {
    meaning: 'All is true when every tested component or element passes.',
    use: 'Use it for checking whether every value is valid.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'A per-component comparison creates a boolean vector; all reduces it to a single boolean.',
  },
  none: {
    meaning: 'None is true when no array element passes the test.',
    use: 'Use it for rejecting a set containing any invalid value.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'This operation takes a fixed-size array and predicate. It is the negation of any, not of all.',
  },
  sum: {
    meaning: 'A sum reduces an array of numbers or vectors by addition.',
    use: 'Use it for accumulating weights or contributions.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'Floating-point addition depends on rounding and evaluation order. The example uses small exact values.',
  },
  zip: {
    meaning: 'Zip combines corresponding elements from two equal-length arrays.',
    use: 'Use it for pairing samples with weights or computing pairwise products.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'Both arrays must have the same fixed length. The combining function decides the output element type.',
  },
  select: {
    meaning:
      'Selection chooses the false or true value from a condition, component by component when the condition is a vector.',
    use: 'Use it for choosing colours or values from a mask.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'The condition is the last argument. Do not rely on selection to guard an invalid memory access or undefined expression.',
  },
  random: {
    meaning:
      'A seeded hash produces a noise-like scalar from its input. Repeated seeds in a mathematical model give repeated outputs.',
    use: 'Use it for visual noise where cross-device equality is unnecessary.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'This compiler uses a sine hash whose GPU result varies by driver. The shown numbers are illustrative CPU calculations, not reproducible GPU random values or cryptographic randomness.',
  },
  quantizeToF16: {
    meaning:
      'Half-precision quantization rounds a value to a binary16-representable value and returns it as f32.',
    use: 'Use it for previewing precision loss before using half-precision storage.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'Range and precision shrink. Overflow, subnormal handling, and halfway rounding need target-specific care; the examples avoid these cases.',
  },
  bitcast: {
    meaning: 'A bitcast reinterprets the same bits as a different type without numeric conversion.',
    use: 'Use it for inspecting floating-point encoding or decoding packed data.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'The examples use finite normal floats and zero. NaN and subnormal bit patterns are not portable storage encodings in this compiler.',
  },
  bool: {
    meaning: 'A numeric-to-boolean conversion tests whether a scalar is nonzero.',
    use: 'Use it for turning numeric flags into conditions.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'Use scalar input. This is a nonzero test, not rounding or a comparison with a midpoint.',
  },
  f32: {
    meaning: 'A single-precision conversion rounds a number to a representable binary32 value.',
    use: 'Use it for matching the precision used by ordinary shader arithmetic.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'Large adjacent integers may become indistinguishable. Casting does not restore precision already lost.',
  },
  i32: {
    meaning: 'A signed integer conversion removes the fractional part toward zero.',
    use: 'Use it for building integer indices from in-range numeric values.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'The examples stay in range. Out-of-range literals are compile errors in this compiler; keep runtime values in range for portable shader code.',
  },
  u32: {
    meaning:
      'An unsigned integer conversion removes the fractional part toward zero for nonnegative in-range values.',
    use: 'Use it for building unsigned counts and indices.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'The examples stay nonnegative and in range. Out-of-range literals are compile errors; avoid negative or overflowing runtime inputs.',
  },
  f64: {
    meaning:
      'Widening an f32 preserves its value in a representation with more precision for later arithmetic.',
    use: 'Use it for reducing additional rounding during sensitive calculations.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'Widening cannot recover lost input digits. This compiler emulates f64 in software; it is not a request for native hardware double precision.',
  },
  array: {
    meaning: 'An array groups a fixed number of values of one element type.',
    use: 'Use it for storing a short kernel, lookup table, or set of samples.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      "The constructor count must match the fixed length. A zero constructor fills with the element type's zero, not an identity matrix or an arbitrary default.",
  },
  fill: {
    meaning: 'Fill constructs a fixed-size array by repeating one value.',
    use: 'Use it for initializing a short array to a known value.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'Specify the element type and length. It creates a value, not a storage-buffer allocation or a host-to-GPU upload.',
  },
  uniform: {
    meaning:
      'A uniform declaration describes data supplied by the host and shared by shader invocations during a draw or dispatch.',
    use: 'Use it for passing camera settings, dimensions, and other small parameters.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
    caution:
      'The declaration does not upload data. The host must allocate, bind, and populate a buffer with the reflected layout. Shaders cannot write a uniform binding.',
  },
  storage: {
    meaning:
      'A storage declaration describes a host-bound buffer that shader invocations can index.',
    use: 'Use it for processing large arrays and writing compute results.',
    try: 'Compare the input and result in each case. Look for the boundary where behaviour changes.',
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
