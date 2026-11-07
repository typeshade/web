import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium, type Page } from "playwright-core";
import { preview } from "vite";
import { readCode, writeCode } from "./check-code-input.ts";

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4201, strictPort: true },
});
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors: string[] = [],
  observations: Record<string, unknown> = {};
const directory = "artifacts/function-authoring";
await mkdir(directory, { recursive: true });
const stored = (p: Page) =>
  p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!),
  );
const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
p.setDefaultTimeout(30000);
p.on("pageerror", (error) => errors.push(error.message));
const graph = async () => (await stored(p)).source.patch.functions;
async function idle(page = p) {
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".function-network-status")
        ?.textContent?.includes("Preparing"),
  );
}
async function input(page: Page, name: string, value: number) {
  const target = page.getByRole("spinbutton", { name, exact: true });
  await target.fill(String(value));
  await target.blur();
}
async function download(page: Page, selector: string) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const result = await pending;
  assert.equal(await result.failure(), null);
  return readFile((await result.path())!);
}
async function save(page = p) {
  await page.getByRole("button", { name: "File", exact: true }).click();
  return download(page, "#save-project");
}
async function wav() {
  await p.locator("#mode-render").click();
  await p.locator("#render").click();
  const bytes = await download(p, "#download");
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.readUInt32LE(24), 48000);
  let energy = 0;
  for (let i = 44; i < bytes.length; i += 2)
    energy += bytes.readInt16LE(i) ** 2;
  assert.ok(energy > 0, "The authored source renders non-silent PCM");
  return createHash("sha256").update(bytes).digest("hex");
}
async function select(id: string) {
  await p
    .locator(`[data-function-node="${id}"] .function-node-heading`)
    .click();
}
async function task(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Editor tasks" })
    .getByRole("button", { name, exact: true })
    .click();
}
try {
  await p.addInitScript(() => {
    const Native = Worker,
      w = window as any;
    window.Worker = class extends Native {
      postMessage(message: any, options?: any) {
        if (message.synchronize && w.holdFunctionCompile) {
          w.holdFunctionCompile = false;
          w.releaseFunctionCompile = () => super.postMessage(message, options);
        } else super.postMessage(message, options);
      }
    };
  });
  await p.goto("http://127.0.0.1:4201");
  await p
    .getByRole("button", { name: "+ New function sound", exact: true })
    .click();
  await p.locator('[data-function-node="body"]').waitFor();
  await p.locator('#graph-code[data-ready="true"]').waitFor();
  assert.equal(await p.locator("[data-function-node]").count(), 3);
  await p.locator("#live-start").click();
  await p.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) > 9600,
  );
  await input(p, "Body pitch control", 320);
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.functions.parameters[0].value === 320,
  );
  const frames = await p.locator("#live-indicator").getAttribute("data-frames");
  await p.waitForFunction(
    (before) =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) >
      Number(before) + 4800,
    frames,
  );
  await p.locator("#live-stop").click();
  const originalHash = await wav();
  console.log("Live controls and non-silent render passed.");

  // Dragging creates one undo entry; keyboard movement and context actions remain available.
  const beforeLayout = (await stored(p)).source.patch.functionLayout;
  const node = p.locator('[data-function-node="body"]');
  const box = await node.locator(".function-node-heading").boundingBox();
  assert.ok(box);
  await p.mouse.move(box.x + 70, box.y + 15);
  await p.mouse.down();
  await p.mouse.move(box.x + 120, box.y + 40, { steps: 8 });
  await p.mouse.up();
  assert.notDeepEqual(
    (await stored(p)).source.patch.functionLayout.body,
    beforeLayout.body,
  );
  assert.equal(
    await p.locator("#download").isEnabled(),
    true,
    "Canvas motion retains the rendered sound",
  );
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual((await stored(p)).source.patch.functionLayout, beforeLayout);
  await node.focus();
  await p.keyboard.press("ArrowRight");
  assert.equal(
    (await stored(p)).source.patch.functionLayout.body.x,
    beforeLayout.body.x + 5,
  );
  await node.click({ button: "right" });
  await p.getByRole("menuitem", { name: /Duplicate instance/ }).click();
  await p.waitForFunction(
    () => document.querySelectorAll("[data-function-node]").length === 4,
  );
  await idle();
  const duplicate = (await graph()).nodes.at(-1).id;
  assert.equal((await graph()).nodes.at(-1).definition, "resonator");
  await p
    .locator(`[data-function-output="${duplicate}"]`)
    .dragTo(
      p.locator('[data-function-input="level"][data-function-port="in"]'),
    );
  await idle();
  assert.equal(
    (await graph()).nodes.find((n: any) => n.id === "level").inputs.in.node,
    duplicate,
  );
  // A cycle is rejected without replacing the working graph.
  const beforeCycle = await graph();
  await p.locator('[data-function-output="level"]').click();
  await p
    .locator(`[data-function-input="${duplicate}"][data-function-port="in"]`)
    .click();
  await p
    .getByRole("alert")
    .filter({ hasText: /algebraic cycle/ })
    .first()
    .waitFor();
  assert.deepEqual(await graph(), beforeCycle);
  await p.locator('[data-function-output="body"]').click();
  await p
    .locator('[data-function-input="level"][data-function-port="in"]')
    .click();
  await idle();
  await p.locator(`[data-function-node="${duplicate}"]`).focus();
  await p.keyboard.press("Delete");
  await p.waitForFunction(
    () => document.querySelectorAll("[data-function-node]").length === 3,
  );
  console.log(
    "Movement, undo, duplicate, typed wiring and cycle rejection passed.",
  );

  await select("level");
  const source = await readCode(p);
  assert.match(source, /import.*math/);
  let changed = source
    .replace("strength: f32", "strength: f32, offset: f32")
    .replace("input * strength", "input * strength * 0.5 + offset");
  await writeCode(p, changed);
  changed = await readCode(p);
  await select("noise");
  await select("level");
  assert.equal(await readCode(p), changed);
  await p.locator("#apply-function-code").click();
  await p
    .locator('[data-function-input="level"][data-function-port="offset"]')
    .waitFor();
  await idle();
  assert.equal(
    (await graph()).definitions.find((d: any) => d.id === "gain").inputs.offset
      .role,
    "control",
  );
  const changedHash = await wav();
  assert.notEqual(changedHash, originalHash);
  observations.wav = { originalHash, changedHash };
  await p.getByRole("button", { name: "Expose offset", exact: true }).click();
  await idle();
  assert.equal((await graph()).parameters.at(-1).name, "offset");

  // Peer modules use the same TypeShade service; Go to Definition opens the actual helper.
  await writeCode(p, changed.replace("return", "return"));
  await p.keyboard.press("Control+Home");
  // Find the imported call through Monaco's own Find command.
  await p.keyboard.press("Control+f");
  await p.keyboard.insertText("attack(time)");
  await p.keyboard.press("Escape");
  await p.keyboard.press("ArrowLeft");
  await p.keyboard.press("F12");
  await p.getByRole("tab", { name: "math.shade.ts", exact: true }).waitFor();
  await p.waitForFunction(() =>
    document
      .querySelector('.function-file-tabs [aria-selected="true"]')
      ?.textContent?.includes("math.shade.ts"),
  );
  assert.match(await readCode(p), /export function attack/);
  const helper = await readCode(p);
  await writeCode(
    p,
    helper + "\nexport function extra(value: f32): f32 { return sin(val",
  );
  await p.keyboard.press("Control+Space");
  await p
    .locator(".suggest-widget.visible .monaco-list-row")
    .filter({ hasText: /^value$/ })
    .waitFor();
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Revert file", exact: true }).click();
  console.log(
    "Full source, new reflected pin, imported definition and completion passed.",
  );

  await select("level");
  let invalid = changed + "\nexport function unfinished(:\n";
  await writeCode(p, invalid);
  invalid = await readCode(p);
  await p.locator("#mode-live").click();
  await p.locator("#live-start").click();
  await p.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) > 4800,
  );
  await p.locator("#apply-function-code").click();
  await p
    .getByRole("alert")
    .filter({ hasText: /gain.shade.ts/ })
    .first()
    .waitFor();
  const failedFrames = await p
    .locator("#live-indicator")
    .getAttribute("data-frames");
  await p.waitForFunction(
    (before) =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) >
      Number(before) + 4800,
    failedFrames,
  );
  assert.equal((await graph()).modules["/gain.shade.ts"], changed);
  await p.locator("#live-stop").click();
  const file = await save();
  const exported = JSON.parse(file.toString());
  assert.equal(exported.version, 3);
  assert.ok(
    Object.values(exported.editor.drafts).some((d: any) => d.text === invalid),
  );
  await p.reload();
  await p.locator('[data-function-node="level"]').waitFor();
  await select("level");
  assert.equal(await readCode(p), invalid);
  await p
    .getByRole("button", { name: "+ New function sound", exact: true })
    .click();
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.functions.parameters[0].value === 180,
  );
  await p.locator("#project-file").setInputFiles({
    name: "functions.typeaudio.json",
    mimeType: "application/json",
    buffer: file,
  });
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.functions.parameters[0].value === 320,
  );
  await select("level");
  assert.equal(await readCode(p), invalid);
  assert.equal(
    await wav(),
    changedHash,
    "Reopened source reproduces exactly the edited WAV despite its invalid draft",
  );
  console.log(
    "Invalid drafts, last valid playback, reload and exact project/WAV round trip passed.",
  );

  // Reject delayed preparations after a newer parameter edit.
  await writeCode(p, changed + "\n// delayed edit\n");
  await p.evaluate(() => {
    (window as any).holdFunctionCompile = true;
  });
  await p.locator("#apply-function-code").click();
  await p.waitForFunction(() => !!(window as any).releaseFunctionCompile);
  await input(p, "Body pitch control", 400);
  await p.evaluate(() => (window as any).releaseFunctionCompile());
  await p
    .getByRole("alert")
    .filter({ hasText: /sound changed during preparation/ })
    .first()
    .waitFor();
  assert.equal((await graph()).parameters[0].value, 400);
  assert.equal((await graph()).modules["/gain.shade.ts"], changed);
  await p.getByRole("button", { name: "Revert file", exact: true }).click();
  await p.getByRole("button", { name: "New function", exact: true }).click();
  await p.waitForFunction(
    () => document.querySelectorAll("[data-function-node]").length === 4,
  );
  await idle();
  const freshSource = await readCode(p);
  assert.match(freshSource, /state: inout<State>/);
  await writeCode(
    p,
    freshSource.replace(
      "return input * amount;",
      "return sin(time * 2764.6015) * 0.2;",
    ),
  );
  await p.locator("#apply-function-code").click();
  await idle();
  await p
    .getByRole("button", { name: "Use as sound output", exact: true })
    .click();
  await idle();
  const scratchHash = await wav();
  assert.notEqual(scratchHash, changedHash);
  observations.fromScratch = {
    fullModule: true,
    oscillatorWavHash: scratchHash,
  };
  await p.keyboard.press("Control+p");
  await p.getByRole("dialog", { name: /document|command/i }).waitFor();
  await p.keyboard.press("Escape");
  await p.waitForFunction(() =>
    document
      .querySelector('.code-problems[data-status="ready"]')
      ?.textContent?.includes("No language errors"),
  );
  await p.screenshot({ path: `${directory}/desktop.png` });

  // Existing Picture source editing and timeline use the same function source.
  await p.getByRole("button", { name: "Use in Picture", exact: true }).click();
  await p.getByRole("button", { name: "Picture", exact: true }).click();
  await p.locator("#edit-cue-sound").click();
  await p.locator(".timeline-panel").waitFor();
  await input(p, "Body pitch control", 440);
  assert.equal(
    (await stored(p)).scene.cues[0].patch.functions.parameters[0].value,
    440,
  );
  observations.flow = {
    liveControl: true,
    sourceEditing: true,
    reflectedPins: true,
    staleApplyGuard: true,
    timelineSource: true,
    projectVersion: 3,
  };

  // Raw engine documents remain importable, with no custom page or executable artifact.
  const raw = await readFile("website/public/projects/function-impact.json");
  await p.locator("#project-file").setInputFiles({
    name: "engine-impact.json",
    mimeType: "application/json",
    buffer: raw,
  });
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.functions.parameters[0].value === 180,
  );
  assert.equal((await graph()).schema, "typeaudio.function-graph");

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto("http://127.0.0.1:4201/?project=function-impact");
  await mobile.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!)?.source
        .patch.functions?.schema === "typeaudio.function-graph",
  );
  for (const width of [390, 320]) {
    await mobile.setViewportSize({ width, height: 844 });
    for (const name of ["Listen", "Edit", "Code / FX", "Projects"]) {
      await task(mobile, name);
      assert.equal(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `${width}px ${name} has no page overflow`,
      );
      const transport = await mobile.locator("#live-start").boundingBox();
      assert.ok(
        transport && transport.y > 0 && transport.y + transport.height < 844,
      );
    }
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await task(mobile, "Edit");
  await input(mobile, "Body pitch control", 510);
  assert.equal(
    (await stored(mobile)).source.patch.functions.parameters[0].value,
    510,
  );
  await mobile.screenshot({ path: `${directory}/mobile-properties.png` });
  await task(mobile, "Code / FX");
  await mobile.locator('#graph-code[data-ready="true"]').waitFor();
  assert.match(await readCode(mobile), /export function/);
  await mobile.keyboard.press("ArrowLeft");
  await mobile.waitForFunction(() =>
    document
      .querySelector('.code-problems[data-status="ready"]')
      ?.textContent?.includes("No language errors"),
  );
  await mobile.screenshot({ path: `${directory}/mobile-code.png` });
  observations.mobile = {
    widths: [390, 320],
    code: true,
    control: true,
    transportVisible: true,
    physicalDevice: false,
  };
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/verification.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        ...observations,
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Function authoring browser checks passed.");
} catch (error) {
  await p.screenshot({ path: `${directory}/failure.png` }).catch(() => {});
  console.log(
    JSON.stringify({ errors, text: await p.locator("body").innerText() }),
  );
  throw error;
} finally {
  await browser.close();
  await new Promise<void>((resolve) =>
    server.httpServer!.close(() => resolve()),
  );
}
