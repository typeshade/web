import assert from "node:assert/strict";
import { chromium, type Page, type Locator } from "playwright-core";
import { preview } from "vite";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4185, strictPort: true },
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4185";
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
async function scene(p: Page) {
  return JSON.parse(
    await p.evaluate(() => localStorage.getItem("typeaudio.video.scene.v1")!),
  );
}
async function ready(p: Page) {
  await p.waitForFunction(
    () => !(document.querySelector("#play") as HTMLButtonElement)?.disabled,
    undefined,
    { timeout: 90000 },
  );
}
async function value(p: Page, label: string, next: string) {
  await p
    .getByRole("button", { name: `Edit ${label} value`, exact: true })
    .click();
  await p
    .getByRole("spinbutton", { name: `${label} value`, exact: true })
    .fill(next);
  await p.keyboard.press("Enter");
}
async function drag(
  p: Page,
  node: Locator,
  dx: number,
  dy = 0,
  cancel = false,
) {
  const b = await node.boundingBox();
  assert.ok(b);
  const x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + dx, y + dy, { steps: 10 });
  if (cancel) await p.keyboard.press("Escape");
  await p.mouse.up();
}
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await value(p, "Pitch", "440");
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  assert.equal(
    await p.locator('[data-preset="warm"]').getAttribute("aria-pressed"),
    "false",
  );
  await p.keyboard.press("Control+z");
  assert.equal(await p.locator("#frequency").inputValue(), "220");
  await p.keyboard.press("Control+Shift+z");
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  await p
    .getByRole("button", { name: "Edit Pitch value", exact: true })
    .click();
  await p
    .getByRole("spinbutton", { name: "Pitch value", exact: true })
    .fill("660");
  await p.keyboard.press("Escape");
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  await drag(
    p,
    p.getByRole("button", { name: "Edit Pitch value", exact: true }),
    70,
  );
  assert.ok(Number(await p.locator("#frequency").inputValue()) > 440);
  await p.keyboard.press("Control+z");
  assert.equal(
    await p.locator("#frequency").inputValue(),
    "440",
    "A value scrub must undo in one step",
  );
  await drag(
    p,
    p.getByRole("button", { name: "Edit Pitch value", exact: true }),
    90,
    0,
    true,
  );
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  const slider = await p.locator("#frequency").boundingBox();
  assert.ok(slider);
  await p.mouse.move(
    slider.x + slider.width * 0.4,
    slider.y + slider.height / 2,
  );
  await p.mouse.down();
  await p.mouse.move(
    slider.x + slider.width * 0.8,
    slider.y + slider.height / 2,
    { steps: 15 },
  );
  await p.mouse.up();
  assert.notEqual(await p.locator("#frequency").inputValue(), "440");
  await p.keyboard.press("Control+z");
  assert.equal(
    await p.locator("#frequency").inputValue(),
    "440",
    "A range drag must undo in one step",
  );
  await p
    .getByRole("button", { name: "Edit Pitch value", exact: true })
    .click({ button: "right" });
  await p.getByRole("menuitem", { name: "Reset Pitch", exact: true }).click();
  assert.equal(await p.locator("#frequency").inputValue(), "220");
  await p.keyboard.press("Control+z");
  assert.equal(await p.locator("#frequency").inputValue(), "440");
  await p
    .getByRole("button", { name: "Edit Pitch value", exact: true })
    .hover();
  await p.getByRole("tooltip").waitFor();
  assert.match(await p.getByRole("tooltip").innerText(), /drag to adjust/i);
  await p.keyboard.press("Escape");
  assert.equal(await p.getByRole("tooltip").count(), 0);
  await p.locator("#live-stop").focus();
  await p
    .getByRole("button", { name: "Edit Pitch value", exact: true })
    .focus();
  await p.getByRole("tooltip").waitFor();
  assert.match(
    (await p
      .getByRole("button", { name: "Edit Pitch value", exact: true })
      .getAttribute("aria-describedby")) || "",
    /studio-tooltip/,
  );
  await p.keyboard.press("Escape");
  const file = p.getByRole("button", { name: "File", exact: true });
  await file.focus();
  await p.keyboard.press("Space");
  await p.getByRole("menu", { name: "File menu" }).waitFor();
  await p.keyboard.press("End");
  assert.equal(
    await p.evaluate(() => document.activeElement?.textContent?.trim()),
    "Import sound…",
  );
  await p.keyboard.press("Escape");
  assert.equal(await file.evaluate((n) => n === document.activeElement), true);
  await file.click();
  await p.keyboard.press("Tab");
  assert.equal(await p.getByRole("menu").count(), 0);
  assert.equal(
    await p
      .getByRole("button", { name: "Edit", exact: true })
      .evaluate((n) => n === document.activeElement),
    true,
  );
  await p.locator("#live-repeat").focus();
  await p.keyboard.press("Space");
  assert.equal(await p.locator("#live-repeat").isChecked(), false);
  await p.keyboard.press("Space");
  await p.locator("#editor-main").focus();
  await p.keyboard.down("Space");
  await p.waitForFunction(
    () =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement).dataset
          .frames,
      ) > 4800,
  );
  const liveFrames = Number(
    await p.locator("#live-indicator").getAttribute("data-frames"),
  );
  await p.keyboard.down("Space");
  await p.waitForFunction(
    (before) =>
      Number(
        (document.querySelector("#live-indicator") as HTMLElement).dataset
          .frames,
      ) >
      before + 4800,
    liveFrames,
  );
  await p.keyboard.up("Space");
  await p.locator("#live-stop").click();
  await p.locator("#store-a").click();
  await value(p, "Pitch", "660");
  await p.locator("#store-b").click();
  await p.locator("#morph").evaluate((n) => {
    const input = n as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "0.5");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const tone = await p.evaluate(
    () =>
      JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
        .patch,
  );
  await p.locator("#xy-pad").click({ button: "right" });
  await p.getByRole("menu", { name: "Tone options" }).waitFor();
  await p.keyboard.press("Escape");
  assert.deepEqual(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
          .patch,
    ),
    tone,
  );
  await drag(p, p.locator("#xy-pad"), 50, 20, true);
  assert.deepEqual(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
          .patch,
    ),
    tone,
  );
  assert.equal(await p.locator("#morph").inputValue(), "0.5");
  await drag(p, p.locator("#xy-pad"), 50, 10);
  await p.keyboard.press("Control+z");
  assert.deepEqual(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!).source
          .patch,
    ),
    tone,
  );
  assert.equal(await p.locator("#morph").inputValue(), "0.5");
  const project = p.locator(".project-panel"),
    inspector = p.locator(".inspector-region"),
    dock = p.locator(".dock-region");
  const before = await project.evaluate((n) => n.getBoundingClientRect().width);
  await drag(
    p,
    p.getByRole("separator", { name: "Resize project panel", exact: true }),
    45,
  );
  assert.ok(
    (await project.evaluate((n) => n.getBoundingClientRect().width)) >
      before + 30,
  );
  await drag(
    p,
    p.getByRole("separator", { name: "Resize properties panel", exact: true }),
    -45,
  );
  await drag(
    p,
    p.getByRole("separator", { name: "Resize timeline", exact: true }),
    0,
    -45,
  );
  const sizes = await Promise.all(
    [project, inspector, dock].map((n) =>
      n.evaluate((n) => ({
        w: n.getBoundingClientRect().width,
        h: n.getBoundingClientRect().height,
      })),
    ),
  );
  await p.reload();
  await p.locator(".workspace").waitFor();
  const restored = await Promise.all(
    [project, inspector, dock].map((n) =>
      n.evaluate((n) => ({
        w: n.getBoundingClientRect().width,
        h: n.getBoundingClientRect().height,
      })),
    ),
  );
  assert.deepEqual(restored, sizes);
  const saved = await project.evaluate((n) => n.getBoundingClientRect().width);
  await drag(
    p,
    p.getByRole("separator", { name: "Resize project panel", exact: true }),
    35,
    0,
    true,
  );
  assert.equal(
    await project.evaluate((n) => n.getBoundingClientRect().width),
    saved,
  );
  await p.mouse.click(800, 45);
  await p.keyboard.press("f");
  assert.equal(
    await p
      .locator(".workspace")
      .evaluate((n) => n.classList.contains("viewer-focused")),
    true,
  );
  assert.equal(await project.isVisible(), false);
  await p.keyboard.press("Escape");
  assert.equal(await project.isVisible(), true);
  await p.getByRole("button", { name: "Window", exact: true }).click();
  await p.getByRole("menuitem", { name: "Reset layout", exact: true }).click();
  assert.equal(
    await p.evaluate(() => localStorage.getItem("typeaudio.editor.layout.v1")),
    null,
  );
  console.log(
    "PASS direct numeric input/scrub/cancel, one-gesture Undo/Redo, native sliders, preset state, pointer/keyboard tooltips and menus, persistent layout, focus viewer",
  );
  for (const preset of ["warm", "bass"]) {
    await p.locator(`[data-preset="${preset}"]`).click({ button: "right" });
    await p
      .getByRole("menuitem", { name: "Add at playhead", exact: true })
      .click();
    await ready(p);
  }
  let data = await scene(p);
  assert.equal(data.cues.length, 2);
  const first = data.cues[0].id,
    second = data.cues[1].id;
  const firstClip = p.locator(`[data-cue="${first}"]`),
    secondClip = p.locator(`[data-cue="${second}"]`);
  const originalTimes = data.cues.map((c: any) => c.time);
  await firstClip.click({ button: "right" });
  await p
    .getByRole("menuitemcheckbox", { name: "Mute layer", exact: true })
    .click();
  data = await scene(p);
  assert.equal(data.cues[0].muted, true);
  assert.equal(data.cues[1].muted, false);
  assert.deepEqual(
    data.cues.map((c: any) => c.time),
    originalTimes,
  );
  await p.keyboard.press("Control+z");
  await firstClip.focus();
  await p.keyboard.press("Shift+F10");
  await p.getByRole("menu", { name: "Clip actions" }).waitFor();
  await p.keyboard.press("Escape");
  assert.equal(
    await firstClip.evaluate((n) => n === document.activeElement),
    true,
  );
  await secondClip.click({ button: "right" });
  await p.getByRole("menuitem", { name: "Rename…", exact: true }).click();
  assert.equal(
    await p.locator("#cue-name").evaluate((n) => n === document.activeElement),
    true,
  );
  await p.locator("#cue-name").fill("Low impact");
  await p.locator("#cue-time").fill("2");
  await ready(p);
  const box = await firstClip.boundingBox();
  assert.ok(box);
  await p.keyboard.down("Alt");
  await p.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width * 0.2 + 70, box.y + box.height * 0.5, {
    steps: 10,
  });
  await p.mouse.up();
  await p.keyboard.up("Alt");
  data = await scene(p);
  assert.equal(data.cues.length, 3);
  assert.equal(data.cues[0].time, originalTimes[0]);
  assert.equal(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!)
          .selected,
    ),
    data.cues[2].id,
  );
  await p.keyboard.press("Control+z");
  assert.equal((await scene(p)).cues.length, 2);
  await ready(p);
  const lane = await firstClip.locator("..").boundingBox(),
    clip = await firstClip.boundingBox();
  assert.ok(lane && clip);
  const x = clip.x + Math.min(12, clip.width / 3),
    y = clip.y + clip.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + (lane.width * 1.98) / 10, y, { steps: 10 });
  assert.equal(await p.locator(".clip-snap-guide").count(), 1);
  await p.mouse.up();
  assert.equal((await scene(p)).cues[0].time, 2);
  await p.keyboard.press("Control+z");
  assert.equal((await scene(p)).cues[0].time, originalTimes[0]);
  await drag(p, firstClip, 80, 0, true);
  assert.equal((await scene(p)).cues[0].time, originalTimes[0]);
  await p.getByRole("button", { name: "Zoom in", exact: true }).click();
  await p.getByRole("button", { name: "Zoom in", exact: true }).click();
  const area = await p.locator(".timeline-scroll").boundingBox();
  assert.ok(area);
  await p.mouse.move(area.x + area.width * 0.7, area.y + 25);
  await p.mouse.down({ button: "middle" });
  await p.mouse.move(area.x + area.width * 0.2, area.y + 25, { steps: 8 });
  await p.mouse.up({ button: "middle" });
  assert.ok(
    (await p.locator(".timeline-scroll").evaluate((n) => n.scrollLeft)) > 0,
  );
  await p.getByRole("button", { name: "Fit", exact: true }).click();
  // Fit clamps the scroll offset; let its scroll notification finish before
  // opening a new context menu (scroll intentionally dismisses open menus).
  await p.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const native = await p.locator("#scene-name").evaluate((n) => {
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    n.dispatchEvent(event);
    return !event.defaultPrevented;
  });
  assert.equal(native, true);
  await firstClip.dispatchEvent("contextmenu", { clientX: 1438, clientY: 998 });
  const menu = await p
    .getByRole("menu", { name: "Clip actions" })
    .boundingBox();
  assert.ok(
    menu &&
      menu.x >= 0 &&
      menu.y >= 0 &&
      menu.x + menu.width <= 1440 &&
      menu.y + menu.height <= 1000,
  );
  await p.keyboard.press("Escape");
  await p.mouse.move(800, 20);
  await p.screenshot({
    path: "artifacts/editor-interactions-picture.png",
    fullPage: true,
  });
  await p.getByRole("button", { name: "Sound", exact: true }).click();
  await p.screenshot({
    path: "artifacts/editor-interactions-sound.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS targeted clip context actions/rename, keyboard menu focus, Alt-copy, magnetic snap, Escape rollback, middle-button pan, viewport menu bounds and native text menus",
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
