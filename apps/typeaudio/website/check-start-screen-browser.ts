import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4203, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
});
const base = "http://127.0.0.1:4203",
  errors: string[] = [];
const output =
  process.env.TYPEAUDIO_START_ARTIFACTS || "artifacts/start-screen";
await mkdir(output, { recursive: true });
const SECTIONS = [
  "#start-new",
  "#start-recent",
  "#start-examples",
  "#start-open",
];

const path = (p: Page) => {
  const url = new URL(p.url());
  return url.pathname + url.search;
};
const stored = (p: Page) =>
  p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!),
  );
const copies = (p: Page) =>
  p.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.projects.history.v1") || "[]",
      ) as { id: string; name: string }[],
  );
async function ready(p: Page) {
  await p.waitForFunction(
    () =>
      document.querySelector<HTMLButtonElement>("#play")?.disabled === false,
    undefined,
    { timeout: 90000 },
  );
}
async function startScreen(p: Page) {
  for (const section of SECTIONS) await p.locator(section).waitFor();
  assert.equal(await p.locator(".studio-app").count(), 0);
  assert.equal(path(p), "/");
}
async function noHorizontalOverflow(p: Page, label: string) {
  const sizes = await p.evaluate(() =>
    [document.documentElement, document.querySelector(".start-app")]
      .filter((e): e is Element => !!e)
      .map((e) => [e.scrollWidth, e.clientWidth]),
  );
  for (const [scroll, client] of sizes)
    assert.ok(scroll <= client, `${label}: ${scroll}px content in ${client}px`);
}

