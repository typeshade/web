import {
  createTypeshadeLanguageService,
  type TypeshadeDiagnostic,
  type TypeshadeLocation,
} from "typeshade/language-service";
import { projectNodeCode } from "./projectNodeCode.ts";
import type {
  LanguageDocument,
  LanguageRequest,
  LanguageResults,
} from "./types.ts";

/** Owns the actual TypeScript/TypeShade service and maps its results back to the visible document. */
export class TypeShadeSession {
  private service = createTypeshadeLanguageService();
  private documents = new Map<
    string,
    {
      document: LanguageDocument;
      projection: ReturnType<typeof projectNodeCode>;
    }
  >();

  close(uri: string) {
    this.service.closeDocument(uri);
    this.documents.delete(uri);
  }

  query(request: LanguageRequest): LanguageResults[keyof LanguageResults] {
    const { document: d } = request;
    let saved = this.documents.get(d.uri);
    if (
      !saved ||
      saved.document.version !== d.version ||
      saved.document.text !== d.text ||
      saved.document.mode !== d.mode
    ) {
      const projection = projectNodeCode(d);
      if (saved) this.service.updateDocument(d.uri, projection.text);
      else this.service.openDocument(d.uri, projection.text);
      saved = { document: d, projection };
      this.documents.set(d.uri, saved);
    }
    const p = saved.projection;
    const position = p.toSource(request.position ?? { line: 0, character: 0 });
    const location = (entry: TypeshadeLocation) => {
      const projection = this.documents.get(entry.uri)?.projection;
      const range = projection?.fromSource(entry.range);
      return range ? [{ uri: entry.uri, range }] : [];
    };
    switch (request.method) {
      case "completions":
        return this.service
          .getCompletions(d.uri, position)
          .filter((item) => !item.label.startsWith("__"))
          .map((item) => {
            if (!item.textEdit) return item;
            const range = p.fromSource(item.textEdit.range);
            return {
              ...item,
              textEdit: range ? { ...item.textEdit, range } : undefined,
            };
          });
      case "diagnostics":
        return this.service
          .getDiagnostics(d.uri)
          .flatMap((diagnostic): TypeshadeDiagnostic[] => {
            // Keep syntax errors at EOF visible even when the parser points at the wrapper's closing brace.
            const range =
              p.fromSource(diagnostic.range) ??
              (diagnostic.range.start.line >=
              p.lines + d.text.split("\n").length
                ? { start: p.end, end: p.end }
                : undefined);
            return range
              ? [
                  {
                    ...diagnostic,
                    range,
                    span: {
                      start: Math.max(
                        0,
                        diagnostic.span.start - p.prefixLength,
                      ),
                      length: diagnostic.span.length,
                    },
                  },
                ]
              : [];
          });
      case "hover": {
        const hover = this.service.getHover(d.uri, position);
        const range = hover && p.fromSource(hover.range);
        return hover && range ? { ...hover, range } : undefined;
      }
      case "signature":
        return this.service.getSignatureHelp(d.uri, position);
      case "definition":
        return this.service.getDefinition(d.uri, position).flatMap(location);
      case "references":
        return this.service
          .getReferences(d.uri, position, { includeDeclaration: true })
          .flatMap(location);
      case "prepareRename": {
        const rename = this.service.prepareRename(d.uri, position);
        const definitions = this.service
          .getDefinition(d.uri, position)
          .flatMap(location);
        const range = rename && p.fromSource(rename.range);
        // Context inputs and persistent state are engine bindings, not user declarations.
        return definitions.length && rename && range
          ? { ...rename, range }
          : undefined;
      }
      case "rename": {
        const definitions = this.service
          .getDefinition(d.uri, position)
          .flatMap(location);
        if (!definitions.length) return {};
        const edits = this.service.rename(
          d.uri,
          position,
          request.newName ?? "",
        );
        return Object.fromEntries(
          Object.entries(edits).map(([uri, changes]) => [
            uri,
            changes.flatMap((edit) => {
              const range = this.documents
                .get(uri)
                ?.projection.fromSource(edit.range);
              return range ? [{ ...edit, range }] : [];
            }),
          ]),
        );
      }
    }
  }
}
