import assert from "node:assert/strict";
import { chromium, type Page, type Locator } from "playwright-core";
import { preview } from "vite";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4191, strictPort: true },
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4191";
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
async function graph(p: Page) {
  return p.evaluate(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.graph,
  );
}
async function count(p: Page, expected: number) {
  await p.waitForFunction(
    (expected) =>
      document.querySelectorAll("[data-graph-node]").length === expected,
    expected,
  );
}
async function undo(p: Page) {
  await p.locator(".graph-surface").focus();
  await p.keyboard.press("Control+z");
}
async function box(node: Locator) {
  const b = await node.boundingBox();
  assert.ok(b);
  return b;
}
async function drag(
  p: Page,
  node: Locator,
  dx: number,
  dy: number,
  cancel = false,
) {
  const b = await box(node);
  await p.mouse.move(b.x + b.width / 2, b.y + 15);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2 + dx, b.y + 15 + dy, { steps: 8 });
  if (cancel) await p.keyboard.press("Escape");
  await p.mouse.up();
}
async function connect(
  p: Page,
  source: Locator,
  target: Locator,
  cancel = false,
) {
  const a = await box(source),
    b = await box(target);
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  if (cancel) await p.keyboard.press("Escape");
  await p.mouse.up();
}
const errors: string[] = [];
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    const Native = Worker;
    (window as any).compileRequests = 0;
    window.Worker = class extends Native {
      compiler: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.compiler = String(url).includes("compiler.worker-");
      }
      postMessage(message: any, options?: any) {
        if (this.compiler) (window as any).compileRequests++;
        super.postMessage(message, options);
      }
    };
  });
  await p.goto(base + "/studio/");
  await p
    .getByRole("button", { name: "+ New procedural sound", exact: true })
    .click();
  await count(p, 4);
  const surface = p.locator(".graph-surface"),
    noise = p.locator('[data-graph-node="noise"]'),
    code = p.locator('[data-graph-node="impact"]');
  const initial = await graph(p);
  // Keyboard search and cancellation never alter the network.
  await surface.focus();
  await p.keyboard.press("Tab");
  await p.getByRole("combobox", { name: "Find a node" }).fill("gain");
  assert.equal(await p.getByRole("dialog").getByRole("option").count(), 1);
  await p.keyboard.press("Escape");
  assert.deepEqual(await graph(p), initial);
  await p.locator("#add-graph-node").click();
  await p.getByRole("combobox", { name: "Find a node" }).fill("gain");
  await p.keyboard.press("Enter");
  await count(p, 5);
  await undo(p);
  await count(p, 4);
  // Box selection spans the first two nodes; Shift-click toggles without losing the group.
  const a = await box(noise),
    b = await box(code);
  await p.mouse.move(a.x - 8, a.y - 12);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width + 6, b.y + b.height + 12, { steps: 8 });
  await p.mouse.up();
  assert.equal(await p.locator(".graph-node.selected").count(), 2);
  const compileCount = await p.evaluate(() => (window as any).compileRequests);
  await drag(p, noise, 35, 45);
  const moved = await graph(p);
  assert.ok(
    Math.abs(
      moved.nodes[1].x -
        moved.nodes[0].x -
        (initial.nodes[1].x - initial.nodes[0].x),
    ) < 1e-6,
  );
  assert.notEqual(moved.nodes[0].y, initial.nodes[0].y);
  await undo(p);
  assert.deepEqual(await graph(p), initial);
  await drag(p, noise, 50, 30, true);
  assert.deepEqual(await graph(p), initial);
  assert.equal(
    await p.evaluate(() => (window as any).compileRequests),
    compileCount,
  );
  await code.locator(".graph-node-title").click({ modifiers: ["Shift"] });
  assert.equal(await p.locator(".graph-node.selected").count(), 1);
  await code.locator(".graph-node-title").click({ modifiers: ["Shift"] });
  assert.equal(await p.locator(".graph-node.selected").count(), 2);
  await surface.focus();
  await p.keyboard.press("Control+d");
  await count(p, 6);
  const copied = await graph(p),
    newCode = copied.nodes.find((n: any) => n.name === "Code copy"),
    newNoise = copied.nodes.find((n: any) => n.name === "Noise copy");
  assert.ok(newCode && newNoise);
  assert.equal(newCode.inputs.input, newNoise.id);
  await p.locator("#add-graph-node").click();
  await p.getByRole("combobox", { name: "Find a node" }).fill("code");
  assert.equal(
    await p
      .getByRole("dialog")
      .getByRole("option")
      .getAttribute("aria-disabled"),
    "true",
  );
  await p.keyboard.press("Enter");
  assert.equal(await p.locator("[data-graph-node]").count(), 6);
  await p.keyboard.press("Escape");
  await p.keyboard.press("Delete");
  await count(p, 4);
  await undo(p);
  await count(p, 6);
  await undo(p);
  await count(p, 4);
  await surface.focus();
  await p.keyboard.press("Control+a");
  assert.equal(await p.locator(".graph-node.selected").count(), 4);
  await p.keyboard.press("Delete");
  await count(p, 1);
  assert.equal((await graph(p)).nodes[0].kind, "output");
  await undo(p);
  await count(p, 4);
  assert.deepEqual(await graph(p), initial);
  // Wire selection is keyboard accessible and can be removed/restored as one edit.
  const wire = p.locator('[data-graph-wire="output:input"]');
  await wire.focus();
  await p.keyboard.press("Delete");
  await p.waitForFunction(
    () =>
      !JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === "output").inputs
        .input,
  );
  await undo(p);
  assert.deepEqual(await graph(p), initial);
  await wire.focus();
  await p.keyboard.press("Enter");
  await p.getByRole("dialog", { name: "Add a node" }).waitFor();
  await p.keyboard.press("Escape");
  const filterBox = await box(p.locator('[data-graph-node="filter"]')),
    outputBox = await box(p.locator('[data-graph-node="output"]'));
  await p.mouse.click(
    (filterBox.x + filterBox.width + outputBox.x) / 2,
    filterBox.y + (50 * filterBox.width) / 190,
    { button: "right" },
  );
  await p.getByRole("menuitem", { name: /^Insert node/ }).click();
  await p.getByRole("combobox", { name: "Find a node" }).fill("gain");
  await p.keyboard.press("Enter");
  await count(p, 5);
  const inserted = await graph(p),
    gain = inserted.nodes.find((n: any) => n.kind === "gain");
  assert.equal(gain.inputs.input, "filter");
  assert.equal(
    inserted.nodes.find((n: any) => n.id === "output").inputs.input,
    gain.id,
  );
  await undo(p);
  await count(p, 4);
  // Reconnection starts at an occupied input and keeps the old wire until commit.
  const input = p.locator(
    '[data-graph-target="output"][data-graph-input="input"]',
  );
  await connect(p, input, p.locator('[data-graph-output="noise"]'), true);
  assert.deepEqual(await graph(p), initial);
  await connect(p, input, p.locator('[data-graph-output="noise"]'));
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.graph.nodes.find((n: any) => n.id === "output").inputs
        .input === "noise",
  );
  await undo(p);
  assert.deepEqual(await graph(p), initial);
  // Invalid targets are marked before release, without sending a compile request.
  const out = await box(p.locator('[data-graph-output="filter"]')),
    target = await box(p.locator('[data-graph-target="impact"]'));
  const beforeInvalid = await p.evaluate(() => (window as any).compileRequests);
  await p.mouse.move(out.x + out.width / 2, out.y + out.height / 2);
  await p.mouse.down();
  await p.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    { steps: 6 },
  );
  assert.match(
    (await p.locator('[data-graph-target="impact"]').getAttribute("class")) ??
      "",
    /incompatible/,
  );
  await p.mouse.up();
  assert.deepEqual(await graph(p), initial);
  assert.equal(
    await p.evaluate(() => (window as any).compileRequests),
    beforeInvalid,
  );
  // Drag a loose cable into space and add a connected processor through search.
  const output = await box(p.locator('[data-graph-output="noise"]')),
    canvas = await box(surface);
  await p.mouse.move(output.x + output.width / 2, output.y + output.height / 2);
  await p.mouse.down();
  await p.mouse.move(canvas.x + 100, canvas.y + canvas.height - 35, {
    steps: 8,
  });
  await p.mouse.up();
  await p.getByRole("combobox", { name: "Find a node" }).fill("lowpass");
  await p.keyboard.press("Enter");
  await count(p, 5);
  const added = (await graph(p)).nodes.find(
    (n: any) => !initial.nodes.some((old: any) => old.id === n.id),
  );
  assert.equal(added.inputs.input, "noise");
  await undo(p);
  await count(p, 4);
  // Arrange is one undoable layout edit, and view changes survive monitor switches.
  await p.getByRole("button", { name: "Arrange", exact: true }).click();
  assert.notDeepEqual(
    (await graph(p)).nodes.map((n: any) => [n.x, n.y]),
    initial.nodes.map((n: any) => [n.x, n.y]),
  );
  await undo(p);
  assert.deepEqual(await graph(p), initial);
  await p.getByRole("button", { name: "Zoom graph in", exact: true }).click();
  const transform = await p.locator(".graph-world").getAttribute("style");
  await p
    .getByRole("button", { name: "Waveform / Spectrum", exact: true })
    .click();
  await p.getByRole("button", { name: "Node network", exact: true }).click();
  await p.waitForTimeout(100);
  assert.equal(
    await p.locator(".graph-world").getAttribute("style"),
    transform,
  );
  const zoomBeforeResize = await p.locator(".graph-zoom").textContent();
  await p.setViewportSize({ width: 1380, height: 960 });
  await p.waitForTimeout(100);
  assert.equal(await p.locator(".graph-zoom").textContent(), zoomBeforeResize);
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.getByRole("button", { name: "Fit all", exact: true }).click();
  await noise.focus();
  await p.keyboard.press("f");
  assert.ok(
    Number((await p.locator(".graph-zoom").textContent())?.replace("%", "")) >=
      100,
  );
  await surface.focus();
  await p.keyboard.press("Home");
  await p.screenshot({
    path: "artifacts/node-workspace-desktop.png",
    fullPage: true,
  });
  await surface.focus();
  await p.keyboard.press("Tab");
  await p.screenshot({
    path: "artifacts/node-picker-desktop.png",
    fullPage: true,
  });
  await p.keyboard.press("Escape");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole("button", { name: "Fit all", exact: true }).click();
  await p.locator("#add-graph-node").click();
  const dialog = await box(
    p.getByRole("dialog", { name: "Add a node", exact: true }),
  );
  assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= 391);
  await p.getByRole("combobox", { name: "Find a node" }).fill("noise");
  await p.keyboard.press("Enter");
  await count(p, 5);
  await p.screenshot({
    path: "artifacts/node-workspace-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await p.locator(".graph-recipes summary").click();
  await p.getByRole("button", { name: "Tone recipe", exact: true }).click();
  await p.locator('[data-graph-node="pitch"]').waitFor();
  assert.equal(
    await p
      .locator(".graph-node.primary-selection")
      .getAttribute("data-graph-node"),
    "pitch",
  );
  assert.equal(await p.locator(".graph-recipes").getAttribute("open"), null);
  for (const width of [390, 320]) {
    await p.setViewportSize({ width, height: 844 });
    const panel = await box(p.locator(".graph-network")),
      footer = await box(p.locator(".graph-footer"));
    const zoomButton = await box(
      p.getByRole("button", { name: "Zoom graph in", exact: true }),
    );
    assert.ok(
      footer.y + footer.height <= panel.y + panel.height,
      "Canvas help must not be clipped by the responsive panel",
    );
    assert.ok(
      zoomButton.x + zoomButton.width <= width,
      "View controls remain available on narrow screens",
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS node workspace: search/cancel, marquee and group gestures, internal-wire duplication, Undo, wire deletion/insertion, bidirectional reconnection/cancellation, invalid-target feedback, connected creation, layout/compile reuse, view retention, keyboard framing and mobile bounds",
  );
} finally {
  await browser.close();
  await server.close();
}
