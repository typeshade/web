import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { compile } from "typeshade";
import ts from "typescript";
import type { Plugin } from "vite";

/** Build-only adapter for this pinned compiler. Unlike the general host boundary,
 * the worklet calls a checked kernel with buffers allocated before playback.
 * Keep the internal generator and its emitted runtime on the same package version. */
export function audioCpu(): Plugin {
  return {
    name: "typeaudio-preallocated-cpu",
    enforce: "pre",
    resolveId(source, importer) {
      if (source.endsWith("/live-kernel.shade.ts?audio-cpu") && importer)
        return (
          "\0typeaudio-cpu:" +
          resolve(dirname(importer), source.slice(0, source.indexOf("?"))) +
          ".js"
        );
    },
    async load(id) {
      if (!id.startsWith("\0typeaudio-cpu:")) return;
      const file = id.slice("\0typeaudio-cpu:".length, -3);
      this.addWatchFile(file);
      const result = compile(readFileSync(file, "utf8"), { fileName: file });
      const errors = result.diagnostics.filter((d) => d.category === "error");
      if (errors.length) this.error(JSON.stringify(errors));
      const entry = createRequire(import.meta.url).resolve("typeshade");
      const { generateModuleJs } = await import(
        pathToFileURL(resolve(dirname(entry), "core/cpu-codegen.ts")).href
      );
      const generated = generateModuleJs(result.module, { precision: "f32" });
      if (generated.fallbacks.length)
        this.error("Live audio must not use the interpreter.");
      if (
        generated.fns.length !== 1 ||
        generated.module.funcs[0]?.name !== "liveBlock"
      )
        this.error("The audio adapter accepts only one leaf kernel.");
      const source = `const functions = {${generated.fns.join(",\n")}};`;
      // These scalar helpers were audited against the pinned runtime. Do not let
      // a new vector/struct builtin hide an allocation behind an indirect call.
      const safeHelpers = new Set([
        "cos",
        "sin",
        "abs",
        "fract",
        "max",
        "f32",
        "arrayLength",
      ]);
      for (const declaration of generated.decls) {
        const match = /\$\.(?:L|B)\["([^"]+)"\]/.exec(declaration);
        if (match && !safeHelpers.has(match[1]!))
          this.error("Unaudited helper in the live audio kernel: " + match[1]);
      }
      const parsed = ts.createSourceFile(
        "audio.js",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );
      // The generic compiler publishes mutated arguments for its host caller. This
      // leaf returns void and only writes into existing buffers; no caller consumes
      // that argument list. Remove its publication, not any DSP operation.
      const transformed = ts.transform(parsed, [
        (context) => (root) => {
          const visit: ts.Visitor = (node) => {
            if (
              ts.isExpressionStatement(node) &&
              ts.isBinaryExpression(node.expression) &&
              node.expression.operatorToken.kind ===
                ts.SyntaxKind.EqualsToken &&
              node.expression.left.getText(parsed) === "$.inout.values"
            )
              return ts.factory.createEmptyStatement();
            return ts.visitEachChild(node, visit, context);
          };
          return ts.visitNode(root, visit) as ts.SourceFile;
        },
      ]);
      const body = ts.createPrinter().printFile(transformed.transformed[0]!);
      transformed.dispose();
      const ast = ts.createSourceFile(
        "audio.js",
        body,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );
      const inspect = (node: ts.Node): void => {
        if (
          ts.isNewExpression(node) ||
          ts.isArrayLiteralExpression(node) ||
          (ts.isObjectLiteralExpression(node) &&
            node !==
              (ast.statements[0] as ts.VariableStatement).declarationList
                .declarations[0]!.initializer)
        ) {
          this.error(
            "Live audio generated a heap allocation. Use preallocated buffers.",
          );
        }
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(ast).startsWith("$.F")
        )
          this.error(
            "The audio kernel must remain a leaf; nested calls require an inout boundary.",
          );
        ts.forEachChild(node, inspect);
      };
      inspect(ast);
      return `import { createCodegenRuntime } from 'typeshade/runtime/internal';
const $ = createCodegenRuntime();
${generated.decls.join("\n")}
${body}
$.F = functions;
export const liveBlock = functions.liveBlock;`;
    },
  };
}
