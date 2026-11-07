import assert from "node:assert/strict";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
import { readCode, writeCode, codeInput } from "./check-code-input.ts";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4192, strictPort: true },
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4192";
const browser = await chromium.launch({
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
const errors: string[] = [];
async function applied(p: Page, id = "impact") {
  return p.evaluate(
    (id) =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === id)?.code,
    id,
  );
}
async function waitApplied(p: Page, text: string, id = "impact") {
  await p.waitForFunction(
    ({ text, id }) =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === id)?.code === text,
    { text, id },
  );
}
async function command(p: Page, name: string) {
  await p.keyboard.press("Control+Shift+p");
  await p.getByRole("combobox", { name: "Search commands" }).fill(name);
  await p.keyboard.press("Enter");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
}
try {
  const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  p.setDefaultTimeout(30000);
  p.on("pageerror", (error) => {
    errors.push(error.message);
    console.log(error.stack);
  });
  p.on("dialog", (dialog) => dialog.accept());
  await p.addInitScript(() => {
    const Native = Worker;
    (window as any).compileDelay = 0;
    window.Worker = class extends Native {
      compiler: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.compiler = String(url).includes("compiler.worker-");
      }
      postMessage(message: any, options?: any) {
        const delay = this.compiler ? (window as any).compileDelay : 0;
        if (delay) {
          (window as any).compileDelay = 0;
          setTimeout(() => super.postMessage(message, options), delay);
        } else super.postMessage(message, options);
      }
    };
  });
  await p.goto(base);
  assert.equal(
    await p.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((r) => r.name.includes("loadMonaco-")),
    ),
    false,
    "Ordinary sounds do not load Monaco",
  );
  await p.keyboard.press("Control+p");
  await p
    .getByText("Create a procedural sound to open its Code documents.", {
      exact: true,
    })
    .waitFor();
  await p
    .getByRole("button", { name: "Close command palette", exact: true })
    .focus();
  await p.keyboard.press("Enter");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.keyboard.press("Control+p");
  await p.keyboard.press("Escape");
  await command(p, "New procedural sound");
  await p.locator('[data-graph-node="impact"]').waitFor();
  await codeInput(p);
  const original = await applied(p);
  assert.equal(await readCode(p), original);
  await writeCode(p, "out = input * 0.3;");
  assert.equal(await applied(p), original, "Typing alone never changes sound");
  await p.locator("#code-tab-generated").click();
  assert.ok((await readCode(p)).includes("graphBlock"));
  await p.keyboard.insertText("do not replace generated source");
  assert.ok(
    (await readCode(p)).includes("graphBlock"),
    "Generated source is read only",
  );
  await p.locator("#code-tab-node-impact").click();
  assert.equal(await readCode(p), "out = input * 0.3;", "Tabs preserve drafts");
  await p.getByRole("button", { name: "Picture", exact: true }).click();
  await p.getByRole("button", { name: "Sound", exact: true }).click();
  assert.equal(
    await readCode(p),
    "out = input * 0.3;",
    "Workspace switches preserve unapplied code",
  );
  // Monaco Undo is local to its document, independent from the graph's history.
  await p.keyboard.press("Control+End");
  await p.keyboard.insertText("\n// local edit");
  await p.keyboard.press("Control+z");
  assert.equal(await applied(p), original);
  assert.equal(await p.locator("[data-graph-node]").count(), 4);
  await writeCode(p, "out = input * 0.3;");
  await p.keyboard.press("Control+Enter");
  await waitApplied(p, "out = input * 0.3;");
  // Type ahead while compilation is delayed; only the submitted snapshot gets applied.
  await p.evaluate(() => {
    (window as any).compileDelay = 600;
  });
  await writeCode(p, "out = input * 0.4;");
  await p.keyboard.press("Control+Enter");
  await writeCode(p, "out = input * 0.5;");
  await waitApplied(p, "out = input * 0.4;");
  assert.equal(await readCode(p), "out = input * 0.5;");
  await p.locator("#undo").click();
  await p
    .getByText("The applied code changed. Your draft is preserved.", {
      exact: true,
    })
    .waitFor();
  assert.equal(await readCode(p), "out = input * 0.5;");
  assert.ok(await p.locator("#apply-graph-code").isDisabled());
  await p.getByRole("button", { name: "Keep my draft", exact: true }).click();
  await p.locator("#apply-graph-code").click();
  await waitApplied(p, "out = input * 0.5;");
  await command(p, "Add Code node");
  await p.waitForFunction(
    () => document.querySelectorAll('[role="tab"]').length === 3,
  );
  const second = await p.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find(
        (n: any) => n.kind === "code" && n.id !== "impact",
      ).id,
  );
  await writeCode(p, "out = input * 0.7;");
  await p.locator("#code-tab-node-impact").click();
  await writeCode(p, "out = input * 0.6;");
  await p.locator(`[id="code-tab-node-${second}"]`).click();
  assert.equal(await readCode(p), "out = input * 0.7;");
  await p.locator("#code-tab-node-impact").click();
  assert.equal(await readCode(p), "out = input * 0.6;");
  await p.locator(`[data-graph-node="${second}"]`).focus();
  await p.keyboard.press("Delete");
  await p.waitForFunction(
    () => document.querySelectorAll('[role="tab"]').length === 2,
  );
  await p.locator("#undo").click();
  await p.locator(`[id="code-tab-node-${second}"]`).click();
  assert.equal(
    await readCode(p),
    "out = input * 0.7;",
    "Deleting and undoing a node preserves its draft",
  );
  await p.locator("#code-tab-node-impact").click();
  await codeInput(p);
  await p.keyboard.press("Control+End");
  await p.keyboard.press("ArrowLeft");
  const position = await p.locator(".code-position span").first().textContent();
  await p.locator("#code-tab-generated").click();
  await p.locator("#code-tab-node-impact").click();
  await p.waitForFunction(
    (position) =>
      document.querySelector(".code-position span")?.textContent === position,
    position,
    { timeout: 5000 },
  );
  assert.equal(
    await p.locator(".code-position span").first().textContent(),
    position,
    "Each document retains cursor position",
  );
  await codeInput(p);
  await p.keyboard.press("Control+Shift+p");
  await p
    .getByRole("combobox", { name: "Search commands" })
    .fill("Add Code node");
  assert.equal(
    await p
      .getByRole("dialog")
      .getByRole("option")
      .getAttribute("aria-disabled"),
    "true",
  );
  await p.keyboard.press("Enter");
  assert.ok(
    await p.getByRole("dialog").isVisible(),
    "Disabled commands cannot run",
  );
  await p.keyboard.press("Escape");
  assert.ok(
    await p
      .locator("#graph-code textarea.inputarea")
      .evaluate((el) => el === document.activeElement),
    "Escape restores editor focus",
  );
  await p.keyboard.press("Control+p");
  await p
    .getByRole("combobox", { name: "Search code documents" })
    .fill("Generated");
  await p.keyboard.press("Enter");
  await p.locator('#code-tab-generated[aria-selected="true"]').waitFor();
  await p.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Generated TypeShade",
  );
  await p.locator("#code-tab-node-impact").click();
  // Find and completion are editor-native; no browser dialogs or graph shortcuts.
  await codeInput(p);
  await p.keyboard.press("Control+f");
  await p.locator(".monaco-editor .find-widget.visible").waitFor();
  await p.keyboard.press("Escape");
  await writeCode(p, "out = cla");
  await p.keyboard.press("Control+Space");
  await p.locator(".suggest-widget.visible").waitFor();
  await p.keyboard.press("Escape");
  await writeCode(p, "while (true) {}");
  await p.keyboard.press("Control+Enter");
  await p.locator(".graph-code-status").filter({ hasText: "Loops" }).waitFor();
  await p.locator(".squiggly-error").first().waitFor();
  assert.equal(await applied(p), "out = input * 0.5;");
  await p.getByRole("button", { name: "Revert draft", exact: true }).click();
  await p.locator(".squiggly-error").waitFor({ state: "hidden" });
  await command(p, "Code beside graph");
  await p.locator(".code-layout-right").waitFor();
  const viewer = await p.locator(".viewer-region").boundingBox(),
    dock = await p.locator(".dock-region").boundingBox();
  assert.ok(
    viewer &&
      dock &&
      dock.x > viewer.x + viewer.width - 2 &&
      Math.abs(dock.y - viewer.y) < 2,
  );
  const splitter = p.getByRole("separator", {
    name: "Resize code editor",
    exact: true,
  });
  const before = Number(await splitter.getAttribute("aria-valuenow"));
  await splitter.focus();
  await p.keyboard.press("ArrowLeft");
  assert.equal(
    Number(await splitter.getAttribute("aria-valuenow")),
    before + 10,
  );
  await p.getByRole("button", { name: "Fit all", exact: true }).click();
  await p.screenshot({
    path: "artifacts/code-workspace-desktop.png",
    fullPage: true,
  });
  await p.keyboard.press("Control+Shift+p");
  await p.getByRole("combobox", { name: "Search commands" }).fill("code");
  await p.screenshot({
    path: "artifacts/code-command-palette.png",
    fullPage: true,
  });
  await p.keyboard.press("Escape");
  await p
    .getByRole("button", { name: "Focus code editor", exact: true })
    .click();
  await p.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "TypeShade node code",
  );
  assert.equal(await p.locator(".viewer-region").isVisible(), false);
  assert.ok(await p.locator("#graph-code").isVisible());
  await p
    .getByRole("button", { name: "Code below graph", exact: true })
    .click();
  assert.ok(await p.locator(".graph-surface").isVisible());
  await p
    .getByRole("button", { name: "Code beside graph", exact: true })
    .click();
  await p.reload();
  await p.locator(".code-layout-right").waitFor();
  assert.equal(
    Number(await splitter.getAttribute("aria-valuenow")),
    before + 10,
    "Split size persists",
  );
  for (const width of [390, 320]) {
    await p.setViewportSize({ width, height: 844 });
    await p
      .getByRole("navigation", { name: "Editor tasks" })
      .getByRole("button", { name: "Code / FX", exact: true })
      .click();
    await p.locator(".code-layout-bottom").waitFor();
    assert.equal(
      await p
        .getByRole("button", { name: "Code beside graph", exact: true })
        .isDisabled(),
      true,
    );
    await codeInput(p);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No horizontal overflow at ${width}`,
    );
    const panel = await p.locator("#graph-code").boundingBox();
    assert.ok(panel && panel.height >= 90 && panel.width > 240);
  }
  await p.screenshot({
    path: "artifacts/code-workspace-mobile.png",
    fullPage: true,
  });
  await p
    .getByRole("button", { name: "Open command palette", exact: true })
    .click();
  await p
    .getByRole("combobox", { name: "Search commands" })
    .fill("Reset layout");
  await p.keyboard.press("Enter");
  await p.setViewportSize({ width: 1680, height: 1050 });
  await p.locator(".code-layout-bottom").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS code workspace: lazy Monaco, node document buffers, generated source, editor-local Undo/find/completion, apply/type-ahead/conflicts/diagnostics, commands/quick open/focus, persistent split layout and responsive bounds",
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
