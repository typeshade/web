// Workspace path operations are independent of Monaco and the DOM.

/** A pass's name from its file: the stem, as an identifier, since the bindings that read the
 *  pass are named by it. `passes/blur-x.shade.ts` reads as `blur_x`. */
const passNameOf = (path: string): string => {
  const stem = (path.split('/').pop() ?? path).replace(/\.shade\.ts$/, '').replace(/\.ts$/, '');
  const name = stem.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(name) ? name : `_${name}`;
};

/** A relative specifier from the file at `from` to the file at `to`, both workspace paths. */
const relativeSpecifier = (from: string, to: string): string => {
  const dir = from.split('/').slice(0, -1);
  const parts = to.split('/');
  let common = 0;
  while (common < dir.length && common < parts.length - 1 && dir[common] === parts[common])
    common += 1;
  const up = dir.length - common;
  return `${up === 0 ? './' : '../'.repeat(up)}${parts.slice(common).join('/')}`;
};

/** `text`, the file at `importer`, with every relative import of `from` naming `to`. A
 *  specifier keeps its form: one written without the `.shade.ts` ending is written without. */
const rewriteImports = (text: string, importer: string, from: string, to: string): string =>
  text.replace(
    /(\b(?:from|import)\s*)(["'])(\.{1,2}\/[^"'\n]*)\2/g,
    (whole, lead: string, quote: string, specifier: string) => {
      const resolved = decodeURI(new URL(specifier, `file:///${importer}`).pathname).slice(1);
      const bare = !/\.ts$/.test(specifier);
      if ((bare ? `${resolved}.shade.ts` : resolved) !== from) return whole;
      const next = relativeSpecifier(importer, to);
      return `${lead}${quote}${bare ? next.replace(/\.shade\.ts$/, '') : next}${quote}`;
    },
  );

/** A path the workspace can hold: relative, no `..`, the characters a URL keeps as they are,
 *  and the `.shade.ts` ending the compiler reads a shader import by. A bare name gets the
 *  ending. */
const FILE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9_\-./]+\.shade\.ts$/;

const normalisePath = (typed: string): string => {
  const trimmed = typed.trim().replace(/^\.\//, '');
  return /\.ts$/.test(trimmed) ? trimmed : `${trimmed}.shade.ts`;
};
export { relativeSpecifier, rewriteImports, FILE_PATH, normalisePath, passNameOf };
export const MAIN_FILE = 'main.shade.ts';
export const exampleFileName = (id: string | undefined): string =>
  id ? `${id}.shade.ts` : MAIN_FILE;

// Monaco model identity is stable while the language-worker URI follows a rename.
export const MAIN_MODEL_URI = 'inmemory://playground/main';
