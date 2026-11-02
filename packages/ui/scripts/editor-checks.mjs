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

  // Switch during Monaco's delayed occurrence highlight, before its 50ms timer
  // runs. Older Monaco versions rejected the disposed timer without a handler.
  await page.evaluate(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.focus();
    editor.setPosition({ lineNumber: 2, column: 3 });
    document.querySelector('[data-file-tab="main.shade.ts"]').click();
    editor.setPosition({ lineNumber: 3, column: 2 });
    document.querySelector('[data-file-tab="lib/colors.shade.ts"]').click();
  });

  // The fragment entry reads the vertex prelude's `uv`, which no host can call yet (Rule 8.24),
  // so the Result tab draws nothing and says why (apps/typeshade/docs/playground-one-runtime.md,
  // Decision 1).
  await page.locator('[data-target="result"]').click();
  await page.waitForFunction(
    () => {
      const root = document.querySelector("[data-playground]");
      return (
        root?.dataset.result === "none" &&
        root.dataset.version ===
          document.querySelector("[data-gpu-frame]")?.dataset.settled &&
        !root.classList.contains("has-errors")
      );
    },
    undefined,
    { timeout: 60000 },
  );
  assert.ok(await page.locator("[data-result-none]").isVisible());
  assert.ok(await page.locator("[data-transport]").isHidden());

  // For a module no host can call, host.ts runs only on the explicit Run action, and Stop
  // removes its sandbox.
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

  // A fragment entry that reads only its position is one a host can call, so the Result tab is
  // host.ts's frame, started by the page with no click (phase 2 of the same record).
  await page.locator('[data-file-tab="main.shade.ts"]').click();
  await page.evaluate(
    (text) => window.monaco.editor.getEditors()[0].getModel().setValue(text),
    `"use typeshade"

@fragment
export function main(@builtin("position") p: vec4): vec4 {
  return vec4(fract(p.x / 32.), 0.5, 0.5, 1.);
}
`,
  );
  await page.waitForFunction(
    () =>
      document.querySelector("[data-playground]")?.dataset.result === "host" &&
      document.querySelectorAll("[data-host-frame]").length === 1,
    undefined,
    { timeout: 60000 },
  );
  assert.equal(
    await page.locator("[data-host-frame]").getAttribute("sandbox"),
    "allow-scripts",
  );
  await page.evaluate(
    (text) => window.monaco.editor.getEditors()[0].getModel().setValue(text),
    source,
  );
  await page.waitForFunction(
    () =>
      document.querySelector("[data-playground]")?.dataset.result === "none" &&
      document.querySelectorAll("[data-host-frame]").length === 0,
    undefined,
    { timeout: 60000 },
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
