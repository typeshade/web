import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
import { SOFTWARE_GPU_FLAGS } from "../scripts/browser.ts";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4178, strictPort: true },
});
const browser = await chromium.launch({
  executablePath:
    process.env["TYPESHADE_CHROMIUM"] || chromium.executablePath(),
  args: [...SOFTWARE_GPU_FLAGS, "--no-sandbox"],
});
const base = process.env["TYPEAUDIO_VERIFY_URL"] || "http://127.0.0.1:4178";
async function range(page: Page, id: string, value: number) {
  await page.locator("#" + id).evaluate((node, value) => {
    const input = node as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
async function module(page: Page, id: string) {
  await page.locator(`[data-module="${id}"]`).click();
}
async function ready(page: Page) {
  await page.waitForFunction(
    () => !(document.querySelector("#play") as HTMLButtonElement)?.disabled,
    undefined,
    { timeout: 90000 },
  );
}
async function render(page: Page, backend = "cpu") {
  await page.selectOption("#backend", backend);
  await page.locator("#render").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#metric-backend")!.textContent !== "—" ||
      document.querySelector("#status")!.textContent!.includes("Error"),
    undefined,
    { timeout: 90000 },
  );
  assert.equal(
    await page.locator("#metric-backend").textContent(),
    backend === "cpu" ? "CPU" : "WebGPU",
    (await page.locator("#status").textContent()) || "",
  );
}
async function download(page: Page, id: string) {
  const wait = page.waitForEvent("download");
  await page.locator("#" + id).click();
  return readFile((await (await wait).path())!);
}
async function scene(page: Page) {
  return JSON.parse(
    await page.evaluate(
      () => localStorage.getItem("typeaudio.video.scene.v1")!,
    ),
  );
}
const errors: string[] = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const w = window as any;
    w.liveNodes = 0;
    w.renderWorkers = 0;
    const Native = window.AudioWorkletNode;
    window.AudioWorkletNode = class extends Native {
      constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
        super(...args);
        w.liveNodes++;
      }
    };
    const Worker = window.Worker;
    window.Worker = class extends Worker {
      constructor(url: string | URL, options?: WorkerOptions) {
        w.renderWorkers++;
        const entry = new URL(String(url), location.href);
        entry.searchParams.set("entry", "regression");
        super(entry, options);
      }
    };
  });
  await page.goto(base);
  assert.equal(await page.locator("[data-preset]").count(), 6);
  await page.locator("#live-start").click();
  await page.waitForFunction(
    () =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement).dataset
          .frames,
      ) > 48000,
    undefined,
    { timeout: 15000 },
  );
  await range(page, "frequency", 880);
  await range(page, "voices", 8);
  await module(page, "filter");
  await range(page, "cutoff", 8000);
  await module(page, "delay");
  await page.locator("#delay").check();
  await module(page, "reverb");
  await page.locator("#reverb").check();
  await module(page, "modulation");
  await range(page, "lfoDepth", 0.8);
  await page.locator("#lfoSync").check();
  assert.equal(await page.locator("#lfoRate").isDisabled(), true);
  await page.locator("#store-a").click();
  await range(page, "tempo", 140);
  await page.locator("#store-b").click();
  await page.locator("#recall-a").click();
  assert.equal(await page.locator("#tempo").inputValue(), "120");
  await range(page, "morph", 0.5);
  assert.equal(await page.locator("#tempo").inputValue(), "130");
  const before = await page
    .locator("#live-indicator")
    .getAttribute("data-frames");
  await page.locator("#xy-pad").click({ position: { x: 40, y: 30 } });
  await page.waitForFunction(
    (before) =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement).dataset
          .frames,
      ) >
      Number(before) + 48000,
    before,
    { timeout: 8000 },
  );
  assert.equal(await page.evaluate(() => (window as any).liveNodes), 1);
  assert.equal(await page.evaluate(() => (window as any).renderWorkers), 0);
  await page.locator("#live-stop").click();
  assert.match((await page.locator("#status").textContent()) || "", /stopped/);
  console.log(
    "PASS one continuous AudioWorklet node, 8 voices, live edits/effects/modulation, XY, A/B, morph, no render worker in Live",
  );
  await page.locator("#patch-name").fill("Component patch");
  await page.locator("#save-patch").click();
  const patchFile = await download(page, "export-patch");
  assert.equal(JSON.parse(patchFile.toString()).name, "Component patch");
  await page.locator("#patch-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2}'),
  });
  await page.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.startsWith("Import failed"),
  );
  await page.locator("#patch-file").setInputFiles({
    name: "patch.json",
    mimeType: "application/json",
    buffer: patchFile,
  });
  await page.waitForFunction(
    () => document.querySelector("#status")!.textContent === "Patch imported.",
  );
  await page.locator('[data-preset="warm"]').click();
  await module(page, "envelope");
  await range(page, "duration", 0.5);
  await page.locator("#mode-render").click();
  await render(page);
  const cpu = await download(page, "download");
  assert.equal(cpu.toString("ascii", 0, 4), "RIFF");
  assert.equal(cpu.length, 44 + Math.ceil((0.5 + 0.35) * 48000) * 2);
  await render(page, "webgpu");
  const gpu = await download(page, "download");
  let max = 0;
  for (let i = 44; i < cpu.length; i += 2)
    max = Math.max(max, Math.abs(cpu.readInt16LE(i) - gpu.readInt16LE(i)));
  assert.ok(max <= 66, `PCM mismatch ${max}`);
  await page.locator('[data-preset="glass"]').click();
  await module(page, "envelope");
  await range(page, "duration", 0.5);
  await render(page);
  const wet = await download(page, "download");
  await page.locator("#monitor-dry").click();
  const dry = await download(page, "download");
  assert.notDeepEqual(wet, dry);
  assert.equal(wet.length, dry.length);
  await page.locator("#monitor-wet").click();
  await page.locator('[data-view="spectrum"]').click();
  await page.locator('[data-view="wave"]').click();
  console.log(
    `PASS real CPU/WebGPU PCM parity (${max}/32768), query-bearing workers, WAV, effects/dry comparison, spectrum, patch save/import validation`,
  );
  await page.locator('[data-preset="warm"]').click();
  await module(page, "envelope");
  await range(page, "duration", 0.5);
  await page.locator("#use-in-video").click();
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 1);
  await page.locator("#cue-time").fill("0.5");
  await page.locator("#range-out").fill("2");
  await page.locator("#loop").uncheck();
  await ready(page);
  const wav = await download(page, "export-wav");
  assert.equal(wav.length, 44 + 2 * 48000 * 2);
  assert.ok(wav.subarray(44, 44 + 24000 * 2).every((x) => x === 0));
  assert.ok(wav.subarray(44 + 24000 * 2).some((x) => x !== 0));
  await page.locator("#cue-muted").check();
  const silent = await download(page, "export-wav");
  assert.ok(silent.subarray(44).every((x) => x === 0));
  await page.locator("#undo").click();
  assert.equal(await page.locator("#cue-muted").isChecked(), false);
  await page.locator("#redo").click();
  assert.equal(await page.locator("#cue-muted").isChecked(), true);
  await page.locator("#undo").click();
  const clip = page.locator("[data-cue]").first();
  const box = await clip.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.3 + 50,
    box.y + box.height * 0.6,
    { steps: 8 },
  );
  await page.mouse.up();
  assert.ok((await scene(page)).cues[0].time > 0.5);
  await page.locator("#undo").click();
  assert.equal((await scene(page)).cues[0].time, 0.5);
  await clip.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal((await scene(page)).cues[0].time, 0.51);
  await page.keyboard.press("Control+z");
  assert.equal((await scene(page)).cues[0].time, 0.5);
  await page.locator("#edit-cue-sound").click();
  await module(page, "source");
  await range(page, "frequency", 440);
  await page.getByRole("button", { name: "Picture", exact: true }).click();
  await ready(page);
  assert.equal((await scene(page)).cues[0].patch.frequency, 440);
  await page.locator("#duplicate").click();
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 2);
  await page.locator("[data-cue]").last().focus();
  await page.keyboard.press("Delete");
  assert.equal(await page.locator("[data-cue]").count(), 1);
  await page.locator("#play").click();
  await page.waitForFunction(
    () =>
      Number(
        (document.querySelector("#clock") as HTMLElement).dataset.scheduled,
      ) > 0,
  );
  await page.locator("#pause").click();
  const paused = await page.locator("#clock").textContent();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#clock").textContent(), paused);
  await page.locator("#stop").click();
  await page.waitForFunction(
    () => document.querySelector("#clock")!.textContent === "0.000 s",
  );
  console.log(
    "PASS shared selected-layer sound edits, real waveform clips, drag/snap, keyboard movement/delete/undo, redo, leading-silence/muted WAV, transport",
  );
  const projectDivider = page.getByRole("separator", {
    name: "Resize project panel",
  });
  const initialWidth = await page
    .locator(".project-panel")
    .evaluate((el) => el.getBoundingClientRect().width);
  await projectDivider.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .locator(".project-panel")
      .evaluate((el) => el.getBoundingClientRect().width),
    initialWidth + 10,
  );
  await page.getByRole("button", { name: "Reset layout" }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  assert.equal(
    await page.locator(".timeline-content").evaluate((el) => el.style.width),
    "200%",
  );
  await page
    .getByRole("button", { name: "Hand tool (H)", exact: true })
    .click();
  const lane = await page.locator(".clip-lane").first().boundingBox();
  assert.ok(lane);
  await page.mouse.move(lane.x + 250, lane.y + 30);
  await page.mouse.down();
  await page.mouse.move(lane.x + 150, lane.y + 30, { steps: 5 });
  await page.mouse.up();
  assert.ok(
    await page.locator(".timeline-scroll").evaluate((el) => el.scrollLeft > 0),
  );
  await page
    .getByRole("button", { name: "Selection tool (V)", exact: true })
    .click();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await page
    .locator('[data-preset="bass"]')
    .dragTo(page.locator(".clip-lane").first());
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 2);
  await page.locator("#undo").click();
  assert.equal(await page.locator("[data-cue]").count(), 1);
  console.log(
    "PASS panel resize, timeline zoom/hand pan, and actual library drag-and-drop",
  );
  await page
    .locator("#video-file")
    .setInputFiles("website/fixtures/scene.webm");
  await page.waitForFunction(
    () => document.querySelector("video")!.readyState >= 2,
  );
  await ready(page);
  await page.locator("#range-out").fill("0.9");
  await page.locator("#range-in").fill("0.25");
  await page.locator("#loop").check();
  await page.evaluate(() => {
    const v = document.querySelector("video")!;
    v.dataset.plays = "0";
    v.addEventListener(
      "play",
      () => (v.dataset.plays = String(Number(v.dataset.plays || 0) + 1)),
    );
  });
  await page.locator("#play").click();
  await page.waitForFunction(
    () => Number(document.querySelector("video")!.dataset.plays) >= 3,
    undefined,
    { timeout: 8000 },
  );
  await page.locator("#pause").click();
  await range(page, "original-volume", 0.2);
  assert.equal(await page.locator("video").evaluate((v) => v.volume), 0.2);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.getByRole("button", { name: "Picture", exact: true }).click();
  assert.ok(
    await page.locator("video").evaluate((v) => v.src.startsWith("blob:")),
  );
  assert.equal((await scene(page)).cues.length, 1);
  await page.locator("#range-out").fill("4");
  await page.locator("#range-in").fill("3.5");
  await page.evaluate(
    () => (document.querySelector("video")!.dataset.plays = "0"),
  );
  await page.locator("#play").click();
  await page.waitForFunction(
    () => Number(document.querySelector("video")!.dataset.plays) >= 3,
    undefined,
    { timeout: 8000 },
  );
  await page.locator("#stop").click();
  await page.locator("#range-out").fill("5");
  assert.match(
    (await page.locator("#status").textContent()) || "",
    /fit inside/,
  );
  await page.locator("#range-in").fill("0");
  await page.locator("#range-out").fill("2");
  await page.getByRole("button", { name: "File", exact: true }).click();
  const project = await download(page, "save-project");
  const snapshot = JSON.parse(project.toString());
  await page.locator("#project-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2}'),
  });
  await page.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.startsWith("Import failed"),
  );
  assert.equal((await scene(page)).cues.length, 1);
  await page.locator("#project-file").setInputFiles({
    name: "scene.json",
    mimeType: "application/json",
    buffer: project,
  });
  await ready(page);
  assert.equal(await page.locator("video").isVisible(), false);
  assert.deepEqual(await scene(page), snapshot);
  await page.reload();
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 1);
  assert.ok(
    await page.getByRole("button", { name: "Sound", exact: true }).isVisible(),
  );
  await page
    .locator("#video-file")
    .setInputFiles("website/fixtures/scene.webm");
  await page.waitForFunction(
    () => document.querySelector("video")!.readyState >= 2,
  );
  await ready(page);
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/editor-picture-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.locator("#live-start").click();
  await page.waitForFunction(
    () => document.querySelector("#metric-backend")!.textContent === "CPU live",
  );
  await page.screenshot({
    path: "artifacts/editor-sound-desktop.png",
    fullPage: true,
  });
  await page.locator("#live-stop").click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Sound overflow ${width}`,
    );
    await page.getByRole("button", { name: "Picture", exact: true }).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Picture overflow ${width}`,
    );
    await page.getByRole("button", { name: "Sound", exact: true }).click();
  }
  await page.screenshot({
    path: "artifacts/editor-sound-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Picture", exact: true }).click();
  await page.screenshot({
    path: "artifacts/editor-picture-mobile.png",
    fullPage: true,
  });
  for (const path of [
    "/docs/vision/",
    "/docs/architecture/",
    "/docs/experiments/",
    "/docs/compiler-asks/",
  ]) {
    assert.equal((await page.goto(base + path))?.status(), 200);
  }
  console.log(
    "PASS actual WebM range/end loops, levels, media retained between workspaces, project round trip/rejection/persistence, desktop and 320/390px layouts, docs",
  );
  console.log("CHECK missing WebGPU");
  const unavailable = await browser.newPage();
  await unavailable.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await unavailable.goto(base);
  await unavailable.locator("#mode-render").click();
  await unavailable.selectOption("#backend", "webgpu");
  await unavailable.locator("#render").click();
  await unavailable.waitForFunction(
    () => document.querySelector("#status")!.textContent!.includes("Error"),
    undefined,
    { timeout: 15000 },
  );
  assert.match(
    (await unavailable.locator("#status").textContent()) || "",
    /unavailable|Requested webgpu|WebGPU/i,
  );
  assert.equal(await unavailable.locator("#download").isDisabled(), true);
  console.log("CHECK YouTube adapter");
  const youtube = await browser.newPage();
  youtube.on("pageerror", (error) => errors.push(error.message));
  await youtube.addInitScript(() => {
    (window as any).YT = {
      Player: class {
        time = 0;
        state = 2;
        timer: any;
        options: any;
        constructor(node: HTMLElement, options: any) {
          this.options = options;
          node.textContent = "YouTube adapter fixture";
          setTimeout(() => options.events.onReady(), 10);
        }
        playVideo() {
          this.state = 1;
          this.options.events.onStateChange();
          this.timer = setInterval(() => (this.time += 0.05), 50);
        }
        pauseVideo() {
          clearInterval(this.timer);
          this.state = 2;
          this.options.events.onStateChange();
        }
        seekTo(time: number) {
          this.time = time;
        }
        getCurrentTime() {
          return this.time;
        }
        getDuration() {
          return 4;
        }
        getPlayerState() {
          return this.state;
        }
        getPlaybackRate() {
          return 1;
        }
        setVolume() {}
        destroy() {
          clearInterval(this.timer);
        }
      },
    };
  });
  await youtube.goto(base + "/studio/video/");
  await youtube.getByRole("button", { name: "Media", exact: true }).click();
  await youtube.locator("#youtube-url").fill("https://youtu.be/M7lc1UVf-VE");
  await youtube.locator("#load-youtube").click();
  await youtube.waitForFunction(() =>
    document.querySelector("#media-label")!.textContent!.includes("YouTube"),
  );
  assert.equal((await scene(youtube)).media.kind, "youtube");
  await youtube.locator("#add-cue").click();
  await ready(youtube);
  await youtube.locator("#play").click();
  await youtube.waitForFunction(
    () =>
      Number(
        (document.querySelector("#clock") as HTMLElement).dataset.scheduled,
      ) > 0,
  );
  await youtube.locator("#pause").click();
  console.log("CHECK blocked YouTube");
  const blocked = await browser.newPage();
  await blocked.route("https://www.youtube.com/iframe_api", (route) =>
    route.abort(),
  );
  await blocked.goto(base + "/studio/video/");
  await blocked.getByRole("button", { name: "Media", exact: true }).click();
  await blocked.locator("#youtube-url").fill("https://youtu.be/M7lc1UVf-VE");
  await blocked.locator("#load-youtube").click();
  await blocked.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.includes("could not load"),
  );
  assert.equal(await blocked.locator("#load-youtube").isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    "PASS missing WebGPU recovery, mocked YouTube transport/blocked API, no application runtime errors",
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
