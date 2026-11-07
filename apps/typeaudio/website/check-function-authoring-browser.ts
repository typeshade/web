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
const errors: string[] = [];
const directory = "artifacts/function-authoring";
await mkdir(directory, { recursive: true });
const document = (p: Page) =>
  p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!),
  );
const p = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
p.setDefaultTimeout(30000);
p.on("pageerror", (error) => errors.push(error.message));
try {
  await p.goto("http://127.0.0.1:4201");
  await p
    .getByRole("button", { name: "+ New function sound", exact: true })
    .click();
  await p.locator('[data-function-node="body"]').waitFor();
  assert.equal(await p.locator("[data-function-node]").count(), 3);
  await p.locator('#graph-code[data-ready="true"]').waitFor();
  await p.locator("#live-start").click();
  await p.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLElement>("#live-indicator")?.dataset.frames,
      ) > 9600,
  );
  await p
    .getByRole("spinbutton", { name: "Pitch control", exact: true })
    .fill("320");
  await p
    .getByRole("spinbutton", { name: "Pitch control", exact: true })
    .blur();
  await p.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem("typeaudio.editor.document.v1")!,
      ).source.patch.functions.parameters.find((p: any) => p.id === "pitch")
        .value === 320,
  );
  await p.locator("#live-stop").click();
  await p.locator('[data-function-node="body"] .function-node-heading').click();
  const original = await readCode(p);
  assert.match(original, /export function resonator/);
  await writeCode(p, original + "\n// saved function draft\n");
  await p
    .locator('[data-function-node="noise"] .function-node-heading')
    .click();
  await p.locator('[data-function-node="body"] .function-node-heading').click();
  assert.match(await readCode(p), /saved function draft/);
  await p.locator("#apply-function-code").click();
  await p.waitForFunction(() =>
    JSON.parse(
      localStorage.getItem("typeaudio.editor.document.v1")!,
    ).source.patch.functions.modules["/resonator.shade.ts"].includes(
      "saved function draft",
    ),
  );
  await p.screenshot({ path: `${directory}/desktop.png` });
  await writeFile(
    `${directory}/smoke.json`,
    JSON.stringify(
      { live: true, moduleEditing: true, draftSelection: true, errors },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, []);
  console.log("Function editor live/source smoke passed.");
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
