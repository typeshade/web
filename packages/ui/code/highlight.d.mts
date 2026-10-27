export function isTypeScriptExpression(value: string): boolean;
export function highlightTypeScriptInline(
  value: string,
): Promise<string | undefined>;
export function highlightTypeScriptBlock(value: string): Promise<string>;
export function prepareMarkedHighlights(
  marked: any,
  markdown: string,
): Promise<{
  tokens: any[];
  highlighted: Map<string, string>;
}>;
