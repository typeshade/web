import ts from "typescript";
import { compile } from "typeshade";
// Same pinned code generator used by audio-cpu-plugin.ts; no compiler pin change.
import { generateModuleJs } from "../../node_modules/typeshade/src/core/cpu-codegen.ts";
import {
  graphKey,
  orderedNodes,
  validateGraph,
  type SoundGraph,
} from "./model.ts";
export interface GraphProgram {
  key: string;
  code: string;
  source: string;
  nodes: number;
}
const HELPERS = new Set([
  "sin",
  "cos",
  "abs",
  "min",
  "max",
  "clamp",
  "fract",
  "floor",
  "ceil",
  "sqrt",
  "exp",
  "exp2",
  "pow",
  "tanh",
  "mix",
  "select",
  "f32",
  "u32",
  "i32",
]);
/** A Code node is a bounded scalar body inside a sample loop owned by the engine. */
function checkCode(code: string, name: string) {
  const source = ts.createSourceFile(
    "node.ts",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let count = 0;
  const fail = (node: ts.Node, message: string): never => {
    const line =
      source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    throw new Error(`${name}, line ${line}: ${message}`);
  };
  function inspect(node: ts.Node) {
    if (++count > 350)
      fail(node, "Keep a Code node below 350 syntax elements.");
    if (
      ts.isStatement(node) &&
      !ts.isVariableStatement(node) &&
      !ts.isExpressionStatement(node) &&
      !ts.isIfStatement(node) &&
      !ts.isBlock(node) &&
      !ts.isEmptyStatement(node)
    )
      fail(
        node,
        "Use scalar variables, assignments and if statements. Loops, functions and imports are unavailable.",
      );
    if (
      ts.isCallExpression(node) &&
      (!ts.isIdentifier(node.expression) || !HELPERS.has(node.expression.text))
    )
      fail(node, "Use the documented scalar math functions.");
    if (
      ts.isNewExpression(node) ||
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) ||
      ts.isArrayLiteralExpression(node) ||
      ts.isObjectLiteralExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isStringLiteral(node) ||
      ts.isTemplateExpression(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isAwaitExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isAsExpression(node)
    )
      fail(
        node,
        "Only scalar TypeShade expressions are supported in a Code node.",
      );
    if (ts.isIdentifier(node) && /^__/.test(node.text))
      fail(node, "Names beginning with __ belong to the graph runtime.");
    if (
      ts.isVariableDeclaration(node) &&
      (!ts.isIdentifier(node.name) ||
        [
          "out",
          "input",
          "time",
          "sampleRate",
          "p0",
          "p1",
          "p2",
          "p3",
          "state0",
          "state1",
          "state2",
          "state3",
        ].includes(node.name.text))
    )
      fail(
        node,
        "Use a new local variable name; the node inputs and state already exist.",
      );
    ts.forEachChild(node, inspect);
  }
  inspect(source);
}
export function compileGraph(raw: SoundGraph): GraphProgram {
  const graph = validateGraph(raw),
    nodes = orderedNodes(graph),
    index = new Map(nodes.map((n, i) => [n.id, i]));
  const lines = [
    '"use typeshade";',
    "export function graphBlock(__out: array<f32>, __state: array<f32>, __clock: array<u32>, __p: array<f32>, __frames: u32): void {",
    "const sampleRate: f32 = 48000; const p0: f32 = __p[0]; const p1: f32 = __p[1]; const p2: f32 = __p[2]; const p3: f32 = __p[3];",
    "let __age: u32 = __clock[0]; for (let __i: u32 = 0; __i < __frames; __i++) { const time: f32 = f32(__age) / sampleRate;",
  ];
  const codeRanges: { start: number; end: number; name: string }[] = [];
  for (const [i, n] of nodes.entries()) {
    const state = i * 4,
      v = `__v${i}`,
      param = (k = 0) => `__p[${4 + i * 2 + k}]`,
      input = (port: string, fallback = "0") =>
        n.inputs[port] ? `__v${index.get(n.inputs[port]!)}` : fallback;
    lines.push(`let ${v}: f32 = 0;`);
    if (n.bypass) {
      lines.push(`${v} = ${input("input", input("a"))};`);
      continue;
    }
    switch (n.kind) {
      case "parameter":
        lines.push(`${v} = __p[u32(${param()})];`);
        break;
      case "oscillator":
        lines.push(
          `__state[${state}] = fract(__state[${state}] + clamp(${input("frequency", param())}, 0, 20000) / sampleRate);`,
          `${v} = sin(__state[${state}] * 6.28318530718);`,
          `if (${param(1)} == 1) { ${v} = __state[${state}] * 2 - 1; } else if (${param(1)} == 2) { ${v} = select(-1, 1, __state[${state}] < 0.5); } else if (${param(1)} == 3) { ${v} = 1 - 4 * abs(__state[${state}] - 0.5); }`,
        );
        break;
      case "noise":
        lines.push(
          `{ let __r${i}: u32 = __clock[${i + 1}]; if (__r${i} == 0) { __r${i} = u32(${param()}); } __r${i} = __r${i} ^ (__r${i} << 13); __r${i} = __r${i} ^ (__r${i} >> 17); __r${i} = __r${i} ^ (__r${i} << 5); __clock[${i + 1}] = __r${i}; ${v} = f32(__r${i}) / 2147483648 - 1; }`,
        );
        break;
      case "gain":
        lines.push(
          `${v} = ${input("input")} * clamp(${input("amount", param())}, 0, 2);`,
        );
        break;
      case "lowpass":
        lines.push(
          `__state[${state}] = __state[${state}] + (1 - exp(-6.28318530718 * clamp(${input("cutoff", param())}, 20, 16000) / sampleRate)) * (${input("input")} - __state[${state}]); ${v} = __state[${state}];`,
        );
        break;
      case "envelope":
        lines.push(
          `${v} = ${input("input")} * min(1, time / ${param()}) * exp(-max(0, time - ${param()}) / ${param(1)});`,
        );
        break;
      case "mix":
        lines.push(
          `${v} = ${input("a")} * (1 - ${param()}) + ${input("b")} * ${param()};`,
        );
        break;
      case "output":
        lines.push(`${v} = ${input("input")};`);
        break;
      case "code": {
        checkCode(n.code, n.name);
        lines.push(
          `{ const input: f32 = ${input("input")}; let out: f32 = 0; let state0: f32 = __state[${state}]; let state1: f32 = __state[${state + 1}]; let state2: f32 = __state[${state + 2}]; let state3: f32 = __state[${state + 3}];`,
        );
        const start = lines.length;
        lines.push(...n.code.split("\n"));
        codeRanges.push({ start, end: lines.length, name: n.name });
        lines.push(
          `${v} = out; __state[${state}] = state0; __state[${state + 1}] = state1; __state[${state + 2}] = state2; __state[${state + 3}] = state3; }`,
        );
        break;
      }
    }
  }
  lines.push(
    `__out[__i] = __v${index.get(nodes.find((n) => n.kind === "output")!.id)}; __age++; } __clock[0] = __age; }`,
  );
  const source = lines.join("\n"),
    compiled = compile(source, { fileName: "sound-graph.shade.ts" });
  const errors = compiled.diagnostics.filter((d) => d.category === "error");
  if (errors.length)
    throw new Error(
      errors
        .map((d) => {
          const line = d.line ?? 0,
            range = codeRanges.find((r) => line > r.start && line <= r.end);
          return `${range ? `${range.name}, line ${line - range.start}` : "Graph"}: ${d.message}`;
        })
        .join("\n"),
    );
  const generated = generateModuleJs(compiled.module, { precision: "f32" });
  if (generated.fallbacks.length || generated.fns.length !== 1)
    throw new Error("This graph cannot run as a compiled audio kernel.");
  for (const declaration of generated.decls) {
    const name = /\$\.(?:L|B)\["([^"]+)"\]/.exec(declaration)?.[1];
    if (name && name !== "arrayLength" && !HELPERS.has(name))
      throw new Error(`Unsupported audio helper: ${name}.`);
  }
  const parsed = ts.createSourceFile(
    "graph.js",
    `const functions = {${generated.fns.join(",")}};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const transformed = ts.transform(parsed, [
    (context) => (root) => {
      const visit: ts.Visitor = (node) => {
        if (
          ts.isExpressionStatement(node) &&
          ts.isBinaryExpression(node.expression) &&
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
    "graph.js",
    body,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const inspect = (node: ts.Node) => {
    if (
      ts.isNewExpression(node) ||
      ts.isArrayLiteralExpression(node) ||
      (ts.isObjectLiteralExpression(node) &&
        node !==
          (ast.statements[0] as ts.VariableStatement).declarationList
            .declarations[0]!.initializer) ||
      (ts.isCallExpression(node) &&
        node.expression.getText(ast).startsWith("$.F"))
    )
      throw new Error(
        "The audio kernel must use preallocated scalar state without nested calls.",
      );
    ts.forEachChild(node, inspect);
  };
  inspect(ast);
  const key = graphKey(graph);
  return {
    key,
    nodes: nodes.length,
    source,
    code: `const $ = globalThis.__typeaudioGraphRuntime();\n${generated.decls.join("\n")}\n${body}\n$.F = functions; globalThis.__typeaudioRegisterGraph(${JSON.stringify(key)}, functions.graphBlock);`,
  };
}
