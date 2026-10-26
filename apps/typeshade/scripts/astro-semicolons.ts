// Every statement in a component's TypeScript ends with `;`. Run: bun run format (writes them)
// or bun run format:check (lists them and exits 1).
//
// Prettier writes the `;` everywhere else, but it leaves `.astro` files alone (.prettierignore):
// Astro keeps the whitespace written between tags, so reformatting a component's markup
// changes the page. The code inside a component is ordinary TypeScript, and this script covers
// it: the frontmatter between the two `---` fences, and each `<script>` that holds code (not a
// JSON one such as `application/ld+json`). Expressions in the markup are left as they are.
//
// A `;` goes in only where the TypeScript parser already ended a statement without one, so the
// code means the same thing afterwards; a line that continues the one above (it opens with `(`
// or `[`) is never split. The same pass runs over TypeShade's shader source, in the compiler
// repository (src/compiler/ts/semicolons.ts).
import ts from 'typescript';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/** Kinds whose production ends with `;` (ASI may supply it). */
const STATEMENT_KINDS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.ExpressionStatement,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
  ts.SyntaxKind.ThrowStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.DebuggerStatement,
  ts.SyntaxKind.ImportDeclaration,
  ts.SyntaxKind.ImportEqualsDeclaration,
  ts.SyntaxKind.ExportDeclaration,
  ts.SyntaxKind.ExportAssignment,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.IndexSignature,
]);

/** Members of an interface or a type literal. */
const TYPE_MEMBER_KINDS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.ConstructSignature,
  ts.SyntaxKind.IndexSignature,
]);

function missingAt(node: ts.Node, sf: ts.SourceFile): number | undefined {
  const parent = node.parent as ts.Node | undefined;
  const inTypeBody =
    parent !== undefined && (ts.isInterfaceDeclaration(parent) || ts.isTypeLiteralNode(parent));
  if (inTypeBody ? !TYPE_MEMBER_KINDS.has(node.kind) : !STATEMENT_KINDS.has(node.kind)) {
    const bodyless =
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.body === undefined;
    if (!bodyless) return undefined;
  }
  const last = node.getLastToken(sf);
  if (last === undefined || last.kind === ts.SyntaxKind.SemicolonToken) return undefined;
  if (inTypeBody) {
    // `{ a: f32, b: f32 }` on one line closes its last member with the `}`; a member that ends
    // its line is the one ASI ended.
    if (last.kind === ts.SyntaxKind.CommaToken) return undefined;
    const next = sf.text
      .slice(node.getEnd())
      .match(/^[ \t]*(\/\/[^\n]*|\/\*[^]*?\*\/[ \t]*)?(\r?\n)?/);
    if (!next?.[2]) return undefined;
  }
  return node.getEnd();
}

/** The offsets in `code` that take a `;`, or the parser's first complaint. */
function missingSemicolons(code: string): number[] | string {
  const sf = ts.createSourceFile('component.ts', code, ts.ScriptTarget.Latest, true);
  const errors = (sf as unknown as { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (errors.length > 0) return ts.flattenDiagnosticMessageText(errors[0]!.messageText, '\n');
  const at = new Set<number>();
  const visit = (node: ts.Node): void => {
    const pos = missingAt(node, sf);
    if (pos !== undefined) at.add(pos);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return [...at].sort((a, b) => a - b);
}

/** The frontmatter and each code `<script>` of a component, as [start, end) offsets. */
function codeRegions(text: string): [number, number][] {
  const regions: [number, number][] = [];
  const front = /^---[ \t]*\r?\n([^]*?)^---[ \t]*$/m.exec(text);
  if (front && front.index === 0) {
    const start = text.indexOf('\n') + 1;
    regions.push([start, start + front[1]!.length]);
  }
  for (const m of text.matchAll(/<script\b([^>]*)>([^]*?)<\/script>/g)) {
    const type = /\btype\s*=\s*["']([^"']*)["']/.exec(m[1]!)?.[1];
    if (type !== undefined && !/^(module|text\/javascript)$/.test(type)) continue;
    const start = m.index! + m[0].indexOf('>') + 1;
    regions.push([start, start + m[2]!.length]);
  }
  return regions;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.astro' || name === 'vendor')
      continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.astro')) out.push(p);
  }
  return out;
}

const check = process.argv.includes('--check');
let missing = 0;
let files = 0;
let failed = false;
for (const file of walk(path.join(root, 'src')).sort()) {
  const text = readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const offsets: number[] = [];
  for (const [start, end] of codeRegions(text)) {
    const found = missingSemicolons(text.slice(start, end));
    if (typeof found === 'string') {
      const line = text.slice(0, start).split('\n').length;
      console.error(`${rel}:${line}: the code starting here does not parse (${found})`);
      failed = true;
      continue;
    }
    offsets.push(...found.map((at) => start + at));
  }
  if (offsets.length === 0) continue;
  missing += offsets.length;
  files++;
  if (check) {
    const lines = [...new Set(offsets.map((at) => text.slice(0, at).split('\n').length))];
    console.log(`${rel}: line ${lines.join(', ')}`);
    continue;
  }
  let out = '';
  let from = 0;
  for (const at of offsets.sort((a, b) => a - b)) {
    out += text.slice(from, at) + ';';
    from = at;
  }
  writeFileSync(file, out + text.slice(from));
}
if (check && missing > 0) {
  console.log(
    `\n${missing} statement(s) in ${files} component(s) end without ';'. Run: bun run format`,
  );
  failed = true;
} else if (!check) {
  console.log(`astro-semicolons: wrote ';' after ${missing} statement(s) in ${files} component(s)`);
} else {
  console.log('astro-semicolons: every statement in the components ends with ;');
}
if (failed) process.exit(1);
