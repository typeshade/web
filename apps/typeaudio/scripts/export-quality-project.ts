import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { qualityProject } from './projects/qualityProject.ts';
import { decodeProject } from '../website/project/decodeProject.ts';

if (process.argv.length !== 4) throw new Error('Usage: bun scripts/export-quality-project.ts CANDIDATE_DIRECTORY OUTPUT.json');
const directory = resolve(process.argv[2]), output = resolve(process.argv[3]);
const candidate = JSON.parse(await readFile(join(directory, 'candidate.json'), 'utf8'));
const source = await readFile(join(directory, 'source.function-graph.json'));
if (createHash('sha256').update(source).digest('hex') !== candidate.sourceSha256)
  throw new Error('Candidate source differs from its recorded hash.');
const project = qualityProject(candidate, JSON.parse(source.toString()));
decodeProject(project);
await writeFile(output, JSON.stringify(project, null, 2) + '\n', { flag: 'wx' });
console.log(`Wrote editable project: ${output}. Listening approval remains pending.`);
