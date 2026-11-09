import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
import { emptyScene } from "./video-model.ts";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4189, strictPort: true },
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4189";
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
function stereoWav(rate = 44100, seconds = 1.2) {
  const frames = Math.round(rate * seconds),
    b = Buffer.alloc(44 + frames * 4);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) {
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * Math.PI * 440) * 0.6 * 32767),
      44 + i * 4,
    );
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * Math.PI * 660) * 0.2 * 32767),
      46 + i * 4,
    );
  }
  return b;
}
const recording = stereoWav(),
  input = {
    name: "field-stereo.wav",
    mimeType: "audio/wav",
    buffer: recording,
  };
async function doc(p: Page) {
  return p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!),
  );
}
async function ready(p: Page) {
  await p.waitForFunction(
    () => !(document.querySelector("#play") as HTMLButtonElement)?.disabled,
    undefined,
    { timeout: 90000 },
  );
}
async function download(p: Page, id: string) {
  if (id === "save-project")
    await p.getByRole("button", { name: "File", exact: true }).click();
  const event = p.waitForEvent("download");
  await p.locator("#" + id).click();
  return readFile((await (await event).path())!);
}
async function upload(p: Page, value: any, name = "scene.json") {
  await p.locator("#project-file").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
}
async function undo(p: Page) {
  await p.locator("#editor-main").focus();
  await p.keyboard.press("Control+z");
}
async function assetData(p: Page, id: string) {
  return p.evaluate(
    (id) =>
      new Promise<number[]>((resolve, reject) => {
        const request = indexedDB.open("typeaudio.audio.v1", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            req = db.transaction("pcm").objectStore("pcm").get(id);
          req.onsuccess = () => {
            db.close();
            resolve(Array.from(req.result as Float32Array));
          };
          req.onerror = () => reject(req.error);
        };
      }),
    id,
  );
}
async function countAssets(p: Page) {
  return p.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const r = indexedDB.open("typeaudio.audio.v1", 1);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("info").objectStore("info").count();
          q.onsuccess = () => {
            db.close();
            resolve(q.result);
          };
        };
      }),
  );
}
async function page() {
  const p = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await p.addInitScript(() => {
    const w = window as any,
      Native = window.Worker;
    w.renderWorkers = 0;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        w.renderWorkers++;
      }
    };
  });
  return p;
}
const errors: string[] = [];
try {
  const p = await page();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await p.locator("#audio-file").setInputFiles(input);
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!).cues
        .length === 1,
  );
  await ready(p);
  let d = await doc(p);
  const ref = d.scene.cues[0].audio;
  assert.equal(ref.frames, 57600);
  assert.equal(ref.name, input.name);
  assert.equal(await countAssets(p), 1);
  assert.equal(await p.evaluate(() => (window as any).renderWorkers), 0);
  assert.equal(await p.locator("#edit-cue-sound").count(), 0);
  const pcm = await assetData(p, ref.id);
  let resampleError = 0;
  for (let i = 480; i < pcm.length - 480; i++)
    resampleError = Math.max(
      resampleError,
      Math.abs(
        pcm[i]! -
          (Math.sin((i / 48000) * Math.PI * 440) * 0.3 +
            Math.sin((i / 48000) * Math.PI * 660) * 0.1),
      ),
    );
  assert.ok(
    resampleError < 0.001,
    `Stereo downmix / resampling: ${resampleError}`,
  );
  await p.getByRole("button", { name: "Sound", exact: true }).click();
  await p.getByRole("button", { name: "Sounds", exact: true }).click();
  await p.locator('[data-preset="bass"]').click();
  assert.equal((await doc(p)).source.patch.frequency, 65.4);
  assert.deepEqual((await doc(p)).scene.cues[0].audio, ref);
  await p.getByRole("button", { name: "Picture", exact: true }).click();
  await ready(p);
  await p.locator("#range-out").fill("2");
  await p.locator("#cue-source-in").fill(".2");
  await p.locator("#cue-source-out").fill("1");
  await p.locator("#cue-time").fill(".5");
  await p.locator("#cue-fadeIn").fill(".1");
  await p.locator("#cue-fadeOut").fill(".2");
  await p.locator("#editor-main").focus();
  const before = await download(p, "export-wav");
  assert.equal(before.length, 44 + 2 * 48000 * 2);
  let maxError = 0;
  for (let i = 0; i < 96000; i++) {
    const t = i / 48000,
      source = t - 0.5 + 0.2;
    let sample = 0;
    if (t >= 0.5 && t < 1.3)
      sample =
        pcm[Math.round(source * 48000)]! *
        0.7 *
        Math.max(0, Math.min(1, (source - 0.2) / 0.1, (1 - source) / 0.2));
    const expected = Math.round(sample * (sample < 0 ? 32768 : 32767));
    maxError = Math.max(
      maxError,
      Math.abs(before.readInt16LE(44 + i * 2) - expected),
    );
  }
  assert.ok(maxError <= 1, `Trimmed/faded WAV mismatch: ${maxError}`);
  assert.equal(
    await p.evaluate(() => (window as any).renderWorkers),
    0,
    "Audio trim and fades must reuse imported PCM",
  );
  const ruler = await p.locator(".time-ruler").boundingBox();
  assert.ok(ruler);
  await p.mouse.click(
    ruler.x + (ruler.width * 0.8) / 2,
    ruler.y + ruler.height / 2,
  );
  await p.locator("[data-cue]").first().focus();
  await p.keyboard.press("Control+Shift+d");
  await ready(p);
  assert.equal((await doc(p)).scene.cues.length, 2);
  assert.deepEqual(await download(p, "export-wav"), before);
  await undo(p);
  await ready(p);
  assert.equal((await doc(p)).scene.cues.length, 1);
  assert.deepEqual(await download(p, "export-wav"), before);
  await p.reload();
  await ready(p);
  assert.deepEqual(await download(p, "export-wav"), before);
  await p.getByRole("button", { name: "Audio", exact: true }).click();
  const asset = p.locator(`[data-audio-asset="${ref.id}"]`);
  await asset.click({ button: "right" });
  assert.equal(
    await p
      .getByRole("menuitem", { name: "Remove from browser", exact: true })
      .isDisabled(),
    true,
  );
  await p.keyboard.press("Escape");
  await asset.dragTo(p.locator(".clip-lane").first());
  await ready(p);
  assert.equal((await doc(p)).scene.cues.length, 2);
  assert.equal(await countAssets(p), 1);
  await undo(p);
  await ready(p);
  // Mix a generated sound with the imported recording and export one copy of the source asset.
  await p.locator("#add-cue").click();
  await ready(p);
  assert.ok((await p.evaluate(() => (window as any).renderWorkers)) > 0);
  const mixed = await download(p, "export-wav");
  assert.notDeepEqual(mixed, before);
  const projectBytes = await download(p, "save-project"),
    project = JSON.parse(projectBytes.toString());
  assert.equal(project.audioAssets.length, 1);
  assert.equal(project.audioAssets[0].id, ref.id);
  assert.equal(project.scene.cues.length, 2);
  const q = await page();
  q.on("pageerror", (e) => errors.push(e.message));
  await q.goto(base + "/studio/video/");
  assert.equal(await countAssets(q), 0);
  await q.locator("#project-file").setInputFiles({
    name: "portable.json",
    mimeType: "application/json",
    buffer: projectBytes,
  });
  await ready(q);
  assert.deepEqual(await download(q, "export-wav"), mixed);
  assert.equal(await countAssets(q), 1);
  const intact = await doc(q);
  const corrupt = structuredClone(project);
  corrupt.audioAssets[0].id = "0".repeat(64);
  corrupt.scene.cues[0].audio.id = "0".repeat(64);
  await upload(q, corrupt, "corrupt.json");
  await q.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.includes("checksum"),
  );
  assert.deepEqual((await doc(q)).scene, intact.scene);
  assert.equal(await countAssets(q), 1);
  // An unbundled reference never falls back to the cue's procedural patch.
  const missing = await page();
  missing.on("pageerror", (e) => errors.push(e.message));
  await missing.goto(base + "/studio/video/");
  const { audioAssets, ...refsOnly } = project;
  await upload(missing, refsOnly);
  await missing.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.includes("Missing audio"),
  );
  assert.equal(await missing.locator("#play").isDisabled(), true);
  assert.equal(await missing.locator("#export-wav").isDisabled(), true);
  await missing.locator("#audio-file").setInputFiles(input);
  await ready(missing);
  assert.equal(
    (await doc(missing)).scene.cues.length,
    2,
    "Restoring an existing audio source must not add another clip",
  );
  assert.deepEqual(await download(missing, "export-wav"), mixed);
  // Rejected files leave the current document intact.
  const saved = (await doc(p)).scene;
  await p.locator("#audio-file").setInputFiles({
    name: "invalid.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("invalid audio"),
  });
  await p.waitForFunction(() =>
    document
      .querySelector("#status")!
      .textContent!.includes("Audio import failed"),
  );
  assert.deepEqual((await doc(p)).scene, saved);
  await p.locator("#audio-file").setInputFiles({
    name: "long.wav",
    mimeType: "audio/wav",
    buffer: stereoWav(8000, 31),
  });
  await p.waitForFunction(() =>
    document.querySelector("#status")!.textContent!.includes("30 seconds"),
  );
  assert.deepEqual((await doc(p)).scene, saved);
  // A slow decode can populate the library, but must not overwrite intervening edits.
  const different = Buffer.from(recording);
  different.writeInt16LE(1234, 44 + 400 * 4);
  await p.evaluate(() => {
    const w = window as any;
    w.originalDecode = OfflineAudioContext.prototype.decodeAudioData;
    OfflineAudioContext.prototype.decodeAudioData = async function (
      data: ArrayBuffer,
    ) {
      const buffer = await w.originalDecode.call(this, data);
      return new Promise<AudioBuffer>((resolve) => {
        w.finishAudioDecode = () => resolve(buffer);
      });
    } as any;
  });
  await p.locator("#audio-file").setInputFiles({
    name: "slow.wav",
    mimeType: "audio/wav",
    buffer: different,
  });
  await p.waitForFunction(() => !!(window as any).finishAudioDecode);
  await p.locator("#cue-time").fill("1.7");
  await p.locator("#editor-main").focus();
  const edited = (await doc(p)).scene;
  await p.evaluate(() => {
    const w = window as any;
    OfflineAudioContext.prototype.decodeAudioData = w.originalDecode;
    w.finishAudioDecode();
  });
  await p.waitForFunction(() =>
    document
      .querySelector("#status")!
      .textContent!.includes("composition changed"),
  );
  assert.deepEqual((await doc(p)).scene, edited);
  assert.equal(await countAssets(p), 2);
  const unused = p.locator(
    `[data-audio-asset]:not([data-audio-asset="${ref.id}"])`,
  );
  await unused.click({ button: "right" });
  await p
    .getByRole("menuitem", { name: "Remove from browser", exact: true })
    .click();
  await p.waitForFunction(
    () => document.querySelectorAll("[data-audio-asset]").length === 1,
  );
  // A rejected storage transaction must not create a dangling cue reference.
  await p.evaluate(() => {
    const w = window as any;
    w.originalTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      names: string | string[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) {
      if (mode === "readwrite")
        throw new DOMException("Storage quota test", "QuotaExceededError");
      return w.originalTransaction.call(this, names, mode, options);
    };
  });
  try {
    await p.locator("#audio-file").setInputFiles({
      name: "quota.wav",
      mimeType: "audio/wav",
      buffer: different,
    });
    await p.waitForFunction(() =>
      document
        .querySelector("#status")!
        .textContent!.includes("Audio import failed"),
    );
    assert.deepEqual((await doc(p)).scene, edited);
    assert.equal(await countAssets(p), 1);
  } finally {
    await p.evaluate(() => {
      IDBDatabase.prototype.transaction = (window as any).originalTransaction;
    });
  }
  // Deletion remains blocked by undo history, then becomes available in a fresh composition.
  await p.locator("#editor-main").focus();
  await p.keyboard.press("Control+a");
  await p.keyboard.press("Delete");
  await asset.click({ button: "right" });
  assert.equal(
    await p
      .getByRole("menuitem", { name: "Remove from browser", exact: true })
      .isDisabled(),
    true,
  );
  await p.keyboard.press("Escape");
  await upload(p, emptyScene(), "empty.json");
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!).cues
        .length === 0,
  );
  await asset.click({ button: "right" });
  await p
    .getByRole("menuitem", { name: "Remove from browser", exact: true })
    .click();
  await p.waitForFunction(() => !document.querySelector("[data-audio-asset]"));
  assert.equal(await countAssets(p), 0);
  await p.locator("#project-file").setInputFiles({
    name: "restored.json",
    mimeType: "application/json",
    buffer: projectBytes,
  });
  await ready(p);
  assert.deepEqual(await download(p, "export-wav"), mixed);
  await p.mouse.move(800, 40);
  await p.screenshot({
    path: "artifacts/editor-audio-import-desktop.png",
    fullPage: true,
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({
    path: "artifacts/editor-audio-import-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS real stereo WAV import/48 kHz mono conversion, cached trim/fade/split PCM, independent source Tone, audio drag/drop, procedural mix, IndexedDB reload, portable projects in a fresh browser, corruption/missing-file recovery, delayed import, storage failure, duration rejection and protected library deletion",
    { resampleError, maxError },
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
