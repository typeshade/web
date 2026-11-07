import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { preview } from "vite";
import { readCode, writeCode } from "./check-code-input.ts";

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4198, strictPort: true },
});
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  p.setDefaultTimeout(30000);
  const errors: string[] = [];
  p.on("pageerror", (error) => errors.push(error.message));
  await p.goto("http://127.0.0.1:4198");
  await p
    .getByRole("button", { name: "+ New procedural sound", exact: true })
    .click();
  await writeCode(p, "out = input * 0.25;");
  await p.locator('[data-graph-node="noise"] .graph-node-title').click();
  assert.equal(
    await p.locator("#apply-graph-code").isVisible(),
    false,
    "Selecting Noise must not leave another node's editable Code body active",
  );
  await p.locator(".builtin-node-context").waitFor();
  assert.match(await p.locator(".builtin-node-context").innerText(), /Noise/);
  assert.match(await p.locator(".builtin-node-context").innerText(), /Seed/);
  await p.locator("#code-tab-node-impact").click();
  assert.equal(
    await readCode(p),
    "out = input * 0.25;",
    "Inspecting another node preserves the draft",
  );
  assert.equal(
    await p
      .locator(".graph-node.primary-selection")
      .getAttribute("data-graph-node"),
    "impact",
  );
  assert.match(
    await p.locator(".code-context summary").innerText(),
    /Noise.*input.*out.*Lowpass/s,
  );
  await p.locator(".code-context summary").click();
  assert.match(await p.locator(".code-bindings").innerText(), /p0.*Pitch/s);
  await p.locator('.code-bindings [data-code-target="noise"]').click();
  assert.equal(await p.locator("#apply-graph-code").isVisible(), false);
  await p.locator("#code-tab-node-impact").click();
  // Generated output is an explicit inspection view. A new node selection exits it.
  await p.locator("#code-tab-generated").click();
  await p.locator('[data-graph-node="impact"] .graph-node-title').click();
  await p.locator('#code-tab-node-impact[aria-selected="true"]').waitFor();
  assert.equal(await readCode(p), "out = input * 0.25;");
  // Real TypeShade completion retains its type and receives actual graph binding help.
  await writeCode(p, "out = p");
  await p.keyboard.press("Control+Space");
  await p.locator(".suggest-widget.visible").waitFor();
  assert.match(await p.locator(".suggest-widget.visible").innerText(), /Pitch/);
  await p.keyboard.press("Escape");
  await writeCode(p, "out = input * 0.25;");
  await p.locator("#apply-graph-code").click();
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === "impact").code ===
      "out = input * 0.25;",
  );
  await p.locator("#live-start").click();
  await p.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) > 9600,
  );
  await p.locator("#live-stop").click();
  await p.locator('[data-graph-node="filter"] .graph-node-title').click();
  await p
    .locator('[data-graph-node="noise"] .graph-node-title')
    .click({ modifiers: ["Shift"] });
  assert.equal(await p.locator("#apply-graph-code").isVisible(), false);
  assert.match(
    await p.locator(".builtin-node-context").innerText(),
    /2 nodes selected/,
  );
  await p.locator("#code-tab-node-impact").click();
  await mkdir("artifacts/node-code", { recursive: true });
  await p.screenshot({ path: "artifacts/node-code/linked-code.png" });
  await p.setViewportSize({ width: 390, height: 844 });
  await p
    .getByRole("navigation", { name: "Editor tasks" })
    .getByRole("button", { name: "Code / FX", exact: true })
    .click();
  assert.equal(await readCode(p), "out = input * 0.25;");
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await p.screenshot({ path: "artifacts/node-code/linked-code-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS node/code relationship: selection scope, built-in configuration, preserved drafts, real connections, named binding help, generated-view exit, multi-selection and live audio",
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
