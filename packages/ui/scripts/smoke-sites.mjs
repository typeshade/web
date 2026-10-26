import AxeBuilder from "@axe-core/playwright";
import { serve } from "./serve.mjs";
import assert from "node:assert/strict";
import { stat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { checkPlayground } from "./playground-checks.mjs";

const roots = process.argv.slice(2).map((directory) => resolve(directory));
assert.ok(roots.length, "Pass one or more built site directories.");
const browser = await chromium.launch({
  executablePath: process.env.UI_CHROMIUM || undefined,
  args: ["--no-sandbox"],
});
try {
  for (const root of roots) {
    const { server, base } = await serve(root);
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) =>
      errors.push(`${page.url()}\n${error.stack ?? error.message}`),
    );
    try {
      for (const route of [
        "/",
        "/ko/",
        "/playground/",
        "/ko/playground/",
        "/lab/",
        "/ko/lab/",
        "/guide/",
        "/ko/guide/",
        "/docs/",
        "/ko/docs/",
        "/api/",
        "/ko/api/",
      ]) {
        try {
          await stat(resolve(root, "." + route, "index.html"));
        } catch {
          continue;
        }
        console.log(`Checking ${root}${route}`);
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal((await page.goto(base + route)).status(), 200);
          await page.locator("h1").first().waitFor();
          assert.equal(await page.locator("h1").count(), 1, route);
          await page.evaluate(() => document.fonts.ready);
          if (await page.locator(".ui-home").count()) {
            const typography = await page.evaluate(() => ({
              heading: parseFloat(
                getComputedStyle(document.querySelector(".home-copy h1"))
                  .fontSize,
              ),
              codePadding: parseFloat(
                getComputedStyle(
                  document.querySelector(".code-frame .astro-code"),
                ).paddingLeft,
              ),
            }));
            assert.ok(
              typography.heading >= 42,
              "Home heading survives reset and stylesheet import order",
            );
            assert.ok(
              typography.codePadding >= 13,
              "Code block keeps its readable inset",
            );
          }
          if (await page.locator(".page-heading h1").count()) {
            assert.ok(
              await page
                .locator(".page-heading h1")
                .evaluate(
                  (node) => parseFloat(getComputedStyle(node).fontSize) >= 36,
                ),
              "PageHeading owns its title typography",
            );
          }

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
        if (
          route.endsWith("/lab/") &&
          (root.includes("typenn") || root.includes("typecv"))
        ) {
          await page.waitForFunction(
            () => !document.querySelector("astro-island[ssr]"),
          );
          const wiring = await page.locator(".ui-field").evaluateAll((fields) =>
            fields.map((field) => {
              const label = field.querySelector("label");
              const control = label && document.getElementById(label.htmlFor);
              return Boolean(
                label?.textContent &&
                control &&
                field.contains(control) &&
                (control.getAttribute("aria-describedby") || "")
                  .split(" ")
                  .filter(Boolean)
                  .every((id) => document.getElementById(id)),
              );
            }),
          );
          assert.ok(
            wiring.length > 0 && wiring.every(Boolean),
            `${route} field associations`,
          );
          const audit = await new AxeBuilder({ page })
            .include(root.includes("typenn") ? ".lab-form" : ".sfm-inputs")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          assert.deepEqual(
            audit.violations.map((v) => ({
              id: v.id,
              targets: v.nodes.map((n) => n.target),
            })),
            [],
            `${route} form accessibility`,
          );
          if (root.includes("typecv")) {
            const focal = page.getByRole("spinbutton");
            await focal.fill("1.5");
            await page.keyboard.press("Tab");
            assert.equal(await focal.inputValue(), "1.5");
          }
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
      await checkPlayground(
        page,
        base,
        root.includes("typeshade")
          ? "typeshade"
          : root.includes("typenn")
            ? "typenn"
            : "typecv",
      );
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
          .locator('.ui-button[data-variant="primary"]')
          .first()
          .evaluate((node) => getComputedStyle(node).color),
        "rgb(255, 255, 255)",
        "Primary action styles resolve",
      );
      const actionFont = await page
        .locator('.ui-button[data-variant="primary"]')
        .first()
        .evaluate((node) =>
          getComputedStyle(node).fontFamily.split(",")[0].trim(),
        );
      const bodyFont = await page.evaluate(() =>
        getComputedStyle(document.body).fontFamily.split(",")[0].trim(),
      );
      assert.equal(
        actionFont,
        bodyFont,
        "Shared actions preserve the site font",
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
