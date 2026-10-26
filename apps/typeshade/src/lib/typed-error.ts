// Build-time proof for the author-time section of the verification page. The file with a
// misspelt field is checked by the language service, which is what an editor runs over a
// `"use typeshade"` file, and by `compile()`, and the two must report the same code at the
// same place. The uniform block's std140 layout comes from reflect(). The correct file is
// checked too, and the build fails if the wrong one is clean or the correct one is not.

import { compile, reflect } from '../../vendor/shader-dsl/src/index.ts';
import { createTypeshadeLanguageService } from '../../vendor/shader-dsl/src/language-service/index.ts';
import { typedErrorFile, typedErrorSource } from './typed-error-shader.ts';

/** The field read the wrong arm breaks, and what it is broken into. */
const RIGHT_READ = 'u.top';
const WRONG_READ = 'u.colour';
/** The page shows the whole file, which stays short enough to read at a glance. */
const MAX_SNIPPET_LINES = 16;
/** Past this many characters the page gets the first line of a message only, with
 *  `truncated` set. */
const MAX_MESSAGE_CHARS = 300;

export interface TypedErrorDiagnostic {
  /** The compiler's own code (`TS8022` for a field the struct does not have). */
  readonly code: string;
  /** The compiler's own text, or its first line when `truncated`. */
  readonly message: string;
  /** 1-based line within `snippet`. */
  readonly line: number;
  /** 1-based column within that line. */
  readonly column: number;
  /** True when `message` is the first line of a longer diagnostic. */
  readonly truncated: boolean;
}

export interface TypedErrorField {
  readonly name: string;
  /** DSL type key, e.g. `vec4<f32>`. */
  readonly type: string;
  /** std140 byte offset, from `reflect()`. */
  readonly offset: number;
  readonly size: number;
}

export interface TypedErrorLayout {
  readonly struct: string;
  /** std140 size of the whole block, rounded to its 16-byte alignment. */
  readonly size: number;
  readonly fields: readonly TypedErrorField[];
}

export interface TypedError {
  /** The file as the page shows it, with the wrong field read. */
  readonly snippet: string;
  /** 1-based line of the wrong read within `snippet`. */
  readonly wrongLine: number;
  readonly diagnostic: TypedErrorDiagnostic;
  /** The same file, correct, checked to have zero diagnostics. */
  readonly fixed: { readonly snippet: string };
  readonly layout: TypedErrorLayout;
}

function countOf(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** What the editor reports for one copy of the file. */
function editorDiagnostics(source: string) {
  const service = createTypeshadeLanguageService();
  service.openDocument(typedErrorFile, source);
  return service.getDiagnostics(typedErrorFile).filter((d) => d.severity === 'error');
}

let memo: TypedError | undefined;

/**
 * The section's proof, computed once per build.
 *
 * A file over the line cap, a clean wrong arm, a failing correct arm, or an editor and a
 * compiler that disagree about the wrong arm all fail the build.
 */
export function typedError(): TypedError {
  if (memo) return memo;

  const fixedSnippet = typedErrorSource.trimEnd();
  const snippetLines = fixedSnippet.split('\n').length;
  if (snippetLines > MAX_SNIPPET_LINES)
    throw new Error(
      `[typed-error] the file is ${snippetLines} lines; the page caps it at ${MAX_SNIPPET_LINES}`,
    );
  const reads = countOf(fixedSnippet, RIGHT_READ);
  if (reads !== 1)
    throw new Error(
      `[typed-error] the file reads '${RIGHT_READ}' ${reads} times; exactly 1 is required`,
    );
  const wrongSnippet = fixedSnippet.replace(RIGHT_READ, WRONG_READ);

  // Both arms must behave, or the diagnostic says nothing about the compiler.
  const fixedEditor = editorDiagnostics(fixedSnippet);
  const fixed = compile(fixedSnippet, { fileName: typedErrorFile });
  const fixedErrors = fixed.diagnostics.filter((d) => d.category === 'error');
  if (fixedEditor.length > 0 || fixedErrors.length > 0)
    throw new Error(
      `[typed-error] the correct file must check clean; the editor reports ` +
        `${fixedEditor.map((d) => `${d.code} ${d.message}`).join(' | ') || 'nothing'} and compile() ` +
        `${fixedErrors.map((d) => `${d.code} ${d.message}`).join(' | ') || 'nothing'}`,
    );

  const located = editorDiagnostics(wrongSnippet)[0];
  if (!located)
    throw new Error(`[typed-error] the wrong arm ('${WRONG_READ}') produced no diagnostic`);
  const wrongLine = located.range.start.line + 1;
  const column = located.range.start.character + 1;
  if (!wrongSnippet.split('\n')[wrongLine - 1]?.includes(WRONG_READ))
    throw new Error(
      `[typed-error] the diagnostic landed on line ${wrongLine}, which does not read '${WRONG_READ}'`,
    );

  // The compiler says the same thing at the same place (Rule 12.7: one vocabulary).
  const compiled = compile(wrongSnippet, { fileName: typedErrorFile }).diagnostics.find(
    (d) => d.category === 'error',
  );
  if (!compiled || compiled.code !== located.code || compiled.line !== wrongLine)
    throw new Error(
      `[typed-error] the editor reports ${located.code} on line ${wrongLine}, and compile() ` +
        `${compiled ? `${compiled.code} on line ${compiled.line}` : 'nothing'}`,
    );

  const full = String(located.message);
  const truncated = full.length > MAX_MESSAGE_CHARS || full.includes('\n');
  const message = truncated ? full.split('\n')[0]!.slice(0, MAX_MESSAGE_CHARS) : full;

  const block = reflect(fixed.module).uniforms[0];
  if (!block) throw new Error('[typed-error] the fixture binds no uniform block');

  memo = {
    snippet: wrongSnippet,
    wrongLine,
    diagnostic: { code: String(located.code), message, line: wrongLine, column, truncated },
    fixed: { snippet: fixedSnippet },
    layout: {
      struct: block.name,
      size: block.size,
      fields: block.fields.map((f) => ({
        name: f.name,
        type: f.type,
        offset: f.offset,
        size: f.size,
      })),
    },
  };
  return memo;
}
