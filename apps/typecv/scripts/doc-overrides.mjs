import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function typecvSourceUrl(docRelativePath, revision) {
  const repositoryPath = docRelativePath.startsWith('docs/')
    ? path.posix.normalize(docRelativePath)
    : path.posix.normalize(path.posix.join('docs', docRelativePath));
  if (repositoryPath === '..' || repositoryPath.startsWith('../'))
    throw new Error(`Documentation link escapes the TypeCV repository: ${docRelativePath}`);
  return `https://github.com/typeshade/typecv/blob/${revision}/${repositoryPath}`;
}

export function assertReviewedSourceRevision(actualRevision, manifest) {
  if (actualRevision !== manifest.sourceRevision) {
    throw new Error(
      `TypeCV source revision changed from reviewed ${manifest.sourceRevision} to ${actualRevision}; review the imported documentation and update the override manifest before building.`,
    );
  }
}

export async function selectDocumentationFile(
  sourcePath,
  overridePath,
  relativePath,
  manifest,
) {
  try {
    await readFile(overridePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return { file: sourcePath, edited: false };
    throw error;
  }

  const entry = manifest.overrides[relativePath];
  if (!entry)
    throw new Error(`Documentation override has no source hash: ${relativePath}`);

  const source = await readFile(sourcePath);
  const actual = createHash('sha256').update(source).digest('hex');
  if (actual !== entry.sha256) {
    throw new Error(
      `TypeCV source changed for ${relativePath}; review and update its website override and SHA-256 manifest before building. Expected ${entry.sha256}, received ${actual}.`,
    );
  }

  return { file: overridePath, edited: true };
}
