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
}
