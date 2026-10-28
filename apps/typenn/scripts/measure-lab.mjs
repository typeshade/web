// Measures the Lab's training path on WebGPU in headless Chromium, using the pre-migration
// library website source and this web app's source. It reports, per dataset, the bytes uploaded
// per steady-state step, the median time of a step after warm-up, and any one-time dataset upload.
//
//   TYPESHADE_CHROMIUM=/path/to/chrome node scripts/measure-lab.mjs \
//     --main /path/to/pre-migration-checkout [--datasets mnist,cifar10] [--steps 50] [--warmup 10] [--out file.json]
//
// `--main` is a pre-migration TypeNN checkout with `dist/` and `website/src/lab/train.ts`. The
// current build and training loop come from this web app. Both runs use synthetic datasets with the
// Lab shapes. The old checkout's dist must match the intended library revision; the harness reports
// each runtime's embedded commit so stale builds are visible. The browser's WebGPU is usually
// SwiftShader, so its timings are not hardware GPU benchmarks.

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { build } from "esbuild";
import { inPage } from "../../../sources/typenn/tests/gpu/_browser.mjs";

const root = resolve(import.meta.dirname, "..");
const webRoot = resolve(root, "../..");
const sourceRoot = join(webRoot, "sources", "typenn");
const { values: flags } = parseArgs({
  options: {
    main: { type: "string" },
    datasets: { type: "string", default: "mnist,cifar10" },
    steps: { type: "string", default: "50" },
    warmup: { type: "string", default: "10" },
    out: { type: "string" },
  },
});
if (!flags.main) throw new Error("Pass --main <checkout of the old build>.");
const mainRoot = resolve(flags.main);
const steps = Number(flags.steps);
const warmup = Number(flags.warmup);

const trees = [
  {
    label: "main",
    dist: join(mainRoot, "dist"),
    lab: join(mainRoot, "website", "src", "lab"),
  },
  {
    label: "web",
    dist: join(root, "src", "vendor", "typenn"),
    lab: join(root, "src", "lab"),
  },
];

async function bundle(label, labRoot) {
  const dir = join(sourceRoot, ".typenn-build", "measure-lab");
  await mkdir(dir, { recursive: true });
  const entry = join(dir, `${label}-entry.ts`);
  await writeFile(
    entry,
    `import * as lab from ${JSON.stringify(join(labRoot, "train.ts"))};\n` +
      `import * as nn from "typenn";\n` +
      `import { bench } from ${JSON.stringify(join(root, "scripts", "measure-lab-page.ts"))};\n` +
      `export const run = (options: any) => bench(lab, nn, options);\n`,
  );
  const outfile = join(dir, `${label}.mjs`);
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    external: ["typenn"],
    logLevel: "silent",
  });
  return `/.typenn-build/measure-lab/${label}.mjs`;
}

// The body runs in the page. It has no closure: it imports the bundle named in its argument.
const body = async (argument) => {
  const module = await import(argument.url);
  return module.run(argument);
};

const results = [];
for (const tree of trees) {
  const url = await bundle(tree.label, tree.lab);
  for (const dataset of flags.datasets.split(",")) {
    const { result, logged } = await inPage(
      body,
      { url, dataset, steps, warmup },
      { dist: tree.dist },
    );
    const errors = logged.filter(
      (line) => line.startsWith("pageerror") || line.startsWith("error"),
    );
    if (errors.length)
      throw new Error(`${tree.label}/${dataset}: ${errors.join("; ")}`);
    results.push({ build: tree.label, ...result });
    console.log(
      `${tree.label} ${dataset}: median ${result.medianMs.toFixed(1)} ms/step, ` +
        `${result.bytesPerStep.toFixed(0)} B/step, one-time ${result.oneTime ? `${result.oneTime.bytes} B in ${(result.oneTime.seconds * 1000).toFixed(0)} ms` : "none (no device dataset probe)"}`,
    );
  }
}
if (flags.out)
  await writeFile(resolve(flags.out), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
