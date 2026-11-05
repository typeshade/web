// Manual finite-render benchmark; software GPU mode is opt-in and identified in the record.
import { chromium } from "playwright-core";
import { preview } from "vite";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { DEFAULT } from "./designer.ts";
import { SOFTWARE_GPU_FLAGS } from "../scripts/browser.ts";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4183, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: [
    ...(process.env.TYPEAUDIO_BENCH_SOFTWARE_GPU === "1"
      ? SOFTWARE_GPU_FLAGS
      : ["--enable-unsafe-webgpu"]),
    "--no-sandbox",
  ],
});
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4183/");
  const workerFile = (await readdir("dist/assets")).find((f) =>
    f.startsWith("render.worker-"),
  )!;
  const adapter = await page.evaluate(async () => {
    const a = await (navigator as any).gpu?.requestAdapter();
    if (!a)
      throw new Error(
        "No WebGPU adapter. Use a GPU-equipped browser or explicitly enable the software benchmark.",
      );
    const i = a.info;
    return {
      vendor: i?.vendor,
      architecture: i?.architecture,
      device: i?.device,
      description: i?.description,
      isFallbackAdapter: i?.isFallbackAdapter ?? a.isFallbackAdapter,
    };
  });
  console.log(JSON.stringify({ adapter }));
  const rows = [];
  for (const [voices, duration] of [
    [1, 0.5],
    [8, 4],
  ])
    for (const backend of ["cpu", "webgpu"])
      for (let trial = 0; trial < Number(process.env.TRIALS || 3); trial++) {
        const result = await page.evaluate(
          async ({ file, patch, backend }) => {
            const worker = new Worker("/assets/" + file, { type: "module" });
            const rows = [];
            try {
              for (let pass = 0; pass < 2; pass++) {
                const start = performance.now();
                const data: any = await new Promise((resolve, reject) => {
                  const timer = setTimeout(
                    () => reject(new Error("Render benchmark timed out.")),
                    90000,
                  );
                  worker.onmessage = (e) => {
                    clearTimeout(timer);
                    e.data.error
                      ? reject(new Error(e.data.error))
                      : resolve(e.data);
                  };
                  worker.onerror = (e) => {
                    clearTimeout(timer);
                    reject(new Error(e.message));
                  };
                  worker.postMessage({ id: pass + 1, patch, backend });
                });
                rows.push({
                  wallMs: performance.now() - start,
                  workerMs: data.milliseconds,
                  frames: data.wet.length,
                  peak: data.peak,
                  timing: data.timing,
                  deviceInfo: data.deviceInfo,
                });
              }
            } finally {
              worker.terminate();
            }
            return rows;
          },
          {
            file: workerFile,
            patch: { ...DEFAULT, voices, duration },
            backend,
          },
        );
        rows.push({ voices, duration, backend, trial, runs: result });
        console.log(JSON.stringify(rows.at(-1)));
      }
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    process.env.BENCH_OUT || "artifacts/render-performance.json",
    JSON.stringify(
      {
        environment:
          process.env.TYPEAUDIO_BENCH_SOFTWARE_GPU === "1"
            ? "Chromium SwiftShader software adapter; not hardware GPU"
            : "Browser WebGPU adapter; inspect adapter metadata",
        adapterProbe: adapter,
        browser: browser.version(),
        asset: workerFile,
        rows,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
