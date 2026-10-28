export const homeQuickStart = `import * as nn from "typenn";

const device = await nn.device();
const input = device.tensor([1, 2, 3, 4], { shape: [2, 2] });
const weight = device.tensor([5, 6, 7, 8], { shape: [2, 2] });
const output = input.matmul(weight).relu();

console.log(await output.data());
// Float32Array [19, 22, 43, 50]
await output.disposeGraph();
await device.dispose();`;

export const firstOperation = `import * as nn from "typenn";

const device = await nn.device({ device: "auto" });
const a = device.tensor([1, 2, 3, 4], { shape: [2, 2] });
const b = device.tensor([5, 6, 7, 8], { shape: [2, 2] });
const y = a.matmul(b).relu();

const values = await y.data();
console.log(values);
await y.disposeGraph();
await device.dispose();`;

export function executionExample(comment: string): string {
  return `const input = device.tensor(values, { shape: [batch, features] });
const logits = input.matmul(weights).add(bias);
const output = logits.relu();

// ${comment}
const result = await output.data();`;
}

export const trainingLoop = `const model = new SimpleMLP().to(device);
const parameters = model.parameters();
const criterion = new nn.CrossEntropyLoss();
const optimizer = nn.optim.Adam(parameters, { lr: 0.001 });

model.train();
let totalLoss = 0;
let totalSamples = 0;
for await (const batch of new DataLoader(trainData, 64, true)) {
  await optimizer.zeroGrad();
  const images = device.tensor(batch.images, {
    shape: [batch.size, 1, 28, 28],
  });
  const logits = model.forward(images);
  const loss = criterion.forward(logits, batch.labels);
  const batchLoss = (await loss.data())[0];
  if (batchLoss === undefined) throw new Error("CrossEntropyLoss returned no value.");
  await loss.backward();
  await optimizer.step();
  totalLoss += batchLoss * batch.size;
  totalSamples += batch.size;
  await loss.disposeGraph(parameters);
}`;

export const mnistModel = `export class SimpleMLP extends nn.Module {
  private readonly flatten: nn.Flatten;
  private readonly fc1: nn.Linear;
  private readonly relu: nn.ReLU;
  private readonly dropout: nn.Dropout;
  private readonly fc2: nn.Linear;

  constructor() {
    super();
    this.flatten = this.register("flatten", new nn.Flatten());
    this.fc1 = this.register("fc1", new nn.Linear(784, 128));
    this.relu = this.register("relu", new nn.ReLU());
    this.dropout = this.register("dropout", new nn.Dropout(0.2));
    this.fc2 = this.register("fc2", new nn.Linear(128, 10));
  }

  forward(input: nn.Tensor): nn.Tensor {
    return this.fc2.forward(this.dropout.forward(
      this.relu.forward(this.fc1.forward(this.flatten.forward(input))),
    ));
  }
}`;

export const apiLifecycle = `const device = await nn.device({ device: "auto" });
const x = device.tensor([1, 2, 3, 4], { shape: [2, 2] });
const y = x.relu().softmax();
const values = await y.data();

await y.disposeGraph();
await device.dispose();`;
