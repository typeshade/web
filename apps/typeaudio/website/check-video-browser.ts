import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4179, strictPort: true },
});
const browser = await chromium.launch({
  executablePath:
    process.env["TYPESHADE_CHROMIUM"] || chromium.executablePath(),
  args: ["--no-sandbox"],
});
const base = "http://127.0.0.1:4179";
async function ready(page: Page) {
  await page.waitForFunction(
    () => !(document.querySelector("#play") as HTMLButtonElement).disabled,
    undefined,
    { timeout: 90000 },
  );
  assert.equal(
    await page
      .locator("#status")
      .evaluate((e) => e.classList.contains("error")),
    false,
    (await page.locator("#status").textContent()) || "",
  );
}
async function change(page: Page, id: string, value: string) {
  await page.locator("#" + id).evaluate((node, value) => {
    (node as HTMLInputElement).value = value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
async function download(page: Page, id: string) {
  const event = page.waitForEvent("download");
  await page.locator("#" + id).click();
  return readFile((await (await event).path())!);
}
async function scene(page: Page) {
  return JSON.parse(
    await page.evaluate(
      () => localStorage.getItem("typeaudio.video.scene.v1")!,
    ),
  );
}
try {
  const errors: string[] = [];
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const active = new Set<AudioBufferSourceNode>();
    (window as any).activeCueNodes = active;
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      active.add(this);
      this.addEventListener('ended', () => active.delete(this));
      start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      active.delete(this);
      stop.apply(this, args);
    };
  });
  await page.goto(base);
  await page.locator("#patch-name").fill("Video bridge");
  await page.locator("#use-in-video").click();
  await page.waitForURL("**/studio/video/");
  await ready(page);
  assert.equal(await page.locator("#new-source").inputValue(), "designer");
  await page.locator("#add-cue").click();
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 1);
  await change(page, "cue-time", "0.5");
  await ready(page);
  await change(page, "cue-duration", "0.5");
  await ready(page);
  await change(page, "range-out", "2");
  await ready(page);
  await page.locator("#loop").uncheck();
  await ready(page);
  const original = await download(page, "export-wav");
  assert.equal(original.toString("ascii", 0, 4), "RIFF");
  assert.equal(original.length, 44 + 2 * 48000 * 2);
  assert.ok(
    original.subarray(44, 44 + 24000 * 2).every((x) => x === 0),
    "leading half-second silence",
  );
  assert.ok(
    original.subarray(44 + 24000 * 2).some((x) => x !== 0),
    "rendered cue audio",
  );
  await page.locator("#cue-muted").check();
  await ready(page);
  const muted = await download(page, "export-wav");
  assert.ok(muted.subarray(44).every((x) => x === 0));
  await page.locator("#undo").click();
  await ready(page);
  assert.equal(await page.locator("#cue-muted").isChecked(), false);
  await page.locator("#duplicate").click();
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 2);
  await page.locator("#delete-cue").click();
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 1);
  await page.locator("#play").click();
  await page.waitForFunction(
    () =>
      Number(
        (document.querySelector("#clock") as HTMLElement).dataset.scheduled,
      ) > 0,
  );
  await page.locator("#pause").click();
  assert.equal(await page.evaluate(() => (window as any).activeCueNodes.size), 0);
  const paused = Number(
    (await page.locator("#clock").textContent())!.split(" ")[0],
  );
  await page.waitForTimeout(150);
  assert.ok(
    Math.abs(
      Number((await page.locator("#clock").textContent())!.split(" ")[0]) -
        paused,
    ) < 0.1,
  );
  await page.locator("#stop").click();
  await page.waitForFunction(
    () => document.querySelector("#clock")!.textContent === "0.000 s",
  );
  const project = await download(page, "save-project");
  const snapshot = JSON.parse(project.toString());
  assert.equal(snapshot.cues.length, 1);
  await page
    .locator("#project-file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":2}'),
    });
  await page.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.startsWith("Import failed"),
  );
  assert.equal((await scene(page)).cues.length, 1);
  await page.reload();
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 1);
  await page
    .locator("#video-file")
    .setInputFiles("website/fixtures/scene.webm");
  await page.waitForFunction(
    () => document.querySelector("#media-label")!.textContent === "scene.webm",
  );
  await ready(page);
  assert.equal(await page.locator("[data-cue]").count(), 1);
  await change(page, "original-volume", "0.2");
  assert.equal(
    await page
      .locator("#video")
      .evaluate((v) => (v as HTMLVideoElement).volume),
    0.2,
  );
  await change(page, "range-in", "0.25");
  await ready(page);
  await change(page, "range-out", "0.9");
  await ready(page);
  await page.locator("#loop").check();
  await ready(page);
  await page.evaluate(() => {
    const v = document.querySelector("video")!;
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
  assert.ok(
    await page
      .locator("#video")
      .evaluate((v) => (v as HTMLVideoElement).paused),
  );
  await change(page, "range-out", "4");
  await ready(page);
  await change(page, "range-in", "3.5");
  await ready(page);
  await page.evaluate(() => {
    document.querySelector("video")!.dataset.plays = "0";
  });
  await page.locator("#play").click();
  await page.waitForFunction(
    () => Number(document.querySelector("video")!.dataset.plays) >= 3,
    undefined,
    { timeout: 8000 },
  );
  await page.locator("#stop").click();
  await change(page, "range-out", "5");
  assert.match(
    (await page.locator("#status").textContent()) || "",
    /fit inside/,
  );
  assert.equal(await page.locator("#range-out").inputValue(), "4");
  await page
    .locator("#project-file")
    .setInputFiles({
      name: "scene.json",
      mimeType: "application/json",
      buffer: project,
    });
  await ready(page);
  await page.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.includes("Project opened"),
  );
  assert.equal(await page.locator("#video").isVisible(), false);
  assert.deepEqual(await scene(page), snapshot);
  await page
    .locator("#video-file")
    .setInputFiles("website/fixtures/scene.webm");
  await page.waitForFunction(
    () => document.querySelector("#media-label")!.textContent === "scene.webm",
  );
  await ready(page);
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/video-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `overflow at ${width}`,
    );
  }
  await page.screenshot({ path: "artifacts/video-mobile.png", fullPage: true });
  console.log(
    "PASS designer bridge, real CPU cue PCM, range WAV, mute/undo, duplicate/delete, project validation/round trip/persistence, local video playback and end/range loops, levels, mobile layout",
  );

  const yt = await browser.newPage();
  yt.on("pageerror", (e) => errors.push(e.message));
  // The deterministic adapter test is deliberately separate from actual YouTube availability.
  await yt.addInitScript(() => {
    (window as any).YT = {
      Player: class {
        time = 0;
        state = 2;
        volume = 100;
        timer: any;
        options: any;
        constructor(element: HTMLElement, options: any) {
          this.options = options;
          element.textContent = "YouTube test adapter";
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
        setVolume(value: number) {
          this.volume = value;
        }
        destroy() {
          clearInterval(this.timer);
        }
      },
    };
  });
  await yt.goto(base + "/studio/video/");
  await ready(yt);
  await yt.locator("#youtube-url").fill("https://youtu.be/M7lc1UVf-VE");
  await yt.locator("#load-youtube").click();
  await yt.waitForFunction(() =>
    document.querySelector("#media-label")!.textContent!.includes("YouTube ·"),
  );
  await yt.locator("#add-cue").click();
  await ready(yt);
  await yt.locator("#play").click();
  await yt.waitForFunction(
    () =>
      Number(
        (document.querySelector("#clock") as HTMLElement).dataset.scheduled,
      ) > 0,
  );
  await yt.locator("#pause").click();
  await yt.locator("#youtube-url").fill("https://example.com/");
  await yt.locator("#load-youtube").click();
  assert.match((await yt.locator("#status").textContent()) || "", /YouTube/);
  const blocked = await browser.newPage();
  await blocked.route("https://www.youtube.com/iframe_api", (route) =>
    route.abort(),
  );
  await blocked.goto(base + "/studio/video/");
  await ready(blocked);
  await blocked.locator("#youtube-url").fill("https://youtu.be/M7lc1UVf-VE");
  await blocked.locator("#load-youtube").click();
  await blocked.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.includes("could not load"),
  );
  assert.equal(await blocked.locator("#load-youtube").isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    "PASS YouTube adapter transport, URL validation and unavailable API recovery (mocked API; no external playback claim)",
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((e) => (e ? reject(e) : resolve())),
  );
}
