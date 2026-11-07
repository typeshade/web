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
const directory = "artifacts/composition-authoring";
await mkdir(directory, { recursive: true });
const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
p.setDefaultTimeout(30000);
const errors: string[] = [],
  observations: Record<string, unknown> = {};
p.on("pageerror", (error) => errors.push(error.message));
const stored = (page = p) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!),
  );
const patch = async () => (await stored()).source.patch;
async function idle(page = p) {
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".function-network-status")
        ?.textContent?.includes("Preparing"),
  );
}
async function network(page = p) {
  await page.getByRole("tab", { name: /^Network/ }).click();
  await page.locator('#graph-code[data-ready="true"]').waitFor();
}
async function select(id: string) {
  await p
    .locator(`[data-function-node="${id}"] .function-node-heading`)
    .click();
}
async function download(selector: string) {
  const pending = p.waitForEvent("download");
  await p.locator(selector).click();
  const file = await pending;
  assert.equal(await file.failure(), null);
  return readFile((await file.path())!);
}
async function save() {
  await p.getByRole("button", { name: "File", exact: true }).click();
  return download("#save-project");
}
async function wav() {
  await p.locator("#mode-render").click();
  await p.locator("#render").click();
  const bytes = await download("#download");
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  let energy = 0;
  for (let i = 44; i < bytes.length; i += 2)
    energy += bytes.readInt16LE(i) ** 2;
  assert.ok(energy > 0);
  return createHash("sha256").update(bytes).digest("hex");
}
async function apply() {
  await p.locator("#apply-function-code").click();
  await idle();
}
try {
  await p.addInitScript(() => {
    const Native = Worker,
      w = window as any;
    window.Worker = class extends Native {
      postMessage(message: any, options?: any) {
        if (message.synchronize && w.holdComposition) {
          w.holdComposition = false;
          w.releaseComposition = () => super.postMessage(message, options);
        } else super.postMessage(message, options);
      }
    };
  });
  await p.goto("http://127.0.0.1:4201/?project=function-impact");
  await p.locator('[data-function-node="level"]').waitFor();
  await network();
  const original = await readCode(p);
  assert.match(
    original,
    /resonator\(bodyState, noise, pitch, damping, sampleRate\)/,
  );
  await p.keyboard.press("ArrowLeft");
  await p.waitForFunction(() =>
    document
      .querySelector('.code-problems[data-status="ready"]')
      ?.textContent?.includes("No language errors"),
  );
  const originalHash = await wav();

  let authored =
    original
      .replace("gain(body, strength, time)", "gain(noise, 0.1, time)")
      .replace(
        "const level:",
        "// Keep the transient note.\n  const finalSignal:",
      )
      .replace("return level;", "return finalSignal;") +
    "\nexport function unrelated(value: f32): f32 { return value * 2; }\n";
  await writeCode(p, authored);
  authored = await readCode(p);
  await apply();
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.functions.nodes.find((n: any) => n.id === "level").inputs
        .in.node === "noise",
  );
  assert.equal(
    (await patch()).functions.nodes.find((n: any) => n.id === "level").inputs
      .strength.value,
    0.1,
  );
  assert.equal((await patch()).functionComposition, authored);
  assert.equal(await p.locator("[data-function-node]").count(), 3);
  const authoredHash = await wav();
  assert.notEqual(authoredHash, originalHash);

  // A visual binding edit projects back into calls while keeping user code and IDs.
  await select("level");
  await p
    .getByRole("combobox", { name: "input input binding", exact: true })
    .selectOption("node:body:out");
  await idle();
  await network();
  const projected = await readCode(p);
  assert.match(projected, /gain\(body, 0.1, time\)/);
  assert.match(projected, /const finalSignal:/);
  assert.match(projected, /Keep the transient note/);
  assert.match(
    projected,
    /export function unrelated\(value: f32\): f32 \{ return value \* 2; \}/,
  );
  console.log(
    "Composition calls, visual projection, identity and source preservation passed.",
  );

  await p.locator('[data-function-node="body"]').click({ button: "right" });
  await p
    .getByRole("menuitem", { name: "Locate call in composition", exact: true })
    .click();
  const line =
    projected.split("\n").findIndex((line) => line.includes("const body:")) + 1;
  await p
    .locator(".code-position")
    .filter({ hasText: `Ln ${line},` })
    .waitFor();
  // Navigate from the composition call to the actual processing definition.
  await p.locator("#graph-code textarea.inputarea").focus();
  await p.keyboard.press("Control+f");
  await p.keyboard.insertText("resonator(bodyState");
  await p.keyboard.press("Escape");
  await p.keyboard.press("ArrowLeft");
  await p.keyboard.press("F12");
  await p.waitForFunction(() =>
    document
      .querySelector('.function-file-tabs [aria-selected="true"]')
      ?.textContent?.includes("resonator.shade.ts"),
  );
  await network();
  await writeCode(
    p,
    projected + "\nexport function inspect(value: f32): f32 { return sin(val",
  );
  await p.keyboard.press("Control+Space");
  await p
    .locator(".suggest-widget.visible .monaco-list-row")
    .filter({ hasText: /^value$/ })
    .waitFor();
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Revert file", exact: true }).click();

  // Explicit rename updates language symbols and metadata atomically; connected pin IDs stay stable.
  await select("body");
  const binding = p.locator(".function-input-binding").filter({
    has: p.getByRole("combobox", {
      name: "input input binding",
      exact: true,
    }),
  });
  await binding.locator("summary").click();
  await binding
    .getByRole("textbox", { name: "Rename input input", exact: true })
    .fill("excitationInput");
  const graphBeforeRename = (await patch()).functions;
  await binding
    .getByRole("button", { name: "Rename input", exact: true })
    .click();
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.functions.definitions.find(
        (d: any) => d.id === "resonator",
      ).inputs.excitationInput?.id === "in",
  );
  assert.deepEqual((await patch()).functions.nodes, graphBeforeRename.nodes);
  assert.match(
    (await patch()).functions.modules["/resonator.shade.ts"],
    /excitationInput \* 0.015/,
  );
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  await idle();
  assert.deepEqual((await patch()).functions, graphBeforeRename);
  await p.getByRole("button", { name: "Redo", exact: true }).click();
  await idle();
  assert.equal(
    (await patch()).functions.definitions[1].inputs.excitationInput.id,
    "in",
  );
  console.log(
    "Call navigation, TypeShade completion/definitions and connected rename/Undo passed.",
  );

  await network();
  const clean = await readCode(p);
  await p.locator("#mode-live").click();
  await p.locator("#live-start").click();
  await p.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) > 9600,
  );
  const revision = await p
    .locator("#live-indicator")
    .getAttribute("data-revision");
  await writeCode(p, clean + "\n// Comment-only authoring change.\n");
  await apply();
  const frames = await p.locator("#live-indicator").getAttribute("data-frames");
  await p.waitForFunction(
    (before) =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) >
      Number(before) + 4800,
    frames,
  );
  assert.equal(
    await p.locator("#live-indicator").getAttribute("data-revision"),
    revision,
  );
  await p.locator("#live-stop").click();

  // A newer graph revision cannot silently overwrite a dirty composition draft.
  const beforeConflict = await readCode(p);
  await writeCode(p, beforeConflict + "\n// Pending network detail.\n");
  const pending = await readCode(p);
  await select("level");
  await p
    .getByRole("combobox", { name: "input input binding", exact: true })
    .selectOption("node:noise:out");
  await idle();
  await network();
  await p
    .getByRole("alert")
    .filter({ hasText: "Applied source changed" })
    .waitFor();
  assert.equal(await readCode(p), pending);
  assert.equal(await p.locator("#apply-function-code").isEnabled(), false);
  await p.getByRole("button", { name: "Keep this draft", exact: true }).click();
  await apply();
  assert.equal(
    (await patch()).functions.nodes.find((n: any) => n.id === "level").inputs.in
      .node,
    "body",
  );
  assert.equal((await patch()).functionComposition, pending);

  // A stale compile and newer typing cannot roll back controls, source or layout.
  const applied = await readCode(p);
  await writeCode(p, applied + "\n// delayed source\n");
  await p.evaluate(() => {
    (window as any).holdComposition = true;
  });
  await p.locator("#apply-function-code").click();
  await p.waitForFunction(() => !!(window as any).releaseComposition);
  const pitch = p.getByRole("spinbutton", {
    name: "Body pitch control",
    exact: true,
  });
  await pitch.fill("400");
  await pitch.blur();
  await writeCode(p, applied + "\n// newer typing\n");
  const newer = await readCode(p);
  await p.evaluate(() => (window as any).releaseComposition());
  await p
    .getByRole("alert")
    .filter({ hasText: /sound changed during preparation/ })
    .first()
    .waitFor();
  assert.equal((await patch()).functions.parameters[0].value, 400);
  assert.equal((await patch()).functionComposition, applied);
  assert.equal(await readCode(p), newer);
  await p.getByRole("button", { name: "Revert file", exact: true }).click();
  console.log(
    "Comment-only Live continuity, draft conflicts and stale-result guards passed.",
  );

  const validHash = await wav();
  await writeCode(p, "");
  await apply();
  await p
    .getByRole("alert")
    .filter({ hasText: /Provide one exported sound/ })
    .first()
    .waitFor();
  assert.equal(await readCode(p), "");
  assert.equal((await patch()).functionComposition, applied);
  await writeCode(
    p,
    applied.replace(
      "return finalSignal;",
      "if (time > 1) return 0; return finalSignal;",
    ),
  );
  const invalid = await readCode(p);
  await apply();
  await p
    .getByRole("alert")
    .filter({ hasText: /Composition supports/ })
    .first()
    .waitFor();
  assert.equal((await patch()).functionComposition, applied);
  const file = await save(),
    exported = JSON.parse(file.toString());
  assert.equal(exported.version, 4);
  assert.ok(
    Object.values(exported.editor.drafts).some((d: any) => d.text === invalid),
  );
  await p.reload();
  await p.locator('[data-function-node="level"]').waitFor();
  await network();
  assert.equal(await readCode(p), invalid);
  assert.equal((await stored()).version, 3);
  await p
    .getByRole("button", { name: "+ New function sound", exact: true })
    .click();
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.functions.parameters[0].value === 180,
  );
  await p.locator("#project-file").setInputFiles({
    name: "network.typeaudio.json",
    mimeType: "application/json",
    buffer: file,
  });
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch.functions.parameters[0].value === 400,
  );
  await network();
  assert.equal(await readCode(p), invalid);
  assert.equal(await wav(), validHash);
  // Mismatched applied source is rejected before replacing the current document.
  const mismatched = structuredClone(exported);
  mismatched.editor.source.patch.functionComposition = applied.replace(
    "gain(body, 0.1, time)",
    "gain(noise, 0.1, time)",
  );
  const beforeImport = await stored();
  await p.locator("#project-file").setInputFiles({
    name: "mismatch.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(mismatched)),
  });
  await p
    .getByText(/Saved composition does not match/)
    .first()
    .waitFor();
  assert.deepEqual((await stored()).source, beforeImport.source);
  await p.getByRole("button", { name: "Revert file", exact: true }).click();
  await p.screenshot({ path: `${directory}/desktop.png` });
  observations.desktop = {
    genuineCalls: true,
    projection: true,
    commentsAndHelpers: true,
    stableRename: true,
    undoRedo: true,
    completionAndDefinition: true,
    commentOnlyLive: true,
    conflictRecovery: true,
    staleGuard: true,
    projectVersion: 4,
    invalidDraftRoundTrip: true,
    mismatchedImportRejected: true,
    originalHash,
    authoredHash,
    validHash,
  };
  console.log(
    "Versioned save/reload/reopen, exact WAV and protected import passed.",
  );

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
  await mobile
    .getByRole("navigation", { name: "Editor tasks" })
    .getByRole("button", { name: "Code / FX", exact: true })
    .click();
  await network(mobile);
  assert.match(await readCode(mobile), /export function sound/);
  for (const width of [390, 320]) {
    await mobile.setViewportSize({ width, height: 844 });
    assert.ok(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${width}px has no page overflow`,
    );
    const transport = await mobile.locator("#live-start").boundingBox();
    assert.ok(
      transport && transport.y > 0 && transport.y + transport.height < 844,
    );
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.screenshot({ path: `${directory}/mobile.png` });
  observations.mobile = {
    widths: [390, 320],
    compositionAccessible: true,
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
  console.log("Composition authoring browser checks passed.");
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
