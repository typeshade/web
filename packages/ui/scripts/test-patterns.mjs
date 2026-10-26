import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { serve } from "./serve.mjs";

const { server, base } = await serve(process.argv[2] ?? "apps/ui/dist");
const browser = await chromium.launch({
  executablePath: process.env.UI_CHROMIUM || undefined,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/patterns/");
  await page.waitForFunction(
    () => !document.querySelector("astro-island[ssr]"),
  );
  const focused = async (locator) =>
    assert.ok(await locator.evaluate((el) => el === document.activeElement));
  const selected = async (list, name) => {
    await page.waitForFunction(
      ({ label, name }) =>
        [
          ...document.querySelectorAll(
            `[role="tablist"][aria-label="${label}"] [role="tab"]`,
          ),
        ].some(
          (tab) =>
            tab.textContent.trim() === name &&
            tab.getAttribute("aria-selected") === "true",
        ),
      { label: await list.getAttribute("aria-label"), name },
    );
    const tab = list.getByRole("tab", { name, exact: true });
    await focused(tab);
    assert.equal(await list.locator('[tabindex="0"]').count(), 1);
    assert.ok(
      await page
        .locator(`[id="${await tab.getAttribute("aria-controls")}"]`)
        .isVisible(),
    );
  };
  const react = page.getByRole("tablist", { name: "Result views" });
  await react.getByRole("tab", { name: "Result", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await selected(react, "Source"); // disabled tab is skipped
  await page.keyboard.press("End");
  await selected(react, "Diagnostics");
  await page.keyboard.press("ArrowRight");
  await selected(react, "Result");
  await page.keyboard.press("ArrowLeft");
  await selected(react, "Diagnostics");
  await page.keyboard.press("Home");
  await selected(react, "Result");
  await page.keyboard.press("Tab");
  await focused(page.getByRole("tabpanel", { name: "Result", exact: true }));
  await react.evaluate((el) => (el.dir = "rtl"));
  await react.getByRole("tab", { name: "Result", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await selected(react, "Source");
  await react.evaluate((el) => el.removeAttribute("dir"));

  const native = page.getByRole("tablist", { name: "Native output formats" });
  await native.getByRole("tab", { name: "WGSL", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await selected(native, "GLSL");
  assert.ok(
    await page
      .getByRole("tabpanel", { name: "WGSL", exact: true, includeHidden: true })
      .isHidden(),
  );
  await page.keyboard.press("Home");
  await selected(native, "WGSL");
  await native.evaluate((el) =>
    el.setAttribute("aria-orientation", "vertical"),
  );
  await page.keyboard.press("ArrowDown");
  await selected(native, "GLSL");
  await native.evaluate((el) => el.removeAttribute("aria-orientation"));

  await page.locator('label[for="native-name"]').click();
  await focused(
    page.getByRole("textbox", { name: "Native model name", exact: true }),
  );
  assert.equal(
    await page.getByLabel("Invalid native field").getAttribute("aria-invalid"),
    "true",
  );
  assert.equal(
    await page.locator("#native-invalid-error").textContent(),
    "Enter a valid value.",
  );
  await page.getByLabel("Native execution tier").selectOption("cpu");
  assert.equal(
    await page.getByLabel("Native execution tier").inputValue(),
    "cpu",
  );
  await page.getByLabel("Remember this configuration").focus();
  await page.keyboard.press("Space");
  assert.ok(await page.getByLabel("Remember this configuration").isChecked());
  assert.ok(await page.getByTestId("hidden-action").isHidden());

  const opener = page.getByRole("button", {
    name: "Open configuration",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Configure a run" });
  await opener.click();
  await focused(page.getByRole("textbox", { name: "Run name", exact: true }));
  const save = dialog.getByRole("button", { name: "Save configuration" });
  await save.focus();
  await page.keyboard.press("Tab");
  await focused(page.getByRole("textbox", { name: "Run name", exact: true }));
  await page.keyboard.press("Shift+Tab");
  await focused(save);
  await save.click();
  assert.ok(
    await dialog.isVisible(),
    "Required input prevents invalid submission",
  );
  await focused(page.getByRole("textbox", { name: "Run name", exact: true }));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await focused(opener);
  await opener.click();
  await page
    .getByRole("textbox", { name: "Run name", exact: true })
    .fill("Test run");
  await save.click();
  await dialog.waitFor({ state: "hidden" });
  await focused(opener);
  assert.equal(
    await page.locator("#sample-dialog").evaluate((el) => el.returnValue),
    "save",
  );
  await opener.click();
  await page.getByRole("button", { name: "Cancel configuration" }).click();
  await dialog.waitFor({ state: "hidden" });
  await focused(opener);

  const languages = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Languages" }) });
  const versions = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Versions" }) });
  await languages.locator("summary").click();
  assert.ok(await languages.getByRole("link", { name: "English" }).isVisible());
  await versions.locator("summary").click();
  await page.waitForFunction(
    () => document.querySelectorAll("details[open]").length === 1,
  );
  assert.equal(await languages.getAttribute("open"), null);
  await versions.getByRole("link").focus();
  await page.keyboard.press("Escape");
  await focused(versions.locator("summary"));
  assert.equal(await versions.getAttribute("open"), null);
  await languages.locator("summary").click();
  await page.locator("h1").click();
  assert.equal(await languages.getAttribute("open"), null);
  const mobile = page.locator("[data-modal-menu]");
  await mobile.locator("summary").click();
  await page.waitForFunction(
    () => document.documentElement.style.overflow === "hidden",
  );
  await mobile.getByRole("button").focus();
  await page.keyboard.press("Tab");
  await focused(mobile.locator("summary"));
  await page.keyboard.press("Shift+Tab");
  await focused(mobile.getByRole("button"));
  await page.keyboard.press("Escape");
  await focused(mobile.locator("summary"));
  assert.equal(
    await page.evaluate(() => document.documentElement.style.overflow),
    "",
  );

  const hint = page.getByRole("button", { name: "Explain configuration" });
  const tip = page.getByRole("tooltip");
  await hint.focus();
  await tip.waitFor();
  assert.equal(
    await hint.getAttribute("aria-describedby"),
    await tip.getAttribute("id"),
  );
  await page.keyboard.press("Escape");
  assert.ok(await tip.isHidden());
  await opener.focus();
  await hint.hover();
  await tip.waitFor();
  await tip.hover();
  assert.ok(await tip.isVisible(), "Hint remains hoverable");
  await page.keyboard.press("Escape");
  assert.ok(await tip.isHidden(), "Escape dismisses a pointer-triggered hint");

  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await page.getByRole("switch").click();
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
      );
      // Contrast snapshots must sample the settled theme, not the button color transition.
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector("[data-open-dialog]"))
            .backgroundColor === "rgb(20, 20, 20)",
      );
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${theme}, ${width}px overflow`,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const open of [false, true]) {
      if (open) await opener.click();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      assert.deepEqual(
        audit.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
        `${theme}, dialog ${open}: accessibility`,
      );
      if (open) {
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
      }
    }
    if (process.env.UI_SCREENSHOTS) {
      await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
      await page.screenshot({
        path: resolve(process.env.UI_SCREENSHOTS, `patterns-${theme}.png`),
        fullPage: true,
      });
    }
  }
  assert.deepEqual(errors, [], "No client exceptions");
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJS.newPage();
  await staticPage.goto(base + "/patterns/");
  assert.ok(await staticPage.locator("#native-panel-a").isVisible());
  assert.ok(await staticPage.locator("#native-panel-b").isVisible());
  assert.ok(
    await staticPage.locator('[data-native-tabs] [role="tablist"]').isHidden(),
  );
  await noJS.close();
  console.log(
    "PASS patterns: native forms, React/native tabs, disabled/RTL/vertical navigation, dialog validation/focus/dismissal, disclosure menus, hover/focus tooltips, themes, 320–1440px, axe, progressive content",
  );
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
