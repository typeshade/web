import { createHighlighter } from "shiki";

let highlighter;
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

/** Keep names and labels as prose; only send code with visible TypeScript syntax to Shiki. */
export function isTypeScriptExpression(value) {
  const text = String(value).trim();
  if (
    !text ||
    /^@[\w]+\s*\(/.test(text) ||
    /^fn\s+\w+\s*\(/.test(text) ||
    /\bvar\s*<[^>]+>/.test(text) ||
    /\bvar\s+\w+\s*:\s*(?:f16|f32|f64|u32|i32|u16|i16)\b/.test(text) ||
    /\b(?:vec[234]|mat[234]x[234]|array)<\s*(?:f16|f32|f64|u32|i32|u16|i16)\s*>/.test(
      text,
    ) ||
    /\b(?:textureSample|textureLoad|textureStore|select)\s*\(/.test(text)
  )
    return false;
  if (/^(?:npm|pnpm|bun|npx|node|cargo|git|python|pip)\s/.test(text))
    return false;
  if (
    /^(['"])[\s\S]*\1$/.test(text) ||
    /^(?:true|false|null|undefined|NaN|Infinity|\d+(?:\.\d+)?(?:e[+-]?\d+)?n?)$/i.test(
      text,
    )
  )
    return true;
  if (/^[\w$.-]+$/.test(text)) return false;
  return (
    /\b(?:const|let|var|function|class|type|interface|return|await|new|async|import|export|extends|implements)\b/.test(
      text,
    ) ||
    /[\w$]+\s*\([^)]*\)/.test(text) ||
    /[\w$]+\s*:\s*[\w$<{[]/.test(text) ||
    /\b[\w$]+\s*<[^>]+>/.test(text) ||
    /^@(compute|vertex|fragment)\b/.test(text) ||
    /(?:=>|===?|!==?|\+\+|--|\|\||&&)/.test(text)
  );
}

const TYPESCRIPT_FENCE_LANGUAGES = new Map([
  ["ts", "typescript"],
  ["typescript", "typescript"],
  ["tsx", "tsx"],
  ["typescriptreact", "tsx"],
]);

/** Resolve a Markdown fence's language word, ignoring optional info-string metadata. */
export function typescriptFenceLanguage(info) {
  const firstWord = String(info ?? "")
    .trim()
    .split(/\s+/, 1)[0]
    ?.toLowerCase();
  return TYPESCRIPT_FENCE_LANGUAGES.get(firstWord);
}

/** Tokenize a short inline TypeScript expression with the site's light and dark palettes. */
export async function highlightTypeScriptInline(value) {
  const text = String(value);
  if (!isTypeScriptExpression(text)) return undefined;
  const spans = await highlightTokens(text, "typescript");
  return `<code class="ts-inline-code" data-language="typescript">${spans}</code>`;
}

/** Render a fenced TypeScript or TSX block using selectable, dual-theme tokens. */
export async function highlightTypeScriptBlock(value, language = "typescript") {
  if (language !== "typescript" && language !== "tsx")
    throw new RangeError(
      `Unsupported TypeScript highlighting language: ${language}`,
    );
  const text = String(value);
  const lines = await highlightTokens(text, language);
  return `<pre class="ts-code-block"><code class="language-${language}">${lines}</code></pre>`;
}

/** Precompute token HTML so synchronous Marked renderers can emit real HTML, never promises. */
export async function prepareMarkedHighlights(marked, markdown) {
  const tokens = marked.lexer(markdown);
  const highlighted = new Map();
  const collect = async (value) => {
    if (Array.isArray(value)) {
      for (const item of value) await collect(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const token = value;
    if (token.type === "codespan") {
      const html = await highlightTypeScriptInline(token.text);
      if (html) highlighted.set(`inline:${token.text}`, html);
    } else if (token.type === "code" && typescriptFenceLanguage(token.lang)) {
      const language = typescriptFenceLanguage(token.lang);
      highlighted.set(
        `block:${token.lang}:${token.text}`,
        await highlightTypeScriptBlock(token.text, language),
      );
    }
    for (const child of Object.values(token)) await collect(child);
  };
  await collect(tokens);
  return { tokens, highlighted };
}

function getHighlighter() {
  highlighter ??= createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: ["typescript", "tsx"],
  });
  return highlighter;
}

async function highlightTokens(text, language) {
  const result = await (
    await getHighlighter()
  ).codeToTokens(text, {
    lang: language,
    themes: { light: "github-light", dark: "github-dark" },
  });
  return result.tokens
    .map((line) =>
      line
        .map((token) => {
          const style = tokenColors(token.htmlStyle);
          return `<span${style ? ` style="${escapeHtml(style)}"` : ""}>${escapeHtml(token.content)}</span>`;
        })
        .join(""),
    )
    .join("\n");
}

function tokenColors(style = {}) {
  const declarations = [];
  if (style.color) declarations.push(`--shiki-light:${style.color}`);
  if (style["--shiki-dark"])
    declarations.push(`--shiki-dark:${style["--shiki-dark"]}`);
  return declarations.join(";");
}
