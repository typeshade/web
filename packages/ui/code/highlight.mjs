import { createHighlighter } from "shiki";

const highlighters = new Map();
const customHighlighters = new WeakMap();
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

/**
 * Whether an inline code span is source text. A command, a path, a module specifier, a file
 * name, a URL, a flag and prose in Hangul stay in the code face. Every other span is code in the
 * language the fenced blocks use, so a keyword, a name and an operator get the same tokens there.
 */
export function isInlineSourceCode(value) {
  const text = String(value).trim();
  if (
    !text ||
    /\n/.test(text) ||
    /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(text)
  )
    return false;
  if (/→/.test(text)) return false;
  // A sentence kept in the code face, such as a diagnostic message, is not source.
  const words = text.split(/\s+/);
  if (
    words.length >= 4 &&
    !/[={};&?<>[\]]/.test(text) &&
    words.filter((w) => /^[a-z]{2,}[.,]?$/.test(w)).length >= 4
  )
    return false;
  if (/^fn\s+\w+\s*\(/.test(text) || /\bvar\s*<[^>]+>/.test(text)) return false;
  if (/^(?:npm|pnpm|bun|bunx|npx|node|cargo|git|python|pip|gh)\s/.test(text))
    return false;
  if (
    /^(?:[a-z]+:)?\/\//i.test(text) ||
    /^--?[a-z][\w-]*(?:=\S*)?$/i.test(text)
  )
    return false;
  if (/^[@\w.~-]+(?:\/[@\w.~-]*)+$/.test(text)) return false;
  if (
    /^[\w.-]+\.(?:ts|tsx|js|mjs|cjs|json|md|mdx|astro|css|html|wgsl|glsl|yml|yaml|toml)$/i.test(
      text,
    )
  )
    return false;
  return true;
}

/**
 * Tokenize an inline code span with the grammar and palettes of the fenced blocks. `langs` adds
 * the site's own grammars, so `f32` and `uniform` get the tokens they get in a block.
 */
export async function highlightInlineCode(value, { langs } = {}) {
  const text = String(value);
  if (!isInlineSourceCode(text)) return undefined;
  const spans = await highlightTokens(text, "typescript", langs, true);
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

/** One highlighter per grammar set, so a site that adds grammars still shares the default one. */
function getHighlighter(extraLangs) {
  if (extraLangs?.length) {
    let created = customHighlighters.get(extraLangs);
    if (!created) {
      created = createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: ["typescript", "tsx", ...extraLangs],
      });
      customHighlighters.set(extraLangs, created);
    }
    return created;
  }
  if (!highlighters.has("default"))
    highlighters.set(
      "default",
      createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: ["typescript", "tsx"],
      }),
    );
  return highlighters.get("default");
}

/**
 * A bare type name is a type in a block (`let x: f32`) and a plain identifier on its own line, so
 * an inline span that reads as a type is tokenized after a type annotation and the prefix is cut.
 */
const TYPE_PREFIX = "type _ = ";
const TYPE_LIKE =
  /^(?![A-Z][A-Z0-9_]*$)(?:[A-Z]\w*|number|string|boolean|bigint|void|never|unknown|any|object|symbol|undefined|null|(?:f16|f32|f64|[iu](?:8|16|32|64)|bool|atomic|ptr|array|uniform|storage|vec[234]\w*|mat[234](?:x[234])?\w*|texture\w*|sampler\w*))(?:<[\w\s,.|"'[\]<>]*>)?(?:\[\])*(?:\s*\|\s*[\w.]+(?:<[\w\s,.|"'[\]<>]*>)?(?:\[\])*)*$/;

async function highlightTokens(
  text,
  language,
  extraLangs,
  matchBlocks = false,
) {
  const typed = matchBlocks && TYPE_LIKE.test(text.trim());
  const result = await (
    await getHighlighter(extraLangs)
  ).codeToTokens(typed ? TYPE_PREFIX + text : text, {
    lang: language,
    themes: { light: "github-light", dark: "github-dark" },
  });
  return result.tokens
    .map((line) =>
      line
        .flatMap((token) => {
          if (!typed) return [token];
          const cut = TYPE_PREFIX.length - token.offset;
          if (cut <= 0) return [token];
          return cut >= token.content.length
            ? []
            : [{ ...token, content: token.content.slice(cut) }];
        })
        .map((token) => {
          const style = tokenColors(token.htmlStyle, matchBlocks);
          return `<span${style ? ` style="${escapeHtml(style)}"` : ""}>${escapeHtml(token.content)}</span>`;
        })
        .join(""),
    )
    .join("\n");
}

// Expressive Code lifts a syntax color that reads below 5.5:1 on the frame's background
// (minSyntaxHighlightingColorContrast), so a block and an inline span give the same word the same
// color when the span applies the same floor. The backgrounds are the code frame's (ec.config.mjs).
const FRAME_BACKGROUND = { light: "#ffffff", dark: "#1f1f1f" };
const MIN_CONTRAST = 5.5;

const channels = (hex) => {
  const h = hex.replace("#", "");
  const full =
    h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const toHex = (rgb) =>
  "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function withContrastFloor(color, theme) {
  if (!/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  const background = channels(FRAME_BACKGROUND[theme]);
  const target = theme === "light" ? [0, 0, 0] : [255, 255, 255];
  let rgb = channels(color);
  for (
    let step = 0;
    step <= 100 && contrast(rgb, background) < MIN_CONTRAST;
    step += 1
  )
    rgb = channels(color).map((v, i) => v + (target[i] - v) * (step / 100));
  return toHex(rgb).toUpperCase();
}

function tokenColors(style = {}, floor = false) {
  const declarations = [];
  if (style.color)
    declarations.push(
      `--shiki-light:${floor ? withContrastFloor(style.color, "light") : style.color}`,
    );
  if (style["--shiki-dark"])
    declarations.push(
      `--shiki-dark:${floor ? withContrastFloor(style["--shiki-dark"], "dark") : style["--shiki-dark"]}`,
    );
  return declarations.join(";");
}
