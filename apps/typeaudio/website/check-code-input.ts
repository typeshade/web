import type { Page } from "playwright-core";

export async function codeInput(page: Page) {
  await page.locator('#graph-code[data-ready="true"]').waitFor();
  const input = page.locator("#graph-code textarea.inputarea");
  await input.focus();
  return input;
}
export async function writeCode(page: Page, text: string) {
  await codeInput(page);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate((source) => navigator.clipboard.writeText(source), text);
  await page.keyboard.press("Control+a");
  // Paste a module as one edit; typing embedded newlines would repeatedly auto-indent it.
  await page.keyboard.press(text ? "Control+v" : "Backspace");
}
export async function readCode(page: Page) {
  const input = await codeInput(page);
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Control+a");
  if (!(await input.inputValue())) return "";
  // Monaco abbreviates long selections in its input textarea. Copy uses the complete model.
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.keyboard.press("Control+c");
  return page.evaluate(() => navigator.clipboard.readText());
}
