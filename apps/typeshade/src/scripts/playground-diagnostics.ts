import type { TsCompilerDiagnostic } from '../../vendor/shader-dsl/src/compiler/ts/source-file.ts';
import type { TypeshadeDiagnostic } from '../../vendor/shader-dsl/src/language-service/index.ts';

/** Keep compiler locations in their own document, including imported files. */
export function mergeCompileDiagnostics(
  service: readonly TypeshadeDiagnostic[],
  compiled: readonly TsCompilerDiagnostic[],
): TypeshadeDiagnostic[] {
  const result = [...service];
  for (const diagnostic of compiled) {
    const converted: TypeshadeDiagnostic = {
      uri: diagnostic.fileName,
      range: {
        start: { line: diagnostic.line - 1, character: diagnostic.character - 1 },
        end: { line: diagnostic.endLine - 1, character: diagnostic.endCharacter - 1 },
      },
      span: { start: diagnostic.start, length: diagnostic.length },
      severity: diagnostic.category === 'message' ? 'information' : diagnostic.category,
      message: diagnostic.message,
      code: diagnostic.code ?? '',
      source: 'typeshade',
    };
    if (
      !result.some(
        (existing) =>
          existing.uri === converted.uri &&
          existing.span.start === converted.span.start &&
          existing.span.length === converted.span.length &&
          String(existing.code) === String(converted.code) &&
          existing.message === converted.message &&
          existing.severity === converted.severity,
      )
    )
      result.push(converted);
  }
  return result;
}

export function diagnosticsForDocument(
  diagnostics: readonly TypeshadeDiagnostic[],
  uri: string,
): TypeshadeDiagnostic[] {
  return diagnostics.filter((diagnostic) => diagnostic.uri === uri);
}
