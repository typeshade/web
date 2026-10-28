export interface FunctionLesson {
  meaning: string;
  use: string;
  try: string;
  caution: string;
}

export const functionLessons = {
  sin: {
    meaning:
      'Sine turns an angle in radians into the vertical coordinate on a unit circle. Its repeating curve describes smooth oscillation.',
    use: 'Use it for waves, repeating motion, and alternating patterns.',
    try: 'Move x across a peak and a zero crossing. Notice how the slope changes.',
    caution: 'The input is an angle in radians. Convert degrees before passing them to sine.',
  },
  cos: {
    meaning:
      'Cosine gives the horizontal coordinate on a unit circle. It follows the same wave shape as sine with a shifted phase.',
    use: 'Pair it with sine to place a point on a circle or to make periodic motion.',
    try: 'Move x around the centre of the plot, where cosine reaches its peak.',
    caution: 'The input is in radians. A phase shift changes where the wave starts.',
  },
  tan: {
    meaning:
      'Tangent is the ratio of sine to cosine. Its magnitude grows rapidly as cosine approaches zero.',
    use: 'Use it when converting an angle into a slope, including projection calculations.',
    try: 'Move x toward either edge and compare the slope with the middle of the curve.',
    caution:
      'Tangent has asymptotes. This plot stays between them and shows only a bounded output range.',
  },
  asin: {
    meaning: 'Inverse sine recovers a principal angle in radians from its sine value.',
    use: 'Use it to recover an elevation angle from a normalized vertical component.',
    try: 'Move x toward the edges. The recovered angle changes more rapidly there.',
    caution:
      'Real inputs must stay within the unit interval centred on zero. The principal result cannot identify a full turn.',
  },
  acos: {
    meaning: 'Inverse cosine recovers a principal angle in radians from its cosine value.',
    use: 'Use it with a clamped dot product to find the angle between unit vectors.',
    try: 'Move x from the left edge to the right edge. The angle decreases.',
    caution: 'Clamp small floating-point overshoots before using a dot product as the input.',
  },
  atan: {
    meaning: 'Inverse tangent converts a slope into a principal angle in radians.',
    use: 'Use it to recover an angle when a slope is available.',
    try: 'Move x farther from the centre. The curve flattens as the angle approaches its limit.',
    caution:
      'A slope alone loses quadrant information. Use atan2 when both coordinates are available.',
  },
  atan2: {
    meaning:
      'The two-argument inverse tangent uses both coordinates to determine an angle in radians and its quadrant.',
    use: 'Use it for polar coordinates, pointer directions, and orientation.',
    try: 'Move x through a full turn and observe the jump when the principal angle wraps.',
    caution:
      'The arguments are the vertical and horizontal coordinates, in that order. This plot recovers the angle from a point on a unit circle.',
  },
  sinh: {
    meaning:
      'Hyperbolic sine is an odd function whose magnitude grows exponentially away from the origin.',
    use: 'Use it in hyperbolic geometry and formulas involving exponential growth.',
    try: 'Compare equally distant inputs on either side of the origin.',
    caution: 'Large input magnitudes grow quickly and can overflow floating-point formats.',
  },
  cosh: {
    meaning:
      'Hyperbolic cosine is an even function with a rounded minimum and exponential growth in both directions.',
    use: 'Use it for catenary curves, such as the ideal shape of a hanging chain.',
    try: 'Compare opposite inputs. Their outputs meet at the same height.',
    caution: 'Its similarity to a parabola near the minimum does not hold for large inputs.',
  },
  tanh: {
    meaning: 'Hyperbolic tangent is a smooth, bounded curve that preserves the sign of its input.',
    use: 'Use it for soft saturation and bounded activation functions.',
    try: 'Move x away from the origin and watch the curve approach its limits.',
    caution:
      'The output approaches its bounds gradually. Large magnitudes can lose useful variation in finite precision.',
  },
  asinh: {
    meaning:
      'Inverse hyperbolic sine grows nearly linearly near the origin and more slowly at larger magnitudes.',
    use: 'Use it to compress a wide signed range without discarding negative values.',
    try: 'Compare the slope near the centre with the slope near the edges.',
    caution: 'This is the inverse of hyperbolic sine, not inverse sine.',
  },
  acosh: {
    meaning: 'Inverse hyperbolic cosine recovers a nonnegative input of hyperbolic cosine.',
    use: 'Use it in hyperbolic distance and catenary calculations.',
    try: 'Move x away from the left edge and observe the decreasing slope.',
    caution:
      'The real domain starts at the minimum value of hyperbolic cosine. Smaller inputs are outside it.',
  },
  atanh: {
    meaning:
      'Inverse hyperbolic tangent expands a bounded signed input into an unbounded signed result.',
    use: 'Use it to invert a hyperbolic-tangent transformation.',
    try: 'Move x toward either edge and observe the growing slope.',
    caution: 'The endpoints of the signed unit interval are excluded from the real domain.',
  },
  exp: {
    meaning:
      'The exponential function raises the natural base to the input power. Equal input steps multiply the output by equal factors.',
    use: 'Use it for continuous growth, decay, and exponential attenuation.',
    try: 'Compare equal steps on the negative and positive sides of the plot.',
    caution:
      'Large positive inputs can overflow. Very negative inputs can lose magnitude through underflow.',
  },
  exp2: {
    meaning: 'This exponential function raises the binary base to the input power.',
    use: 'Use it for binary scale changes, exposure stops, and logarithmic level calculations.',
    try: 'Move x through evenly spaced positions and compare the changing output height.',
    caution:
      'The input is an exponent, not a scale factor. Large magnitudes still face floating-point range limits.',
  },
  log: {
    meaning:
      'The natural logarithm is the inverse of the natural exponential. It turns multiplication into addition.',
    use: 'Use it to recover an exponent or compress a positive dynamic range.',
    try: 'Move x toward the left edge and observe how quickly the output falls.',
    caution:
      'The real-valued domain is positive. Zero and negative inputs need an explicit policy.',
  },
  log2: {
    meaning:
      'The binary logarithm measures how many binary scaling steps produce a positive value.',
    use: 'Use it for exposure differences, scale levels, and logarithmic indexing.',
    try: 'Move x across the plotted range and compare multiplicative changes in the input.',
    caution:
      'Use positive inputs. Clamping an invalid input changes the meaning of the calculation.',
  },
  log10: {
    meaning: 'The decimal logarithm expresses a positive value as a decimal exponent.',
    use: 'Use it for orders of magnitude and decimal logarithmic scales.',
    try: 'Compare the centre and edges of the positive input range.',
    caution: 'Zero and negative values have no finite real logarithm.',
  },
  log1p: {
    meaning:
      'This function computes the natural logarithm after adding the unit value to its input.',
    use: 'Use it for logarithmic transforms that should map the origin to the origin.',
    try: 'Move x across the origin and compare the two sides.',
    caution:
      'The shifted logarithm still has a domain boundary. A shader implementation may evaluate the direct formula with finite-precision rounding.',
  },
  expm1: {
    meaning:
      'This function subtracts the unit value from the natural exponential, so its curve passes through the origin.',
    use: 'Use it in exponential transforms that should have no constant offset.',
    try: 'Compare small inputs around the origin with larger positive inputs.',
    caution:
      'The mathematical formula does not guarantee a cancellation-resistant implementation on every shader target.',
  },
  sqrt: {
    meaning: 'The square root returns the nonnegative value whose square equals the input.',
    use: 'Use it to recover lengths from squared distances.',
    try: 'Move x away from the origin and watch the curve become less steep.',
    caution:
      'Negative inputs have no real square root. Squared distances avoid this function when only comparisons are needed.',
  },
  inverseSqrt: {
    meaning: 'The inverse square root is the reciprocal of the nonnegative square root.',
    use: 'Use it to scale a nonzero vector toward unit length from its squared magnitude.',
    try: 'Move x toward the left edge and observe the rising output.',
    caution:
      'Use strictly positive inputs. A zero-length vector needs a separate normalization policy.',
  },
  cbrt: {
    meaning: 'The cube root returns a signed value whose cube equals the input.',
    use: 'Use it for signed cubic scale conversions and volume-to-length calculations.',
    try: 'Move x through the origin and compare opposite inputs.',
    caution:
      'A fractional power of a negative base is not a portable substitute in shader languages.',
  },
  abs: {
    meaning: 'Absolute value removes the sign and keeps the magnitude.',
    use: 'Use it for distances on a line, symmetric shapes, and error magnitudes.',
    try: 'Move x to equal distances on opposite sides of the origin.',
    caution:
      'Removing a sign also removes direction. Keep the original value when direction matters.',
  },
  sign: {
    meaning: 'The sign function classifies an input as negative, zero, or positive.',
    use: 'Use it to preserve direction while replacing magnitude.',
    try: 'Move x through the origin and observe the jump between output levels.',
    caution:
      'The result is discontinuous. It is not a smooth blend or a replacement for a domain guard.',
  },
  floor: {
    meaning: 'Floor selects the greatest integer that does not exceed the input.',
    use: 'Use it for grid cells, bins, and the whole part of floor-based repetition.',
    try: 'Move x across an integer boundary on the negative side.',
    caution: 'Rounding down differs from removing the fractional part for negative inputs.',
  },
  ceil: {
    meaning: 'Ceiling selects the least integer that is not below the input.',
    use: 'Use it when a partial cell or block still needs a whole allocation.',
    try: 'Move x across an integer boundary and watch the next plateau.',
    caution: 'Rounding up refers to the number line, including for negative inputs.',
  },
  round: {
    meaning: "Rounding selects a nearby integer by the target language's nearest-integer rule.",
    use: 'Use it for quantization to integer-valued levels.',
    try: 'Move x slowly across the midpoint between neighbouring plateaus.',
    caution:
      "Check the target language's tie rule at exact halfway values. Do not assume every language uses the same one.",
  },
  trunc: {
    meaning: 'Truncation removes the fractional part by moving toward the origin.',
    use: 'Use it when a signed integer part should follow truncation semantics.',
    try: 'Compare its negative-side plateaus with the floor function.',
    caution:
      'Truncation and floor agree on positive inputs but differ on negative fractional inputs.',
  },
  fract: {
    meaning:
      'The fractional-part function subtracts floor from its input, producing a repeating ramp.',
    use: 'Use it for tiled coordinates, repeated gradients, and loop phases.',
    try: 'Move x across successive integer boundaries, including negative inputs.',
    caution:
      'The ramp jumps at each boundary. That discontinuity can matter for filtering and derivatives.',
  },
  saturate: {
    meaning: 'Saturation clamps a value to $[0,1]$.',
    use: 'Use it to bound a blend weight, opacity, or normalized signal.',
    try: 'Move x beyond the central ramp and observe the constant outputs.',
    caution: 'Clamping discards how far a value exceeded the bounds.',
  },
  degrees: {
    meaning:
      'This function converts an angle from radians to degrees without changing its direction.',
    use: 'Use it when displaying an angle to a reader or exchanging degree-based data.',
    try: 'Move x across the origin and observe the linear conversion.',
    caution:
      'Trigonometric shader functions generally expect radians, so avoid converting their inputs to degrees.',
  },
  radians: {
    meaning: 'This function converts an angle from degrees to radians.',
    use: 'Use it before passing degree-based angles to trigonometric functions.',
    try: 'Move x across the degree range and read the corresponding radian output.',
    caution: 'A unit conversion changes the numerical scale, not the angle itself.',
  },
  mod: {
    meaning:
      'Floor-based modulo gives the remainder after removing whole floor-based multiples of the divisor.',
    use: 'Use it for repeating coordinates that should wrap consistently across negative inputs.',
    try: 'Change k, the positive divisor, and compare the width of each repeating ramp.',
    caution:
      "Floor-based modulo can differ from a language's remainder operator for negative inputs. A zero divisor is invalid.",
  },
  min: {
    meaning: 'The minimum function chooses the smaller input.',
    use: 'Use it for upper bounds, range intersections, and piecewise functions.',
    try: 'Change k and watch the level where the diagonal becomes a plateau.',
    caution: 'Choosing the smaller value does not smooth the corner where the inputs cross.',
  },
  max: {
    meaning: 'The maximum function chooses the larger input.',
    use: 'Use it for lower bounds and for excluding negative contributions.',
    try: 'Change k and watch the level where the plateau becomes a diagonal.',
    caution:
      'A lower bound changes the input domain. It does not repair every invalid operation that follows.',
  },
  step: {
    meaning: 'The step function switches between binary output levels at an edge.',
    use: 'Use it for hard masks and threshold comparisons.',
    try: 'Change k, the edge, and watch the jump move horizontally.',
    caution:
      'The edge is a hard discontinuity. Use a transition function when a gradual blend is needed.',
  },
  clamp: {
    meaning: 'Clamping keeps an input between a lower and an upper bound.',
    use: 'Use it to constrain a signal or a user-controlled parameter.',
    try: 'Change k to move the symmetric bounds in this example.',
    caution:
      'Keep the lower bound at or below the upper bound. Clamping also discards excess magnitude.',
  },
  mix: {
    meaning: 'Linear interpolation uses a weight to move between two endpoints.',
    use: 'Use it for blending values, colours, and positions.',
    try: 'Change k, the second endpoint, then move x, the interpolation weight.',
    caution:
      'Weights outside $[0,1]$ extrapolate beyond the endpoints unless explicitly constrained.',
  },
  smoothstep: {
    meaning: 'Smoothstep creates a cubic transition with a flat slope at both edges.',
    use: 'Use it for soft masks and eased transitions.',
    try: 'Change k, the upper edge, and watch the width of the transition.',
    caution:
      'Keep the edges ordered and distinct. Shader antialiasing also needs a transition width appropriate to the pixel footprint.',
  },
  fma: {
    meaning:
      'Fused multiply-add combines a multiplication and an addition. Its real-number graph is a line for a fixed multiplier.',
    use: 'Use it to express a product plus an offset, including polynomial evaluation.',
    try: 'Change k, the multiplier, and observe the changing slope.',
    caution:
      'This graph explains the formula. Shader rules can permit separate rounding, so check the target precision contract before relying on fusion.',
  },
  ldexp: {
    meaning: 'This function scales a value by a binary power with an integer exponent.',
    use: 'Use it to adjust a floating-point scale by binary steps.',
    try: "Change the integer-valued k and watch the line's slope change.",
    caution: 'The exponent is an integer. Extreme exponents can overflow or underflow the result.',
  },
  hypot: {
    meaning: 'The hypotenuse function returns the length formed by perpendicular components.',
    use: 'Use it to turn Cartesian components into a distance from the origin.',
    try: 'Change k, the fixed perpendicular component, and observe the minimum length.',
    caution: 'A distance has no sign. Numerical overflow handling depends on the implementation.',
  },
  length: {
    meaning: "Vector length measures a vector's magnitude.",
    use: 'Use it for distances from an origin and speed from velocity components.',
    try: 'This vector has horizontal component x and vertical component k. Change each and compare the length.',
    caution: 'When only comparing distances, squared lengths can avoid taking a square root.',
  },
  distance: {
    meaning: 'Distance measures the length of the difference between two positions.',
    use: 'Use it for proximity tests, radial effects, and distance-based falloff.',
    try: 'Move the horizontal position x and change k, the vertical position of the other point.',
    caution: 'Both positions must use the same coordinate space and units.',
  },
  dot: {
    meaning: 'The dot product multiplies matching vector components and adds the products.',
    use: 'Use it for projections, directional alignment, and squared vector lengths.',
    try: 'This example varies a horizontal component x and a horizontal weight k. Change k to reverse the slope.',
    caution: 'A dot product is a cosine only when the vectors are normalized.',
  },
  normalize: {
    meaning:
      "Normalization preserves a nonzero vector's direction while changing its magnitude to unit length.",
    use: 'Use it before calculations that require directions independent of magnitude.',
    try: 'The graph shows the horizontal component after normalizing a vector with a fixed vertical component.',
    caution:
      'A zero vector has no unique direction. This example keeps the vertical component nonzero.',
  },
  pow: {
    meaning:
      'A power raises a base to an exponent. On $[0,1]$, the exponent controls how a ramp bends.',
    use: 'Use it for easing curves, specular highlights, and power-law transforms.',
    try: 'Compare an exponent below the unit value with one above it in the graph.',
    caution:
      'Real-number mathematics and shader input rules need separate attention. Shader pow does not define negative bases, even for integer-valued exponents.',
  },
} satisfies Record<string, FunctionLesson>;
