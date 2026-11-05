import assert from "node:assert/strict";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4179, strictPort: true },
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4179";
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
async function range(p: Page, id: string, value: number) {
  await p.locator("#" + id).evaluate((node, v) => {
    const input = node as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
async function workspace(p: Page, name: "Sound" | "Picture") {
  await p.getByRole("button", { name, exact: true }).click();
}
async function ready(p: Page) {
  await p.waitForFunction(
    () => !(document.querySelector("#play") as HTMLButtonElement).disabled,
    undefined,
    { timeout: 90000 },
  );
}
async function scene(p: Page) {
  return JSON.parse(
    await p.evaluate(() => localStorage.getItem("typeaudio.video.scene.v1")!),
  );
}
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    const original = File.prototype.text;
    const w = window as any;
    w.pendingText = {};
    File.prototype.text = async function () {
      const text = await original.call(this);
      if (!this.name.startsWith("slow-")) return text;
      return new Promise<string>(
        (resolve) => (w.pendingText[this.name] = () => resolve(text)),
      );
    };
  });
  await p.goto(base);
  await p.locator("#frequency").waitFor();
  await p.evaluate(() => {
    for (const [id, value] of [
      ["frequency", "440"],
      ["blend", ".88"],
    ]) {
      const input = document.getElementById(id) as HTMLInputElement;
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  assert.equal(await p.locator("#blend").inputValue(), "0.88");
  await p.locator('[data-module="filter"]').click();
  await range(p, "cutoff", 8500);
  await workspace(p, "Picture");
  await ready(p);
  await p.locator("#add-cue").click();
  await ready(p);
  await p.locator("#edit-cue-sound").click();
  await range(p, "cutoff", 500);
  await p.locator('[data-module="source"]').click();
  await range(p, "frequency", 660);
  await range(p, "blend", 0.12);
  await workspace(p, "Picture");
  await ready(p);
  await p.evaluate(() => {
    for (const [id, value] of [
      ["scene-name", "Keep this project"],
      ["original-volume", ".2"],
    ]) {
      const input = document.getElementById(id) as HTMLInputElement;
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  assert.equal((await scene(p)).name, "Keep this project");
  assert.equal((await scene(p)).original, 0.2);
  assert.equal((await scene(p)).cues[0].patch.frequency, 660);
  const lane = await p.locator(".clip-lane").first().boundingBox();
  assert.ok(lane);
  await p.mouse.click(lane.x + lane.width * 0.9, lane.y + 20);
  await workspace(p, "Sound");
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  assert.equal(await p.locator("#blend").inputValue(), "0.88");
  await p.locator('[data-module="filter"]').click();
  assert.equal(await p.locator("#cutoff").inputValue(), "8500");
  await p.reload();
  await p.locator("#frequency").waitFor();
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  assert.equal(await p.locator("#blend").inputValue(), "0.88");
  await p.locator('[data-module="filter"]').click();
  assert.equal(await p.locator("#cutoff").inputValue(), "8500");
  await workspace(p, "Picture");
  await ready(p);
  await p.locator("[data-cue]").first().click();
  await p.locator("#edit-cue-sound").click();
  await p.locator('[data-module="source"]').click();
  assert.equal(await p.locator("#frequency").inputValue(), "660");
  assert.equal(await p.locator("#blend").inputValue(), "0.12");
  const imported = {
    version: 1,
    name: "Old delayed patch",
    patch: (await scene(p)).cues[0].patch,
  };
  await p.locator("#patch-file").setInputFiles({
    name: "slow-patch.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await p.waitForFunction(
    () => !!(window as any).pendingText["slow-patch.json"],
  );
  await range(p, "frequency", 880);
  await p.evaluate(() => (window as any).pendingText["slow-patch.json"]());
  await p.waitForTimeout(100);
  assert.equal(await p.locator("#frequency").inputValue(), "880");
  const project = await scene(p),
    delayed = { ...project, name: "Old delayed project", cues: [] };
  await p.locator("#project-file").setInputFiles({
    name: "slow-project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(delayed)),
  });
  await p.waitForFunction(
    () => !!(window as any).pendingText["slow-project.json"],
  );
  await p.locator("#scene-name").fill("Newer project name");
  await p.evaluate(() => (window as any).pendingText["slow-project.json"]());
  await p.waitForTimeout(100);
  assert.equal((await scene(p)).name, "Newer project name");
  assert.equal((await scene(p)).cues.length, 1);
  await p.locator("#project-file").setInputFiles({
    name: "slow-first.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(delayed)),
  });
  await p.waitForFunction(
    () => !!(window as any).pendingText["slow-first.json"],
  );
  await p.locator("#project-file").setInputFiles({
    name: "latest.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...project, name: "Latest project" })),
  });
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!).name ===
      "Latest project",
  );
  await p.evaluate(() => (window as any).pendingText["slow-first.json"]());
  await p.waitForTimeout(100);
  assert.equal((await scene(p)).name, "Latest project"); // A/B display must survive panel unmounting and agree with the applied sound.
  await workspace(p, "Sound");
  await p.locator('[data-module="source"]').click();
  await p.locator("#store-a").click();
  await range(p, "frequency", 440);
  await p.locator("#store-b").click();
  await range(p, "morph", 0.5);
  const blended = await p.locator("#frequency").inputValue();
  await workspace(p, "Picture");
  await workspace(p, "Sound");
  assert.equal(await p.locator("#morph").inputValue(), "0.5");
  assert.equal(await p.locator("#frequency").inputValue(), blended);
  const delayedRender = await browser.newPage();
  await delayedRender.addInitScript(() => {
    (window as any).Worker = class {
      onmessage?: (event: any) => void;
      postMessage(request: { id: number }) {
        (window as any).finishRender = () =>
          this.onmessage?.({
            data: {
              id: request.id,
              dry: new Float32Array(480),
              wet: new Float32Array(480),
              tier: "cpu",
              peak: 0,
              milliseconds: 1,
              report: "delayed render fixture",
            },
          });
      }
      terminate() {}
    };
  });
  await delayedRender.goto(base);
  await delayedRender.locator("#mode-render").click();
  await delayedRender.locator("#render").click();
  await delayedRender.waitForFunction(
    () => typeof (window as any).finishRender === "function",
  );
  await range(delayedRender, "frequency", 880);
  await delayedRender.evaluate(() => (window as any).finishRender());
  await delayedRender.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.includes("Sound changed"),
  );
  assert.equal(await delayedRender.locator("#download").isDisabled(), true);
  assert.equal(await delayedRender.locator("#frequency").inputValue(), "880");
  await delayedRender.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS batched field edits, source/clip Tone, workspace/selection/reload persistence, stale imports vs newer edits, latest project open wins",
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
