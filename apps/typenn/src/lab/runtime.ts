import type { Module } from "../vendor/typenn/index.js";

export async function hostParameters(model: Module): Promise<Float32Array[]> {
  return Promise.all(
    model
      .parameters()
      .map(async (p) => Float32Array.from(await p.parameterValues())),
  );
}

export async function readGradients(optimizer: object): Promise<boolean> {
  const read = (optimizer as { gradients?: () => Promise<unknown> }).gradients;
  if (typeof read !== "function") return false;
  await read.call(optimizer);
  return true;
}

export async function parameterChecksum(
  parameters: readonly { data(): Promise<Float32Array> }[],
): Promise<string> {
  let hash = 0x811c9dc5;
  for (const parameter of parameters) {
    const bits = new Uint32Array((await parameter.data()).slice().buffer);
    for (const word of bits) {
      hash = Math.imul(hash ^ word, 0x01000193) >>> 0;
    }
  }
  return hash.toString(16).padStart(8, "0");
}
