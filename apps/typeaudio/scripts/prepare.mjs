import { mkdir, symlink, realpath, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = new URL('../../../sources/typeaudio/', import.meta.url);
// Source modules and website modules must resolve the very same resident registry.
// A second installed TypeShade runtime would break GPU array identity.
const compiler = await realpath(new URL('../node_modules/typeshade', import.meta.url));
await readFile(new URL('src/index.ts', source));
await mkdir(new URL('node_modules/', source), { recursive: true });
const link = new URL('node_modules/typeshade', source);
try {
  await symlink(compiler, fileURLToPath(link), 'dir');
} catch (error) {
  if (error.code !== 'EEXIST' || await realpath(link) !== compiler) throw error;
}
