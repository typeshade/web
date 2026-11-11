// Force GPU loss during queue submission in a test wrapper around the production worker.
// The application has no test command or device-loss hook.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { preview } from "vite";
import { readdir } from "node:fs/promises";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { SOFTWARE_GPU_FLAGS } from "../scripts/browser.ts";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4184, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: [...SOFTWARE_GPU_FLAGS, "--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4184/studio/");
  const file = (await readdir("dist/assets")).find((f) =>
    f.startsWith("render.worker-"),
  )!;
  const result = await page.evaluate(
    async ({ file, patch }) => {
      const source = `let device,forceLoss=false;const request=GPUAdapter.prototype.requestDevice;GPUAdapter.prototype.requestDevice=async function(...args){device=await request.apply(this,args);return device;};const submit=GPUQueue.prototype.submit;GPUQueue.prototype.submit=function(...args){submit.apply(this,args);if(forceLoss){forceLoss=false;device.destroy();}};await import(${JSON.stringify("http://127.0.0.1:4184/assets/" + file)});const render=self.onmessage;self.onmessage=e=>{if(e.data.forceLoss)forceLoss=true;render(e);};postMessage({ready:true});`;
      const url = URL.createObjectURL(
        new Blob([source], { type: "text/javascript" }),
      );
      const worker = new Worker(url, { type: "module" });
      let id = 0;
      const pending = new Map<number, (data: any) => void>();
      let readyResolve: () => void;
      let readyReject: (e: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        readyResolve = resolve;
        readyReject = reject;
      });
      worker.onmessage = (e) => {
        if (e.data.ready) {
          readyResolve();
          return;
        }
        pending.get(e.data.id)?.(e.data);
      };
      worker.onerror = (e) => readyReject(new Error(e.message));
      await ready;
      const call = (backend: string, extra = {}) =>
        new Promise<any>((resolve, reject) => {
          const requestId = ++id;
          const timer = setTimeout(
            () => reject(new Error("Device loss check timed out.")),
            20000,
          );
          pending.set(requestId, (data) => {
            clearTimeout(timer);
            pending.delete(requestId);
            resolve(data);
          });
          worker.postMessage({ id: requestId, patch, backend, ...extra });
        });
      try {
        const cpu = await call("cpu"),
          first = await call("webgpu"),
          warm = await call("webgpu");
        const lost = await call("webgpu", { forceLoss: true });
        const recovered = await call("webgpu"),
          cpuAgain = await call("cpu");
        return {
          first: first.timing?.deviceReused,
          warm: warm.timing?.deviceReused,
          error: lost.error,
          recovered: recovered.timing?.deviceReused,
          cpuRetained: cpuAgain.timing?.deviceReused,
          frames: recovered.wet?.length,
          identity: {
            vendor: recovered.deviceInfo?.webgpu?.vendor,
            architecture: recovered.deviceInfo?.webgpu?.architecture,
            fallback: recovered.deviceInfo?.webgpu?.fallback,
          },
        };
      } finally {
        worker.terminate();
        URL.revokeObjectURL(url);
      }
    },
    { file, patch: { ...DEFAULT, duration: 0.5 } },
  );
  assert.equal(result.first, false);
  assert.equal(result.warm, true);
  assert.ok(result.error);
  assert.equal(result.recovered, false);
  assert.equal(result.cpuRetained, true);
  assert.equal(result.frames, 40800);
  console.log(JSON.stringify({ pass: true, ...result }));
} finally {
  await browser.close();
  server.httpServer.close();
}
