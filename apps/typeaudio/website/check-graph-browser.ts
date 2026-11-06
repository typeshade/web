import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, type Page, type Locator } from "playwright-core";
import { preview } from "vite";
import { readCode, writeCode } from "./check-code-input.ts";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4190, strictPort: true },
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4190";
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
async function doc(p: Page) {
  return p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!),
  );
}
async function graph(p: Page) {
  return (await doc(p)).source.patch.graph;
}
async function download(p: Page, id: string) {
  const event = p.waitForEvent("download");
  await p.locator("#" + id).click();
  return readFile((await (await event).path())!);
}
async function undo(p: Page) {
  await p.locator("#editor-main").focus();
  await p.keyboard.press("Control+z");
}
async function drag(p: Page, node: Locator, cancel = false) {
  const b = await node.boundingBox();
  assert.ok(b);
  await p.mouse.move(b.x + b.width / 2, b.y + 12);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2 + 60, b.y + 75, { steps: 8 });
  if (cancel) await p.keyboard.press("Escape");
  await p.mouse.up();
}
async function render(p: Page) {
  await p.locator("#render").click();
  await p.waitForFunction(
    () => !(document.querySelector("#download") as HTMLButtonElement).disabled,
    undefined,
    { timeout: 90000 },
  );
  return download(p, "download");
}
async function sceneReady(p: Page) {
  await p.waitForFunction(
    () => !(document.querySelector("#play") as HTMLButtonElement)?.disabled,
    undefined,
    { timeout: 90000 },
  );
}
async function liveFrames(p: Page, after: number) {
  await p.waitForFunction(
    (after) =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement)?.dataset
          .frames,
      ) > after,
    after,
  );
}
const errors: string[] = [];
try {
  const p = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    const w = window as any,
      NativeWorker = window.Worker,
      NativeNode = window.AudioWorkletNode;
    w.compiles = 0;
    w.compilerWorkers = 0;
    w.nodes = 0;
    w.captured = [];
    w.compileDelay = 0;
    window.Worker = class extends NativeWorker {
      compiler: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.compiler = String(url).includes("compiler.worker-");
        if (this.compiler) w.compilerWorkers++;
      }
      postMessage(message: any, options?: any) {
        if (this.compiler) w.compiles++;
        const delay = this.compiler ? w.compileDelay : 0;
        w.compileDelay = 0;
        if (delay) setTimeout(() => super.postMessage(message, options), delay);
        else super.postMessage(message, options);
      }
    };
    window.AudioWorkletNode = class extends NativeNode {
      constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
        super(...args);
        w.nodes++;
        this.port.addEventListener("message", (e) => {
          if (e.data.type === "recorded")
            w.captured.push({
              frames: e.data.frames,
              samples: Array.from(e.data.samples.subarray(0, e.data.frames)),
            });
        });
      }
    };
  });
  await p.goto(base);
  assert.equal(
    await p.evaluate(() => (window as any).compilerWorkers),
    0,
    "Legacy sound does not load the graph compiler",
  );
  await p
    .getByRole("button", { name: "+ New procedural sound", exact: true })
    .click();
  await p.locator('[data-graph-node="impact"]').waitFor({ timeout: 30000 });
  assert.equal(await p.locator("[data-graph-node]").count(), 4);
  assert.equal(await p.evaluate(() => (window as any).compilerWorkers), 1);
  const initial = await graph(p),
    compileCount = await p.evaluate(() => (window as any).compiles);
  await drag(p, p.locator('[data-graph-node="noise"]'));
  assert.notEqual((await graph(p)).nodes[0].x, initial.nodes[0].x);
  await undo(p);
  assert.deepEqual(
    await graph(p),
    initial,
    "One undo reverts the entire node drag",
  );
  await drag(p, p.locator('[data-graph-node="noise"]'), true);
  assert.deepEqual(await graph(p), initial, "Escape cancels a node drag");
  await p
    .getByRole("spinbutton", { name: "Pitch value", exact: true })
    .fill("440");
  await p.locator("#editor-main").focus();
  assert.equal((await graph(p)).parameters[0].value, 440);
  assert.equal(
    await p.evaluate(() => (window as any).compiles),
    compileCount,
    "Layout and parameters reuse the compiled kernel",
  );
  await p.locator('[data-graph-node="impact"]').focus();
  const originalCode = await readCode(p);
  await writeCode(p, "out = input * p2;");
  await p.locator('[data-graph-node="noise"]').focus();
  await p.locator('[data-graph-node="impact"]').focus();
  assert.equal(
    await readCode(p),
    "out = input * p2;",
    "Selection keeps the unapplied draft",
  );
  await writeCode(p, originalCode);
  await p.locator("#live-start").click();
  await liveFrames(p, 9600);
  await p.locator("#record-live").click();
  await p
    .getByRole("spinbutton", { name: "Pitch value", exact: true })
    .fill("700");
  await p.locator("#editor-main").focus();
  await liveFrames(p, 24000);
  const good = await graph(p);
  await writeCode(p, "while (true) {}");
  await p.locator("#apply-graph-code").click();
  await p.getByRole("alert").filter({ hasText: "Loops" }).waitFor();
  assert.deepEqual(
    await graph(p),
    good,
    "Compile failure keeps the applied graph",
  );
  await liveFrames(p, 36000);
  assert.equal(await p.evaluate(() => (window as any).nodes), 1);
  const code =
    "state0 = fract(state0 + p0 / sampleRate);\nout = sin(state0 * 6.28318530718) * p2;";
  await writeCode(p, code);
  await p.keyboard.press("Control+Enter");
  await p.waitForFunction(
    (code) =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.kind === "code").code ===
      code,
    code,
  );
  const frames = Number(
    await p.locator("#live-indicator").getAttribute("data-frames"),
  );
  await liveFrames(p, frames + 24000);
  assert.equal(
    await p.evaluate(() => (window as any).nodes),
    1,
    "Code swap keeps the worklet",
  );
  await p.locator("#record-live").click();
  await p.locator("#export-take").waitFor();
  const take = await download(p, "export-take"),
    capture = await p.evaluate(() => (window as any).captured.at(-1));
  assert.equal(take.length, 44 + capture.frames * 2);
  assert.ok(capture.samples.every(Number.isFinite));
  assert.ok(capture.samples.some((x: number) => Math.abs(x) > 0.02));
  for (let i = 0; i < capture.frames; i++)
    assert.ok(
      Math.abs(
        take.readInt16LE(44 + i * 2) / 32768 -
          Math.max(-1, Math.min(1, capture.samples[i])),
      ) <
        2 / 32768,
    );
  // A delayed compiler result must never overwrite a newer parameter edit.
  await p.evaluate(() => {
    (window as any).compileDelay = 600;
  });
  await writeCode(p, code + "\nout = out * 0.75;");
  await p.locator("#apply-graph-code").click();
  await p
    .getByRole("spinbutton", { name: "Pitch value", exact: true })
    .fill("800");
  await p.locator("#editor-main").focus();
  await p
    .getByRole("alert")
    .filter({ hasText: "changed during compilation" })
    .waitFor();
  assert.equal((await graph(p)).parameters[0].value, 800);
  assert.equal(
    (await graph(p)).nodes.find((n: any) => n.kind === "code").code,
    code,
  );
  await writeCode(p, "state0 = sqrt(-abs(p0)); out = state0;");
  await p.locator("#apply-graph-code").click();
  await p
    .locator("#status")
    .filter({ hasText: "non-finite samples" })
    .waitFor();
  assert.equal(await p.evaluate(() => (window as any).nodes), 1);
  await writeCode(p, code);
  await p.locator("#apply-graph-code").click();
  await p.waitForFunction(
    (code) =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.kind === "code").code ===
      code,
    code,
  );
  await p.locator("#live-stop").click();
  // Connections work through both pointer ports and the keyboard; cycles are atomic failures.
  await p
    .getByRole("combobox", { name: "input connection", exact: true })
    .selectOption("filter");
  await p.getByRole("alert").filter({ hasText: "cycle" }).waitFor();
  assert.equal(
    (await graph(p)).nodes.find((n: any) => n.id === "impact").inputs.input,
    "noise",
  );
  await p.locator('[data-graph-node="output"]').focus();
  await p
    .getByRole("combobox", { name: "input connection", exact: true })
    .selectOption("");
  await p.waitForFunction(
    () =>
      !JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === "output").inputs
        .input,
  );
  await p
    .locator('[data-graph-output="filter"]')
    .dragTo(p.locator('[data-graph-target="output"]'));
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === "output").inputs
        .input === "filter",
  );
  await p.locator('[data-graph-output="impact"]').focus();
  await p.keyboard.press("Enter");
  await p.locator('[data-graph-target="output"]').focus();
  await p.keyboard.press("Enter");
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === "output").inputs
        .input === "impact",
  );
  await undo(p);
  await p.locator('[data-graph-node="filter"]').focus();
  await p.keyboard.press("Shift+F10");
  await p
    .getByRole("menuitemcheckbox", { name: "Bypass node", exact: true })
    .click();
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === "filter").bypass,
  );
  await undo(p);
  await p.locator('[data-graph-node="noise"]').click({ button: "right" });
  await p.getByRole("menuitem", { name: /^Duplicate node/ }).click();
  await p.waitForFunction(
    () => document.querySelectorAll("[data-graph-node]").length === 5,
  );
  const duplicate = (await graph(p)).nodes.find(
    (n: any) => n.name === "Noise copy",
  );
  await p.locator(`[data-graph-node="${duplicate.id}"]`).focus();
  await p.keyboard.press("Delete");
  await p.waitForFunction(
    () => document.querySelectorAll("[data-graph-node]").length === 4,
  );
  await undo(p);
  assert.equal((await graph(p)).nodes.length, 5);
  await undo(p);
  await p
    .getByRole("button", { name: "Waveform / Spectrum", exact: true })
    .click();
  assert.ok(
    await p
      .getByRole("region", { name: "Sound / Monitor", exact: true })
      .isVisible(),
  );
  await p.getByRole("button", { name: "Node network", exact: true }).click();
  await p.locator(".graph-surface").focus();
  await p.keyboard.press("Enter");
  assert.ok(
    await p
      .locator(".graph-node.selected")
      .evaluate((n) => n === document.activeElement),
  );
  await p.locator(".graph-surface").focus();
  await p.keyboard.press("Shift+Tab");
  assert.equal(
    await p.getByRole("menu").count(),
    0,
    "Shift+Tab leaves the graph canvas",
  );
  await p.locator('[data-graph-node="impact"]').focus();
  await p.screenshot({ path: "artifacts/graph-desktop.png", fullPage: true });
  await p.locator("#mode-render").click();
  assert.equal(
    await p.locator('#backend option[value="webgpu"]').isDisabled(),
    true,
  );
  const first = await render(p);
  assert.deepEqual(await render(p), first, "Finite renders are deterministic");
  const exported = await download(p, "export-patch"),
    patch = JSON.parse(exported.toString());
  await p.reload();
  await p.locator('[data-graph-node="impact"]').waitFor();
  assert.deepEqual(
    await graph(p),
    patch.patch.graph,
    "Graph persists across reload",
  );
  await p.locator("#mode-render").click();
  assert.deepEqual(await render(p), first);
  const invalid = structuredClone(patch);
  invalid.patch.graph.nodes.find((n: any) => n.kind === "code").code =
    "while(true) {}";
  await p.locator("#patch-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await p.locator("#status").filter({ hasText: "Loops" }).waitFor();
  assert.deepEqual(await graph(p), patch.patch.graph);
  await p.locator("#use-in-video").click();
  await sceneReady(p);
  const projectGraph = (await doc(p)).scene.cues[0].patch.graph;
  assert.deepEqual(projectGraph, patch.patch.graph);
  const mixed = await download(p, "export-wav");
  assert.ok(mixed.length > 44);
  await p.getByRole("button", { name: "File", exact: true }).click();
  const project = await download(p, "save-project");
  const q = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  q.on("pageerror", (e) => errors.push(e.message));
  await q.goto(base + "/studio/video/");
  await q.locator("#project-file").setInputFiles({
    name: "graph.json",
    mimeType: "application/json",
    buffer: project,
  });
  await q.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!).cues
        .length === 1,
  );
  await sceneReady(q);
  assert.deepEqual((await doc(q)).scene.cues[0].patch.graph, projectGraph);
  assert.deepEqual(
    await download(q, "export-wav"),
    mixed,
    "Portable project renders the same graph",
  );
  await p.getByRole("button", { name: "Sound", exact: true }).click();
  await p
    .getByRole("spinbutton", { name: "Pitch value", exact: true })
    .fill("900");
  await p.locator("#editor-main").focus();
  assert.equal(
    (await doc(p)).scene.cues[0].patch.graph.parameters[0].value,
    900,
  );
  assert.equal(
    (await graph(p)).parameters[0].value,
    800,
    "Selected clip graph edits keep the independent source",
  );
  await undo(p);
  assert.equal(
    (await doc(p)).scene.cues[0].patch.graph.parameters[0].value,
    800,
  );
  await p.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.screenshot({ path: "artifacts/graph-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS procedural graph: real TypeShade live/finite/Picture audio, draft/apply errors, stale compile protection, node drag/Undo/Escape, typed wires, keyboard/context actions, lazy compile reuse, state persistence, portable project and mobile layout",
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
