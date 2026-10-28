import type { RunConfig } from "./train";

export const DEFAULTS: Record<
  string,
  Omit<RunConfig, "dataset" | "tier" | "seed">
> = {
  mnist: {
    model: "mlp",
    hidden: 128,
    optimizer: "adam",
    learningRate: 0.001,
    batchSize: 64,
    epochs: 1,
  },
  fashion_mnist: {
    model: "mlp",
    hidden: 128,
    optimizer: "adam",
    learningRate: 0.001,
    batchSize: 64,
    epochs: 1,
  },
  cifar10: {
    model: "cnn",
    hidden: 128,
    optimizer: "adam",
    learningRate: 0.001,
    batchSize: 64,
    epochs: 1,
  },
  cifar100: {
    model: "cnn",
    hidden: 128,
    optimizer: "adam",
    learningRate: 0.001,
    batchSize: 64,
    epochs: 1,
  },
  imdb: {
    model: "bag",
    hidden: 64,
    optimizer: "adam",
    learningRate: 0.001,
    batchSize: 128,
    epochs: 2,
  },
  reuters: {
    model: "bag",
    hidden: 64,
    optimizer: "adam",
    learningRate: 0.001,
    batchSize: 128,
    epochs: 2,
  },
  california_housing: {
    model: "regression",
    hidden: 64,
    optimizer: "adam",
    learningRate: 0.003,
    batchSize: 64,
    epochs: 20,
  },
};

const SEED = 1;

export function defaultConfig(dataset: string): RunConfig {
  const base = DEFAULTS[dataset] ?? DEFAULTS.mnist!;
  return { dataset, ...base, tier: "auto", seed: SEED };
}
