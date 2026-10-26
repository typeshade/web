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
  await page.goto(base);
  await page.waitForFunction(
    () => !document.querySelector("astro-island[ssr]"),
  );
  const run = page.getByRole("button", { name: "Run model", exact: true });
  for (const selector of [".ui-number-input", ".ui-select"]) {
    const widths = await page
      .locator(selector)
      .first()
      .evaluate((node) => [
        node.getBoundingClientRect().width,
        node.closest(".ui-field").getBoundingClientRect().width,
      ]);
    assert.ok(
      Math.abs(widths[0] - widths[1]) < 1,
      `${selector}: Tailwind sizing wins over the Ant default width`,
    );
  }
  // Real emitted CSS catches missing workspace @source registration and recipe
  // conflicts that string-only snapshots would miss.
  assert.deepEqual(
    await run.evaluate((node) => {
      const style = getComputedStyle(node);
      return [
        style.backgroundColor,
        style.color,
        style.borderRadius,
        style.minHeight,
      ];
    }),
    ["rgb(9, 88, 217)", "rgb(255, 255, 255)", "6px", "36px"],
  );
  for (const id of ["astro-override", "react-override"]) {
    assert.deepEqual(
      await page.getByTestId(id).evaluate((node) => {
        const style = getComputedStyle(node);
        return [
          style.paddingLeft,
          style.paddingRight,
          style.minHeight,
          style.borderRadius,
        ];
      }),
      ["24px", "24px", "52px", "0px"],
      `${id}: consumer utilities override recipe defaults`,
    );
  }
  for (const [name, expected] of [
    ["Small action", "28px"],
    ["Large action", "44px"],
  ]) {
    assert.equal(
      await page
        .getByRole("button", { name, exact: true })
        .evaluate((node) => getComputedStyle(node).minHeight),
      expected,
    );
  }
  await run.click();
  assert.equal(
    await page.getByTestId("actions-result").textContent(),
    "Actions: 1. Submissions: 0.",
  );
  await page
    .getByRole("button", { name: "Submit example", exact: true })
    .click();
  assert.equal(
    await page.getByTestId("actions-result").textContent(),
    "Actions: 1. Submissions: 1.",
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Disabled action", exact: true })
      .isDisabled(),
  );
  const loading = page.getByRole("button", {
    name: "Preparing model",
    exact: true,
  });
  assert.ok(await loading.isDisabled());
  assert.equal(await loading.getAttribute("aria-busy"), "true");
  await loading.evaluate((element) => element.click());
  await page
    .getByRole("button", { name: "Disabled action", exact: true })
    .evaluate((element) => element.click());
  assert.equal(
    await page.getByTestId("actions-result").textContent(),
    "Actions: 1. Submissions: 1.",
  );
  await page
    .getByRole("button", { name: "Copy settings", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.getByTestId("actions-result").textContent(),
    "Actions: 2. Submissions: 1.",
  );

  const name = page.getByRole("textbox", { name: "Model name", exact: true });
  await page
    .getByText("Model name", { exact: false })
    .filter({ hasNot: page.locator("input") })
    .first()
    .click();
  assert.ok(
    await name.evaluate((el) => el === document.activeElement),
    "Clicking the label focuses its control",
  );
  assert.equal(await name.getAttribute("aria-required"), "true");
  await page
    .getByRole("button", { name: "Validate fields", exact: true })
    .click();
  assert.equal(await name.getAttribute("aria-invalid"), "true");
  const describedBy = await name.getAttribute("aria-describedby");
  assert.equal(
    describedBy.split(" ").length,
    2,
    "Help and error are both associated",
  );
  assert.ok(
    await name.evaluate((el) =>
      el
        .getAttribute("aria-describedby")
        .split(" ")
        .every((id) => document.getElementById(id)?.textContent),
    ),
  );
  await name.fill("Experiment");
  assert.equal(await name.getAttribute("aria-invalid"), null);
  assert.equal(
    (await name.getAttribute("aria-describedby")).split(" ").length,
    1,
  );

  const batch = page.getByRole("spinbutton", {
    name: "Batch size",
    exact: true,
  });
  await batch.fill("64");
  await page.keyboard.press("Tab");
  assert.match(
    await page.getByTestId("form-result").textContent(),
    /Batch: 64/,
  );
  await batch.fill("200");
  await page.keyboard.press("Tab");
  assert.match(
    await page.getByTestId("form-result").textContent(),
    /Batch: 128/,
    "Numeric bounds are retained",
  );
  const optimizer = page.getByRole("combobox", {
    name: "Optimizer",
    exact: true,
  });
  await optimizer.focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    () =>
      document.querySelector('.ui-select input[aria-expanded="true"]') &&
      document.querySelector(".ant-select-item-option-active"),
  );
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    () =>
      document.querySelector(".ant-select-item-option-active")?.textContent ===
      "SGD",
  );
  await page.keyboard.press("Enter");
  assert.match(
    await page.getByTestId("form-result").textContent(),
    /Optimizer: sgd/,
  );
  assert.ok(
    await page
      .getByRole("textbox", { name: "Unavailable input", exact: true })
      .isDisabled(),
  );
  assert.ok(
    await page
      .getByRole("combobox", { name: "Unavailable optimizer", exact: true })
      .isDisabled(),
  );
  const checkbox = page.getByRole("checkbox", {
    name: "Keep settings for the next run",
  });
  await checkbox.focus();
  await page.keyboard.press("Space");
  assert.ok(await checkbox.isChecked());
  const repeated = page.getByRole("textbox", {
    name: "Repeated field",
    exact: true,
  });
  assert.equal(await repeated.count(), 2);
  assert.notEqual(
    await repeated.nth(0).getAttribute("id"),
    await repeated.nth(1).getAttribute("id"),
  );

  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await page.getByRole("switch").click();
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
      );
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector(".ui-input"))
            .backgroundColor === "rgb(20, 20, 20)",
      );
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
        undefined,
        { timeout: 3000 },
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await run.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const focus = await run.evaluate((el) => getComputedStyle(el).outlineStyle);
    assert.equal(focus, "solid", "Keyboard focus remains visible");
    const appearance = await run.evaluate((el) => {
      const css = getComputedStyle(el);
      return [css.backgroundColor, css.color, css.borderRadius, css.minHeight];
    });
    const native = await page.getByTestId("astro-button").evaluate((el) => {
      const css = getComputedStyle(el);
      return [css.backgroundColor, css.color, css.borderRadius, css.minHeight];
    });
    assert.deepEqual(
      appearance,
      native,
      "Astro and React share control styling",
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      `${theme} accessibility`,
    );
    if (process.env.UI_SCREENSHOTS) {
      await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
      await page.screenshot({
        path: resolve(process.env.UI_SCREENSHOTS, `controls-${theme}.png`),
        fullPage: true,
      });
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".ui-spinner")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.emulateMedia({ forcedColors: "active" });
  assert.notEqual(
    await run.evaluate((el) => getComputedStyle(el).borderStyle),
    "none",
  );
  assert.deepEqual(errors, [], "No hydration/client exceptions");
  console.log(
    "PASS controls: labels, descriptions, errors, keyboard, numeric bounds, disabled/loading, themes, 320–1440px, axe, reduced motion, forced colors",
  );
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
