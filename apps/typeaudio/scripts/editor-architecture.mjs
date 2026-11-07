import ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

const rank = (file) => {
  const match = file.match(
    /(?:^|\/)(atoms|molecules|organisms|templates|pages)\//,
  );
  return match
    ? ["atoms", "molecules", "organisms", "templates", "pages"].indexOf(
        match[1],
      )
    : undefined;
};
const runtimeImport = (node) => {
  const clause = node.importClause;
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  return (
    !!clause.name ||
    !clause.namedBindings ||
    !ts.isNamedImports(clause.namedBindings) ||
    clause.namedBindings.elements.some((element) => !element.isTypeOnly)
  );
};

/** Validate responsibility boundaries without depending on particular component names. */
export function inspectModule(file, code) {
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const errors = [],
    dependencies = [],
    components = [];
  const layer = rank(file);
  for (const node of source.statements) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      /^[A-Z]/.test(node.name.text)
    )
      components.push(node.name.text);
    if (ts.isExportDeclaration(node) && node.moduleSpecifier)
      errors.push(
        "Import the owning module directly; forwarding barrel modules hide responsibility boundaries.",
      );
    if (!ts.isImportDeclaration(node) || !runtimeImport(node)) continue;
    const specifier = node.moduleSpecifier.text;
    if (
      /\/editor\//.test(file) &&
      /^typeaudio\/(?:function-graph|graph)\/compiler$/.test(specifier)
    )
      errors.push(`The TypeShade compiler belongs in its worker: ${specifier}`);
    if (!specifier.startsWith(".")) continue;
    const target = resolve(dirname(file), specifier).replaceAll("\\", "/");
    dependencies.push(target);
    const targetLayer = rank(target);
    if (layer !== undefined && targetLayer !== undefined && targetLayer > layer)
      errors.push(`Atomic UI dependencies must point down: ${specifier}`);
    if (
      layer !== undefined &&
      layer <= 1 &&
      /\/(useEditor\.ts|hooks\/(document|sound|assets|picture|project|session|media)\/)/.test(
        target,
      )
    )
      errors.push(
        `Atoms and molecules receive feature data through props: ${specifier}`,
      );
    if (
      /\/editor\/state\//.test(file) &&
      /\/editor\/(components|templates|pages|providers|hooks|engine)\//.test(
        target,
      )
    )
      errors.push(
        `Document state cannot depend on UI or resource controllers: ${specifier}`,
      );
    if (/\/editor\//.test(file) && /\/graph\/compiler\//.test(target))
      errors.push(`The TypeShade compiler belongs in its worker: ${specifier}`);
    if (
      /\/website\/(sound|graph|functions)\//.test(file) &&
      /\/editor\//.test(target)
    )
      errors.push(`Audio domains cannot depend on the editor: ${specifier}`);
  }
  if (file.endsWith(".tsx") && !file.endsWith("/main.tsx")) {
    if (components.length !== 1)
      errors.push("Each TSX module owns exactly one named React component.");
    else if (!file.endsWith(`/${components[0]}.tsx`))
      errors.push("The component name must match its owning file.");
  }
  if (layer !== undefined) {
    const visit = (node) => {
      if (
        ts.isNewExpression(node) &&
        /^(AudioContext|AudioWorkletNode|Worker|SoundEngine|SceneTransport)$/.test(
          node.expression.getText(source),
        )
      )
        errors.push(
          "UI components cannot construct audio or worker resources.",
        );
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { errors, dependencies };
}

function modules(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(directory, entry.name);
    return entry.isDirectory()
      ? modules(file)
      : [".ts", ".tsx"].includes(extname(file))
        ? [file]
        : [];
  });
}

export function checkEditorArchitecture(root) {
  const files = [
    ...modules(resolve(root, "website/editor")),
    ...modules(resolve(root, "website/graph")),
    ...modules(resolve(root, "website/functions")),
    ...modules(resolve(root, "website/sound")),
  ];
  const reports = new Map(
    files.map((file) => [
      file,
      inspectModule(file, readFileSync(file, "utf8")),
    ]),
  );
  const errors = [...reports].flatMap(([file, result]) =>
    result.errors.map((error) => `${relative(root, file)}: ${error}`),
  );
  const active = new Set(),
    done = new Set();
  const visit = (file, chain) => {
    if (active.has(file)) {
      errors.push(
        `Runtime import cycle: ${[...chain, file].map((p) => relative(root, p)).join(" → ")}`,
      );
      return;
    }
    if (done.has(file)) return;
    active.add(file);
    for (const target of reports.get(file)?.dependencies ?? [])
      if (reports.has(target)) visit(target, [...chain, file]);
    active.delete(file);
    done.add(file);
  };
  for (const file of files) visit(file, []);
  return { files: files.length, errors };
}
