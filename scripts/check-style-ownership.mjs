import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

// These are the only app-wide layers. Adding feature CSS here would load it on
// every route again, even if global.css itself remained a short list of imports.
const common = new Set([
  "tailwindcss",
  "antd/dist/reset.css",
  "@typeshade/site-ui/tokens.css",
  "@typeshade/site-ui/semantics.css",
  "@typeshade/site-ui/tailwind.css",
  "@typeshade/site-ui/motion.css",
]);
const local = new Set([
  "tokens.css",
  "base.css",
  "fonts.css",
  "ui-theme.css",
  "accessibility.css",
]);
for (const site of ["typenn", "typecv", "typeshade"]) {
  const file = resolve(`apps/${site}/src/styles/global.css`);
  const css = readFileSync(file, "utf8");
  assert.ok(
    css.startsWith("@layer theme, base, antd, components, utilities;"),
    `${site}: declare cascade order before Tailwind imports`,
  );
  if (site !== "typeshade")
    assert.match(
      css,
      /@import "antd\/dist\/reset\.css" layer\(base\);/,
      `${site}: reset must not override component utilities`,
    );
  const imports = [...css.matchAll(/@import\s+['"]([^'"]+)['"];?/g)];
  assert.ok(imports.length, `${site}: explicit global layers`);
  assert.equal(
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@import[^;]+;/g, "")
      .replace(/@layer theme, base, antd, components, utilities;/g, "")
      .trim(),
    "",
    `${site}: global entry must only assemble base layers`,
  );
  for (const [, path] of imports) {
    assert.ok(
      common.has(path) || (path.startsWith("./") && local.has(basename(path))),
      `${site}: feature import in global entry: ${path}`,
    );
    if (path.startsWith("./")) {
      const layer = readFileSync(resolve(file, "..", path), "utf8");
      for (const [, dependency] of layer.matchAll(
        /@import\s+['"]([^'"]+)['"]/g,
      )) {
        assert.equal(
          dependency,
          "@typeshade/site-ui/product-theme.css",
          `${site}: indirect feature import through ${path}`,
        );
      }
    }
  }
}

const routes = {
  typenn: {
    "/": [".ui-home", ".kg-panel", ".nn-docs"],
    "/guide/": [".nn-docs", ".kg-panel", ".ui-home"],
    "/playground/": [".kg-panel", ".nn-docs", ".ui-home"],
  },
  typecv: {
    "/": [".ui-home", ".pair-canvases", ".sfm-inputs", ".cv-docs"],
    "/docs/": [".cv-docs", ".pair-canvases", ".sfm-inputs", ".ui-home"],
    "/playground/": [".pair-canvases", ".sfm-inputs", ".cv-docs", ".ui-home"],
    "/lab/": [".sfm-inputs", ".pair-canvases", ".cv-docs", ".ui-home"],
  },
  typeshade: {
    "/": [".tabs-panel", ".docs-local", ".api-crumbs"],
    "/playground/": [".ts-playground", ".docs-local", ".api-crumbs"],
    "/api/": [".api-crumbs", ".tabs-panel"],
  },
};

for (const directory of process.argv.slice(2)) {
  const root = resolve(directory);
  const site = basename(resolve(root, ".."));
  assert.ok(routes[site], `Unknown site ${site}`);
  for (const [route, [present, ...absent]] of Object.entries(routes[site])) {
    const file = resolve(root, `.${route}`, "index.html");
    assert.ok(existsSync(file), `Build ${site} before checking CSS ownership`);
    const html = readFileSync(file, "utf8");
    const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
      .map(([tag]) => tag.match(/href="([^"]+)"/)?.[1])
      .filter(Boolean);
    const css =
      links
        .map((path) => readFileSync(resolve(root, "." + path), "utf8"))
        .join("\n") +
      [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
        .map((match) => match[1])
        .join("\n");
    assert.ok(
      css.includes(present),
      `${site}${route}: missing owned style ${present}`,
    );
    for (const selector of absent)
      assert.ok(
        !css.includes(selector),
        `${site}${route}: unrelated feature style ${selector}`,
      );
    console.log(
      `${site}${route}: ${Buffer.byteLength(css)} CSS bytes, ${links.length} stylesheet(s); ownership passed`,
    );
  }
}
console.log("Global CSS boundaries passed");