try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const p = await desktop.newPage();
  p.setDefaultTimeout(30000);
  p.on("pageerror", (error) => errors.push(error.message));

  // The start screen and its four sections.
  await p.goto(base + "/");
  await startScreen(p);
  assert.equal(
    await p.locator("#start-new [data-new-project]").count(),
    4,
    "Four starting points",
  );
  assert.equal(
    await p.locator("#start-examples [data-start-example]").count(),
    1,
    "One example",
  );
  assert.match(await p.locator("#start-recent").innerText(), /Nothing yet/);
  await p.screenshot({ path: `${output}/start-desktop.png` });

  // An example opens in the editor with its id in the URL.
  await p.locator('[data-start-example="unseen-force-wall-hit"]').click();
  await ready(p);
  assert.equal(path(p), "/studio/video/?project=unseen-force-wall-hit");
  assert.equal((await stored(p)).scene.origin.id, "unseen-force-wall-hit");
  await p.locator("#scene-name").fill("Force study, edited");
  await p.locator(".save-state.saved").waitFor();

  // Reload returns to the same project without replacing the edit.
  await p.reload();
  await ready(p);
  assert.equal(path(p), "/studio/video/?project=unseen-force-wall-hit");
  assert.equal(
    await p.locator("#scene-name").inputValue(),
    "Force study, edited",
  );
  assert.ok(
    (await copies(p)).every((c) => c.name !== "Force study, edited"),
    "Reloading does not checkpoint or reopen the example",
  );
  await p.screenshot({
    path: `${output}/editor-header-desktop.png`,
    clip: { x: 0, y: 0, width: 1440, height: 120 },
  });

  // Projects keeps the work in Recent and returns to the start screen.
  await p
    .getByRole("button", { name: "Back to Projects", exact: true })
    .click();
  await startScreen(p);
  const kept = (await copies(p)).find((c) => c.name === "Force study, edited");
  assert.ok(kept, "Leaving the editor checkpoints the work");
  await p.locator(`[data-recent="${kept.id}"]`).waitFor();
  assert.match(
    await p.locator(`[data-recent="${kept.id}"]`).innerText(),
    /17 layers · 13\.2 s/,
  );
  assert.equal(await p.locator("[data-last-document]").count(), 0);

  // A Recent copy opens by its copy id, and reload keeps it.
  await p.getByRole("button", { name: "Open Force study, edited" }).click();
  await ready(p);
  assert.equal(path(p), `/studio/video/?copy=${kept.id}`);
  assert.equal(
    await p.locator("#scene-name").inputValue(),
    "Force study, edited",
  );
  await p.reload();
  await ready(p);
  assert.equal(path(p), `/studio/video/?copy=${kept.id}`);

  // Back also returns to the start screen through the checkpoint.
  await p.goBack();
  await startScreen(p);
  assert.equal(
    (await copies(p)).filter((c) => c.name === "Force study, edited").length,
    1,
    "An unchanged copy is not duplicated",
  );
  // Forward returns to the editor, at the same project.
  await p.goForward();
  await ready(p);
  assert.equal(path(p), `/studio/video/?copy=${kept.id}`);
  await p
    .getByRole("button", { name: "Back to Projects", exact: true })
    .click();
  await startScreen(p);

  // An invalid file is rejected on the start screen and changes nothing.
  const before = await stored(p);
  for (const [name, text, reason] of [
    ["broken.json", "{ not json", /broken\.json was not opened: .*not a JSON/],
    [
      "future.json",
      JSON.stringify({ schema: "typeaudio.project", version: 9, scene: {} }),
      /future\.json was not opened: Use a supported TypeAudio project/,
    ],
  ] as const) {
    await p.locator("#start-project-file").setInputFiles({
      name,
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
    await p.getByRole("alert").filter({ hasText: reason }).waitFor();
    await startScreen(p);
  }
  assert.deepEqual(await stored(p), before);

  // A valid file opens in the editor as the working document.
  await p.locator("#start-project-file").setInputFiles({
    name: "unseen-force-wall-hit.json",
    mimeType: "application/json",
    buffer: await readFile("website/public/projects/unseen-force-wall-hit.json"),
  });
  await ready(p);
  assert.equal(path(p), "/studio/video/");
  assert.equal((await stored(p)).scene.origin.id, "unseen-force-wall-hit");
  await p
    .getByRole("button", { name: "Back to Projects", exact: true })
    .click();
  await startScreen(p);

  // A new project from an existing template.
  await p.locator('[data-new-project="procedural"]').click();
  await p
    .locator("#status")
    .filter({ hasText: "Procedural sound ready" })
    .waitFor({ timeout: 90000 });
  assert.equal(path(p), "/studio/");
  const fresh = await stored(p);
  assert.equal(fresh.scene.cues.length, 0);
  assert.ok(fresh.source.patch.graph, "The procedural template is applied");
  await p
    .getByRole("button", { name: "Back to Projects", exact: true })
    .click();
  await startScreen(p);
  assert.ok((await copies(p)).some((c) => c.name === "Impact graph"));

  // The published direct link still opens the editor directly.
  const linked = await desktop.newPage();
  linked.on("pageerror", (error) => errors.push(error.message));
  await linked.goto(base + "/?project=unseen-force-wall-hit");
  await ready(linked);
  assert.equal(await linked.locator("#start-new").count(), 0);
  assert.equal(path(linked), "/studio/video/?project=unseen-force-wall-hit");
  assert.equal((await stored(linked)).scene.origin.id, "unseen-force-wall-hit");
  // An unknown project in the URL leaves the open work in place.
  await linked.goto(base + "/studio/?project=no-such-project");
  await linked
    .locator("#status")
    .filter({ hasText: "Unknown example project" })
    .waitFor();
  assert.equal((await stored(linked)).scene.origin.id, "unseen-force-wall-hit");
  // /studio/ is the Sound workspace; the URL names the project still open.
  assert.equal(path(linked), "/studio/?project=unseen-force-wall-hit");
  // A retired example's link opens what replaced it, or the start screen.
  await linked.goto(base + "/?project=frieren-red-A");
  await startScreen(linked);
  assert.equal(path(linked), "/");
  await linked.goto(base + "/?project=function-impact");
  await linked
    .locator("#status")
    .filter({ hasText: "Function sound ready" })
    .waitFor({ timeout: 90000 });
  assert.equal(path(linked), "/studio/");
  assert.ok((await stored(linked)).source.patch.functions);
  await linked.close();

  // Phone width: the start screen and the editor header fit without horizontal scrolling.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const m = await phone.newPage();
  m.setDefaultTimeout(30000);
  m.on("pageerror", (error) => errors.push(error.message));
  await m.goto(base + "/");
  await startScreen(m);
  await noHorizontalOverflow(m, "Start screen at 390 px");
  await m.screenshot({ path: `${output}/start-mobile.png` });
  await m.locator("#start-examples").scrollIntoViewIfNeeded();
  await noHorizontalOverflow(m, "Examples at 390 px");
  await m.screenshot({ path: `${output}/start-mobile-examples.png` });
  await m.locator('[data-start-example="unseen-force-wall-hit"]').click();
  await ready(m);
  assert.equal(path(m), "/studio/video/?project=unseen-force-wall-hit");
  assert.ok(
    await m
      .getByRole("button", { name: "Back to Projects", exact: true })
      .first()
      .isVisible(),
  );
  const header = await m.locator(".document-bar").boundingBox();
  assert.ok(header && header.x + header.width <= 390);
  await m.screenshot({
    path: `${output}/editor-header-mobile.png`,
    clip: { x: 0, y: 0, width: 390, height: 140 },
  });
  await m.locator("#leave-project").click();
  await startScreen(m);
  await noHorizontalOverflow(m, "Start screen with Recent at 390 px");

  assert.deepEqual(errors, []);
  console.log(
    "PASS start screen: four sections, example/copy/file/new into the editor with the project in the URL, reload, Projects and Back checkpoint into Recent, invalid files rejected in place, legacy direct link, 390 px layout",
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
