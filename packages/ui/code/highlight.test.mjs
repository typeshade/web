import assert from "node:assert/strict";
import test from "node:test";
import {
  highlightInlineCode,
  highlightTypeScriptBlock,
  highlightTypeScriptInline,
  isInlineSourceCode,
  isTypeScriptExpression,
  prepareMarkedHighlights,
  typescriptFenceLanguage,
} from "./highlight.mjs";

const textContent = (html) =>
  html
    .replace(/<[^>]*>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");

test("inline code highlights TypeScript expressions but leaves names as names", async () => {
  assert.equal(isTypeScriptExpression("Texture2D"), false);
  assert.equal(isTypeScriptExpression("npm run check:api"), false);
  assert.equal(isTypeScriptExpression("cargo test --features webgpu"), false);
  assert.equal(isTypeScriptExpression("@builtin(position)"), false);
  assert.equal(isTypeScriptExpression("vec3<f32>"), false);
  assert.equal(isTypeScriptExpression("fn main() {}"), false);
  assert.equal(
    isTypeScriptExpression("var<storage, read> data: array<u32>"),
    false,
  );
  assert.equal(isTypeScriptExpression("textureSample(tex, samp, uv)"), false);
  assert.equal(
    isTypeScriptExpression("const x: vec4<f32> = vec4<f32>(1.0)"),
    false,
  );
  assert.equal(isTypeScriptExpression("relu()"), true);
  assert.equal(isTypeScriptExpression('"use typeshade"'), true);
  assert.equal(isTypeScriptExpression("false"), true);
  assert.equal(isTypeScriptExpression("3.14"), true);
  assert.equal(isTypeScriptExpression("uniform<Params>"), true);
  assert.equal(isTypeScriptExpression("uniform<Params>(camera)"), true);
  assert.equal(isTypeScriptExpression("typeshade/algorithms"), false);
  assert.equal(await highlightTypeScriptInline("Texture2D"), undefined);
  const html = await highlightTypeScriptInline("const value: number = 2");
  assert.match(html, /data-language="typescript"/);
  assert.match(html, /--shiki-light:/);
  assert.match(html, /--shiki-dark:/);
  assert.equal(textContent(html), "const value: number = 2");
  assert.equal(
    await highlightTypeScriptInline("const value: number = 2"),
    html,
  );
});

test("inline and fenced output escape source while preserving selectable text and lines", async () => {
  const inline = await highlightTypeScriptInline('const tag = "<tag>"');
  assert.match(inline, /&lt;tag&gt;/);
  assert.equal(textContent(inline), 'const tag = "<tag>"');

  const source = "const value = 2\nreturn value";
  const block = await highlightTypeScriptBlock(source);
  assert.match(
    block,
    /<pre class="ts-code-block"><code class="language-typescript">/,
  );
  assert.equal(textContent(block), source);
  assert.match(block, /--shiki-dark:/);
  const trailingNewline = await highlightTypeScriptBlock("const end = true\n");
  assert.equal(textContent(trailingNewline), "const end = true\n");
});

test("fence aliases and metadata select TS or TSX while unknown languages stay untouched", async () => {
  assert.equal(typescriptFenceLanguage("ts"), "typescript");
  assert.equal(typescriptFenceLanguage('ts title="example.ts"'), "typescript");
  assert.equal(typescriptFenceLanguage("typescript {.sample}"), "typescript");
  assert.equal(typescriptFenceLanguage("tsx title=Component.tsx"), "tsx");
  assert.equal(typescriptFenceLanguage("typescriptreact"), "tsx");
  assert.equal(typescriptFenceLanguage("wgsl"), undefined);
  assert.equal(typescriptFenceLanguage(undefined), undefined);

  const jsx = "const node = <Button disabled />\n";
  const ts = await highlightTypeScriptBlock(jsx, "typescript");
  const tsx = await highlightTypeScriptBlock(jsx, "tsx");
  assert.notEqual(
    ts.replace('class="language-typescript"', ""),
    tsx.replace('class="language-tsx"', ""),
    "TSX must produce different tokens, not just a different language class",
  );
  assert.match(tsx, /class="language-tsx"/);
  assert.equal(textContent(tsx), jsx);

  const tokens = [
    { type: "code", lang: 'ts title="example.ts"', text: "const value = 1" },
    { type: "code", lang: "tsx", text: jsx },
    {
      type: "code",
      lang: "wgsl",
      text: "@compute @workgroup_size(1) fn main() {}",
    },
  ];
  const { highlighted } = await prepareMarkedHighlights(
    { lexer: () => tokens },
    "",
  );
  assert.match(
    highlighted.get(`block:ts title="example.ts":const value = 1`),
    /language-typescript/,
  );
  assert.match(highlighted.get(`block:tsx:${jsx}`), /language-tsx/);
  assert.equal(
    highlighted.has(`block:wgsl:@compute @workgroup_size(1) fn main() {}`),
    false,
  );
});

test("inline source code covers every span but commands, paths, file names and prose", async () => {
  for (const code of [
    "push",
    "f32",
    "if",
    "+=",
    "c ? a : b",
    "select(b, a, c)",
    "vec3<f32>",
    "@compute",
    "TS8070",
  ])
    assert.equal(isInlineSourceCode(code), true, code);
  for (const code of [
    "bun run build",
    "typeshade/runtime",
    "@typeshade/mcp",
    "src/i18n/en.ts",
    "host.ts",
    "tsconfig.json",
    "https://typeshade.dev",
    "--features",
    "forward → predict",
    "This loop runs on the CPU because it is not a counted loop.",
    "var<private>",
    "한국어 설명",
    "",
  ])
    assert.equal(isInlineSourceCode(code), false, code);
});

test("inline code takes the tokens a block gives, with a type name read as a type", async () => {
  const text = (html) => textContent(html);
  assert.equal(text(await highlightInlineCode("Map<K, V>")), "Map<K, V>");
  assert.equal(text(await highlightInlineCode("f32")), "f32");
  const type = await highlightInlineCode("f32");
  const annotated = await highlightTypeScriptBlock("let x: f32");
  const color = (html, word) =>
    html.match(new RegExp(`--shiki-light:(#\\w+)[^>]*>${word}<`))?.[1];
  assert.equal(color(type, "f32"), color(annotated, "f32"));
  assert.equal(await highlightInlineCode("src/i18n/en.ts"), undefined);
});
