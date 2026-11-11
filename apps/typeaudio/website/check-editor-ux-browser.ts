import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
import { readCode, writeCode } from "./check-code-input.ts";
import { graphProject } from "./check-graph-project.ts";

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4197, strictPort: true },
});
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors: string[] = [],
  observations: Record<string, unknown> = {};
const output = process.env.TYPEAUDIO_UX_ARTIFACTS || "artifacts/ux";
const documentKey = "typeaudio.editor.document.v1",
  historyKey = "typeaudio.projects.history.v1";
const stored = (p: Page) =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)!), documentKey);
async function ready(p: Page) {
  await p.waitForFunction(
    () =>
      document.querySelector<HTMLButtonElement>("#play")?.disabled === false,
    undefined,
    { timeout: 90000 },
  );
}
async function task(p: Page, name: string) {
  await p
    .getByRole("navigation", { name: "Editor tasks" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function open(p: Page, id: string) {
  const tabs = p.getByRole("navigation", { name: "Editor tasks" });
  if (await tabs.isVisible()) await task(p, "Projects");
  await p
    .getByRole("group", { name: "Project browser" })
    .getByRole("button", { name: "Projects", exact: true })
    .click();
  await p.locator(`[data-project="${id}"]`).click();
  await p.waitForFunction(
    (id) =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).scene
        .origin?.id === id,
    id,
  );
  await ready(p);
}
try {
  await mkdir(output, { recursive: true });
  const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  p.setDefaultTimeout(30000);
  p.on("pageerror", (error) => errors.push(error.message));
  await p.goto("http://127.0.0.1:4197/studio/");
  assert.equal(
    await p
      .getByRole("button", { name: "Open project file…", exact: true })
      .isVisible(),
    true,
  );
  // A picture project with one procedural sound, opened from a file.
  await p.locator("#project-file").setInputFiles({
    name: "graph-study.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(graphProject())),
  });
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!)?.scene
        .origin?.id === "graph-study",
  );
  await ready(p);
  // Real wheel input, without locator scrolling, must reach formerly clipped controls.
  const properties = p.locator(".clip-properties > .panel-body"),
    bounds = await properties.boundingBox();
  assert.ok(bounds);
  await p.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await p.mouse.wheel(0, 3000);
  await p.waitForFunction(
    () =>
      document.querySelector(".clip-properties > .panel-body")!.scrollTop > 100,
  );
  observations.inspector = await properties.evaluate((el) => ({
    height: el.clientHeight,
    content: el.scrollHeight,
    scroll: el.scrollTop,
  }));
  const edit = await p.locator("#edit-cue-sound").boundingBox();
  assert.ok(
    edit && edit.y > 0 && edit.y + edit.height < 1050,
    "Primary Edit sound stays reachable in the header",
  );
  await p.screenshot({ path: `${output}/inspector-scroll.png` });
  await p.mouse.wheel(0, -5000);
  await p.locator("#scene-name").fill("UX edited A");
  const beforePreview = await stored(p),
    previousCopies = await p.evaluate(
      (k) => localStorage.getItem(k),
      historyKey,
    );
  await p.locator('[data-preview="unseen-force-wall-hit"]').click();
  await p.waitForFunction(
    () =>
      document
        .querySelector(".preview-status")
        ?.textContent?.startsWith("Preview:"),
    undefined,
    { timeout: 90000 },
  );
  assert.deepEqual(
    await stored(p),
    beforePreview,
    "Preview never replaces source, selection, timing or drafts",
  );
  assert.equal(
    await p.evaluate((k) => localStorage.getItem(k), historyKey),
    previousCopies,
  );
  await p.locator(".preview-status button").click();
  // Stopping a pending preview cannot schedule audio after its worker finishes.
  await p.locator('[data-preview="unseen-force-wall-hit"]').click();
  await p.locator(".preview-status button").click();
  await p.waitForTimeout(300);
  assert.equal(await p.locator(".preview-status").count(), 0);
  await p.locator("#edit-cue-sound").click();
  assert.equal(
    await p.locator("#editor-main").getAttribute("data-workspace"),
    "picture",
  );
  assert.equal(await p.locator("#play").isVisible(), true);
  assert.equal(await p.locator("[data-cue]").first().isVisible(), true);
  const canvas = await p.locator(".graph-surface").boundingBox();
  assert.ok(canvas);
  for (const node of await p.locator("[data-graph-node]").all()) {
    const b = await node.boundingBox();
    assert.ok(
      b &&
        b.y >= canvas.y - 1 &&
        b.y + b.height <= canvas.y + canvas.height + 1,
      "Initial node framing stays inside the contextual canvas",
    );
  }
  await p.locator("#code-tab-node-impact").click();
  const applied = beforePreview.scene.cues[0].patch.graph.nodes.find(
    (n: any) => n.id === "impact",
  ).code;
  const draft = applied + "\n// unfinished, must survive save\nout =";
  await writeCode(p, draft);
  const pending = p.waitForEvent("download");
  await p.keyboard.press("Control+s");
  const download = await pending,
    bytes = await readFile((await download.path())!);
  const file = JSON.parse(bytes.toString());
  assert.equal(file.version, 2);
  assert.ok(
    Object.values(file.editor.drafts).some((d: any) => d.text === draft),
  );
  assert.equal(
    file.scene.cues[0].patch.graph.nodes.find((n: any) => n.id === "impact")
      .code,
    applied,
  );
  await p.screenshot({ path: `${output}/contextual-source.png` });
  await open(p, "unseen-force-wall-hit");
  const copy = p
    .locator("[data-saved-project]")
    .filter({ hasText: "UX edited A" });
  await p.locator(".saved-projects summary").click();
  await copy.getByRole("button", { name: "Open copy", exact: true }).click();
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).scene
        .name === "UX edited A",
  );
  await ready(p);
  await p.locator("#edit-cue-sound").click();
  await p.locator("#code-tab-node-impact").click();
  assert.equal(
    await readCode(p),
    draft,
    "Recovery retains the unapplied draft even when A/B share node IDs",
  );
  await p.reload();
  await ready(p);
  await p.locator("#edit-cue-sound").click();
  await p.locator("#code-tab-node-impact").click();
  assert.equal(
    await readCode(p),
    draft,
    "Reload retains the draft without applying it",
  );
  await p.getByRole("button", { name: "← Composition", exact: true }).click();
  const intact = await stored(p);
  await p.evaluate((k) => {
    const set = Storage.prototype.setItem;
    (window as any).restoreStorage = () => {
      Storage.prototype.setItem = set;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === k) throw new DOMException("Full", "QuotaExceededError");
      set.call(this, key, value);
    };
  }, historyKey);
  // Make the checkpoint distinct so deduplication cannot bypass the failure.
  await p.locator("#scene-name").fill("Quota guard");
  const unsaved = await stored(p);
  await p.locator('[data-project="unseen-force-wall-hit"]').click();
  await p
    .locator("#status")
    .filter({ hasText: "Could not preserve" })
    .waitFor();
  assert.deepEqual(
    await stored(p),
    unsaved,
    "A failed checkpoint prevents document replacement",
  );
  await p.evaluate(() => (window as any).restoreStorage());

  await p.evaluate((k) => {
    const set = Storage.prototype.setItem;
    (window as any).restoreStorage = () => {
      Storage.prototype.setItem = set;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === k) throw new DOMException("Blocked", "QuotaExceededError");
      set.call(this, key, value);
    };
  }, documentKey);
  await p.locator("#scene-name").fill("Keep this unsaved edit");
  await p.locator(".save-state.error").waitFor();
  assert.match(await p.locator(".save-state").innerText(), /Not saved/);
  const rescuePending = p.waitForEvent("download");
  await p.keyboard.press("Control+s");
  const rescued = JSON.parse(
    (await readFile((await (await rescuePending).path())!)).toString(),
  );
  assert.equal(
    rescued.scene.name,
    "Keep this unsaved edit",
    "File save rescues the current state when browser storage fails",
  );
  assert.ok(
    Object.values(rescued.editor.drafts).some((d: any) => d.text === draft),
  );
  await p.evaluate(() => (window as any).restoreStorage());
  await p.locator("#scene-name").fill(unsaved.scene.name);
  await p.locator(".save-state.saved").waitFor();

  // The file is portable to another browser context; its draft has never compiled.
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.setDefaultTimeout(30000);
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto("http://127.0.0.1:4197/studio/");
  await mobile.locator("#project-file").setInputFiles({
    name: "draft.typeaudio.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await ready(mobile);
  for (const width of [390, 320]) {
    await mobile.setViewportSize({ width, height: 844 });
    for (const name of ["Listen", "Layers", "Edit", "Projects"]) {
      await task(mobile, name);
      const play = await mobile.locator("#play").boundingBox();
      assert.ok(
        play &&
          play.y >= 0 &&
          play.y + play.height <= 844 &&
          play.width >= 44 &&
          play.height >= 44,
      );
      const dimensions = await mobile.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewport: innerHeight,
      }));
      assert.ok(
        dimensions.width <= width + 1 &&
          dimensions.height <= dimensions.viewport + 1,
        `${width}px ${name} stays within the viewport`,
      );
      observations[`${width}-${name}`] = dimensions;
    }
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await task(mobile, "Edit");
  await mobile
    .getByRole("spinbutton", { name: "Texture value", exact: true })
    .fill("0.6");
  await mobile
    .getByRole("spinbutton", { name: "Texture value", exact: true })
    .blur();
  assert.equal(
    (await stored(mobile)).scene.cues[0].patch.graph.parameters[3].value,
    0.6,
  );
  await mobile.screenshot({ path: `${output}/mobile-edit.png` });
  await mobile.locator("#edit-cue-sound").click();
  await mobile.locator("#code-tab-node-impact").click();
  assert.equal(await readCode(mobile), draft);
  await task(mobile, "Listen");
  await ready(mobile);
  await mobile.locator("#play").click();
  await mobile.waitForFunction(
    () =>
      Number(
        document.querySelector("#clock")?.getAttribute("data-scheduled"),
      ) === 1,
  );
  await mobile.locator("#stop").click();
  await task(mobile, "Projects");
  await mobile.screenshot({ path: `${output}/mobile-projects.png` });
  const linked = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  linked.on("pageerror", (error) => errors.push(error.message));
  await linked.goto("http://127.0.0.1:4197/?project=unseen-force-wall-hit");
  await ready(linked);
  assert.equal((await stored(linked)).scene.origin.id, "unseen-force-wall-hit");
  assert.equal(
    await linked.locator("#editor-main").getAttribute("data-workspace"),
    "picture",
  );
  // Saving while a name input is focused has the same meaning as saving from code.
  await linked.locator("#scene-name").focus();
  const nameSave = linked.waitForEvent("download");
  await linked.keyboard.press("Control+s");
  assert.equal(await (await nameSave).failure(), null);
  assert.deepEqual(errors, []);
  observations.portableScene = intact.scene.name;
  await writeFile(
    `${output}/observations.json`,
    JSON.stringify(observations, null, 2),
  );
  console.log(
    "PASS UX: native inspector scrolling, non-destructive preview/cancellation, contextual source editing, draft file/reload/recovery, failed-checkpoint protection and 320/390px task navigation with persistent playback",
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
