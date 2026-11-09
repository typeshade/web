// typeplot's shader files, in the spelling the pinned compiler takes. The function demos and
// the plots on the reference pages compile these files beside their own sample, at build time
// and again in the reader's browser after an edit.
//
// typeplot v0.2.1, the version package.json pins, still writes `pow(a, b)`, which compiler
// change 0112 removed (Rule 9.9: `**` carries every case), and the decorated class field of
// the form change 0111 replaced, which the compiler warns on (`TS8028`). Until a typeplot
// release writes the new spelling, the files are read through two rewrites that keep what
// they compute: the compiler's own codemod for the entry form (`migrateSource`, `tshc
// migrate`), and `pow(a, b)` to `((a) ** (b))`, which the compiler lowers to the same WGSL
// `pow` (0112, section 2). Nothing else in the files changes. Remove this module, and read
// `plotShaderFiles` directly, when the pinned typeplot needs neither rewrite: the build then
// says so below.
import ts from 'typescript';
import { plotShaderFiles } from 'typeplot/shaders';
import { migrateSource } from '../../vendor/shader-dsl/src/cli/migrate.ts';

/** Every `pow(a, b)` call of a file that declares no `pow` of its own, as `((a) ** (b))`. */
function powToStarStar(text: string, fileName: string): string {
  if (/\bfunction\s+pow\b|\b(?:const|let)\s+pow\b/.test(text)) return text;
  let out = text;
  // One pass rewrites the calls with no `pow` call inside; the next pass reaches the ones
  // around them.
  for (;;) {
    const sf = ts.createSourceFile(fileName, out, ts.ScriptTarget.Latest, true);
    const calls: ts.CallExpression[] = [];
    const isPow = (n: ts.Node): n is ts.CallExpression =>
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'pow' &&
      n.arguments.length === 2;
    const visit = (n: ts.Node): boolean => {
      let inner = false;
      n.forEachChild((c) => {
        if (visit(c)) inner = true;
      });
      if (isPow(n)) {
        if (!inner) calls.push(n);
        return true;
      }
      return inner;
    };
    visit(sf);
    if (calls.length === 0) return out;
    calls.sort((a, b) => b.getStart(sf) - a.getStart(sf));
    for (const call of calls) {
      const [a, b] = call.arguments.map((arg) => arg.getText(sf));
      out = `${out.slice(0, call.getStart(sf))}((${a}) ** (${b}))${out.slice(call.getEnd())}`;
    }
  }
}

function rewrite(name: string, text: string): string {
  const migrated = migrateSource(text, name);
  if (migrated.skipped.length > 0)
    throw new Error(
      `[typeplot-shaders] tshc migrate leaves ${name} partly decorated: ${migrated.skipped.join('; ')}`,
    );
  return powToStarStar(migrated.text, name);
}

const files: Record<string, string> = {};
let rewritten = 0;
for (const [name, text] of Object.entries(plotShaderFiles as Readonly<Record<string, string>>)) {
  files[name] = rewrite(name, text);
  if (files[name] !== text) rewritten++;
}
if (rewritten === 0)
  throw new Error(
    '[typeplot-shaders] the pinned typeplot needs no rewrite any more: import plotShaderFiles from typeplot/shaders where src/lib/typeplot-shaders.ts is imported, and delete this module',
  );

/** typeplot's shader files, by file name, in the pinned compiler's spelling. */
export const typeplotShaderFiles: Readonly<Record<string, string>> = files;
