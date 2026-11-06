import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { preview } from "vite";
import { writeCode } from "./check-code-input.ts";

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4194, strictPort: true },
});
const directory = await mkdtemp(join(tmpdir(), "typeaudio-feedback-"));
let browser: Browser | undefined;
try {
  browser = await chromium.launch({
    executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1500, height: 950 },
    acceptDownloads: true,
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4194");
  await page.getByRole("button", { name: "File", exact: true }).click();
  assert.equal(
    await page.locator("#export-graph-reproduction").isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "+ New procedural sound", exact: true })
    .click();
  await page.locator('[data-graph-node="impact"]').waitFor({ timeout: 30000 });
  await page
    .getByRole("spinbutton", { name: "Pitch value", exact: true })
    .fill("440");
  await page.locator("#editor-main").focus();
  const applied = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.graph,
  );
  await page.locator('[data-graph-node="impact"]').click();
  await writeCode(page, "out = 0.123;");
  await page.getByRole("button", { name: "File", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.locator("#export-graph-reproduction").click();
  const file = join(directory, "reproduction.json");
  await (await pending).saveAs(file);
  const snapshot = JSON.parse(await readFile(file, "utf8"));
  assert.equal(snapshot.format, "typeaudio.graph-reproduction");
  assert.equal(snapshot.capture, "snapshot");
  assert.deepEqual(
    snapshot.graph,
    applied,
    "Unapplied code drafts do not enter a graph snapshot",
  );
  assert.equal(snapshot.graph.parameters[0].value, 440);
  for (const key of ["web", "typeaudio", "typeshade"])
    assert.match(snapshot.versions[key], /^[a-f0-9]{40}$/);
  assert.equal(
    snapshot.versions.web,
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  );
  assert.equal(
    snapshot.versions.typeaudio,
    execFileSync(
      "git",
      ["-C", "../../sources/typeaudio", "rev-parse", "HEAD"],
      { encoding: "utf8" },
    ).trim(),
  );
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.ok(
    pkg.devDependencies.typeshade.includes(snapshot.versions.typeshade),
  );
  assert.deepEqual(snapshot.events, []);
  assert.equal(snapshot.backend, "cpu");
  assert.ok(snapshot.environment.userAgent.includes("Chrome"));
  assert.equal(snapshot.media, undefined);
  const reportPath = join(directory, "replay.json");
  execFileSync(
    "bun",
    ["../../sources/typeaudio/scripts/feedback.ts", file, "--out", reportPath],
    { stdio: "pipe" },
  );
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.results[0].warm.invalidSamples, 0);
  assert.ok(report.results[0].warm.peak > 0.01);
  assert.equal(report.results[0].cold.pcmHash, report.results[0].warm.pcmHash);
  assert.equal(report.results[0].warm.frames, snapshot.frames);
  assert.deepEqual(errors, []);
  console.log(
    "Feedback browser passed: applied graph and version tuple exported, then replayed by the engine without UI.",
  );
} finally {
  await browser?.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
  await rm(directory, { recursive: true, force: true });
}
