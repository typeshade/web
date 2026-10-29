import { readdir } from 'node:fs/promises';
import path from 'node:path';

// Repository handoff notes are useful to maintainers but are not product documentation.
export function isPublicMarkdownPath(relativePath) {
  return relativePath.replaceAll(path.sep, '/') !== 'website-migration.md';
}

export async function markdownFiles(dir) {
  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map((entry) => {
          const file = path.join(currentDir, entry.name);
          if (entry.isDirectory()) return visit(file);
          const relativePath = path.relative(dir, file);
          return entry.name.endsWith('.md') && isPublicMarkdownPath(relativePath)
            ? [file]
            : [];
        }),
      )
    ).flat();
  }

  return visit(dir);
}

export async function filesWithExtension(dir, extension) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? filesWithExtension(path.join(dir, entry.name), extension)
          : entry.name.endsWith(extension)
            ? [path.join(dir, entry.name)]
            : [],
      ),
    )
  ).flat();
}
