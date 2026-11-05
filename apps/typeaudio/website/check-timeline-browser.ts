import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, type Page, type Locator } from "playwright-core";
import { preview } from "vite";
import { DEFAULT } from "./designer.ts";
import { emptyScene, type Scene } from "./video-model.ts";
const server = await preview({
  configFile: "website/vite.config.ts",
  preview: { host: "127.0.0.1", port: 4188, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.TYPESHADE_CHROMIUM || chromium.executablePath(),
  args: ["--no-sandbox"],
  proxy:
    process.env.TYPEAUDIO_VERIFY_URL && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
const base = process.env.TYPEAUDIO_VERIFY_URL || "http://127.0.0.1:4188";
const fixture: Scene = {
  ...emptyScene(),
  end: 6,
  loop: false,
  effects: 0.8,
  cues: [1, 1.8, 3].map((time, i) => ({
    id: `clip-${i}`,
    name: ["Impact", "Air", "Tail"][i]!,
    time,
    gain: 0.6,
    muted: false,
    patch: { ...DEFAULT, hold: 2, release: 0.1, reverb: false, delay: false },
    sourceIn: 0.1,
    sourceOut: 1.6,
    fadeIn: 0.4,
    fadeOut: 0.5,
  })),
};
async function doc(p: Page) {
  return p.evaluate(() =>
    JSON.parse(localStorage.getItem("typeaudio.editor.document.v1")!),
  );
}
async function ready(p: Page) {
  await p.waitForFunction(
    () => !(document.querySelector("#play") as HTMLButtonElement)?.disabled,
    undefined,
    { timeout: 90000 },
  );
}
async function drag(p: Page, node: Locator, dx: number, cancel = false) {
  const b = await node.boundingBox();
  assert.ok(b);
  const x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + dx, y, { steps: 8 });
  if (cancel) await p.keyboard.press("Escape");
  await p.mouse.up();
}
async function download(p: Page, id: string) {
  if (id === "save-project")
    await p.getByRole("button", { name: "File", exact: true }).click();
  const event = p.waitForEvent("download");
  await p.locator("#" + id).click();
  return readFile((await (await event).path())!);
}
async function undo(p: Page) {
  await p.locator("#editor-main").focus();
  await p.keyboard.press("Control+z");
}
try {
  const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    }),
    errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    const w = window as any;
    w.schedules = [];
    const nativeGain = AudioContext.prototype.createGain,
      nativeSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createGain = function () {
      const node = nativeGain.call(this),
        events: any[] = [];
      (node as any).events = events;
      for (const method of [
        "setValueAtTime",
        "linearRampToValueAtTime",
      ] as const) {
        const native = node.gain[method].bind(node.gain);
        node.gain[method] = ((value: number, time: number) => {
          events.push({ method, value, time });
          return native(value, time);
        }) as any;
      }
      return node;
    };
    AudioContext.prototype.createBufferSource = function () {
      const node = nativeSource.call(this),
        connect = node.connect.bind(node),
        start = node.start.bind(node);
      let gain: any;
      node.connect = ((dest: any, ...rest: any[]) => {
        gain = dest;
        return (connect as any)(dest, ...rest);
      }) as any;
      node.start = ((when: number, offset: number, duration: number) => {
        w.schedules.push({
          when,
          offset,
          duration,
          pcm: node.buffer!.getChannelData(0).slice(),
          events: gain.events,
          initialGain: gain.gain.value,
        });
        start(when, offset, duration);
      }) as any;
      return node;
    };
  });
  await p.goto(base + "/studio/video/");
  await p.evaluate((scene) => {
    localStorage.setItem(
      "typeaudio.editor.document.v1",
      JSON.stringify({
        version: 1,
        scene,
        selected: "clip-0",
        selection: ["clip-0"],
        source: { name: "Source", patch: scene.cues[0]!.patch },
      }),
    );
  }, fixture);
  await p.reload();
  await ready(p);
  const clips = p.locator("[data-cue]"),
    first = clips.nth(0),
    second = clips.nth(1);
  await first.click();
  await second.click({ modifiers: ["Control"] });
  assert.deepEqual((await doc(p)).selection, ["clip-0", "clip-1"]);
  await first.click({ button: "right" });
  await p
    .getByRole("menuitemcheckbox", {
      name: "Mute selected layers",
      exact: true,
    })
    .click();
  assert.deepEqual(
    (await doc(p)).scene.cues.map((c: any) => c.muted),
    [true, true, false],
  );
  await undo(p);
  const lane = await first.locator("..").boundingBox();
  assert.ok(lane);
  const dx = (lane.width / 6) * 0.5;
  await drag(p, first, dx);
  let d = await doc(p);
  assert.equal(d.scene.cues[0].time, 1.5);
  assert.equal(d.scene.cues[1].time, 2.3);
  assert.equal(d.scene.cues[2].time, 3);
  await undo(p);
  assert.deepEqual(
    (await doc(p)).scene.cues.map((c: any) => c.time),
    [1, 1.8, 3],
  );
  await drag(p, first, dx, true);
  assert.equal((await doc(p)).scene.cues[0].time, 1);
  await p.keyboard.down("Alt");
  await drag(p, first, dx);
  await p.keyboard.up("Alt");
  d = await doc(p);
  assert.equal(d.scene.cues.length, 5);
  assert.equal(d.selection.length, 2);
  await undo(p);
  await first.click();
  await clips.nth(2).click({ modifiers: ["Shift"] });
  assert.equal((await doc(p)).selection.length, 3);
  await second.click({ modifiers: ["Control"] });
  assert.deepEqual((await doc(p)).selection, ["clip-0", "clip-2"]);
  await p.reload();
  await ready(p);
  assert.deepEqual((await doc(p)).selection, ["clip-0", "clip-2"]);
  await first.focus();
  await p.keyboard.press("Delete");
  assert.equal((await doc(p)).scene.cues.length, 1);
  await undo(p);
  assert.equal((await doc(p)).selection.length, 2);
  await first.click();
  const original = (await doc(p)).scene.cues[0];
  const trim = first.locator('[data-handle="in"]');
  await drag(p, trim, dx, true);
  assert.deepEqual((await doc(p)).scene.cues[0], original);
  await drag(p, trim, dx);
  d = await doc(p);
  assert.equal(d.scene.cues[0].time, 1.5);
  assert.equal(d.scene.cues[0].sourceIn, 0.6);
  assert.equal(d.scene.cues[0].sourceOut, 1.6);
  await undo(p);
  assert.deepEqual((await doc(p)).scene.cues[0], original);
  const fade = first.locator('[data-handle="fadeIn"]');
  await drag(p, fade, dx, true);
  assert.equal((await doc(p)).scene.cues[0].fadeIn, 0.4);
  await drag(p, fade, dx);
  assert.equal((await doc(p)).scene.cues[0].fadeIn, 0.9);
  await undo(p);
  assert.equal((await doc(p)).scene.cues[0].fadeIn, 0.4);
  await p.locator("#cue-source-out").fill("1.2");
  await first.focus();
  assert.equal((await doc(p)).scene.cues[0].sourceOut, 1.2);
  await undo(p);
  // Remove other clips so a split can be compared sample-for-sample with the original.
  await second.click();
  await clips.nth(2).click({ modifiers: ["Control"] });
  await p.keyboard.press("Delete");
  await ready(p);
  await first.click();
  const before = await download(p, "export-wav");
  // Split inside the fade-in; the oscillator and the original envelope must continue.
  const ruler = await p.locator(".time-ruler").boundingBox();
  assert.ok(ruler);
  await p.mouse.click(
    ruler.x + (ruler.width * 1.2) / 6,
    ruler.y + ruler.height / 2,
  );
  await first.focus();
  await p.keyboard.press("Control+Shift+d");
  await ready(p);
  d = await doc(p);
  assert.equal(d.scene.cues.length, 2);
  assert.equal(d.scene.cues[1].sourceIn, 0.3);
  assert.deepEqual(d.scene.cues[1].fadeAnchor, [0.1, 1.6]);
  const after = await download(p, "export-wav");
  assert.deepEqual(
    after,
    before,
    "Splitting preserves every exported sample, including fades",
  );
  await p.reload();
  await ready(p);
  assert.deepEqual(await download(p, "export-wav"), before);
  // Replay the real scheduled AudioBufferSource offsets and gain automation offline.
  const ruler2 = await p.locator(".time-ruler").boundingBox();
  assert.ok(ruler2);
  await p.mouse.click(ruler2.x, ruler2.y + ruler2.height / 2);
  await p.evaluate(() => {
    (window as any).schedules = [];
  });
  await p.locator("#play").click();
  await p.waitForFunction(() => (window as any).schedules.length >= 2);
  await p.locator("#pause").click();
  const metrics = await p.evaluate(
    async (expected) => {
      // Transport drift can reschedule while an offline render is awaiting completion.
      // Capture one complete scheduling batch before replaying it at several clocks.
      const schedules = (window as any).schedules.slice(0, 2) as any[],
        origin = schedules[0].when - 1;
      let maxError = 0,
        comparedFrames = 0;
      // Preserve real scheduling, then vary the audio clock to cover floating-point
      // timestamps on either side of a sample boundary (including a split in a fade).
      for (const clock of [origin, 904 / 48000, 1859 / 48000]) {
        const delta = clock - origin,
          originFrame = Math.round(clock * 48000),
          expectedStart = Math.max(0, -originFrame);
        const offline = new OfflineAudioContext(
          1,
          expected.length + originFrame,
          48000,
        );
        for (const s of schedules) {
          const source = offline.createBufferSource(),
            gain = offline.createGain(),
            bus = offline.createGain();
          source.buffer = offline.createBuffer(1, s.pcm.length, 48000);
          source.buffer.copyToChannel(s.pcm, 0);
          bus.gain.value = 0.8;
          gain.gain.value = s.initialGain;
          for (const e of s.events)
            (gain.gain[e.method as "setValueAtTime"] as any)(
              e.value,
              e.time + delta,
            );
          source.connect(gain).connect(bus).connect(offline.destination);
          source.start(s.when + delta, s.offset, s.duration);
        }
        const pcm = (await offline.startRendering())
          .getChannelData(0)
          .subarray(Math.max(0, originFrame));
        if (pcm.length !== expected.length - expectedStart)
          throw new Error("PCM alignment length mismatch");
        comparedFrames += pcm.length;
        for (let i = 0; i < pcm.length; i++)
          maxError = Math.max(
            maxError,
            Math.abs(
              Math.round(
                Math.max(-1, Math.min(1, pcm[i]!)) *
                  (pcm[i]! < 0 ? 32768 : 32767),
              ) - expected[expectedStart + i]!,
            ),
          );
      }
      return {
        maxError,
        comparedFrames,
        offsets: schedules.map((s) => s.offset),
        durations: schedules.map((s) => s.duration),
      };
    },
    Array.from({ length: (before.length - 44) / 2 }, (_, i) =>
      before.readInt16LE(44 + i * 2),
    ),
  );
  assert.ok(metrics.maxError <= 2, JSON.stringify(metrics));
  assert.deepEqual(metrics.offsets, [0.1, 0.3]);
  await p.mouse.click(
    ruler2.x + (ruler2.width * 1.35) / 6,
    ruler2.y + ruler2.height / 2,
  );
  await p.evaluate(() => {
    (window as any).schedules = [];
  });
  await p.locator("#play").click();
  await p.waitForFunction(() => (window as any).schedules.length >= 1);
  const seek = await p.evaluate(() => {
    const s = (window as any).schedules[0];
    return {
      offset: s.offset,
      duration: s.duration,
      firstGain: s.events[0].value,
    };
  });
  assert.ok(seek.offset >= 0.45 && seek.offset < 0.55, JSON.stringify(seek));
  assert.ok(Math.abs(seek.offset + seek.duration - 1.6) < 1 / 48000);
  assert.ok(
    Math.abs(
      seek.firstGain -
        0.6 * Math.min(1, (seek.offset - 0.1) / 0.4, (1.6 - seek.offset) / 0.5),
    ) < 0.00001,
  );
  await p.locator("#pause").click();
  // Export and reopen scene JSON, retaining edits and fade anchors.
  const project = await download(p, "save-project");
  assert.deepEqual(
    JSON.parse(project.toString()).cues,
    (await doc(p)).scene.cues,
  );
  await p.locator("#project-file").setInputFiles({
    name: "cut-scene.json",
    mimeType: "application/json",
    buffer: project,
  });
  await ready(p);
  assert.deepEqual(await download(p, "export-wav"), before);
  await first.click();
  await p.mouse.move(800, 40);
  await p.screenshot({
    path: "artifacts/editor-timeline-desktop.png",
    fullPage: true,
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({
    path: "artifacts/editor-timeline-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS group selection/move/copy/mute/delete/Undo, persistence, trim/fade drag/cancel, sample-identical split, real preview gain/offset parity with WAV, project round trip and mobile layout",
    metrics,
  );
} finally {
  await browser.close();
  server.httpServer.close();
}
