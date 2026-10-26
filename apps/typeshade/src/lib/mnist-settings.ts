export const mnistTestSamples = 64;

export const mnistEpochs = { min: 1, max: 100, default: 3 } as const;

export function validMnistEpochs(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const epochs = Number(value);
  return Number.isFinite(epochs) &&
    Number.isInteger(epochs) &&
    epochs >= mnistEpochs.min &&
    epochs <= mnistEpochs.max
    ? epochs
    : undefined;
}
