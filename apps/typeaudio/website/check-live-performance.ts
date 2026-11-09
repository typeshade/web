// Manual CPU compute benchmark of the production worklet in a dedicated worker.
// This does not measure device latency or prove AudioWorklet scheduling deadlines.
import { chromium } from "playwright-core";
import { preview } from "vite";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { RECIPES } from "./sound-recipes.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { createNode } from "./graph/createNode.ts";
import { initialGraph } from "./graph/recipes.ts";
import { compileGraph } from "typeaudio/graph/compiler";
const fullGraph = initialGraph();

let from = "filter";

while (fullGraph.nodes.length < 15) {
  const n = createNode("gain", `gain-${fullGraph.nodes.length}`);
  n.values[0] = 1;
  n.inputs.input = from;
  from = n.id;
  fullGraph.nodes.push(n);
}

const shaper = createNode("code", "shaper");

shaper.code = "out = tanh(input * (1 + p3));";

shaper.inputs.input = from;

fullGraph.nodes.push(shaper);

fullGraph.nodes.find((n) => n.kind === "output")!.inputs.input = shaper.id;

const graphPatch = { ...DEFAULT, graph: fullGraph, duration: 4 };

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4183, strictPort: true },
});

const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4183/");
  const asset = (await readdir("dist/assets")).find((f) =>
    f.startsWith("live.worklet-"),
  )!;
  const rows = [];
  const scenarios =
    process.env.GRAPH_BENCH === "1"
      ? [
          {
            name: "graph-impact",
            patch: { ...DEFAULT, graph: initialGraph(), duration: 4 },
          },
          {
            name: "graph-tone",
            patch: { ...DEFAULT, graph: initialGraph("tone"), duration: 4 },
          },
          { name: "graph-16-nodes-2-code", patch: graphPatch },
          {
            name: "graph-four-layer-stress",
            patch: {
              ...graphPatch,
              layers: [0, 1, 2].map((i) => ({
                id: `graph-${i}`,
                name: `Graph ${i}`,
                offset: 0,
                muted: false,
                patch: { ...graphPatch, layers: [] },
              })),
            },
          },
        ]
      : [
          ...[1, 2, 8].map((voices) => ({
            name: `unison-${voices}`,
            patch: {
              ...DEFAULT,
              voices,
              delay: true,
              reverb: true,
              lfoDepth: 0.8,
            },
          })),
          ...Object.entries(RECIPES).map(([name, r]) => ({
            name,
            patch: r.patch,
          })),
          {
            name: "four-layer-stress",
            patch: {
              ...RECIPES.door.patch,
              voices: 8,
              layers: [
                ...RECIPES.door.patch.layers.map((l) => ({
                  ...l,
                  patch: { ...l.patch, voices: 8 },
                })),
                {
                  id: "extra",
                  name: "Extra",
                  offset: 0,
                  muted: false,
                  patch: {
                    ...DEFAULT,
                    voices: 8,
                    fmIndex: 4,
                    lfoDepth: 1,
                    delay: true,
                    reverb: true,
                  },
                },
              ],
            },
          },
        ];
  for (const scenario of scenarios)
    for (let trial = 0; trial < Number(process.env.TRIALS || 3); trial++) {
      const row = await page.evaluate(
        async ({ asset, patch, programs }) => {
          const code = `
globalThis.sampleRate = 48000;
globalThis.AudioWorkletProcessor = class { port = { postMessage() {} }; };
let Processor;
globalThis.registerProcessor = (name, ctor) => Processor = ctor;
await import(${JSON.stringify(location.origin + "/assets/" + asset)});
for (const program of ${JSON.stringify(programs)}) {
  const moduleUrl = URL.createObjectURL(new Blob([program.code], { type: 'text/javascript' }));
  try { await import(moduleUrl); } finally { URL.revokeObjectURL(moduleUrl); }
}
const dsp = new Processor({ processorOptions: { patch: ${JSON.stringify(patch)}, repeat: true } });
const inputs = [], output = [[new Float32Array(128)]], costs = new Float64Array(6000);
for (let i = 0; i < 500; i++) dsp.process(inputs, output);
const start = performance.now();
for (let i = 0; i < costs.length; i++) {
  const t = performance.now();
  dsp.process(inputs, output);
  costs[i] = performance.now() - t;
}
const elapsed = performance.now() - start;
costs.sort();
postMessage({ elapsed, p50: costs[3000], p95: costs[5700], p99: costs[5940],
  max: costs.at(-1), overBudget: costs.filter(x => x > 128 / 48000 * 1000).length,
  frames: 6000 * 128 });`;
          const url = URL.createObjectURL(
            new Blob([code], { type: "text/javascript" }),
          );
          const worker = new Worker(url, { type: "module" });
          try {
            return await new Promise((resolve, reject) => {
              const timer = setTimeout(
                () => reject(new Error("Live compute benchmark timed out.")),
                30000,
              );
              worker.onmessage = (e) => {
                clearTimeout(timer);
                resolve(e.data);
              };
              worker.onerror = (e) => {
                clearTimeout(timer);
                reject(new Error(e.message));
              };
            });
          } finally {
            worker.terminate();
            URL.revokeObjectURL(url);
          }
        },
        {
          asset,
          patch: scenario.patch,
          programs: scenario.patch.graph
            ? [compileGraph(scenario.patch.graph)]
            : [],
        },
      );
      rows.push({
        scenario: scenario.name,
        voices: scenario.patch.voices,
        layers: scenario.patch.layers.length + 1,
        trial,
        ...(row as any),
      });
      console.log(JSON.stringify(rows.at(-1)));
    }
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    process.env.BENCH_OUT ||
      (process.env.GRAPH_BENCH === "1"
        ? "artifacts/graph-performance.json"
        : "artifacts/live-performance.json"),
    JSON.stringify(
      {
        environment:
          "Chromium dedicated-worker execution of the actual compiled worklet; not physical output latency",
        browser: browser.version(),
        asset,
        sampleRate: 48000,
        quantum: 128,
        warmupBlocks: 500,
        blocksPerTrial: 6000,
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
