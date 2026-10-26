import { codeOnly, FRAGMENT_PRELUDE, sampleShape } from '../../lib/live-shader-compile-contract.ts';
import type {
  TypeshadePosition,
  TypeshadeRange,
} from '../../../vendor/shader-dsl/src/language-service/index.ts';
export interface MonacoPosition {
  readonly lineNumber: number;
  readonly column: number;
}

/** Monaco's one-based, end-exclusive range, which a marker and a hover both take. */
export interface MonacoRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

// ── The fullscreen vertex half ─────────────────────────────────────────────────────────────
// A file that declares no `@vertex` entry is compiled behind the fullscreen triangle every
// Book of Shaders page draws on, which is what `<LiveShader>` does on a guide page and what
// src/lib/live-shader-compile-contract.ts fixes as the site's one rule for it. So a reader can write
// a fragment program alone, take the `uv` the triangle hands them, and see it cover the
// canvas, instead of reading that the canvas needs a vertex entry they did not want to write.
//
// The directive has to stay the first thing in the file, so the prelude goes in after it and
// everything below moves down by its lines. The compiler answers about the composed text and
// the editor holds the reader's, so the two line numbers differ from that point on, and the
// four functions below are where they meet.

/** The directive line as the compiler wants it: first in the file. The Playground's own
 *  sample writes a semicolon after it and the `.shade.ts` examples do not. */
export const DIRECTIVE_LINE = /^[\s\uFEFF]*(['"])use typeshade\1[ \t]*;?[ \t]*\r?\n/;

/** The two top-level names the prelude brings. A file that declares one of its own would get
 *  a duplicate and stop compiling, so that file keeps what it wrote and the prelude stays
 *  out. A file that only names one of them gets the prelude and the declaration with it. */
export const PRELUDE_DECLARES =
  /^[\t ]*(?:export[\t ]+)?(?:class|function|const|let|var|type|interface)[\t ]+(?:VsOut|fullscreen)\b/m;

/** The reader's text as the compiler sees it, and where the prelude went in. A file with no
 *  directive is left alone: the page's own message about the directive is what that reader
 *  needs, and it would never appear if a directive were supplied for them. */
export function compose(source: string): {
  readonly text: string;
  readonly at: number;
  readonly lines: number;
} {
  const directive = DIRECTIVE_LINE.exec(source);
  const code = codeOnly(source);
  // A file with no fragment entry has nothing for the triangle to hand a `uv` to: a compute
  // kernel gets no vertex half it would never run.
  if (
    !directive ||
    sampleShape(source) === 'module' ||
    !/@fragment\b/.test(code) ||
    PRELUDE_DECLARES.test(code)
  ) {
    return { text: source, at: 0, lines: 0 };
  }
  const head = source.slice(0, directive[0].length);
  const inserted = `\n${FRAGMENT_PRELUDE}\n`;
  return {
    text: head + inserted + source.slice(directive[0].length),
    at: head.split('\n').length - 1,
    lines: inserted.split('\n').length - 1,
  };
}

/** How many lines the prelude took, and the line it went in at. Zero while the reader's file
 *  declares its own vertex entry, which is when the two texts are the same text. */

export function createSourceCoordinates() {
  let preludeLines = 0;
  let preludeAt = 0;

  /** Whether a line of the compiled text is one of the prelude's, which the editor does not
   *  hold and the reader never wrote. */
  const inPrelude = (line: number): boolean =>
    preludeLines > 0 && line >= preludeAt && line < preludeAt + preludeLines;

  /** A line of the editor's text, as the compiled text numbers it. */
  const intoDocument = (line: number): number =>
    preludeLines > 0 && line >= preludeAt ? line + preludeLines : line;

  /** A line of the compiled text, back in the editor's. One of the prelude's own lands on the
   *  directive line, which is the nearest line the reader can see. */
  const outOfDocument = (line: number): number => {
    if (preludeLines === 0 || line < preludeAt) return line;
    return line >= preludeAt + preludeLines ? line - preludeLines : Math.max(0, preludeAt - 1);
  };

  // ── The one place the two coordinate systems meet ──────────────────────────────────────────
  // Monaco counts lines and columns from 1. The language service counts both from 0, the way
  // the Language Server Protocol does. Every crossing goes through these four functions, so a
  // +1 or a -1, and the prelude's own lines, live here and in no other file.

  const toServicePosition = (position: MonacoPosition): TypeshadePosition => ({
    line: intoDocument(position.lineNumber - 1),
    character: position.column - 1,
  });

  const toMonacoPosition = (position: TypeshadePosition): MonacoPosition => ({
    lineNumber: outOfDocument(position.line) + 1,
    column: position.character + 1,
  });

  const toMonacoRange = (range: TypeshadeRange): MonacoRange => {
    const startLineNumber = outOfDocument(range.start.line) + 1;
    const startColumn = range.start.character + 1;
    const endLineNumber = outOfDocument(range.end.line) + 1;
    const endColumn = range.end.character + 1;
    // A zero-width range draws no squiggle, so an empty one is widened by a column.
    const empty = endLineNumber === startLineNumber && endColumn <= startColumn;
    return {
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn: empty ? startColumn + 1 : endColumn,
    };
  };

  /** How a diagnostic's position reads in the diagnostics pane: the line and column an editor shows. */
  const toDisplayPosition = (position: TypeshadePosition): string =>
    `${outOfDocument(position.line) + 1}:${position.character + 1}`;

  return {
    compose,
    inPrelude,
    intoDocument,
    outOfDocument,
    toServicePosition,
    toMonacoPosition,
    toMonacoRange,
    toDisplayPosition,
    setPrelude(value: { at: number; lines: number }) {
      preludeAt = value.at;
      preludeLines = value.lines;
    },
  };
}
