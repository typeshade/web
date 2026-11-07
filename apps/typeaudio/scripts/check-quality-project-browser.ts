import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";

const directory = resolve(process.argv[2]);
const artifacts = resolve("artifacts/quality-project");
await mkdir(artifacts, { recursive: true });
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4213, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
});
const errors: string[] = [],
  checks = [];
const scene = (p: Page) =>
  p.evaluate(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).scene,
  );
async function download(p: Page, selector: string) {
  const waiting = p.waitForEvent("download");
  await p.locator(selector).click();
  const file = await waiting;
  assert.equal(await file.failure(), null);
  return readFile((await file.path())!);
}
async function ready(p: Page) {
  await p.waitForFunction(
    () =>
      document.querySelector<HTMLButtonElement>("#play")?.disabled === false,
    undefined,
    { timeout: 90000 },
  );
}
try {
  for (const mobile of [false, true]) {
    const p = await browser.newPage({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1680, height: 1050 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    p.setDefaultTimeout(30000);
    p.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    p.on("console", (e) => {
      if (e.type() === "error") console.error(e.text());
    });
    await p.goto("http://127.0.0.1:4213");
    await p
      .locator("#project-file")
      .setInputFiles(join(directory, "project.typeaudio.json"));
    try {
      await p.waitForFunction(() =>
        JSON.parse(
          localStorage.getItem("typeaudio.editor.document.v1")!,
        )?.scene?.origin?.id?.startsWith("quality-"),
      );
    } catch (error) {
      await p.screenshot({
        path: join(artifacts, "import-failure.png"),
        fullPage: true,
      });
      console.log((await p.locator("body").innerText()).slice(-5000));
      throw error;
    }
    console.log(JSON.stringify({ mobile, phase: "imported" }));
    await p.getByRole("button", { name: "Picture", exact: true }).click();
    await ready(p);
    console.log(JSON.stringify({ mobile, phase: "rendered" }));
    const before = await scene(p);
    assert.equal(before.cues[0].patch.duration, 3);
    assert.equal(before.media.id, "YHCqcyX9N3s");
    const original = await readFile(join(directory, "mix.wav")),
      exported = await download(p, "#export-wav");
    assert.equal(exported.readUInt16LE(22), 2);
    assert.equal(exported.length, original.length);
    let maximumPcmError = 0;
    for (let i = 44; i < original.length; i += 2)
      maximumPcmError = Math.max(
        maximumPcmError,
        Math.abs(original.readInt16LE(i) - exported.readInt16LE(i)),
      );
    assert.ok(
      maximumPcmError <= 2,
      `Studio/engine output differs by ${maximumPcmError} PCM16 units.`,
    );
    console.log(JSON.stringify({ mobile, maximumPcmError, phase: "exported" }));
    await p.locator("#play").click();
    await p.waitForFunction(
      () =>
        Number(
          document.querySelector("#clock")?.getAttribute("data-scheduled"),
        ) === 1,
    );
    await p.locator("#stop").click();
    if (mobile)
      await p
        .getByRole("navigation", { name: "Editor tasks" })
        .getByRole("button", { name: "Edit", exact: true })
        .click();
    const send = p.getByRole("spinbutton", { name: "Room send", exact: true });
    await send.fill("0.3");
    await send.blur();
    await p.getByRole("button", { name: "File", exact: true }).click();
    const saved = await download(p, "#save-project");
    await p
      .locator("#project-file")
      .setInputFiles({
        name: "saved-quality.json",
        mimeType: "application/json",
        buffer: saved,
      });
    await ready(p);
    assert.equal((await scene(p)).cues[0].space.send, 0.3);
    await p.reload();
    await ready(p);
    assert.equal((await scene(p)).cues[0].space.send, 0.3);
    await p.screenshot({
      path: join(artifacts, mobile ? "mobile.png" : "desktop.png"),
      fullPage: true,
    });
    await writeFile(
      join(artifacts, mobile ? "mobile-saved.json" : "desktop-saved.json"),
      saved,
    );
    checks.push({
      mobileViewport: mobile,
      maximumPcmError,
      imported: true,
      playback: true,
      edited: true,
      saved: true,
      reopened: true,
      reloaded: true,
    });
    await p.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    join(artifacts, "verification.json"),
    JSON.stringify(
      { checks, errors, physicalPhone: false, pictureSyncVerified: false },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(checks));
} finally {
  await browser.close();
  await server.close();
}
