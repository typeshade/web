import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
import { writeCode } from "./check-code-input.ts";
import { PROJECTS } from "./project/catalog.ts";

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4195, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
});
const base = "http://127.0.0.1:4195",
  errors: string[] = [];
const artifacts = process.env.TYPEAUDIO_PROJECT_ARTIFACTS;
const scene = (p: Page) =>
  p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!),
  );
async function ready(p: Page) {
  await p.waitForFunction(
    () =>
      document.querySelector<HTMLButtonElement>("#play")?.disabled === false,
    undefined,
    { timeout: 90000 },
  );
}
async function input(p: Page, label: string, value: number) {
  await p
    .getByRole("spinbutton", { name: label, exact: true })
    .fill(String(value));
  await p.getByRole("spinbutton", { name: label, exact: true }).blur();
}
async function downloaded(p: Page, selector: string) {
  const pending = p.waitForEvent("download");
  await p.locator(selector).click();
  const download = await pending;
  assert.equal(await download.failure(), null);
  return readFile((await download.path())!);
}
function pcmHash(wav: Buffer) {
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt16LE(22), 2, "Spatial export is stereo");
  assert.equal(wav.readUInt32LE(24), 48000);
  let energy = 0,
    difference = 0;
  for (let i = 44; i < wav.length; i += 4) {
    const l = wav.readInt16LE(i),
      r = wav.readInt16LE(i + 2);
    energy += l * l + r * r;
    difference += Math.abs(l - r);
  }
  assert.ok(
    energy > 0 && difference > 0,
    "The room produces audible, non-mono PCM",
  );
  return createHash("sha256").update(wav).digest("hex");
}
async function open(p: Page, id: string) {
  const tasks = p.getByRole("navigation", { name: "Editor tasks" });
  if (await tasks.isVisible())
    await tasks.getByRole("button", { name: "Projects", exact: true }).click();
  await p
    .getByRole("group", { name: "Project browser" })
    .getByRole("button", { name: "Projects", exact: true })
    .click();
  await p.locator(`[data-project="${id}"]`).click();
  await p.waitForFunction(
    (id) =>
      JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!)?.origin
        ?.id === id,
    id,
  );
  await ready(p);
}
try {
  const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  p.setDefaultTimeout(30000);
  p.on("pageerror", (error) => errors.push(error.message));
  await p.addInitScript(() => {
    const read = File.prototype.text;
    (window as any).pendingProject = {};
    File.prototype.text = async function () {
      const value = await read.call(this);
      if (!this.name.startsWith("slow-")) return value;
      return new Promise<string>(
        (resolve) =>
          ((window as any).pendingProject[this.name] = () => resolve(value)),
      );
    };
  });
  await p.goto(base);
  for (const project of PROJECTS)
    for (const variant of ["A", "B"]) {
      const id = `${project.id}-${variant}`;
      await open(p, id);
      const doc = await scene(p);
      assert.equal(doc.cues.length, project.layers);
      assert.equal(doc.media.id, "YHCqcyX9N3s");
      assert.ok(
        doc.cues.every((c: any) => c.patch.graph && c.space && !c.audio),
      );
      const wav = await downloaded(p, "#export-wav");
      pcmHash(wav);
      assert.equal(
        (wav.length - 44) / (48000 * 4),
        Math.round((doc.end - doc.start) * 48000) / 48000,
      );
      await p.locator("#play").click();
      await p.waitForFunction(
        () =>
          Number(
            document.querySelector("#clock")?.getAttribute("data-scheduled"),
          ) === 1,
      );
      await p.locator("#stop").click();
      console.log(
        `${id}: source import, stereo prepare, playback and export passed`,
      );
    }
  await open(p, "frieren-red-A");
  const original = await scene(p),
    hero = original.cues[0];
  const originalHash = pcmHash(await downloaded(p, "#export-wav"));
  assert.ok(
    await p
      .getByRole("button", { name: "Connect reference", exact: true })
      .isVisible(),
  );
  await p.locator("#edit-cue-sound").click();
  const character = hero.patch.graph.parameters[3].value,
    changed = character < 0.5 ? 0.9 : 0.1;
  await input(p, "Character value", changed);
  assert.equal(
    (await scene(p)).cues[0].patch.graph.parameters[3].value,
    changed,
  );
  await p.locator("#undo").click();
  assert.equal(
    (await scene(p)).cues[0].patch.graph.parameters[3].value,
    character,
  );
  await p.locator("#redo").click();
  assert.equal(
    (await scene(p)).cues[0].patch.graph.parameters[3].value,
    changed,
  );
  await p.getByRole("button", { name: "Picture", exact: true }).click();
  await ready(p);
  assert.notEqual(
    pcmHash(await downloaded(p, "#export-wav")),
    originalHash,
    "Parameter edits regenerate the composition",
  );
  await p.locator("#edit-cue-sound").click();
  await p.locator("#code-tab-node-material").click();
  const code =
    hero.patch.graph.nodes.find((n: any) => n.id === "material").code +
    "\nout = out * 0.4;";
  await writeCode(p, code);
  await p.locator("#apply-graph-code").click();
  await p.waitForFunction(
    (code) =>
      JSON.parse(
        localStorage.getItem("typeaudio.video.scene.v1")!,
      ).cues[0].patch.graph.nodes.find((n: any) => n.id === "material").code ===
      code,
    code,
  );
  await p.getByRole("button", { name: "Picture", exact: true }).click();
  await input(p, "Position 1 x", hero.space.points[0].x + 0.2);
  await input(p, "Room send", 0.15);
  await input(p, "Late reverberation", 0.1);
  await input(p, "Master trim (dB)", -8);
  await p.locator("#cue-time").fill(String(hero.time + 0.1));
  await p.locator("#cue-time").blur();
  await ready(p);
  const edited = await scene(p),
    editedHash = pcmHash(await downloaded(p, "#export-wav"));
  assert.notEqual(editedHash, originalHash);
  if (artifacts) {
    await mkdir(artifacts, { recursive: true });
    await p.screenshot({ path: `${artifacts}/projects-desktop.png` });
    await p.locator("#edit-cue-sound").click();
    await p.locator("#code-tab-node-material").click();
    await p.screenshot({ path: `${artifacts}/source-desktop.png` });
    await p.getByRole("button", { name: "Picture", exact: true }).click();
    await ready(p);
  }
  await p.getByRole("button", { name: "File", exact: true }).click();
  const exported = await downloaded(p, "#save-project"),
    project = JSON.parse(exported.toString());
  assert.equal(project.schema, "typeaudio.project");
  assert.equal(project.version, 2);
  assert.equal(
    project.audioAssets,
    undefined,
    "Procedural projects need no baked audio",
  );
  assert.deepEqual(project.scene, edited);
  await open(p, "frieren-force-B");
  await p.locator("#project-file").setInputFiles({
    name: "edited.typeaudio.json",
    mimeType: "application/json",
    buffer: exported,
  });
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!).origin
        .id === "frieren-red-A",
  );
  await ready(p);
  assert.deepEqual(await scene(p), edited);
  assert.equal(
    pcmHash(await downloaded(p, "#export-wav")),
    editedHash,
    "Reopening regenerates the exact edited PCM",
  );
  await p.reload();
  await p.getByRole("button", { name: "Picture", exact: true }).click();
  await ready(p);
  assert.deepEqual(
    await scene(p),
    edited,
    "Reload retains source, space and timing",
  );
  await p.locator("#project-file").setInputFiles({
    name: "future.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...project, version: 999 })),
  });
  await p.locator("#status").filter({ hasText: "Import failed" }).waitFor();
  assert.deepEqual(
    await scene(p),
    edited,
    "An unsupported project leaves current edits intact",
  );
  await p.locator("#project-file").setInputFiles({
    name: "slow-project.json",
    mimeType: "application/json",
    buffer: exported,
  });
  await p.waitForFunction(
    () => !!(window as any).pendingProject["slow-project.json"],
  );
  await input(p, "Master trim (dB)", -7);
  await p.evaluate(() => (window as any).pendingProject["slow-project.json"]());
  await p.waitForFunction(
    () =>
      document.querySelector("[data-project]")?.hasAttribute("disabled") !==
      true,
  );
  await ready(p);
  assert.equal(
    (await scene(p)).space.gainDb,
    -7,
    "A delayed import cannot roll back a newer edit",
  );
  console.log(
    "Desktop: parameter/code edits, undo/redo, spatial edits, WAV regeneration, JSON reopen, reload and stale import passed",
  );

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.setDefaultTimeout(30000);
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto(base);
  await open(mobile, "frieren-finale-A");
  await mobile
    .getByRole("navigation", { name: "Editor tasks" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await mobile.locator("#edit-cue-sound").click();
  await input(mobile, "Character value", 0.6);
  await mobile.getByRole("button", { name: "Picture", exact: true }).click();
  await mobile
    .getByRole("navigation", { name: "Editor tasks" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await input(mobile, "Room send", 0.2);
  await ready(mobile);
  await mobile.getByRole("button", { name: "File", exact: true }).click();
  const mobileData = await downloaded(mobile, "#save-project");
  await open(mobile, "frieren-red-B");
  await mobile.locator("#project-file").setInputFiles({
    name: "mobile.json",
    mimeType: "application/json",
    buffer: mobileData,
  });
  await mobile.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.video.scene.v1")!).origin
        .id === "frieren-finale-A",
  );
  await ready(mobile);
  const mobileScene = await scene(mobile);
  assert.equal(mobileScene.cues[0].patch.graph.parameters[3].value, 0.6);
  assert.equal(mobileScene.cues[0].space.send, 0.2);
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
    "Mobile has no page-wide horizontal overflow",
  );
  if (artifacts) {
    await mobile
      .getByRole("navigation", { name: "Editor tasks" })
      .getByRole("button", { name: "Projects", exact: true })
      .click();
    await mobile.screenshot({
      path: `${artifacts}/projects-mobile.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "Mobile viewport: open, parameter and space edits, save and reopen passed",
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve) =>
    server.httpServer.close(() => resolve()),
  );
}
