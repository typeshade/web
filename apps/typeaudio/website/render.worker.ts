import { createDevice, type Device } from "typeshade/runtime";
import { explain } from "../src/explain.ts";
import { renderPatch } from "./designer-render.ts";
import { finishPcm, validatePatch, type RenderRequest } from "./designer.ts";

type Backend = RenderRequest["backend"];
const devices = new Map<Backend, Device>();
let activeDevice: Device | undefined;
async function deviceFor(
  backend: Backend,
): Promise<{ device: Device; reused: boolean }> {
  const existing = devices.get(backend);
  if (existing) return { device: existing, reused: true };
  const device = await createDevice({
    prefer: [backend],
    poolBytes: 16 * 1024 * 1024,
  });
  if (device.tier !== backend) {
    await device.dispose();
    throw new Error(
      `Requested ${backend}, but selected ${device.tier}. Select CPU explicitly to use it.`,
    );
  }
  devices.set(backend, device);
  void device.lost.then(() => {
    if (devices.get(backend) === device) {
      devices.delete(backend);
      // A running render releases its residents before disposing the owner.
      if (activeDevice !== device) void device.dispose().catch(() => {});
    }
  });
  return { device, reused: false };
}
async function render(data: RenderRequest): Promise<void> {
  const started = performance.now();
  try {
    const patch = validatePatch(data.patch);
    if (!["cpu", "webgpu"].includes(data.backend))
      throw new Error("Select CPU or WebGPU.");
    const setupStarted = performance.now();
    const { device: dev, reused } = await deviceFor(data.backend);
    const deviceSetupMs = performance.now() - setupStarted;
    activeDevice = dev;
    try {
      const result = await renderPatch(dev, patch);
      const postStarted = performance.now();
      const { dry, wet } = finishPcm(result.samples, patch);
      if (!wet.every(Number.isFinite) || !dry.every(Number.isFinite))
        throw new Error("Non-finite audio output. Reset the patch and retry.");
      const peak = wet.reduce((m, value) => Math.max(m, Math.abs(value)), 0);
      const postprocessMs = performance.now() - postStarted;
      const effects = [
        patch.delay ? "feedback delay" : "",
        patch.reverb ? "Schroeder reverb" : "",
      ].filter(Boolean);
      const timing = {
        ...result.stats,
        deviceSetupMs,
        deviceReused: reused,
        postprocessMs,
      };
      const report =
        explain(result.reports) +
        "\n\n" +
        `${result.stats.batchFrames.toLocaleString("en-US")} frames per batch; ${result.stats.pcmReadbacks} final PCM readback.\n` +
        `Device setup: ${deviceSetupMs.toFixed(2)} ms (${reused ? "reused" : "created"}).\n` +
        `Kernel plans and scheduling: ${result.stats.planMs.toFixed(2)} ms.\n` +
        `Output wait and PCM readback: ${result.stats.readbackMs.toFixed(2)} ms.\n` +
        `CPU post-processing and validation: ${postprocessMs.toFixed(2)} ms.\n` +
        (effects.length
          ? `CPU post-processing: ${effects.join(" → ")}. Effect tails are bounded and faded.`
          : "Delay and reverb bypassed.") +
        "\nOutput gain and WAV export run on the CPU.";
      self.postMessage(
        {
          id: data.id,
          dry,
          wet,
          tier: dev.tier,
          peak,
          milliseconds: performance.now() - started,
          report,
          timing,
          deviceInfo: dev.info,
        },
        { transfer: [dry.buffer, wet.buffer] },
      );
    } catch (error) {
      if (devices.get(data.backend) === dev) devices.delete(data.backend);
      throw error;
    } finally {
      activeDevice = undefined;
      if (devices.get(data.backend) !== dev) await dev.dispose().catch(() => {});
    }
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
// A retained worker serves requests in order. Cancellation terminates the worker;
// it never leaves an obsolete request competing with the next render.
let queue = Promise.resolve();
self.onmessage = ({ data }: MessageEvent<RenderRequest>) => {
  queue = queue.then(() => render(data));
};
