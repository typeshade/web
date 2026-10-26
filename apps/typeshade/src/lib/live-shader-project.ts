/** Source files resolved by the compiler's existing TypeShade import resolver. */
export interface LiveProject {
  readonly fileName?: string;
  readonly files?: Readonly<Record<string, string>>;
}

export function projectOptions(project: LiveProject = {}) {
  if (!project.files || Object.keys(project.files).length === 0) return {};
  const fileName = new URL(project.fileName ?? 'main.shade.ts', 'file:///live/').pathname;
  const documents = new Map(
    Object.entries(project.files).map(([name, source]) => [
      new URL(name, `file://${fileName}`).pathname,
      source,
    ]),
  );
  return { fileName, readDocument: (name: string) => documents.get(name) };
}
