// Which examples call which documented name, for the Examples section of an entry page in
// the language reference. The corpus is read, not listed by hand: every example page already
// carries the file's own source text (src/lib/example-pages.ts, the `"use typeshade"` files),
// and each of those is parsed with the TypeScript parser the
// rest of the site's build-time reads use.
//
// The scan lives beside the generator instead of inside it because src/lib/examples.ts reads
// the reference's counts for `facts`, so src/lib/language-reference.ts importing the example
// corpus would close a cycle. Nothing here parses a declaration; it only looks for the name
// in the corpus.
//
// What counts as a call. A parse is used in place of a text search, so a name inside a
// comment, a string or an import clause is not a hit:
//   - a documented function: an identifier the file calls (`mix(a, b, t)`), or one it names
//     in a type position where no table documents a type of that name, which is how the
//     four declarators are written (`storage<array<atomic<u32>>>`);
//   - a documented type: an identifier in a type position (`uv: vec2`), so `vec2(x, y)` is
//     a hit for the constructor and `: vec2` is a hit for the type;
//   - a documented constant or attribute: any reference, since `discard` stands alone as a
//     statement and `@vertex` stands alone as a decorator;
//   - a `Math` member: the property of a `Math.` access, so `Math.abs` is a hit for the
//     member and `abs` on its own is not;
//   - a `@builtin(...)` id: the string the decorator is called with.
// A local variable that shadows a documented name is a hit the parse cannot tell apart from
// the builtin, and that is the one way this list runs long.
import ts from 'typescript';
import { examplePages, examplePath } from './example-pages.ts';
import { languageEntries, type LanguageKind } from './language-reference.ts';

/** One example that calls a name, as the entry page links it. */
export interface LanguageExample {
  readonly id: string;
  /** The file in the compiler's examples directory, which is what the link is labelled with. */
  readonly file: string;
  /** The example's own page, locale-neutral. */
  readonly href: string;
}

interface Mentions {
  readonly identifiers: ReadonlySet<string>;
  /** Identifiers the file calls. */
  readonly called: ReadonlySet<string>;
  /** Identifiers the file writes in a type position. */
  readonly typed: ReadonlySet<string>;
  readonly mathMembers: ReadonlySet<string>;
  readonly builtinIds: ReadonlySet<string>;
}

/** An identifier that introduces a declaration's own name, or is the right-hand half of a
 *  qualified name. Either is a spelling of the name and not a reference to it. */
function declaresName(node: ts.Identifier): boolean {
  const parent: ts.Node | undefined = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isQualifiedName(parent) && parent.right === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isShorthandPropertyAssignment(parent)) return false;
  if (
    ts.isImportSpecifier(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isImportClause(parent) ||
    ts.isNamespaceImport(parent)
  )
    return true;
  if ((parent as ts.Node & { name?: ts.Node }).name !== node) return false;
  return (
    ts.isVariableDeclaration(parent) ||
    ts.isFunctionDeclaration(parent) ||
    ts.isClassDeclaration(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isParameter(parent) ||
    ts.isTypeParameterDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isEnumDeclaration(parent) ||
    ts.isEnumMember(parent) ||
    ts.isBindingElement(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent)
  );
}

function mentionsOf(file: string, text: string): Mentions {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true);
  const identifiers = new Set<string>();
  const called = new Set<string>();
  const typed = new Set<string>();
  const mathMembers = new Set<string>();
  const builtinIds = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Math'
    ) {
      mathMembers.add(node.name.text);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      called.add(node.expression.text);
      if (node.expression.text === 'builtin') {
        const first = node.arguments[0];
        if (first && ts.isStringLiteralLike(first)) builtinIds.add(first.text);
      }
    }
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName))
      typed.add(node.typeName.text);
    if (ts.isIdentifier(node) && !declaresName(node)) identifiers.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { identifiers, called, typed, mathMembers, builtinIds };
}

function build(): ReadonlyMap<string, readonly LanguageExample[]> {
  const scanned = examplePages.map((page) => ({
    example: { id: page.id, file: page.file, href: examplePath(page.id) },
    mentions: mentionsOf(page.file, page.source),
  }));
  // A name two tables document (`vec2` is a type and its own constructor) is split by where
  // the example writes it; a function no type table names keeps its type-position uses.
  const documentedTypes = new Set(
    languageEntries()
      .filter((e) => e.kind === 'type')
      .map((e) => e.name),
  );
  const calls = (kind: LanguageKind, name: string, m: Mentions): boolean => {
    if (kind === 'math') return m.mathMembers.has(name);
    if (kind === 'builtin') return m.builtinIds.has(name);
    if (kind === 'type') return m.typed.has(name);
    if (kind === 'function')
      return m.called.has(name) || (m.typed.has(name) && !documentedTypes.has(name));
    return m.identifiers.has(name);
  };
  const out = new Map<string, readonly LanguageExample[]>();
  for (const entry of languageEntries()) {
    const found = scanned
      .filter((s) => calls(entry.kind, entry.name, s.mentions))
      .map((s) => s.example);
    if (found.length > 0) out.set(`${entry.kind}/${entry.name}`, found);
  }
  // A corpus that suddenly matches nothing is a broken scan and not a corpus that stopped
  // calling anything, so it stops the build instead of quietly emptying every section.
  if (out.size === 0) {
    throw new Error(
      `[language-examples] none of the ${examplePages.length} examples calls any documented name`,
    );
  }
  return out;
}

let cache: ReadonlyMap<string, readonly LanguageExample[]> | null = null;

/** The examples that call one documented name, in the order the gallery lists them. Empty
 *  for a name no example uses, and the page leaves its Examples section out. */
export function languageExamples(kind: LanguageKind, name: string): readonly LanguageExample[] {
  if (!cache) cache = build();
  return cache.get(`${kind}/${name}`) ?? [];
}

/** How many of the documented names any example calls, for the counts a report states. */
export function languageExampleCoverage(): number {
  if (!cache) cache = build();
  return cache.size;
}
