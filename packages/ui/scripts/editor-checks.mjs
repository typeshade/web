import assert from "node:assert/strict";

// A real language-worker round trip verifies the boundary between the reader's
// fragment file and the compiler's inserted vertex prelude.
export async function checkEditorCoordinates(page) {
  const source = `"use typeshade"

class Color {
  @location(0) color: vec4
}

@fragment
export function fs(@location(0) uv: vec2): Color {
  const stripe = fract(uv.x * 8.);
  return { color: vec4(stripe, uv.y, 1. - stripe, 1.) };
}
`;
  await page.evaluate(
    (text) => window.monaco.editor.getEditors()[0].getModel().setValue(text),
    source.replace("8.", '"eight"'),
  );
  await page.waitForFunction(
    () =>
      window.monaco.editor
        .getModelMarkers({})
        .some(
          (marker) =>
            marker.owner === "typeshade" && marker.startLineNumber === 9,
        ),
    undefined,
    { timeout: 60000 },
  );
  const lines = await page.evaluate(() =>
    window.monaco.editor
      .getModelMarkers({})
      .map((marker) => marker.startLineNumber),
  );
  assert.ok(
    lines.every((line) => line <= source.split("\n").length),
    "Diagnostics stay in the reader’s source",
  );
  await page.evaluate(
    (text) => window.monaco.editor.getEditors()[0].getModel().setValue(text),
    source,
  );
  await page.waitForFunction(
    () => window.monaco.editor.getModelMarkers({}).length === 0,
    undefined,
    { timeout: 60000 },
  );
  await page.evaluate(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.setPosition({ lineNumber: 9, column: 10 });
    editor.revealLineInCenter(9);
    editor.focus();
    editor.trigger("check", "editor.action.showHover", null);
  });
  await page.waitForFunction(
    () => document.querySelector(".monaco-hover")?.textContent.includes("f32"),
    undefined,
    { timeout: 30000 },
  );
  await page.keyboard.press("Escape");
  await page.locator('[data-target="reflection"]').click();
  assert.ok(
    (await page.locator("[data-reflection]").textContent()).includes("fs"),
    "Reflection is rendered after an edit",
  );

  // File models and pass order now live in the workspace controller. Exercise a
  // nested import through add/rename/delete instead of only testing string helpers.
  await page.locator("[data-new-file]").click();
  const input = page.locator("[data-file-tabs] input");
  await input.fill("lib/palette");
  await input.press("Enter");
  await page.locator('[data-file-tab="lib/palette.shade.ts"]').waitFor();
  await page.evaluate(() =>
    window.monaco.editor
      .getEditors()[0]
      .getModel()
      .setValue(
        '"use typeshade";\nexport function ramp(x: f32): f32 { return fract(x * 8.); }',
      ),
  );
  await page.locator('[data-file-tab="main.shade.ts"]').click();
  const importing = source
    .replace(
      '"use typeshade"',
      '"use typeshade"\nimport { ramp } from "./lib/palette.shade.ts"',
    )
    .replace("fract(uv.x * 8.)", "ramp(uv.x)");
  await page.evaluate(
    (text) => window.monaco.editor.getEditors()[0].getModel().setValue(text),
    importing,
  );
  const libraryTab = page.locator('[data-file-tab="lib/palette.shade.ts"]');
  await libraryTab.focus();
  await libraryTab.press("F2");
  await page.locator("[data-rename-file]").fill("lib/colors");
  await page.locator("[data-rename-file]").press("Enter");
  await page.locator('[data-file-tab="lib/colors.shade.ts"]').waitFor();
  assert.ok(
    await page.evaluate(() =>
      window.monaco.editor
        .getEditors()[0]
        .getModel()
        .getValue()
        .includes("./lib/colors.shade.ts"),
    ),
    "Renaming an imported file updates the main document",
  );
  assert.ok(
    await page.evaluate(
      () =>
        !window.monaco.editor
          .getModels()
          .some((model) =>
            model.uri.toString().endsWith("/lib/palette.shade.ts"),
          ),
    ),
    "The renamed Monaco model is disposed",
  );

  // A real worker-pool draw verifies that the moved worker URL is bundled by Vite.
  await page.locator('[data-target="result"]').click();
  await page.locator("[data-engine]").selectOption("cpu");
  await page.locator("[data-resolution]").selectOption("64");
  await page.waitForFunction(
    () => {
      const note = document.querySelector("[data-canvas-note]");
      return Number(note?.dataset.px) > 0 && Number(note?.dataset.workers) > 0;
    },
    undefined,
    { timeout: 60000 },
  );
  await page.waitForFunction(
    () => {
      const root = document.querySelector("[data-playground]");
      return (
        root?.dataset.version ===
          document.querySelector("[data-gpu-frame]")?.dataset.settled &&
        !root?.classList.contains("has-errors")
      );
    },
    undefined,
    { timeout: 60000 },
  );
  assert.equal(
    await page.locator("[data-canvas]").evaluate((canvas) => canvas.width),
    64,
  );
  await page.locator("[data-play]").click();
  assert.equal(
    await page.locator("[data-play]").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("[data-restart]").click();
  await page.locator("[data-play]").click();

  // host.ts remains inert until the explicit Run action, and Stop removes its sandbox.
  await page.locator('[data-file-tab="host.ts"]').click();
  await page.waitForFunction(
    () => window.monaco.editor.getEditors()[0].getModel().getValue().length > 0,
    undefined,
    { timeout: 60000 },
  );
  await page.evaluate(() =>
    window.monaco.editor
      .getEditors()[0]
      .getModel()
      .setValue(
        'export function run() { console.log("workspace-run"); return 42; }',
      ),
  );
  assert.equal(await page.locator("[data-host-frame]").count(), 0);
  await page.locator("[data-run-host]").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-console]")
        ?.textContent.includes("workspace-run"),
    undefined,
    { timeout: 60000 },
  );
  assert.equal(await page.locator("[data-host-frame]").count(), 1);
  await page.locator("[data-run-host]").click();
  assert.equal(await page.locator("[data-host-frame]").count(), 0);
  await page.locator('[data-file-tab="main.shade.ts"]').click();
  await page.evaluate(
    (text) => window.monaco.editor.getEditors()[0].getModel().setValue(text),
    source,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".file-pair")
    .filter({ has: page.locator('[data-file-tab="lib/colors.shade.ts"]') })
    .locator(".file-close")
    .click();
  assert.equal(
    await page.locator('[data-file-tab="lib/colors.shade.ts"]').count(),
    0,
  );
}
