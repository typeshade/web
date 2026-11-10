import assert from "node:assert/strict";

// A real language-worker round trip verifies the boundary between the reader's
// fragment file and the compiler's inserted vertex prelude. The sources are written in the
// entry form of compiler change 0111 (stage calls and attribute types): the decorated form
// draws a TS8028 warning marker, and the check waits for a file with no marker.
export async function checkEditorCoordinates(page) {
  const source = `"use typeshade"

interface Color {
  color: location<0, vec4>
}

// Eight stripes across the canvas.
export const fs = fragment(function fs(uv: location<0, vec2>): Color {
  const stripe = fract(uv.x * 8.);
  return { color: vec4(stripe, uv.y, 1. - stripe, 1.) };
});
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

  // The fragment entry reads the vertex prelude's `uv`, which no host can call (Rule 8.24), so
  // the site's runner draws the Result tab (apps/typeshade/docs/playground-one-runtime.md,
  // Decision 1, reversed on 2026-11-10). A real worker-pool draw verifies that the moved worker
  // URL is bundled by Vite.
  await page.locator('[data-target="result"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-playground]")?.dataset.result === "site",
    undefined,
    { timeout: 60000 },
  );
  assert.ok(await page.locator("[data-transport]").isVisible());
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
        root?.dataset.result === "site" &&
        root.dataset.version ===
          document.querySelector("[data-gpu-frame]")?.dataset.settled &&
        !root.classList.contains("has-errors")
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

export const main = fragment(function main(p: builtin<"position", vec4>): vec4 {
  return vec4(fract(p.x / 32.), 0.5, 0.5, 1.);
});
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
  // Back on a module no host can call, the frame goes and the site's runner draws again, on
  // the CPU canvas the engine picker still names.
  await page.waitForFunction(
    () => {
      const root = document.querySelector("[data-playground]");
      return (
        root?.dataset.result === "site" &&
        document.querySelectorAll("[data-host-frame]").length === 0 &&
        root.dataset.version ===
          document.querySelector("[data-gpu-frame]")?.dataset.settled
      );
    },
    undefined,
    { timeout: 60000 },
  );
  assert.ok(await page.locator("[data-transport]").isVisible());
  assert.ok(await page.locator("[data-canvas]").isVisible());
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
