// Browser-only MNIST download; parsing/shape checks share the compiler's IDX oracle.
// Compressed official files are integrity-checked before decompression.
import { MNIST_GZIP_SHA256, parseIdx } from '../../vendor/shader-dsl/journeys/mnist/idx.mjs';

export interface MnistData {
  pixels: Float32Array;
  labels: Uint32Array;
}

const bucket = 'https://storage.googleapis.com/storage/v1/b/cvdf-datasets/o/';
const names = {
  train: ['train-images-idx3-ubyte.gz', 'train-labels-idx1-ubyte.gz'],
  test: ['t10k-images-idx3-ubyte.gz', 't10k-labels-idx1-ubyte.gz'],
} as const;

async function inflate(name: string, signal: AbortSignal): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined' || !crypto.subtle)
    throw new Error('This browser requires secure context and gzip DecompressionStream');
  const url = bucket + encodeURIComponent('mnist/' + name) + '?alt=media';
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('MNIST download failed (' + response.status + '): ' + name);
  const compressed = await response.arrayBuffer();
  const expected = MNIST_GZIP_SHA256[name as keyof typeof MNIST_GZIP_SHA256];
  if (!expected) throw new Error('Unrecognized MNIST file: ' + name);
  const digest = await crypto.subtle.digest('SHA-256', compressed);
  const actual = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== expected) throw new Error('Official MNIST integrity mismatch: ' + name);
  const header = new Uint8Array(compressed);
  if (header[0] !== 0x1f || header[1] !== 0x8b) throw new Error('MNIST data is not gzip: ' + name);
  const data = await new Response(
    new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),
  ).arrayBuffer();
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  return new Uint8Array(data);
}

export async function fetchMnist(
  split: 'train' | 'test',
  limit: number,
  signal: AbortSignal,
): Promise<MnistData> {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('Invalid MNIST sample limit');
  const [imageName, labelName] = names[split];
  const [images, labels] = await Promise.all([
    inflate(imageName, signal),
    inflate(labelName, signal),
  ]);
  return parseIdx(images, labels, limit);
}
