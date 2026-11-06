import type { Page } from "playwright-core";

export async function codeInput(page: Page) {
  await page.locator('#graph-code[data-ready="true"]').waitFor();
  const input = page.locator("#graph-code textarea.inputarea");
  await input.focus();
  return input;
}
export async function writeCode(page: Page, text: string) {
  await codeInput(page);
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(text);
}
export async function readCode(page: Page) {
  const input = await codeInput(page);
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Control+a");
  return input.inputValue();
}
