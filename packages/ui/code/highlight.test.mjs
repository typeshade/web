import assert from "node:assert/strict";
import test from "node:test";
import {
  highlightTypeScriptBlock,
  highlightTypeScriptInline,
  isTypeScriptExpression,
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
});
