/** A Hann-windowed FFT of a stable section, returned in dBFS. */
export function spectrum(samples: Float32Array): Float32Array {
  const n = 2048,
    real = new Float64Array(n),
    imag = new Float64Array(n);
  const start = Math.min(
    Math.floor(samples.length / 5),
    Math.max(0, samples.length - n),
  );
  for (let i = 0; i < n; i++)
    real[i] =
      (samples[start + i] ?? 0) *
      (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j]!, real[i]!];
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    for (let at = 0; at < n; at += size)
      for (let j = 0; j < size / 2; j++) {
        const a = at + j,
          b = a + size / 2,
          c = Math.cos(angle * j),
          s = Math.sin(angle * j);
        const re = real[b]! * c - imag[b]! * s,
          im = real[b]! * s + imag[b]! * c;
        real[b] = real[a]! - re;
        imag[b] = imag[a]! - im;
        real[a]! += re;
        imag[a]! += im;
      }
  }
  return Float32Array.from(
    real.slice(0, n / 2),
    (x, i) =>
      20 * Math.log10(Math.max(1e-6, (Math.hypot(x, imag[i]!) * 4) / n)),
  );
}
