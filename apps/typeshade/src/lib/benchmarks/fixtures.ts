import { outputLength } from './contract.ts';
import type { Experiment } from './definitions.ts';

/** Integer and dyadic-float fixtures permit bit-exact checks without tolerance tuning. */
export function fixture(e: Experiment, n: number): { input: Uint32Array; expected: Uint32Array } {
  const input = new Uint32Array(n * e.fields);
  const expected = new Uint32Array(outputLength(e, n));
  if (e.kind === 'layout') {
    const floats = new Float32Array(input.buffer);
    const output = new Float32Array(expected.buffer);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let f = 0; f < e.fields; f++) {
        const value = (i % 64) / 8 + f;
        floats[e.variant === 'aos' ? i * e.fields + f : f * n + i] = value;
        if (f < e.reads) sum = Math.fround(sum + value);
      }
      output[i] = sum;
    }
  } else {
    for (let i = 0; i < n; i++) input[i] = (i & 255) + 1;
    if (e.kind === 'reduce') {
      for (let i = 0; i < n; i++) expected[Math.floor(i / 64)]! += input[i]!;
    } else if (e.kind === 'atomic') {
      for (let i = 0; i < n; i++) expected[i % e.factor]! += input[i]!;
    } else
      for (let i = 0; i < n; i++) {
        let x = input[e.kind === 'copy' ? (i * e.factor) % n : i]!;
        if (e.kind === 'arithmetic')
          for (let k = 0; k < e.factor; k++) x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        expected[i] = x;
      }
  }
  return { input, expected };
}
export function matches(actual: Uint32Array, expected: Uint32Array): boolean {
  return actual.length === expected.length && actual.every((value, i) => value === expected[i]);
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)]!;
}
