export function isTypeScriptExpression(value: string): boolean;
export function highlightTypeScriptInline(
  value: string,
): Promise<string | undefined>;
export function isInlineSourceCode(value: string): boolean;
export function highlightInlineCode(
  value: string,
  options?: { langs?: readonly unknown[] },
): Promise<string | undefined>;
export function highlightTypeScriptBlock(
  value: string,
  language?: "typescript" | "tsx",
): Promise<string>;
export function typescriptFenceLanguage(
  info: string | undefined,
): "typescript" | "tsx" | undefined;
export interface MarkedLexer<TTokens> {
  lexer(markdown: string): TTokens;
}
export function prepareMarkedHighlights<TTokens>(
  marked: MarkedLexer<TTokens>,
  markdown: string,
): Promise<{
  tokens: TTokens;
  highlighted: Map<string, string>;
}>;
