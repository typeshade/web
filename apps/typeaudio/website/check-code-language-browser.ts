import assert from "node:assert/strict";
import { chromium, type Browser } from "playwright-core";
import { preview } from "vite";
import { codeInput, readCode, writeCode } from "./check-code-input.ts";

const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4196, strictPort: true },
});
let browser: Browser | undefined;
try {
  browser = await chromium.launch({
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const p = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
  const errors: string[] = [];
  p.setDefaultTimeout(30000);
  p.on("pageerror", (error) => errors.push(error.message));
  p.on("dialog", (dialog) => dialog.accept());
  await p.addInitScript(() => {
    const Native = Worker,
      w = window as any;
    w.languageWorkers = 0;
    w.languageDelay = 0;
    w.delayedAnalysis = false;
    window.Worker = class extends Native {
      language: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.language = String(url).includes("language.worker-");
        if (this.language) {
          w.languageWorkers++;
          w.languageWorker = this;
        }
      }
      postMessage(message: any, options?: any) {
        if (
          this.language &&
          (message.method === "diagnostics" || message.method === "rename") &&
          w.languageDelay
        ) {
          const delay = w.languageDelay;
          w.languageDelay = 0;
          w.delayedAnalysis = true;
          setTimeout(() => super.postMessage(message, options), delay);
        } else super.postMessage(message, options);
      }
    };
  });
  await p.goto("http://127.0.0.1:4196");
  assert.equal(
    await p.evaluate(() => (window as any).languageWorkers),
    0,
    "Ordinary sounds do not load the language service",
  );
  await p
    .getByRole("button", { name: "+ New procedural sound", exact: true })
    .click();
  await codeInput(p);
  const problems = p.getByLabel("Code problems", { exact: true });
  async function clean() {
    await p.waitForFunction(() =>
      document
        .querySelector('.code-problems[data-status="ready"]')
        ?.textContent?.includes("No language errors"),
    );
  }
  await clean();
  const initial = await p.evaluate(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source,
  );
  const host = await p.locator("#graph-code").boundingBox();
  assert.ok(
    host && host.height >= 200,
    "Default layout leaves room to edit more than a few lines",
  );
  await p.locator(".code-context summary").click();
  assert.match(await p.locator(".code-bindings").innerText(), /p0.*Pitch/s);
  assert.match(await p.locator(".code-bindings").innerText(), /state0…state3/);
  await p.locator(".code-context summary").click();

  await writeCode(p, "const frequency: f32 = 440;\nout = sin(fre");
  await p.keyboard.press("Control+Space");
  await p
    .locator(".suggest-widget.visible .monaco-list-row")
    .filter({ hasText: /^frequency$/ })
    .waitFor();
  await p.keyboard.press("Enter");
  assert.match(await readCode(p), /sin\(frequency$/);
  await writeCode(p, "out = sin(");
  await p.keyboard.press("Control+Shift+Space");
  await p.locator(".parameter-hints-widget.visible").waitFor();
  assert.match(
    await p.locator(".parameter-hints-widget.visible").innerText(),
    /sin/,
  );
  await p.keyboard.press("Escape");

  const valid = "const frequency: f32 = 440;\nout = sin(frequency);";
  await writeCode(p, valid);
  await clean();
  await p.keyboard.press("Control+End");
  await p.keyboard.press("ArrowLeft");
  await p.keyboard.press("ArrowLeft");
  await p.keyboard.press("F12");
  await p.waitForFunction(() =>
    document
      .querySelector(".code-position span")
      ?.textContent?.includes("Ln 1"),
  );
  await p.keyboard.press("F2");
  const rename = p.locator(".rename-box input");
  await rename.fill("pitch");
  await p.evaluate(() => {
    (window as any).languageDelay = 500;
  });
  await p.keyboard.press("Enter");
  await p.waitForFunction(
    () =>
      !document.querySelector(".rename-box") ||
      (document.querySelector(".rename-box") as HTMLElement).style.display ===
        "none",
  );
  await p.waitForFunction(() =>
    Object.values(
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!)
        .drafts ?? {},
    ).some((d: any) => d.text === "const pitch: f32 = 440;\nout = sin(pitch);"),
  );
  assert.equal(await readCode(p), "const pitch: f32 = 440;\nout = sin(pitch);");

  // Invalid drafts must show errors without Apply and leave the running graph untouched.
  await p.locator("#live-start").click();
  await p.waitForFunction(
    () =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement)?.dataset
          .frames,
      ) > 9600,
  );
  const frames = Number(
    await p.locator("#live-indicator").getAttribute("data-frames"),
  );
  await writeCode(p, "const frequency: f32 = true;\nout = missingName;");
  await problems
    .getByRole("button")
    .filter({ hasText: "missingName" })
    .waitFor();
  assert.ok((await p.locator(".squiggly-error").count()) >= 2);
  await problems.getByRole("button").filter({ hasText: "missingName" }).click();
  assert.match(
    await p.locator(".code-position span").first().innerText(),
    /Ln 2/,
  );
  await p.waitForFunction(
    (frames) =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement)?.dataset
          .frames,
      ) >
      frames + 24000,
    frames,
  );
  assert.deepEqual(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!)
          .source,
    ),
    initial,
    "Language analysis never applies a draft",
  );
  await p.screenshot({
    path: "artifacts/code-language-problems.png",
    fullPage: true,
  });
  await p.locator("#live-stop").click();

  // A late result for an old draft must not reintroduce its errors.
  await p.evaluate(() => {
    (window as any).languageDelay = 800;
  });
  await writeCode(p, "out = outdatedName;");
  await p.waitForFunction(() => (window as any).delayedAnalysis);
  await writeCode(p, valid);
  await clean();
  await p.locator("#code-tab-generated").click();
  await p.locator("#code-tab-node-impact").click();
  await clean();
  // Force a fresh query after the delayed request has reached the worker.
  await p.waitForTimeout(1000);
  assert.equal(await problems.getByRole("button").count(), 0);
  await codeInput(p);
  await p.keyboard.press("Control+End");
  await p.keyboard.insertText("\n// next version");
  await clean();
  assert.equal(await p.locator(".squiggly-error").count(), 0);

  // A failed worker can be restarted without losing the current document.
  await p.evaluate(() => {
    (window as any).languageDelay = 800;
    (window as any).delayedAnalysis = false;
  });
  await writeCode(p, "out = p0;");
  await p.waitForFunction(() => (window as any).delayedAnalysis);
  await p.evaluate(() =>
    (window as any).languageWorker.onmessageerror(
      new MessageEvent("messageerror"),
    ),
  );
  await problems
    .getByRole("button", { name: "Retry analysis", exact: true })
    .click();
  await clean();
  assert.ok((await p.evaluate(() => (window as any).languageWorkers)) >= 2);
  await p
    .getByRole("separator", { name: "Resize code panel height", exact: true })
    .focus();
  await p.keyboard.press("ArrowUp");
  assert.equal(
    await p
      .getByRole("separator", { name: "Resize code panel height", exact: true })
      .getAttribute("aria-valuenow"),
    "440",
  );
  await p
    .getByRole("button", { name: "Focus code editor", exact: true })
    .click();
  await p.screenshot({
    path: "artifacts/code-language-focus.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS TypeShade language editor: actual local completion, signatures, definition/rename, live diagnostics/positions, stale-response isolation, worker restart, independent code height and uninterrupted AudioWorklet progress without applying drafts",
  );
} finally {
  await browser?.close();
  server.httpServer.close();
}
