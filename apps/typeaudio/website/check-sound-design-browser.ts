import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4187, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4187";
async function patch(p: Page) {
  return p.evaluate(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch,
  );
}
async function range(p: Page, id: string, v: number) {
  await p.locator("#" + id).evaluate((n, v) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(n, String(v));
    n.dispatchEvent(new Event("input", { bubbles: true }));
  }, v);
}
async function module(p: Page, id: string) {
  await p.locator(`[data-module="${id}"]`).click();
}
async function download(p: Page, id: string) {
  const event = p.waitForEvent("download");
  await p.locator("#" + id).click();
  return readFile((await (await event).path())!);
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
function energy(wav: Buffer, from = 0.1, to = 0.9) {
  const frames = (wav.length - 44) / 2;
  let sum = 0;
  for (let i = Math.floor(frames * from); i < frames * to; i++)
    sum += (wav.readInt16LE(44 + i * 2) / 32768) ** 2;
  return sum / (frames * (to - from));
}
try {
  const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    }),
    errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    const w = window as any,
      Native = window.AudioWorkletNode;
    w.captured = [];
    w.nodes = 0;
    window.AudioWorkletNode = class extends Native {
      constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
        super(...args);
        w.nodes++;
        this.port.addEventListener("message", (event) => {
          if (event.data.type === "recorded")
            w.captured.push({
              samples: Array.from(
                event.data.samples.subarray(0, event.data.frames),
              ),
              frames: event.data.frames,
            });
        });
      }
    };
  });
  await p.goto(base);
  await p.getByRole("button", { name: "Sounds", exact: true }).click();
  assert.equal(await p.locator("[data-recipe]").count(), 3);
  await p.locator('[data-recipe="door"]').click();
  assert.equal((await patch(p)).layers.length, 2);
  await p.locator('[data-source-layer="air"]').click();
  await p.keyboard.press("Shift+F10");
  await p.getByRole("menu", { name: "Sound layer actions" }).waitFor();
  await p.keyboard.press("Escape");
  assert.equal(
    await p
      .locator('[data-source-layer="air"]')
      .evaluate((n) => n === document.activeElement),
    true,
  );
  await module(p, "source");
  assert.equal(await p.locator("#shapeA").inputValue(), "4");
  await range(p, "frequency", 440);
  let data = await patch(p);
  assert.equal(data.frequency, 85);
  assert.equal(data.layers[0].patch.frequency, 440);
  await p.keyboard.press("Control+z");
  data = await patch(p);
  assert.equal(data.layers[0].patch.frequency, 220);
  await p.getByLabel("Sound layer name", { exact: true }).fill("Air hiss");
  await p.getByLabel("Sound layer start", { exact: true }).fill(".2");
  await p.locator('[data-source-layer="base"]').click();
  await p.getByRole("button", { name: "Duplicate layer", exact: true }).click();
  assert.equal((await patch(p)).layers.length, 3);
  assert.equal(
    await p
      .getByRole("button", { name: "Add sound layer", exact: true })
      .isDisabled(),
    true,
  );
  await p.getByRole("button", { name: "Delete layer", exact: true }).click();
  assert.equal((await patch(p)).layers.length, 2);
  await p.keyboard.press("Control+z");
  assert.equal((await patch(p)).layers.length, 3);
  await p.keyboard.press("Control+Shift+z");
  assert.equal((await patch(p)).layers.length, 2);
  await p.locator('[data-source-layer="air"]').click();
  await module(p, "automation");
  await p.getByLabel("Automation target").selectOption("gain");
  await p.getByRole("button", { name: "Fall", exact: true }).click();
  assert.deepEqual((await patch(p)).layers[0].patch.curves.gain, [
    { time: 0, value: 1 },
    { time: 1, value: 0 },
  ]);
  const area = await p.locator(".curve-drawing").boundingBox();
  assert.ok(area);
  await p.mouse.click(area.x + area.width * 0.5, area.y + area.height * 0.3);
  assert.equal((await patch(p)).layers[0].patch.curves.gain.length, 3);
  const point = p.getByRole("button", { name: "Curve point 2", exact: true });
  await point.focus();
  await p.keyboard.press("ArrowUp");
  const saved = (await patch(p)).layers[0].patch.curves.gain;
  const b = await point.boundingBox();
  assert.ok(b);
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.down();
  await p.mouse.move(b.x + 40, b.y + 30, { steps: 8 });
  await p.keyboard.press("Escape");
  await p.mouse.up();
  assert.deepEqual((await patch(p)).layers[0].patch.curves.gain, saved);
  await p.screenshot({
    path: "artifacts/sound-design-automation.png",
    fullPage: true,
  });
  const json = await download(p, "export-patch");
  await p.reload();
  assert.deepEqual(await patch(p), JSON.parse(json.toString()).patch);
  await p.getByRole("button", { name: "Sounds", exact: true }).click();
  await p.locator('[data-preset="warm"]').click();
  assert.equal((await patch(p)).layers.length, 0);
  await p.locator("#patch-file").setInputFiles({
    name: "sound.json",
    mimeType: "application/json",
    buffer: json,
  });
  await p.waitForFunction(
    () => document.querySelector("#status")!.textContent === "Patch imported.",
  );
  assert.deepEqual(await patch(p), JSON.parse(json.toString()).patch);
  await p.locator("#mode-render").click();
  assert.equal(await p.locator("#backend").inputValue(), "cpu");
  assert.equal(
    await p.locator("#backend option[value=webgpu]").isDisabled(),
    true,
  );
  const first = await render(p),
    again = await render(p);
  assert.deepEqual(first, again);
  assert.ok(energy(first) > 0.00001);
  await p.locator("#use-in-video").click();
  await p.waitForFunction(
    () =>
      !(document.querySelector("#export-wav") as HTMLButtonElement).disabled,
    undefined,
    { timeout: 90000 },
  );
  const scene = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!),
  );
  assert.equal(scene.cues[0].patch.layers.length, 2);
  assert.ok(energy(await download(p, "export-wav"), 0, 0.5) > 0);
  await p.getByRole("button", { name: "Sound", exact: true }).click();
  await p.getByRole("button", { name: "New sound", exact: true }).click();
  await module(p, "wave");
  await p
    .getByLabel("Wave expression", { exact: true })
    .fill("tanh(3*sin(2*pi*phase))");
  await p
    .getByRole("button", { name: "Apply expression", exact: true })
    .click();
  data = await patch(p);
  assert.equal(data.shapeA, 5);
  assert.ok(
    data.wave.every((x: number) => Number.isFinite(x) && Math.abs(x) <= 1),
  );
  const wave = data.wave;
  await p
    .getByLabel("Wave expression", { exact: true })
    .fill("window.alert(1)");
  await p
    .getByRole("button", { name: "Apply expression", exact: true })
    .click();
  assert.equal(await p.getByRole("alert").count(), 1);
  assert.deepEqual((await patch(p)).wave, wave);
  const drawing = await p.locator(".wave-drawing").boundingBox();
  assert.ok(drawing);
  await p.mouse.move(drawing.x + 15, drawing.y + 30);
  await p.mouse.down();
  await p.mouse.move(drawing.x + 120, drawing.y + 70, { steps: 12 });
  await p.mouse.up();
  assert.notDeepEqual((await patch(p)).wave, wave);
  await p.keyboard.press("Control+z");
  assert.deepEqual((await patch(p)).wave, wave);
  await p
    .getByLabel("Wave expression", { exact: true })
    .fill("tanh(3*sin(2*pi*phase))");
  await p
    .getByRole("button", { name: "Apply expression", exact: true })
    .click();
  await p.screenshot({
    path: "artifacts/sound-design-wave.png",
    fullPage: true,
  });
  await p.locator("#mode-live").click();
  await p.locator("#live-start").click();
  await p.waitForFunction(
    () =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement).dataset
          .frames,
      ) > 24000,
  );
  await p.locator("#record-live").click();
  await module(p, "source");
  await range(p, "frequency", 880);
  await range(p, "fmIndex", 2);
  const before = await p.locator("#live-indicator").getAttribute("data-frames");
  await p.waitForFunction(
    (before) =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement).dataset
          .frames,
      ) >
      Number(before) + 24000,
    before,
  );
  await p.locator("#record-live").click();
  await p.locator("#export-take").waitFor();
  const take = await download(p, "export-take");
  assert.ok(energy(take) > 0.0001);
  const capture = await p.evaluate(() => (window as any).captured.at(-1));
  assert.equal(take.length, 44 + capture.frames * 2);
  for (let i = 0; i < capture.frames; i++) {
    const sample = Math.max(-1, Math.min(1, capture.samples[i]));
    assert.ok(
      Math.abs(take.readInt16LE(44 + i * 2) / 32768 - sample) < 2 / 32768,
    );
  }
  assert.equal(await p.evaluate(() => (window as any).nodes), 1);
  await p.locator("#record-live").click();
  await p.waitForFunction(
    (before) =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement).dataset
          .frames,
      ) >
      Number(before) + 48000,
    before,
  );
  await p.locator("#live-stop").click();
  await p.waitForFunction(() => (window as any).captured.length === 2);
  assert.equal(await p.locator("#record-live").textContent(), "Record live");
  assert.ok((await download(p, "export-take")).length > 44);
  await p.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.screenshot({
    path: "artifacts/sound-design-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS layered sound editing/Undo, curves and wave drawing, bounded expressions, saved/imported layers, deterministic CPU render, Picture export, live PCM recording/stop and mobile layout",
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
