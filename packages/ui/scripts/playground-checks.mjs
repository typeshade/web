import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { checkEditorCoordinates } from "./editor-checks.mjs";

export async function checkPlayground(page, base, site) {
  for (const locale of ["", "/ko"]) {
    await page.goto(base + locale + "/playground/");
    await page.waitForFunction(
      () => !document.querySelector("astro-island[ssr]"),
    );
    if (site === "typecv") {
      await page.locator("#pair-backend").selectOption("cpu");
      await page.locator("#pair-noise").selectOption("0");
      await page.locator("#pair-outliers").selectOption("0");
      await page.locator("#run").click();
      await page.waitForFunction(
        () =>
          ["success", "error", "rejected"].includes(
            document.querySelector("#status")?.dataset.state,
          ),
        undefined,
        { timeout: 60000 },
      );
      assert.equal(
        await page.locator("#status").getAttribute("data-state"),
        "success",
      );
      assert.ok(await page.locator("#results").isVisible());
      const result = await page.evaluate(
        () => window.__typecvPlayground.result,
      );
      assert.equal(result.backend, "cpu");
      assert.equal(result.count, 128);
      assert.ok(
        result.inliers > 100 && result.quality > 100 && result.errorPx < 0.1,
        "CPU pair verification retains accurate geometry",
      );
      await page.locator("#pair-count").selectOption("64");
      assert.ok(
        await page.locator("#results").isHidden(),
        "Changing a field resets stale results",
      );
    } else if (site === "typeshade") {
      await page.locator("[data-open-blank]").click();
      const tabs = page.locator('.output-tabs [role="tab"]');
      await tabs.first().waitFor();
      // Compilation/editor mounting is asynchronous; wait until the output handlers respond.
      await page.waitForFunction(
        () => !!document.querySelector(".monaco-editor"),
        undefined,
        { timeout: 60000 },
      );
      await tabs.first().focus();
      await page.keyboard.press("End");
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-target="console"]')
            ?.getAttribute("aria-selected") === "true",
      );
      assert.ok(await page.locator("#pg-panel-console").isVisible());
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-target="wgsl"]')
            ?.getAttribute("aria-selected") === "true",
      );
      assert.ok(await page.locator("#pg-output").isVisible());
      await page.waitForFunction(
        () =>
          /^[0-9]+ B$/.test(
            document.querySelector("[data-output-size]")?.textContent ?? "",
          ),
        undefined,
        { timeout: 60000 },
      );
      assert.ok(
        await page.locator("[data-run]").isVisible(),
        "The output byte count must not replace an action",
      );
      await page.locator("[data-opt-minify]").check();
      assert.ok(await page.locator("[data-numbers-field]").isVisible());
      await page.locator("[data-opt-minify]").uncheck();
      assert.ok(await page.locator("[data-numbers-field]").isHidden());
      const submit = page.locator("[data-submit]");
      await submit.click();
      const dialog = page.locator("[data-submit-dialog]");
      assert.ok(await dialog.isVisible());
      assert.ok(
        await page
          .locator("#playground-submit-title")
          .evaluate((el) => el === document.activeElement),
      );
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.ok(await submit.evaluate((el) => el === document.activeElement));
      const fileAction = page.locator("[data-new-file]");
      await fileAction.focus();
      const tipId = await fileAction.getAttribute("aria-describedby");
      assert.ok(tipId, "Editor actions use the shared tooltip");
      assert.ok(await page.locator(`[id="${tipId}"]`).isVisible());
      await page.keyboard.press("Escape");
      assert.ok(await page.locator(`[id="${tipId}"]`).isHidden());
      if (!locale) await checkEditorCoordinates(page);
    }
    const scope =
      site === "typecv"
        ? "#pair-form"
        : site === "typenn"
          ? ".playground-controls"
          : ".playground-options";
    const audit = await new AxeBuilder({ page })
      .include(scope)
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
      `${site}${locale} playground form accessibility`,
    );
  }
  if (site === "typeshade") {
    // Exercise only dialog presentation. No report or gallery submission leaves the browser.
    await page.route("**/data/issues/", (route) =>
      route.fulfill({ json: { open: true } }),
    );
    await page.goto(base + "/");
    await page
      .locator("[data-search-open]")
      .filter({ visible: true })
      .first()
      .click();
    await page.locator(".search-dialog input").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".search-dialog").waitFor({ state: "hidden" });
    const report = page
      .locator("a[data-report]")
      .filter({ visible: true })
      .first();
    await report.click();
    const dialog = page.locator("[data-issue-dialog]");
    await dialog.waitFor();
    assert.ok(
      await page
        .locator("#issue-title")
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator("[data-issue-cancel]").click();
    await dialog.waitFor({ state: "hidden" });
    assert.ok(await report.evaluate((el) => el === document.activeElement));
    await page.unroute("**/data/issues/");
  }
}
