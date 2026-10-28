import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";

const roots = process.argv.slice(2).map((directory) => resolve(directory));
assert.ok(roots.length, "Pass one or more built site directories.");
const browser = await chromium.launch({
  executablePath: process.env.UI_CHROMIUM || undefined,
  args: ["--no-sandbox"],
});
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};
try {
  for (const root of roots) {
    const server = createServer(async (request, response) => {
      try {
        let file = resolve(
          root,
          "." +
            decodeURIComponent(
              new URL(request.url, "http://localhost").pathname,
            ),
        );
        assert.ok(file === root || file.startsWith(root + sep));
        if ((await stat(file)).isDirectory())
          file = resolve(file, "index.html");
        response.setHeader(
          "Content-Type",
          mime[extname(file)] ?? "application/octet-stream",
        );
        response.end(await readFile(file));
      } catch {
        response.writeHead(404);
        response.end();
      }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const base = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      for (const route of ["/", "/ko/", "/playground/", "/lab/"]) {
        try {
          await stat(resolve(root, "." + route, "index.html"));
        } catch {
          continue;
        }
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal((await page.goto(base + route)).status(), 200);
          await page.locator("h1").first().waitFor();
          assert.equal(await page.locator("h1").count(), 1, route);
          await page.evaluate(() => document.fonts.ready);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${root}${route} overflow at ${width}px`,
          );
          assert.ok(
            await page.locator('a[href="#main"]').count(),
            "Skip link exists",
          );
        }
      }
      if (root.includes("typenn")) {
        await page.goto(base + "/playground/");
        await page.waitForFunction(
          () => !document.querySelector("astro-island[ssr]"),
        );
        await page.locator(".ant-select-selector").nth(1).click();
        await page.locator('.ant-select-item-option[title="CPU"]').click();
        await page
          .getByRole("button", { name: "Run TypeNN", exact: true })
          .click();
        await page.locator(".matrix-result output").first().waitFor();
        assert.deepEqual(
          await page.locator(".matrix-result output").allTextContents(),
          ["19", "22", "43", "50"],
        );
        const light = await page
          .locator(".ant-select-selector")
          .first()
          .evaluate((node) => getComputedStyle(node).backgroundColor);
        await page.getByRole("switch").click();
        await page.waitForFunction(
          (before) =>
            getComputedStyle(document.querySelector(".ant-select-selector"))
              .backgroundColor !== before,
          light,
        );
        await page.getByRole("switch").click();
        await page.waitForFunction(
          () => document.documentElement.dataset.theme === "light",
        );
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(base + "/");
      assert.equal(
        await page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--ui-radius-control")
            .trim(),
        ),
        "6px",
        "Shared tokens resolve",
      );
      assert.equal(
        await page
          .locator(".button-primary")
          .first()
          .evaluate((node) => getComputedStyle(node).color),
        "rgb(255, 255, 255)",
        "Primary action styles resolve",
      );
      if (process.env.UI_SCREENSHOTS) {
        await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
        await page.screenshot({
          path: resolve(
            process.env.UI_SCREENSHOTS,
            root.replaceAll("/", "-") + ".png",
          ),
          fullPage: true,
        });
      }
      const switcher = page
        .locator('[role="switch"], [data-theme-toggle]')
        .filter({ visible: true })
        .first();
      await switcher.waitFor();
      // Wait for React hydration, then exercise the same switch twice.
      await page.waitForFunction(
        () => !document.querySelector("astro-island[ssr]"),
      );
      await switcher.click();
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
      );
      await page.reload();
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
      );
      await page.waitForFunction(
        () => !document.querySelector("astro-island[ssr]"),
      );
      await page
        .locator('[role="switch"], [data-theme-toggle]')
        .filter({ visible: true })
        .first()
        .click();
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "light",
      );
      assert.deepEqual(errors, [], "No client exceptions");
      console.log(
        `PASS ${root}: English/Korean, desktop/mobile, hydration, persisted theme`,
      );
    } finally {
      await context.close();
      await new Promise((done) => server.close(done));
    }
  }
} finally {
  await browser.close();
}
