// Illustrative normal-number rounding with a fixed count of binary fraction bits.
// It models round-to-nearest, ties-to-even and omits overflow and subnormal behaviour.
// These constants are example inputs, not reported GPU precision guarantees.
export const precisionExample = {
  bases: [0, 1024, 8192],
  base: 1024,
  increment: 0.25,
  incrementMin: 0.0625,
  incrementMax: 1,
  incrementStep: 0.0625,
  coarseBits: 10,
  fineBits: 23,
} as const;
export function roundFraction(value: number, fractionBits: number): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const magnitude = Math.abs(value);
  const step = 2 ** (Math.floor(Math.log2(magnitude)) - fractionBits);
  const scaled = magnitude / step;
  const low = Math.floor(scaled);
  const remainder = scaled - low;
  const rounded = remainder > 0.5 || (remainder === 0.5 && low % 2 !== 0) ? low + 1 : low;
  return Math.sign(value) * rounded * step;
}
export function precisionCalculation(base: number, increment: number, bits: number) {
  const storedBase = roundFraction(base, bits);
  const sum = roundFraction(storedBase + roundFraction(increment, bits), bits);
  return { sum, recovered: roundFraction(sum - storedBase, bits) };
}
